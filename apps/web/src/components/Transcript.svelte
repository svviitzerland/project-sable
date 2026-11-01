<script lang="ts">
  import { t, type MessageKey } from "../lib/i18n/index.svelte";
  import { AudioLines, ChevronRight, RefreshCw } from "@lucide/svelte";
  import {
    userFacingError,
    speakerName,
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
  const phases: Record<string, MessageKey> = {
    pending: "phase.pending",
    queued: "phase.queued",
    extracting: "phase.extracting",
    retrieving: "phase.retrieving",
    analyzing: "phase.analyzing",
    reviewing: "phase.reviewing",
    synthesizing: "phase.synthesizing",
    complete: "phase.complete",
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
    <span class={styles.srOnly}>{t("transcript.search")}</span>
    <input
      type="search"
      placeholder={t("transcript.searchPlaceholder")}
      value={query}
      oninput={(e) => (query = e.currentTarget.value)}
    />
  </label>
  <label>
    <span class={styles.srOnly}>{t("transcript.filterSpeaker")}</span>
    <select value={speaker} onchange={(e) => (speaker = e.currentTarget.value)}>
      <option value="">{t("transcript.allSpeakers")}</option>
      {#each speakerIds as id (id)}<option value={id}>
          {speakerName(id, speakers)}
        </option>{/each}
    </select>
  </label>
  {#if filtering}<div class={styles.transcriptResults}>
      <span role="status">
        {t("transcript.shownOf", {
          shown: visibleSegments.length,
          total: segments.length,
        })}
      </span>
      <button
        class={styles.textButton}
        onclick={() => {
          query = "";
          speaker = "";
        }}
      >
        {t("transcript.clear")}
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
  {filtering ? t("transcript.followPaused") : t("transcript.follow")}
</label>
<div
  bind:this={scroller.current}
  class={`${styles.transcriptScroll} ${filtering ? styles.transcriptFiltered : ""}`}
>
  {#if visibleSegments.length}{#each visibleSegments as s (s.id)}{@const finding =
        findings.find((f) => f.segment_id === s.id)}
      <article class={styles.segment}>
        <div>
          <strong>{speakerName(s.speaker, speakers)}</strong>
          <time>
            {s.origin === "imported" && !s.start && !s.end
              ? t("transcript.noTime")
              : timestamp(s.start)}
          </time>
        </div>
        <p>
          <TranscriptText text={s.text} {term}></TranscriptText>
        </p>
        <div class={styles.segmentMeta}>
          <span>
            {s.origin === "simulation"
              ? t("transcript.scripted")
              : s.origin === "manual"
                ? t("transcript.manual")
                : s.origin === "imported"
                  ? t("common.importedTranscript")
                  : s.confidence === null
                    ? t("transcript.noConfidence")
                    : t("transcript.confidence", {
                        value: Math.round(s.confidence * 100),
                      })}
            {!speakers[s.speaker] &&
            ["transcribe", "speechmatics"].includes(s.origin)
              ? t("transcript.roleUnconfirmed")
              : ""}
          </span>
          {#if finding}<button onclick={() => select(s.id)}>
              {t("transcript.viewFinding")}
              <ChevronRight size={12}></ChevronRight>
            </button>{:else}{#if !["skipped", "unavailable", "failed", "interrupted"].includes(s.analysis_state)}<span
                class={styles.phase}
                >{t(phases[s.analysis_state] ?? "phase.saved")}</span
              >{/if}{/if}
        </div>
        {#if s.analysis_error}<div class={styles.segmentError}>
            <p>{userFacingError(s.analysis_error)}</p>
            <button onclick={() => onRetry(s.id)}>
              <RefreshCw size={12}></RefreshCw>
              {t("transcript.retry")}
            </button>
          </div>{/if}
      </article>{/each}{:else}<Empty
      title={filtering
        ? t("transcript.noMatchTitle")
        : t("transcript.readyTitle")}
      text={filtering ? t("transcript.noMatchText") : t("transcript.readyText")}
      >{#snippet icon()}<AudioLines size={28}></AudioLines>{/snippet}</Empty
    >{/if}
  {#if partial && !filtering}<div class={styles.partial}>
      <span>{t("transcript.listening")}</span>
      <p>{partial}</p>
    </div>{/if}
</div>
