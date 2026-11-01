import type { Lang } from "./i18n/core";

export type SourceKind = "transcript" | "statement";
export type Example = {
  id: "inconsistency" | "supported" | "context";
  label: string;
  shortLabel: string;
  quote: string;
  earlier: string;
  time: string;
  page: string;
  finding: string;
  explanation: string;
  verify: string;
  question: string;
  /** Line 2 (index 1) is the highlighted statement in each excerpt. */
  transcript: readonly string[];
  statement: readonly string[];
};
const en: readonly Example[] = [
  {
    id: "inconsistency",
    label: "Potential inconsistency",
    shortLabel: "A different account",
    quote: "I arrived at 9:30 PM.",
    earlier: "I arrived shortly after 8:00 PM.",
    time: "00:14:32",
    page: "4",
    finding: "The accounts describe different arrival times.",
    explanation:
      "The hearing testimony and the earlier statement differ by approximately 90 minutes. That difference may be relevant, but these excerpts alone do not establish why it occurred.",
    verify: "Check whether both statements refer to the same event.",
    question:
      "When you say you arrived at 9:30 PM, which location and date are you referring to?",
    transcript: [
      "Counsel: What time did you arrive at the warehouse?",
      "Witness: I arrived at 9:30 PM.",
      "Counsel: We will return to the sequence of events in a moment.",
    ],
    statement: [
      "Investigator: Describe your arrival that evening.",
      "Witness: I arrived shortly after 8:00 PM.",
      "Investigator: Was anyone else present?",
      "Witness: I remember seeing a security guard near the entrance.",
    ],
  },
  {
    id: "supported",
    label: "Supported",
    shortLabel: "A matching detail",
    quote: "A security guard was at the entrance.",
    earlier: "I remember seeing a security guard near the entrance.",
    time: "00:18:06",
    page: "4",
    finding: "Both accounts place a guard near the entrance.",
    explanation:
      "The statements are consistent on this specific detail. Agreement between two accounts does not independently establish that the event occurred or verify the rest of the testimony.",
    verify:
      "Confirm the guard’s identity and whether independent records are available.",
    question: "Can you describe the guard and explain how you recognized them?",
    transcript: [
      "Counsel: Who did you see when you arrived?",
      "Witness: A security guard was at the entrance.",
      "Counsel: Do you remember their name?",
      "Witness: No, I do not.",
    ],
    statement: [
      "Investigator: Was anyone else present?",
      "Witness: I remember seeing a security guard near the entrance.",
      "Investigator: Did you speak with that person?",
      "Witness: I cannot remember.",
    ],
  },
  {
    id: "context",
    label: "Context needed",
    shortLabel: "An unresolved question",
    quote: "He handed me the envelope outside.",
    earlier: "We discussed the documents inside the office.",
    time: "00:22:10",
    page: "6",
    finding: "These statements may describe different moments.",
    explanation:
      "An exchange outside and a discussion inside could both have occurred. The excerpts do not identify the other person or establish the sequence, so an inconsistency cannot be inferred.",
    verify: "Clarify who was present and the order of the two events.",
    question:
      "Who handed you the envelope, and was that before or after the discussion in the office?",
    transcript: [
      "Counsel: What happened with the envelope?",
      "Witness: He handed me the envelope outside.",
      "Counsel: Please explain who you mean by ‘he’.",
    ],
    statement: [
      "Investigator: Where did the discussion take place?",
      "Witness: We discussed the documents inside the office.",
      "Investigator: What happened next?",
      "Witness: I do not recall the exact sequence.",
    ],
  },
];
const id: readonly Example[] = [
  {
    id: "inconsistency",
    label: "Berbeda dari sumber",
    shortLabel: "Keterangan yang berbeda",
    quote: "Saya tiba pukul 21.30.",
    earlier: "Saya tiba tak lama setelah pukul 20.00.",
    time: "00:14:32",
    page: "4",
    finding: "Kedua keterangan menyebut waktu kedatangan yang berbeda.",
    explanation:
      "Keterangan di persidangan dan keterangan sebelumnya berselisih sekitar 90 menit. Perbedaan itu mungkin relevan, tetapi kutipan ini saja belum menjelaskan mengapa perbedaan itu terjadi.",
    verify: "Periksa apakah kedua keterangan merujuk pada peristiwa yang sama.",
    question:
      "Saat Saudara mengatakan tiba pukul 21.30, lokasi dan tanggal mana yang Saudara maksud?",
    transcript: [
      "Penasihat Hukum: Pukul berapa Saudara tiba di gudang?",
      "Saksi: Saya tiba pukul 21.30.",
      "Penasihat Hukum: Kita akan kembali ke urutan peristiwanya sebentar lagi.",
    ],
    statement: [
      "Penyidik: Jelaskan kedatangan Saudara pada malam itu.",
      "Saksi: Saya tiba tak lama setelah pukul 20.00.",
      "Penyidik: Apakah ada orang lain di sana?",
      "Saksi: Saya ingat melihat seorang petugas keamanan di dekat pintu masuk.",
    ],
  },
  {
    id: "supported",
    label: "Didukung sumber",
    shortLabel: "Detail yang cocok",
    quote: "Ada petugas keamanan di pintu masuk.",
    earlier: "Saya ingat melihat seorang petugas keamanan di dekat pintu masuk.",
    time: "00:18:06",
    page: "4",
    finding:
      "Kedua keterangan menyebut ada petugas keamanan di dekat pintu masuk.",
    explanation:
      "Kedua keterangan konsisten pada detail ini. Kesesuaian dua keterangan tidak dengan sendirinya membuktikan peristiwa itu terjadi atau membenarkan keterangan selebihnya.",
    verify:
      "Pastikan identitas petugas keamanan tersebut dan apakah ada catatan independen.",
    question:
      "Dapatkah Saudara menggambarkan petugas keamanan itu dan menjelaskan bagaimana Saudara mengenalinya?",
    transcript: [
      "Penasihat Hukum: Siapa yang Saudara lihat saat tiba?",
      "Saksi: Ada petugas keamanan di pintu masuk.",
      "Penasihat Hukum: Apakah Saudara ingat namanya?",
      "Saksi: Tidak, saya tidak ingat.",
    ],
    statement: [
      "Penyidik: Apakah ada orang lain di sana?",
      "Saksi: Saya ingat melihat seorang petugas keamanan di dekat pintu masuk.",
      "Penyidik: Apakah Saudara berbicara dengan orang itu?",
      "Saksi: Saya tidak ingat.",
    ],
  },
  {
    id: "context",
    label: "Perlu konteks",
    shortLabel: "Pertanyaan yang belum terjawab",
    quote: "Dia menyerahkan amplop itu kepada saya di luar.",
    earlier: "Kami membahas dokumen-dokumen itu di dalam kantor.",
    time: "00:22:10",
    page: "6",
    finding: "Kedua keterangan ini mungkin menggambarkan momen yang berbeda.",
    explanation:
      "Penyerahan di luar dan pembahasan di dalam bisa saja sama-sama terjadi. Kutipan ini tidak menyebut siapa orang lain itu atau urutan kejadiannya, sehingga perbedaan keterangan tidak dapat disimpulkan.",
    verify: "Perjelas siapa yang hadir dan urutan kedua peristiwa itu.",
    question:
      "Siapa yang menyerahkan amplop itu kepada Saudara, dan apakah itu terjadi sebelum atau sesudah pembahasan di kantor?",
    transcript: [
      "Penasihat Hukum: Apa yang terjadi dengan amplop itu?",
      "Saksi: Dia menyerahkan amplop itu kepada saya di luar.",
      "Penasihat Hukum: Mohon jelaskan siapa yang Saudara maksud dengan ‘dia’.",
    ],
    statement: [
      "Penyidik: Di mana pembahasan itu berlangsung?",
      "Saksi: Kami membahas dokumen-dokumen itu di dalam kantor.",
      "Penyidik: Apa yang terjadi selanjutnya?",
      "Saksi: Saya tidak ingat urutan pastinya.",
    ],
  },
];
/** Synthetic landing-page examples in each UI language (same ids and order). */
export const examples: Record<Lang, readonly Example[]> = { id, en };
