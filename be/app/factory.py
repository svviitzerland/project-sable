import asyncio
import json
from contextlib import asynccontextmanager
from urllib.parse import quote
from weakref import WeakValueDictionary

from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .auth import (
    COOKIE,
    RateLimiter,
    check_password,
    current_user,
    hash_password,
    issue_session,
    revoke,
    session_user,
)
from .casebook import register_casebook
from .config import Settings
from .database import case_hearing, database, owned_case
from .middleware import RequestSizeLimit
from .models import (
    Capabilities,
    Case,
    CaseCreate,
    CaseDetail,
    CaseOut,
    Chunk,
    ConnectionOut,
    Credentials,
    Document,
    DocumentOut,
    Finding,
    FindingOut,
    FindingUpdate,
    Hearing,
    HearingOut,
    LegalOut,
    Message,
    SearchOut,
    Segment,
    SegmentIn,
    SegmentOut,
    SourceOut,
    SpeakerUpdate,
    User,
    UserOut,
    uid,
)
from .services.analysis import Events, investigate, schedule
from .services.documents import MAX_BYTES, ingest
from .services.providers import OpenRouter, Pasal, ProviderError, Storage
from .services.retrieval import retrieve
from .services.simulation import DOCUMENTS, SCRIPT
from .services.speech import stream_speech

USER_DEPENDENCY = Depends(current_user)


class HealthResponse(BaseModel):
    status: str
    service: str


def create_app(settings=None):
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app):
        yield
        for task in list(app.state.tasks):
            task.cancel()
        await asyncio.gather(*app.state.tasks, return_exceptions=True)

    app = FastAPI(title="Jude API", version="0.2.0", lifespan=lifespan)
    app.add_middleware(RequestSizeLimit, limit=64 * 1024 * 1024 + 65536)
    app.state.settings = settings
    app.state.db = database(settings)
    app.state.llm = OpenRouter(settings)
    app.state.pasal = Pasal(settings)
    app.state.storage = Storage(settings)
    app.state.events = Events()
    app.state.tasks = set()
    app.state.hearings = {}
    app.state.document_locks = WeakValueDictionary()
    app.state.analysis_slots = asyncio.Semaphore(3)
    app.state.limiter = RateLimiter()

    @app.middleware("http")
    async def origin_guard(request, call_next):
        length = request.headers.get("content-length", "0")
        limit = (
            64 * 1024 * 1024
            if request.url.path == "/api/v1/cases/import"
            else MAX_BYTES
        ) + 65536
        if not length.isdigit() or int(length) > limit:
            return JSONResponse(
                {"detail": "Request is too large. Files must be at most 6 MB."},
                status_code=413,
            )
        origin = request.headers.get("origin")
        if (
            request.method not in {"GET", "HEAD", "OPTIONS"}
            and origin
            and origin not in settings.origins
        ):
            return JSONResponse(
                {"detail": "This origin is not allowed."}, status_code=403
            )
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(ProviderError)
    async def provider_error(_, exc):
        return JSONResponse({"detail": str(exc)}, status_code=503)

    @app.get("/api/v1/health", response_model=HealthResponse, tags=["system"])
    def health():
        return HealthResponse(status="ok", service="project-backend")

    @app.get("/api/v1/capabilities", response_model=Capabilities)
    def capabilities():
        return Capabilities(
            demo_available=not settings.production,
            storage="Supabase PostgreSQL"
            if settings.database_url.startswith("postgresql")
            else "Local SQLite",
            analysis=ConnectionOut(
                configured=settings.ai_enabled,
                note="OpenRouter configured; live provider verification required."
                if settings.ai_enabled
                else "Add OPENROUTER_API_KEY and OPENROUTER_MODEL on the backend.",
            ),
            speech=ConnectionOut(
                configured=bool(settings.speechmatics_key),
                note="Speechmatics configured."
                if settings.speechmatics_key
                else "Add SPEECHMATICS_API_KEY to enable microphone and prepared audio.",
            ),
            legal=ConnectionOut(
                configured=bool(settings.pasal_key),
                note="Pasal.id discovery metadata and links only; no legal text.",
            ),
            embeddings=ConnectionOut(
                configured=bool(settings.openrouter_key),
                note="Semantic + keyword retrieval when embeddings are available. Keyword search otherwise.",
            ),
        )

    @app.post("/api/v1/auth/register", response_model=UserOut)
    async def register(body: Credentials, request: Request, response: Response):
        app.state.limiter.check(f"auth:{request.client.host}", limit=10)
        with app.state.db() as db:
            user = User(
                email=body.email.strip().lower(),
                name=body.name.strip(),
                password_hash=await asyncio.to_thread(hash_password, body.password),
            )
            db.add(user)
            try:
                db.commit()
            except IntegrityError:
                db.rollback()
                raise HTTPException(
                    409, "An account already uses this email. Sign in instead."
                ) from None
            issue_session(db, user, response, settings)
            return user

    @app.post("/api/v1/auth/login", response_model=UserOut)
    async def login(body: Credentials, request: Request, response: Response):
        app.state.limiter.check(f"auth:{request.client.host}", limit=10)
        with app.state.db() as db:
            user = db.scalar(
                select(User).where(User.email == body.email.strip().lower())
            )
            if not user or not await asyncio.to_thread(
                check_password, body.password, user.password_hash
            ):
                raise HTTPException(401, "Email or password is incorrect.")
            issue_session(db, user, response, settings)
            return user

    @app.post("/api/v1/auth/logout", response_model=Message)
    def logout(request: Request, response: Response):
        with app.state.db() as db:
            revoke(db, request.cookies.get(COOKIE))
        response.delete_cookie(COOKIE, path="/")
        return Message(message="Signed out")

    @app.get("/api/v1/auth/me", response_model=UserOut)
    def me(user=USER_DEPENDENCY):
        return user

    async def seed_case(user):
        with app.state.db() as db:
            case = Case(
                owner_id=user.id,
                title="The warehouse hearing",
                reference="SIM / 2026 / 001",
                description="Synthetic criminal-hearing exercise. Compare four witness assertions with two prepared case documents. No real persons or proceedings.",
                synthetic=True,
                speakers={
                    "Counsel": "Counsel · scripted",
                    "Witness": "Witness · scripted",
                },
            )
            db.add(case)
            db.commit()
            db.add(
                Hearing(
                    case_id=case.id,
                    title="The warehouse examination",
                    kind="simulation",
                )
            )
            db.commit()
        for name, text in DOCUMENTS:
            await ingest(app, case, name, text.encode())
        return case

    @app.post("/api/v1/auth/demo", response_model=UserOut)
    async def demo(request: Request, response: Response):
        if settings.production:
            raise HTTPException(403, "Demonstration sign-in is disabled in production.")
        app.state.limiter.check(f"demo:{request.client.host}", limit=5)
        with app.state.db() as db:
            user = User(
                email=f"{uid()}@demo.invalid",
                name="Demo counsel",
                password_hash="disabled",
                demo=True,
            )
            db.add(user)
            db.commit()
            issue_session(db, user, response, settings)
        await seed_case(user)
        return user

    @app.get("/api/v1/cases", response_model=list[CaseOut])
    def list_cases(user=USER_DEPENDENCY):
        with app.state.db() as db:
            return db.scalars(
                select(Case)
                .where(Case.owner_id == user.id)
                .order_by(Case.created_at.desc())
            ).all()

    @app.post("/api/v1/cases", response_model=CaseOut)
    def create_case(body: CaseCreate, user=USER_DEPENDENCY):
        with app.state.db() as db:
            case = Case(owner_id=user.id, **body.model_dump())
            db.add(case)
            db.commit()
            return case

    @app.post("/api/v1/cases/synthetic", response_model=CaseOut)
    async def synthetic(user=USER_DEPENDENCY):
        if settings.production:
            raise HTTPException(403, "Synthetic fixtures are disabled in production.")
        app.state.limiter.check(f"seed:{user.id}", limit=5)
        return await seed_case(user)

    def detail(db, case):
        return CaseDetail(
            case=CaseOut.model_validate(case),
            hearings=[
                HearingOut.model_validate(h)
                for h in db.scalars(
                    select(Hearing)
                    .where(Hearing.case_id == case.id)
                    .order_by(Hearing.created_at)
                ).all()
            ],
            documents=[
                DocumentOut.model_validate(x)
                for x in db.scalars(
                    select(Document)
                    .where(Document.case_id == case.id)
                    .order_by(Document.created_at)
                ).all()
            ],
            segments=[
                SegmentOut.model_validate(x)
                for x in db.scalars(
                    select(Segment)
                    .where(Segment.case_id == case.id)
                    .order_by(Segment.created_at)
                ).all()
            ],
            findings=[
                FindingOut.model_validate(x)
                for x in db.scalars(
                    select(Finding)
                    .where(Finding.case_id == case.id)
                    .order_by(Finding.created_at)
                ).all()
            ],
        )

    @app.get("/api/v1/cases/{case_id}", response_model=CaseDetail)
    def get_case(case_id: str, user=USER_DEPENDENCY):
        with app.state.db() as db:
            return detail(db, owned_case(db, case_id, user.id))

    @app.patch("/api/v1/cases/{case_id}/speakers", response_model=CaseOut)
    def speakers(case_id: str, body: SpeakerUpdate, user=USER_DEPENDENCY):
        with app.state.db() as db:
            case = owned_case(db, case_id, user.id)
            case.speakers = {**case.speakers, body.speaker: body.label.strip()}
            db.commit()
            return case

    @app.post("/api/v1/cases/{case_id}/documents", response_model=DocumentOut)
    async def upload(case_id: str, file: UploadFile, user=USER_DEPENDENCY):
        with app.state.db() as db:
            case = owned_case(db, case_id, user.id)
        app.state.limiter.check(f"upload:{user.id}", limit=10)
        data = await file.read(MAX_BYTES + 1)
        await file.close()
        document = await ingest(app, case, file.filename or "document.txt", data)
        await app.state.events.publish(case_id, {"type": "document"})
        return document

    @app.get("/api/v1/cases/{case_id}/documents/{document_id}/original")
    async def original(case_id: str, document_id: str, user=USER_DEPENDENCY):
        with app.state.db() as db:
            owned_case(db, case_id, user.id)
            document = db.scalar(
                select(Document).where(
                    Document.id == document_id, Document.case_id == case_id
                )
            )
            if not document:
                raise HTTPException(404, "Document not found")
        try:
            data = await app.state.storage.read(document)
        except FileNotFoundError:
            raise HTTPException(404, "Original file is missing from storage.") from None
        return Response(
            data,
            media_type=document.mime,
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{quote(document.name)}"
            },
        )

    @app.get(
        "/api/v1/cases/{case_id}/documents/{document_id}/chunks",
        response_model=list[SourceOut],
    )
    def chunks(case_id: str, document_id: str, user=USER_DEPENDENCY):
        with app.state.db() as db:
            owned_case(db, case_id, user.id)
            rows = db.execute(
                select(Chunk, Document.name)
                .join(Document)
                .where(Chunk.case_id == case_id, Chunk.document_id == document_id)
                .order_by(Chunk.page)
            ).all()
            return [
                SourceOut(
                    id=c.id,
                    document_id=c.document_id,
                    document_name=n,
                    page=c.page,
                    section=c.section,
                    text=c.text,
                )
                for c, n in rows
            ]

    @app.get("/api/v1/cases/{case_id}/sources/{chunk_id}", response_model=SourceOut)
    def source(case_id: str, chunk_id: str, user=USER_DEPENDENCY):
        with app.state.db() as db:
            owned_case(db, case_id, user.id)
            row = db.execute(
                select(Chunk, Document.name)
                .join(Document)
                .where(Chunk.id == chunk_id, Chunk.case_id == case_id)
            ).first()
            if not row:
                raise HTTPException(404, "Source not found")
            c, name = row
            return SourceOut(
                id=c.id,
                document_id=c.document_id,
                document_name=name,
                page=c.page,
                section=c.section,
                text=c.text,
            )

    @app.get("/api/v1/cases/{case_id}/search", response_model=SearchOut)
    async def search(
        case_id: str, q: str = Query(min_length=2, max_length=600), user=USER_DEPENDENCY
    ):
        with app.state.db() as db:
            owned_case(db, case_id, user.id)
        app.state.limiter.check(f"search:{user.id}", limit=30)
        results, method = await retrieve(app, case_id, q)
        return SearchOut(results=results, method=method)

    @app.get("/api/v1/cases/{case_id}/legal", response_model=LegalOut)
    async def legal(
        case_id: str, q: str = Query(min_length=2, max_length=160), user=USER_DEPENDENCY
    ):
        with app.state.db() as db:
            owned_case(db, case_id, user.id)
        app.state.limiter.check(f"legal:{user.id}", limit=20)
        return LegalOut(
            results=await app.state.pasal.search(q),
            note="Discovery metadata only. Read and verify the linked legal text and its applicability before relying on it.",
        )

    @app.post("/api/v1/cases/{case_id}/transcripts", response_model=SegmentOut)
    async def transcript(case_id: str, body: SegmentIn, user=USER_DEPENDENCY):
        app.state.limiter.check(f"transcript:{user.id}", limit=30)
        if body.end and body.end < body.start:
            raise HTTPException(422, "End time cannot precede start time.")
        with app.state.db() as db:
            owned_case(db, case_id, user.id)
            hearing = case_hearing(db, case_id, body.hearing_id)
            segment = db.scalar(
                select(Segment).where(
                    Segment.case_id == case_id,
                    Segment.hearing_id == hearing.id,
                    Segment.text == body.text.strip(),
                    Segment.speaker == body.speaker,
                    Segment.start == body.start,
                    Segment.origin == "manual",
                )
            )
            if segment:
                return segment
            segment = Segment(
                case_id=case_id, **{**body.model_dump(), "hearing_id": hearing.id}
            )
            segment.text = segment.text.strip()
            db.add(segment)
            db.commit()
        schedule(app, investigate(app, segment.id))
        await app.state.events.publish(case_id, {"type": "transcript"})
        return segment

    @app.post(
        "/api/v1/cases/{case_id}/transcripts/{segment_id}/retry", response_model=Message
    )
    async def retry(case_id: str, segment_id: str, user=USER_DEPENDENCY):
        app.state.limiter.check(f"retry:{user.id}", limit=15)
        with app.state.db() as db:
            owned_case(db, case_id, user.id)
            segment = db.scalar(
                select(Segment).where(
                    Segment.id == segment_id, Segment.case_id == case_id
                )
            )
            if not segment:
                raise HTTPException(404, "Statement not found")
            if segment.analysis_state not in {"failed", "unavailable", "interrupted"}:
                raise HTTPException(
                    409, "Only failed or interrupted analysis can be retried."
                )
            if not settings.ai_enabled and segment.origin != "simulation":
                raise HTTPException(503, "Connect OpenRouter before retrying analysis.")
            segment.analysis_state = "queued"
            db.commit()
        fixture = (
            next((f for _, text, _, f in SCRIPT if text == segment.text), None)
            if segment.origin == "simulation"
            else None
        )
        schedule(app, investigate(app, segment_id, fixture))
        return Message(message="Analysis queued")

    @app.patch(
        "/api/v1/cases/{case_id}/findings/{finding_id}", response_model=FindingOut
    )
    async def review(
        case_id: str, finding_id: str, body: FindingUpdate, user=USER_DEPENDENCY
    ):
        with app.state.db() as db:
            owned_case(db, case_id, user.id)
            finding = db.scalar(
                select(Finding).where(
                    Finding.id == finding_id, Finding.case_id == case_id
                )
            )
            if not finding:
                raise HTTPException(404, "Finding not found")
            finding.reviewed, finding.note = body.reviewed, body.note
            db.commit()
        await app.state.events.publish(case_id, {"type": "finding"})
        return finding

    async def run_simulation(case_id, hearing_id):
        try:
            with app.state.db() as db:
                offset = len(
                    db.scalars(
                        select(Segment.id).where(
                            Segment.hearing_id == hearing_id,
                            Segment.origin == "simulation",
                        )
                    ).all()
                )
            for speaker, text, start, fixture in SCRIPT[offset:]:
                await asyncio.sleep(settings.simulation_delay)
                with app.state.db() as db:
                    segment = Segment(
                        case_id=case_id,
                        hearing_id=hearing_id,
                        text=text,
                        speaker=speaker,
                        start=start,
                        end=start + 4,
                        confidence=None,
                        origin="simulation",
                    )
                    db.add(segment)
                    db.commit()
                await app.state.events.publish(case_id, {"type": "transcript"})
                schedule(app, investigate(app, segment.id, fixture))
        finally:
            with app.state.db() as db:
                case = db.get(Case, case_id)
                count = len(
                    db.scalars(
                        select(Segment.id).where(
                            Segment.hearing_id == hearing_id,
                            Segment.origin == "simulation",
                        )
                    ).all()
                )
                case.status = "complete" if count == len(SCRIPT) else "paused"
                db.get(Hearing, hearing_id).status = case.status
                db.commit()
            app.state.hearings.pop(case_id, None)
            await app.state.events.publish(case_id, {"type": "session"})

    @app.post("/api/v1/cases/{case_id}/simulation", response_model=Message)
    async def simulate(
        case_id: str, hearing_id: str | None = None, user=USER_DEPENDENCY
    ):
        with app.state.db() as db:
            case = owned_case(db, case_id, user.id)
            if not case.synthetic or settings.production:
                raise HTTPException(
                    400,
                    "Simulation is available only for synthetic demonstration cases.",
                )
            hearing = case_hearing(db, case_id, hearing_id)
            hearing_id = hearing.id
            if hearing.kind != "simulation":
                raise HTTPException(400, "Choose the synthetic demonstration hearing.")
            if hearing.status == "complete":
                raise HTTPException(
                    409,
                    "This simulation is complete. Create another synthetic case to repeat it.",
                )
            if case_id in app.state.hearings:
                raise HTTPException(409, "A hearing is already running.")
            case.status = hearing.status = "simulation"
            db.commit()
        app.state.hearings[case_id] = schedule(app, run_simulation(case_id, hearing_id))
        return Message(message="Synthetic hearing started")

    @app.post("/api/v1/cases/{case_id}/pause", response_model=Message)
    async def pause(case_id: str, user=USER_DEPENDENCY):
        with app.state.db() as db:
            case = owned_case(db, case_id, user.id)
        if case.status != "simulation":
            raise HTTPException(409, "No simulated hearing is running.")
        task = app.state.hearings.get(case_id)
        if task:
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
        return Message(message="Hearing paused")

    @app.get("/api/v1/cases/{case_id}/export")
    def export(case_id: str, user=USER_DEPENDENCY):
        with app.state.db() as db:
            case = owned_case(db, case_id, user.id)
            record = detail(db, case).model_dump()
            sources = db.scalars(select(Chunk).where(Chunk.case_id == case_id)).all()
            record["sources"] = [
                {
                    "id": c.id,
                    "document_id": c.document_id,
                    "page": c.page,
                    "section": c.section,
                    "text": c.text,
                }
                for c in sources
            ]
        record["notice"] = (
            "Decision support only. Verify original sources. Simulation findings are authored fixtures, not AI output."
        )
        return Response(
            json.dumps(record, ensure_ascii=False, indent=2),
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="jude-{case_id}.json"'
            },
        )

    def websocket_user(ws, case_id):
        if ws.headers.get("origin") not in settings.origins:
            raise HTTPException(403, "Origin not allowed")
        user = session_user(app.state.db, ws.cookies.get(COOKIE))
        with app.state.db() as db:
            owned_case(db, case_id, user.id)
        return user

    @app.websocket("/api/v1/cases/{case_id}/events")
    async def events(ws: WebSocket, case_id: str):
        try:
            websocket_user(ws, case_id)
        except HTTPException:
            await ws.close(code=1008)
            return
        await ws.accept()
        queue = app.state.events.subscribe(case_id)
        try:
            await ws.send_json({"type": "connected"})
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=10)
                except TimeoutError:
                    item = {"type": "heartbeat"}
                websocket_user(ws, case_id)
                await ws.send_json(item)
        except (WebSocketDisconnect, RuntimeError, HTTPException):
            pass
        finally:
            app.state.events.unsubscribe(case_id, queue)
            try:
                await ws.close()
            except RuntimeError:
                pass

    @app.websocket("/api/v1/cases/{case_id}/audio")
    async def audio(ws: WebSocket, case_id: str):
        try:
            websocket_user(ws, case_id)
        except HTTPException:
            await ws.close(code=1008)
            return
        await ws.accept()
        if case_id in app.state.hearings:
            await ws.send_json(
                {
                    "type": "error",
                    "message": "A hearing is already running for this case.",
                }
            )
            await ws.close()
            return
        hearing_id = None
        task = asyncio.current_task()
        app.state.hearings[case_id] = task
        try:
            config = await asyncio.wait_for(ws.receive_json(), 10)
            if not config.get("authorized"):
                raise ProviderError(
                    "Confirm that you are authorized to process this audio."
                )
            with app.state.db() as db:
                hearing = case_hearing(db, case_id, config.get("hearing_id"))
                hearing_id = hearing.id
                hearing.status = "live"
                db.get(Case, case_id).status = "live"
                db.commit()
            await app.state.events.publish(case_id, {"type": "session"})
            await asyncio.wait_for(
                stream_speech(
                    app,
                    ws,
                    case_id,
                    config,
                    hearing_id=hearing_id,
                    authorize=lambda: websocket_user(ws, case_id),
                ),
                3600,
            )
        except (WebSocketDisconnect, RuntimeError):
            pass
        except Exception as exc:  # noqa: BLE001 — isolate provider failures from saved testimony
            try:
                await ws.send_json(
                    {
                        "type": "error",
                        "message": str(exc)
                        if isinstance(exc, ProviderError)
                        else "Audio connection failed. Check provider credentials and connectivity, then try again.",
                    }
                )
            except RuntimeError:
                pass
        finally:
            app.state.hearings.pop(case_id, None)
            with app.state.db() as db:
                db.get(Case, case_id).status = "paused"
                if hearing_id:
                    db.get(Hearing, hearing_id).status = "paused"
                db.commit()
            await app.state.events.publish(case_id, {"type": "session"})
            try:
                await ws.close()
            except RuntimeError:
                pass

    register_casebook(app)
    return app
