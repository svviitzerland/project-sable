"""Case-scoped evidence graph, embedding candidates, and citation-grounded answers."""

import asyncio
from typing import Literal

from fastapi import HTTPException
from pydantic import Field
from sqlalchemy import select

from ..models import (
    Chunk,
    Citation,
    Contract,
    Document,
    EvidenceLink,
    Finding,
    Segment,
    SourceOut,
)
from .jude_archive import LinkOut
from .providers import ProviderError
from .retrieval import cosine, retrieve, tokens


class SuggestedLink(Contract):
    source_id: str
    target_id: str
    relation: Literal["supports", "conflicts", "context", "related"]
    explanation: str = Field(min_length=1, max_length=1200)
    source_quote: str = Field(min_length=1, max_length=1500)
    target_quote: str = Field(min_length=1, max_length=1500)


class RelationshipBatch(Contract):
    links: list[SuggestedLink] = Field(max_length=12)


class Answer(Contract):
    answer: str = Field(min_length=1, max_length=4000)
    citations: list[Citation] = Field(max_length=8)


def as_source(chunk, name):
    return SourceOut(
        id=chunk.id,
        document_id=chunk.document_id,
        document_name=name,
        page=chunk.page,
        section=chunk.section,
        text=chunk.text,
    )


def graph(app, case_id):
    with app.state.db() as db:
        rows = db.execute(
            select(Chunk, Document.name)
            .join(Document)
            .where(Chunk.case_id == case_id)
            .order_by(Document.created_at, Chunk.page)
        ).all()
        links = db.scalars(
            select(EvidenceLink)
            .where(EvidenceLink.case_id == case_id)
            .order_by(EvidenceLink.confirmed.desc(), EvidenceLink.created_at.desc())
            .limit(1000)
        ).all()
        findings = db.scalars(select(Finding).where(Finding.case_id == case_id)).all()
        segments = {
            s.id: s
            for s in db.scalars(select(Segment).where(Segment.case_id == case_id))
        }
    relevant = {x for link in links for x in (link.source_id, link.target_id)} | {
        c["chunk_id"] for f in findings for c in f.citations
    }
    ordered = sorted(
        enumerate(rows), key=lambda item: (item[1][0].id not in relevant, item[0])
    )
    selected = [row for _, row in ordered[:60]]
    ids = {c.id for c, _ in selected}
    nodes = [
        {
            "id": c.id,
            "kind": "passage",
            "label": name,
            "detail": c.section or f"Page {c.page}",
            "text": c.text,
            "document_id": c.document_id,
            "page": c.page,
        }
        for c, name in selected
    ]
    edges = [
        {**LinkOut.model_validate(link).model_dump(), "kind": "evidence"}
        for link in links
        if link.source_id in ids and link.target_id in ids
    ]
    for finding in findings[-20:]:
        cited = [c for c in finding.citations if c["chunk_id"] in ids]
        segment = segments.get(finding.segment_id)
        if not cited or not segment:
            continue
        node_id = "statement:" + segment.id
        nodes.append(
            {
                "id": node_id,
                "kind": "statement",
                "label": segment.speaker,
                "detail": "Hearing statement",
                "text": segment.text,
                "hearing_id": segment.hearing_id,
                "finding_id": finding.id,
            }
        )
        for citation in cited:
            edges.append(
                {
                    "id": finding.id + ":" + citation["chunk_id"],
                    "source_id": node_id,
                    "target_id": citation["chunk_id"],
                    "relation": citation["relation"],
                    "explanation": finding.explanation,
                    "basis": finding.mode,
                    "confirmed": finding.reviewed,
                    "score": None,
                    "source_quote": segment.text,
                    "target_quote": citation["quote"],
                    "kind": "finding",
                }
            )
    return {
        "nodes": nodes,
        "edges": edges,
        "total_passages": len(rows),
        "shown_passages": len(selected),
        "indexed_passages": sum(
            bool(c.embedding)
            and c.embedding_model == app.state.settings.embedding_model
            for c, _ in rows
        ),
        "notice": "Similarity suggests a connection, not support or contradiction. Inspect both passages before confirming a link.",
    }


def candidate_pairs(chunks):
    pairs = []
    for index, a in enumerate(chunks):
        for b in chunks[index + 1 :]:
            if a.document_id == b.document_id:
                continue
            semantic = bool(a.embedding and b.embedding)
            similarity = (
                cosine(a.embedding, b.embedding)
                if semantic
                else len(tokens(a.text) & tokens(b.text))
                / max(1, len(tokens(a.text) | tokens(b.text)))
            )
            if similarity >= (0.68 if semantic else 0.12):
                pairs.append((similarity, a, b, "semantic" if semantic else "keywords"))
    return sorted(pairs, key=lambda pair: pair[0], reverse=True)[:12]


async def build_links(app, case_id):
    with app.state.db() as db:
        chunks = db.scalars(
            select(Chunk).where(Chunk.case_id == case_id).order_by(Chunk.id).limit(300)
        ).all()
    embedding_note = ""
    if app.state.settings.openrouter_key:
        missing = [
            c
            for c in chunks
            if not c.embedding
            or c.embedding_model != app.state.settings.embedding_model
        ]
        try:
            for offset in range(0, len(missing), 24):
                batch = missing[offset : offset + 24]
                vectors = await app.state.llm.embed([c.text for c in batch])
                with app.state.db() as db:
                    for chunk, vector in zip(batch, vectors, strict=True):
                        chunk.embedding = vector
                        chunk.embedding_model = app.state.settings.embedding_model
                        saved = db.get(Chunk, chunk.id)
                        saved.embedding = vector
                        saved.embedding_model = app.state.settings.embedding_model
                    db.commit()
        except ProviderError:
            embedding_note = "Embedding service unavailable; available vectors and shared terms were used."
    for chunk in chunks:
        if chunk.embedding_model != app.state.settings.embedding_model:
            chunk.embedding = None
    pairs = await asyncio.to_thread(candidate_pairs, chunks[:120])
    proposed = []
    if pairs and app.state.settings.ai_enabled:
        packet = [
            {
                "source_id": a.id,
                "target_id": b.id,
                "source_text": a.text,
                "target_text": b.text,
            }
            for _, a, b, _ in pairs
        ]
        try:
            response = await app.state.llm.structured(
                "Compare only the supplied evidence pairs. Suggest supports, conflicts, context, or related. A topical similarity is only related. A conflict requires incompatible claims about the same event and subject; consider dates and alternative explanations. Quote both sources exactly. Never infer dishonesty or guilt. All relationships remain suggestions for human review.",
                {"candidate_pairs": packet},
                RelationshipBatch,
            )
            allowed = {(a.id, b.id): (score, a, b) for score, a, b, _ in pairs}
            for link in response.links:
                pair = allowed.get((link.source_id, link.target_id))
                if (
                    not pair
                    or not link.source_quote.strip()
                    or not link.target_quote.strip()
                    or link.source_quote not in pair[1].text
                    or link.target_quote not in pair[2].text
                ):
                    raise ProviderError(
                        "A suggested relationship failed source verification. No AI links were published."
                    )
                proposed.append({**link.model_dump(), "basis": "ai", "score": pair[0]})
        except ProviderError as exc:
            proposed = []
            embedding_note += " " + str(exc)
    if not proposed:
        proposed = [
            {
                "source_id": a.id,
                "target_id": b.id,
                "relation": "related",
                "explanation": "Similar subject matter; inspect the passages to determine their relationship.",
                "source_quote": a.text[:300],
                "target_quote": b.text[:300],
                "basis": basis,
                "score": score,
            }
            for score, a, b, basis in pairs
        ]
    added = 0
    with app.state.db() as db:
        for values in proposed:
            exists = db.scalar(
                select(EvidenceLink).where(
                    EvidenceLink.case_id == case_id,
                    EvidenceLink.source_id == values["source_id"],
                    EvidenceLink.target_id == values["target_id"],
                )
            )
            if exists:
                continue
            db.add(EvidenceLink(case_id=case_id, **values))
            added += 1
        db.commit()
    return {
        "added": added,
        "notice": embedding_note.strip() or "Suggested links are ready to inspect.",
        "scope": "Up to 300 passages indexed; cross-document suggestions use the first 120 passages. Natural-language search covers all case passages.",
    }


async def ask(app, case_id, query):
    sources, method = await retrieve(app, case_id, query, limit=6)
    ids = {s.id for s in sources}
    with app.state.db() as db:
        # Expand from confirmed relationships only; suggestions cannot silently shape an answer.
        links = db.scalars(
            select(EvidenceLink).where(
                EvidenceLink.case_id == case_id, EvidenceLink.confirmed.is_(True)
            )
        ).all()
        neighbors = {
            x
            for link in links
            if link.source_id in ids or link.target_id in ids
            for x in (link.source_id, link.target_id)
        } - ids
        if neighbors:
            rows = db.execute(
                select(Chunk, Document.name)
                .join(Document)
                .where(Chunk.case_id == case_id, Chunk.id.in_(neighbors))
                .order_by(Chunk.id)
                .limit(4)
            ).all()
            sources.extend(as_source(c, name) for c, name in rows)
    result = {
        "answer": None,
        "citations": [],
        "sources": [s.model_dump() for s in sources],
        "method": method,
        "notice": "",
    }
    if not sources:
        result["notice"] = (
            "No relevant passages found. Try different wording or add evidence."
        )
    elif not app.state.settings.ai_enabled:
        result["notice"] = (
            "Relevant evidence is shown below. Connect an OpenRouter analysis model for a cited answer."
        )
    else:
        answer = await app.state.llm.structured(
            "Answer the case question using only the supplied passages. Distinguish established source text, conflicts, and missing evidence. Do not determine credibility or guilt. Cite exact quotations for every substantive point. If these passages cannot answer the question, state what is missing without inventing facts.",
            {"question": query, "sources": result["sources"]},
            Answer,
        )
        known = {s.id: s.text for s in sources}
        if not answer.citations or any(
            not c.quote.strip()
            or c.chunk_id not in known
            or c.quote not in known[c.chunk_id]
            for c in answer.citations
        ):
            raise ProviderError(
                "The answer failed citation verification. Inspect the retrieved passages or try again."
            )
        result.update(
            answer=answer.answer, citations=[c.model_dump() for c in answer.citations]
        )
    return result


def checked_pair(db, case_id, source_id, target_id):
    if source_id == target_id:
        raise HTTPException(422, "Choose two different passages.")
    rows = db.scalars(
        select(Chunk).where(
            Chunk.case_id == case_id, Chunk.id.in_([source_id, target_id])
        )
    ).all()
    if len(rows) != 2:
        raise HTTPException(404, "Both passages must belong to this case.")
    return {c.id: c for c in rows}
