<script lang="ts">
  import { BookOpen, Search } from "@lucide/svelte";
  import { api, type LegalReference } from "../lib/workspace-api";
  import styles from "./workspace.module.css";
  import Empty from "./Empty.svelte";
  import LegalResults from "./LegalResults.svelte";

  let {
    caseId,
    configured,
  }: {
    caseId: string;
    configured: boolean;
  } = $props();

  let query = $state("");

  let results = $state<LegalReference[] | null>(null);

  let error = $state("");

  let busy = $state(false);
</script>

<div class={styles.referencePage}>
  <div class={styles.sectionTitle}>
    <h2>Find the relevant legal source.</h2>
    <p>
      Discover Indonesian legislation through Pasal.id, then inspect its text at
      the original link.
    </p>
  </div>
  <p class={styles.notice}>
    <BookOpen size={17}></BookOpen>
    The REST API returns metadata and article links, not verified legal text. Results
    are not legal advice or a finding of applicability.
  </p>
  <form
    class={styles.searchForm}
    onsubmit={async (e) => {
      e.preventDefault();
      busy = true;
      error = "";
      try {
        const result = await api<{ results: LegalReference[] }>(
          `/cases/${caseId}/legal?q=${encodeURIComponent(query)}`,
        );
        results = result.results;
      } catch (e) {
        error = (e as Error).message;
      } finally {
        busy = false;
      }
    }}
  >
    <Search size={18}></Search>
    <label class={styles.srOnly} for="legal-search">
      Search Indonesian regulations
    </label>
    <input
      id="legal-search"
      placeholder="Use legal keywords, e.g. keterangan saksi"
      value={query}
      oninput={(e) => (query = e.currentTarget.value)}
      minLength={2}
      maxlength={160}
      required
    />
    <button class={styles.primary} disabled={!configured || busy}>
      {busy ? "Searching…" : "Search Pasal.id"}
    </button>
  </form>
  {#if error}<p class={styles.error} role="alert">
      {error}
    </p>{/if}
  {#if !configured}<Empty
      title="Connect legal discovery."
      text="Add PASAL_API_KEY to the backend environment to enable authenticated searches. No legal references are fabricated in the offline demonstration."
      >{#snippet icon()}<BookOpen size={32}></BookOpen>{/snippet}</Empty
    >{:else}{#if results === null}<Empty
        title="Begin with a legal issue."
        text="Search generic legal terms rather than names or personal case details. Every result opens its source for your review."
        >{#snippet icon()}<Search size={30}></Search>{/snippet}</Empty
      >{:else}{#if results.length}<LegalResults {results}
        ></LegalResults>{:else}<Empty
          title="No references found."
          text="Try a different regulation title or legal keyword."
          >{#snippet icon()}<Search size={30}></Search>{/snippet}</Empty
        >{/if}{/if}{/if}
</div>
