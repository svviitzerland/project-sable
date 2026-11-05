import assert from "node:assert/strict";
import { test } from "node:test";
import {
  batchReady,
  batchText,
  SPEECH_BATCH,
  type BatchResult,
} from "../src/lib/aws-eventstream";

const words = (text: string): BatchResult[] =>
  text.split(" ").flatMap((token) => {
    const [, word, mark] = /^(.*?)([.,?!]?)$/.exec(token)!;
    const items: BatchResult[] = [
      {
        type: "word",
        start_time: 0,
        end_time: 0,
        alternatives: [{ content: word }],
      },
    ];
    if (mark)
      items.push({ type: "punctuation", alternatives: [{ content: mark }] });
    return items;
  });

test("short finalized fragments wait for a natural break instead of saving at once", () => {
  assert.equal(batchReady(words("Ya, silahkan."), 1000), false);
  assert.equal(batchReady(words("Tidak. Setelah itu"), 1000), false);
  assert.equal(batchText(words("Ya, silahkan.")), "Ya, silahkan.");
});

test("a finished long sentence, a long monologue or the word cap saves the batch", () => {
  const sentence = words(
    "Setelah itu saya memapah Ibu ke kamar lalu membereskan kasur yang berantakan bersama Om Kuat sampai selesai semuanya.",
  );
  assert.ok(
    sentence.filter((r) => r.type === "word").length >= SPEECH_BATCH.minWords,
  );
  assert.equal(batchReady(sentence, 1000), true);
  assert.equal(
    batchReady(words("dan kemudian saya"), SPEECH_BATCH.maxMs),
    true,
  );
  assert.equal(
    batchReady(words(Array(SPEECH_BATCH.maxWords).fill("kata").join(" ")), 0),
    true,
  );
  assert.equal(batchReady([], SPEECH_BATCH.maxMs), false);
});
