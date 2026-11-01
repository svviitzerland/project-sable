# Voice evaluation on real hearing audio

Checks Jude's live voice matching against an official, speaker-labeled transcript instead of synthetic voices. Audio is never committed; only the public transcript reference and the scripts are.

## Reference: Mahkamah Konstitusi, Perkara 115/PUU-XXII/2024

- Hearing: preliminary examination, 3 September 2024, 13:27–14:30 WIB (KUHP/ITE judicial review). Public hearing; MK publishes both records.
- Transcript (risalah, verbatim, numbered turns with role, name and time offset): https://s.mkri.id/public/content/persidangan/risalah/11038_Risalah-pdf_PERKARA%20NOMOR%20115.PUU-XXII.2024%20tgl.%203%20September%202024.pdf
- Video (official MK channel, 1:03:51): https://www.youtube.com/watch?v=FUI-bAfaWsY
- `mk115.reference.json`: 112 turns parsed with `parse_risalah.py`; 6 named speakers (presiding judge, two panel judges, three of the petitioner's lawyers, some joining online).
- Alignment: risalah `[00:00]` ("Bisa kita mulai, ya?") is at about 27 s in the video and the last turn (`[51:30]`) at about 31 s past its offset, so the scripts interpolate a 27→31 s shift. Turn boundaries are approximate; windows are taken from the middle of turns.

## Run

```bash
# outside the repository
uvx yt-dlp -x --audio-format wav --postprocessor-args "ffmpeg:-ar 16000 -ac 1" \
  -o mk115.wav https://www.youtube.com/watch?v=FUI-bAfaWsY
# from apps/voice/
uv sync --extra ml
uv run python evaluation/speaker_consistency.py /path/to/mk115.wav evaluation/mk115.reference.json \
  --offset 27 --end-offset 31 --window 3 --min-turn 6 --thresholds 0.45 0.55 0.65
```

## Results (2026-11-01, `pyannote/wespeaker-voxceleb-resnet34-LM`, CPU)

Turns are matched in order, exactly as Jude does live. "Accuracy" is the share of turns whose voice belongs to the right speaker; "voices" counts labels created for the 6 real speakers.

| Window | Threshold | Turns | Voices | Accuracy | Voices mixing two people |
|---|---|---|---|---|---|
| 2 s | 0.55 | 51 | 18 | 0.941 | 2 |
| 3 s | 0.45 | 49 | 7 | 0.939 | 2 |
| 3 s | 0.55 | 49 | 9 | 0.959 | 2 |
| 6 s | 0.55 | 41 | 7 | 1.000 | 0 |
| 6 s | 0.65 | 41 | 7 | 1.000 | 0 |

Findings:

- With 3 s or longer clips, the default threshold 0.55 labels 96–100% of turns correctly. One lawyer who spoke both in the room and online was split into two voices; nobody was merged at 6 s.
- 2 s clips fragment people into many voices, so Jude only sends statements of at least 3 s. Shorter statements keep their provider label, which is re-keyed once any longer statement from it is identified.
- Remaining error mode at short windows: two speakers merged in one voice. This is why matches stay suggestions and labels stay user-confirmed.

Limits: one hearing, mostly clean microphones, approximate turn boundaries. Criminal-court audio (room echo, witnesses far from microphones, overlapping speech) still needs its own reference.
