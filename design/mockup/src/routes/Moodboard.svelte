<script lang="ts">
  import FindingRow from "../components/FindingRow.svelte";
  import RelationTag from "../components/RelationTag.svelte";
  import SpeakerTag from "../components/SpeakerTag.svelte";
  import StatusChip from "../components/StatusChip.svelte";
  import { fmtClock, l, t } from "../lib/i18n";
  import { doc, finding, inspect, statement } from "../lib/store.svelte";
  import type { L10n } from "../lib/types";

  const L = (id: string, en: string): L10n => ({ id, en });

  const principles = [
    L("Setiap temuan bisa ditelusuri ke sumber yang bisa diperiksa.", "Every finding traces back to a source you can inspect."),
    L("Bedakan dukungan langsung, kemungkinan perbedaan, dan konteks yang belum jelas.", "Distinguish direct support, possible differences and unresolved context."),
    L("Keputusan hukum tetap pada profesional yang bertanggung jawab.", "Legal decisions stay with responsible professionals."),
    L("Jaga perhatian selama sidang: UI tenang, informasi datang tanpa memotong.", "Preserve attention in court: a calm UI where information arrives without interrupting."),
  ];

  const adaptive = [
    L("Navigasi menyesuaikan lebar: rail penuh (≥1024), rail ikon (720–1023), bilah bawah (<720).", "Navigation follows width: full rail (≥1024), icon rail (720–1023), bottom bar (<720)."),
    L("Panel diatur oleh lebar kontainer, bukan layar: membuka asisten mengubah tiga panel menjadi dua.", "Panes respond to container width, not the screen: opening the assistant turns three panes into two."),
    L("Pemeriksa yang sama tampil sebagai panel, laci, atau lembar penuh dengan berikutnya/sebelumnya.", "The same inspector appears as a pane, a drawer or a full sheet with next/previous."),
    L("Sidang langsung tetap terlihat lewat bilah langsung saat Anda membuka layar lain.", "A live hearing stays visible through the live bar while you open other screens."),
    L("Pointer kasar mendapat target 44 px dan aksi yang selalu terlihat; pointer halus mendapat hover dan pintasan.", "Coarse pointers get 44 px targets and always-visible actions; fine pointers get hover and shortcuts."),
    L("Teks Indonesia lebih panjang: label dibungkus, bukan dipotong, dan diuji di kedua bahasa.", "Indonesian text runs longer: labels wrap rather than truncate, and both languages are tested."),
    L("Mode ruang sidang: tema gelap rendah silau dan teks lebih besar untuk ruangan redup.", "Courtroom mode: a low-glare dark theme and larger text for dim rooms."),
  ];

  const tiers = [
    { name: L("Ponsel <720", "Phone <720"), nav: L("Bilah bawah 5 item", "5-item bottom bar"), assistant: L("Lembar penuh", "Full sheet"), hearing: L("Tab Transkrip/Temuan", "Transcript/Findings tabs"), inspector: L("Lembar penuh + berikutnya/sebelumnya", "Full sheet + next/previous") },
    { name: L("Tablet 720–1023", "Tablet 720–1023"), nav: L("Rail ikon", "Icon rail"), assistant: L("Laci kanan", "Right drawer"), hearing: L("Dua panel", "Two panes"), inspector: L("Panel kanan atau laci", "Right pane or drawer") },
    { name: L("Laptop 1024–1279", "Laptop 1024–1279"), nav: L("Rail penuh, bisa diciutkan", "Full rail, collapsible"), assistant: L("Laci kanan", "Right drawer"), hearing: L("Dua atau tiga panel", "Two or three panes"), inspector: L("Panel di halaman", "In-page pane") },
    { name: L("Desktop ≥1280", "Desktop ≥1280"), nav: L("Rail penuh", "Full rail"), assistant: L("Menempel (atau melayang)", "Docked (or overlay)"), hearing: L("Tiga panel", "Three panes"), inspector: L("Panel di halaman", "In-page pane") },
  ];

  const swatches = ["bg", "surface", "ink-strong", "muted", "line", "nav", "primary", "focus", "live", "mark", "sand"];

  let d = $derived(doc("d1"));
  let s = $derived(statement("s208"));
  let f = $derived(finding("f1"));
</script>

<div class="page mood">
  <header class="page-head">
    <div>
      <h1>{t("mb.title")}</h1>
      <p>{t("mb.lead")}</p>
    </div>
  </header>

  <section class="block">
    <h2>Principles</h2>
    <ol class="principles">
      {#each principles as p, i (i)}<li><span class="n tabular">{i + 1}</span><p class="t-serif">{l(p)}</p></li>{/each}
    </ol>
  </section>

  <section class="block">
    <h2>Color</h2>
    <div class="themes">
      {#each [["paper", "Paper"], ["night", "Night · courtroom"]] as [theme, name] (theme)}
        <div class="theme" data-theme={theme}>
          <h3>{name}</h3>
          <div class="sw-grid">
            {#each swatches as v (v)}
              <div class="sw"><span class="chip-color" style:background="var(--{v})"></span><code>--{v}</code></div>
            {/each}
          </div>
          <div class="row">
            <StatusChip status="supported" /><StatusChip status="potential_inconsistency" /><StatusChip status="context_needed" /><StatusChip status="insufficient_evidence" />
          </div>
          <div class="row">
            <RelationTag relation="supports" /><RelationTag relation="conflicts" /><RelationTag relation="context" /><RelationTag relation="related" /><RelationTag relation="conflicts" reviewed={false} />
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section class="block">
    <h2>Typography</h2>
    <div class="type">
      <div><span class="t-label">Rufina · case titles</span><p class="t-title" style="font-size:36px">Perkara Penggelapan Gudang Cakung</p></div>
      <div><span class="t-label">Caslon Display · findings, quotes</span><p class="t-serif" style="font-size:25px">Jam kedatangan saksi berbeda dengan BAP dan log akses.</p></div>
      <div><span class="t-label">Manrope · interface, testimony</span><p style="font-size:15px">Saya sampai di gudang jam setengah sepuluh malam, Pak. <span class="muted">· 00:14:32 · Saksi Rina Hartati</span></p></div>
    </div>
  </section>

  <section class="block">
    <h2>Core objects (from the sketch)</h2>
    <div class="objects">
      {#if d}
        <div class="object card">
          <span class="t-label">Case document</span>
          <strong>{d.title}</strong>
          <span class="small muted">{l(d.kind)} · {t("ev.pages", { n: d.pages })} · {d.file}</span>
        </div>
      {/if}
      {#if s}
        <div class="object card">
          <span class="t-label">Hearing statement</span>
          <div class="st"><span class="tabular xsmall muted">{fmtClock(s.t)}</span><SpeakerTag id={s.speakerId} /></div>
          <p>{s.text}</p>
        </div>
      {/if}
      {#if f}
        <div class="object card flush">
          <span class="t-label pad">Hearing finding</span>
          <FindingRow {f} onclick={() => inspect({ kind: "finding", id: f.id })} />
        </div>
      {/if}
    </div>
  </section>

  <section class="block">
    <h2>Responsive behavior</h2>
    <div class="table-scroll">
      <table>
        <thead><tr><th>Width</th><th>Navigation</th><th>Assistant</th><th>Hearing</th><th>Inspector</th></tr></thead>
        <tbody>
          {#each tiers as tier (tier.name.en)}
            <tr><th scope="row">{l(tier.name)}</th><td>{l(tier.nav)}</td><td>{l(tier.assistant)}</td><td>{l(tier.hearing)}</td><td>{l(tier.inspector)}</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section class="block">
    <h2>Adaptive behavior</h2>
    <ul class="adaptive">{#each adaptive as a, i (i)}<li>{l(a)}</li>{/each}</ul>
  </section>
</div>

<style>
  .mood {
    max-width: 1200px;
  }
  .block {
    display: grid;
    gap: 14px;
    padding: 26px 0;
    border-top: 1px solid var(--line);
  }
  .block > h2 {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .principles {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  }
  .principles li {
    display: grid;
    gap: 8px;
    padding-top: 12px;
    border-top: 2px solid var(--ink-strong);
  }
  .principles p {
    font-size: 20px;
    line-height: 1.3;
  }
  .n {
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
  }
  .themes {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
  }
  .theme {
    display: grid;
    gap: 12px;
    padding: 16px;
    border-radius: var(--radius-surface);
    background: var(--bg);
    color: var(--ink);
    border: 1px solid var(--line);
  }
  .theme h3 {
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-strong);
  }
  .sw-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
    gap: 8px;
  }
  .sw {
    display: grid;
    gap: 4px;
  }
  .chip-color {
    height: 36px;
    border-radius: 6px;
    border: 1px solid var(--line-strong);
  }
  code {
    font-size: 11px;
    color: var(--muted);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    align-items: center;
  }
  .type {
    display: grid;
    gap: 16px;
  }
  .type > div {
    display: grid;
    gap: 4px;
  }
  .objects {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
    align-items: start;
  }
  .object {
    display: grid;
    gap: 6px;
    padding: 14px;
  }
  .object.flush {
    padding: 0;
    overflow: hidden;
  }
  .pad {
    padding: 14px 14px 0;
  }
  .st {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .table-scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    min-width: 640px;
    font-size: 13px;
  }
  th,
  td {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
  }
  thead th {
    font-size: 12px;
    color: var(--muted);
  }
  .adaptive {
    display: grid;
    gap: 8px;
    padding-left: 18px;
    list-style: disc;
  }
</style>
