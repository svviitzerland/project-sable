<script lang="ts">
  import { Download, FileText } from "@lucide/svelte";
  import { type Source } from "../lib/workspace-api";
  import styles from "./workspace.module.css";

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
  <div>
    <FileText size={15}></FileText>
    <strong>{source.document_name}</strong>
  </div>
  <span>
    {source.section
      ? "DOCX text section · pagination unavailable"
      : `Page ${source.page}`}
  </span>
  <p>
    {#if index >= 0 && quote}
      {source.text.slice(0, index)}
      <mark>{quote}</mark>
      {source.text.slice(index + quote.length)}
    {:else}{source.text}{/if}
  </p>
  <a
    rel="external"
    href={`/api/v1/cases/${caseId}/documents/${source.document_id}/original`}
  >
    <Download size={13}></Download>
    Download original
  </a>
</div>
