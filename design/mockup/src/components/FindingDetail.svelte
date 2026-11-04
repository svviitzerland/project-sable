<script lang="ts">
  import {
    BookOpen,
    Check,
    ChevronLeft,
    ChevronRight,
    Copy,
    FileText,
    MessageSquare,
    Play,
    RotateCcw,
    Scale,
    Waypoints,
  } from "@lucide/svelte";
  import { untrack } from "svelte";
  import { fmtClock, l, t } from "../lib/i18n";
  import { prefs } from "../lib/prefs.svelte";
  import { go, href } from "../lib/router.svelte";
  import {
    doc,
    finding,
    hearing,
    inspect,
    legalRef,
    openAssistant,
    passage,
    passagesOf,
    saveNote,
    setReviewed,
    statement,
    toastT,
    ui,
  } from "../lib/store.svelte";
  import RelationTag from "./RelationTag.svelte";
  import SpeakerTag from "./SpeakerTag.svelte";
  import StatusChip from "./StatusChip.svelte";

  let {
    id,
    nav,
    onplay,
    inHearing = false,
  }: {
    id: string;
    nav?: { index: number; total: number; prev: () => void; next: () => void };
    onplay?: (seconds: number) => void;
    inHearing?: boolean;
  } = $props();

  let f = $derived(finding(id));
  let st = $derived(f ? statement(f.statementId) : undefined);
  let h = $derived(f ? hearing(f.hearingId) : undefined);
  let sourceIndex = $state(0);
  let draft = $state("");
  let dirty = $derived(!!f && draft !== f.note);

  $effect(() => {
    const current = id;
    untrack(() => {
      sourceIndex = 0;
      draft = finding(current)?.note ?? "";
      const record = finding(current);
      if (record?.isNew) record.isNew = false;
    });
  });

  let source = $derived(f?.sources[Math.min(sourceIndex, (f?.sources.length ?? 1) - 1)]);
  let p = $derived(source ? passage(source.passageId) : undefined);
  let d = $derived(p ? doc(p.docId) : undefined);
  let context = $derived.by(() => {
    if (!p) return { before: undefined, after: undefined };
    const all = passagesOf(p.docId);
    const i = all.findIndex((x) => x.id === p!.id);
    return { before: all[i - 1], after: all[i + 1] };
  });

  async function copyQuestion() {
    if (!f) return;
    try {
      await navigator.clipboard.writeText(f.question);
    } catch {
      /* The toast still confirms intent in the mockup. */
    }
    toastT("toast.copied");
  }
</script>

{#if f && st && h}
  <article class="finding">
    <header class="head">
      <div class="row">
        <StatusChip status={f.status} />
        <span class="mode">{t("fx.mode")}</span>
        {#if f.reviewed}<span class="tag reviewed"><Check size={12} />{t("fx.reviewedByYou")}</span>{/if}
        {#if nav}
          <span class="nav">
            <span class="tabular small muted">{t("fd.position", { i: nav.index + 1, n: nav.total })}</span>
            <button class="btn btn-ghost btn-icon btn-sm" aria-label={t("fd.prev")} onclick={nav.prev} disabled={nav.index === 0}><ChevronLeft size={17} /></button>
            <button class="btn btn-ghost btn-icon btn-sm" aria-label={t("fd.next")} onclick={nav.next} disabled={nav.index >= nav.total - 1}><ChevronRight size={17} /></button>
          </span>
        {/if}
      </div>
      <h2 class="title t-serif">{l(f.title)}</h2>
    </header>

    <section class="compare" aria-label={`${t("fx.testimony")} · ${t("fx.source")}`}>
      <div class="side testimony">
        <h3 class="t-label">{t("fx.testimony")}</h3>
        <blockquote class="quote t-serif">“{st.text}”</blockquote>
        <div class="src">
          <SpeakerTag id={st.speakerId} compact />
          <span class="muted small tabular">{t("common.hearingN", { n: h.number })} · {fmtClock(st.t)}</span>
        </div>
        <div class="src-actions">
          {#if onplay}
            <button class="link-btn" onclick={() => onplay(st!.t)}><Play size={14} />{t("fx.play")}</button>
          {/if}
          {#if !inHearing}
            <a class="link-btn" href={href(`/case/${h.caseId}/hearings/${h.id}?s=${st.id}`)}>{t("fx.openInHearing")}</a>
          {/if}
        </div>
      </div>

      <div class="side source">
        <h3 class="t-label">{t("fx.source")}</h3>
        {#if f.sources.length > 1}
          <div class="tabs" role="tablist" aria-label={t("fx.source")}>
            {#each f.sources as s, i (s.passageId)}
              <button role="tab" aria-selected={i === sourceIndex} onclick={() => (sourceIndex = i)}>
                {t("fx.sourceTab", { n: i + 1, rel: t(`rel.${s.relation}`) })}
              </button>
            {/each}
          </div>
        {/if}
        {#if p && d && source}
          <div class="excerpt">
            <div class="doc-meta">
              <FileText size={13} />
              <span class="doc-title">{d.title}</span>
              <span class="tabular">{t("common.page", { n: p.page })}</span>
            </div>
            {#if context.before}<p class="ctx">{context.before.text}</p>{/if}
            <p class="hit"><mark>{p.text}</mark></p>
            {#if context.after}<p class="ctx">{context.after.text}</p>{/if}
            <div class="excerpt-foot">
              <RelationTag relation={source.relation} />
              <button class="link-btn" onclick={() => go(`/case/${h!.caseId}/evidence/doc/${d!.id}?p=${p!.id}`)}><BookOpen size={14} />{t("fx.openDoc")}</button>
            </div>
          </div>
        {/if}
      </div>
    </section>

    <p class="explanation">{l(f.explanation)}</p>
    <p class="matches small muted"><Check size={13} />{t("fx.quoteMatches")}</p>

    <div class="panel verify">
      <h3 class="t-label">{t("fx.verify")}</h3>
      <p>{l(f.verify)}</p>
    </div>

    {#if f.uncertainty}
      <div class="uncertainty">
        <h3 class="t-label">{t("fx.uncertainty")}</h3>
        <p>{l(f.uncertainty)}</p>
      </div>
    {/if}

    <div class="question">
      <h3 class="t-label">{t("fx.question")}</h3>
      <p class="t-serif">{f.question}</p>
      <button class="link-btn" onclick={copyQuestion}><Copy size={14} />{t("fx.copy")}</button>
    </div>

    {#if f.legal?.length && prefs.pasal}
      <div class="legal">
        <h3 class="t-label">{t("fx.legal")}</h3>
        <div class="legal-list">
          {#each f.legal as lid (lid)}
            {@const ref = legalRef(lid)}
            {#if ref}
              <button class="legal-chip" onclick={() => inspect({ kind: "legal", id: lid })}>
                <Scale size={14} />
                <span>{#if ref.article}<strong>{ref.article}</strong> · {/if}{ref.regulation.replace(/ tentang .*/, "")}</span>
              </button>
            {/if}
          {/each}
        </div>
        <p class="xsmall muted">{t("ix.legalVerify")}</p>
      </div>
    {/if}

    <div class="review">
      <label class="field-label" for="note-{f.id}">{t("fx.note")}</label>
      <textarea id="note-{f.id}" class="field" rows="3" placeholder={t("fx.notePlaceholder")} bind:value={draft}></textarea>
      <div class="review-row">
        {#if dirty}<span class="unsaved" role="status">{t("fx.unsaved")}</span>{/if}
        <span class="grow"></span>
        <button class="btn" disabled={!dirty} onclick={() => saveNote(f!, draft)}>{t("fx.saveNote")}</button>
        {#if f.reviewed}
          <button class="btn" onclick={() => setReviewed(f!, false)}><RotateCcw size={15} />{t("fx.reopen")}</button>
        {:else}
          <button class="btn btn-primary" onclick={() => { if (dirty) saveNote(f!, draft); setReviewed(f!, true); }}><Check size={15} />{t("fx.markReviewed")}</button>
        {/if}
      </div>
    </div>

    <div class="more">
      <button class="link-btn" onclick={() => openAssistant({ kind: "finding", id: f!.id }, undefined, [{ kind: "finding", id: f!.id }])}>
        <MessageSquare size={14} />{t("fx.ask")}
      </button>
      <button class="link-btn" onclick={() => { ui.inspector = null; go(`/case/${h!.caseId}/evidence?view=map&focus=${st!.id}`); }}>
        <Waypoints size={14} />{t("fx.showMap")}
      </button>
    </div>
    <p class="footer xsmall muted">{t("fx.footer")}</p>
  </article>
{/if}

<style>
  .finding {
    display: grid;
    gap: 18px;
    padding: 20px;
    min-width: 0;
    container: finding / inline-size;
  }
  .head {
    display: grid;
    gap: 10px;
  }
  .row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 12px;
  }
  .mode {
    font-size: 11px;
    color: var(--muted);
  }
  .reviewed {
    background: var(--selected);
    color: var(--ink-strong);
  }
  .nav {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }
  .title {
    font-size: clamp(21px, 2.2vw, 25px);
    line-height: 1.25;
  }
  .compare {
    display: grid;
    gap: 14px;
  }
  /* Testimony and source sit side by side only when the inspector itself is wide enough. */
  @container finding (min-width: 600px) {
    .compare {
      grid-template-columns: 1fr 1.15fr;
      gap: 0;
      border: 1px solid var(--line);
      border-radius: var(--radius-action);
      overflow: hidden;
    }
    .side {
      padding: 16px;
    }
    .source {
      background: var(--surface-2);
      border-left: 1px solid var(--line);
    }
  }
  .side {
    display: grid;
    gap: 10px;
    align-content: start;
    min-width: 0;
  }
  .quote {
    font-size: 21px;
    line-height: 1.3;
  }
  .src {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
  }
  .src-actions,
  .more {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
  }
  .tabs {
    display: flex;
    gap: 2px;
    border-bottom: 1px solid var(--line);
    overflow-x: auto;
  }
  .tabs button {
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    border-bottom: 2px solid transparent;
    white-space: nowrap;
    min-height: 36px;
  }
  .tabs button[aria-selected="true"] {
    color: var(--ink-strong);
    border-bottom-color: var(--ink-strong);
    font-weight: 600;
  }
  .excerpt {
    display: grid;
    gap: 8px;
    padding: 14px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-control);
    font-size: 13px;
    line-height: 1.65;
  }
  .doc-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
    letter-spacing: 0.02em;
  }
  .doc-title {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ctx {
    color: var(--muted);
    font-size: 12px;
  }
  .excerpt-foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-top: 4px;
    border-top: 1px solid var(--line);
  }
  .explanation {
    color: var(--ink);
    line-height: 1.65;
  }
  .matches {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-top: -8px;
  }
  .panel {
    padding: 14px 16px;
    border-radius: var(--radius-control);
    background: var(--selected);
  }
  .panel p,
  .uncertainty p {
    margin-top: 4px;
  }
  .uncertainty p {
    color: var(--muted);
  }
  .question p {
    font-size: 20px;
    line-height: 1.35;
    margin: 6px 0 4px;
  }
  .legal {
    display: grid;
    gap: 8px;
  }
  .legal-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .legal-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: var(--hit);
    padding: 4px 10px;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-control);
    font-size: 12px;
    text-align: left;
    background: var(--surface);
  }
  .legal-chip:hover {
    border-color: var(--muted);
  }
  .review {
    display: grid;
    gap: 8px;
    padding-top: 16px;
    border-top: 1px solid var(--line);
  }
  .review-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .grow {
    flex: 1;
  }
  .unsaved {
    font-size: 12px;
    font-weight: 600;
    color: var(--st-inconsistency-ink);
    background: var(--st-inconsistency-bg);
    padding: 3px 8px;
    border-radius: 4px;
  }
  .footer {
    padding-top: 12px;
    border-top: 1px solid var(--line);
  }
</style>
