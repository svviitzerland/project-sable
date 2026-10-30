import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { score, wordErrorRate } from "../src/lib/server/evaluation";
test("evaluation reports misses, false positives and invalid quotes against dataset sources", async () => {
  const dataset = JSON.parse(
      await readFile(
        new URL("../evaluation/cases.json", import.meta.url),
        "utf8",
      ),
    ),
    predictions = JSON.parse(
      await readFile(
        new URL("../evaluation/predictions.fixture.json", import.meta.url),
        "utf8",
      ),
    ),
    report = score(dataset, predictions, "fixture");
  assert.ok(report.inconsistency.false_positives > 0);
  assert.ok(report.inconsistency.false_negatives > 0);
  assert.ok(report.citation_validity !== null && report.citation_validity < 1);
  assert.equal(report.human_annotated_unsupported_conclusion_rate, null);
  assert.match(report.notice, /does not measure AI/);
  assert.equal(
    score(dataset, [], "imported").missing_or_failed,
    dataset.length,
  );
  assert.equal(wordErrorRate("one two three", "one four three"), 0.3333);
  assert.equal(wordErrorRate("", ""), null);
  assert.throws(
    () => score(dataset, [predictions[0], predictions[0]], "fixture"),
    /unique IDs/,
  );
});
