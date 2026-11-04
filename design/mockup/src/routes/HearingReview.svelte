<script lang="ts">
  import {
    ChevronLeft,
    Download,
    FileText,
    MessageSquare,
    Pause,
    Play,
    RotateCcw,
    RotateCw,
    Search,
    SkipForward,
  } from "@lucide/svelte";
  import { tick, untrack } from "svelte";
  import FindingDetail from "../components/FindingDetail.svelte";
  import FindingRow from "../components/FindingRow.svelte";
  import SpeakerTag from "../components/SpeakerTag.svelte";
  import StatusChip from "../components/StatusChip.svelte";
  import Waveform from "../components/Waveform.svelte";
  import { fmtClock, fmtDate, fmtDuration, l, t } from "../lib/i18n";
  import { href, route } from "../lib/router.svelte";
  import {
    finding,
    findingForStatement,
    findingsOf,
    hearing,
    inspect,
    openAssistant,
    setReviewed,
    speaker,
    speakerName,
    statement,
    statementsOf,
    toastT,
    ui,
  } from "../lib/store.svelte";

  let { hearingId }: { hearingId: string } = $props();

  let h = $derived(hearing(hearingId)!);
  let all = $derived(statementsOf(hearingId));
  let findings = $derived(findingsOf(hearingId));
  let open = $derived(findings.filter((f) => !f.reviewed));
  let audio = $derived(h.mode === "recorded");
  let duration = $derived(h.duration ?? Math.max(60, (all.at(-1)?.t ?? 0) + 30));

  let width = $state(0);
  let layout = $derived(width >= 1180 ? "three" : width >= 760 ? "two" : "one");
  let tab = $state<"transcript" | "findings">("transcript");
  let filter = $state<"all" | "open">("all");
  let selected = $state<string | null>(null);
  let query = $state("");
  let speakerFilter = $state("");
  let highlight = $state<string | null>(null);

  // Simulated playback.
  let playing = $state(false);
  let time = $state(0);
  let rate = $state(1);
  let followPlayback = $state(true);
  let current = $derived.by(() => {
    let id: string | null = null;
    for (const s of all) if (s.t <= time) id = s.id;
    return id;
  });

  $effect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      time = Math.min(duration, time + 0.25 * rate);
      if (time >= duration) playing = false;
    }, 250);
    return () => clearInterval(timer);
  });

  let list: HTMLElement | undefined = $state();
  $effect(() => {
    const id = current;
    if (!playing || !followPlayback || !id) return;
    untrack(() => list?.querySelector(`[data-sid="${id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  });

  // Deep links: ?s=statement highlights a line, ?f=finding selects a finding.
  $effect(() => {
    const s = route.query.s;
    const f = route.query.f;
    untrack(() => {
      if (f && finding(f)) selected = f;
      else if (!selected && findings.length && layout !== "one") selected = (open[0] ?? findings[0]).id;
      if (s && statement(s)) {
        highlight = s;
        time = statement(s)!.t;
        tick().then(() => list?.querySelector(`[data-sid="${s}"]`)?.scrollIntoView({ block: "center" }));
      }
    });
  });

  let speakersHere = $derived([...new Set(all.map((s) => s.speakerId))]);
  let shown = $derived(
    all.filter(
      (s) =>
        (!speakerFilter || s.speakerId === speakerFilter) &&
        (!query.trim() || s.text.toLowerCase().includes(query.trim().toLowerCase())),
    ),
  );
  let visibleFindings = $derived(filter === "open" ? open : findings);
  let queue = $derived(visibleFindings.map((f) => f.id));

  function parts(text: string) {
    const q = query.trim();
    if (!q) return [{ text, hit: false }];
    const out: { text: string; hit: boolean }[] = [];
    const lower = text.toLowerCase();
    let i = 0;
    while (i < text.length) {
      const j = lower.indexOf(q.toLowerCase(), i);
      if (j < 0) {
        out.push({ text: text.slice(i), hit: false });
        break;
      }
      if (j > i) out.push({ text: text.slice(i, j), hit: false });
      out.push({ text: text.slice(j, j + q.length), hit: true });
      i = j + q.length;
    }
    return out;
  }

  function select(id: string) {
    if (layout === "one") inspect({ kind: "finding", id }, queue);
    else selected = id;
    const f = finding(id);
    const s = f ? statement(f.statementId) : undefined;
    if (s) {
      highlight = s.id;
      if (audio && !playing) time = s.t;
      tick().then(() => list?.querySelector(`[data-sid="${s.id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    }
  }

  function step(delta: number) {
    const i = selected ? queue.indexOf(selected) : -1;
    const next = queue[Math.max(0, Math.min(queue.length - 1, i + delta))];
    if (next) select(next);
  }

  function nextUnreviewed() {
    const start = selected ? findings.findIndex((f) => f.id === selected) : -1;
    const ordered = [...findings.slice(start + 1), ...findings.slice(0, start + 1)];
    const next = ordered.find((f) => !f.reviewed);
    if (next) select(next.id);
  }

  function seek(seconds: number) {
    time = seconds;
  }

  function onkeydown(event: KeyboardEvent) {
    const el = event.target as HTMLElement;
    if (ui.modal || ui.inspector || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === "j") step(1);
    else if (key === "k") step(-1);
    else if (key === "r" && selected) {
      const f = finding(selected);
      if (f) setReviewed(f, !f.reviewed);
    } else if (key === "c" && selected) {
      void navigator.clipboard?.writeText(finding(selected)?.question ?? "").catch(() => {});
      toastT("toast.copied");
    } else if (key === " " && audio && el.tagName !== "BUTTON") {
      playing = !playing;
    } else return;
    event.preventDefault();
  }
</script>

<svelte:window {onkeydown} />

{#snippet transcript()}
  <div class="tools">
    <div class="search grow">
      <Search size={15} />
      <label class="sr-only" for="t-search">{t("hv.search")}</label>
      <input id="t-search" class="field" type="search" placeholder={t("hv.search")} bind:value={query} />
    </div>
    <label class="sr-only" for="t-speaker">{t("hv.allSpeakers")}</label>
    <select id="t-speaker" class="field speaker-select" bind:value={speakerFilter}>
      <option value="">{t("hv.allSpeakers")}</option>
      {#each speakersHere as id (id)}<option value={id}>{speakerName(speaker(id))}</option>{/each}
    </select>
  </div>
  {#if query || speakerFilter}
    <div class="filter-status small" role="status">
      <span class="tabular">{t("hv.shownOf", { shown: shown.length, total: all.length })}</span>
      <button class="link-btn" onclick={() => { query = ""; speakerFilter = ""; }}>{t("common.clearFilters")}</button>
    </div>
  {/if}
  <ol class="lines scroll-y" bind:this={list} aria-label={t("hv.transcript")}>
    {#each shown as s (s.id)}
      {@const f = findingForStatement(s.id)}
      <li class="line" data-sid={s.id} class:current={audio && current === s.id} class:highlight={highlight === s.id} class:has-finding={!!f}>
        <button class="time tabular" disabled={!audio} onclick={() => { seek(s.t); playing = true; }} aria-label={audio ? t("hv.playFrom", { time: fmtClock(s.t) }) : fmtClock(s.t)}>{fmtClock(s.t)}</button>
        <div class="line-body">
          <SpeakerTag id={s.speakerId} />
          <p>{#each parts(s.text) as p, i (i)}{#if p.hit}<mark>{p.text}</mark>{:else}{p.text}{/if}{/each}</p>
        </div>
        {#if f}
          <button class="finding-link" onclick={() => select(f.id)} aria-label={`${t("hv.openFinding")}: ${t(`status.${f.status}`)}`}>
            <StatusChip status={f.status} size="sm" />
          </button>
        {/if}
      </li>
    {:else}
      <li class="none small muted">{t("hv.noMatch")}</li>
    {/each}
  </ol>
{/snippet}

{#snippet findingList()}
  <div class="pane-head">
    <h2>{t("hv.findings")}</h2>
    <div class="seg" role="group" aria-label={t("fd.needsReview")}>
      <button aria-pressed={filter === "all"} onclick={() => (filter = "all")}>{t("hv.all")} {findings.length}</button>
      <button aria-pressed={filter === "open"} onclick={() => (filter = "open")}>{t("hv.needsReview")} {open.length}</button>
    </div>
  </div>
  {#if findings.length === 0}
    <div class="empty-pane">
      <p class="t-serif">{t("hv.noFindingsTitle")}</p>
      <p class="small muted">{t("hv.noFindingsText")}</p>
    </div>
  {:else}
    <div class="progress">
      <span class="small tabular">{t("common.reviewedOf", { done: findings.length - open.length, total: findings.length })}</span>
      <span class="meter"><span style:width="{((findings.length - open.length) / findings.length) * 100}%"></span></span>
      <button class="btn btn-sm" disabled={!open.length} onclick={nextUnreviewed}><SkipForward size={14} />{t("hv.nextUnreviewed")}</button>
    </div>
    <div class="flist scroll-y">
      {#each visibleFindings as f (f.id)}
        <FindingRow {f} showHearing={false} selected={selected === f.id && layout !== "one"} onclick={() => select(f.id)} />
      {:else}
        <p class="empty-pane small muted">{t("fd.queueDone")}</p>
      {/each}
    </div>
  {/if}
{/snippet}

{#snippet detail()}
  {#if selected}
    {@const i = queue.indexOf(selected)}
    <FindingDetail
      id={selected}
      inHearing
      onplay={audio ? (s) => { seek(s); playing = true; } : undefined}
      nav={i >= 0 ? { index: i, total: queue.length, prev: () => step(-1), next: () => step(1) } : undefined}
    />
  {:else}
    <p class="empty-pane small muted">{t("hv.selectFinding")}</p>
  {/if}
{/snippet}

<div class="review" bind:clientWidth={width}>
  <header class="head">
    <a class="back" href={href(`/case/${h.caseId}/hearings`)}><ChevronLeft size={16} />{t("hv.allHearings")}</a>
    <div class="title-row">
      <h1 class="t-serif"><span class="num">{t("common.hearingN", { n: h.number })}</span> {l(h.title)}</h1>
      <div class="actions">
        <button class="btn" onclick={() => openAssistant({ kind: "hearing", id: h.id })}><MessageSquare size={16} />{t("top.ask")}</button>
        <button class="btn" onclick={() => toastT("toast.exported")}><Download size={16} />{t("hv.export")}</button>
      </div>
    </div>
    <p class="meta small muted">
      {fmtDate(h.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {t(`mode.${h.mode}`)}{h.duration ? ` · ${fmtDuration(h.duration)}` : ""} · {t("common.statements", { n: all.length })}
    </p>
  </header>

  {#if audio}
    <div class="player" role="group" aria-label={t("hv.audioSim")}>
      <button class="btn btn-ghost btn-icon" aria-label={t("hv.back10")} onclick={() => seek(Math.max(0, time - 10))}><RotateCcw size={17} /></button>
      <button class="btn btn-primary btn-icon play" aria-label={playing ? t("hv.pause") : t("hv.play")} onclick={() => (playing = !playing)}>
        {#if playing}<Pause size={18} />{:else}<Play size={18} />{/if}
      </button>
      <button class="btn btn-ghost btn-icon" aria-label={t("hv.fwd10")} onclick={() => seek(Math.min(duration, time + 10))}><RotateCw size={17} /></button>
      <span class="clock tabular small">{fmtClock(time)} / {fmtClock(duration)}</span>
      <Waveform {duration} {time} markers={findings} statementOf={(f) => statement(f.statementId)} onseek={seek} onmarker={(f) => select(f.id)} />
      <label class="sr-only" for="rate">{t("hv.speed")}</label>
      <select id="rate" class="field rate" bind:value={rate}>
        <option value={1}>1×</option>
        <option value={1.5}>1.5×</option>
        <option value={2}>2×</option>
      </select>
      <label class="follow small"><input type="checkbox" bind:checked={followPlayback} />{t("hv.followPlayback")}</label>
      <span class="sim xsmall muted">{t("hv.audioSim")}</span>
    </div>
  {:else}
    <p class="notice"><FileText size={14} />{t("hv.noAudio")}</p>
  {/if}

  {#if layout === "one"}
    <div class="seg tabs" role="tablist">
      <button role="tab" aria-selected={tab === "transcript"} onclick={() => (tab = "transcript")}>{t("hv.transcript")}</button>
      <button role="tab" aria-selected={tab === "findings"} onclick={() => (tab = "findings")}>{t("hv.findings")} <span class="badge" class:badge-amber={open.length > 0}>{open.length || findings.length}</span></button>
    </div>
    <section class="pane one">
      {#if tab === "transcript"}{@render transcript()}{:else}{@render findingList()}{/if}
    </section>
  {:else}
    <div class="body {layout}">
      <section class="pane tpane" aria-label={t("hv.transcript")}>{@render transcript()}</section>
      {#if layout === "three"}
        <section class="pane lpane" aria-label={t("hv.findings")}>{@render findingList()}</section>
        <section class="pane dpane scroll-y" aria-label={t("fd.title")}>{@render detail()}</section>
      {:else}
        <section class="pane rpane" aria-label={t("hv.findings")}>
          {#if selected}
            <button class="back-row" onclick={() => (selected = null)}><ChevronLeft size={16} />{t("hv.findings")} · {t("common.toReview", { n: open.length })}</button>
            <div class="scroll-y fill">{@render detail()}</div>
          {:else}
            {@render findingList()}
          {/if}
        </section>
      {/if}
    </div>
  {/if}
</div>

<style>
  .review {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px clamp(12px, 2.4cqi, 28px) 16px;
    min-height: calc(100dvh - var(--topbar-h));
  }
  .head {
    display: grid;
    gap: 6px;
  }
  .back,
  .back-row {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
    text-decoration: none;
    width: fit-content;
    min-height: 28px;
  }
  .back:hover,
  .back-row:hover {
    color: var(--ink-strong);
  }
  .back-row {
    width: 100%;
    padding: 10px 14px;
    border-bottom: 1px solid var(--line);
  }
  .title-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px 20px;
  }
  h1 {
    font-size: clamp(21px, 3cqi, 30px);
    line-height: 1.2;
  }
  .num {
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    vertical-align: 3px;
    margin-right: 4px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .player {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 10px;
    padding: 8px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius-action);
    background: var(--surface);
    position: sticky;
    top: calc(var(--topbar-h) + 6px);
    z-index: 5;
  }
  .play {
    border-radius: 50%;
  }
  .clock {
    white-space: nowrap;
    min-width: 128px;
  }
  .player :global(.wave) {
    flex: 1 1 220px;
  }
  .rate {
    width: auto;
    min-height: 32px;
    padding: 2px 26px 2px 8px;
    font-size: 12px;
  }
  .follow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .follow input {
    accent-color: var(--primary);
  }
  .sim {
    font-style: italic;
  }
  .body {
    flex: 1;
    display: grid;
    gap: 14px;
    min-height: 0;
  }
  .body.two {
    grid-template-columns: minmax(0, 1fr) minmax(340px, 0.9fr);
  }
  .body.three {
    grid-template-columns: minmax(0, 0.85fr) 300px minmax(420px, 1.15fr);
  }
  .pane {
    display: flex;
    flex-direction: column;
    min-height: 0;
    max-height: calc(100dvh - var(--topbar-h) - 190px);
    overflow: hidden;
  }
  .pane.one {
    max-height: none;
    overflow: visible;
  }
  .dpane {
    display: block;
  }
  .fill {
    flex: 1;
    min-height: 0;
  }
  .tabs {
    display: flex;
  }
  .tabs button {
    flex: 1;
    justify-content: center;
  }
  .tools {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--line);
  }
  .grow {
    flex: 1 1 200px;
  }
  .speaker-select {
    width: auto;
    flex: 0 1 200px;
  }
  .filter-status {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 6px 14px;
    background: var(--sunken);
  }
  .lines {
    flex: 1;
    min-height: 0;
  }
  .one .lines {
    overflow: visible;
  }
  .line {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 10px;
    padding: var(--row-pad) 14px;
    border-bottom: 1px solid var(--line);
    align-items: start;
  }
  .line.current {
    background: color-mix(in srgb, var(--live-soft) 60%, transparent);
    box-shadow: inset 3px 0 0 var(--live);
  }
  .line.highlight {
    background: var(--selected);
  }
  .line-body {
    display: grid;
    gap: 3px;
    min-width: 0;
  }
  .line-body p {
    color: var(--ink-strong);
    line-height: 1.5;
  }
  .time {
    font-size: 11.5px;
    color: var(--muted);
    padding: 2px 4px;
    border-radius: 4px;
    margin-top: 1px;
  }
  .time:not(:disabled):hover {
    background: var(--sunken);
    color: var(--ink-strong);
  }
  .time:disabled {
    opacity: 1;
    cursor: default;
  }
  .finding-link {
    border-radius: 4px;
  }
  .none {
    padding: 20px 14px;
  }
  .progress {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 10px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--line);
  }
  .meter {
    flex: 1 1 60px;
    height: 6px;
    border-radius: 3px;
    background: var(--sunken);
    overflow: hidden;
  }
  .meter span {
    display: block;
    height: 100%;
    background: var(--st-supported-dot);
  }
  .flist {
    flex: 1;
    min-height: 0;
  }
  .one .flist {
    overflow: visible;
  }
  .empty-pane {
    padding: 22px 16px;
    display: grid;
    gap: 6px;
  }
  .empty-pane .t-serif {
    font-size: 20px;
  }
  @container main (max-width: 900px) {
    .player :global(.wave) {
      order: 10;
      flex-basis: 100%;
    }
  }
  @container main (max-width: 759px) {
    .player {
      position: static;
    }
    .clock {
      min-width: 0;
    }
    .sim {
      display: none;
    }
  }
</style>
