import type { Lang } from "./i18n/core";

export type SourceKind = "transcript" | "statement";
export type Example = {
  id: "supported" | "context" | "insufficient";
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

/**
 * Verbatim excerpts from the public demo case (`static/demo/sambo-796-public.jude`):
 * hearing lines are the automatic Amazon Transcribe transcript of the 8 November 2022
 * KOMPASTV broadcast, statement lines are the putusan's summary of witness testimony
 * (excerpt PDF page numbers). Quotes stay in Indonesian in both UI languages. Finding
 * text is condensed from the stored findings for each segment.
 */
type Source = Pick<
  Example,
  "id" | "quote" | "earlier" | "page" | "transcript" | "statement"
> & { part: 1 | 2; at: string };
const sources: readonly Source[] = [
  {
    id: "supported",
    part: 1,
    at: "00:15:38",
    page: "4",
    quote: "Kemudian om Ricky sama om Joshua lewat di depan kamar saya.",
    earlier:
      "Bahwa kemudian Saksi Ricky Rizal Wibowo dan Korban Nofriansyah Yosua Hutabarat (almarhum) lewat di depan kamar Saksi, namun tidak tahu kemana arahnya",
    transcript: [
      "Hakim Ketua: Tidak tahu. Kemudian.",
      "Saksi Susi: Kemudian om Ricky sama om Joshua lewat di depan kamar saya.",
      "Hakim Ketua: Kemudian,",
      "Saksi Susi: saya enggak tahu kemana arahnya.",
    ],
    statement: [
      "… kemudian Saksi Ricky Rizal Wibowo keluar dan Saksi tidak tahu keluar kemana;",
      "Bahwa kemudian Saksi Ricky Rizal Wibowo dan Korban Nofriansyah Yosua Hutabarat (almarhum) lewat di depan kamar Saksi, namun tidak tahu kemana arahnya",
      "Bahwa Saksi tidak tahu tapi Saksi tidur di atas, Saksi Kuat Ma’ruf membangunkan Saksi untuk pindah ke atas menemani Saksi Putri Candrawathi …",
    ],
  },
  {
    id: "context",
    part: 2,
    at: "01:00:58",
    page: "63",
    quote:
      "Kalau Om Ricky masuk ke dalam kamar, kalau Om Richard setahu saya di tangga masih.",
    earlier:
      "Saksi Richard Eliezer Pudihang Lumiu yang masuk ke dalam. Setelah itu Saksi turun lewat tangga, jalan ke lantai 2, tapi Saksi nggak langsung turun, Saksi ke dapur.",
    transcript: [
      "Penasihat Hukum: Tapi ke lantai dua, langsung ke lantai dua. Melihat ibu atau tidak?",
      "Saksi Susi: Kalau Om Ricky masuk ke dalam kamar, kalau Om Richard setahu saya di tangga masih.",
      "Penasihat Hukum: Oh, cuman sampai tangga.",
      "spk_3: Saya tidak melihat kondisi Ibu. Tidak.",
    ],
    statement: [
      "… Saksi Putri Candrawathi bilang taruh kamar saja, jadi Saksi sampai depan kamar,",
      "Saksi Richard Eliezer Pudihang Lumiu yang masuk ke dalam. Setelah itu Saksi turun lewat tangga, jalan ke lantai 2, tapi Saksi nggak langsung turun, Saksi ke dapur.",
      "Setelah ke dapur karena Saksi belum makan, menanyakan ke bibi, “ada makanan apa, saya belum makan”?, adanya ayam, akhirnya Saksi tidak jadi makan. …",
    ],
  },
  {
    id: "insufficient",
    part: 1,
    at: "00:18:46",
    page: "60",
    quote:
      "Setahu saya, cuma saya sama ibu, selainnya saya tidak tahu. Soalnya saya udah masuk duluan ke kamar, terus mandi.",
    earlier:
      "Bahwa pada tanggal 7 siang Saksi di rumah saja. Jam 12.00 Saksi masih di rumah, dan waktu itu ada Saksi Richard Eliezer Pudihang Lumiu, Yoshua, Saksi Susi dan ibu.",
    transcript: [
      "spk_1: … Setelah lanjut ke Jakarta, saudara sempat PCR. Siapa saja yang PCR begitu sampai di Saguling.",
      "Saksi Susi: Setahu saya, cuma saya sama ibu, selainnya saya tidak tahu. Soalnya saya udah masuk duluan ke kamar, terus mandi.",
      "Saksi Susi: Siap, terus saya istirahat, ketiduran, …",
    ],
    statement: [
      "Bahwa pada tanggal 7 dini hari ada perayaan ulang tahun perkawainan TERDAKWA dan SAKSI PUTRI CANDRAWATHI dan Saksi disuapin oleh TERDAKWA dan SAKSI PUTRI CANDRAWATHI;",
      "Bahwa pada tanggal 7 siang Saksi di rumah saja. Jam 12.00 Saksi masih di rumah, dan waktu itu ada Saksi Richard Eliezer Pudihang Lumiu, Yoshua, Saksi Susi dan ibu.",
      "Kira-kira sore Saksi diajak Saksi Ricky Rizal Wibowo untuk mencarikan kipas angin untuk mengantar ke Taruna Nusantara. …",
    ],
  },
];

type Copy = Pick<
  Example,
  "label" | "shortLabel" | "finding" | "explanation" | "verify" | "question"
>;
const copy: Record<Lang, { part: string; items: readonly Copy[] }> = {
  en: {
    part: "Part",
    items: [
      {
        label: "Supported",
        shortLabel: "A matching detail",
        finding:
          "Both accounts say Ricky and Joshua passed in front of her room.",
        explanation:
          "The hearing answer matches the putusan’s summary of Saksi Susi’s own testimony on this detail. Agreement between two accounts from the same witness does not independently establish the event, and neither excerpt gives the time.",
        verify:
          "Compare with Ricky Rizal Wibowo’s testimony and other witnesses who were in the house at the time.",
        question:
          "About what time did Ricky and Joshua pass in front of your room?",
      },
      {
        label: "Context needed",
        shortLabel: "An unresolved question",
        finding: "These passages may describe different moments.",
        explanation:
          "Saksi Susi places Ricky inside the room and Richard still on the stairs. The putusan passage is Kuat Ma’ruf’s account of Richard going into a room. The excerpts do not show that both witnesses describe the same moment, so no inconsistency can be inferred.",
        verify:
          "Establish which room and which moment each witness is describing.",
        question:
          "Which room did Ricky enter, and what was happening in the house at that moment?",
      },
      {
        label: "Insufficient evidence",
        shortLabel: "Not clearly the same moment",
        finding:
          "The accounts list different people, but may not refer to the same time.",
        explanation:
          "Saksi Susi answers a question about who took a PCR test on arrival at Saguling. The putusan line is Kuat Ma’ruf’s account of who was at home at noon on 7 July. The available sources are not enough to compare the two.",
        verify:
          "Confirm the question Saksi Susi was answering and the time each account refers to.",
        question:
          "When you went to your room and showered, who had you already seen at the house?",
      },
    ],
  },
  id: {
    part: "Bagian",
    items: [
      {
        label: "Didukung sumber",
        shortLabel: "Detail yang cocok",
        finding:
          "Kedua keterangan menyebut Ricky dan Joshua lewat di depan kamarnya.",
        explanation:
          "Jawaban di persidangan sesuai dengan ringkasan keterangan Saksi Susi sendiri dalam putusan untuk detail ini. Kesesuaian dua keterangan dari saksi yang sama tidak dengan sendirinya membuktikan peristiwa itu, dan kedua kutipan tidak menyebut waktunya.",
        verify:
          "Bandingkan dengan keterangan Ricky Rizal Wibowo dan saksi lain yang berada di rumah pada waktu itu.",
        question:
          "Kira-kira pukul berapa Ricky dan Joshua lewat di depan kamar Saudara?",
      },
      {
        label: "Perlu konteks",
        shortLabel: "Pertanyaan yang belum terjawab",
        finding: "Kedua kutipan ini mungkin menggambarkan momen yang berbeda.",
        explanation:
          "Saksi Susi menyebut Ricky masuk ke kamar dan Richard masih di tangga. Kutipan putusan adalah keterangan Kuat Ma’ruf tentang Richard yang masuk ke sebuah kamar. Kutipan ini tidak menunjukkan bahwa kedua saksi menggambarkan momen yang sama, sehingga perbedaan keterangan tidak dapat disimpulkan.",
        verify:
          "Pastikan kamar mana dan momen mana yang dimaksud masing-masing saksi.",
        question:
          "Kamar mana yang dimasuki Ricky, dan apa yang sedang terjadi di rumah saat itu?",
      },
      {
        label: "Bukti belum cukup",
        shortLabel: "Belum tentu momen yang sama",
        finding:
          "Kedua keterangan menyebut orang yang berbeda, tetapi belum tentu pada waktu yang sama.",
        explanation:
          "Saksi Susi menjawab pertanyaan tentang siapa saja yang PCR begitu sampai di Saguling. Kutipan putusan adalah keterangan Kuat Ma’ruf tentang siapa yang ada di rumah pada 7 Juli pukul 12.00. Sumber yang tersedia belum cukup untuk membandingkan keduanya.",
        verify:
          "Pastikan pertanyaan yang dijawab Saksi Susi dan waktu yang dimaksud setiap keterangan.",
        question:
          "Saat Saudara masuk ke kamar dan mandi, siapa saja yang sudah Saudara lihat di rumah?",
      },
    ],
  },
};

const build = (lang: Lang): readonly Example[] =>
  sources.map(({ part, at, ...source }, index) => ({
    ...source,
    ...copy[lang].items[index],
    time: `${copy[lang].part} ${part} · ${at}`,
  }));

/** Landing-page examples from the public demo case in each UI language (same ids and order). */
export const examples: Record<Lang, readonly Example[]> = {
  id: build("id"),
  en: build("en"),
};
