<script lang="ts">
  import { i18n, setLang, t, type Lang } from "../lib/i18n/index.svelte";

  let { class: className = "" }: { class?: string } = $props();

  const options: { lang: Lang; short: string; name: string }[] = [
    { lang: "id", short: "ID", name: "Bahasa Indonesia" },
    { lang: "en", short: "EN", name: "English" },
  ];
</script>

<div class={`language-toggle ${className}`} role="group" aria-label={t("lang.group")}>
  {#each options as option, index (option.lang)}
    {#if index > 0}<span class="divider" aria-hidden="true">|</span>{/if}
    <button
      type="button"
      lang={option.lang}
      aria-label={option.name}
      title={option.name}
      aria-pressed={i18n.lang === option.lang}
      onclick={() => setLang(option.lang)}>{option.short}</button
    >
  {/each}
</div>

<style>
  .language-toggle {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-family: var(--sans);
    font-size: 12px;
    letter-spacing: 0.06em;
    color: inherit;
    white-space: nowrap;
  }
  .divider {
    opacity: 0.45;
  }
  button {
    min-width: 32px;
    min-height: 32px;
    padding: 4px 6px;
    border: 0;
    border-radius: 4px;
    background: none;
    color: inherit;
    font: inherit;
    opacity: 0.68;
    cursor: pointer;
    transition:
      opacity 0.2s,
      background-color 0.2s;
  }
  button:hover {
    opacity: 1;
  }
  button[aria-pressed="true"] {
    opacity: 1;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  button:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 1px;
  }
</style>
