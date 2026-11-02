<script lang="ts">
  import { t } from "../lib/i18n/index.svelte";
  import { ExternalLink } from "@lucide/svelte";
  import { type LegalReference } from "../lib/workspace-api";
  import styles from "./case-tabs.module.css";

  let { results }: { results: LegalReference[] } = $props();
</script>

<ul class={styles.law}>
  {#each results as r (r.id)}<li>
      <div class={styles.lawMeta}>
        {#if r.reference}<span class={styles.chip}>{r.reference}</span>{/if}
        {#if r.status}<span
            class={`${styles.chip} ${r.status_uncertain ? styles.chipWarm : ""}`}
          >
            {r.status}{r.status_uncertain ? t("legal.uncertain") : ""}
          </span>{/if}
      </div>
      <h3>
        <a href={r.url} target="_blank" rel="external noreferrer">
          {r.title}<ExternalLink size={14}></ExternalLink>
        </a>
      </h3>
      {#if r.best_passage}<p class={styles.lawBest}>
          <a
            href={r.best_passage.url}
            target="_blank"
            rel="external noreferrer"
          >
            {t("legal.bestPassage", { article: r.best_passage.article })}
            <ExternalLink size={12}></ExternalLink>
          </a>
        </p>{/if}
      {#if r.articles.length}<div class={styles.lawArticles}>
          {#each r.articles as a (a.url)}<a
              class={styles.chip}
              href={a.url}
              target="_blank"
              rel="external noreferrer"
            >
              {t("legal.article", { article: a.article })}
              <ExternalLink size={12}></ExternalLink>
            </a>{/each}
        </div>{/if}
    </li>{/each}
</ul>
<p class={`${styles.meta} ${styles.lawNote}`}>{t("legal.openOriginal")}</p>
