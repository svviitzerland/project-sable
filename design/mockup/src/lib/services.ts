import { altScript } from "./data";
import { prefs } from "./prefs.svelte";
import {
  db,
  finding,
  hearingsOf,
  passage,
  passagesOfCase,
  statement,
  type AssistantContext,
} from "./store.svelte";
import type { Citation, L10n } from "./types";

/**
 * Mock services. Each one waits a realistic amount of time and returns canned or searched
 * results, standing in for Bedrock, Pasal.id, Transcribe and document ingestion.
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type Topic = "summary" | "differences" | "questions" | "times" | "keys" | "truck" | "legal" | "finding" | "search";

export interface Suggestion {
  topic: Topic;
  text: L10n;
}

export interface Reply {
  text: L10n;
  citations: Citation[];
  legal: string[];
  mode: "ai" | "sources-only";
}

const P = (id: string): Citation => ({ kind: "passage", id });
const S = (id: string): Citation => ({ kind: "statement", id });

const canned: Partial<Record<Topic, Omit<Reply, "mode">>> = {
  summary: {
    text: {
      id: "**Ringkasan.** Penuntut Umum mendakwa Terdakwa Budi Santoso menggelapkan 120 karton barang elektronik dari Gudang B pada 14 Maret 2026 sekitar pukul 22.00 [1][2].\n\n**Yang didukung sumber:** truk boks putih keluar Gerbang Timur pukul 23:48 [3], dan kartu akses Terdakwa tidak tercatat malam itu [4].\n\n**Yang masih belum pasti:**\n- Jam kejadian: dakwaan menyebut sekitar 22.00, sedangkan log mencatat truk keluar 23:48 [3].\n- Siapa pengemudi truk: kamera tidak menampilkan wajahnya [3], dan Saksi Rina tidak melihatnya sendiri [5].\n- Siapa yang memegang kunci: dua orang menurut BAP Saksi Dimas [6].",
      en: "**Summary.** The prosecution charges the defendant, Budi Santoso, with embezzling 120 cartons of electronics from Warehouse B on 14 March 2026 at around 22:00 [1][2].\n\n**Supported by sources:** a white box truck left through the East Gate at 23:48 [3], and the defendant's access card was not recorded that night [4].\n\n**Still uncertain:**\n- The time: the indictment says around 22:00, while the log has the truck leaving at 23:48 [3].\n- Who drove the truck: the camera does not show a face [3], and Rina did not see the driver herself [5].\n- Who held keys: two people, according to Dimas's BAP [6].",
    },
    citations: [P("d4p2"), P("d4p3"), P("d3p3"), P("d3p5"), S("s225"), P("d2p2")],
    legal: [],
  },
  differences: {
    text: {
      id: "Ada tiga titik utama di mana keterangan berbeda dari sumber:\n\n- **Jam kedatangan Saksi Rina.** Di sidang ia menyebut tiba jam setengah sepuluh malam [1], sedangkan BAP-nya mencatat sedikit setelah pukul 20.00 [2] dan log akses mencatat kartunya masuk pukul 20:07:41 [3].\n- **Frekuensi patroli.** Ia menyebut patroli setiap satu jam [4], tetapi catatan patroli menunjukkan jeda sekitar dua jam [5].\n- **Jam pulang Saksi Dimas.** BAP-nya mencatat 18.30 [6]; dengarkan keterangannya di sidang hari ini.\n\nPerbedaan ini perlu diperiksa, bukan disimpulkan: setiap kutipan bisa merujuk pada momen yang berbeda.",
      en: "There are three main points where testimony differs from the sources:\n\n- **Rina's arrival time.** In court she said she arrived at half past nine [1], while her BAP records shortly after 20:00 [2] and the access log shows her card entering at 20:07:41 [3].\n- **Patrol frequency.** She said she patrolled every hour [4], but the patrol log shows gaps of about two hours [5].\n- **Dimas's departure time.** His BAP records 18:30 [6]; listen for his account in court today.\n\nThese differences are worth examining, not concluding from: each quote may refer to a different moment.",
    },
    citations: [S("s208"), P("d1p4"), P("d3p2"), S("s212"), P("d3p4"), P("d2p3")],
    legal: [],
  },
  questions: {
    text: {
      id: "Pertanyaan yang bisa disiapkan, masing-masing berdasar sumber:\n\n1. Kepada Saksi Rina: \"Jam setengah sepuluh itu saat Saudara tap kartu di gerbang, atau saat mulai berjaga?\" [1][2]\n2. Kepada Saksi Rina: \"Malam itu, apakah Saudara melihat sendiri siapa yang ada di dalam truk?\" [3]\n3. Kepada Penuntut Umum, melalui majelis: dasar jam 22.00 dalam dakwaan, mengingat truk tercatat keluar 23:48 [4][5].\n4. Kepada Saksi Yusuf (meringankan): jam berapa ia meninggalkan pos dan siapa yang ia lihat [6].",
      en: "Questions you could prepare, each grounded in a source:\n\n1. To Rina: \"Was half past nine when you tapped your card at the gate, or when you started your post?\" [1][2]\n2. To Rina: \"That night, did you yourself see who was in the truck?\" [3]\n3. To the prosecution, through the bench: the basis for 22:00 in the indictment, given the truck left at 23:48 [4][5].\n4. To Yusuf (defense witness): when he left his post and whom he saw [6].",
    },
    citations: [S("s208"), P("d3p2"), S("s218"), P("d4p2"), P("d3p3"), P("d1p4")],
    legal: [],
  },
  times: {
    text: {
      id: "Ada beberapa catatan waktu yang relevan untuk malam 14 Maret:\n\n- **20:07** kartu Saksi Rina masuk di Gerbang Timur [1]; BAP-nya menyebut sedikit setelah 20.00 [2], tetapi di sidang ia menyebut setengah sepuluh [3].\n- **22.00** jam kejadian menurut dakwaan [4].\n- **23:48** truk boks putih keluar Gerbang Timur [5].\n\nSaksi Dimas mencatat pulang 18.30 di BAP [6] dan kartunya keluar 18:41 [7].",
      en: "Several time records matter for the night of 14 March:\n\n- **20:07** Rina's card entered at the East Gate [1]; her BAP says shortly after 20:00 [2], but in court she said half past nine [3].\n- **22:00** the time of the offence according to the indictment [4].\n- **23:48** a white box truck left through the East Gate [5].\n\nDimas's BAP records him leaving at 18:30 [6] and his card exiting at 18:41 [7].",
    },
    citations: [P("d3p2"), P("d1p4"), S("s208"), P("d4p2"), P("d3p3"), P("d2p3"), P("d3p6")],
    legal: [],
  },
  keys: {
    text: {
      id: "Menurut BAP Saksi Dimas, kunci Gudang B hanya dipegang dua orang: Dimas selaku supervisor dan Terdakwa [1]. Saksi Rina hanya menyebut Terdakwa [2]. Log akses tidak mencatat kartu Terdakwa pada 14 Maret [3]. Belum ada sumber tentang kunci cadangan.",
      en: "According to Dimas's BAP, only two people held keys to Warehouse B: Dimas as supervisor and the defendant [1]. Rina named only the defendant [2]. The access log does not record the defendant's card on 14 March [3]. No source mentions a spare key yet.",
    },
    citations: [P("d2p2"), S("s221"), P("d3p5")],
    legal: [],
  },
  truck: {
    text: {
      id: "Truk boks putih B 9123 XY keluar Gerbang Timur pukul 23:48:12; kamera 4 tidak menampilkan wajah pengemudi [1]. Saksi Rina melihat truk keluar [2] tetapi tidak melihat pengemudinya [3]. Pernyataannya bahwa biasanya orangnya Pak Budi [4] adalah kebiasaan, bukan pengamatan malam itu [5].",
      en: "White box truck B 9123 XY left the East Gate at 23:48:12; camera 4 does not show the driver's face [1]. Rina saw the truck leave [2] but not its driver [3]. Her remark that it is usually Pak Budi's people [4] describes habit, not what she saw that night [5].",
    },
    citations: [P("d3p3"), S("s216"), S("s218"), S("s219"), S("s225")],
    legal: [],
  },
  legal: {
    text: {
      id: "Menurut rujukan yang ditemukan, keterangan saksi sebagai alat bukti adalah apa yang dinyatakan saksi di sidang, dan satu saksi saja tidak cukup untuk membuktikan kesalahan (lihat rujukan hukum di bawah). Di perkara ini, keterangan Saksi Rina di sidang [1] berbeda dengan BAP-nya [2], jadi penting mencatat apa yang ia nyatakan di sidang dan alasannya.",
      en: "According to the references found, witness testimony as evidence is what the witness states in court, and one witness alone is not enough to prove guilt (see the legal discovery below). Here, Rina's testimony in court [1] differs from her BAP [2], so what she stated in court, and why, matters.",
    },
    citations: [S("s208"), P("d1p4")],
    legal: ["lg1", "lg2"],
  },
};

const routes: { topic: Topic; words: string[] }[] = [
  { topic: "legal", words: ["dasar hukum", "pasal", "kuhap", "kuhp", "law", "legal", "alat bukti", "statute"] },
  { topic: "summary", words: ["ringkas", "summar", "belum pasti", "uncertain", "overview"] },
  { topic: "differences", words: ["beda", "berbeda", "differ", "inconsisten", "contradict", "bertentangan"] },
  { topic: "questions", words: ["pertanyaan", "question", "siapkan", "prepare", "tanyakan ulang"] },
  { topic: "keys", words: ["kunci", "key"] },
  { topic: "truck", words: ["truk", "truck", "pengemudi", "driver", "sopir"] },
  { topic: "times", words: ["jam", "waktu", "time", "pulang", "tiba", "arriv", "left", "pukul"] },
];

export function suggestionsFor(ctx: AssistantContext): Suggestion[] {
  if (ctx.kind === "finding") {
    return [
      { topic: "finding", text: { id: "Apa lagi yang mendukung atau membantah temuan ini?", en: "What else supports or contradicts this finding?" } },
      { topic: "questions", text: { id: "Pertanyaan apa yang perlu saya siapkan dari temuan ini?", en: "What questions should I prepare from this?" } },
      { topic: "legal", text: { id: "Apa dasar hukum keterangan saksi?", en: "What is the legal basis for witness testimony?" } },
    ];
  }
  if (ctx.kind === "hearing") {
    if (ctx.id === "h3") {
      return [
        { topic: "times", text: { id: "Apa yang tercatat soal jam pulang Saksi Dimas?", en: "What is on record about when Dimas left?" } },
        { topic: "keys", text: { id: "Siapa saja yang memegang kunci Gudang B?", en: "Who held keys to Warehouse B?" } },
        { topic: "differences", text: { id: "Di mana keterangan hari ini berbeda dari BAP?", en: "Where does today's testimony differ from the BAP?" } },
      ];
    }
    return [
      { topic: "differences", text: { id: "Di mana keterangan saksi berbeda dari BAP-nya?", en: "Where does the testimony differ from the BAP?" } },
      { topic: "truck", text: { id: "Apa yang saksi katakan tentang truk itu?", en: "What did the witness say about the truck?" } },
      { topic: "questions", text: { id: "Apa yang perlu ditanyakan ulang kepada saksi?", en: "What should be asked again?" } },
    ];
  }
  if (ctx.kind === "documents" || ctx.kind === "passage" || ctx.kind === "connection") {
    return [
      { topic: "search", text: { id: "Kutipan mana yang menyebut Gerbang Timur?", en: "Which passages mention the East Gate?" } },
      { topic: "times", text: { id: "Susun linimasa malam 14 Maret dari dokumen.", en: "Build a timeline of 14 March from the documents." } },
      { topic: "keys", text: { id: "Apa kata dokumen tentang kunci Gudang B?", en: "What do the documents say about the keys?" } },
    ];
  }
  return [
    { topic: "summary", text: { id: "Ringkas perkara ini dan hal yang masih belum pasti.", en: "Summarize the case and what is still uncertain." } },
    { topic: "differences", text: { id: "Di bagian mana keterangan para saksi berbeda?", en: "Where do the witness accounts differ?" } },
    { topic: "questions", text: { id: "Pertanyaan apa yang perlu saya siapkan untuk sidang berikutnya?", en: "What questions should I prepare for the next hearing?" } },
  ];
}

const stop = new Set(["yang", "dan", "di", "ke", "dari", "apa", "saja", "itu", "ini", "the", "what", "which", "about", "with", "for", "and", "does", "did", "mana", "untuk", "dengan", "tentang", "menyebut", "mention", "passages", "kutipan"]);

/** Keyword retrieval over this case's passages and statements (the product uses case-filtered keyword search). */
export function searchCase(caseId: string, query: string, limit = 4): Citation[] {
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9à-ÿ]+/i)
    .filter((w) => w.length > 2 && !stop.has(w));
  if (!words.length) return [];
  const hearingIds = new Set(hearingsOf(caseId).map((h) => h.id));
  const scored: { c: Citation; score: number }[] = [];
  for (const p of passagesOfCase(caseId)) {
    const text = p.text.toLowerCase();
    const score = words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0);
    if (score) scored.push({ c: { kind: "passage", id: p.id }, score: score + 0.2 });
  }
  for (const s of db.statements) {
    if (!hearingIds.has(s.hearingId)) continue;
    const text = s.text.toLowerCase();
    const score = words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0);
    if (score) scored.push({ c: { kind: "statement", id: s.id }, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.c);
}

export function searchLegal(query: string): string[] {
  const q = query.toLowerCase();
  return db.legal
    .filter((x) => x.keywords.some((k) => q.includes(k)) || (!!x.article && q.includes(x.article.toLowerCase())))
    .map((x) => x.id);
}

function topicOf(question: string, ctx: AssistantContext, forced?: Topic): Topic {
  if (forced) return forced;
  const q = question.toLowerCase();
  if (ctx.kind === "finding" && /(temuan ini|this finding|mendukung atau|supports or)/.test(q)) return "finding";
  return routes.find((r) => r.words.some((w) => q.includes(w)))?.topic ?? "search";
}

function findingReply(id: string): Omit<Reply, "mode"> {
  const f = finding(id);
  if (!f) return { text: { id: "", en: "" }, citations: [], legal: [] };
  const citations: Citation[] = [{ kind: "statement", id: f.statementId }, ...f.sources.map((s) => P(s.passageId))];
  const refs = f.sources.map((_, i) => `[${i + 2}]`).join("");
  let extraId = "";
  let extraEn = "";
  if (f.id === "f1") {
    citations.push(S("s227"));
    const n = citations.length;
    extraId = ` Ada konteks tambahan: pada 00:51:20 saksi menyebut sudah tap kartu sebelum mampir ke warung [${n}], yang bisa menjelaskan selisih jamnya.`;
    extraEn = ` There is extra context: at 00:51:20 she says she tapped her card before stopping at a stall [${n}], which may explain the gap.`;
  }
  return {
    text: {
      id: `Temuan ini membandingkan keterangan di sidang [1] dengan ${f.sources.length} kutipan sumber ${refs}.${extraId}\n\nYang perlu Anda putuskan: apakah keduanya merujuk pada peristiwa yang sama. Jude tidak menilai kejujuran saksi.`,
      en: `This finding compares the testimony [1] with ${f.sources.length} source passage${f.sources.length === 1 ? "" : "s"} ${refs}.${extraEn}\n\nWhat you need to decide: whether both refer to the same event. Jude does not judge the witness's honesty.`,
    },
    citations,
    // A plain copy: the finding lives in reactive state, which structuredClone cannot copy.
    legal: [...(f.legal ?? [])],
  };
}

export async function ask(
  caseId: string,
  question: string,
  ctx: AssistantContext,
  withLegal: boolean,
  forced?: Topic,
): Promise<Reply> {
  await sleep(1300 + Math.random() * 700);
  const topic = topicOf(question, ctx, forced);
  const legalHits = withLegal && prefs.pasal ? searchLegal(question) : [];
  if (!prefs.ai || topic === "search" || caseId !== "c1") {
    const citations = searchCase(caseId, question);
    return {
      text: prefs.ai
        ? { id: "Berikut kutipan paling relevan dari perkara ini (pencarian simulasi):", en: "Here are the most relevant excerpts from this case (simulated search):" }
        : { id: "", en: "" },
      citations,
      legal: legalHits,
      mode: prefs.ai ? "ai" : "sources-only",
    };
  }
  const base = topic === "finding" && ctx.kind === "finding" ? findingReply(ctx.id) : canned[topic]!;
  const legal = withLegal && prefs.pasal ? [...new Set([...base.legal, ...legalHits])] : [];
  return { ...structuredClone(base), legal, mode: "ai" };
}

/** A canned answer, for the synthetic sample conversations. */
export function sampleReply(topic: Topic): Omit<Reply, "mode"> {
  return structuredClone(canned[topic] ?? canned.summary!);
}

/** Upload → transcription → analysis, ending in a new recorded hearing. */
export async function transcribeUpload(
  caseId: string,
  title: string,
  onStage: (stage: "uploading" | "transcribing" | "examining" | "done", progress: number) => void,
): Promise<string> {
  for (let p = 0; p <= 100; p += 10) {
    onStage("uploading", p);
    await sleep(120);
  }
  onStage("transcribing", 0);
  await sleep(1800);
  onStage("examining", 0);
  await sleep(1600);
  const number = Math.max(0, ...hearingsOf(caseId).map((h) => h.number)) + 1;
  const id = `hu${Date.now()}`;
  db.hearings.push({
    id,
    caseId,
    number,
    title: title ? { id: title, en: title } : { id: "Rekaman unggahan", en: "Uploaded recording" },
    date: "2026-11-04",
    mode: "recorded",
    duration: 1260,
  });
  altScript.forEach((line, i) => {
    const sid = `${id}-s${i}`;
    db.statements.push({ id: sid, hearingId: id, speakerId: line.speakerId, t: 20 + i * 135, text: line.text, phase: "complete" });
    if (line.finding) {
      db.findings.push({ ...structuredClone(line.finding), id: `${id}-f${i}`, hearingId: id, statementId: sid, reviewed: false, note: "" });
    }
  });
  onStage("done", 100);
  return id;
}

export interface PreviewTurn {
  speaker: string;
  time: string;
  text: string;
}

/** A parsed court record (risalah) shown for review before import. */
export async function previewTranscript(): Promise<{ title: string; date: string; turns: PreviewTurn[] }> {
  await sleep(1100);
  return {
    title: "Pembacaan eksepsi Penasihat Hukum",
    date: "2026-10-14",
    turns: [
      { speaker: "Hakim Ketua", time: "00:00:30", text: "Sidang dibuka kembali dengan acara pembacaan eksepsi dari Penasihat Hukum Terdakwa." },
      { speaker: "Penasihat Hukum", time: "00:01:10", text: "Terima kasih, Yang Mulia. Kami akan membacakan eksepsi atas surat dakwaan Penuntut Umum." },
      { speaker: "Penasihat Hukum", time: "00:02:05", text: "Bahwa surat dakwaan tidak menguraikan secara cermat waktu terjadinya tindak pidana, karena hanya menyebut sekitar pukul 22.00 WIB atau setidak-tidaknya pada waktu lain dalam bulan Maret 2026." },
      { speaker: "Hakim Ketua", time: "00:09:40", text: "Saudara Penuntut Umum, apakah akan menanggapi eksepsi ini?" },
      { speaker: "Penuntut Umum", time: "00:09:52", text: "Kami akan menanggapi secara tertulis pada sidang berikutnya, Yang Mulia." },
      { speaker: "Hakim Ketua", time: "00:10:20", text: "Baik. Sidang ditunda satu minggu untuk tanggapan Penuntut Umum." },
    ],
  };
}

const roleBySpeaker: Record<string, string> = {
  "Hakim Ketua": "hk",
  "Hakim Anggota": "ha",
  "Penuntut Umum": "pu",
  "Penasihat Hukum": "ph",
};

export function importTranscript(caseId: string, title: string, date: string, turns: PreviewTurn[]) {
  const number = Math.max(0, ...hearingsOf(caseId).map((h) => h.number)) + 1;
  const id = `hi${Date.now()}`;
  db.hearings.push({ id, caseId, number, title: { id: title, en: title }, date, mode: "imported", duration: 640 });
  turns.forEach((turn, i) => {
    const [h, m, s] = turn.time.split(":").map(Number);
    db.statements.push({
      id: `${id}-s${i}`,
      hearingId: id,
      speakerId: roleBySpeaker[turn.speaker] ?? "v3",
      t: h * 3600 + m * 60 + s,
      text: turn.text,
      phase: "saved",
    });
  });
  return id;
}

/** Document ingestion: a short wait, then passages appear. */
export async function uploadDocument(caseId: string, name: string) {
  await sleep(1500);
  const id = `du${Date.now()}`;
  db.documents.push({
    id,
    caseId,
    title: name || "Keterangan Tertulis Saksi Yusuf",
    kind: { id: "Dokumen unggahan", en: "Uploaded document" },
    pages: 2,
    file: "PDF",
    size: "180 KB",
    added: "2026-11-04",
  });
  db.passages.push(
    { id: `${id}p1`, docId: id, page: 1, text: "Saya meninggalkan pos sekitar pukul 20.10 WIB setelah Sdri. Rina Hartati tiba dan melakukan tap kartu di Gerbang Timur." },
    { id: `${id}p2`, docId: id, page: 2, text: "Pada siang hari tanggal 14 Maret 2026, kendaraan Sdr. Budi Santoso sudah tidak terlihat di area parkir sekitar pukul 14.00 WIB." },
  );
  return id;
}
