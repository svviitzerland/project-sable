<script lang="ts">
  import { t } from "../lib/i18n/index.svelte";
  import { Download, FileText } from "@lucide/svelte";
  import { type Source } from "../lib/workspace-api";
  import styles from "./case-tabs.module.css";

  let {
    source,
    caseId,
    quote,
  }: {
    source: Source;
    caseId: string;
    quote?: string;
  } = $props();

  let index = $derived(quote ? source.text.indexOf(quote) : -1);
</script>

<div class={styles.sourceCard}>
  <div class={styles.sourceHead}>
    <FileText size={15}></FileText>
    <span>
      <strong>{source.document_name}</strong>
      <small>
        {source.section
          ? t("source.docxSection")
          : t("common.page", { page: source.page })}
      </small>
    </span>
  </div>
  <p>
    {#if index >= 0 && quote}{source.text.slice(0, index)}<mark>{quote}</mark
      >{source.text.slice(index + quote.length)}{:else}{source.text}{/if}
  </p>
  <a
    rel="external"
    href={`/api/v1/cases/${caseId}/documents/${source.document_id}/original`}
  >
    <Download size={13}></Download>
    {t("common.downloadOriginal")}
  </a>
</div>
