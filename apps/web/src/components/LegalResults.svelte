<script lang="ts">
  import { t } from "../lib/i18n/index.svelte";
  import { ExternalLink } from "@lucide/svelte";
  import { type LegalReference } from "../lib/workspace-api";
  import styles from "./workspace.module.css";

  let { results }: { results: LegalReference[] } = $props();
</script>

<div class={styles.lawResults}>
  {#each results as r (r.id)}<article>
      <span>
        {r.reference} · {r.status}
        {r.status_uncertain ? t("legal.uncertain") : ""}
      </span>
      <h3>
        <a href={r.url} target="_blank" rel="external noreferrer">
          {r.title}
          <ExternalLink size={14}></ExternalLink>
        </a>
      </h3>
      <p>{t("legal.openOriginal")}</p>
      {#each r.articles as a (a.url)}<a
          href={a.url}
          target="_blank"
          rel="external noreferrer"
        >
          {t("legal.article", { article: a.article })}
          <ExternalLink size={12}></ExternalLink>
        </a>{/each}
    </article>{/each}
</div>
