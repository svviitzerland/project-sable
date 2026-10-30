import asyncio
import time

from pydantic import Field
from sqlalchemy import select

from ..models import Chunk, Conclusion, Contract, Finding, Hearing, Segment
from .providers import ProviderError
from .retrieval import retrieve
from .simulation import EXPECTED


class Claim(Contract):
    checkable: bool
    assertion: str = Field(max_length=1500)
    search_query: str = Field(max_length=600)
    legal_query: str = Field(max_length=160)
    reason: str = Field(max_length=600)


class Assessment(Contract):
    summary: str = Field(max_length=2000)
    alternative_explanations: list[str] = Field(max_length=5)
    missing_context: list[str] = Field(max_length=5)


def validate_citations(conclusion, sources):
    known = {source.id: source for source in sources}
    for citation in conclusion.citations:
        source = known.get(citation.chunk_id)
        if (
            not source
            or not citation.quote.strip()
            or citation.quote not in source.text
        ):
            raise ProviderError(
                "Citation verification failed. The finding was withheld because a quoted passage did not match the retrieved evidence."
            )
    if conclusion.status == "supported" and not any(
        c.relation == "supports" for c in conclusion.citations
    ):
        raise ProviderError(
            "A supported finding requires a verified supporting citation."
        )
    if conclusion.status == "potential_inconsistency" and not any(
        c.relation == "conflicts" for c in conclusion.citations
    ):
        raise ProviderError(
            "A potential inconsistency requires a verified conflicting citation."
        )
    if conclusion.status != "insufficient_evidence" and not conclusion.citations:
        raise ProviderError("A substantive finding requires source citations.")


async def state(app, segment_id, phase, error=None):
    with app.state.db() as db:
        segment = db.get(Segment, segment_id)
        if not segment:
            return
        segment.analysis_state, segment.analysis_error = phase, error
        db.commit()
        case_id = segment.case_id
    await app.state.events.publish(
        case_id, {"type": "analysis", "segment_id": segment_id, "phase": phase}
    )


async def investigate(app, segment_id, fixture=None):
    if len(app.state.tasks) > 100:
        await state(
            app,
            segment_id,
            "interrupted",
            "Analysis queue is full. Your testimony is saved; retry when the queue clears.",
        )
        return
    async with app.state.analysis_slots:
        started = time.monotonic()
        with app.state.db() as db:
            segment = db.get(Segment, segment_id)
            if not segment or db.scalar(
                select(Finding).where(Finding.segment_id == segment_id)
            ):
                return
            hearing = (
                db.get(Hearing, segment.hearing_id) if segment.hearing_id else None
            )
            excluded_document = hearing.source_document_id if hearing else None
            previous = db.scalars(
                select(Segment)
                .where(
                    Segment.case_id == segment.case_id,
                    Segment.hearing_id == segment.hearing_id,
                    Segment.created_at < segment.created_at,
                )
                .order_by(Segment.created_at.desc())
                .limit(5)
            ).all()
            context = [
                {"speaker": s.speaker, "text": s.text} for s in reversed(previous)
            ]
        try:
            if segment.origin == "simulation":
                if not fixture:
                    await state(app, segment_id, "skipped")
                    return
                await state(app, segment_id, "retrieving")
                expected = dict(EXPECTED[fixture])
                quote, relation = expected.pop("quote"), expected.pop("relation")
                with app.state.db() as db:
                    chunks = db.scalars(
                        select(Chunk).where(Chunk.case_id == segment.case_id)
                    ).all()
                    chunk = next((c for c in chunks if quote in c.text), None)
                if not chunk:
                    raise ProviderError(
                        "The synthetic source fixture is missing. Create a new demonstration case."
                    )
                expected["citations"] = [
                    {"chunk_id": chunk.id, "quote": quote, "relation": relation}
                ]
                conclusion = Conclusion(**expected)
                review = {
                    "summary": "Scripted training example, not an AI investigation.",
                    "alternative_explanations": [conclusion.uncertainty],
                    "missing_context": [conclusion.verification],
                }
                legal, mode = [], "simulation"
                await state(app, segment_id, "reviewing")
                await asyncio.sleep(0.1)
            elif not app.state.settings.ai_enabled:
                await state(
                    app,
                    segment_id,
                    "unavailable",
                    "AI analysis is not connected. Configure OpenRouter, then retry this statement. Your transcript is saved.",
                )
                return
            else:
                await state(app, segment_id, "extracting")
                claim = await app.state.llm.structured(
                    "Extract a single meaningful, checkable assertion. Mark questions, fragments and procedural statements not checkable. Do not expand or invent claims. legal_query is empty unless a legal issue is explicitly raised; use only generic legal keywords, no personal data.",
                    {"transcript": segment.text, "preceding_context": context},
                    Claim,
                )
                if not claim.checkable:
                    await state(app, segment_id, "skipped")
                    return
                await state(app, segment_id, "retrieving")
                sources, method = await retrieve(
                    app,
                    segment.case_id,
                    claim.search_query,
                    exclude_document_id=excluded_document,
                )
                legal = []
                legal_note = ""
                if claim.legal_query and app.state.settings.pasal_key:
                    try:
                        legal = await app.state.pasal.search(claim.legal_query)
                    except ProviderError:
                        legal_note = "Legal discovery was unavailable; no legal reference was inferred."
                packet = {
                    "testimony": segment.text,
                    "context": context,
                    "claim": claim.assertion,
                    "sources": [s.model_dump() for s in sources],
                    "legal_discovery_metadata_only": legal,
                }
                await state(app, segment_id, "analyzing")
                analyst = await app.state.llm.structured(
                    "Evidence Analyst: compare the assertion to source material. Identify support, conflicts and context without deciding credibility.",
                    packet,
                    Assessment,
                )
                await state(app, segment_id, "reviewing")
                reviewer = await app.state.llm.structured(
                    "Adversarial Reviewer: independently examine the original assertion and sources for alternative explanations and missing context. You do not receive the analyst response.",
                    packet,
                    Assessment,
                )
                await state(app, segment_id, "synthesizing")
                conclusion = await app.state.llm.structured(
                    "Evidence Synthesizer: weigh the two assessments. Use calibrated status, exact citations, a concrete verification step, and a suggested question. If evidence is absent use insufficient_evidence. A difference alone does not establish contradiction.",
                    {
                        **packet,
                        "analyst": analyst.model_dump(),
                        "reviewer": reviewer.model_dump(),
                    },
                    Conclusion,
                )
                validate_citations(conclusion, sources)
                review = {
                    **reviewer.model_dump(),
                    "analyst_summary": analyst.summary,
                    "retrieval": method,
                    "legal_note": legal_note,
                }
                mode = "ai"
            with app.state.db() as db:
                db.add(
                    Finding(
                        case_id=segment.case_id,
                        segment_id=segment.id,
                        **conclusion.model_dump(),
                        review=review,
                        legal=legal,
                        mode=mode,
                        elapsed_ms=int((time.monotonic() - started) * 1000),
                    )
                )
                db.commit()
            await state(app, segment_id, "complete")
        except asyncio.CancelledError:
            await state(
                app,
                segment_id,
                "interrupted",
                "Analysis was interrupted. Retry this statement.",
            )
            raise
        except Exception as exc:  # noqa: BLE001 — isolate provider failures from saved testimony
            message = (
                str(exc)
                if isinstance(exc, ProviderError)
                else "Analysis failed. Your transcript is saved; retry this statement."
            )
            await state(app, segment_id, "failed", message)


class Events:
    def __init__(self):
        self.listeners = {}

    async def publish(self, case_id, event):
        for queue in list(self.listeners.get(case_id, set())):
            if queue.full():
                queue.get_nowait()
            queue.put_nowait(event)

    def subscribe(self, case_id):
        queue = asyncio.Queue(maxsize=100)
        self.listeners.setdefault(case_id, set()).add(queue)
        return queue

    def unsubscribe(self, case_id, queue):
        self.listeners.get(case_id, set()).discard(queue)


def schedule(app, coro):
    task = asyncio.create_task(coro)
    app.state.tasks.add(task)
    task.add_done_callback(app.state.tasks.discard)
    return task
