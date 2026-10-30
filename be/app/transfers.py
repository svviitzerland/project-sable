"""Bounded chunks and private download links avoid Vercel's 4.5 MB envelope."""

import asyncio
import hashlib
import io
import re
import time
from types import SimpleNamespace
from urllib.parse import quote

from fastapi import Depends, HTTPException, Request, UploadFile
from fastapi.responses import RedirectResponse
from pydantic import Field
from sqlalchemy import select
from starlette.datastructures import UploadFile as StarletteUploadFile

from .auth import COOKIE, current_user, session_user
from .models import Contract, FileTransfer, uid
from .runtime import Lease
from .services.providers import request_json

PART_SIZE = 2 * 1024 * 1024
USER = Depends(current_user)


class TransferIn(Contract):
    name: str = Field(min_length=1, max_length=200)
    size: int = Field(ge=1, le=64 * 1024 * 1024)


class TransferOut(Contract):
    id: str
    part_size: int = PART_SIZE


class PartOut(Contract):
    received: int


def key(transfer, index):
    return f"transfers/{transfer.owner_id}/{transfer.id}/{index}"


def owned_transfer(db, ident, user_id):
    transfer = db.get(FileTransfer, ident)
    if (
        not transfer
        or transfer.owner_id != user_id
        or transfer.expires < time.time()
        or transfer.kind != "upload"
    ):
        raise HTTPException(404, "Upload expired or not found. Select the file again.")
    return transfer


async def resolve_upload(request: Request, user=USER):
    form = await request.form()
    file = form.get("file")
    if isinstance(file, StarletteUploadFile):
        return file
    ident = form.get("upload_id")
    if not isinstance(ident, str):
        raise HTTPException(422, "Choose a file to upload.")
    with request.app.state.db() as db:
        transfer = owned_transfer(db, ident, user.id)
    count = (transfer.size + PART_SIZE - 1) // PART_SIZE
    if len(transfer.parts) != count:
        raise HTTPException(409, "File upload is incomplete. Try again.")
    result = io.BytesIO()
    for index in range(count):
        data = await request.app.state.storage.read(
            SimpleNamespace(storage="supabase", storage_key=key(transfer, index))
        )
        if hashlib.sha256(data).hexdigest() != transfer.parts.get(str(index)):
            raise HTTPException(
                409, "Uploaded file integrity check failed. Select the file again."
            )
        result.write(data)
    if result.tell() != transfer.size:
        raise HTTPException(409, "Uploaded file size does not match.")
    result.seek(0)
    return UploadFile(filename=transfer.name, file=result, size=transfer.size)


def register_transfers(app):
    @app.post("/api/v1/transfers", response_model=TransferOut)
    def create(body: TransferIn, user=USER):
        if not app.state.settings.serverless:
            raise HTTPException(404)
        app.state.limiter.check(f"transfers:{user.id}", limit=10, period=3600)
        with app.state.db() as db:
            transfer = FileTransfer(
                owner_id=user.id,
                name=body.name,
                size=body.size,
                expires=time.time() + 3600,
            )
            db.add(transfer)
            db.commit()
            return TransferOut(id=transfer.id)

    @app.put("/api/v1/transfers/{transfer_id}/parts/{index}", response_model=PartOut)
    async def part(transfer_id: str, index: int, request: Request, user=USER):
        if not app.state.settings.serverless:
            raise HTTPException(404)
        async with Lease(app.state.db, f"transfer:{transfer_id}"):
            with app.state.db() as db:
                transfer = owned_transfer(db, transfer_id, user.id)
            count = (transfer.size + PART_SIZE - 1) // PART_SIZE
            if index < 0 or index >= count:
                raise HTTPException(422, "Invalid upload part.")
            data = await request.body()
            expected = min(PART_SIZE, transfer.size - index * PART_SIZE)
            if len(data) != expected:
                raise HTTPException(422, "Upload part has the wrong size.")
            digest = hashlib.sha256(data).hexdigest()
            previous = transfer.parts.get(str(index))
            if previous and previous != digest:
                raise HTTPException(409, "Upload part differs from the saved file.")
            if not previous:
                # Idempotent overwrite also recovers storage-success/DB-failure.
                await app.state.storage.save(
                    key(transfer, index), data, "application/octet-stream", upsert=True
                )
                with app.state.db() as db:
                    current = owned_transfer(db, transfer_id, user.id)
                    current.parts = {**current.parts, str(index): digest}
                    db.commit()
            return PartOut(received=len(data))


async def redirect_large_response(app, request, response):
    if (
        not app.state.settings.serverless
        or response.status_code != 200
        or int(response.headers.get("content-length", "0")) <= 3 * 1024 * 1024
    ):
        return response
    user = session_user(app.state.db, request.cookies.get(COOKIE))
    data = b"".join([chunk async for chunk in response.body_iterator])
    if len(data) > 64 * 1024 * 1024:
        raise HTTPException(413, "Export exceeds the 64 MB transfer limit.")
    transfer = FileTransfer(
        id=uid(),
        owner_id=user.id,
        name="response",
        size=len(data),
        kind="download",
        expires=time.time() + 600,
        parts={"0": "download"},
    )
    with app.state.db() as db:
        db.add(transfer)
        db.commit()
    path = key(transfer, 0)
    await app.state.storage.save(
        path, data, response.headers.get("content-type", "application/octet-stream")
    )
    settings = app.state.settings
    signed = await request_json(
        "POST",
        f"{settings.supabase_url}/storage/v1/object/sign/{settings.bucket}/{path}",
        headers=app.state.storage.headers(),
        json={"expiresIn": 300},
    )
    url = settings.supabase_url + "/storage/v1" + signed["signedURL"]
    disposition = response.headers.get("content-disposition", "")
    if match := re.search(r'filename="([^"\r\n]+)"', disposition):
        url += "&download=" + quote(match.group(1), safe="")
    return RedirectResponse(
        url,
        status_code=303,
        headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"},
    )


async def cleanup_transfers(app):
    with app.state.db() as db:
        expired = db.scalars(
            select(FileTransfer).where(FileTransfer.expires < time.time()).limit(10)
        ).all()
    for transfer in expired:
        count = (
            1
            if transfer.kind == "download"
            else (transfer.size + PART_SIZE - 1) // PART_SIZE
        )
        # Include possibly written parts whose DB commit failed.
        for start in range(0, count, 8):
            await asyncio.gather(
                *(
                    app.state.storage.delete(key(transfer, index), "supabase")
                    for index in range(start, min(start + 8, count))
                )
            )
        with app.state.db() as db:
            current = db.get(FileTransfer, transfer.id)
            if current:
                db.delete(current)
                db.commit()
