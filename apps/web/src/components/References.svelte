<script lang="ts">
  import { t, tp } from "../lib/i18n/index.svelte";
  import Skeleton from "./Skeleton.svelte";
  import { BookOpen, Info, Search } from "@lucide/svelte";
  import { api, type LegalReference } from "../lib/workspace-api";
  import ui from "./workspace.module.css";
  import styles from "./case-tabs.module.css";
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

<div class={styles.screen}>
  <header class={styles.heading}>
    <h2>{t("references.title")}</h2>
    <p>{t("references.lead")}</p>
  </header>
  <form
    class={`${styles.searchBox} ${styles.ask}`}
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
    <Search size={20}></Search>
    <label class={ui.srOnly} for="legal-search">
      {t("references.searchLabel")}
    </label>
    <input
      id="legal-search"
      placeholder={t("references.placeholder")}
      value={query}
      oninput={(e) => (query = e.currentTarget.value)}
      minLength={2}
      maxlength={160}
      disabled={!configured}
      required
    />
    <button class={ui.primary} disabled={!configured || busy}>
      {busy ? t("common.searching") : t("references.search")}
    </button>
  </form>
  <div class={styles.under}>
    <p class={styles.note}>
      <Info size={14}></Info>
      {t("references.notice")}
    </p>
  </div>
  {#if error}<p class={`${ui.error} ${styles.error}`} role="alert">
      {error}
    </p>{/if}
  {#if busy}<div class={styles.loadingBlock}>
      <Skeleton variant="reader" label={t("references.skeleton")} />
    </div>{:else if !configured}<div class={styles.empty}>
      <BookOpen size={30}></BookOpen>
      <h3>{t("references.unavailableTitle")}</h3>
      <p>{t("references.unavailableText")}</p>
    </div>{:else if results === null}<div class={styles.empty}>
      <Search size={28}></Search>
      <h3>{t("references.beginTitle")}</h3>
      <p>{t("references.beginText")}</p>
    </div>{:else if results.length}
    <div class={styles.listHead}>
      <h3>{tp("tabs.references.count", results.length)}</h3>
    </div>
    <LegalResults {results}></LegalResults>
  {:else}<div class={styles.empty}>
      <Search size={28}></Search>
      <h3>{t("references.noneTitle")}</h3>
      <p>{t("references.noneText")}</p>
    </div>{/if}
</div>
