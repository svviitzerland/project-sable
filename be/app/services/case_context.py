"""Bounded context assembled only from the current case, never practice output."""

from fastapi import HTTPException
from sqlalchemy import select

from ..models import Chunk, Document, EvidenceLink, Finding, Hearing, Segment
from .retrieval import retrieve, tokens


def inventory(db, case_id):
    documents = db.scalars(
        select(Document)
        .where(Document.case_id == case_id)
        .order_by(Document.created_at)
    ).all()
    hearings = db.scalars(
        select(Hearing).where(Hearing.case_id == case_id).order_by(Hearing.created_at)
    ).all()
    return documents, hearings


async def case_context(app, case, query, reference_ids):
    retrieved, method = await retrieve(app, case.id, query, limit=8)
    with app.state.db() as db:
        documents, hearings = inventory(db, case.id)
        names = {d.id: d.name for d in documents}
        hearing_names = {h.id: h.title for h in hearings}
        chunks = db.scalars(
            select(Chunk)
            .where(Chunk.case_id == case.id)
            .order_by(Chunk.document_id, Chunk.page, Chunk.id)
        ).all()
        segments = db.scalars(
            select(Segment)
            .where(Segment.case_id == case.id)
            .order_by(Segment.created_at, Segment.id)
        ).all()
        chunk_map = {c.id: c for c in chunks}
        segment_map = {s.id: s for s in segments}
        chosen = []

        def passage(c):
            return {
                "chunk_id": c.id,
                "kind": "document",
                "title": names[c.document_id],
                "text": c.text[:2400],
                "document_id": c.document_id,
                "page": c.page,
                "hearing_id": None,
            }

        def testimony(s):
            return {
                "chunk_id": f"statement:{s.id}",
                "kind": "testimony",
                "title": f"{hearing_names.get(s.hearing_id, 'Hearing')} · {case.speakers.get(s.speaker, s.speaker)}",
                "text": s.text[:2400],
                "document_id": None,
                "page": None,
                "hearing_id": s.hearing_id,
            }

        for ref in reference_ids:
            kind, _, ident = ref.partition(":")
            if kind == "document" and ident in names:
                chosen.extend(
                    passage(c)
                    for c in [c for c in chunks if c.document_id == ident][:3]
                )
            elif kind == "hearing" and ident in hearing_names:
                candidates = [s for s in segments if s.hearing_id == ident]
                candidates.sort(
                    key=lambda s: len(tokens(s.text) & tokens(query)), reverse=True
                )
                chosen.extend(testimony(s) for s in candidates[:4])
            elif kind == "passage" and ident in chunk_map:
                chosen.append(passage(chunk_map[ident]))
            elif kind == "statement" and ident in segment_map:
                chosen.append(testimony(segment_map[ident]))
            else:
                raise HTTPException(
                    404, "Referenced material does not belong to this case."
                )
        chosen.extend(passage(chunk_map[s.id]) for s in retrieved if s.id in chunk_map)
        ranked = sorted(
            segments, key=lambda s: len(tokens(s.text) & tokens(query)), reverse=True
        )
        chosen.extend(testimony(s) for s in ranked[:8])
        links = db.scalars(
            select(EvidenceLink).where(
                EvidenceLink.case_id == case.id, EvidenceLink.confirmed.is_(True)
            )
        ).all()
        selected_ids = {s["chunk_id"] for s in chosen}
        relevant_links = [
            link
            for link in links
            if link.source_id in selected_ids or link.target_id in selected_ids
        ][:8]
        for link in relevant_links:
            chosen.extend(
                passage(chunk_map[cid])
                for cid in [link.source_id, link.target_id]
                if cid in chunk_map
            )
        # Representative source coverage for broad case-overview questions.
        for document in documents:
            first = next((c for c in chunks if c.document_id == document.id), None)
            if first:
                chosen.append(passage(first))
        sources = []
        seen = set()
        for source in chosen:
            if source["chunk_id"] not in seen:
                seen.add(source["chunk_id"])
                sources.append(source)
            if len(sources) == 20:
                break
        findings = db.scalars(
            select(Finding)
            .where(Finding.case_id == case.id)
            .order_by(Finding.created_at.desc())
            .limit(40)
        ).all()
        payload = {
            "case": {
                "title": case.title,
                "reference": case.reference,
                "description": case.description,
                "synthetic": case.synthetic,
            },
            "documents": [
                {"id": d.id, "name": d.name, "pages": d.pages} for d in documents
            ],
            "hearings": [
                {"id": h.id, "title": h.title, "date": h.date} for h in hearings[:100]
            ],
            "findings_are_interpretations_not_facts": [
                {
                    "status": f.status,
                    "title": f.title,
                    "verification": f.verification,
                    "reviewed": f.reviewed,
                }
                for f in findings
            ],
            "confirmed_connections_are_human_reviewed_not_proof": [
                {
                    "source_id": x.source_id,
                    "target_id": x.target_id,
                    "relation": x.relation,
                    "explanation": x.explanation[:600],
                }
                for x in relevant_links
            ],
            "sources": sources,
        }
    notice = f"Using {len(sources)} excerpts from {len(chunks)} document passages and {len(segments)} hearing statements. Context is selected, not an exhaustive reading; excerpts are capped at 2,400 characters."
    return payload, notice, method
