import asyncio
import json

import websockets
from fastapi import WebSocketDisconnect

from ..models import Segment
from .analysis import investigate, schedule
from .providers import ProviderError


def normalize_transcript(message):
    """Split by diarized speaker. Never infer courtroom roles from voice IDs."""
    groups = []
    for result in message.get("results", []):
        alternatives = result.get("alternatives") or []
        if not alternatives:
            continue
        alt = alternatives[0]
        content = str(alt.get("content", ""))
        speaker = str(alt.get("speaker") or result.get("speaker") or "Unknown")
        if result.get("type") == "punctuation" and groups:
            groups[-1]["text"] += content
            continue
        if not groups or groups[-1]["speaker"] != speaker:
            groups.append(
                {
                    "speaker": speaker,
                    "text": "",
                    "start": float(result.get("start_time", 0)),
                    "end": 0,
                    "confidences": [],
                }
            )
        group = groups[-1]
        group["text"] += (" " if group["text"] else "") + content
        group["end"] = float(result.get("end_time", group["start"]))
        if isinstance(alt.get("confidence"), (int, float)):
            group["confidences"].append(max(0, min(1, alt["confidence"])))
    for group in groups:
        confidence = group.pop("confidences")
        group["confidence"] = sum(confidence) / len(confidence) if confidence else None
    return groups


async def stream_speech(app, ws, case_id, config, authorize=None, hearing_id=None):
    settings = app.state.settings
    if not settings.speechmatics_key:
        raise ProviderError(
            "Speechmatics is not configured. Use a simulated hearing or add transcript text."
        )
    sample_rate = config.get("sample_rate", 48000)
    if sample_rate not in {16000, 22050, 24000, 44100, 48000} or config.get(
        "language", "id"
    ) not in {"id", "en"}:
        raise ProviderError("Unsupported audio configuration.")
    async with websockets.connect(
        settings.speechmatics_url,
        additional_headers={"Authorization": f"Bearer {settings.speechmatics_key}"},
        max_size=2**20,
        open_timeout=15,
    ) as upstream:
        await upstream.send(
            json.dumps(
                {
                    "message": "StartRecognition",
                    "audio_format": {
                        "type": "raw",
                        "encoding": "pcm_s16le",
                        "sample_rate": sample_rate,
                    },
                    "transcription_config": {
                        "language": config.get("language", "id"),
                        "diarization": "speaker",
                        "enable_partials": True,
                        "max_delay": 2,
                    },
                }
            )
        )
        ready = json.loads(await asyncio.wait_for(upstream.recv(), 20))
        if ready.get("message") != "RecognitionStarted":
            raise ProviderError(
                "Speech provider could not start recognition. Check language, credentials, and quota."
            )
        await ws.send_json({"type": "ready"})
        sent, acknowledged = 0, 0

        async def send_audio():
            nonlocal sent
            total = 0
            while True:
                event = await asyncio.wait_for(ws.receive(), 45)
                if event["type"] == "websocket.disconnect":
                    raise WebSocketDisconnect()
                data = event.get("bytes")
                if data:
                    total += len(data)
                    if (
                        len(data) > 65536
                        or total > sample_rate * 2 * 3600
                        or sent - acknowledged > 400
                    ):
                        raise ProviderError(
                            "Audio stream exceeded its size or backpressure limit. Restart the recording."
                        )
                    await upstream.send(data)
                    sent += 1
                elif event.get("text"):
                    if json.loads(event["text"]).get("type") == "stop":
                        await upstream.send(
                            json.dumps({"message": "EndOfStream", "last_seq_no": sent})
                        )
                        return

        async def receive_transcripts():
            nonlocal acknowledged
            async for raw in upstream:
                data = json.loads(raw)
                kind = data.get("message")
                if kind == "AudioAdded":
                    acknowledged = int(data.get("seq_no", acknowledged))
                elif kind == "AddPartialTranscript":
                    await app.state.events.publish(
                        case_id,
                        {
                            "type": "partial",
                            "text": data.get("metadata", {}).get("transcript", ""),
                        },
                    )
                elif kind == "AddTranscript":
                    for item in normalize_transcript(data):
                        if not item["text"].strip():
                            continue
                        if authorize:
                            authorize()
                        with app.state.db() as db:
                            segment = Segment(
                                case_id=case_id,
                                hearing_id=hearing_id,
                                origin="speechmatics",
                                **item,
                            )
                            db.add(segment)
                            db.commit()
                        await app.state.events.publish(
                            case_id, {"type": "transcript", "segment_id": segment.id}
                        )
                        schedule(app, investigate(app, segment.id))
                elif kind == "Error":
                    raise ProviderError(
                        "Speech provider reported an error. Check connection settings and quota."
                    )
                elif kind == "EndOfTranscript":
                    await ws.send_json({"type": "stopped"})
                    return

        async def check_authorization():
            while True:
                if authorize:
                    authorize()
                await asyncio.sleep(2)

        guard = asyncio.create_task(check_authorization())
        sender = asyncio.create_task(send_audio())
        receiver = asyncio.create_task(receive_transcripts())
        try:
            done, _ = await asyncio.wait(
                [sender, receiver, guard], return_when=asyncio.FIRST_COMPLETED
            )
            for task in done:
                task.result()
            if sender in done and not receiver.done():
                finalized, _ = await asyncio.wait(
                    [receiver, guard], timeout=20, return_when=asyncio.FIRST_COMPLETED
                )
                if not finalized:
                    raise TimeoutError("Final transcription timed out")
                for task in finalized:
                    task.result()
        finally:
            guard.cancel()
            sender.cancel()
            receiver.cancel()
            await asyncio.gather(sender, receiver, guard, return_exceptions=True)
