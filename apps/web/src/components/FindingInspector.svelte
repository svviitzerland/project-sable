<script lang="ts">
  import { t } from "../lib/i18n/index.svelte";
  import Skeleton from "./Skeleton.svelte";
  import {
    Check,
    ChevronDown,
    Copy,
    Download,
    MessageSquareText,
    Sparkles,
  } from "@lucide/svelte";
  import {
    api,
    relationLabel,
    speakerName,
    timestamp,
    type Finding,
    type Segment,
    type Source,
  } from "../lib/workspace-api";
  import styles from "./hearing.module.css";
  import { untrack } from "svelte";

  let {
    finding,
    segment,
    caseId,
    busy,
    speakers = {},
    save,
    onAsk,
  }: {
    finding: Finding;
    segment?: Segment;
    caseId: string;
    busy: boolean;
    speakers?: Record<string, string>;
    save: (body: { reviewed: boolean; note: string }) => Promise<boolean>;
    /** Opens the assistant about this finding. */
    onAsk?: () => void;
  } = $props();

  let source = $state<Source | null>(null);
  let sourceError = $state("");
  let citationIndex = $state(0);
  let copied = $state(false);
  let note = $state(untrack(() => finding.note));
  let noteOpen = $state(untrack(() => !!finding.note));
  let full = $state(false);
  let copyError = $state("");

  let citation = $derived(finding.citations[citationIndex]);
  let quoteAt = $derived(
    source && citation?.quote ? source.text.indexOf(citation.quote) : -1,
  );

  $effect(() => {
    void [caseId, citation?.chunk_id];
    return untrack(() => {
      let alive = true;
      source = null;
      sourceError = "";
      if (citation?.chunk_id)
        api<Source>(
          `/cases/${caseId}/sources/${encodeURIComponent(citation.chunk_id)}`,
        )
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

<div class={styles.detail}>
  {#if segment}
    <figure class={styles.said}>
      <figcaption>
        {speakerName(segment.speaker, speakers)} · {timestamp(segment.start)}
      </figcaption>
      <blockquote>{segment.text}</blockquote>
    </figure>
  {/if}

  <p class={styles.explain} data-full={full || undefined}>
    {finding.explanation}
  </p>
  {#if finding.explanation.length > 320}<button
      class={styles.link}
      aria-expanded={full}
      onclick={() => (full = !full)}
      >{full ? t("finding.showLess") : t("finding.showMore")}</button
    >{/if}

  <div class={styles.block}>
    <h4>{t("common.atSource")}</h4>
    {#if finding.citations.length > 1}<div class={styles.tabs}>
        {#each finding.citations as c, i (i)}<button
            aria-pressed={i === citationIndex}
            onclick={() => (citationIndex = i)}
          >
            {t("finding.sourceTab", {
              n: i + 1,
              relation: relationLabel(c.relation),
            })}
          </button>{/each}
      </div>{/if}
    {#if sourceError}<p role="alert" class={styles.alert}>{sourceError}</p>
    {:else if source && source.id === citation?.chunk_id}
      <div class={styles.source} data-relation={citation.relation}>
        <div class={styles.sourceHead}>
          <strong>
            {source.kind === "testimony"
              ? t("finding.earlierTestimony", {
                  speaker: speakerName(source.speaker ?? "", speakers),
                  time: timestamp(source.start ?? 0),
                })
              : source.document_name}
          </strong>
          <small>
            {source.kind === "testimony"
              ? source.document_name
              : source.section
                ? t("source.docxSection")
                : t("common.page", { page: source.page })}
          </small>
        </div>
        <p>
          {#if quoteAt >= 0 && citation.quote}{source.text.slice(
              Math.max(0, quoteAt - 220),
              quoteAt,
            )}<mark>{citation.quote}</mark>{source.text.slice(
              quoteAt + citation.quote.length,
              quoteAt + citation.quote.length + 220,
            )}{:else}{source.text.slice(0, 600)}{/if}
        </p>
        {#if source.document_id}<a
            rel="external"
            href={`/api/v1/cases/${caseId}/documents/${source.document_id}/original`}
          >
            <Download size={13}></Download>
            {t("common.downloadOriginal")}
          </a>{/if}
      </div>
    {:else if citation}<Skeleton
        variant="compact"
        label={t("finding.loadingPassage")}
      />
    {:else}<p class={styles.quiet}>{t("finding.noCitation")}</p>{/if}
  </div>

  <div class={styles.block}>
    <h4>{t("common.whatToVerify")}</h4>
    <p>{finding.verification}</p>
  </div>

  <div class={`${styles.block} ${styles.ask}`}>
    <h4>{t("common.questionToConsider")}</h4>
    <p>{finding.question}</p>
    <div class={styles.row}>
      <button
        class={styles.link}
        onclick={async () => {
          try {
            await navigator.clipboard.writeText(finding.question);
            copied = true;
            copyError = "";
          } catch {
            copied = false;
            copyError = t("finding.clipboardError");
          }
        }}
      >
        {#if copied}<Check size={13}></Check>{:else}<Copy size={13}></Copy>{/if}
        {copied ? t("common.copied") : t("common.copyQuestion")}
      </button>
      {#if onAsk}<button class={styles.link} onclick={onAsk}>
          <Sparkles size={13}></Sparkles>
          {t("finding.askJude")}
        </button>{/if}
    </div>
    {#if copyError}<p role="alert" class={styles.alert}>{copyError}</p>{/if}
  </div>

  <details class={styles.more}>
    <summary>
      {t("finding.moreDetail")}
      <ChevronDown size={14}></ChevronDown>
    </summary>
    <div>
      {#if finding.uncertainty}<p>
          <strong>{t("finding.uncertainty")}:</strong>
          {finding.uncertainty}
        </p>{/if}
      {#if finding.review.summary && finding.review.summary !== finding.explanation}<p
        >
          <strong
            >{finding.mode === "imported"
              ? t("finding.importedReview")
              : t("finding.independentReview")}:</strong
          >
          {finding.review.summary}
        </p>{/if}
      {#each finding.review.alternative_explanations as item, i (i)}<p>
          {t("finding.alternative", { text: item })}
        </p>{/each}
      {#each finding.review.missing_context as item, i (i)}<p>
          {t("finding.missingContext", { text: item })}
        </p>{/each}
      <small>
        {finding.mode === "imported"
          ? t("finding.importedVerify")
          : t("finding.quoteMatches")}
      </small>
    </div>
  </details>

  {#if noteOpen}
    <label class={styles.note}>
      <span>{t("finding.note")}</span>
      <textarea
        bind:value={note}
        rows={2}
        maxlength={4000}
        placeholder={t("finding.notePlaceholder")}></textarea>
    </label>
  {/if}

  <div class={styles.actions}>
    <button
      class={finding.reviewed ? styles.secondary : styles.primary}
      disabled={busy}
      onclick={() => save({ reviewed: !finding.reviewed, note })}
    >
      <Check size={15}></Check>
      {finding.reviewed ? t("finding.reopen") : t("finding.markReviewed")}
    </button>
    {#if !noteOpen}<button
        class={styles.link}
        onclick={() => (noteOpen = true)}
      >
        <MessageSquareText size={14}></MessageSquareText>
        {t("finding.addNote")}
      </button>{:else if note !== finding.note}<button
        class={styles.link}
        disabled={busy}
        onclick={() => save({ reviewed: finding.reviewed, note })}
      >
        {t("finding.saveNote")}
      </button>{/if}
  </div>
</div>
