<script lang="ts">
  /**
   * The attention mark, drawn rather than typed so it matches the icon set: an exclamation for
   * "worth a look", a tick once checked, a dot for findings that ask for nothing.
   */
  let { kind = "look", size = 12 }: { kind?: "look" | "done" | "quiet"; size?: number } = $props();
</script>

<svg class="mark" width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
  {#if kind === "look"}
    <path d="M6 2.1v4.8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
    <circle cx="6" cy="9.5" r="1.1" fill="currentColor" />
  {:else if kind === "done"}
    <path d="M2.6 6.3l2.2 2.2 4.6-4.9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
  {:else}
    <circle cx="6" cy="6" r="1.7" fill="currentColor" />
  {/if}
</svg>

<style>
  .mark {
    display: block;
    flex-shrink: 0;
  }
</style>
