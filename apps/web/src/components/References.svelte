<script lang="ts">
  import Skeleton from "./Skeleton.svelte";
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
    Open the original source to verify the wording and whether it applies to your case.
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
      {busy ? "Searching…" : "Search legislation"}
    </button>
  </form>
  {#if error}<p class={styles.error} role="alert">
      {error}
    </p>{/if}
  {#if busy}<Skeleton
      variant="reader"
      label="Searching legal references…"
    />{:else if !configured}<Empty
      title="Legal search is unavailable."
      text="You can still upload legislation under Case documents and reference it in the case assistant."
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
