"""Versioned, bounded .jude interchange; never extract archive paths to disk."""

import hashlib
import io
import json
import zipfile
from pathlib import PurePosixPath
from typing import Literal

from fastapi import HTTPException
from pydantic import Field, ValidationError
from sqlalchemy import select

from ..models import (
    Case,
    CaseOut,
    Chunk,
    Contract,
    Document,
    DocumentOut,
    EvidenceLink,
    Finding,
    FindingOut,
    Hearing,
    HearingOut,
    Segment,
    SegmentOut,
    SourceOut,
    uid,
)
from .analysis import validate_citations
from .providers import ProviderError

MAX_ARCHIVE = 64 * 1024 * 1024
MAX_MANIFEST = 12 * 1024 * 1024


class LinkOut(Contract):
    id: str
    source_id: str
    target_id: str
    relation: Literal["supports", "conflicts", "context", "related"]
    explanation: str = Field(max_length=2000)
    basis: str
    confirmed: bool
    score: float | None
    source_quote: str = Field(max_length=3000)
    target_quote: str = Field(max_length=3000)
    created_at: str = Field(max_length=40)


class PackedDocument(DocumentOut):
    name: str = Field(min_length=1, max_length=200)
    mime: str = Field(min_length=1, max_length=100)
    created_at: str = Field(max_length=40)
    pages: int = Field(ge=1)
    file: str
    sha256: str


class CaseArchive(Contract):
    format: Literal["jude"]
    version: Literal[1]
    kind: Literal["case"]
    case: CaseOut
    documents: list[PackedDocument] = Field(max_length=40)
    sources: list[SourceOut] = Field(max_length=14000)
    hearings: list[HearingOut] = Field(max_length=100)
    segments: list[SegmentOut] = Field(max_length=2000)
    findings: list[FindingOut] = Field(max_length=2000)
    links: list[LinkOut] = Field(max_length=1000)


def pack(manifest, files=None):
    encoded = json.dumps(manifest, ensure_ascii=False).encode()
    files = files or {}
    if (
        len(encoded) > MAX_MANIFEST
        or sum(map(len, files.values())) + len(encoded) > MAX_ARCHIVE
    ):
        raise HTTPException(413, "This case exceeds the 64 MB .jude archive limit.")
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("manifest.json", encoded)
        for name, data in files.items():
            archive.writestr(name, data)
    return output.getvalue()


def unpack(data):
    if len(data) > MAX_ARCHIVE:
        raise HTTPException(413, "Use a .jude archive up to 64 MB.")
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            entries = archive.infolist()
            names = [entry.filename for entry in entries]
            if (
                len(entries) > 42
                or len(names) != len(set(names))
                or sum(e.file_size for e in entries) > MAX_ARCHIVE
            ):
                raise ValueError("Archive exceeds its entry or expanded-size limit")
            for entry in entries:
                path = PurePosixPath(entry.filename)
                if (
                    path.is_absolute()
                    or ".." in path.parts
                    or "\\" in entry.filename
                    or entry.flag_bits & 1
                ):
                    raise ValueError("Invalid or encrypted archive entry")
            manifest = archive.getinfo("manifest.json")
            if manifest.file_size > MAX_MANIFEST:
                raise ValueError("Manifest is too large")
            payload = json.loads(archive.read(manifest))
            if (
                not isinstance(payload, dict)
                or payload.get("format") != "jude"
                or type(payload.get("version")) is not int
                or payload.get("version") != 1
            ):
                raise ValueError("Unsupported .jude format/version; expected version 1")
            files = {
                name: archive.read(name) for name in names if name != "manifest.json"
            }
            return payload, files
    except (
        ValueError,
        KeyError,
        zipfile.BadZipFile,
        RuntimeError,
        NotImplementedError,
    ) as exc:
        raise HTTPException(422, f"Cannot read this .jude archive: {exc}") from exc


async def export_case(app, case):
    with app.state.db() as db:
        documents = db.scalars(
            select(Document).where(Document.case_id == case.id)
        ).all()
        chunks = db.scalars(select(Chunk).where(Chunk.case_id == case.id)).all()
        names = {d.id: d.name for d in documents}
        manifest = {
            "format": "jude",
            "version": 1,
            "kind": "case",
            "case": CaseOut.model_validate(case).model_dump(),
            "documents": [],
            "sources": [
                SourceOut(
                    id=c.id,
                    document_id=c.document_id,
                    document_name=names[c.document_id],
                    page=c.page,
                    section=c.section,
                    text=c.text,
                ).model_dump()
                for c in chunks
            ],
        }
        for key, model, contract in [
            ("hearings", Hearing, HearingOut),
            ("segments", Segment, SegmentOut),
            ("findings", Finding, FindingOut),
            ("links", EvidenceLink, LinkOut),
        ]:
            manifest[key] = [
                contract.model_validate(row).model_dump()
                for row in db.scalars(
                    select(model).where(model.case_id == case.id)
                ).all()
            ]
    files = {}
    for document in documents:
        data = await app.state.storage.read(document)
        name = f"originals/{document.id}"
        files[name] = data
        if sum(map(len, files.values())) > MAX_ARCHIVE:
            raise HTTPException(413, "This case exceeds the 64 MB archive limit.")
        manifest["documents"].append(
            {
                **DocumentOut.model_validate(document).model_dump(),
                "file": name,
                "sha256": hashlib.sha256(data).hexdigest(),
            }
        )
    try:
        CaseArchive.model_validate(manifest)
    except ValidationError as exc:
        raise HTTPException(
            413, "This case exceeds the version 1 archive record limits."
        ) from exc
    return pack(manifest, files)


def validate_case_archive(data):
    payload, files = unpack(data)
    try:
        archive = CaseArchive.model_validate(payload)
        collections = [
            archive.documents,
            archive.sources,
            archive.hearings,
            archive.segments,
            archive.findings,
            archive.links,
        ]
        for collection in collections:
            if len({item.id for item in collection}) != len(collection):
                raise ValueError("Duplicate record IDs")
        identifiers = [item.id for group in collections for item in group]
        if len(set(identifiers)) != len(identifiers):
            raise ValueError("Record IDs must be unique across the archive")
        if len({d.sha256 for d in archive.documents}) != len(archive.documents):
            raise ValueError("Duplicate original file contents")
        docs = {d.id: d for d in archive.documents}
        sources = {s.id: s for s in archive.sources}
        hearings = {h.id: h for h in archive.hearings}
        segments = {s.id: s for s in archive.segments}
        if len({d.file for d in docs.values()}) != len(docs) or {
            d.file for d in docs.values()
        } != set(files):
            raise ValueError("Original files do not match the manifest")
        for document in docs.values():
            original = files[document.file]
            if (
                document.case_id != archive.case.id
                or len(original) > 6 * 1024 * 1024
                or hashlib.sha256(original).hexdigest() != document.sha256
            ):
                raise ValueError("Original file integrity or ownership mismatch")
        for source in sources.values():
            if (
                source.document_id not in docs
                or source.page < 1
                or source.page > docs[source.document_id].pages
                or len(source.section) > 100
                or len(source.text) > 10000
            ):
                raise ValueError("Invalid source provenance")
        for hearing in hearings.values():
            if hearing.case_id != archive.case.id or (
                hearing.source_document_id and hearing.source_document_id not in docs
            ):
                raise ValueError("Invalid hearing provenance")
        for segment in segments.values():
            if segment.hearing_id and segment.hearing_id not in hearings:
                raise ValueError("Transcript refers to a missing hearing")
            if segment.end and segment.end < segment.start:
                raise ValueError("Transcript timestamps are reversed")
        if len({f.segment_id for f in archive.findings}) != len(archive.findings):
            raise ValueError("Duplicate findings for a statement")
        for finding in archive.findings:
            if finding.segment_id not in segments:
                raise ValueError("Finding refers to a missing statement")
            validate_citations(finding, archive.sources)
        pairs = set()
        for link in archive.links:
            pair = (link.source_id, link.target_id)
            if (
                link.source_id == link.target_id
                or pair in pairs
                or any(id not in sources for id in pair)
            ):
                raise ValueError("Invalid evidence relationship")
            pairs.add(pair)
            if (
                link.source_quote not in sources[link.source_id].text
                or link.target_quote not in sources[link.target_id].text
            ):
                raise ValueError("Relationship quotations do not match evidence")
        return archive, files
    except (ValidationError, ValueError, ProviderError) as exc:
        # ProviderError from citation validation is deliberately an invalid archive, not a provider outage.
        raise HTTPException(422, "Invalid .jude case: " + str(exc)[:500]) from exc


async def import_case(app, user, data):
    archive, files = validate_case_archive(data)
    mapping = {
        item.id: uid()
        for group in [
            archive.documents,
            archive.sources,
            archive.hearings,
            archive.segments,
            archive.findings,
            archive.links,
        ]
        for item in group
    }
    case_id = uid()
    saved = []
    try:
        for document in archive.documents:
            key = f"{user.id}/{case_id}/{mapping[document.id]}"
            backend = await app.state.storage.save(
                key, files[document.file], document.mime
            )
            saved.append((document, key, backend))
        with app.state.db() as db:
            case = Case(
                id=case_id,
                owner_id=user.id,
                title=archive.case.title,
                reference=archive.case.reference,
                description=archive.case.description,
                synthetic=archive.case.synthetic,
                speakers=archive.case.speakers,
            )
            db.add(case)
            db.flush()
            for document, key, backend in saved:
                db.add(
                    Document(
                        id=mapping[document.id],
                        case_id=case_id,
                        name=document.name,
                        mime=document.mime,
                        storage_key=key,
                        storage=backend,
                        digest=document.sha256,
                        pages=document.pages,
                    )
                )
            db.flush()
            for source in archive.sources:
                db.add(
                    Chunk(
                        id=mapping[source.id],
                        case_id=case_id,
                        document_id=mapping[source.document_id],
                        page=source.page,
                        section=source.section,
                        text=source.text,
                    )
                )
            for hearing in archive.hearings:
                db.add(
                    Hearing(
                        id=mapping[hearing.id],
                        case_id=case_id,
                        title=hearing.title,
                        date=hearing.date,
                        kind="imported",
                        status="complete",
                        source_document_id=mapping.get(hearing.source_document_id),
                    )
                )
            db.flush()
            fallback = None
            if any(s.hearing_id is None for s in archive.segments):
                fallback = Hearing(
                    case_id=case_id,
                    title="Imported hearing",
                    kind="imported",
                    status="complete",
                )
                db.add(fallback)
                db.flush()
            for segment in archive.segments:
                values = segment.model_dump(
                    exclude={
                        "id",
                        "hearing_id",
                        "origin",
                        "analysis_state",
                        "analysis_error",
                    }
                )
                db.add(
                    Segment(
                        id=mapping[segment.id],
                        case_id=case_id,
                        hearing_id=mapping.get(segment.hearing_id) or fallback.id,
                        origin="imported",
                        analysis_state="complete"
                        if any(f.segment_id == segment.id for f in archive.findings)
                        else "unavailable",
                        **values,
                    )
                )
            db.flush()
            for finding in archive.findings:
                review = {}
                for key in ("summary", "analyst_summary", "legal_note", "retrieval"):
                    if isinstance(finding.review.get(key), str):
                        review[key] = finding.review[key][:4000]
                for key in ("alternative_explanations", "missing_context"):
                    value = finding.review.get(key)
                    if isinstance(value, list):
                        review[key] = [
                            v[:2000] for v in value[:20] if isinstance(v, str)
                        ]
                values = finding.model_dump(
                    exclude={
                        "id",
                        "segment_id",
                        "citations",
                        "mode",
                        "reviewed",
                        "legal",
                        "review",
                    }
                )
                db.add(
                    Finding(
                        id=mapping[finding.id],
                        case_id=case_id,
                        segment_id=mapping[finding.segment_id],
                        citations=[
                            {**c.model_dump(), "chunk_id": mapping[c.chunk_id]}
                            for c in finding.citations
                        ],
                        mode="imported",
                        reviewed=False,
                        legal=[],
                        review=review,
                        **values,
                    )
                )
            for link in archive.links:
                values = link.model_dump(
                    exclude={"id", "source_id", "target_id", "basis", "confirmed"}
                )
                db.add(
                    EvidenceLink(
                        id=mapping[link.id],
                        case_id=case_id,
                        source_id=mapping[link.source_id],
                        target_id=mapping[link.target_id],
                        basis="imported",
                        confirmed=False,
                        **values,
                    )
                )
            db.commit()
            return case
    except BaseException:
        for _, key, backend in saved:
            await app.state.storage.delete(key, backend)
        raise
