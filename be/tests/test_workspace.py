import time

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.config import Settings
from app.main import create_app
from app.models import Conclusion, SourceOut
from app.services.analysis import validate_citations
from app.services.providers import ProviderError, safe_pasal_url
from app.services.speech import normalize_transcript


@pytest.fixture
def application(tmp_path):
    return create_app(Settings(data_dir=tmp_path, simulation_delay=0.01))


@pytest.fixture
def client(application):
    with TestClient(application) as client:
        yield client


def account(client, email="counsel@example.test"):
    r = client.post(
        "/api/v1/auth/register",
        json={"name": "Counsel", "email": email, "password": "long-password-123"},
    )
    assert r.status_code == 200, r.text
    assert "HttpOnly" in r.headers["set-cookie"]
    return r.json()


def case(client, title="Private case"):
    r = client.post("/api/v1/cases", json={"title": title})
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_auth_and_case_isolation(client, application):
    assert client.get("/api/v1/cases").status_code == 401
    account(client)
    cid = case(client)
    upload = client.post(
        f"/api/v1/cases/{cid}/documents",
        files={
            "file": (
                "statement.txt",
                b"First page\fA guard was at the warehouse entrance.",
                "text/plain",
            )
        },
    )
    assert upload.status_code == 200, upload.text
    did = upload.json()["id"]
    chunks = client.get(f"/api/v1/cases/{cid}/documents/{did}/chunks").json()
    assert [c["page"] for c in chunks] == [1, 2]
    assert (
        client.get(f"/api/v1/cases/{cid}/documents/{did}/original").content
        == b"First page\fA guard was at the warehouse entrance."
    )
    result = client.get(f"/api/v1/cases/{cid}/search?q=guard").json()
    assert result["method"] == "keyword"
    assert result["results"][0]["page"] == 2
    with TestClient(application) as other:
        account(other, "other@example.test")
        assert other.get(f"/api/v1/cases/{cid}").status_code == 404
        assert (
            other.get(f"/api/v1/cases/{cid}/sources/{chunks[0]['id']}").status_code
            == 404
        )
        assert (
            other.get(f"/api/v1/cases/{cid}/documents/{did}/original").status_code
            == 404
        )
        assert other.get(f"/api/v1/cases/{cid}/export").status_code == 404
        assert other.get("/api/v1/cases").json() == []
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 401


def test_synthetic_hearing_persists_citations_and_review(client, application):
    assert client.post("/api/v1/auth/demo").status_code == 200
    cid = client.get("/api/v1/cases").json()[0]["id"]
    assert client.post(f"/api/v1/cases/{cid}/simulation").status_code == 200
    deadline = time.time() + 5
    while time.time() < deadline:
        data = client.get(f"/api/v1/cases/{cid}").json()
        if len(data["findings"]) == 4:
            break
        time.sleep(0.03)
    assert len(data["segments"]) == 8
    assert {f["status"] for f in data["findings"]} == {
        "supported",
        "potential_inconsistency",
        "context_needed",
        "insufficient_evidence",
    }
    assert all(f["mode"] == "simulation" for f in data["findings"])
    for finding in data["findings"]:
        for cite in finding["citations"]:
            source = client.get(
                f"/api/v1/cases/{cid}/sources/{cite['chunk_id']}"
            ).json()
            assert cite["quote"] in source["text"]
    finding = data["findings"][0]
    r = client.patch(
        f"/api/v1/cases/{cid}/findings/{finding['id']}",
        json={"reviewed": True, "note": "Clarify the time."},
    )
    assert r.json()["reviewed"]
    assert (
        client.get(f"/api/v1/cases/{cid}").json()["findings"][0]["note"]
        == "Clarify the time."
    )
    export = client.get(f"/api/v1/cases/{cid}/export")
    assert "attachment" in export.headers["content-disposition"]
    assert len(export.json()["sources"]) > 4
    assert client.post(f"/api/v1/cases/{cid}/simulation").status_code == 409


def test_manual_transcript_offline_honesty_dedup_and_restart(client, application):
    account(client)
    cid = case(client)
    body = {"text": "The vehicle left at midnight.", "speaker": "S1"}
    r = client.post(f"/api/v1/cases/{cid}/transcripts", json=body)
    assert r.status_code == 200
    assert (
        client.post(f"/api/v1/cases/{cid}/transcripts", json=body).json()["id"]
        == r.json()["id"]
    )
    time.sleep(0.05)
    data = client.get(f"/api/v1/cases/{cid}").json()
    assert len(data["segments"]) == 1
    assert data["findings"] == []
    assert data["segments"][0]["analysis_state"] == "unavailable"
    sid = r.json()["id"]
    assert (
        client.post(f"/api/v1/cases/{cid}/transcripts/{sid}/retry").status_code == 503
    )
    r = client.patch(
        f"/api/v1/cases/{cid}/speakers",
        json={"speaker": "S1", "label": "Witness — verified by counsel"},
    )
    assert r.json()["speakers"]["S1"].startswith("Witness")
    restarted = create_app(application.state.settings)
    with TestClient(restarted) as again:
        again.cookies.update(client.cookies)
        assert len(again.get(f"/api/v1/cases/{cid}").json()["segments"]) == 1


def test_upload_validation_and_duplicate(client):
    account(client)
    cid = case(client)
    for name, data in [
        ("bad.exe", b"text"),
        ("scan.pdf", b"not a pdf"),
        ("empty.txt", b""),
    ]:
        assert client.post(
            f"/api/v1/cases/{cid}/documents", files={"file": (name, data)}
        ).status_code in {413, 422}
    first = client.post(
        f"/api/v1/cases/{cid}/documents",
        files={"file": ("../safe.txt", b"Authorized source")},
    ).json()
    second = client.post(
        f"/api/v1/cases/{cid}/documents",
        files={"file": ("another.txt", b"Authorized source")},
    ).json()
    assert first["id"] == second["id"]
    assert first["name"] == "safe.txt"
    assert (
        client.post(
            f"/api/v1/cases/{cid}/documents",
            files={"file": ("huge.txt", b"x" * (6 * 1024 * 1024 + 1))},
        ).status_code
        == 413
    )


def test_csrf_and_websocket_authorization(client):
    account(client)
    cid = case(client)
    assert (
        client.post(
            "/api/v1/cases",
            headers={"Origin": "https://attacker.test"},
            json={"title": "bad"},
        ).status_code
        == 403
    )
    with (
        pytest.raises(WebSocketDisconnect),
        client.websocket_connect(
            f"/api/v1/cases/{cid}/events", headers={"Origin": "https://attacker.test"}
        ),
    ):
        pass
    with client.websocket_connect(
        f"/api/v1/cases/{cid}/events", headers={"Origin": "http://localhost:3000"}
    ) as ws:
        assert ws.receive_json()["type"] == "connected"


def test_citation_validator_rejects_invented_and_cross_case_sources():
    source = SourceOut(
        id="known",
        document_id="doc",
        document_name="Statement",
        page=4,
        section="",
        text="I arrived at eight.",
    )
    fields = {
        "status": "supported",
        "title": "Arrival",
        "explanation": "Matches.",
        "uncertainty": "Time is approximate.",
        "verification": "Ask which day.",
        "question": "Which day?",
        "citations": [
            {
                "chunk_id": "known",
                "quote": "I arrived at eight.",
                "relation": "supports",
            }
        ],
    }
    validate_citations(Conclusion(**fields), [source])
    for citations in [
        [{"chunk_id": "other-case", "quote": source.text, "relation": "supports"}],
        [{"chunk_id": "known", "quote": "I arrived at nine.", "relation": "supports"}],
        [],
    ]:
        with pytest.raises(ProviderError):
            validate_citations(
                Conclusion(**{**fields, "citations": citations}), [source]
            )


def test_speech_diarization_punctuation_and_confidence():
    message = {
        "results": [
            {
                "type": "word",
                "start_time": 1,
                "end_time": 2,
                "alternatives": [
                    {"content": "Hello", "speaker": "S1", "confidence": 0.9}
                ],
            },
            {"type": "punctuation", "alternatives": [{"content": "."}]},
            {
                "type": "word",
                "start_time": 3,
                "end_time": 4,
                "alternatives": [{"content": "Yes", "speaker": "S2"}],
            },
        ]
    }
    rows = normalize_transcript(message)
    assert [r["text"] for r in rows] == ["Hello.", "Yes"]
    assert rows[0]["confidence"] == 0.9
    assert rows[1]["confidence"] is None
    assert rows[1]["speaker"] == "S2"


def test_pasal_link_allowlist():
    assert safe_pasal_url("https://pasal.id/peraturan/uu")
    for url in [
        "javascript:alert(1)",
        "https://pasal.id.attacker.test/",
        "http://pasal.id/",
        "//evil.test",
    ]:
        assert safe_pasal_url(url) is None


def test_provider_failures_do_not_fabricate_law(client):
    account(client)
    cid = case(client)
    response = client.get(f"/api/v1/cases/{cid}/legal?q=keterangan+saksi")
    assert response.status_code == 503
    assert "PASAL_API_KEY" in response.json()["detail"]
