<script lang="ts">
  import Mark from "../components/Mark.svelte";
  import { ChevronLeft, ChevronRight, Download, Ellipsis, FileText, MessageSquare, Pause, Play, RotateCcw, RotateCw, Search } from "@lucide/svelte";
  import { tick, untrack } from "svelte";
  import AlertCard from "../components/AlertCard.svelte";
  import Avatar from "../components/Avatar.svelte";
  import Backlog from "../components/Backlog.svelte";
  import DialogueBox from "../components/DialogueBox.svelte";
  import Menu, { type MenuItem } from "../components/Menu.svelte";
  import SpeakerTimeline from "../components/SpeakerTimeline.svelte";
  import { fmtClock, fmtDate, fmtDuration, l, t } from "../lib/i18n";
  import { roleTone, roleOrder } from "../lib/people";
  import { href, route } from "../lib/router.svelte";
  import {
    finding,
    findingForStatement,
    findingsOf,
    hearing,
    inspect,
    isMeaningful,
    isShown,
    needsLook,
    openAssistant,
    setReviewed,
    speaker,
    speakerName,
    statement,
    statementsOf,
    toastT,
    ui,
  } from "../lib/store.svelte";
  import type { Speaker } from "../lib/types";

  /**
   * A recorded or imported hearing in review. The transcript is the page; findings worth a
   * look open in place under the line where they happened, and a timeline shows who spoke when.
   */
  let { hearingId }: { hearingId: string } = $props();

  let h = $derived(hearing(hearingId)!);
  let all = $derived(statementsOf(hearingId));
  let findings = $derived(findingsOf(hearingId));
  let attention = $derived(findings.filter(needsLook));
  let quiet = $derived(findings.filter((f) => !isMeaningful(f)));
  let audio = $derived(h.mode === "recorded");
  let duration = $derived(h.duration ?? Math.max(60, (all.at(-1)?.t ?? 0) + 30));

  let width = $state(0);
  let wide = $derived(width >= 1000);
  let query = $state("");
  let expanded = $state<string | null>(null);
  let highlight = $state<string | null>(null);

  // Simulated playback.
  let playing = $state(false);
  let time = $state(0);
  let rate = $state(1);
  $effect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      time = Math.min(duration, time + 0.25 * rate);
      if (time >= duration) playing = false;
    }, 250);
    return () => clearInterval(timer);
  });
  let current = $derived.by(() => {
    let found = all[0];
    for (const s of all) if (s.t <= time) found = s;
    return found;
  });
  $effect(() => {
    const id = current?.id;
    if (!playing || !id) return;
    untrack(() => document.querySelector(`[data-sid="${id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  });

  let shown = $derived(query.trim() ? all.filter((s) => s.text.toLowerCase().includes(query.trim().toLowerCase())) : all);
  let position = $derived(expanded ? attention.findIndex((f) => f.id === expanded) : -1);

  async function jumpTo(id: string) {
    const f = finding(id);
    const s = f ? statement(f.statementId) : undefined;
    if (!f || !s) return;
    query = "";
    expanded = f.id;
    highlight = s.id;
    if (audio && !playing) time = s.t;
    await tick();
    document.querySelector(`[data-sid="${s.id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function step(delta: number) {
    if (!attention.length) return;
    const next = attention[(position + delta + attention.length) % attention.length] ?? attention[0];
    void jumpTo(next.id);
  }

  // Deep links: ?f=finding opens it in place, ?s=statement highlights a line.
  $effect(() => {
    const f = route.query.f;
    const s = route.query.s;
    untrack(() => {
      if (f && finding(f)) void jumpTo(f);
      else if (s && statement(s)) {
        highlight = s;
        time = statement(s)!.t;
        const sf = findingForStatement(s);
        if (sf && isShown(sf)) expanded = sf.id;
        tick().then(() => document.querySelector(`[data-sid="${s}"]`)?.scrollIntoView({ block: "center" }));
      }
    });
  });

  // Participants with their share of talk time, like a match summary.
  let people = $derived.by(() => {
    const talk = new Map<string, number>();
    all.forEach((s, i) => {
      const sp = speaker(s.speakerId);
      if (!sp) return;
      const next = all[i + 1]?.t ?? duration;
      talk.set(sp.id, (talk.get(sp.id) ?? 0) + Math.min(next - s.t, Math.max(5, s.text.length / 11)));
    });
    const total = [...talk.values()].reduce((a, b) => a + b, 0) || 1;
    return [...talk.entries()]
      .map(([id, seconds]) => ({ sp: speaker(id) as Speaker, pct: Math.round((seconds / total) * 100) }))
      .sort((a, b) => roleOrder.indexOf(a.sp.role) - roleOrder.indexOf(b.sp.role));
  });

  let menu = $derived<MenuItem[]>([{ label: t("hv.export"), icon: Download, run: () => toastT("toast.exported") }]);

  function onkeydown(event: KeyboardEvent) {
    const el = event.target as HTMLElement;
    if (ui.modal || ui.inspector || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === "j") step(1);
    else if (key === "k") step(-1);
    else if (key === "r" && expanded) {
      const f = finding(expanded);
      if (f) setReviewed(f, !f.reviewed);
    } else if (key === " " && audio && el.tagName !== "BUTTON") playing = !playing;
    else return;
    event.preventDefault();
  }
</script>

<svelte:window {onkeydown} />

<div class="review" bind:clientWidth={width}>
  <header class="head">
    <a class="back" href={href(`/case/${h.caseId}/hearings`)}><ChevronLeft size={16} />{t("hv.allHearings")}</a>
    <div class="title-row">
      <h1 class="t-serif"><span class="num">{t("common.hearingN", { n: h.number })}</span> {l(h.title)}</h1>
      <div class="actions">
        <button class="btn" onclick={() => openAssistant({ kind: "hearing", id: h.id })}><MessageSquare size={16} />{t("top.ask")}</button>
        <Menu label={t("common.more")} items={menu}>
          {#snippet button()}<span class="btn btn-ghost btn-icon" aria-hidden="true"><Ellipsis size={18} /></span>{/snippet}
        </Menu>
      </div>
    </div>
    <p class="meta small muted">
      {fmtDate(h.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {t(`mode.${h.mode}`)}{h.duration ? ` · ${fmtDuration(h.duration)}` : ""}
    </p>
  </header>

  {#if audio}
    <section class="player" aria-label={t("hv.audioSim")}>
      <div class="controls">
        <button class="btn btn-ghost btn-icon" aria-label={t("hv.back10")} onclick={() => (time = Math.max(0, time - 10))}><RotateCcw size={17} /></button>
        <button class="btn btn-primary btn-icon play" aria-label={playing ? t("hv.pause") : t("hv.play")} onclick={() => (playing = !playing)}>
          {#if playing}<Pause size={18} />{:else}<Play size={18} />{/if}
        </button>
        <button class="btn btn-ghost btn-icon" aria-label={t("hv.fwd10")} onclick={() => (time = Math.min(duration, time + 10))}><RotateCw size={17} /></button>
        <span class="clock tabular small">{fmtClock(time)} / {fmtClock(duration)}</span>
        <label class="sr-only" for="rate">{t("hv.speed")}</label>
        <select id="rate" class="field rate" bind:value={rate}>
          <option value={1}>1×</option>
          <option value={1.5}>1.5×</option>
          <option value={2}>2×</option>
        </select>
        <span class="sim xsmall muted">{t("hv.audioSim")}</span>
      </div>
      <SpeakerTimeline {hearingId} {duration} {time} markers={findings.filter(isShown)} single={width < 600} onseek={(s) => (time = s)} onmarker={(f) => jumpTo(f.id)} />
      {#if current && (playing || time > 0)}
        {@const cf = findingForStatement(current.id)}
        <DialogueBox speakerId={current.speakerId} text={current.text} time={current.t} speaking={playing} compact mark={cf && isShown(cf) ? cf.said : ""} />
      {/if}
    </section>
  {:else}
    <p class="notice"><FileText size={14} />{t("hv.noAudio")}</p>
  {/if}

  <div class="content" class:wide>
    <section class="transcript" aria-label={t("hv.transcript")}>
      <div class="tools">
        <div class="search grow">
          <Search size={15} />
          <label class="sr-only" for="t-search">{t("hv.search")}</label>
          <input id="t-search" class="field" type="search" placeholder={t("hv.search")} bind:value={query} />
        </div>
        {#if attention.length}
          <div class="jump" role="group" aria-label={t("attn.title")}>
            <span class="jump-label"><span class="bang" aria-hidden="true"><Mark size={11} /></span>{t("attn.count", { n: attention.length })}</span>
            <button class="btn btn-ghost btn-icon btn-sm" aria-label={t("attn.prev")} onclick={() => step(-1)}><ChevronLeft size={16} /></button>
            {#if position >= 0}<span class="tabular small muted">{t("attn.position", { i: position + 1, n: attention.length })}</span>{/if}
            <button class="btn btn-ghost btn-icon btn-sm" aria-label={t("attn.next")} onclick={() => step(1)}><ChevronRight size={16} /></button>
          </div>
        {:else if findings.length}
          <span class="small muted">{t("attn.allChecked")}</span>
        {/if}
      </div>
      {#if query.trim()}
        <p class="filter small muted" role="status">
          {t("hv.shownOf", { shown: shown.length, total: all.length })}
          <button class="link-btn" onclick={() => (query = "")}>{t("common.clearFilters")}</button>
        </p>
      {/if}
      <Backlog
        statements={shown}
        currentId={audio && (playing || time > 0) ? current?.id : null}
        highlightId={highlight}
        expandedId={expanded}
        {query}
        onplay={audio ? (s) => { time = s; playing = true; } : undefined}
        ontoggle={(id) => (expanded = expanded === id ? null : id)}
      />
      {#if shown.length === 0}<p class="none small muted">{t("hv.noMatch")}</p>{/if}
    </section>

    {#if wide}
      <aside class="rail">
        <section class="card block">
          <h2>{t("attn.title")} {#if attention.length}<span class="badge badge-amber">{attention.length}</span>{/if}</h2>
          {#each attention as f (f.id)}
            <AlertCard {f} mode="compact" onopen={() => jumpTo(f.id)} />
          {:else}
            <p class="small muted">{findings.length ? t("attn.allChecked") : t("hv.noFindingsText")}</p>
          {/each}
        </section>
        <section class="card block">
          <h2>{t("rv.participants")}</h2>
          <ul class="people">
            {#each people as p (p.sp.id)}
              <li data-tone={roleTone(p.sp.role)}>
                <Avatar id={p.sp.id} size="sm" speaking={playing && speaker(current?.speakerId ?? "")?.id === p.sp.id} />
                <span class="person">
                  <span class="person-name">{speakerName(p.sp)}</span>
                  <span class="bar"><span style:width="{p.pct}%"></span></span>
                </span>
                <span class="xsmall muted tabular">{p.pct}%</span>
              </li>
            {/each}
          </ul>
        </section>
        {#if quiet.length}
          <details class="card block quiet">
            <summary>{t("attn.others")} · {quiet.length}</summary>
            <p class="xsmall muted">{t("attn.othersHint")}</p>
            {#each quiet as f (f.id)}
              <AlertCard {f} mode="compact" onopen={() => inspect({ kind: "finding", id: f.id })} />
            {/each}
          </details>
        {/if}
      </aside>
    {/if}
  </div>
</div>

<style>
  .review {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 14px clamp(12px, 2.4cqi, 28px) 28px;
  }
  .head {
    display: grid;
    gap: 6px;
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
    gap: 6px;
  }
  .player {
    position: sticky;
    top: calc(var(--topbar-h) + 6px);
    z-index: 5;
    display: grid;
    gap: 10px;
    padding: 10px 14px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius-surface);
    background: color-mix(in srgb, var(--surface) 94%, transparent);
    backdrop-filter: blur(8px);
    box-shadow: 0 6px 18px rgb(20 40 30 / 0.06);
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
  }
  .play {
    border-radius: 50%;
  }
  .clock {
    white-space: nowrap;
    margin-right: 4px;
  }
  .rate {
    width: auto;
    min-height: 30px;
    padding: 2px 26px 2px 8px;
    font-size: 12px;
  }
  .sim {
    margin-left: auto;
    font-style: italic;
  }
  .content {
    display: grid;
    gap: 16px;
    align-items: start;
  }
  .content.wide {
    grid-template-columns: minmax(0, 1fr) 320px;
  }
  .transcript {
    display: grid;
    gap: 4px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-surface);
    padding-bottom: 10px;
    min-width: 0;
  }
  .tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 12px;
    border-bottom: 1px solid var(--line);
  }
  .grow {
    flex: 1 1 220px;
  }
  .jump {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }
  .jump-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink-strong);
    margin-right: 4px;
  }
  .bang {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--alert);
    color: #fff;
    font-size: 12px;
    font-weight: 800;
  }
  .filter {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 14px;
  }
  .none {
    padding: 16px;
  }
  .rail {
    position: sticky;
    top: calc(var(--topbar-h) + 12px);
    display: grid;
    gap: 12px;
  }
  .block {
    display: grid;
    gap: 8px;
    padding: 14px;
  }
  .block h2,
  .block summary {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink-strong);
  }
  .block summary {
    cursor: pointer;
  }
  .people {
    display: grid;
    gap: 8px;
  }
  .people li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
  }
  .person {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .person-name {
    font-size: 12.5px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bar {
    height: 5px;
    border-radius: 3px;
    background: var(--sunken);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--tone);
  }
  @container main (max-width: 640px) {
    .player {
      position: static;
    }
    .sim {
      display: none;
    }
  }
</style>
