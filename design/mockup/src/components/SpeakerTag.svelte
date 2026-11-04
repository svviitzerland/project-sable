<script lang="ts">
  import { t } from "../lib/i18n";
  import { speaker, speakerName, ui } from "../lib/store.svelte";

  let { id, compact = false }: { id: string; compact?: boolean } = $props();
  let sp = $derived(speaker(id));
  let unknown = $derived(sp?.role === "unknown" && !sp.confirmed);
</script>

{#if unknown}
  <button
    class="speaker unknown"
    data-role="unknown"
    title={t("live.nameSpeaker")}
    onclick={(e) => {
      e.stopPropagation();
      ui.modal = { kind: "rename", speakerId: id };
    }}
  >
    <span class="swatch" aria-hidden="true"></span>
    {speakerName(sp)}
    {#if !compact}<span class="hint">· {t("live.nameSpeaker")}</span>{/if}
  </button>
{:else}
  <span class="speaker" data-role={sp?.role}>
    <span class="swatch" aria-hidden="true"></span>
    {speakerName(sp)}
  </span>
{/if}

<style>
  .speaker {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-strong);
    white-space: nowrap;
    min-width: 0;
  }
  .swatch {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: var(--muted);
    flex-shrink: 0;
  }
  [data-role="judge"] .swatch, [data-role="judge_member"] .swatch { background: #5b6b8c; }
  [data-role="prosecutor"] .swatch { background: #8c5b5b; }
  [data-role="defense"] .swatch { background: var(--rel-supports); }
  [data-role="witness"] .swatch { background: #a4772f; border-radius: 50%; }
  [data-role="defendant"] .swatch { background: #6f6a5a; }
  .unknown {
    color: var(--muted);
    border-bottom: 1px dashed var(--line-strong);
    border-radius: 0;
  }
  .unknown:hover { color: var(--focus); }
  .unknown .swatch { background: transparent; border: 1.5px dashed var(--muted); }
  .hint { font-weight: 500; }
</style>
