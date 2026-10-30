import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from threading import Event
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.config import Settings
from app.dialogues import Conditions, PracticeReply, Proposal, Reply
from app.factory import create_app
from app.models import DialogueMessage, Finding, Segment
from app.services.providers import ProviderError


@pytest.fixture
def setup(tmp_path):
    app = create_app(Settings(data_dir=tmp_path, simulation_delay=0.001))
    with TestClient(app) as client:
        assert (
            client.post(
                "/api/v1/auth/register",
                json={
                    "email": "assistant@example.test",
                    "name": "Counsel",
                    "password": "a-long-password",
                },
            ).status_code
            == 200
        )
        cid = client.post("/api/v1/cases", json={"title": "Warehouse inquiry"}).json()[
            "id"
        ]
        doc = client.post(
            f"/api/v1/cases/{cid}/documents",
            files={
                "file": (
                    "record.txt",
                    b"The guard arrived at eight. The red ledger is missing.",
                    "text/plain",
                )
            },
        ).json()
        source = client.get(f"/api/v1/cases/{cid}/documents/{doc['id']}/chunks").json()[
            0
        ]
        yield app, client, cid, source


def create(client, cid, **values):
    response = client.post(
        f"/api/v1/cases/{cid}/dialogues", json={"kind": "assistant", **values}
    )
    assert response.status_code == 200, response.text
    return response.json()


def send(client, cid, dialogue, **values):
    return client.post(
        f"/api/v1/cases/{cid}/dialogues/{dialogue['id']}/messages",
        json={
            "text": "When did the guard arrive?",
            "request_id": str(uuid4()),
            **values,
        },
    )


def enable(app, structured):
    app.state.settings.openrouter_key = "test"
    app.state.settings.model = "test/model"

    async def embed(_):
        return None

    app.state.llm = SimpleNamespace(structured=structured, embed=embed)


def cited(source, **values):
    return Reply(
        answer="The record says the guard arrived at eight.",
        uses_case_facts=True,
        citations=[
            {
                "chunk_id": source["id"],
                "quote": "The guard arrived at eight.",
                "relation": "supports",
            }
        ],
        **values,
    )


def test_sources_only_persistence_references_and_isolation(setup):
    app, client, cid, source = setup
    dialogue = create(client, cid)
    request_id = str(uuid4())
    response = send(
        client,
        cid,
        dialogue,
        request_id=request_id,
        reference_ids=[f"passage:{source['id']}"],
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert "unavailable" in data["messages"][1]["text"]
    assert data["messages"][1]["citations"][0]["source"]["text"] == source["text"]
    assert send(client, cid, dialogue, request_id=request_id).json() == data
    assert client.get(f"/api/v1/cases/{cid}/dialogues/{dialogue['id']}").json() == data
    exported = client.get(f"/api/v1/cases/{cid}/dialogues/{dialogue['id']}/export")
    assert exported.json()["format"] == "jude-conversation"
    other = client.post("/api/v1/cases", json={"title": "Other case"}).json()["id"]
    assert (
        client.get(f"/api/v1/cases/{other}/dialogues/{dialogue['id']}").status_code
        == 404
    )
    assert (
        send(
            client,
            other,
            create(client, other),
            reference_ids=[f"passage:{source['id']}"],
        ).status_code
        == 404
    )
    with TestClient(app) as stranger:
        stranger.post(
            "/api/v1/auth/register",
            json={
                "email": "other@example.test",
                "name": "Other",
                "password": "a-long-password",
            },
        )
        for path in [
            "assistant/context",
            "dialogues?kind=assistant",
            f"dialogues/{dialogue['id']}",
            f"dialogues/{dialogue['id']}/export",
        ]:
            assert stranger.get(f"/api/v1/cases/{cid}/{path}").status_code == 404


def test_cited_followups_legal_metadata_and_idempotency(setup):
    app, client, cid, source = setup
    calls = []

    async def structured(role, payload, schema):
        calls.append(payload)
        return cited(source)

    enable(app, structured)

    async def legal_search(query):
        assert query == "witness testimony"
        return [
            {
                "id": "law1",
                "title": "Discovery entry",
                "reference": "metadata",
                "url": "https://pasal.id/example",
                "content": "metadata_only",
            }
        ]

    app.state.settings.pasal_key = "test"
    app.state.pasal = SimpleNamespace(search=legal_search)
    dialogue = create(client, cid)
    request_id = str(uuid4())
    response = send(
        client, cid, dialogue, request_id=request_id, legal_query="witness testimony"
    )
    assert response.status_code == 200, response.text
    assert "verify" in response.json()["messages"][-1]["notice"]
    assert calls[0]["legal_discovery_metadata"][0]["content"] == "metadata_only"
    assert send(client, cid, dialogue, request_id=request_id).status_code == 200
    assert len(calls) == 1
    assert (
        send(client, cid, dialogue, text="What is uncertain about that?").status_code
        == 200
    )
    assert len(calls[1]["conversation"]) == 2
    assert calls[1]["legal_discovery_metadata"][0]["id"] == "law1"
    assert source["id"] in [s["chunk_id"] for s in calls[1]["case_context"]["sources"]]


@pytest.mark.parametrize("bad", ["quote", "source", "missing"])
def test_invalid_reply_rejected_atomically_and_retryable(setup, bad):
    app, client, cid, source = setup

    async def structured(role, payload, schema):
        reply = cited(source)
        if bad == "quote":
            reply.citations[0].quote = "A fabricated quotation."
        if bad == "source":
            reply.citations[0].chunk_id = "foreign-source"
        if bad == "missing":
            reply.citations = []
        return reply

    enable(app, structured)
    dialogue = create(client, cid)
    request_id = str(uuid4())
    assert send(client, cid, dialogue, request_id=request_id).status_code == 503
    assert (
        client.get(f"/api/v1/cases/{cid}/dialogues/{dialogue['id']}").json()["messages"]
        == []
    )

    async def good(*_):
        return cited(source)

    app.state.llm.structured = good
    assert (
        len(send(client, cid, dialogue, request_id=request_id).json()["messages"]) == 2
    )


@pytest.mark.parametrize("role", ["defense", "opposing", "judge"])
def test_guided_roles_overrides_debrief_and_no_evidence_pollution(setup, role):
    app, client, cid, _source = setup
    before = client.get(f"/api/v1/cases/{cid}").json()
    settings = Conditions(
        user_role=role,
        trial_type="Custom civil hearing",
        jurisdiction="Practice court",
        stage="Closing arguments",
        assumptions="Assume a short hearing for training.",
    ).model_dump()
    dialogue = create(client, cid, kind="practice", mode="guided", conditions=settings)
    assert dialogue["conditions"] == settings
    reply = send(client, cid, dialogue, text="FICTIONAL_REHEARSAL_ONLY assertion.")
    assert reply.status_code == 200, reply.text
    assert reply.json()["messages"][-2]["speaker"] == role
    assert "scripted" in reply.json()["messages"][-1]["notice"]
    finished = send(client, cid, dialogue, finish=True)
    assert finished.json()["status"] == "complete"
    assert "did not assess" in finished.json()["messages"][-1]["text"]
    assert send(client, cid, dialogue).status_code == 409
    after = client.get(f"/api/v1/cases/{cid}").json()
    assert (
        before["segments"] == after["segments"]
        and before["findings"] == after["findings"]
    )
    packets = []

    async def structured(_, payload, schema):
        packets.append(payload)
        return Reply(
            answer="There is no supplied basis for that assertion.",
            uses_case_facts=False,
            citations=[],
        )

    enable(app, structured)
    send(client, cid, create(client, cid), text="FICTIONAL_REHEARSAL_ONLY?")
    assert "FICTIONAL_REHEARSAL_ONLY" not in json.dumps(packets[0]["case_context"])
    assert packets[0]["conversation"] == []


def test_ai_proposal_manual_override_roles_and_debrief(setup):
    app, client, cid, _source = setup
    packets = []

    async def structured(role, payload, schema):
        packets.append(payload)
        if schema is Proposal:
            return Proposal(
                conditions=Conditions(
                    user_role="judge",
                    language="French",
                    trial_type="Suggested criminal trial",
                ).model_dump(),
                rationale="A practice hypothesis to verify.",
            )
        if schema is PracticeReply:
            return PracticeReply(
                speeches=[
                    {
                        "speaker": "judge",
                        "text": "Counsel, identify the source for the arrival time.",
                        "uses_case_facts": False,
                        "citations": [],
                    }
                ]
            )
        return Reply(
            answer="Your argument would benefit from a precise source reference. Practise a narrower follow-up.",
            uses_case_facts=False,
            citations=[],
        )

    enable(app, structured)
    proposal = client.post(
        f"/api/v1/cases/{cid}/practice/propose",
        json=Conditions(user_role="defense", language="English").model_dump(),
    ).json()
    assert proposal["conditions"]["user_role"] == "defense"
    assert proposal["conditions"]["language"] == "English"
    proposal["conditions"]["trial_type"] = "Manually overridden trial"
    dialogue = create(
        client, cid, kind="practice", mode="ai", conditions=proposal["conditions"]
    )
    response = send(client, cid, dialogue)
    assert response.status_code == 200, response.text
    assert response.json()["messages"][-1]["speaker"] == "judge"
    assert packets[-1]["conditions"]["trial_type"] == "Manually overridden trial"
    debrief = send(client, cid, dialogue, finish=True)
    assert debrief.json()["messages"][-1]["speaker"] == "Practice coach"
    assert debrief.json()["status"] == "complete"


def test_model_cannot_speak_for_user_and_offline_modes_are_explicit(setup):
    app, client, cid, _source = setup
    assert (
        client.post(f"/api/v1/cases/{cid}/practice/propose", json={}).status_code == 503
    )
    assert (
        client.post(
            f"/api/v1/cases/{cid}/dialogues",
            json={"kind": "practice", "mode": "ai", "conditions": {}},
        ).status_code
        == 503
    )

    async def structured(*_):
        return PracticeReply(
            speeches=[
                {
                    "speaker": "defense",
                    "text": "This would speak for the user.",
                    "uses_case_facts": False,
                    "citations": [],
                }
            ]
        )

    enable(app, structured)
    dialogue = create(
        client, cid, kind="practice", conditions=Conditions().model_dump()
    )
    assert send(client, cid, dialogue).status_code == 503
    assert (
        len(
            client.get(f"/api/v1/cases/{cid}/dialogues/{dialogue['id']}").json()[
                "messages"
            ]
        )
        == 1
    )
    assert (
        client.post(
            f"/api/v1/cases/{cid}/dialogues",
            json={"kind": "practice", "conditions": {"user_role": "invalid"}},
        ).status_code
        == 422
    )


def test_single_response_in_flight_and_provider_failure(setup):
    app, client, cid, _source = setup
    started = Event()

    async def structured(*_):
        started.set()
        await asyncio.sleep(0.4)
        raise ProviderError("Provider is unavailable.")

    enable(app, structured)
    dialogue = create(client, cid)
    with ThreadPoolExecutor() as pool:
        first = pool.submit(send, client, cid, dialogue)
        assert started.wait(3)
        assert send(client, cid, dialogue).status_code == 409
        assert first.result().status_code == 503
    with app.state.db() as db:
        assert db.scalar(select(func.count()).select_from(DialogueMessage)) == 0
        assert db.scalar(select(func.count()).select_from(Segment)) == 0
        assert db.scalar(select(func.count()).select_from(Finding)) == 0


def test_generated_conditions_schema_requires_complete_strict_output():
    schema = Proposal.model_json_schema()["$defs"]["ProposedConditions"]
    assert set(schema["required"]) == set(schema["properties"])
    assert schema["additionalProperties"] is False
    assert all("default" not in field for field in schema["properties"].values())
    # Manual setup still accepts omitted fields and supplies editable defaults.
    assert Conditions().trial_type == "Criminal trial"
