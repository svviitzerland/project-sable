import asyncio
import io
import json
import time
import zipfile
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.config import Settings
from app.factory import create_app
from app.models import Chunk
from app.services.hearing_import import (
    ConvertedTranscript,
    parse_transcript,
)
from app.services.jude_archive import pack, unpack
from app.services.providers import ProviderError
from app.services.retrieval import retrieve


@pytest.fixture
def setup(tmp_path):
    app = create_app(Settings(data_dir=tmp_path, simulation_delay=0.001))
    with TestClient(app) as client:
        client.post(
            "/api/v1/auth/register",
            json={
                "email": "casebook@example.test",
                "password": "a-long-password",
                "name": "Counsel",
            },
        )
        case = client.post("/api/v1/cases", json={"title": "New case"}).json()["id"]
        yield app, client, case


def upload(client, cid, name, text):
    response = client.post(
        f"/api/v1/cases/{cid}/documents",
        files={"file": (name, text.encode(), "text/plain")},
    )
    assert response.status_code == 200, response.text
    return client.get(
        f"/api/v1/cases/{cid}/documents/{response.json()['id']}/chunks"
    ).json()[0]


@pytest.mark.parametrize(
    "name,data,count",
    [
        (
            "hearing.txt",
            b"Counsel: When did you arrive?\nWitness: At eight in the morning.",
            2,
        ),
        (
            "hearing.csv",
            b"speaker,text,start,end\nWitness,I arrived at eight.,01:20,01:24",
            1,
        ),
        ("hearing.srt", b"1\n00:00:01,000 --> 00:00:04,000\nI arrived at eight.\n", 1),
        (
            "hearing.vtt",
            b"WEBVTT\n\n00:01.000 --> 00:04.000\n<v Witness>I arrived at eight.</v>\n",
            1,
        ),
    ],
)
def test_transcript_formats(name, data, count):
    result = parse_transcript(name, data)
    assert len(result.segments) == count
    assert "eight" in result.segments[-1].text


def test_hearing_import_preview_preserves_original_and_case_scope(setup):
    _app, client, cid = setup
    data = b"Counsel: When did you arrive?\nWitness: At eight in the morning."
    preview = client.post(
        f"/api/v1/cases/{cid}/hearings/preview", files={"file": ("hearing.txt", data)}
    ).json()
    assert preview["method"] == "parsed"
    assert client.get(f"/api/v1/cases/{cid}").json()["hearings"] == []
    response = client.post(
        f"/api/v1/cases/{cid}/hearings/import",
        files={"file": ("hearing.txt", data)},
        data={"transcript": json.dumps(preview["hearing"])},
    )
    assert response.status_code == 200, response.text
    hearing = response.json()
    detail = client.get(f"/api/v1/cases/{cid}").json()
    assert len(detail["segments"]) == 2
    assert all(s["hearing_id"] == hearing["id"] for s in detail["segments"])
    assert all(s["analysis_state"] == "pending" for s in detail["segments"])
    assert (
        client.get(
            f"/api/v1/cases/{cid}/documents/{hearing['source_document_id']}/original"
        ).content
        == data
    )
    exported = client.get(f"/api/v1/cases/{cid}/hearings/{hearing['id']}/export.jude")
    assert (
        parse_transcript("export.jude", exported.content).segments[-1].text
        == "At eight in the morning."
    )
    second = client.post(
        f"/api/v1/cases/{cid}/hearings", json={"title": "Second hearing"}
    ).json()
    client.post(
        f"/api/v1/cases/{cid}/transcripts",
        json={"text": "Separate testimony.", "hearing_id": second["id"]},
    )
    detail = client.get(f"/api/v1/cases/{cid}").json()
    assert detail["segments"][-1]["hearing_id"] == second["id"]
    other = client.post("/api/v1/cases", json={"title": "Other"}).json()["id"]
    assert (
        client.post(
            f"/api/v1/cases/{other}/transcripts",
            json={"text": "Should not cross cases.", "hearing_id": hearing["id"]},
        ).status_code
        == 404
    )
    bad = preview["hearing"]
    bad["segments"][0]["text"] = "Invented statement."
    assert (
        client.post(
            f"/api/v1/cases/{cid}/hearings/import",
            files={"file": ("hearing.txt", data)},
            data={"transcript": json.dumps(bad)},
        ).status_code
        == 422
    )


def test_conversion_is_explicit_and_never_publishes_invented_testimony(setup):
    app, client, cid = setup
    data = b"The witness says she arrived at eight in the morning."
    path = f"/api/v1/cases/{cid}/hearings/preview"
    assert (
        client.post(path, files={"file": ("notes.txt", data)}).json()["method"]
        == "conversion_required"
    )
    assert (
        client.post(
            path, files={"file": ("notes.txt", data)}, data={"convert": "true"}
        ).status_code
        == 503
    )
    app.state.settings.openrouter_key = "test"
    app.state.settings.model = "test"

    async def invented(*args):
        return ConvertedTranscript(
            segments=[{"speaker": "Witness", "text": "He confessed."}]
        )

    app.state.llm = SimpleNamespace(structured=invented)
    assert (
        client.post(
            path, files={"file": ("notes.txt", data)}, data={"convert": "true"}
        ).status_code
        == 503
    )

    async def verbatim(*args):
        return ConvertedTranscript(
            segments=[
                {
                    "speaker": "A guessed identity",
                    "text": "she arrived at eight in the morning.",
                }
            ]
        )

    app.state.llm = SimpleNamespace(structured=verbatim)
    result = client.post(
        path, files={"file": ("notes.txt", data)}, data={"convert": "true"}
    ).json()
    assert result["method"] == "ai_converted"
    assert result["hearing"]["segments"][0]["speaker"] == "Unknown"
    assert result["hearing"]["segments"][0]["start"] == 0
    assert client.get(f"/api/v1/cases/{cid}").json()["segments"] == []


def test_jude_roundtrip_remaps_ownership_originals_citations_and_links(setup):
    _app, client, _ = setup
    cid = client.post("/api/v1/cases/synthetic").json()["id"]
    client.post(f"/api/v1/cases/{cid}/simulation")
    deadline = time.time() + 5
    while time.time() < deadline:
        original = client.get(f"/api/v1/cases/{cid}").json()
        if len(original["findings"]) == 4:
            break
        time.sleep(0.02)
    assert len(original["findings"]) == 4
    fid = original["findings"][0]["id"]
    client.patch(
        f"/api/v1/cases/{cid}/findings/{fid}",
        json={"reviewed": True, "note": "Check the date."},
    )
    first = upload(client, cid, "a.txt", "The guard saw a jade receipt at eight.")
    second = upload(client, cid, "b.txt", "A different record about the guard.")
    client.post(
        f"/api/v1/cases/{cid}/links",
        json={
            "source_id": first["id"],
            "target_id": second["id"],
            "relation": "context",
            "explanation": "Compare both guard accounts.",
        },
    )
    exported = client.get(f"/api/v1/cases/{cid}/export.jude")
    assert exported.status_code == 200, exported.text
    manifest, files = unpack(exported.content)
    assert manifest["version"] == 1 and manifest["kind"] == "case"
    assert "password_hash" not in json.dumps(manifest)
    client.post(
        "/api/v1/auth/register",
        json={"email": "recipient@example.test", "password": "another-long-password"},
    )
    response = client.post(
        "/api/v1/cases/import", files={"file": ("case.jude", exported.content)}
    )
    assert response.status_code == 200, response.text
    imported_id = response.json()["id"]
    assert imported_id != cid
    imported = client.get(f"/api/v1/cases/{imported_id}").json()
    assert len(imported["segments"]) == 8 and len(imported["findings"]) == 4
    assert all(
        f["mode"] == "imported" and not f["reviewed"] for f in imported["findings"]
    )
    assert any(f["note"] == "Check the date." for f in imported["findings"])
    assert client.get(f"/api/v1/cases/{cid}").status_code == 404
    graph = client.get(f"/api/v1/cases/{imported_id}/graph").json()
    assert any(e["basis"] == "imported" and not e["confirmed"] for e in graph["edges"])
    for finding in imported["findings"]:
        for citation in finding["citations"]:
            source = client.get(
                f"/api/v1/cases/{imported_id}/sources/{citation['chunk_id']}"
            ).json()
            assert citation["quote"] in source["text"]
    for doc in imported["documents"]:
        prior = next(d for d in manifest["documents"] if d["name"] == doc["name"])
        assert (
            client.get(
                f"/api/v1/cases/{imported_id}/documents/{doc['id']}/original"
            ).content
            == files[prior["file"]]
        )


def test_archive_rejects_version_traversal_and_invalid_provenance(setup):
    _, client, cid = setup
    upload(client, cid, "one.txt", "A source passage.")
    data = client.get(f"/api/v1/cases/{cid}/export.jude").content
    payload, files = unpack(data)
    payload["version"] = 2
    assert (
        client.post(
            "/api/v1/cases/import", files={"file": ("x.jude", pack(payload, files))}
        ).status_code
        == 422
    )
    payload["version"] = 1
    payload["sources"][0]["document_id"] = "outside-case"
    assert (
        client.post(
            "/api/v1/cases/import", files={"file": ("x.jude", pack(payload, files))}
        ).status_code
        == 422
    )
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        archive.writestr("../escape", "bad")
        archive.writestr("manifest.json", json.dumps({"format": "jude", "version": 1}))
    with pytest.raises(HTTPException):
        unpack(output.getvalue())


def test_evidence_links_search_and_confirmed_graph_expansion(setup):
    _app, client, cid = setup
    first = upload(
        client, cid, "receipt.txt", "A jade receipt is preserved in the case file."
    )
    second = upload(client, cid, "clock.txt", "The wall clock stopped at eight thirty.")
    response = client.post(
        f"/api/v1/cases/{cid}/links",
        json={
            "source_id": first["id"],
            "target_id": second["id"],
            "relation": "context",
            "explanation": "Compare the receipt timestamp with the broken clock.",
        },
    )
    assert response.status_code == 200, response.text
    link = response.json()
    result = client.post(
        f"/api/v1/cases/{cid}/ask", json={"query": "jade receipt"}
    ).json()
    assert result["answer"] is None and result["method"] == "keyword"
    assert {s["id"] for s in result["sources"]} == {first["id"], second["id"]}
    client.patch(f"/api/v1/cases/{cid}/links/{link['id']}", json={"confirmed": False})
    result = client.post(
        f"/api/v1/cases/{cid}/ask", json={"query": "jade receipt"}
    ).json()
    assert [s["id"] for s in result["sources"]] == [first["id"]]
    other = client.post("/api/v1/cases", json={"title": "Other case"}).json()["id"]
    assert (
        client.post(
            f"/api/v1/cases/{other}/links",
            json={
                "source_id": first["id"],
                "target_id": second["id"],
                "relation": "related",
                "explanation": "Must fail",
            },
        ).status_code
        == 404
    )
    assert client.get(f"/api/v1/cases/{other}/graph").json()["nodes"] == []
    assert (
        client.post(
            f"/api/v1/cases/{other}/ask", json={"query": "jade receipt"}
        ).json()["sources"]
        == []
    )


def test_graph_suggestions_and_answer_citations_fail_closed(setup):
    app, client, cid = setup
    upload(
        client,
        cid,
        "first.txt",
        "The guard arrived at the warehouse at eight in the morning.",
    )
    upload(
        client,
        cid,
        "second.txt",
        "The guard arrived at the warehouse at ten in the morning.",
    )
    response = client.post(f"/api/v1/cases/{cid}/graph/build")
    assert response.status_code == 200, response.text
    graph = client.get(f"/api/v1/cases/{cid}/graph").json()
    assert graph["edges"] and all(
        e["relation"] == "related" and not e["confirmed"] for e in graph["edges"]
    )
    app.state.settings.openrouter_key = "test"
    app.state.settings.model = "test"

    async def embed(_):
        raise ProviderError("Offline")

    async def structured(role, payload, schema):
        from app.services.evidence import Answer

        return Answer(
            answer="An invented answer.",
            citations=[
                {
                    "chunk_id": "not-in-this-case",
                    "quote": "Invented",
                    "relation": "supports",
                }
            ],
        )

    app.state.llm = SimpleNamespace(embed=embed, structured=structured)
    assert (
        client.post(
            f"/api/v1/cases/{cid}/ask", json={"query": "guard warehouse"}
        ).status_code
        == 503
    )


def test_embedding_model_change_uses_keyword_fallback(setup):
    app, client, cid = setup
    source = upload(client, cid, "first.txt", "The guard arrived at eight.")
    with app.state.db() as db:
        chunk = db.get(Chunk, source["id"])
        chunk.embedding = [1.0] * 1536
        chunk.embedding_model = "old-model"
        db.commit()
    app.state.settings.openrouter_key = "test"
    app.state.settings.embedding_model = "new-model"

    async def embed(_):
        return [[1.0] * 1536]

    app.state.llm = SimpleNamespace(embed=embed)
    _, method = asyncio.run(retrieve(app, cid, "guard"))
    assert method == "keyword"


def test_new_synthetic_case_has_a_dedicated_hearing(setup):
    _, client, _ = setup
    cid = client.post("/api/v1/cases/synthetic").json()["id"]
    detail = client.get(f"/api/v1/cases/{cid}").json()
    assert len(detail["hearings"]) == 1
    assert detail["hearings"][0]["kind"] == "simulation"
    assert detail["hearings"][0]["title"] == "The warehouse examination"


def test_malformed_hearing_archive_and_self_evidence_exclusion(setup):
    app, client, cid = setup
    bad = pack({"format": "jude", "version": 1, "kind": "hearing", "segments": []})
    response = client.post(
        f"/api/v1/cases/{cid}/hearings/preview", files={"file": ("bad.jude", bad)}
    )
    assert response.status_code == 422
    own = upload(client, cid, "transcript.txt", "Witness: The jade receipt was signed.")
    other = upload(client, cid, "record.txt", "A jade receipt was found in the office.")
    sources, _ = asyncio.run(
        retrieve(app, cid, "jade receipt", exclude_document_id=own["document_id"])
    )
    assert [s.id for s in sources] == [other["id"]]


def test_embedding_graph_classification_and_cited_answer(setup):
    app, client, cid = setup
    first = upload(client, cid, "log.txt", "The guard arrived at eight in the morning.")
    second = upload(
        client, cid, "report.txt", "The guard arrived at ten in the morning."
    )
    app.state.settings.openrouter_key = "test"
    app.state.settings.model = "test"

    async def embed(texts):
        return [[1.0] + [0.0] * 1535 for _ in texts]

    async def structured(role, payload, schema):
        from app.services.evidence import Answer, RelationshipBatch

        if schema is RelationshipBatch:
            pair = payload["candidate_pairs"][0]
            return RelationshipBatch(
                links=[
                    {
                        **{k: pair[k] for k in ("source_id", "target_id")},
                        "relation": "conflicts",
                        "explanation": "Different reported arrival times. Verify the date.",
                        "source_quote": pair["source_text"],
                        "target_quote": pair["target_text"],
                    }
                ]
            )
        return Answer(
            answer="The log places arrival at eight; compare the report.",
            citations=[
                {
                    "chunk_id": first["id"],
                    "quote": first["text"],
                    "relation": "supports",
                }
            ],
        )

    app.state.llm = SimpleNamespace(embed=embed, structured=structured)
    assert client.post(f"/api/v1/cases/{cid}/graph/build").status_code == 200
    graph = client.get(f"/api/v1/cases/{cid}/graph").json()
    assert graph["indexed_passages"] == 2
    assert len(graph["edges"]) == 1
    edge = graph["edges"][0]
    assert (
        edge["relation"] == "conflicts"
        and edge["basis"] == "ai"
        and not edge["confirmed"]
    )
    assert {edge["source_id"], edge["target_id"]} == {first["id"], second["id"]}
    answer = client.post(f"/api/v1/cases/{cid}/ask", json={"query": "arrival"}).json()
    assert (
        answer["method"] == "hybrid"
        and answer["citations"][0]["chunk_id"] == first["id"]
    )


def test_legacy_sqlite_upgrade_preserves_testimony(tmp_path):
    from sqlalchemy import text

    from app.models import Case, Segment, User

    settings = Settings(data_dir=tmp_path)
    app = create_app(settings)
    with app.state.db() as db:
        user = User(
            email="legacy@example.test", name="Counsel", password_hash="disabled"
        )
        db.add(user)
        db.flush()
        case = Case(owner_id=user.id, title="Legacy case")
        db.add(case)
        db.flush()
        segment = Segment(case_id=case.id, text="Existing testimony.")
        db.add(segment)
        db.commit()
        sid = segment.id
        db.execute(text("DROP INDEX ix_jude_segments_hearing_id"))
        db.execute(
            text(
                "CREATE TABLE legacy_segments AS SELECT id, case_id, text, speaker, start, end, confidence, origin, analysis_state, analysis_error, created_at FROM jude_segments"
            )
        )
        db.execute(text("DROP TABLE jude_segments"))
        db.execute(text("ALTER TABLE legacy_segments RENAME TO jude_segments"))
        db.execute(text("CREATE UNIQUE INDEX legacy_segment_id ON jude_segments(id)"))
        db.execute(text("ALTER TABLE jude_chunks DROP COLUMN embedding_model"))
        db.commit()
    upgraded = create_app(settings)
    with upgraded.state.db() as db:
        restored = db.get(Segment, sid)
        assert restored.text == "Existing testimony." and restored.hearing_id
    # A repeated bootstrap must not create another hearing.
    upgraded = create_app(settings)
    from sqlalchemy import select

    from app.models import Hearing

    with upgraded.state.db() as db:
        assert len(db.scalars(select(Hearing)).all()) == 1
