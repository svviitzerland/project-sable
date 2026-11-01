<script lang="ts">
  import { t } from "../lib/i18n/index.svelte";
  import Skeleton from "./Skeleton.svelte";
  import { Check, Download, ShieldCheck } from "@lucide/svelte";
  import {
    api,
    relationLabel,
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
    <h2>{t("finding.title")}</h2>
    <ShieldCheck size={17}></ShieldCheck>
  </div>
  <div class={styles.inspectorBody}>
    <StatusLabel status={finding.status}></StatusLabel>
    <h3>{finding.title}</h3>
    <div class={styles.quote}>
      <span
        >{t("finding.hearingAt", { time: timestamp(segment?.start ?? 0) })}</span
      >
      <blockquote>“{segment?.text}”</blockquote>
    </div>
    <p>{finding.explanation}</p>
    <h4>{t("common.atSource")}</h4>
    {#if finding.citations.length > 1}<div class={styles.citationTabs}>
        {#each finding.citations as c, i (i)}<button
            aria-pressed={i === citationIndex}
            onclick={() => {
              citationIndex = i;
              source = null;
              sourceError = "";
            }}
          >
            {t("finding.sourceTab", {
              n: i + 1,
              relation: relationLabel(c.relation),
            })}
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
          label={t("finding.loadingPassage")}
        />{:else}<p class={styles.muted}>
          {t("finding.noCitation")}
        </p>{/if}{/if}
    <div class={styles.verify}>
      <h4>{t("common.whatToVerify")}</h4>
      <p>{finding.verification}</p>
    </div>
    <h4>{t("finding.uncertainty")}</h4>
    <p>{finding.uncertainty}</p>
    <details class={styles.reviewDetails}>
      <summary>
        {finding.mode === "simulation"
          ? t("finding.aboutScripted")
          : finding.mode === "imported"
            ? t("finding.importedReview")
            : t("finding.independentReview")}
      </summary>
      <p>{finding.review.summary}</p>
      {#each finding.review.alternative_explanations as item, i (i)}<p>
          {t("finding.alternative", { text: item })}
        </p>{/each}
      {#each finding.review.missing_context as item, i (i)}<p>
          {t("finding.missingContext", { text: item })}
        </p>{/each}
      {#if finding.review.analyst_summary}<p>
          {t("finding.analyst", { text: finding.review.analyst_summary })}
        </p>{/if}
      {#if finding.review.legal_note}<p>{finding.review.legal_note}</p>{/if}
      <small>
        {finding.mode === "simulation"
          ? t("finding.prepared")
          : finding.mode === "imported"
            ? t("finding.importedVerify")
            : t("finding.quoteMatches")}
      </small>
    </details>
    {#if finding.legal.length > 0}
      <h4>{t("finding.legal")}</h4>
      <LegalResults results={finding.legal}></LegalResults>
    {/if}
    <div class={styles.question}>
      <h4>{t("common.questionToConsider")}</h4>
      <p>{finding.question}</p>
      <button
        class={styles.textButton}
        onclick={async () => {
          try {
            await navigator.clipboard.writeText(finding.question);
            copied = true;
            copyError = "";
          } catch {
            copyError = t("finding.clipboardError");
          }
        }}
      >
        {#if copied}<Check size={14}></Check>{:else}<Download size={14}
          ></Download>{/if}
        {copied ? t("common.copied") : t("common.copyQuestion")}
      </button>
      <span class={styles.srOnly} role="status">
        {copied ? t("finding.questionCopied") : ""}
      </span>
      {#if copyError}<p role="alert">{copyError}</p>{/if}
    </div>
    <label class={styles.noteField}>
      {t("finding.note")}
      <textarea
        value={note}
        oninput={(e) => onNote(e.currentTarget.value)}
        rows={3}
        maxlength={4000}
        placeholder={t("finding.notePlaceholder")}></textarea>
    </label>
    {#if note !== finding.note}<p class={styles.draftNotice} role="status">
        {t("finding.unsaved")}
      </p>{/if}
    <div class={styles.reviewActions}>
      <button
        class={styles.primary}
        disabled={busy}
        onclick={() => save({ reviewed: !finding.reviewed, note })}
      >
        <Check size={15}></Check>
        {finding.reviewed ? t("finding.reopen") : t("finding.markReviewed")}
      </button>
      <button
        class={styles.secondary}
        disabled={busy || note === finding.note}
        onclick={() => save({ reviewed: finding.reviewed, note })}
      >
        {t("finding.saveNote")}
      </button>
    </div>
    {#if finding.reviewed}<p class={styles.reviewed}>
        <Check size={14}></Check>
        {t("finding.reviewedByYou")}
      </p>{/if}
  </div>
</div>
