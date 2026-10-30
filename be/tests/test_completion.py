import asyncio
import json
from pathlib import Path

import httpx
import pytest
from sqlalchemy import select

from app.config import Settings
from app.evaluate import score, word_error_rate
from app.factory import create_app
from app.models import Case, Document, User
from app.services import documents, providers
from app.services.documents import ingest
from app.services.providers import OpenRouter, ProviderError


def make_case(app):
    with app.state.db() as db:
        user = User(email="test@example.invalid", name="Test", password_hash="disabled")
        db.add(user)
        db.commit()
        case = Case(owner_id=user.id, title="Isolated test")
        db.add(case)
        db.commit()
        return case


def test_concurrent_duplicate_uploads_share_one_original(tmp_path):
    app = create_app(Settings(data_dir=tmp_path))
    case = make_case(app)

    async def run():
        results = await asyncio.gather(
            *[
                ingest(app, case, "source.txt", b"The guard arrived at eight.")
                for _ in range(12)
            ]
        )
        assert len({r.id for r in results}) == 1
        with app.state.db() as db:
            assert len(db.scalars(select(Document)).all()) == 1
        assert len(list((tmp_path / "documents").rglob("*.txt"))) == 1

    asyncio.run(run())


def test_database_failure_removes_uncommitted_original(tmp_path, monkeypatch):
    app = create_app(Settings(data_dir=tmp_path))
    case = make_case(app)

    def failed_chunk(**kwargs):
        raise ValueError("Insertion failure")

    monkeypatch.setattr(documents, "Chunk", failed_chunk)
    with pytest.raises(ValueError, match="Insertion failure"):
        asyncio.run(ingest(app, case, "source.txt", b"A preserved source."))
    assert not list((tmp_path / "documents").rglob("*.txt"))
    with app.state.db() as db:
        assert db.scalars(select(Document)).all() == []


def test_streamed_request_limit_without_content_length(tmp_path):
    app = create_app(Settings(data_dir=tmp_path))

    async def run():
        async def body():
            for _ in range(8):
                yield b"x" * 1024 * 1024

        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/auth/register",
                content=body(),
                headers={"content-type": "application/json"},
            )
            assert "content-length" not in response.request.headers
            assert response.status_code == 413

    asyncio.run(run())


@pytest.mark.parametrize("value", [float("nan"), float("inf"), "1", True])
def test_invalid_embedding_values_fail_safely(tmp_path, monkeypatch, value):
    async def response(*args, **kwargs):
        return {"data": [{"index": 0, "embedding": [value] * 1536}]}

    monkeypatch.setattr(providers, "request_json", response)
    llm = OpenRouter(Settings(data_dir=tmp_path, openrouter_key="test"))
    with pytest.raises(ProviderError, match="invalid vectors"):
        asyncio.run(llm.embed(["statement"]))


def test_evaluation_reports_false_positives_missing_outputs_and_invalid_citations():
    root = Path(__file__).resolve().parents[1] / "evaluation"
    dataset = json.loads((root / "cases.json").read_text())
    predictions = json.loads((root / "predictions.fixture.json").read_text())
    report = score(dataset, predictions, "fixture")
    assert report["inconsistency"] == {
        "true_positives": 1,
        "false_positives": 1,
        "false_negatives": 1,
        "precision": 0.5,
        "recall": 0.5,
    }
    assert report["citation_validity"] == 0.75
    assert report["missing_or_failed"] == 1
    assert report["human_annotated_unsupported_conclusion_rate"] is None
    assert report["latency_ms"]["median"] is None
    assert "does not measure AI" in report["notice"]
    assert word_error_rate("the guard arrived", "a guard arrived") == 0.3333
    assert word_error_rate("", "words") is None
    with pytest.raises(ValueError, match="unique IDs"):
        score(dataset, predictions + predictions[:1], "fixture")
