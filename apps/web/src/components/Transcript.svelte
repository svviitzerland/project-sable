<script lang="ts">
  import { t, tp } from "../lib/i18n/index.svelte";
  import { ArrowDown, Search, X } from "@lucide/svelte";
  import {
    speakerName,
    statusLabel,
    timestamp,
    type Finding,
    type Segment,
  } from "../lib/workspace-api";
  import ui from "./workspace.module.css";
  import styles from "./hearing.module.css";
  import { untrack } from "svelte";
  import TranscriptText from "./TranscriptText.svelte";
  import Modal from "./Modal.svelte";

  let {
    segments,
    speakers,
    partial,
    onRetry,
    select,
    findings,
    onRename,
    selectedSegment = null,
    recording = false,
  }: {
    segments: Segment[];
    speakers: Record<string, string>;
    partial: string;
    onRetry: (id: string) => void;
    select: (id: string) => void;
    findings: Finding[];
    onRename?: (speaker: string, label: string) => Promise<unknown>;
    selectedSegment?: string | null;
    /** The microphone is on: show the listening line even in silence. */
    recording?: boolean;
  } = $props();

  let renaming = $state<string | null>(null);
  let renameValue = $state("");
  let query = $state("");
  let searching = $state(false);
  /** Follow new statements while the reader is at the bottom. */
  let atBottom = $state(true);

  const working = new Set([
    "queued",
    "extracting",
    "retrieving",
    "analyzing",
    "reviewing",
    "synthesizing",
  ]);
  const tones = 6;

  let term = $derived(query.trim().toLocaleLowerCase());
  let visibleSegments = $derived(
    term
      ? segments.filter((s) => s.text.toLocaleLowerCase().includes(term))
      : segments,
  );
  let findingBySegment = $derived(
    new Map(findings.map((f) => [f.segment_id, f])),
  );
  /** Speakers get a stable colour in order of first appearance. */
  let toneOf = $derived(
    new Map(
      [...new Set(segments.map((s) => s.speaker))].map((key, index) => [
        key,
        index % tones,
      ]),
    ),
  );

  function initials(name: string) {
    const words = name
      .replace(/[^\p{L}\p{N} ]/gu, " ")
      .trim()
      .split(/\s+/);
    const last = words.at(-1) ?? "";
    return (/^\d+$/.test(last) ? last : last.slice(0, 1)).toUpperCase() || "?";
  }

  const scroller = { current: null as HTMLDivElement | null };

  function toBottom() {
    if (scroller.current)
      scroller.current.scrollTop = scroller.current.scrollHeight;
    atBottom = true;
  }

  $effect(() => {
    void [segments.length, partial, recording];
    return untrack(() => {
      if (atBottom && !term) requestAnimationFrame(toBottom);
    });
  });

  // Opening a finding brings its statement into view.
  $effect(() => {
    void [selectedSegment];
    return untrack(() => {
      if (!selectedSegment || !scroller.current) return;
      const line = document.getElementById(`line-${selectedSegment}`);
      if (!line) return;
      atBottom = false;
      scroller.current.scrollTop =
        line.offsetTop - scroller.current.offsetTop - 80;
    });
  });

  $effect(() => {
    void [term];
    return untrack(() => {
      if (scroller.current && term) scroller.current.scrollTop = 0;
    });
  });
</script>

<div class={styles.panelHead}>
  <h2 id="transcript-heading">
    {t("hearing.transcript")}
    <small>{tp("count.statements", segments.length)}</small>
  </h2>
  {#if searching}
    <label class={styles.search}>
      <Search size={14}></Search>
      <span class={ui.srOnly}>{t("transcript.search")}</span>
      <!-- svelte-ignore a11y_autofocus (Opened on request by the search button.) -->
      <input
        type="search"
        autofocus
        placeholder={t("transcript.searchShort")}
        bind:value={query}
        onkeydown={(e) => {
          if (e.key === "Escape") {
            query = "";
            searching = false;
          }
        }}
      />
      <button
        class={styles.clear}
        aria-label={t("transcript.clear")}
        onclick={() => {
          query = "";
          searching = false;
        }}><X size={14}></X></button
      >
    </label>
  {:else}
    <button
      class={styles.iconSmall}
      aria-label={t("transcript.search")}
      title={t("transcript.search")}
      onclick={() => (searching = true)}><Search size={16}></Search></button
    >
  {/if}
</div>
{#if term}<p class={styles.searchNote} role="status">
    {t("transcript.shownOf", {
      shown: visibleSegments.length,
      total: segments.length,
    })}
  </p>{/if}
<div
  bind:this={scroller.current}
  class={styles.stream}
  onscroll={(e) => {
    const el = e.currentTarget;
    atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }}
>
  {#each visibleSegments as s, index (s.id)}{@const finding =
      findingBySegment.get(s.id)}{@const name = speakerName(
      s.speaker,
      speakers,
    )}{@const grouped =
      !term && index > 0 && visibleSegments[index - 1].speaker === s.speaker}
    <article
      id={`line-${s.id}`}
      class={styles.turn}
      data-grouped={grouped || undefined}
      data-selected={selectedSegment === s.id || undefined}
      data-status={finding?.status}
    >
      <span
        class={styles.avatar}
        data-tone={toneOf.get(s.speaker)}
        aria-hidden="true">{grouped ? "" : initials(name)}</span
      >
      <div class={styles.turnBody}>
        {#if !grouped}<div class={styles.turnHead}>
            {#if onRename}<button
                class={styles.speaker}
                title={t("transcript.renameSpeaker")}
                onclick={() => {
                  renaming = s.speaker;
                  renameValue = speakers[s.speaker] ?? "";
                }}>{name}</button
              >{:else}<strong class={styles.speaker}>{name}</strong>{/if}
            {#if s.origin !== "imported" || s.start || s.end}<time
                >{timestamp(s.start)}</time
              >{/if}
          </div>{/if}
        <p><TranscriptText text={s.text} {term}></TranscriptText></p>
        {#if finding}<button
            class={styles.flag}
            data-status={finding.status}
            onclick={() => select(s.id)}
          >
            <i aria-hidden="true"></i>
            <span>{statusLabel(finding.status)} · {finding.title}</span>
          </button>{:else if working.has(s.analysis_state)}<span
            class={styles.working}>{t("transcript.checking")}</span
          >{:else if s.analysis_state === "failed"}<span class={styles.working}
            >{t("transcript.notChecked")}
            <button onclick={() => onRetry(s.id)}
              >{t("transcript.retry")}</button
            ></span
          >{/if}
      </div>
    </article>
  {:else}
    {#if term}<div class={styles.empty}>
        <h3>{t("transcript.noMatchTitle")}</h3>
        <p>{t("transcript.noMatchText")}</p>
      </div>{/if}
  {/each}
  {#if (partial || recording) && !term}
    <div class={styles.live} aria-live="polite">
      <span class={styles.avatar} data-live aria-hidden="true"
        ><i></i><i></i><i></i></span
      >
      <div class={styles.turnBody}>
        <div class={styles.turnHead}>
          <strong class={styles.speaker}>{t("transcript.listening")}</strong>
        </div>
        <p>{partial || t("transcript.waitingSpeech")}</p>
      </div>
    </div>
  {/if}
</div>
{#if !atBottom && !term}<button class={styles.jump} onclick={toBottom}>
    <ArrowDown size={14}></ArrowDown>
    {t("transcript.latest")}
  </button>{/if}

<Modal
  open={renaming !== null}
  title={t("transcript.renameTitle")}
  onClose={() => (renaming = null)}
>
  <form
    id="rename-speaker"
    class={ui.renameForm}
    onsubmit={async (e) => {
      e.preventDefault();
      if (!renaming || !renameValue.trim() || !onRename) return;
      const speaker = renaming;
      renaming = null;
      await onRename(speaker, renameValue.trim());
    }}
  >
    <p>{t("transcript.renameText")}</p>
    <label>
      {t("transcript.renameLabel")}
      <input
        bind:value={renameValue}
        placeholder={t("transcript.renamePlaceholder")}
        maxlength={80}
        required
      />
    </label>
  </form>
  {#snippet footer()}
    <button class={ui.secondary} onclick={() => (renaming = null)}>
      {t("common.cancel")}
    </button>
    <button class={ui.primary} type="submit" form="rename-speaker">
      {t("transcript.renameSave")}
    </button>
  {/snippet}
</Modal>
