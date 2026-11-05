<script lang="ts">
  import Mark from "./Mark.svelte";
  import { ChevronRight } from "@lucide/svelte";
  import { fmtClock, l, t } from "../lib/i18n";
  import { statement } from "../lib/store.svelte";
  import type { Finding } from "../lib/types";

  /**
   * One finding in Temuan's queue: a single line that opens it beside the list, or in a sheet on
   * narrow screens. Temuan is the only place findings are worked on; other pages use FindingLink.
   */
  let { f, onopen }: { f: Finding; onopen?: () => void } = $props();

  let st = $derived(statement(f.statementId));
  let loud = $derived(f.status === "potential_inconsistency");
</script>

<button class="compact" class:loud class:done={f.reviewed} onclick={onopen}>
  <span class="mark" aria-hidden="true"><Mark kind={f.reviewed ? "done" : "look"} size={12} /></span>
  <span class="compact-body">
    <span class="compact-title clamp-2">{l(f.title)}</span>
    <span class="xsmall muted">{t(`status.${f.status}`)}{st ? ` · ${fmtClock(st.t)}` : ""}</span>
  </span>
  <ChevronRight size={16} />
</button>

<style>
  .compact {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    text-align: left;
    border-radius: var(--radius-action);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--ink-strong);
  }
  .compact:hover {
    border-color: var(--line-strong);
  }
  .mark {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--st-context-dot);
    color: #fff;
    font-weight: 800;
    font-size: 13px;
  }
  .loud .mark {
    background: var(--alert);
  }
  .done .mark {
    background: var(--line-strong);
  }
  .compact-body {
    display: grid;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }
  .compact-title {
    font-size: 13px;
    font-weight: 600;
  }
</style>
