<script lang="ts">
  import KindIcon from "./KindIcon.svelte";
  import { ArrowDownUp, Check, ExternalLink, Flag, MessageSquare, RotateCcw, Waypoints } from "@lucide/svelte";
  import { fmtClock, l, t } from "../lib/i18n";
  import { go, href } from "../lib/router.svelte";
  import {
    caseOfHearing,
    connection,
    connectionsFor,
    db,
    doc,
    findingForStatement,
    findingsCiting,
    hearing,
    inspect,
    legalRef,
    openAssistant,
    passage,
    passagesOf,
    setConnectionReviewed,
    statement,
    toastT,
    toggleFlag,
    ui,
  } from "../lib/store.svelte";
  import type { InspectTarget, NodeRef } from "../lib/types";
  import RelationTag from "./RelationTag.svelte";
  import SpeakerTag from "./SpeakerTag.svelte";
  import FindingLink from "./FindingLink.svelte";

  let { target }: { target: Exclude<InspectTarget, { kind: "finding" }> } = $props();

  const caseIdOf = (ref: NodeRef) =>
    ref.kind === "statement" ? caseOfHearing(statement(ref.id)?.hearingId ?? "") : doc(passage(ref.id)?.docId ?? "")?.caseId;

  function nodeLabel(ref: NodeRef) {
    if (ref.kind === "statement") {
      const s = statement(ref.id);
      const h = hearing(s?.hearingId);
      return { kind: "statement" as const, speakerId: s?.speakerId, title: s?.text ?? "", meta: h && s ? `${t("common.hearingN", { n: h.number })} · ${fmtClock(s.t)}` : "" };
    }
    const p = passage(ref.id);
    const d = p ? doc(p.docId) : undefined;
    return { kind: "passage" as const, speakerId: undefined, title: p?.text ?? "", meta: d && p ? `${d.title} · ${t("common.page", { n: p.page })}` : "" };
  }

  const other = (c: { from: NodeRef; to: NodeRef }, self: NodeRef) =>
    c.from.kind === self.kind && c.from.id === self.id ? c.to : c.from;
</script>

{#snippet connectionList(self: NodeRef)}
  {@const list = connectionsFor(self)}
  <section class="block">
    <h3 class="t-label">{t("ix.connections")} · {list.length}</h3>
    {#if list.length === 0}
      <p class="small muted">{t("ix.noConnections")}</p>
    {:else}
      <ul class="conns">
        {#each list as c (c.id)}
          {@const o = nodeLabel(other(c, self))}
          <li>
            <button class="conn" onclick={() => inspect({ kind: "connection", id: c.id })}>
              <span class="conn-top">
                <RelationTag relation={c.relation} reviewed={c.reviewed} />
                <span class="tag" class:tag-sand={!c.reviewed}>{c.reviewed ? t("ix.confirmed") : t("ix.suggested")}</span>
              </span>
              <span class="conn-text clamp-2" class:doc-text={o.kind === "passage"}>{o.title}</span>
              <span class="xsmall muted kind-line"><KindIcon kind={o.kind} speakerId={o.speakerId} size={14} />{o.meta}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/snippet}

<div class="node">
  {#if target.kind === "passage"}
    {@const p = passage(target.id)}
    {@const d = p ? doc(p.docId) : undefined}
    {#if p && d}
      {@const all = passagesOf(d.id)}
      {@const i = all.findIndex((x) => x.id === p.id)}
      <header class="head">
        <span class="t-label kind-line"><KindIcon kind="passage" size={14} />{t("ix.passage")}</span>
        <h2 class="t-serif">{d.title}</h2>
        <p class="small muted">{l(d.kind)} · {t("common.page", { n: p.page })}</p>
      </header>
      <div class="excerpt">
        {#if all[i - 1]}<p class="ctx">{all[i - 1].text}</p>{/if}
        <p><mark>{p.text}</mark></p>
        {#if all[i + 1]}<p class="ctx">{all[i + 1].text}</p>{/if}
      </div>
      <div class="actions">
        <button class="btn btn-sm" onclick={() => { ui.inspector = null; go(`/case/${d.caseId}/evidence/doc/${d.id}?p=${p.id}`); }}><KindIcon kind="document" size={14} />{t("fx.openDoc")}</button>
        <button class="btn btn-sm" onclick={() => openAssistant({ kind: "passage", id: p.id }, undefined, [{ kind: "passage", id: p.id }])}><MessageSquare size={14} />{t("fx.ask")}</button>
        <button class="btn btn-sm" onclick={() => { ui.inspector = null; go(`/case/${d.caseId}/connections?of=passage:${p.id}`); }}><Waypoints size={14} />{t("fx.connections")}</button>
      </div>
      {@const citing = findingsCiting(p.id)}
      {#if citing.length}
        <section class="block">
          <h3 class="t-label">{t("ix.citedBy")} · {citing.length}</h3>
          <div class="flinks">
            {#each citing as f (f.id)}<FindingLink {f} showHearing />{/each}
          </div>
        </section>
      {/if}
      {@render connectionList({ kind: "passage", id: p.id })}
    {/if}
  {:else if target.kind === "statement"}
    {@const s = statement(target.id)}
    {@const h = hearing(s?.hearingId)}
    {#if s && h}
      {@const f = findingForStatement(s.id)}
      <header class="head">
        <span class="t-label kind-line"><KindIcon kind="hearing" size={14} />{t("ix.statement")}</span>
        <div class="who"><SpeakerTag id={s.speakerId} /> <span class="muted small tabular">{t("common.hearingN", { n: h.number })} · {fmtClock(s.t)}</span></div>
      </header>
      <blockquote class="quote">“{s.text}”</blockquote>
      <div class="actions">
        <a class="btn btn-sm" href={href(`/case/${h.caseId}/hearings/${h.id}?s=${s.id}`)} onclick={() => (ui.inspector = null)}>{t("fx.openInHearing")}</a>
        <button class="btn btn-sm" aria-pressed={!!s.flagged} onclick={() => toggleFlag(s)}><Flag size={14} />{s.flagged ? t("live.unflag") : t("live.flag")}</button>
        <button class="btn btn-sm" onclick={() => { ui.inspector = null; go(`/case/${h.caseId}/connections?of=statement:${s.id}`); }}><Waypoints size={14} />{t("fx.connections")}</button>
      </div>
      {#if f}<div class="flinks"><FindingLink {f} /></div>{/if}
      {@render connectionList({ kind: "statement", id: s.id })}
    {/if}
  {:else if target.kind === "connection"}
    {@const c = connection(target.id)}
    {#if c}
      {@const a = nodeLabel(c.from)}
      {@const b = nodeLabel(c.to)}
      <header class="head">
        <span class="t-label kind-line"><KindIcon kind="connection" size={14} />{t("ix.connection")}</span>
        <div class="row">
          <RelationTag relation={c.relation} reviewed={c.reviewed} />
          <span class="tag" class:tag-sand={!c.reviewed}>{c.reviewed ? t("ix.confirmed") : t("ix.suggested")}</span>
          <span class="xsmall muted">{t(`ix.basis.${c.basis}`)}</span>
        </div>
      </header>
      <button class="end" onclick={() => inspect(c.from.kind === "statement" ? { kind: "statement", id: c.from.id } : { kind: "passage", id: c.from.id })}>
        <span class="xsmall muted kind-line"><KindIcon kind={a.kind} speakerId={a.speakerId} size={14} />{t("ix.from")} · {a.meta}</span>
        <span class="end-text" class:doc-text={a.kind === "passage"}>{a.title}</span>
      </button>
      <div class="joint" aria-hidden="true"><ArrowDownUp size={16} /></div>
      <button class="end" onclick={() => inspect(c.to.kind === "statement" ? { kind: "statement", id: c.to.id } : { kind: "passage", id: c.to.id })}>
        <span class="xsmall muted kind-line"><KindIcon kind={b.kind} speakerId={b.speakerId} size={14} />{t("ix.to")} · {b.meta}</span>
        <span class="end-text" class:doc-text={b.kind === "passage"}>{b.title}</span>
      </button>
      <section class="block">
        <h3 class="t-label">{t("ix.why")}</h3>
        <p>{l(c.why)}</p>
        <p class="xsmall muted">{t("fx.quoteMatches")}</p>
      </section>
      <div class="actions">
        {#if c.reviewed}
          <button class="btn" onclick={() => setConnectionReviewed(c, false)}><RotateCcw size={15} />{t("ix.reopen")}</button>
        {:else}
          <button class="btn btn-primary" onclick={() => setConnectionReviewed(c, true)}><Check size={15} />{t("ix.confirm")}</button>
        {/if}
        <button class="btn" onclick={() => openAssistant({ kind: "connection", id: c.id }, undefined, [c.from.kind === "passage" ? { kind: "passage", id: c.from.id } : { kind: "statement", id: c.from.id }, c.to.kind === "passage" ? { kind: "passage", id: c.to.id } : { kind: "statement", id: c.to.id }])}>
          <MessageSquare size={15} />{t("ix.discuss")}
        </button>
      </div>
      <p class="xsmall muted case-note">{caseIdOf(c.from) ? t("fx.footer") : ""}</p>
    {/if}
  {:else if target.kind === "legal"}
    {@const ref = legalRef(target.id)}
    {#if ref}
      {@const mentions = db.statements.filter((s) => s.legal?.includes(ref.id))}
      <header class="head">
        <span class="t-label kind-line"><KindIcon kind="legal" size={14} />{t("ix.legal")} · Pasal.id</span>
        <h2 class="t-serif">{ref.article || ref.type}</h2>
        <p class="small">{ref.regulation}</p>
      </header>
      <div class="excerpt">
        <span class="tag tag-sand">{t("ix.legalMock")}</span>
        <p>{l(ref.summary)}</p>
      </div>
      <p class="notice"><KindIcon kind="legal" size={14} />{t("ix.legalVerify")}</p>
      <div class="actions">
        <button class="btn btn-sm" onclick={() => toastT("toast.pasal")}><ExternalLink size={14} />{t("ix.legalOpen")}</button>
      </div>
      {#if mentions.length}
        <section class="block">
          <h3 class="t-label">{t("ix.mentionedIn")}</h3>
          <ul class="conns">
            {#each mentions as s (s.id)}
              {@const h = hearing(s.hearingId)}
              <li>
                <button class="conn" onclick={() => inspect({ kind: "statement", id: s.id })}>
                  <span class="xsmall muted kind-line"><KindIcon kind="statement" speakerId={s.speakerId} size={14} />{h ? t("common.hearingN", { n: h.number }) : ""} · {fmtClock(s.t)}</span>
                  <span class="conn-text clamp-2">{s.text}</span>
                </button>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .node {
    display: grid;
    gap: 16px;
    padding: 20px;
    align-content: start;
  }
  .head {
    display: grid;
    gap: 6px;
  }
  .kind-line {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .head h2 {
    font-size: 23px;
    line-height: 1.25;
  }
  .who,
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }
  .excerpt {
    display: grid;
    gap: 8px;
    padding: 14px;
    border: 1px solid var(--line);
    border-radius: var(--radius-control);
    background: var(--surface-2);
    font-family: var(--font-doc);
    font-size: 13px;
    line-height: 1.65;
  }
  .ctx {
    color: var(--muted);
    font-size: 12px;
  }
  .quote {
    font-size: 19px;
    font-weight: 500;
    line-height: 1.4;
    color: var(--ink-strong);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .block {
    display: grid;
    gap: 8px;
  }
  .flinks {
    display: grid;
    margin: 0 -10px;
  }
  .conns {
    display: grid;
    gap: 6px;
  }
  .conn,
  .end {
    display: grid;
    gap: 4px;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius-control);
    background: var(--surface);
    text-align: left;
  }
  .conn:hover,
  .end:hover {
    border-color: var(--line-strong);
    background: var(--surface-2);
  }
  .conn-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .conn-text {
    font-size: 13px;
    color: var(--ink);
  }
  .end-text {
    font-family: var(--font-serif);
    font-size: 17px;
    line-height: 1.35;
    color: var(--ink-strong);
  }
  .joint {
    display: grid;
    place-items: center;
    color: var(--muted);
    margin: -8px 0;
  }
  .notice {
    align-items: center;
  }
  .case-note {
    padding-top: 12px;
    border-top: 1px solid var(--line);
  }
</style>
