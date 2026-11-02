import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  cleanCourtPages,
  cleanDirectoryPage,
  isWatermarkFragment,
  joinTextItems,
} from "../src/lib/server/court-text";
import { chunkPages, extractPages } from "../src/lib/server/documents";
import { exactSourceQuote } from "../src/lib/server/quotes";
import { verifiedConclusion } from "../src/lib/server/analysis";

// Synthetic page imitating a Direktori Putusan MA export (layout-mode text extraction):
// rotated watermark letters between and beside lines, header, page line and footer.
const NOISY_PAGE = `ahkama
   Mahkamah Agung Republik Indonesia
Direktori Putusan Mahkamah Agung Republik Indonesia
putusan.mahkamahagung.go.id
ub
        - Bahwa Saksi bekerja sebagai pengemudi sejak tahun 2019;          ep
R
gu          - Bahwa pada hari Jumat Saksi berada di gudang
                  bersama Saksi BUDI;                                   In d
In
                       Hal. 12 dari 40 hal. Putusan Nomor 99/Pid.B/2099/PN Contoh.
     Disclaimer
     Kepaniteraan Mahkamah Agung Republik Indonesia berusaha untuk selalu mencantumkan informasi paling kini dan akurat sebagai bentuk komitmen Mahkamah Agung untuk pelayanan publik, transparansi dan akuntabilitas
     pelaksanaan fungsi peradilan. Namun dalam hal-hal tertentu masih dimungkinkan terjadi permasalahan teknis terkait dengan akurasi dan keterkinian informasi yang kami sajikan, hal mana akan terus kami perbaiki dari waktu kewaktu.
     Dalam hal Anda menemukan inakurasi informasi yang termuat pada situs ini atau informasi yang seharusnya ada, namun belum tersedia, maka harap segera hubungi Kepaniteraan Mahkamah Agung RI melalui :
     Email : kepaniteraan@mahkamahagung.go.id    Telp : 021-384 3348 (ext.318)            Halaman 12`;

test("removes Direktori Putusan MA watermark, header, page line and disclaimer footer", () => {
  assert.equal(
    cleanDirectoryPage(NOISY_PAGE),
    "- Bahwa Saksi bekerja sebagai pengemudi sejak tahun 2019;\n- Bahwa pada hari Jumat Saksi berada di gudang\nbersama Saksi BUDI;",
  );
});

test("PDF.js header line and page footer variants are removed; body text survives", () => {
  const page = `putusan.mahkamahagung.go.id Hal. 2 dari   696 hal. Putusan Nomor   796/Pid.B/2022/PN Jkt.Sel .
Terdakwa   didampingi oleh Penasihat Hukum;
Mahkamah Agung berwenang memeriksa perkara kasasi;
Halaman 3 dari 9
Halaman 3`;
  assert.equal(
    cleanDirectoryPage(page),
    "Terdakwa didampingi oleh Penasihat Hukum;\nMahkamah Agung berwenang memeriksa perkara kasasi;",
  );
});

test("watermark fragments match only the MA phrase", () => {
  for (const fragment of ["ub", "ep", "R", "In d", "ahkamah Agung Republ"])
    assert.ok(isWatermarkFragment(fragment), fragment);
  for (const text of ["2019;", "Saksi", "Bahwa", "", "  "])
    assert.ok(!isWatermarkFragment(text), text);
});

test("only Direktori exports are cleaned; ordinary documents are untouched", () => {
  const ordinary: [number, string][] = [[1, "R\nIn\nThe witness said ub."]];
  assert.deepEqual(cleanCourtPages(ordinary, { tidy: false }), ordinary);
  assert.deepEqual(cleanCourtPages([[1, "  a   b  \n\n\n\nc "]]), [
    [1, "a b\n\nc"],
  ]);
  // One page carrying the MA header marks the whole file as a Direktori export.
  assert.deepEqual(
    cleanCourtPages(
      [
        [1, "putusan.mahkamahagung.go.id\nIsi halaman satu."],
        [2, "ep\nIsi halaman dua."],
      ],
      { tidy: false },
    ),
    [
      [1, "Isi halaman satu."],
      [2, "Isi halaman dua."],
    ],
  );
});

test("PDF.js items join by position and rotated watermark items are dropped", () => {
  const at = (str: string, x: number, width: number, hasEOL = false) => ({
    str,
    hasEOL,
    transform: [10, 0, 0, 10, x, 700],
    width,
  });
  const rotated = (str: string) => ({
    str,
    hasEOL: true,
    transform: [35, 35, -35, 35, 10, 400],
    width: 80,
  });
  assert.equal(
    joinTextItems([
      rotated("ahkamah Agung Republ"),
      rotated("ik Indones"),
      at("p", 100, 5.2),
      at("ada", 105.2, 16),
      at(" ", 121.2, 3),
      at("K", 124.5, 6.3),
      at("antor", 130.8, 21),
      at("2022", 200, 20, true),
      { type: "beginMarkedContent" },
      at("Saksi", 100, 25),
    ]),
    "pada Kantor 2022\nSaksi",
  );
});

test("a real Direktori Putusan MA excerpt extracts clean text and quotes verify", async () => {
  // Pages 202-203 of the public decision 796/Pid.B/2022/PN Jkt.Sel (Direktori Putusan
  // MA), resource-pruned; court decisions are not copyright-protected (UU 28/2014 Ps. 42).
  const pdf = await readFile(
    new URL("./fixtures/putusan-ma-excerpt.pdf", import.meta.url),
  );
  const { pages, mime } = await extractPages("putusan.pdf", pdf);
  assert.equal(mime, "application/pdf");
  assert.equal(pages.length, 2);
  const text = pages.map((p) => p[1]).join("\n");
  assert.doesNotMatch(
    text,
    /Disclaimer|mahkamahagung\.go\.id|Hal\. \d+ dari|Direktori Putusan/,
  );
  // No watermark letters remain as lines, and words split by font runs are rejoined.
  assert.ok(
    !text.split("\n").some((line) => isWatermarkFragment(line)),
    "watermark fragment line left in text",
  );
  assert.match(
    text,
    /17\. Saksi SUSI, di bawah sumpah menerangkan pada pokoknya sebagai berikut:\n- Bahwa Saksi bekerja untuk Terdakwa dan Saksi Putri Candrawathi sejak\ntahun 2020;/,
  );
  const chunks = chunkPages(pages).map(([page, text], i) => ({
    id: `c${i}`,
    page,
    text,
  }));
  const quote =
    "Bahwa Saksi bekerja untuk Terdakwa dan Saksi Putri Candrawathi sejak tahun 2020;";
  const chunk = chunks.find((c) => exactSourceQuote(c.text, quote));
  assert.ok(chunk, "quote spanning a line break is found in cleaned chunks");
  const conclusion = verifiedConclusion(
    {
      status: "supported",
      title: "Lama bekerja",
      explanation: "Ringkasan putusan menyebut tahun 2020.",
      uncertainty: "",
      verification: "Periksa halaman 1.",
      question: "Sejak kapan Saksi bekerja?",
      citations: [{ chunk_id: chunk.id, quote, relation: "supports" }],
    },
    chunks,
  );
  assert.ok(chunk.text.includes(conclusion.citations[0].quote));
});

test("quotes tolerate straight or curly quotation marks but no other changes", () => {
  const text =
    "Saksi Kuat Ma’ruf membangunkan Saksi dan berkata “jangan naik”.";
  // Mapped back to the court's exact characters.
  assert.equal(
    exactSourceQuote(text, "Kuat Ma'ruf membangunkan"),
    "Kuat Ma’ruf membangunkan",
  );
  assert.equal(
    exactSourceQuote(text, 'berkata "jangan naik"'),
    "berkata “jangan naik”",
  );
  // Letters, case and other punctuation still have to match.
  assert.equal(exactSourceQuote(text, "Kuat Ma'Ruf membangunkan"), undefined);
  assert.equal(exactSourceQuote(text, "Kuat Maruf membangunkan"), undefined);
});
