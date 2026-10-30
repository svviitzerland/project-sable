from sqlalchemy import create_engine, event, inspect, select, text, update
from sqlalchemy.orm import sessionmaker

from .models import Base, Case, Hearing, Segment


def database(settings):
    kwargs = (
        {"connect_args": {"check_same_thread": False}}
        if settings.database_url.startswith("sqlite")
        else {"pool_pre_ping": True}
    )
    engine = create_engine(settings.database_url, **kwargs)
    if engine.dialect.name == "sqlite":

        @event.listens_for(engine, "connect")
        def pragmas(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
            connection.execute("PRAGMA journal_mode=WAL")

    Base.metadata.create_all(engine)
    # Additive compatibility migration for existing local and PostgreSQL workspaces.
    if "hearing_id" not in {
        c["name"] for c in inspect(engine).get_columns("jude_segments")
    }:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE jude_segments ADD COLUMN hearing_id VARCHAR(36) REFERENCES jude_hearings(id)"
                )
            )
            connection.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_jude_segments_hearing_id ON jude_segments (hearing_id)"
                )
            )
    if "embedding_model" not in {
        c["name"] for c in inspect(engine).get_columns("jude_chunks")
    }:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE jude_chunks ADD COLUMN embedding_model VARCHAR(200) NOT NULL DEFAULT ''"
                )
            )
    if engine.dialect.name == "postgresql":
        with engine.begin() as connection:
            for table in ("jude_hearings", "jude_evidence_links"):
                connection.execute(
                    text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
                )
    factory = sessionmaker(engine, expire_on_commit=False)
    with factory() as db:
        for case in db.scalars(select(Case)).all():
            orphaned = db.scalars(
                select(Segment).where(
                    Segment.case_id == case.id, Segment.hearing_id.is_(None)
                )
            ).all()
            if orphaned:
                hearing = Hearing(
                    case_id=case.id,
                    title="Earlier hearing",
                    kind="simulation"
                    if all(s.origin == "simulation" for s in orphaned)
                    else "manual",
                    status=case.status,
                )
                db.add(hearing)
                db.flush()
                for segment in orphaned:
                    segment.hearing_id = hearing.id
        db.execute(
            update(Hearing)
            .where(Hearing.status.in_(["live", "simulation"]))
            .values(status="paused")
        )
        db.execute(
            update(Case)
            .where(Case.status.in_(["live", "simulation"]))
            .values(status="paused")
        )
        db.execute(
            update(Segment)
            .where(
                Segment.analysis_state.in_(
                    [
                        "queued",
                        "extracting",
                        "retrieving",
                        "analyzing",
                        "reviewing",
                        "synthesizing",
                    ]
                )
            )
            .values(
                analysis_state="interrupted",
                analysis_error="Analysis interrupted by server restart. Retry this statement.",
            )
        )
        db.commit()
    return factory


def owned_case(db, case_id, owner_id):
    from fastapi import HTTPException

    case = db.scalar(select(Case).where(Case.id == case_id, Case.owner_id == owner_id))
    if case is None:
        raise HTTPException(404, "Case not found")
    return case


def case_hearing(db, case_id, hearing_id=None):
    from fastapi import HTTPException

    if hearing_id:
        hearing = db.scalar(
            select(Hearing).where(Hearing.id == hearing_id, Hearing.case_id == case_id)
        )
        if not hearing:
            raise HTTPException(404, "Hearing not found")
        return hearing
    hearing = db.scalar(
        select(Hearing)
        .where(Hearing.case_id == case_id)
        .order_by(Hearing.created_at.desc())
    )
    if hearing is None:
        hearing = Hearing(case_id=case_id, title="Hearing record")
        db.add(hearing)
        db.flush()
    return hearing
