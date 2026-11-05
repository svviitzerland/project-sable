<script lang="ts">
  import Mark from "../components/Mark.svelte";
  import {
    AArrowDown,
    AArrowUp,
    ArrowRight,
    Bookmark,
    ChevronLeft,
    Ellipsis,
    MessageSquare,
    Mic,
    Moon,
    Pause,
    Play,
    ScrollText,
    Square,
    Sun,
    X,
  } from "@lucide/svelte";
  import { tick } from "svelte";
  import { fly } from "svelte/transition";
  import Avatar from "../components/Avatar.svelte";
  import Backlog from "../components/Backlog.svelte";
  import DialogueBox from "../components/DialogueBox.svelte";
  import FindingLink from "../components/FindingLink.svelte";
  import Menu, { type MenuItem } from "../components/Menu.svelte";
  import Overlay from "../components/Overlay.svelte";
  import { fmtClock, fmtDate, l, t } from "../lib/i18n";
  import { isLive, live, pause, resume } from "../lib/live.svelte";
  import { roleOrder, roleTone } from "../lib/people";
  import { prefs } from "../lib/prefs.svelte";
  import { href } from "../lib/router.svelte";
  import {
    findingForStatement,
    findingsOf,
    findingsPath,
    hearing,
    isMeaningful,
    needsLook,
    openAssistant,
    participantsOf,
    speakerName,
    statement,
    statementsOf,
    toastT,
    ui,
  } from "../lib/store.svelte";
  import type { Finding } from "../lib/types";

  /**
   * Live recording, top to bottom in order of what matters: the finding most worth a look (only
   * when there is one), what the person speaking is saying now, then the last few lines. The
   * hearing only gathers: findings are worked on in Temuan, so here they are links into it.
   * Where people sit is not shown; who is talking is.
   */
  let { hearingId, phone }: { hearingId: string; phone: boolean } = $props();

  let h = $derived(hearing(hearingId)!);
  let recording = $derived(live.hearingId === hearingId && live.status !== "idle");
  let statements = $derived(statementsOf(hearingId));
  let last = $derived(statements.at(-1));
  let showTranscript = $state(false);
  let transcriptEl: HTMLElement | undefined = $state();
  const sizes = [14, 16, 19, 23];
  const motion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1;

  let current = $derived(
    recording && live.partial
      ? { speakerId: live.partialSpeaker, text: live.partial, partial: true, time: undefined as number | undefined, id: "" }
      : last
        ? { speakerId: last.speakerId, text: last.text, partial: false, time: last.t, id: last.id }
        : null,
  );
  let speaking = $derived(recording && live.status === "recording" && !!live.partial);

  // Most relevant first: what just arrived, then differences from a source, then the newest.
  const weight = (f: Finding) => (f.isNew ? 4 : 0) + (f.status === "potential_inconsistency" ? 2 : 1);
  let alerts = $derived(
    findingsOf(hearingId)
      .filter(needsLook)
      .map((f) => ({ f, w: weight(f), at: statement(f.statementId)?.t ?? 0 }))
      .sort((a, b) => b.w - a.w || b.at - a.at)
      .map((x) => x.f),
  );
  let top = $derived(alerts[0]);
  let rest = $derived(alerts.slice(1));
  let currentFinding = $derived.by(() => {
    const f = current && !current.partial ? findingForStatement(current.id) : undefined;
    return f && isMeaningful(f) && !f.reviewed ? f : undefined;
  });
  let recent = $derived(statements.slice(current?.partial ? -5 : -6, current?.partial ? undefined : -1).reverse());
  let cast = $derived(participantsOf(hearingId).sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)));
  let announce = $state("");

  $effect(() => {
    if (recording && live.unseen) live.unseen = 0;
  });

  // Announce a finding worth a look politely; captions are not read aloud line by line.
  let lastCount = -1;
  $effect(() => {
    const n = alerts.length;
    if (lastCount >= 0 && n > lastCount && alerts[0]) announce = `${t("attn.title")}: ${l(alerts[0].title)}`;
    lastCount = n;
  });

  function markMoment() {
    if (last && !last.flagged) last.flagged = true;
    toastT("live.marked");
  }

  async function openTranscript() {
    showTranscript = true;
    await tick();
    setTimeout(() => transcriptEl?.scrollTo({ top: transcriptEl.scrollHeight }), 60);
  }

  let menu = $derived<MenuItem[]>([
    { label: t("live.larger"), icon: AArrowUp, run: () => (prefs.liveText = Math.min(3, prefs.liveText + 1)) },
    { label: t("live.smaller"), icon: AArrowDown, run: () => (prefs.liveText = Math.max(0, prefs.liveText - 1)) },
    {
      label: prefs.theme === "night" ? t("live.lightMode") : t("live.courtMode"),
      icon: prefs.theme === "night" ? Sun : Moon,
      run: () => (prefs.theme = prefs.theme === "night" ? "paper" : "night"),
    },
    { label: t("live.fullTranscript"), icon: ScrollText, run: openTranscript },
    { label: t("top.ask"), icon: MessageSquare, run: () => openAssistant({ kind: "hearing", id: hearingId }) },
  ]);
</script>

<div class="live" class:phone style:--live-size="{sizes[prefs.liveText] ?? 16}px">
  <header class="bar">
    <div class="titles">
      <a class="back" href={href(`/case/${h.caseId}/hearings`)}><ChevronLeft size={16} />{t("hv.allHearings")}</a>
      <h1 class="t-serif"><span class="num">{t("common.hearingN", { n: h.number })}</span> {l(h.title)}</h1>
    </div>
    {#if recording}
      <div class="controls">
        <span class="rec" class:paused={live.status !== "recording"}>
          {#if live.status === "recording"}<span class="live-dot"></span>{:else}<span class="pause-dot"></span>{/if}
          {#if !phone}<span>{live.status === "connecting" ? t("live.connecting") : live.status === "paused" ? t("live.paused") : t("live.recording")}</span>{/if}
          <span class="tabular clock">{fmtClock(live.elapsed)}</span>
        </span>
        <button
          class="btn"
          class:btn-icon={phone}
          aria-label={live.status === "paused" ? t("live.resume") : t("live.pause")}
          disabled={live.status === "connecting"}
          onclick={() => (live.status === "paused" ? resume() : pause())}
        >
          {#if live.status === "paused"}<Play size={16} />{#if !phone}{t("live.resume")}{/if}{:else}<Pause size={16} />{#if !phone}{t("live.pause")}{/if}{/if}
        </button>
        <button class="btn btn-danger" onclick={() => (ui.modal = { kind: "endLive" })}><Square size={13} />{t("live.end")}</button>
        <Menu label={t("live.viewOptions")} items={menu}>
          {#snippet button()}
            <span class="btn btn-ghost btn-icon" aria-hidden="true"><Ellipsis size={18} /></span>
          {/snippet}
        </Menu>
      </div>
    {/if}
  </header>

  {#if !recording}
    <section class="flow not-started">
      <div class="ns-text">
        <h2 class="t-serif">{t("hv.scheduledTitle")}</h2>
        <p class="muted">{fmtDate(h.date, { weekday: "long", day: "numeric", month: "long" })}{h.time ? ` · ${h.time} WIB` : ""}</p>
      </div>
      <div class="cast">
        <h3 class="t-label">{t("live.cast")}</h3>
        <ul>
          {#each cast as sp (sp.id)}
            <li data-tone={roleTone(sp.role)}>
              <Avatar id={sp.id} size="sm" />
              <span class="cast-text"><strong>{speakerName(sp)}</strong><span class="xsmall muted">{t(`role.${sp.role}`)}</span></span>
            </li>
          {/each}
        </ul>
      </div>
      {#if isLive()}<p class="notice notice-sand">{t("nh.busy", { n: hearing(live.hearingId)?.number ?? "" })}</p>{/if}
      <div class="ns-actions">
        <button class="btn btn-live" disabled={isLive()} onclick={() => (ui.modal = { kind: "newHearing", flow: "live", hearingId: h.id })}><Mic size={16} />{t("hearings.startNow")}</button>
        <button class="btn" onclick={() => openAssistant({ kind: "case" }, l({ id: "Pertanyaan apa yang perlu saya siapkan untuk sidang berikutnya?", en: "What questions should I prepare for the next hearing?" }), undefined, true)}><MessageSquare size={16} />{t("ov.prepare")}</button>
      </div>
    </section>
  {:else}
    <div class="flow">
      <section class="attention" aria-label={t("attn.title")}>
        {#if top}
          {#key top.id}
            <div in:fly={{ y: -14, duration: 280 * motion }}>
              <FindingLink f={top} variant="lead" />
            </div>
          {/key}
          {#if rest.length}
            <a class="more" href={href(findingsPath(h.caseId, { hearing: hearingId }))}>
              <span class="pips" aria-hidden="true">
                {#each rest.slice(0, 3) as f (f.id)}<span class="pip" class:loud={f.status === "potential_inconsistency"}><Mark size={10} /></span>{/each}
              </span>
              <span class="more-label">{t("live.moreToCheck", { n: rest.length })}</span>
              <span class="more-go"><span class="more-go-text">{t("fl.all")}</span><ArrowRight size={14} /></span>
            </a>
          {/if}
        {:else}
          <p class="calm"><span class="breath" aria-hidden="true"></span>{t("attn.calm")}</p>
        {/if}
      </section>

      <section class="now" aria-label={t("live.speakingNow")}>
        <div class="now-head">
          <h2 class="t-label">{t("live.speakingNow")}</h2>
          <button class="btn btn-sm btn-ghost" onclick={markMoment}><Bookmark size={14} />{t("live.mark")}</button>
        </div>
        {#if current}
          <DialogueBox
            speakerId={current.speakerId}
            text={current.text}
            partial={current.partial}
            {speaking}
            time={current.time}
            mark={currentFinding?.said}
            portrait={phone ? "lg" : "xl"}
            alert={!!currentFinding}
          />
        {:else}
          <p class="muted small">{t("live.waiting")}</p>
        {/if}
      </section>

      {#if recent.length}
        <section class="recent">
          <div class="recent-head">
            <h2 class="t-label">{t("live.justNow")}</h2>
            <button class="link-btn" onclick={openTranscript}><ScrollText size={14} />{t("live.fullTranscript")}</button>
          </div>
          <Backlog statements={recent} compact showTime={false} />
        </section>
      {/if}
    </div>
  {/if}
  <p class="sr-only" role="status" aria-live="polite">{announce}</p>
</div>

<Overlay open={showTranscript} onclose={() => (showTranscript = false)} variant={phone ? "sheet" : "drawer"} label={t("live.fullTranscript")} width={560}>
  <div class="sheet-head">
    <h2>{t("live.fullTranscript")}</h2>
    <button class="btn btn-ghost btn-icon" aria-label={t("common.close")} onclick={() => (showTranscript = false)}><X size={18} /></button>
  </div>
  <div class="sheet-body scroll-y" bind:this={transcriptEl}>
    <Backlog {statements} />
  </div>
</Overlay>

<style>
  .live {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 14px clamp(12px, 2.4cqi, 28px) 24px;
    min-height: calc(100dvh - var(--topbar-h));
  }
  .live.phone {
    padding: 10px 10px 16px;
    gap: 10px;
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 10px 16px;
  }
  .titles {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
    text-decoration: none;
    width: fit-content;
  }
  .back:hover {
    color: var(--ink-strong);
  }
  .phone .back {
    display: none;
  }
  h1 {
    font-size: clamp(20px, 2.8cqi, 28px);
    line-height: 1.2;
  }
  .phone h1 {
    font-size: 18px;
  }
  .num {
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    vertical-align: 3px;
    margin-right: 4px;
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .phone .controls {
    width: 100%;
    gap: 6px;
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
    white-space: nowrap;
  }
  .phone .rec {
    flex: 1;
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
  /* One column, read top to bottom: what needs you, who is speaking, what was just said. */
  .flow {
    display: grid;
    gap: 18px;
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
  }
  .phone .flow {
    gap: 14px;
  }
  .attention {
    display: grid;
    gap: 8px;
  }
  .calm {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: var(--radius-surface);
    border: 1px dashed var(--line-strong);
    font-size: 13.5px;
    color: var(--muted);
  }
  .breath {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--st-supported-dot);
    animation: breathe 2.4s ease-in-out infinite;
  }
  .more {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    border-radius: var(--radius-action);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--ink-strong);
    font-size: 13.5px;
    font-weight: 600;
    text-decoration: none;
  }
  .more:hover {
    border-color: var(--line-strong);
  }
  .pips {
    display: flex;
  }
  .pip {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    margin-right: -5px;
    border-radius: 50%;
    border: 2px solid var(--surface);
    background: var(--st-context-dot);
    color: #fff;
    font-size: 11px;
    font-weight: 800;
  }
  .pip.loud {
    background: var(--alert);
  }
  .more-label {
    flex: 1;
    margin-left: 6px;
  }
  .more-go {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--muted);
  }
  .more:hover .more-go {
    color: var(--ink-strong);
  }
  .phone .more-go-text {
    display: none;
  }
  .now {
    display: grid;
    gap: 8px;
  }
  .now-head,
  .recent-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .recent {
    display: grid;
    gap: 6px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
  }
  .not-started {
    gap: 22px;
    margin: 8px auto 0;
  }
  .ns-text {
    display: grid;
    justify-items: start;
    gap: 6px;
  }
  .ns-text h2 {
    font-size: 26px;
  }
  .cast {
    display: grid;
    gap: 10px;
  }
  .cast ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 8px;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .cast li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: var(--radius-action);
    background: var(--surface);
    border: 1px solid var(--line);
    min-width: 0;
  }
  .cast-text {
    display: grid;
    min-width: 0;
  }
  .cast-text strong {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--ink-strong);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ns-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .sheet-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 10px 10px 18px;
    border-bottom: 1px solid var(--line);
  }
  .sheet-head h2 {
    flex: 1;
    font-size: 15px;
    font-weight: 600;
    color: var(--ink-strong);
  }
  .sheet-body {
    flex: 1;
    min-height: 0;
    padding: 8px 0 20px;
  }
  @media (prefers-reduced-motion: reduce) {
    .breath {
      animation: none;
    }
  }
</style>
