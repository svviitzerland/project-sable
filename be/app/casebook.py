"""Hearing import, portable archives, and evidence discovery routes."""

import asyncio
from typing import Literal
from weakref import WeakValueDictionary

from fastapi import Depends, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import Field, ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .auth import current_user
from .database import case_hearing, owned_case
from .dialogues import register_dialogues
from .models import (
    CaseOut,
    Contract,
    EvidenceLink,
    Hearing,
    HearingCreate,
    HearingOut,
    Segment,
)
from .services import evidence, hearing_import, jude_archive
from .services.analysis import investigate, schedule
from .services.documents import MAX_BYTES, ingest


class AskRequest(Contract):
    query: str = Field(min_length=2, max_length=600)


class LinkRequest(Contract):
    source_id: str
    target_id: str
    relation: Literal["supports", "conflicts", "context", "related"]
    explanation: str = Field(min_length=3, max_length=2000)


class LinkReview(Contract):
    confirmed: bool


async def read_file(file, limit=MAX_BYTES):
    data = await file.read(limit + 1)
    await file.close()
    if not data or len(data) > limit:
        raise HTTPException(
            413, f"Upload a non-empty file up to {limit // 1024 // 1024} MB."
        )
    return data


def register_casebook(app):
    register_dialogues(app)
    user_dep = Depends(current_user)
    app.state.graph_locks = WeakValueDictionary()

    @app.get("/api/v1/hearing-template")
    def template():
        hearing = hearing_import.HearingFile(
            title="Witness examination",
            segments=[
                hearing_import.TranscriptTurn(
                    speaker="Counsel", text="When did you arrive?", start=0, end=3
                ),
                hearing_import.TranscriptTurn(
                    speaker="Witness",
                    text="I arrived at eight in the morning.",
                    start=4,
                    end=8,
                ),
            ],
        )
        return Response(
            jude_archive.pack(hearing.model_dump()),
            media_type="application/vnd.jude+zip",
            headers={
                "Content-Disposition": 'attachment; filename="hearing-template.jude"'
            },
        )

    @app.post("/api/v1/cases/import", response_model=CaseOut)
    async def import_portable(file: UploadFile, user=user_dep):
        app.state.limiter.check(f"archive:{user.id}", limit=5)
        case = await jude_archive.import_case(
            app, user, await read_file(file, jude_archive.MAX_ARCHIVE)
        )
        return case

    @app.get("/api/v1/cases/{case_id}/export.jude")
    async def export_portable(case_id: str, user=user_dep):
        with app.state.db() as db:
            case = owned_case(db, case_id, user.id)
        data = await jude_archive.export_case(app, case)
        return Response(
            data,
            media_type="application/vnd.jude+zip",
            headers={
                "Content-Disposition": f'attachment; filename="case-{case_id}.jude"'
            },
        )

    @app.post("/api/v1/cases/{case_id}/hearings", response_model=HearingOut)
    async def create_hearing(case_id: str, body: HearingCreate, user=user_dep):
        with app.state.db() as db:
            owned_case(db, case_id, user.id)
            hearing = Hearing(case_id=case_id, **body.model_dump())
            db.add(hearing)
            db.commit()
        await app.state.events.publish(case_id, {"type": "hearing"})
        return hearing

    @app.post("/api/v1/cases/{case_id}/hearings/preview")
    async def preview_hearing(
        case_id: str, file: UploadFile, convert: bool = Form(False), user=user_dep
    ):
        with app.state.db() as db:
            owned_case(db, case_id, user.id)
        app.state.limiter.check(f"conversion:{user.id}", limit=10)
        data = await read_file(file)
        return await hearing_import.preview(
            app, file.filename or "hearing.txt", data, convert
        )

    @app.post("/api/v1/cases/{case_id}/hearings/import", response_model=HearingOut)
    async def import_hearing(
        case_id: str, file: UploadFile, transcript: str = Form(...), user=user_dep
    ):
        with app.state.db() as db:
            case = owned_case(db, case_id, user.id)
        app.state.limiter.check(f"hearing-import:{user.id}", limit=10)
        data = await read_file(file)
        try:
            hearing_file = hearing_import.HearingFile.model_validate_json(transcript)
        except ValidationError as exc:
            raise HTTPException(
                422, "The reviewed transcript does not match the Jude hearing schema."
            ) from exc
        name = file.filename or "hearing.txt"
        raw, mime = hearing_import.validate_reviewed(name, data, hearing_file)
        document = await ingest(app, case, name, data, extracted=([(1, raw)], mime))
        with app.state.db() as db:
            hearing = Hearing(
                case_id=case_id,
                title=hearing_file.title,
                date=hearing_file.date,
                kind="imported",
                status="ready",
                source_document_id=document.id,
            )
            db.add(hearing)
            db.flush()
            for turn in hearing_file.segments:
                db.add(
                    Segment(
                        case_id=case_id,
                        hearing_id=hearing.id,
                        origin="imported",
                        analysis_state="pending",
                        **turn.model_dump(),
                    )
                )
            db.commit()
        await app.state.events.publish(case_id, {"type": "hearing"})
        return hearing

    @app.get("/api/v1/cases/{case_id}/hearings/{hearing_id}/export.jude")
    def export_hearing(case_id: str, hearing_id: str, user=user_dep):
        with app.state.db() as db:
            owned_case(db, case_id, user.id)
            hearing = case_hearing(db, case_id, hearing_id)
            segments = db.scalars(
                select(Segment)
                .where(Segment.hearing_id == hearing_id)
                .order_by(Segment.created_at)
            ).all()
            if not segments:
                raise HTTPException(409, "Add testimony before exporting this hearing.")
            payload = hearing_import.HearingFile(
                title=hearing.title,
                date=hearing.date,
                segments=[
                    hearing_import.TranscriptTurn.model_validate(
                        {k: getattr(s, k) for k in ("speaker", "text", "start", "end")}
                    )
                    for s in segments
                ],
            )
        return Response(
            jude_archive.pack(payload.model_dump()),
            media_type="application/vnd.jude+zip",
            headers={
                "Content-Disposition": f'attachment; filename="hearing-{hearing_id}.jude"'
            },
        )

    @app.post("/api/v1/cases/{case_id}/hearings/{hearing_id}/analyze")
    async def analyze(case_id: str, hearing_id: str, user=user_dep):
        app.state.limiter.check(f"analyze-hearing:{user.id}", limit=10)
        if not app.state.settings.ai_enabled:
            raise HTTPException(
                503,
                "Connect an OpenRouter analysis model to examine this hearing. Your transcript is saved.",
            )
        with app.state.db() as db:
            owned_case(db, case_id, user.id)
            case_hearing(db, case_id, hearing_id)
            segments = db.scalars(
                select(Segment).where(
                    Segment.hearing_id == hearing_id,
                    Segment.analysis_state.in_(
                        ["pending", "unavailable", "failed", "interrupted"]
                    ),
                )
            ).all()
            ids = [s.id for s in segments]
            for segment in segments:
                segment.analysis_state = "queued"
            db.commit()

        async def run():
            for id in ids:
                await investigate(app, id)

        schedule(app, run())
        return {"queued": len(ids)}

    @app.get("/api/v1/cases/{case_id}/graph")
    def get_graph(case_id: str, user=user_dep):
        with app.state.db() as db:
            owned_case(db, case_id, user.id)
        return evidence.graph(app, case_id)

    @app.post("/api/v1/cases/{case_id}/graph/build")
    async def build(case_id: str, user=user_dep):
        with app.state.db() as db:
            owned_case(db, case_id, user.id)
        app.state.limiter.check(f"graph:{user.id}", limit=5)
        lock = app.state.graph_locks.setdefault(case_id, asyncio.Lock())
        if lock.locked():
            raise HTTPException(
                409, "Evidence linking is already running for this case."
            )
        async with lock:
            result = await evidence.build_links(app, case_id)
        await app.state.events.publish(case_id, {"type": "graph"})
        return result

    @app.post("/api/v1/cases/{case_id}/ask")
    async def ask(case_id: str, body: AskRequest, user=user_dep):
        with app.state.db() as db:
            owned_case(db, case_id, user.id)
        app.state.limiter.check(f"ask:{user.id}", limit=20)
        return await evidence.ask(app, case_id, body.query)

    @app.post("/api/v1/cases/{case_id}/links")
    async def create_link(case_id: str, body: LinkRequest, user=user_dep):
        with app.state.db() as db:
            owned_case(db, case_id, user.id)
            pair = evidence.checked_pair(db, case_id, body.source_id, body.target_id)
            link = EvidenceLink(
                case_id=case_id,
                **body.model_dump(),
                basis="manual",
                confirmed=True,
                source_quote=pair[body.source_id].text[:300],
                target_quote=pair[body.target_id].text[:300],
            )
            db.add(link)
            try:
                db.commit()
            except IntegrityError as exc:
                raise HTTPException(
                    409, "This pair is already linked. Review its existing connection."
                ) from exc
            result = jude_archive.LinkOut.model_validate(link)
        await app.state.events.publish(case_id, {"type": "graph"})
        return result

    @app.patch("/api/v1/cases/{case_id}/links/{link_id}")
    async def review_link(case_id: str, link_id: str, body: LinkReview, user=user_dep):
        with app.state.db() as db:
            owned_case(db, case_id, user.id)
            link = db.scalar(
                select(EvidenceLink).where(
                    EvidenceLink.case_id == case_id, EvidenceLink.id == link_id
                )
            )
            if not link:
                raise HTTPException(404, "Evidence link not found")
            link.confirmed = body.confirmed
            db.commit()
            result = jude_archive.LinkOut.model_validate(link)
        await app.state.events.publish(case_id, {"type": "graph"})
        return result
