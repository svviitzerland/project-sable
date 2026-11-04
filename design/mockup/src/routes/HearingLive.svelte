<script lang="ts">
  import {
    AArrowDown,
    AArrowUp,
    ArrowDown,
    ChevronLeft,
    Columns2,
    Flag,
    LoaderCircle,
    MessageSquare,
    Mic,
    Moon,
    Pause,
    Play,
    Scale,
    Square,
    Sun,
    Captions,
  } from "@lucide/svelte";
  import { tick } from "svelte";
  import FindingDetail from "../components/FindingDetail.svelte";
  import FindingRow from "../components/FindingRow.svelte";
  import SpeakerTag from "../components/SpeakerTag.svelte";
  import StatusChip from "../components/StatusChip.svelte";
  import { fmtClock, fmtDate, l, t } from "../lib/i18n";
  import { isLive, live, pause, resume } from "../lib/live.svelte";
  import { prefs } from "../lib/prefs.svelte";
  import { href } from "../lib/router.svelte";
  import {
    findingForStatement,
    findingsOf,
    hearing,
    inspect,
    legalRef,
    openAssistant,
    statementsOf,
    toggleFlag,
    ui,
  } from "../lib/store.svelte";

  let { hearingId, phone }: { hearingId: string; phone: boolean } = $props();

  let h = $derived(hearing(hearingId)!);
  let recording = $derived(live.hearingId === hearingId && live.status !== "idle");
  let statements = $derived(statementsOf(hearingId));
  let feed = $derived(findingsOf(hearingId).slice().reverse());
  let freshCount = $derived(feed.filter((f) => f.isNew).length);
  let width = $state(0);
  let wide = $derived(width >= 720);
  let roomForDetail = $derived(width >= 980);
  let tab = $state<"transcript" | "findings">("transcript");
  let selected = $state<string | null>(null);
  let follow = $state(true);
  let baseline = $state(0);
  let behind = $derived(follow ? 0 : Math.max(0, statements.length - baseline));
  let scroller: HTMLElement | undefined = $state();
  let announce = $state("");
  const sizes = [14, 16, 19, 23];

  $effect(() => {
    if (recording && live.unseen) live.unseen = 0;
  });

  // Announce findings politely without reading every caption aloud.
  let lastFeed = 0;
  $effect(() => {
    const n = feed.length;
    if (n > lastFeed && lastFeed !== 0) announce = `${t("live.newFinding")}: ${t(`status.${feed[0].status}`)}. ${l(feed[0].title)}`;
    lastFeed = n;
  });

  $effect(() => {
    void statements.length;
    void live.partial;
    void tab;
    void prefs.liveLayout;
    if (follow) tick().then(() => scroller?.scrollTo({ top: scroller.scrollHeight }));
  });

  function onscroll() {
    if (!scroller) return;
    const atBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 48;
    if (!atBottom && follow) {
      follow = false;
      baseline = statements.length;
    } else if (atBottom && !follow) {
      follow = true;
    }
  }

  function jumpToLatest() {
    follow = true;
    scroller?.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
  }

  function openFinding(id: string) {
    if (roomForDetail && prefs.liveLayout === "split") selected = id;
    else inspect({ kind: "finding", id }, feed.map((f) => f.id));
  }

  const busyPhase = (p?: string) => p === "queued" || p === "retrieving" || p === "analyzing" || p === "reviewing";
</script>

{#snippet transcriptList()}
  <ol class="transcript" aria-label={t("hv.transcript")}>
    {#each statements as s (s.id)}
      {@const f = findingForStatement(s.id)}
      <li class="st" class:flagged={s.flagged}>
        <div class="st-meta">
          <time class="tabular">{fmtClock(s.t)}</time>
          <SpeakerTag id={s.speakerId} />
          {#if busyPhase(s.phase)}
            <span class="phase"><LoaderCircle size={12} class="spin" />{t(`phase.${s.phase!}`)}</span>
          {/if}
          {#if s.flagged}<span class="flag-tag"><Flag size={11} />{t("live.flagged")}</span>{/if}
          {#if f}
            <button class="finding-link" onclick={() => openFinding(f.id)} aria-label={`${t("hv.openFinding")}: ${t(`status.${f.status}`)}`}><StatusChip status={f.status} size="sm" /></button>
          {/if}
        </div>
        <p class="st-text">
          {s.text}
          {#each s.legal ?? [] as lid (lid)}
            {@const ref = legalRef(lid)}
            {#if ref && prefs.pasal}
              <button class="mention" onclick={() => inspect({ kind: "legal", id: lid })} title={t("live.legalMention")}><Scale size={12} />{ref.article}</button>
            {/if}
          {/each}
        </p>
        <div class="st-actions">
          <button class="icon-btn" aria-pressed={!!s.flagged} aria-label={s.flagged ? t("live.unflag") : t("live.flag")} title={s.flagged ? t("live.unflag") : t("live.flag")} onclick={() => toggleFlag(s)}><Flag size={14} /></button>
        </div>
      </li>
    {/each}
    {#if recording && live.partial}
      <li class="st partial">
        <div class="st-meta">
          <span class="tabular listening">{t("live.listening")}</span>
          <SpeakerTag id={live.partialSpeaker} compact />
        </div>
        <p class="st-text">{live.partial}<span class="caret" aria-hidden="true"></span></p>
      </li>
    {:else if recording}
      <li class="waiting small muted">{live.status === "paused" ? t("live.paused") : t("live.waiting")}</li>
    {/if}
  </ol>
{/snippet}

{#snippet feedList()}
  {#if selected && roomForDetail}
    <div class="feed-detail">
      <button class="back-link" onclick={() => (selected = null)}><ChevronLeft size={16} />{t("live.feed")}</button>
      <div class="scroll-y detail-scroll">
        <FindingDetail id={selected} inHearing />
      </div>
    </div>
  {:else}
    <div class="feed scroll-y">
      {#each feed as f (f.id)}
        <FindingRow {f} showHearing={false} onclick={() => openFinding(f.id)} />
      {:else}
        <p class="feed-empty small muted">{t("live.feedEmpty")}</p>
      {/each}
    </div>
  {/if}
{/snippet}

<div class="live-page" class:phone bind:clientWidth={width} style:--live-size="{sizes[prefs.liveText] ?? 16}px">
  <header class="head">
    <div class="head-top">
      <a class="back" href={href(`/case/${h.caseId}/hearings`)}><ChevronLeft size={16} />{t("hv.allHearings")}</a>
      <span class="small muted">{fmtDate(h.date)}{h.time ? ` · ${h.time} WIB` : ""}</span>
    </div>
    <h1 class="t-serif"><span class="num">{t("common.hearingN", { n: h.number })}</span> {l(h.title)}</h1>

    {#if recording}
      <div class="controls">
        <span class="rec" class:paused={live.status !== "recording"}>
          {#if live.status === "recording"}<span class="live-dot"></span>{:else}<span class="pause-dot"></span>{/if}
          <span>{live.status === "connecting" ? t("live.connecting") : live.status === "paused" ? t("live.paused") : t("live.recording")}</span>
          <span class="tabular clock">{fmtClock(live.elapsed)}</span>
        </span>
        {#if !phone}<span class="xsmall muted keep">{t("live.keepOpen")} · {t("live.keepAwake")}</span>{/if}
        <span class="grow"></span>
        <button
          class="btn"
          class:btn-icon={phone}
          aria-label={live.status === "paused" ? t("live.resume") : t("live.pause")}
          onclick={() => (live.status === "paused" ? resume() : pause())}
          disabled={live.status === "connecting"}
        >
          {#if live.status === "paused"}<Play size={16} />{#if !phone}{t("live.resume")}{/if}{:else}<Pause size={16} />{#if !phone}{t("live.pause")}{/if}{/if}
        </button>
        <button class="btn btn-danger" onclick={() => (ui.modal = { kind: "endLive" })}><Square size={14} />{t("live.end")}</button>
      </div>
      <div class="view" role="group" aria-label={t("live.layout")}>
        <div class="seg">
          <button aria-pressed={prefs.liveLayout === "split"} aria-label={t("live.layoutSplit")} title={t("live.layoutSplit")} onclick={() => (prefs.liveLayout = "split")}><Columns2 size={15} />{#if !phone}{t("live.layoutSplit")}{/if}</button>
          <button aria-pressed={prefs.liveLayout === "focus"} aria-label={t("live.layoutFocus")} title={t("live.layoutFocus")} onclick={() => (prefs.liveLayout = "focus")}><Captions size={15} />{#if !phone}{t("live.layoutFocus")}{/if}</button>
        </div>
        <div class="size" role="group" aria-label={t("live.textSize")}>
          <button class="btn btn-ghost btn-icon" aria-label={t("live.smaller")} disabled={prefs.liveText <= 0} onclick={() => (prefs.liveText -= 1)}><AArrowDown size={17} /></button>
          <button class="btn btn-ghost btn-icon" aria-label={t("live.larger")} disabled={prefs.liveText >= 3} onclick={() => (prefs.liveText += 1)}><AArrowUp size={17} /></button>
        </div>
        <button class="btn btn-ghost" class:btn-icon={phone} aria-label={t("live.courtMode")} aria-pressed={prefs.theme === "night"} title={t("live.courtModeHint")} onclick={() => (prefs.theme = prefs.theme === "night" ? "paper" : "night")}>
          {#if prefs.theme === "night"}<Sun size={16} />{:else}<Moon size={16} />{/if}
          {#if !phone}<span>{t("live.courtMode")}</span>{/if}
        </button>
        <button class="btn btn-ghost" class:btn-icon={phone} aria-label={t("top.ask")} onclick={() => openAssistant({ kind: "hearing", id: h.id })}><MessageSquare size={16} />{#if !phone}<span>{t("top.ask")}</span>{/if}</button>
      </div>
    {/if}
  </header>

  {#if !recording}
    <section class="not-started">
      <span class="ns-icon"><Mic size={22} /></span>
      <h2 class="t-serif">{t("hv.scheduledTitle")}</h2>
      <p class="muted">{t("hv.scheduledText")}</p>
      {#if isLive()}
        <p class="notice notice-sand">{t("nh.busy", { n: hearing(live.hearingId)?.number ?? "" })}</p>
      {/if}
      <div class="ns-actions">
        <button class="btn btn-live" disabled={isLive()} onclick={() => (ui.modal = { kind: "newHearing", flow: "live", hearingId: h.id })}><Mic size={16} />{t("hearings.startNow")}</button>
        <button class="btn" onclick={() => openAssistant({ kind: "case" }, l({ id: "Pertanyaan apa yang perlu saya siapkan untuk sidang berikutnya?", en: "What questions should I prepare for the next hearing?" }), undefined, true)}><MessageSquare size={16} />{t("ov.prepare")}</button>
      </div>
    </section>
  {:else if prefs.liveLayout === "focus"}
    <div class="focus">
      <div class="captions scroll-y" bind:this={scroller} {onscroll}>
        <ol class="caps" aria-label={t("live.recent")}>
          {#each statements.slice(-4) as s, i (s.id)}
            {@const f = findingForStatement(s.id)}
            <li class="cap" class:old={i < statements.slice(-4).length - 1 || !!live.partial}>
              <div class="cap-meta"><SpeakerTag id={s.speakerId} /><time class="tabular xsmall muted">{fmtClock(s.t)}</time>{#if f}<button class="finding-link" onclick={() => openFinding(f.id)}><StatusChip status={f.status} size="sm" /></button>{/if}</div>
              <p>{s.text}</p>
            </li>
          {/each}
          {#if live.partial}
            <li class="cap current">
              <div class="cap-meta"><SpeakerTag id={live.partialSpeaker} compact /><span class="listening xsmall">{t("live.listening")}</span></div>
              <p>{live.partial}<span class="caret" aria-hidden="true"></span></p>
            </li>
          {/if}
        </ol>
      </div>
      <section class="tray" aria-label={t("live.feed")}>
        <h2 class="t-label">{t("live.feed")} · {feed.length}</h2>
        <div class="tray-list">
          {#each feed as f (f.id)}
            <button class="tray-card" class:fresh={f.isNew} onclick={() => openFinding(f.id)}>
              <StatusChip status={f.status} size="sm" />
              <span class="clamp-3">{l(f.title)}</span>
            </button>
          {:else}
            <p class="small muted">{t("live.feedEmpty")}</p>
          {/each}
        </div>
      </section>
    </div>
  {:else if wide}
    <div class="split" class:with-detail={!!selected && roomForDetail}>
      <section class="pane transcript-pane" aria-label={t("hv.transcript")}>
        <div class="scroll-y fill" bind:this={scroller} {onscroll}>{@render transcriptList()}</div>
        {#if !follow}
          <button class="catchup" onclick={jumpToLatest}><ArrowDown size={15} />{behind ? t("live.behind", { n: behind }) : t("live.follow")}</button>
        {/if}
      </section>
      <section class="pane feed-pane" aria-label={t("live.feed")}>
        <div class="pane-head">
          <h2>{t("live.feed")}</h2>
          {#if freshCount}<span class="badge badge-amber">{freshCount} {t("live.newFinding").toLowerCase()}</span>{/if}
        </div>
        {@render feedList()}
      </section>
    </div>
  {:else}
    <div class="stacked">
      <div class="seg tabs" role="tablist" aria-label={t("live.layout")}>
        <button role="tab" aria-selected={tab === "transcript"} onclick={() => (tab = "transcript")}>{t("hv.transcript")}</button>
        <button role="tab" aria-selected={tab === "findings"} onclick={() => (tab = "findings")}>
          {t("hv.findings")} <span class="badge" class:badge-amber={freshCount > 0}>{feed.length}</span>
        </button>
      </div>
      {#if tab === "transcript"}
        <div class="pane fill-pane">
          <div class="scroll-y fill" bind:this={scroller} {onscroll}>{@render transcriptList()}</div>
          {#if !follow}
            <button class="catchup" onclick={jumpToLatest}><ArrowDown size={15} />{behind ? t("live.behind", { n: behind }) : t("live.follow")}</button>
          {/if}
        </div>
      {:else}
        <div class="pane fill-pane">{@render feedList()}</div>
      {/if}
    </div>
  {/if}
  <p class="sr-only" role="status" aria-live="polite">{announce}</p>
</div>

<style>
  .live-page {
    display: flex;
    flex-direction: column;
    height: calc(100dvh - var(--topbar-h));
    padding: 14px clamp(12px, 2.4cqi, 28px) 14px;
    gap: 12px;
    min-height: 480px;
  }
  .live-page.phone {
    height: calc(100dvh - var(--topbar-h) - var(--bottomnav-h) - var(--safe-bottom));
    padding: 10px 10px 8px;
    gap: 8px;
  }
  .head {
    display: grid;
    gap: 8px;
  }
  .head-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .back,
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
    text-decoration: none;
    min-height: 28px;
  }
  .back:hover,
  .back-link:hover {
    color: var(--ink-strong);
  }
  h1 {
    font-size: clamp(20px, 3cqi, 28px);
    line-height: 1.2;
  }
  .phone h1 {
    font-size: 19px;
  }
  .num {
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    vertical-align: 3px;
    margin-right: 4px;
  }
  .controls,
  .view {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .phone .controls,
  .phone .view {
    flex-wrap: nowrap;
    gap: 6px;
  }
  .phone .rec {
    flex: 1;
    min-width: 0;
  }
  .rec {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: var(--radius-pill);
    background: var(--live-soft);
    color: var(--live);
    font-weight: 700;
    font-size: 13px;
  }
  .rec.paused {
    background: var(--sunken);
    color: var(--muted);
  }
  .pause-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: currentColor;
  }
  .clock {
    color: var(--ink-strong);
  }
  .grow {
    flex: 1;
  }
  .phone .grow {
    display: none;
  }
  .size {
    display: inline-flex;
  }
  .view .seg button {
    font-size: 12.5px;
  }
  .split {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 380px);
    gap: 14px;
  }
  .split.with-detail {
    grid-template-columns: minmax(0, 1fr) minmax(380px, 520px);
  }
  .pane {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }
  .fill {
    flex: 1;
    min-height: 0;
  }
  .stacked {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .tabs {
    display: flex;
  }
  .tabs button {
    flex: 1;
    justify-content: center;
  }
  .fill-pane {
    flex: 1;
  }
  .transcript {
    display: grid;
    padding: 6px 0 24px;
  }
  .st {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--line);
  }
  .st.flagged {
    box-shadow: inset 3px 0 0 var(--focus);
  }
  .st-meta {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
  }
  .st-meta time {
    font-size: 11.5px;
    color: var(--muted);
  }
  .st-text {
    font-size: var(--live-size);
    line-height: 1.5;
    color: var(--ink-strong);
  }
  .st-actions {
    display: flex;
    align-items: flex-start;
    gap: 4px;
  }
  .icon-btn {
    display: grid;
    place-items: center;
    width: var(--hit);
    height: var(--hit);
    border-radius: var(--radius-control);
    color: var(--muted);
    opacity: 0;
  }
  .st:hover .icon-btn,
  .icon-btn:focus-visible,
  .icon-btn[aria-pressed="true"] {
    opacity: 1;
  }
  @media (pointer: coarse) {
    .icon-btn {
      opacity: 0.7;
    }
  }
  .icon-btn:hover {
    background: var(--sunken);
    color: var(--ink-strong);
  }
  .icon-btn[aria-pressed="true"] {
    color: var(--focus);
  }
  .finding-link {
    display: inline-flex;
    border-radius: 4px;
  }
  .phase {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
  }
  .phase :global(.spin) {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .flag-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: var(--focus);
  }
  .mention {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 6px;
    padding: 1px 7px;
    border-radius: 4px;
    background: var(--sand);
    color: var(--sand-ink);
    font-size: 12px;
    font-weight: 600;
    vertical-align: 2px;
  }
  .partial .st-text {
    color: var(--muted);
  }
  .listening {
    font-size: 11px;
    font-weight: 700;
    color: var(--live);
  }
  .caret {
    display: inline-block;
    width: 2px;
    height: 1em;
    margin-left: 2px;
    background: var(--live);
    vertical-align: -2px;
    animation: blink 1s steps(2) infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
  .waiting {
    padding: 14px 16px;
  }
  .catchup {
    position: absolute;
    left: 50%;
    bottom: 14px;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: var(--radius-pill);
    background: var(--ink-strong);
    color: var(--surface);
    font-size: 12.5px;
    font-weight: 600;
    box-shadow: var(--shadow-float);
    white-space: nowrap;
  }
  .feed {
    flex: 1;
    min-height: 0;
  }
  .feed-empty {
    padding: 18px 16px;
  }
  .feed-detail {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1;
  }
  .feed-detail .back-link {
    padding: 8px 14px;
    border-bottom: 1px solid var(--line);
  }
  .detail-scroll {
    flex: 1;
    min-height: 0;
  }
  .focus {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .captions {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .caps {
    margin-top: auto;
    display: grid;
    gap: 18px;
    padding: 10px 4px;
  }
  .cap {
    display: grid;
    gap: 6px;
  }
  .cap p {
    font-family: var(--font-serif);
    font-size: calc(var(--live-size) * 1.55);
    line-height: 1.3;
    color: var(--ink-strong);
  }
  .cap.old p {
    color: var(--muted);
    font-size: calc(var(--live-size) * 1.2);
  }
  .cap-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .tray {
    display: grid;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
  }
  .tray-list {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 6px;
    scroll-snap-type: x mandatory;
  }
  .tray-card {
    flex: 0 0 min(280px, 78vw);
    scroll-snap-align: start;
    display: grid;
    gap: 6px;
    align-content: start;
    padding: 12px;
    text-align: left;
    border: 1px solid var(--line);
    border-radius: var(--radius-action);
    background: var(--surface);
    font-size: 13px;
    color: var(--ink-strong);
  }
  .tray-card.fresh {
    border-color: var(--st-inconsistency-dot);
    box-shadow: 0 0 0 1px var(--st-inconsistency-dot);
  }
  .not-started {
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 12px;
    flex: 1;
    text-align: center;
    padding: 24px;
    border: 1.5px dashed var(--line-strong);
    border-radius: var(--radius-surface);
  }
  .not-started h2 {
    font-size: 26px;
  }
  .not-started p {
    max-width: 52ch;
  }
  .ns-icon {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--live-soft);
    color: var(--live);
  }
  .ns-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .keep {
    max-width: 40ch;
  }
</style>
