<script lang="ts">
  import { X } from "@lucide/svelte";
  import { fly } from "svelte/transition";
  import { t } from "../lib/i18n";
  import { dismissToast, ui } from "../lib/store.svelte";
</script>

<div class="toasts" role="status" aria-live="polite">
  {#each ui.toasts as toast (toast.id)}
    <div class="toast" class:finding={toast.tone === "finding"} transition:fly={{ y: 12, duration: 180 }}>
      <span class="text">{toast.text}</span>
      {#if toast.action}
        <button
          class="action"
          onclick={() => {
            toast.action?.run();
            dismissToast(toast.id);
          }}>{toast.action.label}</button
        >
      {/if}
      <button class="close" aria-label={t("common.dismiss")} onclick={() => dismissToast(toast.id)}><X size={14} /></button>
    </div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    z-index: 80;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(24px + var(--safe-bottom));
    display: grid;
    gap: 8px;
    width: min(440px, calc(100vw - 24px));
    pointer-events: none;
  }
  @media (max-width: 719px) {
    .toasts {
      bottom: auto;
      top: calc(8px + env(safe-area-inset-top, 0px));
    }
  }
  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 10px 10px 14px;
    border-radius: var(--radius-action);
    background: var(--ink-strong);
    color: var(--surface);
    box-shadow: var(--shadow-float);
    font-size: var(--text-sm);
    font-weight: 500;
  }
  .toast.finding {
    background: var(--surface);
    color: var(--ink-strong);
    border: 1px solid var(--line-strong);
    border-left: 4px solid var(--st-inconsistency-dot);
  }
  .text {
    flex: 1;
  }
  .action {
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
    padding: 4px 6px;
  }
  .close {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 4px;
    opacity: 0.75;
  }
  .close:hover {
    opacity: 1;
  }
</style>
