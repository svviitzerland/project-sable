"""Opt-in migration check against a disposable database named jude_test*."""

import asyncio
import os
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import psycopg
import pytest
from fastapi import HTTPException
from sqlalchemy import select, text

from app.config import Settings
from app.factory import create_app
from app.models import Case, Chunk, User
from app.runtime import Lease, SharedEvents
from app.services.documents import ingest
from app.services.retrieval import retrieve


@pytest.mark.skipif(
    not os.getenv("JUDE_TEST_DATABASE_URL"),
    reason="Disposable PostgreSQL URL not configured",
)
def test_postgres_bootstrap_vector_sync_and_browser_denial(tmp_path):
    url = os.environ["JUDE_TEST_DATABASE_URL"]
    with psycopg.connect(url, autocommit=True) as connection:
        assert connection.info.dbname.startswith("jude_test"), (
            "Only use a disposable jude_test database"
        )
        # Emulate only Supabase's roles and bucket metadata table, not its hosted services.
        connection.execute(
            "DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$"
        )
        connection.execute(
            "DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$"
        )
        connection.execute("CREATE SCHEMA IF NOT EXISTS storage")
        connection.execute(
            "CREATE TABLE IF NOT EXISTS storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint)"
        )
        migrations = Path(__file__).resolve().parents[1] / "migrations"
        for _ in range(2):
            for migration in sorted(migrations.glob("*.sql")):
                connection.execute(migration.read_text())
        assert connection.execute(
            "SELECT public FROM storage.buckets WHERE id='jude-documents'"
        ).fetchone() == (False,)
        assert connection.execute(
            "SELECT file_size_limit FROM storage.buckets WHERE id='jude-documents'"
        ).fetchone() == (67108864,)
        private_tables = (
            "jude_dialogues",
            "jude_dialogue_messages",
            "jude_runtime_leases",
            "jude_runtime_events",
            "jude_runtime_rates",
            "jude_socket_tickets",
            "jude_analysis_jobs",
            "jude_file_transfers",
        )
        for table in private_tables:
            assert connection.execute(
                "SELECT relrowsecurity FROM pg_class WHERE relname = %s", (table,)
            ).fetchone() == (True,)
        for role in ("anon", "authenticated"):
            connection.execute(f"SET ROLE {role}")
            for table in ("jude_chunks", *private_tables):
                with pytest.raises(psycopg.errors.InsufficientPrivilege):
                    connection.execute(f"SELECT * FROM {table}")
            connection.execute("RESET ROLE")

    app = create_app(
        Settings(data_dir=tmp_path, database_url=url, openrouter_key="test")
    )

    async def embed(texts):
        return [[1.0] + [0.0] * 1535 for _ in texts]

    app.state.llm = SimpleNamespace(embed=embed)
    with app.state.db() as db:
        user = User(
            email=f"postgres-{uuid4()}@example.invalid",
            name="Test",
            password_hash="disabled",
        )
        db.add(user)
        db.commit()
        case = Case(owner_id=user.id, title="Vector test")
        other = Case(owner_id=user.id, title="Other case")
        db.add_all([case, other])
        db.commit()

    async def run():
        await ingest(app, case, "source.txt", b"The guard arrived at eight.")
        await ingest(app, other, "other.txt", b"The unrelated guard arrived at ten.")
        sources, method = await retrieve(app, case.id, "guard arrival")
        assert method == "hybrid" and len(sources) == 1
        assert "eight" in sources[0].text

    asyncio.run(run())
    with app.state.db() as db:
        assert (
            db.scalar(
                text(
                    "SELECT extensions.vector_dims(embedding_vector) FROM jude_chunks WHERE case_id=:c"
                ),
                {"c": case.id},
            )
            == 1536
        )
        assert (
            db.scalar(
                text(
                    "SELECT embedding_vector OPERATOR(extensions.<=>) embedding_vector FROM jude_chunks WHERE case_id=:c"
                ),
                {"c": case.id},
            )
            == 0
        )
        chunk = db.scalar(select(Chunk).where(Chunk.case_id == case.id))
        chunk.embedding = None
        db.commit()
        assert db.scalar(
            text("SELECT embedding_vector IS NULL FROM jude_chunks WHERE id=:id"),
            {"id": chunk.id},
        )

    hosted = Settings(
        data_dir=tmp_path,
        database_url=url,
        serverless=True,
        backend_url="https://backend.example",
        supabase_url="https://storage.example",
        supabase_key="test",
        qstash_token="test",
        qstash_current_key="test",
        qstash_next_key="test",
        cron_secret="test",
    )
    one, two = create_app(hosted), create_app(hosted)

    async def shared():
        async with Lease(one.state.db, "postgres-cross-instance"):
            with pytest.raises(HTTPException) as conflict:
                async with Lease(two.state.db, "postgres-cross-instance"):
                    pass
            assert conflict.value.status_code == 409
        reader = SharedEvents(one.state.db).subscribe(case.id)
        await SharedEvents(two.state.db).publish(case.id, {"type": "finding"})
        assert await reader.get() == {"type": "finding"}

    asyncio.run(shared())
