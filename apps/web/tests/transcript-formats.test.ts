import test from "node:test";
import assert from "node:assert/strict";
import { parseSpeakerTurns } from "../src/lib/server/transcript-formats";

test("reads an official risalah layout: front matter, numbered timed turns, page noise", () => {
  const turns = parseSpeakerTurns(`RISALAH SIDANG
Pihak yang Hadir:
A. Kuasa Hukum Pemohon:
1. Buce Abraham Beruat
SIDANG DIBUKA PUKUL 13.27 WIB
1. KETUA: ARSUL SANI [00:00]
Bisa kita mulai, ya?
2. KUASA HUKUM PEMOHON: BUCE ABRAHAM BERUAT [00:07]
Siap, Majelis.
3. KETUA: ARSUL SANI [00:08]
Sidang Perkara Nomor 115/PUU-XXII/2024 dibuka
KETUK PALU 3X
12
dan dinyatakan terbuka untuk umum.
4. KUASA HUKUM PEMOHON: [01:02:03]
Terima kasih.`);
  assert.deepEqual(turns, [
    { speaker: "Ketua (Arsul Sani)", text: "Bisa kita mulai, ya?", start: 0 },
    {
      speaker: "Kuasa Hukum Pemohon (Buce Abraham Beruat)",
      text: "Siap, Majelis.",
      start: 7,
    },
    {
      speaker: "Ketua (Arsul Sani)",
      text: "Sidang Perkara Nomor 115/PUU-XXII/2024 dibuka dan dinyatakan terbuka untuk umum.",
      start: 8,
    },
    { speaker: "Kuasa Hukum Pemohon", text: "Terima kasih.", start: 3723 },
  ]);
});

test("reads court-style labels with wrapped lines and skips one-off notes", () => {
  const turns = parseSpeakerTurns(`Catatan: rekaman dari ruang sidang 2
HAKIM KETUA: Saudara saksi, apakah keterangan di BAP
halaman tiga itu benar?
SAKSI: Tidak, Yang Mulia.
HAKIM KETUA: Mengapa berbeda?
SAKSI: Saat itu saya kacau.`);
  assert.equal(turns.length, 4);
  assert.deepEqual(turns[0], {
    speaker: "Hakim Ketua",
    text: "Saudara saksi, apakah keterangan di BAP halaman tiga itu benar?",
    start: 0,
  });
  assert.equal(turns[3].speaker, "Saksi");
});

test("reads timestamped notes and plain one-line transcripts", () => {
  const timed = parseSpeakerTurns(
    "[00:01] Hakim: Silakan.\n[00:05] Saksi: Baik.\n[01:10] Penuntut Umum: Pertanyaan.",
  );
  assert.deepEqual(
    timed.map((t) => [t.speaker, t.start]),
    [
      ["Hakim", 1],
      ["Saksi", 5],
      ["Penuntut Umum", 70],
    ],
  );
  assert.deepEqual(parseSpeakerTurns("Witness: I arrived at nine."), [
    { speaker: "Witness", text: "I arrived at nine.", start: 0 },
  ]);
  assert.deepEqual(parseSpeakerTurns("An unfamiliar transcript."), []);
});
