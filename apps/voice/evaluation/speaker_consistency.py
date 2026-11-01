"""Replay Jude's live voice matching against an official transcript.

For every reference turn long enough to produce a clean clip, take a window from the middle
of the turn, then match it against the voiceprints seen so far exactly as Jude does (best
cosine above the threshold, else a new voice; matched prints keep a capped running mean).
The report says how many voices were created per real speaker (fragmentation) and how many
speakers share a voice (merging), and the share of turns whose voice belongs to the right
speaker.

Usage (audio stays outside the repository):
  uv run python evaluation/speaker_consistency.py AUDIO.wav evaluation/mk115.reference.json \
      --offset 27 --end-offset 31 --thresholds 0.4 0.5 0.55 0.6 0.7
"""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict

import soundfile as sf

from jude_voice.config import Settings
from jude_voice.engines import build_engine
from jude_voice.matching import best_match, normalize, rank


def clips(turns, rate, total, offset, end_offset, min_turn, window):
    last = turns[-1]["start"] or 1
    for turn, following in zip(turns, turns[1:], strict=False):
        if not turn["name"]:
            continue
        length = following["start"] - turn["start"]
        if length < min_turn:
            continue
        shift = offset + (end_offset - offset) * turn["start"] / last
        middle = turn["start"] + shift + length / 2
        start, end = middle - window / 2, middle + window / 2
        if start < 0 or end * rate > total:
            continue
        yield turn, int(start * rate), int(end * rate)


def replay(embeddings, threshold, max_samples=50):
    prints: list[list] = []  # [id, vector, samples]
    assigned = []
    for vector in embeddings:
        match = best_match(rank(vector, [(p[0], p[1]) for p in prints]), threshold)
        if match:
            p = next(p for p in prints if p[0] == match.id)
            n = min(p[2], max_samples - 1)
            p[1], p[2] = normalize((p[1] * n + vector) / (n + 1)), min(p[2] + 1, max_samples)
            assigned.append(match.id)
        else:
            key = f"voice-{len(prints) + 1}"
            prints.append([key, vector, 1])
            assigned.append(key)
    return assigned


def report(speakers, assigned):
    by_voice = defaultdict(Counter)
    for speaker, voice in zip(speakers, assigned, strict=True):
        by_voice[voice][speaker] += 1
    owner = {voice: counts.most_common(1)[0][0] for voice, counts in by_voice.items()}
    correct = sum(owner[v] == s for s, v in zip(speakers, assigned, strict=True))
    voices_per_speaker = defaultdict(set)
    for speaker, voice in zip(speakers, assigned, strict=True):
        voices_per_speaker[speaker].add(voice)
    merged = sum(1 for counts in by_voice.values() if len(counts) > 1)
    return {
        "turns": len(speakers),
        "speakers": len(set(speakers)),
        "voices": len(by_voice),
        "accuracy": round(correct / len(speakers), 3),
        "voices_per_speaker": {s: len(v) for s, v in sorted(voices_per_speaker.items())},
        "mixed_voices": merged,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("audio")
    parser.add_argument("reference")
    parser.add_argument("--offset", type=float, default=0, help="video seconds at risalah 00:00")
    parser.add_argument("--end-offset", type=float, help="offset at the last turn (drift)")
    parser.add_argument("--min-turn", type=float, default=8)
    parser.add_argument("--window", type=float, default=6)
    parser.add_argument("--thresholds", type=float, nargs="+", default=[0.55])
    parser.add_argument("--engine", default="pyannote")
    args = parser.parse_args()

    samples, rate = sf.read(args.audio, dtype="float32", always_2d=True)
    samples = samples.mean(axis=1)
    turns = json.load(open(args.reference))
    end_offset = args.offset if args.end_offset is None else args.end_offset
    engine = build_engine(Settings(token="x" * 16, engine=args.engine))
    picked = list(
        clips(turns, rate, len(samples), args.offset, end_offset, args.min_turn, args.window)
    )
    speakers = [f"{t['role']}: {t['name']}" for t, _, _ in picked]
    embeddings = [engine.embed(samples[a:b], rate) for _, a, b in picked]
    results = {
        "engine": engine.model,
        "window_seconds": args.window,
        "by_threshold": {str(t): report(speakers, replay(embeddings, t)) for t in args.thresholds},
    }
    print(json.dumps(results, indent=1))


if __name__ == "__main__":
    main()
