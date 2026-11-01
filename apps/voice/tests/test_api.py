import io
import json

import numpy as np
import pytest
import soundfile as sf
from fastapi.testclient import TestClient

from jude_voice.config import Settings
from jude_voice.engines import FakeEngine
from jude_voice.main import create_app

TOKEN = "test-token-0123456789"
AUTH = {"Authorization": f"Bearer {TOKEN}"}
RATE = 16000


def tone(freq: float, seconds: float, rate: int = RATE) -> np.ndarray:
    t = np.arange(int(seconds * rate)) / rate
    return (0.3 * np.sin(2 * np.pi * freq * t)).astype(np.float32)


def wav(samples: np.ndarray, rate: int = RATE) -> bytes:
    buffer = io.BytesIO()
    sf.write(buffer, samples, rate, format="WAV", subtype="PCM_16")
    return buffer.getvalue()


@pytest.fixture
def client():
    settings = Settings(token=TOKEN, engine="fake", max_recording_seconds=120)
    with TestClient(create_app(settings, FakeEngine())) as client:
        yield client


def post(client, path, samples, rate=RATE, **data):
    return client.post(
        path, headers=AUTH, files={"file": ("clip.wav", wav(samples, rate), "audio/wav")}, data=data
    )


def test_health_is_public_and_reports_engine(client):
    body = client.get("/health").json()
    assert body["status"] == "ok" and body["engine"] == "fake" and body["dim"] == 64


def test_rejects_missing_or_wrong_token(client):
    files = {"file": ("clip.wav", wav(tone(200, 2)), "audio/wav")}
    assert client.post("/v1/embeddings", files=files).status_code == 401
    bad = {"Authorization": "Bearer wrong-token-000000000"}
    files = {"file": ("clip.wav", wav(tone(200, 2)), "audio/wav")}
    assert client.post("/v1/embeddings", files=files, headers=bad).status_code == 401


def test_embedding_shape_and_normalization(client):
    body = post(client, "/v1/embeddings", tone(220, 2)).json()
    vector = np.array(body["embedding"])
    assert body["dim"] == 64 and vector.shape == (64,)
    assert abs(np.linalg.norm(vector) - 1) < 1e-3
    assert body["duration"] == pytest.approx(2, abs=0.01)


def test_short_long_and_invalid_audio_are_rejected(client):
    assert post(client, "/v1/embeddings", tone(220, 0.5)).status_code == 422
    assert post(client, "/v1/embeddings", tone(220, 31)).status_code == 413
    bad = client.post(
        "/v1/embeddings", headers=AUTH, files={"file": ("x.wav", b"not audio", "audio/wav")}
    )
    assert bad.status_code == 422 and "WAV" in bad.json()["detail"]


def test_identify_matches_same_voice_and_rejects_new_voice(client):
    low = post(client, "/v1/embeddings", tone(180, 2)).json()["embedding"]
    high = post(client, "/v1/embeddings", tone(2400, 2)).json()["embedding"]
    candidates = json.dumps(
        [{"id": "voice-1", "embedding": low}, {"id": "voice-2", "embedding": high}]
    )
    same = post(client, "/v1/identify", tone(180, 3, 48000), 48000, candidates=candidates).json()
    assert same["match"]["id"] == "voice-1" and same["match"]["score"] > 0.9
    assert [s["id"] for s in same["scores"]] == ["voice-1", "voice-2"]
    only_high = json.dumps([{"id": "voice-2", "embedding": high}])
    new = post(client, "/v1/identify", tone(180, 2), candidates=only_high, threshold="0.99").json()
    assert new["match"] is None and len(new["embedding"]) == 64


def test_identify_validates_candidates(client):
    wrong_dim = json.dumps([{"id": "v", "embedding": [0.1, 0.2]}])
    response = post(client, "/v1/identify", tone(200, 2), candidates=wrong_dim)
    assert response.status_code == 422
    assert post(client, "/v1/identify", tone(200, 2), candidates="{").status_code == 422
    assert post(client, "/v1/identify", tone(200, 2), threshold="1.5").status_code == 422


def test_diarize_separates_two_synthetic_voices(client):
    audio = np.concatenate([tone(180, 4.5), tone(2400, 4.5), tone(180, 3)])
    body = post(client, "/v1/diarize", audio).json()
    speakers = [s["speaker"] for s in body["segments"]]
    assert speakers == ["SPEAKER_00", "SPEAKER_01", "SPEAKER_00"]
    assert body["segments"][1]["start"] == pytest.approx(4.5)
    assert {s["speaker"] for s in body["speakers"]} == {"SPEAKER_00", "SPEAKER_01"}


def test_settings_require_a_real_token(monkeypatch):
    monkeypatch.setenv("VOICE_API_TOKEN", "short")
    with pytest.raises(RuntimeError):
        Settings.from_env()
    monkeypatch.setenv("VOICE_API_TOKEN", TOKEN)
    monkeypatch.setenv("VOICE_MATCH_THRESHOLD", "0.7")
    assert Settings.from_env().match_threshold == 0.7
