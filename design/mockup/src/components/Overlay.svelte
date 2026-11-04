<script lang="ts">
  import { tick, type Snippet } from "svelte";
  import { fade, fly } from "svelte/transition";

  /**
   * One overlay primitive with three shapes: a side drawer (tablet/desktop), a bottom sheet
   * (phone) and a centered dialog. Focus moves inside, Tab stays inside, Escape closes and
   * focus returns to the control that opened it.
   */
  let {
    open,
    onclose,
    variant = "drawer",
    label,
    width = 480,
    children,
  }: {
    open: boolean;
    onclose: () => void;
    variant?: "drawer" | "sheet" | "dialog";
    label: string;
    width?: number;
    children: Snippet;
  } = $props();

  let panel: HTMLElement | undefined = $state();
  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const duration = reduced ? 0 : 220;

  const focusable = () =>
    Array.from(
      panel?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((el) => el.offsetParent !== null);

  $effect(() => {
    if (!open) return;
    const restore = document.activeElement as HTMLElement | null;
    // Focus as soon as the panel is in the DOM, so typing right after the shortcut is not lost.
    void tick().then(() => {
      const target = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? focusable()[0] ?? panel;
      target?.focus();
    });
    return () => {
      if (restore?.isConnected) restore.focus();
    };
  });

  function onkeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onclose();
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusable();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
</script>

{#if open}
  <div class="overlay {variant}" role="presentation" {onkeydown}>
    <!-- Pointer-only dismissal; keyboard and screen-reader users close with Escape or the panel's own button. -->
    <button class="scrim" tabindex="-1" aria-hidden="true" onclick={onclose} transition:fade={{ duration }}></button>
    <div
      class="panel"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabindex="-1"
      bind:this={panel}
      style:--w="{width}px"
      transition:fly={variant === "drawer" ? { x: 40, duration } : { y: 40, duration }}
    >
      {@render children()}
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
  }
  .scrim {
    position: absolute;
    inset: 0;
    background: var(--scrim);
    cursor: default;
  }
  .panel {
    position: relative;
    background: var(--surface);
    box-shadow: var(--shadow-overlay);
    display: flex;
    flex-direction: column;
    min-height: 0;
    outline: none;
  }
  .drawer {
    justify-content: flex-end;
  }
  .drawer .panel {
    width: min(var(--w), 100vw);
    height: 100dvh;
    border-left: 1px solid var(--line);
  }
  .sheet {
    align-items: flex-end;
  }
  .sheet .panel {
    width: 100%;
    height: calc(100dvh - 12px);
    border-radius: 14px 14px 0 0;
    padding-bottom: var(--safe-bottom);
  }
  .dialog {
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .dialog .panel {
    width: min(var(--w), 100%);
    max-height: min(820px, calc(100dvh - 32px));
    border-radius: var(--radius-surface);
    border: 1px solid var(--line);
  }
  @media (max-width: 599px) {
    .dialog {
      align-items: flex-end;
      padding: 0;
    }
    .dialog .panel {
      width: 100%;
      max-height: calc(100dvh - 24px);
      border-radius: 14px 14px 0 0;
      padding-bottom: var(--safe-bottom);
    }
  }
</style>
