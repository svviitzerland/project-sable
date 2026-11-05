<script lang="ts">
  import KindIcon from "./KindIcon.svelte";
  import { Check, Search } from "@lucide/svelte";
  import type { BoardRef } from "../lib/board.svelte";
  import { fmtClock, l, t } from "../lib/i18n";
  import {
    docsOf,
    findingsOfCase,
    hearing,
    hearingsOf,
    isMeaningful,
    needsLook,
    passagesOf,
    speaker,
    speakerName,
    statement,
    statementsOf,
  } from "../lib/store.svelte";
  import Avatar from "./Avatar.svelte";
  import Quote from "./Quote.svelte";
  import StatusChip from "./StatusChip.svelte";

  /**
   * Choose one thing in the case to start from: a finding, a hearing statement, or a document
   * (whole, or one of its passages). Shared by the findings board and Evidence connections.
   */
  type Kind = "finding" | "statement" | "document";
  let { caseId, kinds, onpick }: { caseId: string; kinds: Kind[]; onpick: (ref: BoardRef) => void } = $props();

  // svelte-ignore state_referenced_locally
  let tab = $state<Kind>(kinds[0]);
  let query = $state("");
  let openDoc = $state<string | null>(null);
  const tabLabel: Record<Kind, Parameters<typeof t>[0]> = {
    finding: "board.fromFindings",
    statement: "board.fromStatement",
    document: "board.fromDocument",
  };

  // Worth a look first, then the ones already checked.
  let findingOptions = $derived(
    findingsOfCase(caseId)
      .filter(isMeaningful)
      .sort((a, b) => Number(needsLook(b)) - Number(needsLook(a))),
  );
  // Without findings on offer, the statements behind the open ones are the natural way in.
  let quick = $derived(kinds.includes("finding") ? [] : findingsOfCase(caseId).filter(needsLook).slice(0, 4));
  let statementOptions = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return hearingsOf(caseId)
      .flatMap((h) => statementsOf(h.id))
      .filter((s) => speaker(s.speakerId)?.role === "witness" || q)
      .filter((s) => !q || s.text.toLowerCase().includes(q))
      .slice(0, 40);
  });
  let docOptions = $derived(docsOf(caseId));
</script>

{#if quick.length && tab !== "document"}
  <section class="quick">
    <h3 class="t-label">{t("cx.startHere")}</h3>
    {#each quick as f (f.id)}
      {@const s = statement(f.statementId)}
      {#if s}
        <button class="row" onclick={() => onpick({ kind: "statement", id: s.id })}>
          <Avatar id={s.speakerId} size="xs" />
          <span class="clamp-2">“<Quote text={s.text} mark={f.said} />”</span>
        </button>
      {/if}
    {/each}
  </section>
{/if}

{#if kinds.length > 1}
  <div class="seg tabs" role="tablist">
    {#each kinds as k (k)}
      <button role="tab" aria-selected={tab === k} onclick={() => (tab = k)}><KindIcon kind={k === "statement" ? "hearing" : k} size={15} />{t(tabLabel[k])}</button>
    {/each}
  </div>
{/if}

{#if tab === "finding"}
  <ul class="list">
    {#each findingOptions as f (f.id)}
      {@const s = statement(f.statementId)}
      <li>
        <button class="row" onclick={() => onpick({ kind: "finding", id: f.id })}>
          <span class="text">
            <span class="finding-head">
              <StatusChip status={f.status} size="sm" />
              {#if s}<span class="xsmall muted tabular">{fmtClock(s.t)}</span>{/if}
              {#if f.reviewed}<span class="xsmall muted checked"><Check size={12} />{t("attn.done")}</span>{/if}
            </span>
            <span class="finding-title">{l(f.title)}</span>
            {#if s}<span class="xsmall muted clamp-2">“<Quote text={s.text} mark={f.said} around={6} />”</span>{/if}
          </span>
        </button>
      </li>
    {/each}
  </ul>
{:else if tab === "statement"}
  <div class="search">
    <Search size={15} />
    <label class="sr-only" for="pick-search-{caseId}">{t("board.search")}</label>
    <input id="pick-search-{caseId}" class="field" type="search" placeholder={t("board.search")} bind:value={query} />
  </div>
  <ul class="list">
    {#each statementOptions as s (s.id)}
      {@const h = hearing(s.hearingId)}
      <li>
        <button class="row" onclick={() => onpick({ kind: "statement", id: s.id })}>
          <Avatar id={s.speakerId} size="sm" />
          <span class="text">
            <span class="xsmall muted">{speakerName(speaker(s.speakerId))} · {h ? t("common.hearingN", { n: h.number }) : ""} · {fmtClock(s.t)}</span>
            <span class="clamp-2">{s.text}</span>
          </span>
        </button>
      </li>
    {/each}
  </ul>
{:else}
  <ul class="list">
    {#each docOptions as d (d.id)}
      <li class="doc">
        <div class="doc-head">
          <button class="row grow" onclick={() => (openDoc = openDoc === d.id ? null : d.id)} aria-expanded={openDoc === d.id}>
            <KindIcon kind="document" size={16} />
            <span class="text"><strong>{d.title}</strong><span class="xsmall muted">{l(d.kind)} · {t("ev.passages", { n: passagesOf(d.id).length })}</span></span>
          </button>
          <button class="btn btn-sm" onclick={() => onpick({ kind: "document", id: d.id })}>{t("board.wholeDoc")}</button>
        </div>
        {#if openDoc === d.id}
          <ul class="passages">
            {#each passagesOf(d.id) as p (p.id)}
              <li>
                <button class="row" onclick={() => onpick({ kind: "passage", id: p.id })}>
                  <span class="xsmall muted tabular">{t("common.page", { n: p.page })}</span>
                  <span class="clamp-2 doc-text">{p.text}</span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  .quick {
    display: grid;
    gap: 4px;
  }
  .tabs {
    display: flex;
    width: fit-content;
    max-width: 100%;
    overflow-x: auto;
  }
  .list {
    display: grid;
    gap: 2px;
    max-height: 440px;
    overflow-y: auto;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 8px 10px;
    border-radius: var(--radius-control);
    text-align: left;
    font-size: 13px;
    color: var(--ink-strong);
  }
  .row:hover {
    background: var(--sunken);
  }
  .text {
    display: grid;
    gap: 3px;
    min-width: 0;
  }
  .finding-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
  }
  .finding-title {
    font-family: var(--font-serif);
    font-size: 16px;
    line-height: 1.3;
  }
  .checked {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .doc {
    border-bottom: 1px solid var(--line);
    padding: 2px 0;
  }
  .doc-head {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .grow {
    flex: 1;
  }
  .passages {
    display: grid;
    list-style: none;
    margin: 0;
    padding: 0 0 0 26px;
  }
</style>
