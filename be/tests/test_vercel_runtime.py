import asyncio
import base64
import hashlib
import json
import time
from types import SimpleNamespace

import httpx
import jwt
import pytest
from fastapi import Depends, HTTPException
from fastapi.responses import Response
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app import jobs
from app.config import Settings
from app.factory import create_app
from app.models import AnalysisJob, Case, FileTransfer, RuntimeLease, Segment
from app.runtime import Lease, SharedEvents, SharedRateLimiter
from app.transfers import PART_SIZE, cleanup_transfers, resolve_upload

KEY = "test-signing-key-with-at-least-thirty-two-bytes"


class Storage:
    def __init__(self):
        self.files = {}
        self.settings = SimpleNamespace()

    async def save(self, key, data, mime, upsert=False):
        if not upsert:
            assert key not in self.files
        self.files[key] = data
        return "supabase"

    async def read(self, document):
        return self.files[document.storage_key]

    async def delete(self, key, storage):
        self.files.pop(key, None)

    def headers(self):
        return {}


def hosted_settings(tmp_path):
    settings = Settings(data_dir=tmp_path)
    create_app(settings)  # Bootstrap only the disposable SQLite test database.
    settings.serverless = True  # Unit tests exercise both SQL dialects; PG separately.
    settings.production = True
    settings.backend_url = "https://backend.example"
    settings.qstash_token = "test-token"
    settings.qstash_current_key = settings.qstash_next_key = KEY
    settings.cron_secret = "recovery-secret"
    settings.supabase_url = "https://storage.example"
    settings.supabase_key = "test-storage-key"
    settings.origins = ["https://frontend.example"]
    return settings


@pytest.fixture
def hosted(tmp_path):
    settings = hosted_settings(tmp_path)
    a, b = create_app(settings), create_app(settings)
    a.state.storage = b.state.storage = Storage()
    with TestClient(a, base_url="https://frontend.example") as client:
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "hosted@example.test",
                "name": "Counsel",
                "password": "long-test-password",
            },
        )
        assert response.status_code == 200
        cid = client.post("/api/v1/cases", json={"title": "Shared case"}).json()["id"]
        yield a, b, client, cid


def signature(body, url="https://backend.example/api/v1/internal/analysis"):
    return jwt.encode(
        {
            "iss": "Upstash",
            "sub": url,
            "exp": int(time.time()) + 60,
            "nbf": int(time.time()) - 1,
            "body": base64.urlsafe_b64encode(hashlib.sha256(body.encode()).digest())
            .decode()
            .rstrip("="),
        },
        KEY,
        algorithm="HS256",
    )


def test_serverless_configuration_never_falls_back_to_local_data(tmp_path):
    with pytest.raises(ValueError, match="PostgreSQL"):
        Settings(data_dir=tmp_path, serverless=True)
    with pytest.raises(ValueError, match="Missing Vercel configuration"):
        Settings(data_dir=tmp_path, serverless=True, database_url="postgresql://unused")


def test_cold_start_preserves_other_instances_work(hosted):
    a, _, _, cid = hosted
    with a.state.db() as db:
        db.get(Case, cid).status = "live"
        segment = Segment(
            case_id=cid,
            text="Saved testimony",
            speaker="Witness",
            analysis_state="analyzing",
        )
        db.add(segment)
        db.commit()
        sid = segment.id
    c = create_app(a.state.settings)
    with c.state.db() as db:
        assert db.get(Case, cid).status == "live"
        assert db.get(Segment, sid).analysis_state == "analyzing"


def test_shared_leases_rates_and_events(hosted):
    a, b, _, cid = hosted

    async def run():
        first = Lease(a.state.db, "same-operation")
        async with first:
            with pytest.raises(HTTPException) as error:
                async with Lease(b.state.db, "same-operation"):
                    pass
            assert error.value.status_code == 409
            with a.state.db() as db:
                db.get(RuntimeLease, "same-operation").expires = 0
                db.commit()
            successor = Lease(b.state.db, "same-operation")
            await successor.__aenter__()
        # A stale owner cannot delete the successor's lease.
        with a.state.db() as db:
            assert db.get(RuntimeLease, "same-operation").owner == successor.owner
        await successor.__aexit__()
        reader = SharedEvents(a.state.db).subscribe(cid)
        await SharedEvents(b.state.db).publish(cid, {"type": "transcript"})
        assert await asyncio.wait_for(reader.get(), 2) == {"type": "transcript"}

    asyncio.run(run())
    SharedRateLimiter(a.state.db).check("shared-quota", limit=1, period=3600)
    with pytest.raises(HTTPException) as error:
        SharedRateLimiter(b.state.db).check("shared-quota", limit=1, period=3600)
    assert error.value.status_code == 429


def test_case_bound_single_use_socket_ticket_across_instances(hosted):
    a, b, client, cid = hosted
    ticket = client.post(
        f"/api/v1/cases/{cid}/socket-ticket", json={"purpose": "events"}
    ).json()["ticket"]
    with TestClient(b, base_url="https://backend.example") as backend:
        with (
            pytest.raises(WebSocketDisconnect),
            backend.websocket_connect(
                f"/api/v1/cases/{cid}/audio?ticket={ticket}",
                headers={"origin": "https://frontend.example"},
            ),
        ):
            pass
        with backend.websocket_connect(
            f"/api/v1/cases/{cid}/events?ticket={ticket}",
            headers={"origin": "https://frontend.example"},
        ) as socket:
            assert socket.receive_json()["type"] == "connected"
            client.post("/api/v1/auth/logout")
            asyncio.run(a.state.events.publish(cid, {"type": "session"}))
            with pytest.raises(WebSocketDisconnect):
                socket.receive_json()
        with (
            pytest.raises(WebSocketDisconnect),
            backend.websocket_connect(
                f"/api/v1/cases/{cid}/events?ticket={ticket}",
                headers={"origin": "https://frontend.example"},
            ),
        ):
            pass


def test_signed_job_delivery_is_idempotent_and_retryable(hosted, monkeypatch):
    a, b, client, cid = hosted
    # Offline intake finishes with an honest unavailable state, not a lost task.
    segment = client.post(
        f"/api/v1/cases/{cid}/transcripts",
        json={"speaker": "Witness", "text": "The gate was closed."},
    ).json()
    sid = segment["id"]
    with a.state.db() as db:
        job = db.get(AnalysisJob, sid)
        assert job.status == "done"
        job.status = "queued"
        db.commit()
    calls = []

    async def investigate(app, segment_id):
        calls.append(segment_id)
        with app.state.db() as db:
            db.get(Segment, segment_id).analysis_state = (
                "failed" if len(calls) == 1 else "complete"
            )
            db.commit()

    monkeypatch.setattr(jobs, "investigate", investigate)
    body = json.dumps({"segment_id": sid})
    with TestClient(b, base_url="https://backend.example") as backend:
        assert backend.post(jobs.CALLBACK, content=body).status_code == 401
        assert (
            backend.post(
                jobs.CALLBACK,
                content=body + " ",
                headers={"Upstash-Signature": signature(body)},
            ).status_code
            == 401
        )
        assert (
            backend.post(
                jobs.CALLBACK,
                content=body,
                headers={"Upstash-Signature": signature(body, "https://wrong.example")},
            ).status_code
            == 401
        )
        headers = {"Upstash-Signature": signature(body)}
        assert (
            backend.post(jobs.CALLBACK, content=body, headers=headers).status_code
            == 503
        )
        assert (
            backend.post(jobs.CALLBACK, content=body, headers=headers).json()["status"]
            == "done"
        )
        assert (
            backend.post(jobs.CALLBACK, content=body, headers=headers).status_code
            == 200
        )
    assert calls == [sid, sid]


def test_outbox_survives_publish_failure_and_recovers_on_other_instance(
    hosted, monkeypatch
):
    a, b, client, cid = hosted
    a.state.settings.openrouter_key = a.state.settings.model = "configured-test"
    attempts = []

    async def post(self, url, **kwargs):
        attempts.append((url, kwargs))
        if len(attempts) == 1:
            raise httpx.ConnectError("test offline")
        return httpx.Response(
            200, json={"messageId": "test"}, request=httpx.Request("POST", url)
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    segment = client.post(
        f"/api/v1/cases/{cid}/transcripts",
        json={"speaker": "Witness", "text": "Durable pending testimony."},
    ).json()
    sid = segment["id"]
    with a.state.db() as db:
        assert db.get(AnalysisJob, sid).dispatched_at == 0
        assert db.get(Segment, sid).analysis_state == "queued"
    with TestClient(b, base_url="https://backend.example") as backend:
        assert backend.get("/api/v1/internal/recover").status_code == 401
        assert (
            backend.get(
                "/api/v1/internal/recover",
                headers={"Authorization": "Bearer recovery-secret"},
            ).json()["dispatched"]
            == 1
        )
    assert attempts[-1][1]["json"] == {"segment_id": sid}
    assert "testimony" not in json.dumps(attempts[-1][1]["json"])


def test_chunked_upload_reassembly_ownership_and_cleanup(hosted):
    a, b, client, _ = hosted
    dependency = Depends(resolve_upload)

    @b.post("/test/assemble")
    async def assemble(file=dependency):
        data = await file.read()
        return {"size": len(data), "digest": hashlib.sha256(data).hexdigest()}

    content = b"a" * PART_SIZE + b"b" * 100
    ident = client.post(
        "/api/v1/transfers", json={"name": "case.jude", "size": len(content)}
    ).json()["id"]
    with TestClient(
        b, base_url="https://frontend.example", cookies=client.cookies
    ) as other:
        assert (
            other.put(
                f"/api/v1/transfers/{ident}/parts/0", content=content[:PART_SIZE]
            ).status_code
            == 200
        )
        assert (
            other.put(
                f"/api/v1/transfers/{ident}/parts/0", content=content[:PART_SIZE]
            ).status_code
            == 200
        )
        assert (
            other.put(
                f"/api/v1/transfers/{ident}/parts/0", content=b"x" * PART_SIZE
            ).status_code
            == 409
        )
        assert (
            other.post("/test/assemble", data={"upload_id": ident}).status_code == 409
        )
        assert (
            other.put(
                f"/api/v1/transfers/{ident}/parts/1", content=content[PART_SIZE:]
            ).status_code
            == 200
        )
        assert other.post("/test/assemble", data={"upload_id": ident}).json() == {
            "size": len(content),
            "digest": hashlib.sha256(content).hexdigest(),
        }
        other.cookies.clear()
        other.post(
            "/api/v1/auth/register",
            json={
                "email": "other@example.test",
                "name": "Other",
                "password": "long-test-password",
            },
        )
        assert (
            other.post("/test/assemble", data={"upload_id": ident}).status_code == 404
        )
    with a.state.db() as db:
        db.get(FileTransfer, ident).expires = 0
        db.commit()
    asyncio.run(cleanup_transfers(a))
    assert not a.state.storage.files


def test_large_responses_use_private_expiring_storage_links(hosted, monkeypatch):
    a, _, client, _ = hosted
    data = b"archive" * 500000

    @a.get("/test/export")
    async def export():
        return Response(
            data,
            media_type="application/vnd.jude+zip",
            headers={"Content-Disposition": 'attachment; filename="case.jude"'},
        )

    async def sign(*args, **kwargs):
        assert kwargs["json"] == {"expiresIn": 300}
        return {"signedURL": "/object/sign/jude-documents/test?token=short-lived"}

    monkeypatch.setattr("app.transfers.request_json", sign)
    response = client.get("/test/export", follow_redirects=False)
    assert response.status_code == 303
    assert response.headers["location"].startswith(
        "https://storage.example/storage/v1/object/sign/"
    )
    assert response.headers["location"].endswith("&download=case.jude")
    assert response.headers["cache-control"] == "no-store"
    assert list(a.state.storage.files.values()) == [data]
