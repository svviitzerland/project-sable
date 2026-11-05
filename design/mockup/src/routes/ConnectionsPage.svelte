<script lang="ts">
  import { X } from "@lucide/svelte";
  import EvidenceMap from "../components/EvidenceMap.svelte";
  import GroupPanel from "../components/GroupPanel.svelte";
  import Overlay from "../components/Overlay.svelte";
  import ThingPicker from "../components/ThingPicker.svelte";
  import { keyOf, type BoardRef } from "../lib/board.svelte";
  import { groupsOf, idOf, keysFor, kindOf, membersOf, pair, pairingsOf } from "../lib/evidence.svelte";
  import { t } from "../lib/i18n";
  import { go, route } from "../lib/router.svelte";
  import type { Relation } from "../lib/types";

  /**
   * Keterkaitan: all of the case's evidence by type on one map. Choosing a piece of evidence
   * gathers its group (everything its pairings reach) and opens the group beside the map, where
   * its pairings can be confirmed, changed, taken apart or added to.
   */
  let { caseId }: { caseId: string } = $props();

  let of = $derived(route.query.of ?? route.query.start);
  let pairings = $derived(pairingsOf(caseId));
  let groups = $derived(groupsOf(pairings));
  let picked = $derived(keysFor(of));
  let members = $derived(membersOf(groups, picked));
  let hidden = $state<Relation[]>([]);
  let width = $state(0);
  let finding = $state(false);
  let pairFrom = $state<string | null>(null);

  function choose(ref: BoardRef) {
    finding = false;
    go(`/case/${caseId}/connections?of=${keyOf(ref)}`);
  }
  function pairTo(ref: BoardRef) {
    const from = pairFrom;
    pairFrom = null;
    const fk = from ? kindOf(from) : null;
    if (!from || (fk !== "statement" && fk !== "passage") || (ref.kind !== "statement" && ref.kind !== "passage")) return;
    pair({ kind: fk, id: idOf(from) }, { kind: ref.kind, id: ref.id });
  }
</script>

<div class="page connections-page" bind:clientWidth={width}>
  <header class="page-head">
    <div>
      <h1>{t("cx.title")}</h1>
      <p>{t("cx.lead")}</p>
    </div>
  </header>
  <div class="split" class:grouped={picked.length > 0} class:side={width >= 1080}>
    <EvidenceMap {caseId} selected={of} {pairings} {members} {picked} bind:hidden onpick={() => (finding = true)} />
    {#if picked.length}
      <aside class="panel" aria-label={t("cx.map.groupLabel")}>
        <GroupPanel {caseId} {members} {picked} {pairings} onpair={(key) => (pairFrom = key)} />
      </aside>
    {/if}
  </div>
</div>

<Overlay open={finding} onclose={() => (finding = false)} variant={width >= 880 ? "dialog" : "sheet"} label={t("cx.map.pick")} width={620}>
  <div class="pick-head">
    <h2 class="t-serif">{t("cx.map.pick")}</h2>
    <button class="btn btn-ghost btn-icon" aria-label={t("common.close")} onclick={() => (finding = false)}><X size={18} /></button>
  </div>
  <div class="pick-body scroll-y"><ThingPicker {caseId} kinds={["statement", "document"]} onpick={choose} /></div>
</Overlay>

<Overlay open={!!pairFrom} onclose={() => (pairFrom = null)} variant={width >= 880 ? "dialog" : "sheet"} label={t("cx.group.pickTitle")} width={620}>
  <div class="pick-head">
    <h2 class="t-serif">{t("cx.group.pickTitle")}</h2>
    <button class="btn btn-ghost btn-icon" aria-label={t("common.close")} onclick={() => (pairFrom = null)}><X size={18} /></button>
  </div>
  <div class="pick-body scroll-y"><ThingPicker {caseId} kinds={["statement", "document"]} wholeDoc={false} suggest={false} onpick={pairTo} /></div>
</Overlay>

<style>
  .connections-page {
    max-width: 1600px;
  }
  .split {
    --map-h: clamp(440px, calc(100dvh - 290px), 880px);
    display: grid;
    gap: 16px;
    align-items: start;
  }
  .panel {
    min-width: 0;
  }
  /* With room (by the page's own width), the group sits beside the map and scrolls on its own. */
  .split.side.grouped {
    grid-template-columns: minmax(0, 1fr) minmax(360px, 430px);
  }
  .split.side.grouped .panel {
    max-height: calc(var(--map-h) + 52px);
    overflow: auto;
    padding: 2px;
  }
  .pick-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 12px 12px 20px;
    border-bottom: 1px solid var(--line);
  }
  .pick-head h2 {
    flex: 1;
    font-size: 22px;
  }
  .pick-body {
    display: grid;
    gap: 14px;
    padding: 16px 20px 20px;
    min-height: 0;
  }
</style>
