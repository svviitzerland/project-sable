<script lang="ts">
  import { t } from "../lib/i18n/index.svelte";
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
    <h2>{t("references.title")}</h2>
    <p>{t("references.lead")}</p>
  </div>
  <p class={styles.notice}>
    <BookOpen size={17}></BookOpen>
    {t("references.notice")}
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
      {t("references.searchLabel")}
    </label>
    <input
      id="legal-search"
      placeholder={t("references.placeholder")}
      value={query}
      oninput={(e) => (query = e.currentTarget.value)}
      minLength={2}
      maxlength={160}
      required
    />
    <button class={styles.primary} disabled={!configured || busy}>
      {busy ? t("common.searching") : t("references.search")}
    </button>
  </form>
  {#if error}<p class={styles.error} role="alert">
      {error}
    </p>{/if}
  {#if busy}<Skeleton
      variant="reader"
      label={t("references.skeleton")}
    />{:else if !configured}<Empty
      title={t("references.unavailableTitle")}
      text={t("references.unavailableText")}
      >{#snippet icon()}<BookOpen size={32}></BookOpen>{/snippet}</Empty
    >{:else}{#if results === null}<Empty
        title={t("references.beginTitle")}
        text={t("references.beginText")}
        >{#snippet icon()}<Search size={30}></Search>{/snippet}</Empty
      >{:else}{#if results.length}<LegalResults {results}
        ></LegalResults>{:else}<Empty
          title={t("references.noneTitle")}
          text={t("references.noneText")}
          >{#snippet icon()}<Search size={30}></Search>{/snippet}</Empty
        >{/if}{/if}{/if}
</div>
