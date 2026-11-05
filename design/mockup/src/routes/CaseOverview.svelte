<script lang="ts">
  import KindIcon from "../components/KindIcon.svelte";
  import { ArrowRight, ArrowUp, CalendarClock, FilePlus2, Mic, Upload } from "@lucide/svelte";
  import FindingLink from "../components/FindingLink.svelte";
  import HearingRow from "../components/HearingRow.svelte";
  import Avatar from "../components/Avatar.svelte";
  import { fmtClock, fmtDate, l, t } from "../lib/i18n";
  import { live } from "../lib/live.svelte";
  import { roleTone } from "../lib/people";
  import { go, href } from "../lib/router.svelte";
  import { suggestionsFor } from "../lib/services";
  import {
    caseById,
    connectionsOfCase,
    docsOf,
    findingsOf,
    findingsOfCase,
    findingsPath,
    hearing,
    hearingsOf,
    needsLook,
    openAssistant,
    passagesOfCase,
    speaker,
    speakerName,
    statementsOf,
    ui,
  } from "../lib/store.svelte";

  let { caseId }: { caseId: string } = $props();

  let c = $derived(caseById(caseId)!);
  let hs = $derived(hearingsOf(caseId));
  let all = $derived(findingsOfCase(caseId));
  let attention = $derived(all.filter(needsLook));
  let docs = $derived(docsOf(caseId));
  let links = $derived(connectionsOfCase(caseId));
  let suggested = $derived(links.filter((x) => !x.reviewed).length);
  let liveH = $derived(hearing(live.hearingId)?.caseId === caseId && live.status !== "idle" ? hearing(live.hearingId) : undefined);
  let empty = $derived(docs.length === 0 && hs.length === 0);
  let question = $state("");


  function ask(text?: string) {
    const q = (text ?? question).trim();
    if (!q) return;
    question = "";
    openAssistant({ kind: "case" }, q, undefined, true);
  }
</script>

<div class="page">
  <header class="hero">
    <div class="hero-text">
      <div class="labels">
        <span class="tag">{t(`label.${c.label}`)}</span>
        {#if c.reference}<span class="small muted tabular">{c.reference}</span>{/if}
      </div>
      <h1 class="t-title">{c.title}</h1>
      <p class="summary">{l(c.summary)}</p>
      <dl class="meta">
        <div><dt>{t("ov.client")}</dt><dd>{c.client}</dd></div>
        <div><dt>{t("ov.court")}</dt><dd>{c.court}</dd></div>
      </dl>
    </div>
    <div class="hero-actions">
      <button class="btn btn-live" onclick={() => (ui.modal = { kind: "newHearing", flow: "live" })}><Mic size={16} />{t("ov.startLive")}</button>
      <button class="btn" onclick={() => (ui.modal = { kind: "newHearing", flow: "upload" })}><Upload size={16} />{t("ov.uploadAudio")}</button>
      <button class="btn" onclick={() => go(`/case/${caseId}/documents`)}><FilePlus2 size={16} />{t("ov.addDocuments")}</button>
    </div>
  </header>

  {#if empty}
    <section class="start">
      <h2 class="t-serif">{t("ov.emptyTitle")}</h2>
      <p class="muted">{t("ov.emptyText")}</p>
      <ul class="start-rows">
        <li>
          <button onclick={() => go(`/case/${caseId}/documents`)}>
            <span class="start-icon"><KindIcon kind="document" size={20} /></span>
            <span><strong>{t("ov.addDocs")}</strong><span class="small muted">{t("ov.addDocsText")}</span></span>
            <ArrowRight size={18} />
          </button>
        </li>
        <li>
          <button onclick={() => (ui.modal = { kind: "newHearing" })}>
            <span class="start-icon"><KindIcon kind="hearing" size={20} /></span>
            <span><strong>{t("ov.addHearing")}</strong><span class="small muted">{t("ov.addHearingText")}</span></span>
            <ArrowRight size={18} />
          </button>
        </li>
      </ul>
      <p class="small muted">{t("ov.thenText")}</p>
    </section>
  {:else}
    <div class="grid">
      {#if liveH}
        {@const latest = statementsOf(liveH.id).at(-1)}
        {@const liveOpen = findingsOf(liveH.id).filter(needsLook).length}
        <section class="card live-card span-all">
          <div class="live-head">
            <span class="live-state"><span class="live-dot"></span>{t("live.badge")} · <span class="tabular">{fmtClock(live.elapsed)}</span></span>
            <h2 class="t-serif">{t("ov.liveTitle", { n: liveH.number })}</h2>
            <p class="small muted">{t("attn.listening")} · {#if liveOpen}<a class="live-count" href={href(findingsPath(caseId, { hearing: liveH.id }))}>{t("attn.count", { n: liveOpen })}</a>{:else}{t("attn.none")}{/if}</p>
          </div>
          {#if live.partial || latest}
            {@const who = speaker(live.partial ? live.partialSpeaker : (latest?.speakerId ?? ""))}
            <div class="live-now">
              <Avatar id={who?.id ?? ""} size="md" speaking={!!live.partial && live.status === "recording"} />
              <div class="live-now-text">
                <span class="live-name" data-tone={roleTone(who?.role)}>{speakerName(who)}</span>
                <blockquote class="live-quote clamp-2">“{live.partial || latest?.text}”</blockquote>
              </div>
            </div>
          {/if}
          <button class="btn btn-live" onclick={() => go(`/case/${caseId}/hearings/${liveH.id}`)}>{t("ov.openLive")}<ArrowRight size={16} /></button>
        </section>
      {/if}

      <section class="card review">
        <header class="card-head">
          <h2><KindIcon kind="finding" size={16} />{t("attn.title")}</h2>
          {#if attention.length}<span class="badge badge-amber">{attention.length}</span>{/if}
        </header>
        {#if attention.length}
          <div class="list">
            {#each attention.slice(0, 3) as f (f.id)}<FindingLink {f} showHearing />{/each}
          </div>
          <button class="btn btn-primary" onclick={() => go(`/case/${caseId}/findings`)}>{t("ov.startReview")}<ArrowRight size={16} /></button>
        {:else}
          <p class="big">{all.length ? t("attn.allChecked") : t("hv.noFindingsTitle")}</p>
        {/if}
      </section>

      <section class="card next">
        <header class="card-head"><h2><KindIcon kind="hearing" size={16} />{t("ov.next")}</h2></header>
        {#if c.nextHearing}
          <div class="next-row">
            <span class="cal">
              <span class="cal-day tabular">{fmtDate(c.nextHearing.date, { day: "numeric" })}</span>
              <span class="cal-month">{fmtDate(c.nextHearing.date, { month: "short" })}</span>
            </span>
            <span>
              <strong>{l(c.nextHearing.title)}</strong>
              <span class="small muted">{fmtDate(c.nextHearing.date, { weekday: "long" })} · {c.nextHearing.time} WIB</span>
            </span>
          </div>
          <div class="row">
            <button class="btn" onclick={() => openAssistant({ kind: "case" }, l(suggestionsFor({ kind: "case" })[2].text), undefined, true)}>{t("ov.prepare")}</button>
          </div>
        {:else}
          <p class="small muted"><CalendarClock size={14} /> —</p>
        {/if}
      </section>

      <section class="card hearings">
        <header class="card-head">
          <h2><KindIcon kind="hearing" size={16} />{t("nav.hearings")}</h2>
          <a class="link-btn" href={`#/case/${caseId}/hearings`}>{t("ov.allHearings")}<ArrowRight size={14} /></a>
        </header>
        <div>
          {#each hs as h (h.id)}
            <HearingRow {h} compact />
          {:else}
            <p class="small muted">{t("hearings.emptyText")}</p>
          {/each}
        </div>
      </section>

      <section class="card documents">
        <header class="card-head">
          <h2><KindIcon kind="document" size={16} />{t("nav.documents")}</h2>
          <a class="link-btn" href={`#/case/${caseId}/documents`}>{t("ov.openDocuments")}<ArrowRight size={14} /></a>
        </header>
        <p class="small">{t("ov.documentsText", { docs: docs.length, passages: passagesOfCase(caseId).length, links: links.length })}</p>
        {#if suggested}<p class="notice notice-sand">{t("ov.suggestedLinks", { n: suggested })}</p>{/if}
        <ul class="docs">
          {#each docs.slice(0, 4) as d (d.id)}
            <li><a href={`#/case/${caseId}/documents/${d.id}`}><KindIcon kind="document" size={14} /><span>{d.title}</span><span class="xsmall muted">{t("docs.pages", { n: d.pages })}</span></a></li>
          {/each}
        </ul>
      </section>

      <section class="card ask">
        <header class="card-head"><h2><KindIcon kind="assistant" size={16} />{t("ov.ask")}</h2></header>
        <form class="ask-form" onsubmit={(e) => { e.preventDefault(); ask(); }}>
          <label class="sr-only" for="ov-ask">{t("ov.ask")}</label>
          <input id="ov-ask" class="field" placeholder={t("ov.askPlaceholder")} bind:value={question} />
          <button class="btn btn-primary btn-icon" aria-label={t("as.send")} disabled={!question.trim()}><ArrowUp size={18} /></button>
        </form>
        <div class="chips">
          {#each suggestionsFor({ kind: "case" }) as s (s.text.en)}
            <button class="chip" onclick={() => ask(l(s.text))}>{l(s.text)}</button>
          {/each}
        </div>
      </section>
    </div>
  {/if}
</div>

<style>
  .hero {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 18px 32px;
    margin-bottom: 26px;
  }
  .hero-text {
    display: grid;
    gap: 8px;
    max-width: 760px;
  }
  .labels {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .hero h1 {
    font-size: clamp(28px, 4.4cqi, 40px);
  }
  .summary {
    color: var(--ink);
    font-size: 15px;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 26px;
    font-size: var(--text-sm);
  }
  .meta div {
    display: flex;
    gap: 6px;
  }
  .meta dt {
    color: var(--muted);
  }
  .meta dd {
    color: var(--ink-strong);
    font-weight: 500;
  }
  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .grid {
    display: grid;
    gap: 16px;
    grid-template-columns: 1fr;
  }
  @container main (min-width: 760px) {
    .grid {
      grid-template-columns: 1fr 1fr;
    }
    .review {
      grid-row: span 2;
    }
  }
  @container main (min-width: 1180px) {
    .grid {
      grid-template-columns: 1.15fr 1fr 1fr;
    }
    .hearings {
      grid-column: span 2;
    }
  }
  .span-all {
    grid-column: 1 / -1;
  }
  .card {
    display: grid;
    gap: 12px;
    padding: 18px;
    align-content: start;
    min-width: 0;
  }
  .card-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }
  .card-head h2 {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-strong);
  }
  .card-head h2 :global(svg) {
    color: var(--muted);
  }
  .big {
    font-family: var(--font-serif);
    font-size: 23px;
    line-height: 1.25;
    color: var(--ink-strong);
  }
  .live-card {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    border-color: color-mix(in srgb, var(--live) 35%, var(--line));
    background: linear-gradient(90deg, var(--live-soft), var(--surface) 70%);
  }
  .live-head {
    display: grid;
    gap: 4px;
  }
  .live-head h2 {
    font-size: 22px;
  }
  .live-state {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    font-weight: 700;
    color: var(--live);
  }
  .live-now {
    grid-column: 1 / -1;
    grid-row: 2;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;
  }
  .live-now-text {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .live-name {
    font-size: 13px;
    font-weight: 700;
    color: var(--tone);
  }
  .live-quote {
    font-size: 16px;
    font-weight: 500;
    color: var(--ink-strong);
  }
  @container main (max-width: 640px) {
    .live-card {
      grid-template-columns: 1fr;
    }
    .live-now {
      grid-row: auto;
    }
  }
  .list {
    display: grid;
    margin: 0 -10px;
  }
  .live-count {
    color: var(--ink-strong);
    font-weight: 600;
  }
  .review > .btn {
    justify-self: start;
  }
  .next-row {
    display: flex;
    gap: 14px;
    align-items: center;
  }
  .next-row > span:last-child {
    display: grid;
    gap: 2px;
  }
  .cal {
    display: grid;
    place-items: center;
    width: 56px;
    height: 60px;
    border-radius: var(--radius-action);
    border: 1px solid var(--line-strong);
    background: var(--surface-2);
    line-height: 1.1;
  }
  .cal-day {
    font-family: var(--font-title);
    font-size: 24px;
    color: var(--ink-strong);
  }
  .cal-month {
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .docs {
    display: grid;
    gap: 2px;
  }
  .docs a {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    font-size: 13px;
    text-decoration: none;
    color: var(--ink-strong);
    border-bottom: 1px solid var(--line);
  }
  .docs a span:first-of-type {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .docs a:hover span:first-of-type {
    text-decoration: underline;
  }
  .ask-form {
    display: flex;
    gap: 8px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chips .chip {
    white-space: normal;
    text-align: left;
    min-height: 32px;
    padding: 6px 12px;
    border-radius: 16px;
  }
  .start {
    display: grid;
    gap: 12px;
    max-width: 760px;
  }
  .start h2 {
    font-size: 28px;
  }
  .start-rows {
    border-top: 1px solid var(--line);
  }
  .start-rows button {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    padding: 18px 4px;
    border-bottom: 1px solid var(--line);
    text-align: left;
  }
  .start-rows button > span:nth-child(2) {
    flex: 1;
    display: grid;
    gap: 2px;
  }
  .start-rows button:hover strong {
    text-decoration: underline;
  }
  .start-icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--selected);
    color: var(--ink-strong);
  }
</style>
