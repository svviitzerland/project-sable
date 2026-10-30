from sqlalchemy import create_engine, event, select, update
from sqlalchemy.orm import sessionmaker

from .models import Base, Case, Segment


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
    factory = sessionmaker(engine, expire_on_commit=False)
    with factory() as db:
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
