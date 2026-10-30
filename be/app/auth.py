import hashlib
import hmac
import secrets
import time
from collections import defaultdict

from fastapi import HTTPException, Request
from sqlalchemy import select

from .models import Session, User

COOKIE = "jude_session"
TTL = 12 * 60 * 60


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(
        password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1
    ).hex()
    return f"{salt}:{digest}"


def check_password(password, stored):
    try:
        salt, digest = stored.split(":")
        candidate = hashlib.scrypt(
            password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1
        ).hex()
        return hmac.compare_digest(candidate, digest)
    except (ValueError, TypeError):
        return False


def session_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def issue_session(db, user, response, settings):
    token = secrets.token_urlsafe(32)
    db.add(
        Session(
            token_hash=session_hash(token), user_id=user.id, expires=time.time() + TTL
        )
    )
    db.commit()
    response.set_cookie(
        COOKIE,
        token,
        httponly=True,
        samesite="strict",
        secure=settings.production,
        max_age=TTL,
        path="/",
    )


def session_user(factory, token):
    if not token:
        raise HTTPException(401, "Sign in to continue")
    with factory() as db:
        session = db.get(Session, session_hash(token))
        if not session or session.expires <= time.time():
            raise HTTPException(401, "Session expired. Please sign in again.")
        user = db.get(User, session.user_id)
        if not user:
            raise HTTPException(401, "Sign in to continue")
        return user


def current_user(request: Request):
    return session_user(request.app.state.db, request.cookies.get(COOKIE))


class RateLimiter:
    def __init__(self):
        self.hits = defaultdict(list)

    def check(self, key, limit=15, period=60):
        now = time.monotonic()
        if len(self.hits) > 10000:
            self.hits = defaultdict(
                list, {k: v for k, v in self.hits.items() if v and v[-1] > now - period}
            )
        recent = [t for t in self.hits[key] if t > now - period]
        if len(recent) >= limit:
            raise HTTPException(429, "Too many requests. Wait a minute and try again.")
        recent.append(now)
        self.hits[key] = recent


def revoke(db, token):
    session = db.scalar(
        select(Session).where(Session.token_hash == session_hash(token or ""))
    )
    if session:
        db.delete(session)
        db.commit()
