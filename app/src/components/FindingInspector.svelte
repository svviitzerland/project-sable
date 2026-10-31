<script lang="ts">
  import Skeleton from "./Skeleton.svelte";
  import { Check, Download, ShieldCheck } from "@lucide/svelte";
  import {
    api,
    timestamp,
    type Finding,
    type Segment,
    type Source,
  } from "../lib/workspace-api";
  import styles from "./workspace.module.css";
  import { untrack } from "svelte";
  import StatusLabel from "./StatusLabel.svelte";
  import SourceCard from "./SourceCard.svelte";
  import LegalResults from "./LegalResults.svelte";

  let {
    finding,
    segment,
    caseId,
    busy,
    note,
    onNote,
    save,
  }: {
    note: string;
    onNote: (note: string) => void;
    finding: Finding;
    segment?: Segment;
    caseId: string;
    busy: boolean;
    save: (body: { reviewed: boolean; note: string }) => Promise<boolean>;
  } = $props();

  let source = $state<Source | null>(null);

  let sourceError = $state("");

  let citationIndex = $state(0);

  let copied = $state(false);

  let copyError = $state("");

  let citation = $derived(finding.citations[citationIndex]);

  $effect(() => {
    void [caseId, citation?.chunk_id];
    return untrack(() => {
      let alive = true;
      source = null;
      sourceError = "";
      if (citation?.chunk_id)
        api<Source>(`/cases/${caseId}/sources/${citation.chunk_id}`)
          .then((s) => {
            if (alive) source = s;
          })
          .catch((e) => {
            if (alive) sourceError = e.message;
          });
      return () => {
        alive = false;
      };
    });
  });
</script>

<div class={styles.inspector}>
  <div class={styles.paneHeading}>
    <h2>Examine the finding</h2>
    <ShieldCheck size={17}></ShieldCheck>
  </div>
  <div class={styles.inspectorBody}>
    <StatusLabel status={finding.status}></StatusLabel>
    <h3>{finding.title}</h3>
    <div class={styles.quote}>
      <span>Hearing · {timestamp(segment?.start ?? 0)}</span>
      <blockquote>“{segment?.text}”</blockquote>
    </div>
    <p>{finding.explanation}</p>
    <h4>At the source</h4>
    {#if finding.citations.length > 1}<div class={styles.citationTabs}>
        {#each finding.citations as c, i (i)}<button
            aria-pressed={i === citationIndex}
            onclick={() => {
              citationIndex = i;
              source = null;
              sourceError = "";
            }}
          >
            Source {i + 1} · {c.relation}
          </button>{/each}
      </div>{/if}
    {#if sourceError}<p role="alert" class={styles.error}>
        {sourceError}
      </p>{:else}{#if source && source.id === citation?.chunk_id}<SourceCard
          {source}
          {caseId}
          quote={citation?.quote}
        ></SourceCard>{:else if citation}<Skeleton
          variant="reader"
          label="Loading original passage…"
        />{:else}<p class={styles.muted}>
          No source citation supports this finding.
        </p>{/if}{/if}
    <div class={styles.verify}>
      <h4>What to verify</h4>
      <p>{finding.verification}</p>
    </div>
    <h4>Uncertainty</h4>
    <p>{finding.uncertainty}</p>
    <details class={styles.reviewDetails}>
      <summary>
        {finding.mode === "simulation"
          ? "About this scripted finding"
          : finding.mode === "imported"
            ? "Imported review · not re-run"
            : "Independent review"}
      </summary>
      <p>{finding.review.summary}</p>
      {#each finding.review.alternative_explanations as item, i (i)}<p>
          Alternative: {item}
        </p>{/each}
      {#each finding.review.missing_context as item, i (i)}<p>
          Missing context: {item}
        </p>{/each}
      {#if finding.review.analyst_summary}<p>
          Analyst: {finding.review.analyst_summary}
        </p>{/if}
      {#if finding.review.legal_note}<p>{finding.review.legal_note}</p>{/if}
      <small>
        {finding.mode === "simulation"
          ? "Prepared example · not an AI evaluation"
          : finding.mode === "imported"
            ? "Imported finding · verify against the original sources"
            : "Quoted text matches the source. Review the interpretation yourself."}
      </small>
    </details>
    {#if finding.legal.length > 0}
      <h4>Related legal discovery</h4>
      <LegalResults results={finding.legal}></LegalResults>
    {/if}
    <div class={styles.question}>
      <h4>A question to consider</h4>
      <p>{finding.question}</p>
      <button
        class={styles.textButton}
        onclick={async () => {
          try {
            await navigator.clipboard.writeText(finding.question);
            copied = true;
            copyError = "";
          } catch {
            copyError =
              "Clipboard unavailable. Select and copy the question manually.";
          }
        }}
      >
        {#if copied}<Check size={14}></Check>{:else}<Download size={14}
          ></Download>{/if}
        {copied ? "Copied" : "Copy question"}
      </button>
      <span class={styles.srOnly} role="status">
        {copied ? "Question copied" : ""}
      </span>
      {#if copyError}<p role="alert">{copyError}</p>{/if}
    </div>
    <label class={styles.noteField}>
      Your review note
      <textarea
        value={note}
        oninput={(e) => onNote(e.currentTarget.value)}
        rows={3}
        maxlength={4000}
        placeholder="What needs follow-up?"></textarea>
    </label>
    {#if note !== finding.note}<p class={styles.draftNotice} role="status">
        Unsaved note · Save your changes before leaving.
      </p>{/if}
    <div class={styles.reviewActions}>
      <button
        class={styles.primary}
        disabled={busy}
        onclick={() => save({ reviewed: !finding.reviewed, note })}
      >
        <Check size={15}></Check>
        {finding.reviewed ? "Reopen for review" : "Mark reviewed"}
      </button>
      <button
        class={styles.secondary}
        disabled={busy || note === finding.note}
        onclick={() => save({ reviewed: finding.reviewed, note })}
      >
        Save note
      </button>
    </div>
    {#if finding.reviewed}<p class={styles.reviewed}>
        <Check size={14}></Check>
        Reviewed by you · saved to the case
      </p>{/if}
  </div>
</div>
