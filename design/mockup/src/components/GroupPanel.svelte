<script lang="ts">
  import { ArrowLeftRight, ArrowRight, Check, LayoutDashboard, Link2, MessageSquare, Unlink } from "@lucide/svelte";
  import { groupName, idOf, kindOf, relations, setRelation, shortLabel, unpair, whereOf, type EvidenceKind, type Pairing } from "../lib/evidence.svelte";
  import { l, t } from "../lib/i18n";
  import type { Kind } from "../lib/kinds";
  import { go, href } from "../lib/router.svelte";
  import {
    connection,
    doc,
    docsOf,
    finding,
    findingPath,
    findingsOfCase,
    hearing,
    hearingsOf,
    openAssistant,
    passage,
    passagesOf,
    setConnectionReviewed,
    statement,
    statementsOf,
  } from "../lib/store.svelte";
  import type { Citation, Relation } from "../lib/types";
  import FindingLink from "./FindingLink.svelte";
  import KindIcon from "./KindIcon.svelte";
  import RelationTag from "./RelationTag.svelte";

  /**
   * One evidence group: what it is about, where its evidence comes from, the evidence by type, and
   * its pairings. Recorded pairings are adjusted here (confirm, change the relation, unpair) and new
   * ones made from any member; what a finding pairs stays the finding's, so it links into Temuan.
   */
  let {
    caseId,
    members,
    picked,
    pairings,
    onpair,
  }: { caseId: string; members: Set<string>; picked: string[]; pairings: Pairing[]; onpair: (from: string) => void } = $props();

  // The case's own order: hearings and their lines, findings, documents and their pages.
  let order = $derived.by(() => {
    const keys = [
      ...hearingsOf(caseId).flatMap((h) => statementsOf(h.id).map((s) => `statement:${s.id}`)),
      ...findingsOfCase(caseId).map((f) => `finding:${f.id}`),
      ...docsOf(caseId).flatMap((d) => passagesOf(d.id).map((p) => `passage:${p.id}`)),
    ];
    return new Map(keys.map((k, i) => [k, i]));
  });
  let sorted = $derived([...members].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)));
  const types: { kind: EvidenceKind; name: Parameters<typeof t>[0]; icon: Kind }[] = [
    { kind: "statement", name: "nav.hearings", icon: "hearing" },
    { kind: "finding", name: "nav.findings", icon: "finding" },
    { kind: "passage", name: "nav.documents", icon: "document" },
  ];
  let name = $derived(groupName(members, picked));
  let own = $derived(pairings.filter((p) => members.has(p.a) && members.has(p.b)));
  const relOrder: Record<Relation, number> = { conflicts: 0, context: 1, supports: 2, related: 3 };
  // The chosen evidence's pairings first, then those still waiting for a decision.
  let ranked = $derived(
    [...own].sort(
      (a, b) =>
        Number(picked.includes(b.a) || picked.includes(b.b)) - Number(picked.includes(a.a) || picked.includes(a.b)) ||
        Number(a.source !== "link" || a.confirmed) - Number(b.source !== "link" || b.confirmed) ||
        relOrder[a.relation] - relOrder[b.relation],
    ),
  );
  let sources = $derived.by(() => {
    const out: { key: string; kind: Kind; name: string }[] = [];
    for (const k of sorted) {
      if (kindOf(k) === "statement") {
        const h = hearing(statement(idOf(k))?.hearingId);
        if (h && !out.some((s) => s.key === h.id)) out.push({ key: h.id, kind: "hearing", name: t("common.hearingN", { n: h.number }) });
      } else if (kindOf(k) === "passage") {
        const d = doc(passage(idOf(k))?.docId ?? "");
        if (d && !out.some((s) => s.key === d.id)) out.push({ key: d.id, kind: "document", name: d.title });
      }
    }
    return out;
  });
  let single = $derived(picked.length === 1 && kindOf(picked[0]) !== "finding" ? picked[0] : null);

  const select = (key: string) => go(`/case/${caseId}/connections?of=${key}`);
  const textOf = (key: string) => (kindOf(key) === "statement" ? statement(idOf(key))?.text : kindOf(key) === "passage" ? passage(idOf(key))?.text : l(finding(idOf(key))?.title)) ?? "";
  const iconOf = (key: string): Kind => (kindOf(key) === "statement" ? "statement" : kindOf(key) === "passage" ? "passage" : "finding");
  const speakerOf = (key: string) => (kindOf(key) === "statement" ? statement(idOf(key))?.speakerId : undefined);

  function ask() {
    const refs: Citation[] = sorted.slice(0, 6).map((k) => ({ kind: kindOf(k), id: idOf(k) }));
    openAssistant({ kind: "documents" }, undefined, refs);
  }
</script>

<div class="group">
  <header class="group-head">
    <h2 class="t-serif">{name}</h2>
    <p class="small muted">{t("cx.group.items", { n: members.size })} · {t("cx.group.pairs", { n: own.length })}</p>
    {#if sources.length}
      <ul class="sources">
        {#each sources as s (s.key)}<li><KindIcon kind={s.kind} size={13} />{s.name}</li>{/each}
      </ul>
    {/if}
    <div class="head-actions">
      {#if single}<button class="btn btn-sm" onclick={() => onpair(single!)}><Link2 size={14} />{t("cx.group.pairWith")}</button>{/if}
      <button class="btn btn-sm" onclick={ask}><MessageSquare size={14} />{t("top.ask")}</button>
      {#if picked[0]}<a class="btn btn-sm" href={href(`/case/${caseId}/findings?view=board&start=${picked[0]}`)}><LayoutDashboard size={14} />{t("fx.board")}</a>{/if}
    </div>
  </header>

  {#if members.size <= picked.length && !own.length}
    <p class="alone muted">{t("cx.group.alone")}</p>
  {/if}

  <section class="members" aria-label={t("cx.group.members")}>
    <h3 class="small-head">{t("cx.group.members")}</h3>
    {#each types as type (type.kind)}
      {@const list = sorted.filter((k) => kindOf(k) === type.kind)}
      {#if list.length}
        <h4 class="type"><KindIcon kind={type.icon} size={14} />{t(type.name)} <span class="tabular count">{list.length}</span></h4>
        <ul class="list">
          {#each list as key (key)}
            {#if type.kind === "finding"}
              {@const f = finding(idOf(key))}
              {#if f}<li class="finding-row" class:on={picked.includes(key)}><FindingLink {f} /></li>{/if}
            {:else}
              <li class="member" class:on={picked.includes(key)}>
                <button class="member-main" aria-current={picked.includes(key) ? "true" : undefined} onclick={() => select(key)}>
                  <span class="where"><KindIcon kind={iconOf(key)} speakerId={speakerOf(key)} size={type.kind === "statement" ? 19 : 13} /><span>{whereOf(key)}</span></span>
                  <span class="text clamp-2" class:doc-text={type.kind === "passage"}>{textOf(key)}</span>
                </button>
                <button class="btn btn-sm btn-ghost btn-icon" aria-label={t("cx.group.pairWith")} title={t("cx.group.pairWith")} onclick={() => onpair(key)}><Link2 size={15} /></button>
              </li>
            {/if}
          {/each}
        </ul>
      {/if}
    {/each}
  </section>

  {#if ranked.length}
    <section class="pairings" aria-label={t("cx.group.pairings")}>
      <h3 class="small-head">{t("cx.group.pairings")} <span class="tabular count">{ranked.length}</span></h3>
      <p class="xsmall muted hint">{t("cx.group.pairHint")}</p>
      <ul class="list">
        {#each ranked as pr (pr.key)}
          {@const c = pr.connectionId ? connection(pr.connectionId) : undefined}
          <li class="pair" class:mine={picked.includes(pr.a) || picked.includes(pr.b)}>
            <div class="ends">
              <button class="end" onclick={() => select(pr.a)}><KindIcon kind={iconOf(pr.a)} speakerId={speakerOf(pr.a)} size={kindOf(pr.a) === "statement" ? 17 : 13} /><span>{shortLabel(pr.a)}</span></button>
              <span class="between" data-rel={pr.relation} aria-hidden="true"><ArrowLeftRight size={14} /></span>
              <button class="end" onclick={() => select(pr.b)}><KindIcon kind={iconOf(pr.b)} speakerId={speakerOf(pr.b)} size={kindOf(pr.b) === "statement" ? 17 : 13} /><span>{shortLabel(pr.b)}</span></button>
            </div>
            {#if pr.source === "link" && c}
              <div class="how">
                <label class="sr-only" for="rel-{pr.key}">{t("cx.group.relation")}</label>
                <select id="rel-{pr.key}" class="rel-select" data-rel={c.relation} value={c.relation} onchange={(e) => setRelation(c, e.currentTarget.value as Relation)}>
                  {#each relations as r (r)}<option value={r}>{t(`rel.${r}`)}</option>{/each}
                </select>
                <span class="state" class:waiting={!c.reviewed}>{#if c.reviewed}<Check size={13} />{/if}{c.reviewed ? t("cx.confirmed") : t("cx.suggested")}</span>
              </div>
              {#if c.why}<p class="why xsmall muted">{l(c.why)}</p>{/if}
              <div class="acts">
                <button class="btn btn-sm" class:btn-primary={!c.reviewed} onclick={() => setConnectionReviewed(c, !c.reviewed)}>{c.reviewed ? t("cx.group.unconfirm") : t("cx.group.confirm")}</button>
                <button class="btn btn-sm btn-ghost" onclick={() => unpair(c)}><Unlink size={14} />{t("cx.group.unpair")}</button>
              </div>
            {:else}
              <div class="how">
                <RelationTag relation={pr.relation} reviewed={pr.confirmed} />
                <span class="state">{pr.source === "about" ? t("cx.group.about") : t("cx.group.cited")}</span>
                {#if pr.findingId}<a class="link-btn manage" href={href(findingPath(pr.findingId))}>{t("cx.group.manage")}<ArrowRight size={13} /></a>{/if}
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>

<style>
  /* Single columns that may shrink: long names ellipsize instead of widening the panel. */
  .group,
  .group-head,
  .list,
  .pair,
  .member-main {
    grid-template-columns: minmax(0, 1fr);
  }
  .group {
    display: grid;
    gap: 18px;
    padding: 18px;
    border: 1px solid var(--line);
    border-radius: var(--radius-surface);
    background: var(--surface);
  }
  .group-head {
    display: grid;
    gap: 8px;
  }
  .group-head h2 {
    font-size: 24px;
    line-height: 1.2;
  }
  .group-head p {
    margin: 0;
  }
  .sources {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .sources li {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border-radius: 20px;
    background: var(--sunken);
    font-size: 12px;
    color: var(--ink);
  }
  .head-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .alone {
    margin: 0;
    padding: 12px 14px;
    border: 1px dashed var(--line-strong);
    border-radius: var(--radius-control);
  }
  .small-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-strong);
  }
  .count {
    color: var(--muted);
    font-weight: 500;
  }
  .type {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 10px 0 4px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--muted);
  }
  .list {
    display: grid;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .member {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    border: 1px solid var(--line);
    border-radius: var(--radius-control);
  }
  .member.on,
  .finding-row.on {
    border-color: var(--ink-strong);
    box-shadow: 0 0 0 1px var(--ink-strong);
    border-radius: var(--radius-control);
  }
  .member-main {
    flex: 1;
    display: grid;
    gap: 4px;
    min-width: 0;
    padding: 8px 10px;
    text-align: left;
    border-radius: var(--radius-control);
  }
  .member-main:hover {
    background: var(--sunken);
  }
  .member .btn-icon {
    margin: 6px 6px 0 0;
  }
  .where {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ink-strong);
  }
  .where span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .member .text {
    font-size: 13.5px;
    line-height: 1.45;
    color: var(--ink);
  }
  .hint {
    margin: 0 0 8px;
  }
  .pair {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius-control);
  }
  .pair.mine {
    border-color: var(--line-strong);
    background: var(--surface-2);
  }
  .ends {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 6px;
  }
  .end {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    padding: 2px 6px 2px 2px;
    border-radius: var(--radius-control);
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ink-strong);
    text-align: left;
  }
  .end span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .end:hover {
    background: var(--sunken);
  }
  .between {
    display: inline-flex;
    color: var(--rel-related);
  }
  .between[data-rel="conflicts"] {
    color: var(--rel-conflicts-ink);
  }
  .between[data-rel="context"] {
    color: var(--rel-context-ink);
  }
  .between[data-rel="supports"] {
    color: var(--rel-supports-ink);
  }
  .how {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
    font-size: 12.5px;
  }
  .rel-select {
    min-height: 32px;
    padding: 4px 28px 4px 10px;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-control);
    background-color: var(--surface);
    color: var(--ink-strong);
    font: inherit;
    font-weight: 600;
  }
  .rel-select[data-rel="conflicts"] {
    color: var(--rel-conflicts-ink);
  }
  .rel-select[data-rel="context"] {
    color: var(--rel-context-ink);
  }
  .rel-select[data-rel="supports"] {
    color: var(--rel-supports-ink);
  }
  .state {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--muted);
  }
  .state.waiting {
    color: var(--sand-ink);
  }
  .manage {
    margin-left: auto;
  }
  .why {
    margin: 0;
  }
  .acts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
</style>
