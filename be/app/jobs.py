"""A database outbox plus signed QStash deliveries; no post-response tasks on Vercel."""

import asyncio
import hmac
import time

import httpx
from fastapi import HTTPException, Request
from pydantic import Field
from qstash import Receiver
from sqlalchemy import delete, select

from .models import (
    AnalysisJob,
    Contract,
    Finding,
    RuntimeLease,
    RuntimeRate,
    Segment,
    SocketTicket,
)
from .runtime import Lease, insert
from .services.analysis import investigate, schedule, state

CALLBACK = "/api/v1/internal/analysis"
MAX_ATTEMPTS = 3


def stage_job(db, segment_id):
    """Call inside the same transaction that saves/queues the testimony."""
    stmt = insert(db, AnalysisJob).values(
        segment_id=segment_id,
        status="queued",
        attempts=0,
        dispatched_at=0,
        created_at=time.time(),
    )
    db.execute(
        stmt.on_conflict_do_update(
            index_elements=[AnalysisJob.segment_id],
            set_={"status": "queued", "attempts": 0, "dispatched_at": 0},
            where=AnalysisJob.status.in_(["done", "failed"]),
        )
    )


async def dispatch(app, segment_id):
    settings = app.state.settings
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{settings.qstash_url}/v2/publish/{settings.backend_url}{CALLBACK}",
                headers={
                    "Authorization": f"Bearer {settings.qstash_token}",
                    "Upstash-Retries": "3",
                    "Upstash-Timeout": "240s",
                },
                json={"segment_id": segment_id},
            )
            response.raise_for_status()
        with app.state.db() as db:
            job = db.get(AnalysisJob, segment_id)
            if job:
                job.dispatched_at = time.time()
                db.commit()
        return True
    except httpx.HTTPError:
        # Keep the outbox entry. Scheduled recovery can redeliver it without
        # asking a user to resubmit testimony or exposing credentials in errors.
        with app.state.db() as db:
            segment = db.get(Segment, segment_id)
            if segment and segment.analysis_state == "queued":
                segment.analysis_error = (
                    "Analysis delivery is delayed. The saved job will be retried."
                )
                db.commit()
        return False


async def enqueue(app, segment_id, fixture=None):
    if not app.state.settings.serverless:
        schedule(app, investigate(app, segment_id, fixture))
        return
    if not app.state.settings.ai_enabled:
        await state(
            app,
            segment_id,
            "unavailable",
            "AI analysis is not connected. Configure OpenRouter, then retry this statement. Your transcript is saved.",
        )
        with app.state.db() as db:
            job = db.get(AnalysisJob, segment_id)
            if job:
                job.status = "done"
                db.commit()
        return
    await dispatch(app, segment_id)


class Delivery(Contract):
    segment_id: str = Field(min_length=36, max_length=36)


class JobResult(Contract):
    status: str


class RecoveryResult(Contract):
    dispatched: int


async def run_job(app, segment_id):
    async with Lease(app.state.db, f"analysis:{segment_id}"):
        with app.state.db() as db:
            job = db.get(AnalysisJob, segment_id)
            if not job or job.status in {"done", "failed"}:
                return JobResult(status="already handled")
            if db.scalar(select(Finding.id).where(Finding.segment_id == segment_id)):
                job.status = "done"
                db.get(Segment, segment_id).analysis_state = "complete"
                db.commit()
                return JobResult(status="done")
            if job.attempts >= MAX_ATTEMPTS:
                job.status = "failed"
                segment = db.get(Segment, segment_id)
                segment.analysis_state = "failed"
                segment.analysis_error = "Analysis exhausted automatic retries. Retry this statement manually."
                db.commit()
                return JobResult(status="failed")
            job.attempts += 1
            job.status = "running"
            job.dispatched_at = time.time()
            db.commit()
        try:
            await asyncio.wait_for(investigate(app, segment_id), timeout=220)
        except TimeoutError:
            await state(
                app,
                segment_id,
                "interrupted",
                "Analysis timed out; the saved job will be retried.",
            )
        with app.state.db() as db:
            segment = db.get(Segment, segment_id)
            job = db.get(AnalysisJob, segment_id)
            failed = segment.analysis_state in {"failed", "interrupted"}
            job.status = (
                ("failed" if job.attempts >= MAX_ATTEMPTS else "queued")
                if failed
                else "done"
            )
            db.commit()
            status = job.status
        if status == "queued":
            raise HTTPException(503, "Analysis will be retried.")
        return JobResult(status=status)


def register_jobs(app):
    @app.post(CALLBACK, response_model=JobResult)
    async def delivery(request: Request):
        settings = app.state.settings
        if not settings.serverless:
            raise HTTPException(404)
        raw_body = await request.body()
        try:
            body = raw_body.decode("utf-8")
            Receiver(
                current_signing_key=settings.qstash_current_key,
                next_signing_key=settings.qstash_next_key,
            ).verify(
                body=body,
                signature=request.headers.get("Upstash-Signature", ""),
                url=settings.backend_url + CALLBACK,
            )
        except Exception as exc:
            raise HTTPException(401, "Invalid job signature") from exc
        try:
            job = Delivery.model_validate_json(body)
        except ValueError as exc:
            raise HTTPException(422, "Invalid job payload") from exc
        return await run_job(app, job.segment_id)

    @app.get("/api/v1/internal/recover", response_model=RecoveryResult)
    async def recover(request: Request):
        secret = app.state.settings.cron_secret
        if (
            not app.state.settings.serverless
            or not secret
            or not hmac.compare_digest(
                request.headers.get("Authorization", ""), f"Bearer {secret}"
            )
        ):
            raise HTTPException(401, "Recovery authorization required")
        with app.state.db() as db:
            stale = db.scalars(
                select(AnalysisJob.segment_id)
                .where(
                    AnalysisJob.status.in_(["queued", "running"]),
                    AnalysisJob.dispatched_at < time.time() - 360,
                )
                .order_by(AnalysisJob.created_at)
                .limit(20)
            ).all()
            for model in (SocketTicket, RuntimeRate, RuntimeLease):
                db.execute(delete(model).where(model.expires < time.time()))
            db.commit()
        # Bounded batches; failures remain in the outbox for the next sweep.
        results = await asyncio.gather(*(dispatch(app, sid) for sid in stale))
        from .transfers import cleanup_transfers

        await cleanup_transfers(app)
        return RecoveryResult(dispatched=sum(results))
