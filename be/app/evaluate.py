"""Evaluate labeled hearings; fixture reports are never model performance claims."""

import argparse
import asyncio
import json
import statistics
import tempfile
from pathlib import Path

from sqlalchemy import select

from .config import Settings
from .models import Case, Chunk, Finding, Segment, User
from .services.analysis import investigate
from .services.documents import ingest

STATUSES = (
    "supported",
    "potential_inconsistency",
    "context_needed",
    "insufficient_evidence",
    "skipped",
)


def ratio(a, b):
    return round(a / b, 4) if b else None


def word_error_rate(reference, hypothesis):
    """Case-insensitive word edit distance; no punctuation normalization."""
    expected, actual = reference.lower().split(), hypothesis.lower().split()
    previous = list(range(len(actual) + 1))
    for i, word in enumerate(expected, 1):
        current = [i]
        for j, other in enumerate(actual, 1):
            current.append(
                min(current[-1] + 1, previous[j] + 1, previous[j - 1] + (word != other))
            )
        previous = current
    return ratio(previous[-1], len(expected))


def score(dataset, predictions, mode):
    ids = [p["id"] for p in predictions]
    if len(ids) != len(set(ids)) or set(ids) - {x["id"] for x in dataset}:
        raise ValueError("Predictions must have unique IDs drawn from the dataset")
    lookup = {p["id"]: p for p in predictions}
    rows, latencies = [], []
    tp = fp = fn = valid = citation_count = ungrounded = 0
    annotations = []
    for item in dataset:
        prediction = lookup.get(item["id"], {"status": "missing"})
        actual, expected = prediction["status"], item["expected_status"]
        tp += actual == expected == "potential_inconsistency"
        fp += actual == "potential_inconsistency" and expected != actual
        fn += expected == "potential_inconsistency" and actual != expected
        # Never accept a source body supplied by the prediction as ground truth.
        sources = {s["id"]: s["text"] for s in item["sources"]}
        citations = prediction.get("citations", [])
        verified = [
            c
            for c in citations
            if c.get("quote", "").strip()
            and c.get("quote") in sources.get(c.get("chunk_id"), "")
        ]
        valid += len(verified)
        citation_count += len(citations)
        required = {
            "supported": "supports",
            "potential_inconsistency": "conflicts",
        }.get(actual)
        grounded = (
            any(c.get("relation") == required for c in verified)
            if required
            else bool(verified)
        )
        ungrounded += (
            actual in {"supported", "potential_inconsistency", "context_needed"}
            and not grounded
        )
        if type(prediction.get("unsupported_conclusion")) is bool:
            annotations.append(prediction["unsupported_conclusion"])
        if prediction.get("elapsed_ms") is not None:
            latencies.append(prediction["elapsed_ms"])
        row = {
            "id": item["id"],
            "expected": expected,
            "actual": actual,
            "correct": actual == expected,
            "citations_valid": len(verified) == len(citations),
        }
        if item.get("reference_transcript") and "recognized_transcript" in prediction:
            row["word_error_rate"] = word_error_rate(
                item["reference_transcript"], prediction["recognized_transcript"]
            )
        rows.append(row)
    return {
        "mode": mode,
        "notice": "Fixture scoring validates the harness only; it does not measure AI or transcription quality."
        if mode == "fixture"
        else "Small synthetic evaluation; not courtroom performance. Unsupported conclusions require independent human annotation.",
        "examples": len(rows),
        "status_accuracy": ratio(sum(r["correct"] for r in rows), len(rows)),
        "inconsistency": {
            "true_positives": tp,
            "false_positives": fp,
            "false_negatives": fn,
            "precision": ratio(tp, tp + fp),
            "recall": ratio(tp, tp + fn),
        },
        "citation_validity": ratio(valid, citation_count),
        "citation_count": citation_count,
        "substantive_findings_without_required_citations": ungrounded,
        "human_annotated_unsupported_conclusion_rate": ratio(
            sum(annotations), len(annotations)
        ),
        "human_annotated_count": len(annotations),
        "missing_or_failed": sum(r["actual"] not in STATUSES for r in rows),
        "latency_ms": {
            "median": statistics.median(latencies) if latencies else None,
            "max": max(latencies) if latencies else None,
        },
        "per_status": {
            status: {
                "expected": sum(r["expected"] == status for r in rows),
                "correct": sum(r["expected"] == status and r["correct"] for r in rows),
            }
            for status in STATUSES
        },
        "examples_detail": rows,
    }


async def run_live(dataset):
    from .factory import create_app

    with tempfile.TemporaryDirectory(prefix="jude-evaluation-") as directory:
        settings = Settings(
            data_dir=Path(directory), database_url="sqlite:///" + directory + "/eval.db"
        )
        if not settings.ai_enabled:
            raise ValueError(
                "Live evaluation requires OPENROUTER_API_KEY and OPENROUTER_MODEL"
            )
        # Keep the evaluation isolated from configured production storage and legal discovery.
        settings.supabase_url = settings.supabase_key = settings.pasal_key = ""
        app = create_app(settings)
        predictions = []
        with app.state.db() as db:
            user = User(
                email="evaluation@example.invalid",
                name="Evaluation",
                password_hash="disabled",
            )
            db.add(user)
            db.commit()
        for item in dataset:
            with app.state.db() as db:
                case = Case(owner_id=user.id, title=item["id"])
                db.add(case)
                db.commit()
            source_ids = {}
            for source in item["sources"]:
                document = await ingest(
                    app, case, source["id"] + ".txt", source["text"].encode()
                )
                with app.state.db() as db:
                    for chunk in db.scalars(
                        select(Chunk).where(Chunk.document_id == document.id)
                    ):
                        source_ids[chunk.id] = source["id"]
            with app.state.db() as db:
                segment = Segment(
                    case_id=case.id, text=item["transcript"], speaker="S1"
                )
                db.add(segment)
                db.commit()
            await investigate(app, segment.id)
            with app.state.db() as db:
                segment = db.get(Segment, segment.id)
                finding = db.scalar(
                    select(Finding).where(Finding.segment_id == segment.id)
                )
                record = {
                    "id": item["id"],
                    "status": finding.status if finding else segment.analysis_state,
                    "error": segment.analysis_error,
                }
                if finding:
                    record.update(
                        citations=[
                            {**c, "chunk_id": source_ids[c["chunk_id"]]}
                            for c in finding.citations
                        ],
                        elapsed_ms=finding.elapsed_ms,
                        explanation=finding.explanation,
                        uncertainty=finding.uncertainty,
                    )
                predictions.append(record)
        return predictions


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=Path("evaluation/cases.json"))
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--predictions", type=Path)
    group.add_argument(
        "--live",
        action="store_true",
        help="Send synthetic evidence to OpenRouter; consumes API quota",
    )
    parser.add_argument(
        "--fixture",
        action="store_true",
        help="Label authored predictions as a harness check",
    )
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.live and args.fixture:
        parser.error("--live and --fixture cannot be combined")
    dataset = json.loads(args.dataset.read_text())
    predictions = (
        asyncio.run(run_live(dataset))
        if args.live
        else json.loads(args.predictions.read_text())
    )
    report = score(
        dataset,
        predictions,
        "live" if args.live else "fixture" if args.fixture else "imported",
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps({**report, "predictions": predictions}, ensure_ascii=False, indent=2)
        + "\n"
    )
    print(
        json.dumps(
            {key: value for key, value in report.items() if key != "examples_detail"},
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
