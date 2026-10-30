import math
import re

from sqlalchemy import select
from sqlalchemy import text as sql_text
from sqlalchemy.exc import SQLAlchemyError

from ..models import Chunk, Document, SourceOut
from .providers import ProviderError


def tokens(text):
    stop = {
        "the",
        "a",
        "i",
        "at",
        "and",
        "to",
        "of",
        "is",
        "in",
        "was",
        "saya",
        "di",
        "dan",
        "itu",
        "yang",
        "pada",
        "ke",
        "dari",
        "dengan",
    }
    return set(re.findall(r"\w+", text.lower())) - stop


def cosine(a, b):
    if len(a) != len(b):
        return 0
    denom = math.sqrt(sum(x * x for x in a) * sum(x * x for x in b))
    return sum(x * y for x, y in zip(a, b)) / denom if denom else 0


async def retrieve(app, case_id, query, limit=8):
    vector = None
    if app.state.settings.openrouter_key:
        try:
            vectors = await app.state.llm.embed([query])
            vector = vectors[0] if vectors else None
        except ProviderError:
            pass
    with app.state.db() as db:
        rows = db.execute(
            select(Chunk, Document.name).join(Document).where(Chunk.case_id == case_id)
        ).all()
        query_tokens = tokens(query)
        scored = []
        pg_scores = {}
        if vector and db.bind.dialect.name == "postgresql":
            try:
                # Optional pgvector column maintained by the supplied migration's trigger.
                pg_scores = dict(
                    db.execute(
                        sql_text(
                            "SELECT id, 1 - (embedding_vector OPERATOR(extensions.<=>) CAST(:v AS extensions.vector)) FROM jude_chunks WHERE case_id=:c AND embedding_vector IS NOT NULL ORDER BY embedding_vector OPERATOR(extensions.<=>) CAST(:v AS extensions.vector) LIMIT 50"
                        ),
                        {"v": str(vector), "c": case_id},
                    ).all()
                )
            except SQLAlchemyError:
                db.rollback()  # Pre-migration installations use the same bounded cosine fallback.
        has_vectors = vector is not None and any(chunk.embedding for chunk, _ in rows)
        for chunk, name in rows:
            overlap = len(tokens(chunk.text) & query_tokens) / max(1, len(query_tokens))
            similarity = pg_scores.get(
                chunk.id,
                cosine(vector, chunk.embedding) if vector and chunk.embedding else 0,
            )
            score = (
                0.45 * overlap + 0.55 * max(0, similarity) if has_vectors else overlap
            )
            if score > 0.015:
                scored.append(
                    SourceOut(
                        id=chunk.id,
                        document_id=chunk.document_id,
                        document_name=name,
                        page=chunk.page,
                        section=chunk.section,
                        text=chunk.text,
                        score=round(score, 4),
                    )
                )
        return sorted(scored, key=lambda x: x.score, reverse=True)[
            :limit
        ], "hybrid" if has_vectors else "keyword"
