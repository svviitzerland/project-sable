<script lang="ts">
  import { ChevronLeft, ChevronRight, X } from "@lucide/svelte";
  import { t } from "../lib/i18n";
  import { inspect, ui } from "../lib/store.svelte";
  import FindingDetail from "./FindingDetail.svelte";
  import NodeDetail from "./NodeDetail.svelte";
  import Overlay from "./Overlay.svelte";

  /** The global inspector: a side drawer on tablets and laptops, a full-height sheet on phones. */
  let phone = $derived(ui.vw < 720);
  let target = $derived(ui.inspector);
  let index = $derived(target?.kind === "finding" ? ui.inspectorQueue.indexOf(target.id) : -1);

  const titles = {
    finding: "nav.findings",
    passage: "ix.passage",
    statement: "ix.statement",
    connection: "ix.connection",
    legal: "ix.legal",
  } as const;

  function step(delta: number) {
    const id = ui.inspectorQueue[index + delta];
    if (id) inspect({ kind: "finding", id }, ui.inspectorQueue);
  }

  function onkeydown(event: KeyboardEvent) {
    const el = event.target as HTMLElement;
    if (!target || index < 0 || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || event.metaKey || event.ctrlKey) return;
    if (event.key.toLowerCase() === "j") step(1);
    else if (event.key.toLowerCase() === "k") step(-1);
  }
</script>

<svelte:window {onkeydown} />

<Overlay
  open={!!target}
  onclose={() => (ui.inspector = null)}
  variant={phone ? "sheet" : "drawer"}
  label={target ? t(titles[target.kind]) : ""}
  width={560}
>
  {#if target}
    <div class="bar">
      <button class="btn btn-ghost btn-icon" onclick={() => (ui.inspector = null)} aria-label={t("common.close")} data-autofocus>
        {#if phone}<ChevronLeft size={20} />{:else}<X size={18} />{/if}
      </button>
      <span class="bar-title">{t(titles[target.kind])}</span>
      {#if index >= 0 && ui.inspectorQueue.length > 1}
        <span class="tabular small muted">{t("fd.position", { i: index + 1, n: ui.inspectorQueue.length })}</span>
        <button class="btn btn-ghost btn-icon" aria-label={t("fd.prev")} disabled={index === 0} onclick={() => step(-1)}><ChevronLeft size={18} /></button>
        <button class="btn btn-ghost btn-icon" aria-label={t("fd.next")} disabled={index >= ui.inspectorQueue.length - 1} onclick={() => step(1)}><ChevronRight size={18} /></button>
      {/if}
    </div>
    <div class="body scroll-y">
      {#key target}
        {#if target.kind === "finding"}
          <FindingDetail id={target.id} />
        {:else}
          <NodeDetail {target} />
        {/if}
      {/key}
    </div>
  {/if}
</Overlay>

<style>
  .bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--line);
    min-height: 54px;
  }
  .bar-title {
    flex: 1;
    font-weight: 600;
    color: var(--ink-strong);
  }
  .body {
    flex: 1;
    min-height: 0;
  }
</style>
