<script module lang="ts">
  import type { Component } from "svelte";

  export interface MenuItem {
    label: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon?: Component<any>;
    run: () => void;
    danger?: boolean;
    hint?: string;
  }
</script>

<script lang="ts">
  let {
    label,
    items,
    align = "end",
    button,
  }: {
    label: string;
    items: MenuItem[];
    align?: "start" | "end";
    button: import("svelte").Snippet<[{ open: boolean }]>;
  } = $props();

  let open = $state(false);
  let root: HTMLElement | undefined = $state();
  const id = `menu-${Math.random().toString(36).slice(2, 8)}`;

  function close(focusTrigger = false) {
    open = false;
    if (focusTrigger) root?.querySelector<HTMLElement>("[data-trigger]")?.focus();
  }

  function onkeydown(event: KeyboardEvent) {
    if (!open) return;
    const buttons = Array.from(root?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = buttons.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.stopPropagation();
      close(true);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      buttons[(index + 1) % buttons.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      buttons[(index - 1 + buttons.length) % buttons.length]?.focus();
    }
  }

  $effect(() => {
    if (!open) return;
    const handler = (event: PointerEvent) => {
      if (root && !root.contains(event.target as Node)) close();
    };
    setTimeout(() => root?.querySelector<HTMLElement>('[role="menuitem"]')?.focus(), 0);
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  });
</script>

<div class="menu" bind:this={root} {onkeydown} role="presentation">
  <button
    class="trigger"
    data-trigger
    aria-haspopup="menu"
    aria-expanded={open}
    aria-controls={id}
    aria-label={label}
    onclick={() => (open = !open)}
  >
    {@render button({ open })}
  </button>
  {#if open}
    <div class="list {align}" role="menu" {id}>
      {#each items as item (item.label)}
        <button
          role="menuitem"
          class:danger={item.danger}
          onclick={() => {
            close();
            item.run();
          }}
        >
          {#if item.icon}<item.icon size={16} />{/if}
          <span>{item.label}</span>
          {#if item.hint}<span class="kbd">{item.hint}</span>{/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .menu {
    position: relative;
    display: inline-flex;
  }
  .trigger {
    display: inline-flex;
  }
  .list {
    position: absolute;
    top: calc(100% + 6px);
    z-index: 50;
    min-width: 230px;
    padding: 6px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-action);
    box-shadow: var(--shadow-float);
    display: grid;
    gap: 2px;
  }
  .end {
    right: 0;
  }
  .start {
    left: 0;
  }
  [role="menuitem"] {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: var(--hit);
    padding: 0 10px;
    border-radius: var(--radius-control);
    font-size: var(--text-sm);
    color: var(--ink-strong);
    text-align: left;
  }
  [role="menuitem"] span:first-of-type {
    flex: 1;
  }
  [role="menuitem"]:hover,
  [role="menuitem"]:focus-visible {
    background: var(--sunken);
    outline: none;
  }
  .danger {
    color: var(--live);
  }
</style>
