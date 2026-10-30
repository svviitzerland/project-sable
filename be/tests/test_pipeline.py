import asyncio
import json
from types import SimpleNamespace

import httpx
import pytest
from sqlalchemy import select

from app.config import Settings
from app.main import create_app
from app.models import Case, Chunk, Conclusion, Finding, Segment, User
from app.services.analysis import Assessment, Claim, investigate
from app.services.documents import ingest
from app.services.providers import OpenRouter, ProviderError
from app.services.simulation import DOCUMENTS
from app.services.speech import stream_speech


@pytest.mark.parametrize("invented", [False, True])
def test_pipeline_independent_review_and_fail_closed(tmp_path, invented):
    app = create_app(Settings(data_dir=tmp_path, openrouter_key="test", model="test"))
    calls = []

    async def structured(role, packet, schema):
        calls.append((role, packet))
        if schema is Claim:
            return Claim(
                checkable=True,
                assertion="Arrival time",
                search_query="arrived warehouse eight morning",
                legal_query="",
                reason="Check arrival",
            )
        if schema is Assessment:
            return Assessment(
                summary="Compare timing",
                alternative_explanations=["Different day"],
                missing_context=["Date"],
            )
        source = next(s for s in packet["sources"] if "8:00" in s["text"])
        return Conclusion(
            status="potential_inconsistency",
            title="Clarify arrival",
            explanation="Times differ.",
            uncertainty="Date unclear.",
            verification="Confirm date.",
            question="Which date?",
            citations=[
                {
                    "chunk_id": source["id"],
                    "quote": "Invented quote" if invented else source["text"],
                    "relation": "conflicts",
                }
            ],
        )

    async def embed(_):
        return None

    app.state.llm = SimpleNamespace(structured=structured, embed=embed)

    async def run():
        with app.state.db() as db:
            user = User(
                email="test@example.test", name="Tester", password_hash="disabled"
            )
            db.add(user)
            db.commit()
            case = Case(owner_id=user.id, title="Pipeline test")
            db.add(case)
            db.commit()
            segment = Segment(
                case_id=case.id, text="I arrived at 9:30 in the morning.", speaker="S1"
            )
            db.add(segment)
            db.commit()
        await ingest(app, case, DOCUMENTS[0][0], DOCUMENTS[0][1].encode())
        await investigate(app, segment.id)
        with app.state.db() as db:
            saved = db.get(Segment, segment.id)
            findings = db.scalars(select(Finding)).all()
            assert saved.analysis_state == ("failed" if invented else "complete")
            assert len(findings) == (0 if invented else 1)
        assert len(calls) == 4
        assert "Adversarial Reviewer" in calls[2][0]
        assert "analyst" not in calls[2][1]
        assert "analyst" in calls[3][1] and "reviewer" in calls[3][1]

    asyncio.run(run())


def test_openrouter_http_contract_and_safe_failure(monkeypatch, tmp_path):
    requests = []
    payload = {
        "checkable": False,
        "assertion": "",
        "search_query": "",
        "legal_query": "",
        "reason": "Question",
    }

    def respond(request):
        requests.append(request)
        return httpx.Response(
            200, json={"choices": [{"message": {"content": json.dumps(payload)}}]}
        )

    original = httpx.AsyncClient
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kwargs: original(transport=httpx.MockTransport(respond), **kwargs),
    )
    provider = OpenRouter(
        Settings(data_dir=tmp_path, openrouter_key="test", model="test/model")
    )
    result = asyncio.run(provider.structured("Extract", {"transcript": "When?"}, Claim))
    assert not result.checkable
    body = json.loads(requests[0].content)
    assert body["response_format"]["json_schema"]["strict"] is True
    assert body["provider"]["require_parameters"] is True
    assert "UNTRUSTED DATA" in body["messages"][0]["content"]

    def denied(request):
        return httpx.Response(401, text="secret echoed by provider")

    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kwargs: original(transport=httpx.MockTransport(denied), **kwargs),
    )
    with pytest.raises(ProviderError, match="HTTP 401") as error:
        asyncio.run(provider.structured("Extract", {}, Claim))
    assert "secret" not in str(error.value)


def test_speech_stream_protocol_finalizes_on_stop(monkeypatch, tmp_path):
    app = create_app(Settings(data_dir=tmp_path, speechmatics_key="test"))
    with app.state.db() as db:
        user = User(
            email="speech@example.test", name="Tester", password_hash="disabled"
        )
        db.add(user)
        db.commit()
        case = Case(owner_id=user.id, title="Speech test")
        db.add(case)
        db.commit()
    sent = []

    async def run():
        ended = asyncio.Event()

        class Upstream:
            async def __aenter__(self):
                return self

            async def __aexit__(self, *_):
                return False

            async def send(self, data):
                sent.append(data)
                if (
                    isinstance(data, str)
                    and json.loads(data)["message"] == "EndOfStream"
                ):
                    ended.set()

            async def recv(self):
                return json.dumps({"message": "RecognitionStarted"})

            def __aiter__(self):
                return self.messages()

            async def messages(self):
                await ended.wait()
                yield json.dumps(
                    {
                        "message": "AddTranscript",
                        "results": [
                            {
                                "type": "word",
                                "start_time": 0,
                                "end_time": 1,
                                "alternatives": [
                                    {
                                        "content": "Witness testimony",
                                        "speaker": "S1",
                                        "confidence": 0.8,
                                    }
                                ],
                            }
                        ],
                    }
                )
                yield json.dumps({"message": "EndOfTranscript"})

        class Browser:
            def __init__(self):
                self.messages = iter(
                    [
                        {"type": "websocket.receive", "bytes": b"\0\0" * 2048},
                        {"type": "websocket.receive", "text": '{"type":"stop"}'},
                    ]
                )
                self.output = []

            async def receive(self):
                return next(self.messages)

            async def send_json(self, data):
                self.output.append(data)

        monkeypatch.setattr(
            "app.services.speech.websockets.connect", lambda *args, **kwargs: Upstream()
        )
        browser = Browser()
        await stream_speech(
            app, browser, case.id, {"sample_rate": 48000, "language": "id"}
        )
        await asyncio.gather(*app.state.tasks)
        assert [m["type"] for m in browser.output] == ["ready", "stopped"]
        assert json.loads(sent[0])["transcription_config"]["diarization"] == "speaker"
        assert json.loads(sent[-1])["last_seq_no"] == 1
        with app.state.db() as db:
            segment = db.scalar(select(Segment))
            assert segment.speaker == "S1" and segment.confidence == 0.8
            assert segment.origin == "speechmatics"
            assert segment.analysis_state == "unavailable"
            assert db.scalar(select(Chunk)) is None

    asyncio.run(run())
