# Reproducible evaluation

`cases.json` contains six synthetic Indonesian examples: direct support, same-event timing conflict, different-day context, missing evidence, instruction injection in a source, and a procedural question. Labels are authored examples requiring independent legal review before using them as a benchmark.

Run from `be/`:

```bash
uv run python -m app.evaluate --predictions evaluation/predictions.fixture.json --fixture --output /tmp/jude-fixture-report.json
```

The fixture includes deliberate mistakes. Its scores validate metric plumbing, not a model. A missing denominator produces `null`, never a perfect score. Missing/failed outputs count toward status accuracy and inconsistency false negatives. Citation validity compares quotes against the dataset's sources, never a source body supplied by a prediction.

To evaluate the real pipeline, configure OpenRouter credentials and a strict-output model in the process environment, then run:

```bash
uv run --env-file .env python -m app.evaluate --live --output /tmp/jude-live-report.json
```

Live mode sends only the synthetic dataset to OpenRouter and consumes API quota. It creates a temporary SQLite database, disables external storage and legal discovery for isolation, runs the actual ingestion/retrieval/four-call pipeline, and saves model outputs for independent review. Report mode and predictions accompany every report. Do not run with private case material unless separately authorized.

To score externally produced outputs, use `--predictions path.json` without `--fixture`. Each prediction has `id`, `status`, `citations` (`chunk_id` maps to dataset source IDs, exact `quote`, `relation`), optional `elapsed_ms`, optional `recognized_transcript`, and optional boolean `unsupported_conclusion` supplied by a human reviewer. Duplicate and unknown IDs are rejected. Missing examples are scored as missing.

Outputs include inconsistency precision/recall and FP/FN counts, per-status correctness, exact citation validity, structurally ungrounded substantive findings, missing/failed outputs, available latency statistics, and human-annotated unsupported-conclusion rate. An exact quote is not proof of semantic support: a legal reviewer must label whether the interpretation is warranted. That rate remains null until annotations exist.

For transcription evaluation, add a separately prepared `reference_transcript` to each applicable dataset row and the recognized output to its prediction. The harness computes case-insensitive word edit distance without removing punctuation. No WER is reported for the authored hearing. Speaker diarization needs timestamp-aligned reference speaker turns and a separate DER scorer; voice IDs alone cannot establish speaker identity or courtroom role. Evaluate real authorized audio, accents, overlap, and courtroom noise before making transcription-quality claims.
