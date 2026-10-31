<script lang="ts">
  import { AudioLines, ChevronRight, RefreshCw } from "@lucide/svelte";
  import {
    userFacingError,
    timestamp,
    type Finding,
    type Segment,
  } from "../lib/workspace-api";
  import styles from "./workspace.module.css";
  import { untrack } from "svelte";
  import Empty from "./Empty.svelte";
  import TranscriptText from "./TranscriptText.svelte";

  let {
    segments,
    speakers,
    partial,
    onRetry,
    select,
    findings,
  }: {
    segments: Segment[];
    speakers: Record<string, string>;
    partial: string;
    caseId: string;
    onRetry: (id: string) => void;
    select: (id: string) => void;
    findings: Finding[];
  } = $props();

  let follow = $state(true);
  const phases: Record<string, string> = {
    pending: "Ready to examine",
    queued: "Waiting to examine",
    extracting: "Reading statement…",
    retrieving: "Finding sources…",
    analyzing: "Examining…",
    reviewing: "Checking findings…",
    synthesizing: "Preparing findings…",
    complete: "Examined",
  };

  let query = $state("");

  let speaker = $state("");

  let term = $derived(query.trim().toLocaleLowerCase());

  let filtering = $derived(!!term || !!speaker);

  let visibleSegments = $derived(
    segments.filter(
      (s) =>
        (!speaker || s.speaker === speaker) &&
        (!term || s.text.toLocaleLowerCase().includes(term)),
    ),
  );

  let speakerIds = $derived(
    Array.from(new Set(segments.map((s) => s.speaker))),
  );

  const scroller = { current: null as HTMLDivElement | null };

  $effect(() => {
    void [segments.length, partial, follow, filtering];
    return untrack(() => {
      if (follow && !filtering && scroller.current)
        scroller.current.scrollTop = scroller.current.scrollHeight;
    });
  });

  $effect(() => {
    void [query, speaker, filtering];
    return untrack(() => {
      if (scroller.current && filtering) scroller.current.scrollTop = 0;
    });
  });
</script>

<div class={styles.transcriptFilters}>
  <label>
    <span class={styles.srOnly}>Search this transcript</span>
    <input
      type="search"
      placeholder="Find words in this hearing…"
      value={query}
      oninput={(e) => (query = e.currentTarget.value)}
    />
  </label>
  <label>
    <span class={styles.srOnly}>Filter transcript by speaker</span>
    <select value={speaker} onchange={(e) => (speaker = e.currentTarget.value)}>
      <option value="">All speakers</option>
      {#each speakerIds as id (id)}<option value={id}>
          {speakers[id] ?? id}
        </option>{/each}
    </select>
  </label>
  {#if filtering}<div class={styles.transcriptResults}>
      <span role="status">
        {visibleSegments.length} of {segments.length} statements
      </span>
      <button
        class={styles.textButton}
        onclick={() => {
          query = "";
          speaker = "";
        }}
      >
        Clear transcript filters
      </button>
    </div>{/if}
</div>
<label class={styles.follow}>
  <input
    type="checkbox"
    checked={follow && !filtering}
    disabled={filtering}
    oninput={(e) => (follow = e.currentTarget.checked)}
  />
  {filtering ? "Following paused while filtering" : "Follow new testimony"}
</label>
<div
  bind:this={scroller.current}
  class={`${styles.transcriptScroll} ${filtering ? styles.transcriptFiltered : ""}`}
>
  {#if visibleSegments.length}{#each visibleSegments as s (s.id)}{@const finding =
        findings.find((f) => f.segment_id === s.id)}
      <article class={styles.segment}>
        <div>
          <strong>{speakers[s.speaker] ?? s.speaker}</strong>
          <time>
            {s.origin === "imported" && !s.start && !s.end
              ? "Time not supplied"
              : timestamp(s.start)}
          </time>
        </div>
        <p>
          <TranscriptText text={s.text} {term}></TranscriptText>
        </p>
        <div class={styles.segmentMeta}>
          <span>
            {s.origin === "simulation"
              ? "Scripted"
              : s.origin === "manual"
                ? "Manually entered"
                : s.origin === "imported"
                  ? "Imported transcript"
                  : s.confidence === null
                    ? "Confidence unavailable"
                    : `${Math.round(s.confidence * 100)}% word confidence`}
            {!speakers[s.speaker] && s.origin === "speechmatics"
              ? " · Role unconfirmed"
              : ""}
          </span>
          {#if finding}<button onclick={() => select(s.id)}>
              View finding <ChevronRight size={12}></ChevronRight>
            </button>{:else}{#if !["skipped", "unavailable", "failed", "interrupted"].includes(s.analysis_state)}<span
                class={styles.phase}>{phases[s.analysis_state] ?? "Saved"}</span
              >{/if}{/if}
        </div>
        {#if s.analysis_error}<div class={styles.segmentError}>
            <p>{userFacingError(s.analysis_error)}</p>
            <button onclick={() => onRetry(s.id)}>
              <RefreshCw size={12}></RefreshCw>
              Retry analysis
            </button>
          </div>{/if}
      </article>{/each}{:else}<Empty
      title={filtering ? "No matching statements." : "Ready when you are."}
      text={filtering
        ? "Try another phrase or clear the speaker filter. Filters do not change the hearing record."
        : "Start a simulated hearing, capture audio below, or add a statement below."}
      >{#snippet icon()}<AudioLines size={28}></AudioLines>{/snippet}</Empty
    >{/if}
  {#if partial && !filtering}<div class={styles.partial}>
      <span>Listening · provisional</span>
      <p>{partial}</p>
    </div>{/if}
</div>
