<script lang="ts">
  import type { Snippet } from "svelte";
  import { X } from "@lucide/svelte";
  import { t } from "../lib/i18n/index.svelte";

  let {
    open,
    title,
    onClose,
    children,
    footer,
  }: {
    open: boolean;
    title: string;
    onClose: () => void;
    children: Snippet;
    footer?: Snippet;
  } = $props();

  let dialog = $state<HTMLDialogElement>();
  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });
</script>

<dialog
  bind:this={dialog}
  class="jude-modal"
  aria-labelledby="modal-title"
  onclose={onClose}
  onclick={(e) => {
    if (e.target === dialog) onClose();
  }}
>
  <div class="jude-modal-body">
    <header>
      <h2 id="modal-title">{title}</h2>
      <button
        class="jude-modal-close"
        onclick={onClose}
        aria-label={t("common.close")}
      >
        <X size={18}></X>
      </button>
    </header>
    {@render children()}
    {#if footer}<footer>{@render footer()}</footer>{/if}
  </div>
</dialog>

<style>
  .jude-modal {
    margin: auto;
    border: 0;
    padding: 0;
    border-radius: 10px;
    width: min(460px, calc(100vw - 32px));
    background: #fbf8f1;
    color: #1d2a22;
    box-shadow: 0 24px 60px rgb(15 30 20 / 28%);
  }
  .jude-modal::backdrop {
    background: rgb(16 32 24 / 45%);
  }
  .jude-modal-body {
    padding: 22px 24px 20px;
    display: grid;
    gap: 16px;
  }
  header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 12px;
  }
  h2 {
    margin: 0;
    font:
      400 23px/1.2 Rufina,
      Georgia,
      serif;
    color: #173a2c;
  }
  .jude-modal-close {
    border: 0;
    background: transparent;
    padding: 4px;
    color: #4e604e;
    cursor: pointer;
    border-radius: 5px;
  }
  .jude-modal-close:hover {
    background: #ecefe5;
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 4px;
  }
</style>
