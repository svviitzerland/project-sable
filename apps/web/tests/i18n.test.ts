import assert from "node:assert/strict";
import { test } from "node:test";
import {
  detectLang,
  formatDate,
  interpolate,
  langFromAcceptLanguage,
  langFromTag,
  readCookie,
  translate,
  translatePlural,
} from "../src/lib/i18n/core";
import { en } from "../src/lib/i18n/en";
import { id } from "../src/lib/i18n/id";
import { examples } from "../src/lib/jude-demo";

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("Indonesian and English dictionaries share one key set without empty values", () => {
  assert.deepEqual(Object.keys(id).sort(), Object.keys(en).sort());
  for (const [lang, messages] of Object.entries({ id, en }))
    for (const [key, value] of Object.entries(messages))
      assert.ok(value.trim().length > 0, `${lang}.${key} is empty`);
});

test("translations keep the same interpolation placeholders", () => {
  for (const key of Object.keys(en) as (keyof typeof en)[])
    assert.deepEqual(
      placeholders(id[key]),
      placeholders(en[key]),
      `placeholders differ for ${key}`,
    );
});

test("plural keys come in one/other pairs", () => {
  const keys = new Set(Object.keys(en));
  for (const key of keys) {
    if (key.endsWith(".one"))
      assert.ok(keys.has(key.replace(/\.one$/, ".other")), key);
    if (key.endsWith(".other"))
      assert.ok(keys.has(key.replace(/\.other$/, ".one")), key);
  }
});

test("finding statuses use the agreed non-judgmental Indonesian labels", () => {
  assert.equal(id["status.supported"], "Didukung sumber");
  assert.equal(id["status.potential_inconsistency"], "Berbeda dari sumber");
  assert.equal(id["status.context_needed"], "Perlu konteks");
  assert.equal(id["status.insufficient_evidence"], "Bukti belum cukup");
  const all = Object.values(id).join(" ").toLowerCase();
  assert.doesNotMatch(all, /\bbohong\b|tidak kredibel/);
});

test("landing examples exist in both languages with matching ids", () => {
  assert.deepEqual(
    examples.id.map((e) => e.id),
    examples.en.map((e) => e.id),
  );
  for (const example of examples.id) {
    assert.equal(example.transcript[1].endsWith(example.quote), true);
    assert.equal(example.statement[1].endsWith(example.earlier), true);
  }
});

test("language tags map id* to Indonesian and everything else to English", () => {
  assert.equal(langFromTag("id"), "id");
  assert.equal(langFromTag("id-ID"), "id");
  assert.equal(langFromTag("ID_id"), "id");
  assert.equal(langFromTag("in"), "id");
  assert.equal(langFromTag("en-US"), "en");
  assert.equal(langFromTag("ms-MY"), "en");
  assert.equal(langFromTag("*"), null);
  assert.equal(langFromTag(""), null);
  assert.equal(langFromTag(undefined), null);
});

test("Accept-Language honours quality weights and order", () => {
  assert.equal(langFromAcceptLanguage("id-ID,id;q=0.9,en-US;q=0.8"), "id");
  assert.equal(langFromAcceptLanguage("en-US,en;q=0.9,id;q=0.8"), "en");
  assert.equal(langFromAcceptLanguage("en;q=0.4, id;q=0.9"), "id");
  assert.equal(langFromAcceptLanguage("id;q=0, fr"), "en");
  assert.equal(langFromAcceptLanguage("*"), null);
  assert.equal(langFromAcceptLanguage(""), null);
  assert.equal(langFromAcceptLanguage(null), null);
});

test("detectLang prefers the saved cookie, then storage, then the browser", () => {
  assert.equal(
    detectLang({ cookie: "en", stored: "id", acceptLanguage: "id-ID" }),
    "en",
  );
  assert.equal(detectLang({ cookie: "fr", stored: "id" }), "id");
  assert.equal(detectLang({ acceptLanguage: "en-GB,en" }), "en");
  assert.equal(
    detectLang({ acceptLanguage: null, navigatorLanguage: "id-ID" }),
    "id",
  );
  assert.equal(detectLang({ navigatorLanguage: "de-DE" }), "en");
  assert.equal(detectLang({}), "id");
});

test("readCookie finds the lang cookie among others", () => {
  assert.equal(readCookie("a=1; lang=en; b=2", "lang"), "en");
  assert.equal(readCookie("language=en", "lang"), null);
  assert.equal(readCookie(undefined, "lang"), null);
});

test("translation interpolates parameters and formats plurals per locale", () => {
  assert.equal(interpolate("{a} of {b}", { a: 1, b: 2 }), "1 of 2");
  assert.equal(interpolate("{missing}", {}), "{missing}");
  assert.equal(
    translate("id", "hearing.reviewedOf", { done: 1, total: 3 }),
    "1 dari 3 sudah ditinjau",
  );
  assert.equal(translatePlural("en", "count.statements", 1), "1 statement");
  assert.equal(translatePlural("en", "count.statements", 2), "2 statements");
  assert.equal(translatePlural("id", "count.statements", 2), "2 pernyataan");
  assert.equal(translatePlural("en", "count.sources", 1200), "1,200 sources");
  assert.equal(translatePlural("id", "count.sources", 1200), "1.200 sumber");
});

test("dates use id-ID and en-US formats without shifting plain dates", () => {
  assert.equal(formatDate("en", "2026-11-02"), "Nov 2, 2026");
  assert.match(formatDate("id", "2026-11-02"), /^2 Nov 2026$/);
  assert.equal(formatDate("en", "not a date"), "not a date");
});

test("stored English conversation notices render in the interface language", async () => {
  const { localizeNotice } = await import("../src/lib/notice.ts");
  const stored =
    "Based on 19 source excerpts. Check the original context; this is not a review of the entire case. Hypothetical rehearsal, not testimony or a prediction of a real court.";
  assert.equal(
    localizeNotice(stored, "id"),
    "Berdasarkan 19 kutipan sumber. Periksa konteks aslinya. Ini bukan tinjauan atas seluruh perkara. Latihan hipotetis, bukan keterangan atau prediksi sidang sebenarnya.",
  );
  assert.equal(localizeNotice("Something new.", "id"), "Something new.");
  const { localizeFixedText } = await import("../src/lib/notice.ts");
  assert.equal(
    localizeFixedText(
      "The AI reply could not be matched to the case sources, so it was not saved. Here are relevant case excerpts to inspect.",
      "id",
    ),
    id["notice.sourcesOnly"],
  );
  assert.equal(
    localizeNotice(
      "Citations that did not match the case text were removed.",
      "id",
    ),
    id["notice.droppedCitations"],
  );
  // Model replies keep their own line breaks.
  assert.equal(localizeFixedText("Satu.\n\nDua.", "id"), "Satu.\n\nDua.");
});
