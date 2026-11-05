<script lang="ts">
  import { ArrowRight } from "@lucide/svelte";
  import { l, t } from "../lib/i18n";
  import { go } from "../lib/router.svelte";
  import { openAssistant } from "../lib/store.svelte";
  import type { L10n } from "../lib/types";

  /**
   * The information-architecture sketch, redrawn: nodes keep the sketch's positions and arrows.
   * Each node lists what the product does today (from the repo) and what this mockup proposes.
   */
  type Kind = "core" | "input" | "layer" | "mode" | "out" | "design" | "object";
  interface MapNode {
    id: string;
    label: L10n;
    kind: Kind;
    x: number;
    y: number;
    w: number;
    today: L10n[];
    proposed: L10n[];
    open?: () => void;
  }
  const L = (id: string, en: string): L10n => ({ id, en });

  const nodes: MapNode[] = [
    {
      id: "case", label: L("Perkara", "Case"), kind: "core", x: 500, y: 120, w: 150,
      today: [
        L("Perkara terisolasi per akun dengan judul, nomor, dan deskripsi", "Cases isolated per account with title, number and description"),
        L("Label perkara: privat, catatan publik, materi sintetis", "Case labels: private, public record, synthetic"),
        L("Ekspor/impor arsip .jude (dokumen, sidang, temuan, catatan)", ".jude archive export/import (documents, hearings, findings, notes)"),
        L("Pengaturan: detail, ekspor, privasi suara, hapus perkara", "Settings: details, export, voice privacy, delete"),
        L("Tujuh tab di header perkara; di ponsel tab terpotong", "Seven tabs in the case header; on phones the tabs overflow"),
      ],
      proposed: [
        L("Ringkasan perkara sebagai pusat: sidang langsung, antrean tinjauan, sidang berikutnya, bukti", "Case overview as the hub: live hearing, review queue, next hearing, evidence"),
        L("Lima bagian menurut alur kerja: Sidang dan Bukti mengumpulkan, Temuan memproses, Keterkaitan menelusuri; asisten menjadi lapisan", "Five sections in the order work flows: Hearings and Evidence gather, Findings processes, Connections traces; the assistant becomes a layer"),
        L("Temuan hanya diproses di Temuan; di bagian lain temuan berupa tautan ke sana", "Findings are processed only in Findings; everywhere else they are links into it"),
        L("Rail penuh → rail ikon → bilah bawah sesuai lebar layar", "Full rail → icon rail → bottom bar by screen width"),
        L("Pengaturan dan ekspor pindah ke menu perkara (⋯)", "Settings and export move into the case menu (⋯)"),
      ],
      open: () => go("/case/c1"),
    },
    {
      id: "hearings", label: L("Sidang", "Hearings"), kind: "core", x: 360, y: 300, w: 160,
      today: [
        L("Perpustakaan sidang: cari judul, tanggal, dan frasa transkrip", "Hearing library: search titles, dates and transcript phrases"),
        L("Saringan Perlu ditinjau dan jumlah temuan per sidang", "Needs-review filter and finding counts per hearing"),
        L("Impor transkrip .jude, JSON, CSV, TXT, SRT, VTT, PDF, DOCX; risalah dikenali", "Transcript import .jude, JSON, CSV, TXT, SRT, VTT, PDF, DOCX; risalah recognized"),
        L("Konversi AI untuk tata letak asing, dengan pratinjau sebelum impor", "AI conversion for unfamiliar layouts, with a preview before import"),
        L("Cari dan saring transkrip per pembicara; label pembicara dan suara berulang", "Transcript search and speaker filter; speaker labels and recurring voices"),
      ],
      proposed: [
        L("Satu tombol Sidang baru dengan empat jalur: rekam, unggah audio, impor, jadwalkan", "One New hearing button with four paths: record, upload audio, import, schedule"),
        L("Mode Langsung dan mode Tinjau menjadi layar terpisah", "Live and Review become separate screens"),
        L("Hasil pencarian menampilkan frasa transkrip yang cocok", "Search results show the matching transcript phrase"),
      ],
      open: () => go("/case/c1/hearings"),
    },
    {
      id: "live", label: L("Langsung", "Live"), kind: "mode", x: 720, y: 318, w: 110,
      today: [
        L("Mikrofon langsung via Amazon Transcribe streaming, langsung dari browser", "Live microphone via Amazon Transcribe streaming, straight from the browser"),
        L("Konfirmasi izin hakim (Perma 5/2020) sebelum merekam", "Judge-permission confirmation (Perma 5/2020) before recording"),
        L("Teks sementara, pernyataan final, fase analisis per pernyataan", "Provisional text, final statements, analysis phases per statement"),
        L("Rekaman audio opsional; sambung ulang otomatis setelah 3 j 50 m", "Optional audio recording; automatic reconnect after 3 h 50 m"),
      ],
      proposed: [
        L("Bilah sidang langsung yang menetap di semua layar", "A persistent live bar on every screen"),
        L("Urutan menurut relevansi: tautan ke temuan yang paling perlu dicek di atas, lalu siapa yang sedang berbicara, lalu baris terakhir", "Ordered by relevance: a link to the finding most worth a look on top, then who is speaking now, then the last lines"),
        L("Siluet kepala berbicara dengan gelombang suara saat bicara, tanpa denah tempat duduk; suara baru diberi nama dari kotak dialog", "A talking-head silhouette whose sound waves move while the person speaks, no seating chart; new voices are named from the dialogue box"),
        L("Mode ruang sidang: tema gelap rendah silau dan ukuran teks", "Courtroom mode: low-glare dark theme and text size"),
        L("Ikuti otomatis berhenti saat Anda menggulir; tombol pernyataan baru", "Auto-follow pauses when you scroll; a new-statements button"),
        L("Tandai pernyataan; pasal yang disebut menjadi tautan", "Flag statements; mentioned articles become links"),
      ],
      open: () => go("/case/c1/hearings/h3"),
    },
    {
      id: "recorded", label: L("Rekaman", "Recorded"), kind: "mode", x: 862, y: 318, w: 120,
      today: [
        L("Rekaman privat per perkara, diputar dengan seeking", "Private recordings per case, replayed with seeking"),
        L("Transkripsi file audio (hingga 30 menit / 30 MB)", "Audio file transcription (up to 30 min / 30 MB)"),
        L("Transkrip impor tanpa audio", "Imported transcripts without audio"),
      ],
      proposed: [
        L("Pemutar dengan linimasa siapa berbicara kapan dan penanda temuan", "Player with a who-spoke-when timeline and finding markers"),
        L("Klik waktu pernyataan untuk memutar; ikuti pemutaran", "Click a statement's time to play it; follow playback"),
        L("Baris dengan temuan menautkan ke temuan itu di Temuan", "Lines with a finding link to it in Findings"),
        L("Spasi untuk memutar dan menjeda", "Space to play and pause"),
      ],
      open: () => go("/case/c1/hearings/h2"),
    },
    {
      id: "audio", label: L("Audio", "Audio"), kind: "input", x: 280, y: 110, w: 120,
      today: [
        L("Rekam mikrofon atau pilih file audio dari halaman sidang", "Record the microphone or pick an audio file on the hearing page"),
        L("Bahasa pengenalan id-ID / en-US", "Recognition language id-ID / en-US"),
        L("Sidik suara per perkara, bisa dihapus, tidak pernah diekspor", "Voiceprints per case, deletable, never exported"),
      ],
      proposed: [
        L("Audio adalah masukan ke Sidang, bukan layar sendiri", "Audio is an input into Hearings, not a screen of its own"),
        L("Alur unggah dengan tahap yang terlihat: unggah, transkripsi, pemeriksaan", "Upload flow with visible stages: upload, transcription, examination"),
        L("Persetujuan perekaman sebagai panel yang jelas", "Recording consent as a clear panel"),
      ],
      open: () => go("/case/c1/hearings"),
    },
    {
      id: "pasal", label: L("Pasal.id", "Pasal.id"), kind: "input", x: 110, y: 300, w: 130,
      today: [
        L("Cari peraturan Indonesia per kata kunci dan jenis (UU, PP, Perma, Putusan MK, …)", "Search Indonesian regulations by keyword and type (UU, PP, Perma, Putusan MK, …)"),
        L("Hasil adalah metadata penemuan; teks asli diverifikasi", "Results are discovery metadata; the original text is verified"),
        L("Rujukan hukum terkait di pemeriksa temuan", "Related legal discovery in the finding inspector"),
        L("Tab Rujukan hukum tersendiri", "A separate Legal references tab"),
      ],
      proposed: [
        L("Tanpa tab sendiri: muncul di sidang, temuan, dan asisten", "No tab of its own: appears in hearings, findings and the assistant"),
        L("Pasal yang disebut di sidang menjadi tautan di baris transkrip", "Articles mentioned in court become links on the transcript line"),
        L("Tombol Pasal.id di penyusun pesan asisten", "A Pasal.id toggle in the assistant composer"),
      ],
      open: () => go("/case/c1/hearings/h3"),
    },
    {
      id: "assistant", label: L("Asisten perkara", "Case assistant"), kind: "layer", x: 790, y: 160, w: 180,
      today: [
        L("Percakapan tersimpan per perkara; ekspor JSON", "Saved conversations per case; JSON export"),
        L("Retrieval atas dokumen, sidang, temuan, dan keterkaitan terkonfirmasi", "Retrieval over documents, hearings, findings and confirmed links"),
        L("Rujuk hingga enam catatan; kutipan diverifikasi sebelum disimpan", "Reference up to six records; quotations verified before saving"),
        L("Mode sumber saja tanpa AI; penemuan hukum opsional", "Sources-only mode without AI; optional legal discovery"),
        L("Tab tersendiri; konteks hilang saat berpindah tab", "A tab of its own; context is lost when switching tabs"),
      ],
      proposed: [
        L("Panel menempel di desktop, laci di tablet, lembar di ponsel", "Docked panel on desktop, drawer on tablet, sheet on phone"),
        L("Mengikuti konteks: sidang, temuan, atau bukti yang dibuka", "Follows context: the hearing, finding or evidence you have open"),
        L("Saran pertanyaan berubah sesuai konteks", "Suggested questions change with context"),
        L("Kutipan [n] membuka sumbernya; kutipan temuan membuka Temuan", "[n] citations open their source; finding citations open Findings"),
      ],
      open: () => {
        go("/case/c1");
        openAssistant({ kind: "case" });
      },
    },
    {
      id: "findings", label: L("Temuan", "Findings"), kind: "core", x: 470, y: 470, w: 150,
      today: [
        L("Empat status yang selalu tertulis, bukan hanya warna", "Four statuses, always written out, not color alone"),
        L("Kutipan persis, peninjau independen, ketidakpastian, langkah verifikasi", "Exact quotations, independent reviewer, uncertainty, verification steps"),
        L("Pertanyaan yang disarankan dan catatan tinjauan", "Suggested questions and review notes"),
        L("Hanya ada di dalam tiap sidang", "Only available inside each hearing"),
      ],
      proposed: [
        L("Antrean temuan lintas sidang sebagai bagian utama", "A cross-hearing findings queue as a main section"),
        L("Saring per status, sidang, dan perlu ditinjau", "Filter by status, hearing and needs-review"),
        L("Keterangan dan sumber berdampingan di layar lebar", "Testimony and source side by side on wide screens"),
        L("Berikutnya/sebelumnya di lembar penuh pada ponsel", "Next/previous in a full sheet on phones"),
        L("Papan temuan: papan yang diarahkan pengacara untuk temuan dan sumber di baliknya", "Findings board: a lawyer-driven board of findings and the sources behind them"),
        L("Satu-satunya tempat temuan diproses; halaman lain menautkan ke satu temuan, satu sidang, atau satu dokumen di sini", "The only place findings are processed; other pages link here to one finding, one hearing or one document"),
      ],
      open: () => go("/case/c1/findings"),
    },
    {
      id: "evidence", label: L("Bukti", "Evidence"), kind: "core", x: 280, y: 470, w: 150,
      today: [
        L("Dokumen PDF/DOCX/TXT/MD hingga 25 MB, unduh asli, kutipan per halaman", "PDF/DOCX/TXT/MD documents up to 25 MB, original download, passages by page"),
        L("Peta bukti pernyataan ↔ kutipan dengan empat hubungan", "Evidence map of statements ↔ passages with four relations"),
        L("Saran AI (putus-putus) dan tautan terkonfirmasi (utuh)", "AI suggestions (dashed) and confirmed links (solid)"),
        L("Pertanyaan bahasa alami dengan jawaban berkutipan", "Natural-language questions with cited answers"),
      ],
      proposed: [
        L("Hanya berkas perkara: dokumen sumber dan pembacanya", "Case files only: the source documents and their reader"),
        L("PDF asli lewat PDF.js dengan lapisan Jude: sorotan kutipan, tanda temuan yang menautkan ke Temuan, dan teks terpilih langsung ke asisten", "The original PDF via PDF.js with Jude's layer: highlighted citations, finding marks that link into Findings, and selected text straight to the assistant"),
        L("Pertanyaan diteruskan ke asisten", "Questions hand off to the assistant"),
      ],
      open: () => go("/case/c1/evidence"),
    },
    {
      id: "connections", label: L("Keterkaitan", "Connections"), kind: "core", x: 650, y: 470, w: 150,
      today: [L("Peta bukti di dalam Bukti", "The evidence map inside Evidence")],
      proposed: [
        L("Halaman sendiri, terpisah dari Bukti", "Its own page, apart from Evidence"),
        L("Pilih satu hal, lihat apa yang terkait, yang terkuat di atas, dengan jejak untuk kembali", "Pick one thing, see what relates to it, strongest first, with a trail back"),
        L("Temuan tentang hal itu tampil sebagai tautan ke Temuan", "Findings about it show as links into Findings"),
      ],
      open: () => go("/case/c1/connections?of=statement:s208"),
    },
    {
      id: "practice", label: L("Latihan sidang", "Courtroom practice"), kind: "out", x: 110, y: 470, w: 170,
      today: [
        L("Latihan dengan AI sebagai hakim, penuntut, penasihat hukum, dan saksi", "Rehearsal with AI as judge, prosecutor, defense counsel and witness"),
        L("Kondisi yang bisa diubah, catatan coaching, debrief berkutipan", "Editable conditions, coaching notes, cited debrief"),
        L("Terpisah dari catatan bukti", "Kept apart from the evidence record"),
      ],
      proposed: [
        L("Sketsa: mandiri / tidak diperlukan. Tidak ada di navigasi mockup ini.", "Sketch: standalone / not needed. Not in this mockup's navigation."),
        L("Jika dipertahankan, cocok sebagai aplikasi atau mode terpisah", "If kept, it fits as a separate app or mode"),
      ],
    },
    {
      id: "moodboard", label: L("Moodboard", "Moodboard"), kind: "design", x: 850, y: 470, w: 150,
      today: [
        L("DESIGN.md: kertas hangat, hijau hutan, judul serif", "DESIGN.md: warm paper, forest green, serif headings"),
        L("Rufina, Caslon Display, Manrope", "Rufina, Caslon Display, Manrope"),
      ],
      proposed: [
        L("Tema Malam rendah silau untuk ruang sidang", "A low-glare Night theme for courtrooms"),
        L("Kerapatan Lega/Rapat dan aturan responsif per lebar", "Comfortable/Compact density and per-width responsive rules"),
      ],
      open: () => go("/moodboard"),
    },
    {
      id: "doc", label: L("Dokumen perkara", "Case document"), kind: "object", x: 330, y: 600, w: 170,
      today: [L("File asli tersimpan; teks dipecah menjadi kutipan per halaman", "Original kept; text split into passages by page")],
      proposed: [L("Kartu dokumen dan pembaca halaman", "Document cards and a page reader")],
      open: () => go("/case/c1/evidence/doc/d1"),
    },
    {
      id: "statement", label: L("Pernyataan sidang", "Hearing statement"), kind: "object", x: 520, y: 600, w: 170,
      today: [L("Pembicara, waktu, teks, fase analisis", "Speaker, time, text, analysis phase")],
      proposed: [L("Baris yang sama di mode langsung, tinjau, dan keterkaitan", "The same row in live, review and connections views")],
      open: () => go("/case/c1/hearings/h2"),
    },
    {
      id: "finding", label: L("Temuan sidang", "Hearing finding"), kind: "object", x: 710, y: 600, w: 170,
      today: [L("Status, keterangan, sumber, verifikasi, pertanyaan, tinjauan", "Status, testimony, sources, verification, question, review")],
      proposed: [L("Dibuka dan diproses hanya di Temuan; di tempat lain berupa tautan", "Opened and processed only in Findings; a link everywhere else")],
      open: () => go("/case/c1/findings"),
    },
  ];

  const edges: { from: string; to: string; style?: "object" | "arc" | "pair" }[] = [
    { from: "pasal", to: "hearings" },
    { from: "pasal", to: "assistant", style: "arc" },
    { from: "audio", to: "hearings" },
    { from: "case", to: "hearings" },
    { from: "case", to: "findings" },
    { from: "case", to: "evidence" },
    { from: "case", to: "connections" },
    { from: "assistant", to: "hearings" },
    { from: "assistant", to: "findings" },
    { from: "assistant", to: "evidence" },
    { from: "hearings", to: "findings" },
    { from: "evidence", to: "findings" },
    { from: "hearings", to: "live" },
    { from: "live", to: "recorded", style: "pair" },
    { from: "doc", to: "evidence", style: "object" },
    { from: "statement", to: "hearings", style: "object" },
    { from: "statement", to: "connections", style: "object" },
    { from: "finding", to: "findings", style: "object" },
  ];

  const byId = new Map(nodes.map((n) => [n.id, n]));
  let selectedId = $state("case");
  let selected = $derived(byId.get(selectedId)!);
  const H = 34;

  function edgePath(e: (typeof edges)[number]) {
    const a = byId.get(e.from)!;
    const b = byId.get(e.to)!;
    if (e.style === "arc") return `M${a.x},${a.y - H} C${a.x + 40},${-60} ${b.x - 60},${-20} ${b.x - 10},${b.y - H}`;
    // Trim the line at each ellipse so arrowheads touch the border.
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const trim = (n: MapNode, sign: number) => {
      const rx = n.w / 2;
      const ry = H;
      const ux = dx / len;
      const uy = dy / len;
      const r = 1 / Math.sqrt((ux * ux) / (rx * rx) + (uy * uy) / (ry * ry));
      return { x: n.x + sign * ux * (r + 4), y: n.y + sign * uy * (r + 4) };
    };
    const s = trim(a, 1);
    const t2 = trim(b, -1);
    return `M${s.x},${s.y} L${t2.x},${t2.y}`;
  }

  const kindLabel = (k: Kind) =>
    ({
      core: t("map.core"),
      input: t("map.input"),
      layer: t("map.layer"),
      mode: t("map.mode"),
      out: t("map.standalone"),
      design: t("nav.moodboard"),
      object: t("map.object"),
    })[k];
</script>

<div class="page map-page">
  <header class="page-head">
    <div>
      <h1>{t("map.title")}</h1>
      <p>{t("map.lead")}</p>
    </div>
  </header>

  <ul class="legend small" aria-label="Legend">
    <li><span class="sw core"></span>{t("map.core")}</li>
    <li><span class="sw input"></span>{t("map.input")}</li>
    <li><span class="sw layer"></span>{t("map.layer")}</li>
    <li><span class="sw mode"></span>{t("map.mode")}</li>
    <li><span class="sw object"></span>{t("map.object")}</li>
    <li><span class="sw out"></span>{t("map.out")}</li>
  </ul>

  <div class="layout">
    <div class="diagram card">
      <div class="stage">
        <svg viewBox="0 -40 1000 700" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" class="arrowhead" />
            </marker>
          </defs>
          {#each edges as e (e.from + e.to)}
            {@const active = selectedId === e.from || selectedId === e.to}
            <path class="edge {e.style ?? ''}" class:active d={edgePath(e)} marker-end={e.style === "pair" ? undefined : "url(#arrow)"} />
          {/each}
          <text x="110" y="420" class="note">{t("map.standalone")}</text>
        </svg>
        {#each nodes as n (n.id)}
          <button
            class="node {n.kind}"
            class:selected={selectedId === n.id}
            style:left="{(n.x / 1000) * 100}%"
            style:top="{((n.y + 40) / 700) * 100}%"
            style:width="{(n.w / 1000) * 100}%"
            aria-pressed={selectedId === n.id}
            onclick={() => (selectedId = n.id)}
          >
            {l(n.label)}
          </button>
        {/each}
      </div>
    </div>

    <aside class="detail card" aria-live="polite">
      <span class="tag kind-{selected.kind}">{kindLabel(selected.kind)}</span>
      <h2 class="t-serif">{l(selected.label)}</h2>
      <section>
        <h3 class="t-label">{t("map.today")}</h3>
        <ul>{#each selected.today as item (item.en)}<li>{l(item)}</li>{/each}</ul>
      </section>
      <section>
        <h3 class="t-label">{t("map.proposed")}</h3>
        <ul class="proposed">{#each selected.proposed as item (item.en)}<li>{l(item)}</li>{/each}</ul>
      </section>
      {#if selected.open}
        <button class="btn btn-primary" onclick={selected.open}>{t("map.openScreen")}<ArrowRight size={16} /></button>
      {/if}
    </aside>
  </div>

  <nav class="node-list" aria-label={t("map.nodes")}>
    {#each nodes as n (n.id)}
      <button class="chip" aria-pressed={selectedId === n.id} onclick={() => (selectedId = n.id)}>{l(n.label)}</button>
    {/each}
  </nav>
</div>

<style>
  .map-page {
    max-width: 1500px;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    margin-bottom: 14px;
  }
  .legend li {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }
  .sw {
    width: 22px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid;
  }
  .sw.core { border-color: var(--ink-strong); background: var(--selected); }
  .sw.input { border-color: #b47a2e; background: var(--st-inconsistency-bg); }
  .sw.layer { border-color: #7d7a99; background: var(--st-context-bg); }
  .sw.mode { border-color: var(--live); background: var(--live-soft); }
  .sw.object { border-radius: 3px; border-color: var(--muted); background: var(--surface); }
  .sw.out { border-style: dashed; border-color: var(--muted); }
  .layout {
    display: grid;
    gap: 16px;
    grid-template-columns: minmax(0, 1fr);
  }
  @container main (min-width: 1100px) {
    .layout {
      grid-template-columns: minmax(0, 1fr) 360px;
      align-items: start;
    }
    .detail {
      position: sticky;
      top: calc(var(--topbar-h) + 16px);
    }
  }
  .diagram {
    padding: 10px;
    overflow-x: auto;
  }
  .stage {
    position: relative;
    min-width: 640px;
    aspect-ratio: 1000 / 700;
    container-type: inline-size;
  }
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .edge {
    fill: none;
    stroke: var(--line-strong);
    stroke-width: 2;
  }
  .edge.active {
    stroke: var(--ink-strong);
    stroke-width: 2.6;
  }
  .edge.object {
    stroke-dasharray: 2 5;
  }
  .edge.arc {
    stroke-dasharray: none;
  }
  .edge.pair {
    stroke-dasharray: 6 4;
  }
  :global(.arrowhead) {
    fill: var(--muted);
  }
  .note {
    font: 600 15px var(--font-ui);
    fill: var(--muted);
    text-anchor: middle;
  }
  .node {
    position: absolute;
    transform: translate(-50%, -50%);
    height: 9.7%;
    display: grid;
    place-items: center;
    padding: 0 6px;
    border-radius: 50%;
    border: 2px solid var(--ink-strong);
    background: var(--surface);
    font-size: clamp(10px, 1.55cqi, 16px);
    font-weight: 600;
    line-height: 1.1;
    color: var(--ink-strong);
    text-align: center;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .node:hover {
    transform: translate(-50%, -50%) scale(1.04);
  }
  .node.selected {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--focus) 45%, transparent);
  }
  .node.core { background: var(--selected); }
  .node.input { border-color: #b47a2e; background: var(--st-inconsistency-bg); color: var(--st-inconsistency-ink); }
  .node.layer { border-color: #7d7a99; background: var(--st-context-bg); color: var(--st-context-ink); }
  .node.mode { border-color: var(--live); background: var(--live-soft); color: var(--live); }
  .node.design { border-color: var(--sand-ink); background: var(--sand); color: var(--sand-ink); }
  .node.object { border-radius: 6px; border-width: 1.5px; border-color: var(--muted); height: 7%; font-weight: 500; }
  .node.out { border-style: dashed; border-color: var(--muted); color: var(--muted); background: transparent; height: 13%; }
  .detail {
    display: grid;
    gap: 14px;
    padding: 18px;
    align-content: start;
  }
  .detail h2 {
    font-size: 28px;
  }
  .detail section {
    display: grid;
    gap: 6px;
  }
  .detail ul {
    display: grid;
    gap: 6px;
    padding-left: 18px;
    list-style: disc;
  }
  .detail li::marker {
    color: var(--muted);
  }
  .proposed li::marker {
    color: var(--focus);
  }
  .detail .btn,
  .detail .tag {
    justify-self: start;
  }
  .node-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 14px;
  }
</style>
