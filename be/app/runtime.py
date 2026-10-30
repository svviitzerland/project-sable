"""Cross-instance coordination for Vercel, backed by the application database."""

import asyncio
import hashlib
import secrets
import time
from typing import Literal
from weakref import WeakValueDictionary

from fastapi import Depends, HTTPException, Request
from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from .auth import COOKIE, current_user, session_hash
from .database import owned_case
from .models import (
    Contract,
    RuntimeEvent,
    RuntimeLease,
    RuntimeRate,
    Session,
    SocketTicket,
    User,
    uid,
)


def insert(db, model):
    return (sqlite_insert if db.bind.dialect.name == "sqlite" else pg_insert)(model)


class Lease:
    """A bounded function owns a lease longer than its maximum invocation time."""

    def __init__(self, factory, key):
        self.factory, self.key, self.owner = factory, key, uid()
        self.acquired = False

    def locked(self):
        return self.acquired

    async def __aenter__(self):
        with self.factory() as db:
            stmt = insert(db, RuntimeLease).values(
                key=self.key, owner=self.owner, expires=time.time() + 330
            )
            owner = db.scalar(
                stmt.on_conflict_do_update(
                    index_elements=[RuntimeLease.key],
                    set_={"owner": self.owner, "expires": time.time() + 330},
                    where=RuntimeLease.expires < time.time(),
                ).returning(RuntimeLease.owner)
            )
            db.commit()
        if owner != self.owner:
            raise HTTPException(
                409,
                "This operation is already running. Wait for it to finish and retry.",
            )
        self.acquired = True
        return self

    async def __aexit__(self, *_):
        with self.factory() as db:
            db.execute(
                delete(RuntimeLease).where(
                    RuntimeLease.key == self.key, RuntimeLease.owner == self.owner
                )
            )
            db.commit()
        self.acquired = False


class LeaseMap:
    def __init__(self, factory, namespace):
        self.factory, self.namespace = factory, namespace

    def setdefault(self, key, _):
        return Lease(self.factory, f"{self.namespace}:{key}")


def locks(app, namespace):
    return (
        LeaseMap(app.state.db, namespace)
        if app.state.settings.serverless
        else WeakValueDictionary()
    )


class SharedRateLimiter:
    def __init__(self, factory):
        self.factory = factory

    def check(self, key, limit=15, period=60):
        bucket = int(time.time() // period)
        ident = hashlib.sha256(f"{key}:{period}:{bucket}".encode()).hexdigest()
        with self.factory() as db:
            stmt = insert(db, RuntimeRate).values(
                key=ident, hits=1, expires=(bucket + 1) * period
            )
            hits = db.scalar(
                stmt.on_conflict_do_update(
                    index_elements=[RuntimeRate.key],
                    set_={"hits": RuntimeRate.hits + 1},
                    where=RuntimeRate.hits < limit,
                ).returning(RuntimeRate.hits)
            )
            db.commit()
        if hits is None:
            raise HTTPException(429, "Too many requests. Wait a minute and try again.")


class EventReader:
    def __init__(self, factory, case_id):
        self.factory, self.case_id, self.revision = factory, case_id, -1

    async def get(self):
        while True:
            with self.factory() as db:
                event = db.get(RuntimeEvent, self.case_id)
                if event and event.revision != self.revision:
                    self.revision = event.revision
                    return event.payload
            await asyncio.sleep(1)


class SharedEvents:
    """A coalescing notification per case; committed records remain authoritative."""

    def __init__(self, factory):
        self.factory = factory

    async def publish(self, case_id, event):
        with self.factory() as db:
            stmt = insert(db, RuntimeEvent).values(
                case_id=case_id, revision=1, payload=event
            )
            db.execute(
                stmt.on_conflict_do_update(
                    index_elements=[RuntimeEvent.case_id],
                    set_={"revision": RuntimeEvent.revision + 1, "payload": event},
                )
            )
            db.commit()

    def subscribe(self, case_id):
        return EventReader(self.factory, case_id)

    def unsubscribe(self, *_):
        pass


class TicketRequest(Contract):
    purpose: Literal["events", "audio"]


class TicketOut(Contract):
    ticket: str
    expires_in: int = 60


def register_runtime(app):
    user_dep = Depends(current_user)

    @app.post("/api/v1/cases/{case_id}/socket-ticket", response_model=TicketOut)
    def ticket(case_id: str, body: TicketRequest, request: Request, user=user_dep):
        app.state.limiter.check(f"socket-ticket:{user.id}", limit=30)
        token = secrets.token_urlsafe(32)
        with app.state.db() as db:
            owned_case(db, case_id, user.id)
            db.add(
                SocketTicket(
                    token_hash=session_hash(token),
                    session_hash=session_hash(request.cookies[COOKIE]),
                    case_id=case_id,
                    purpose=body.purpose,
                    expires=time.time() + 60,
                )
            )
            db.commit()
        return TicketOut(ticket=token)


def websocket_session(app, ws, case_id):
    """Consume a ticket once, then recheck the original session on every guard."""
    if "jude_session_hash" not in ws.scope:
        token = ws.query_params.get("ticket")
        if token:
            purpose = ws.url.path.rsplit("/", 1)[-1]
            with app.state.db() as db:
                ticket = db.execute(
                    delete(SocketTicket)
                    .where(
                        SocketTicket.token_hash == session_hash(token),
                        SocketTicket.case_id == case_id,
                        SocketTicket.purpose == purpose,
                        SocketTicket.expires > time.time(),
                    )
                    .returning(SocketTicket.session_hash)
                ).scalar_one_or_none()
                db.commit()
            if not ticket:
                raise HTTPException(401, "Connection ticket expired or already used.")
            ws.scope["jude_session_hash"] = ticket
        else:
            ws.scope["jude_session_hash"] = session_hash(ws.cookies.get(COOKIE, ""))
    with app.state.db() as db:
        session = db.get(Session, ws.scope["jude_session_hash"])
        if not session or session.expires <= time.time():
            raise HTTPException(401, "Sign in to reconnect.")
        owned_case(db, case_id, session.user_id)
        return db.get(User, session.user_id)
