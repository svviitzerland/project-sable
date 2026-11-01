<script lang="ts">
  import "../app.css";
  import { onMount, untrack } from "svelte";
  import {
    LANG_COOKIE,
    LANG_STORAGE_KEY,
    i18n,
    isLang,
    readCookie,
    setLang,
    t,
  } from "../lib/i18n/index.svelte";

  let { children, data } = $props();

  // Same language as the server render, so hydration matches the first paint.
  setLang(
    untrack(() => data.lang),
    false,
  );

  onMount(() => {
    // Without a saved cookie, a preference kept in localStorage still wins.
    if (readCookie(document.cookie, LANG_COOKIE)) return;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LANG_STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (isLang(stored) && stored !== i18n.lang) setLang(stored);
  });
</script>

<svelte:head>
  <title>{t("meta.title")}</title>
  <meta name="description" content={t("meta.description")} />
</svelte:head>
{@render children()}
