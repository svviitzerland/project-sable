import asyncio
import hashlib
import io
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree

from fastapi import HTTPException
from pypdf import PdfReader
from sqlalchemy import select

from ..models import Chunk, Document, uid
from .providers import ProviderError

MAX_BYTES = 6 * 1024 * 1024
MAX_TEXT = 400_000


def extract_pages(name, data):
    suffix = Path(name).suffix.lower()
    try:
        if suffix == ".pdf":
            reader = PdfReader(io.BytesIO(data))
            if reader.is_encrypted or len(reader.pages) > 200:
                raise ValueError("Use an unencrypted PDF with at most 200 pages.")
            pages = [
                (i + 1, page.extract_text() or "")
                for i, page in enumerate(reader.pages)
            ]
            mime = "application/pdf"
        elif suffix == ".docx":
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                info = z.getinfo("word/document.xml")
                if info.file_size > 4_000_000:
                    raise ValueError("Document is too large after decompression.")
                root = ElementTree.fromstring(z.read(info))
                ns = {
                    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                }
                text = "\n".join(
                    "".join(p.itertext()) for p in root.findall(".//w:p", ns)
                )
                pages = [(1, text)]
            mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif suffix in {".txt", ".md"}:
            pages = [
                (i + 1, text)
                for i, text in enumerate(data.decode("utf-8-sig").split("\f"))
            ]
            mime = "text/plain"
        else:
            raise ValueError("Upload PDF, DOCX, TXT, or Markdown files.")
        if sum(len(text) for _, text in pages) > MAX_TEXT:
            raise ValueError(
                "Document exceeds 400,000 extracted characters. Split it into smaller files."
            )
        if not any(text.strip() for _, text in pages):
            raise ValueError(
                "No readable text found. Scanned PDFs need OCR before upload."
            )
        return [(page, text.replace("\x00", "").strip()) for page, text in pages], mime
    except Exception as exc:
        if isinstance(exc, ValueError):
            raise HTTPException(422, str(exc)) from exc
        raise HTTPException(
            422,
            "This document could not be read. Export a text-based PDF or UTF-8 text file.",
        ) from exc


def chunk_pages(pages):
    chunks = []
    for page, content in pages:
        for start in range(0, len(content), 1200):
            text = content[start : start + 1450].strip()
            if text:
                chunks.append((page, text))
    return chunks


async def ingest(app, case, name, data):
    if not data or len(data) > MAX_BYTES:
        raise HTTPException(413, "Upload a non-empty file up to 6 MB.")
    name = (
        re.sub(r"[\x00-\x1f]", "", Path(name.replace("\\", "/")).name)[:200]
        or "document.txt"
    )
    digest = hashlib.sha256(data).hexdigest()
    with app.state.db() as db:
        existing = db.scalar(
            select(Document).where(
                Document.case_id == case.id, Document.digest == digest
            )
        )
        if existing:
            return existing
        count = len(
            db.scalars(select(Document.id).where(Document.case_id == case.id)).all()
        )
        if count >= 40:
            raise HTTPException(422, "This MVP supports up to 40 documents per case.")
    pages, mime = await asyncio.to_thread(extract_pages, name, data)
    slices = chunk_pages(pages)
    vectors = None
    if app.state.settings.openrouter_key:
        try:
            vectors = []
            for start in range(0, len(slices), 24):
                vectors.extend(
                    await app.state.llm.embed(
                        [text for _, text in slices[start : start + 24]]
                    )
                )
        except ProviderError:
            vectors = None  # keyword search remains available and is labeled in search responses
    doc_id = uid()
    key = f"{case.owner_id}/{case.id}/{doc_id}{Path(name).suffix.lower()}"
    storage = await app.state.storage.save(key, data, mime)
    with app.state.db() as db:
        document = Document(
            id=doc_id,
            case_id=case.id,
            name=name,
            mime=mime,
            storage_key=key,
            storage=storage,
            digest=digest,
            pages=len(pages),
        )
        db.add(document)
        db.flush()
        for index, (page, text) in enumerate(slices):
            db.add(
                Chunk(
                    case_id=case.id,
                    document_id=doc_id,
                    page=page,
                    section="Text section"
                    if Path(name).suffix.lower() == ".docx"
                    else "",
                    text=text,
                    embedding=vectors[index] if vectors else None,
                )
            )
        db.commit()
        return document
