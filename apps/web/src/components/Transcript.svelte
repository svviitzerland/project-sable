<script lang="ts">
  import { t, tp } from "../lib/i18n/index.svelte";
  import { ArrowDown, AudioLines, RefreshCw, Search } from "@lucide/svelte";
  import {
    userFacingError,
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
  }: {
    segments: Segment[];
    speakers: Record<string, string>;
    partial: string;
    onRetry: (id: string) => void;
    select: (id: string) => void;
    findings: Finding[];
    onRename?: (speaker: string, label: string) => Promise<unknown>;
    selectedSegment?: string | null;
  } = $props();

  let renaming = $state<string | null>(null);
  let renameValue = $state("");
  let query = $state("");
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

  let term = $derived(query.trim().toLocaleLowerCase());
  let visibleSegments = $derived(
    term
      ? segments.filter((s) => s.text.toLocaleLowerCase().includes(term))
      : segments,
  );
  let findingBySegment = $derived(
    new Map(findings.map((f) => [f.segment_id, f])),
  );

  const scroller = { current: null as HTMLDivElement | null };

  function toBottom() {
    if (scroller.current)
      scroller.current.scrollTop = scroller.current.scrollHeight;
    atBottom = true;
  }

  $effect(() => {
    void [segments.length, partial];
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

<div class={styles.colHead}>
  <h2 id="transcript-heading">
    {t("hearing.transcript")}
    <small>{tp("count.statements", segments.length)}</small>
  </h2>
  <label class={styles.search}>
    <Search size={14}></Search>
    <span class={ui.srOnly}>{t("transcript.search")}</span>
    <input
      type="search"
      placeholder={t("transcript.searchShort")}
      bind:value={query}
    />
  </label>
</div>
{#if term}<p class={styles.quiet} role="status">
    {t("transcript.shownOf", {
      shown: visibleSegments.length,
      total: segments.length,
    })}
  </p>{/if}
<div
  bind:this={scroller.current}
  class={styles.scroll}
  onscroll={(e) => {
    const el = e.currentTarget;
    atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }}
>
  {#if visibleSegments.length}{#each visibleSegments as s (s.id)}{@const finding =
        findingBySegment.get(s.id)}
      <article
        id={`line-${s.id}`}
        class={styles.line}
        data-selected={selectedSegment === s.id || undefined}
        data-status={finding?.status}
      >
        <div class={styles.lineHead}>
          {#if onRename}<button
              class={styles.speaker}
              title={t("transcript.renameSpeaker")}
              onclick={() => {
                renaming = s.speaker;
                renameValue = speakers[s.speaker] ?? "";
              }}>{speakerName(s.speaker, speakers)}</button
            >{:else}<strong class={styles.speaker}
              >{speakerName(s.speaker, speakers)}</strong
            >{/if}
          <time>
            {s.origin === "imported" && !s.start && !s.end
              ? ""
              : timestamp(s.start)}
          </time>
        </div>
        <p><TranscriptText text={s.text} {term}></TranscriptText></p>
        {#if finding}<button
            class={styles.flag}
            data-status={finding.status}
            onclick={() => select(s.id)}
          >
            <i aria-hidden="true"></i>
            {statusLabel(finding.status)}: {finding.title}
          </button>{:else if working.has(s.analysis_state)}<span
            class={styles.working}>{t("transcript.checking")}</span
          >{/if}
        {#if s.analysis_error && s.analysis_state === "failed"}<div
            class={styles.lineError}
          >
            <span>{userFacingError(s.analysis_error)}</span>
            <button onclick={() => onRetry(s.id)}>
              <RefreshCw size={12}></RefreshCw>
              {t("transcript.retry")}
            </button>
          </div>{/if}
      </article>{/each}{:else if !partial}<div class={styles.empty}>
      <AudioLines size={24}></AudioLines>
      <h3>
        {term ? t("transcript.noMatchTitle") : t("transcript.readyTitle")}
      </h3>
      <p>{term ? t("transcript.noMatchText") : t("transcript.readyText")}</p>
    </div>{/if}
  {#if partial && !term}<div class={styles.partial} aria-live="polite">
      <span>{t("transcript.listening")}</span>
      <p>{partial}</p>
    </div>{/if}
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
