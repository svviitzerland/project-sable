<script lang="ts">
  import KindIcon from "./KindIcon.svelte";
  import { Check, ChevronLeft, ChevronRight, Copy, LayoutDashboard, MessageSquare, NotebookPen, Play, RotateCcw } from "@lucide/svelte";
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
    saveNote,
    setReviewed,
    statement,
    toastT,
    ui,
  } from "../lib/store.svelte";
  import Quote from "./Quote.svelte";
  import SpeakerTag from "./SpeakerTag.svelte";
  import StatusChip from "./StatusChip.svelte";

  /**
   * One finding, plainly: what was said, what the source says (the differing phrases marked),
   * the question it suggests, and a single "checked" action. The reasoning sits behind
   * "Why is this shown?".
   */
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
  let noteOpen = $state(false);
  let dirty = $derived(!!f && draft !== f.note);

  $effect(() => {
    const current = id;
    untrack(() => {
      sourceIndex = 0;
      noteOpen = false;
      draft = finding(current)?.note ?? "";
      const record = finding(current);
      if (record?.isNew) record.isNew = false;
    });
  });

  let source = $derived(f?.sources[Math.min(sourceIndex, (f?.sources.length ?? 1) - 1)]);
  let p = $derived(source ? passage(source.passageId) : undefined);
  let d = $derived(p ? doc(p.docId) : undefined);

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
  <article class="finding" class:loud={f.status === "potential_inconsistency"}>
    <header class="head">
      <div class="row">
        <StatusChip status={f.status} />
        {#if f.reviewed}<span class="tag reviewed"><Check size={12} />{t("attn.done")}</span>{/if}
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

    <section class="compare">
      <div class="side said">
        <span class="label"><KindIcon kind="statement" speakerId={st.speakerId} size={16} />{t("attn.said")}</span>
        <p class="quote">“<Quote text={st.text} mark={f.said} />”</p>
        <div class="who">
          <SpeakerTag id={st.speakerId} compact plain />
          <span class="muted xsmall tabular">{t("common.hearingN", { n: h.number })} · {fmtClock(st.t)}</span>
        </div>
        <div class="side-actions">
          {#if onplay}<button class="link-btn" onclick={() => onplay(st!.t)}><Play size={13} />{t("fx.play")}</button>{/if}
          {#if !inHearing}<a class="link-btn" href={href(`/case/${h.caseId}/hearings/${h.id}?s=${st.id}`)}>{t("fx.openInHearing")}</a>{/if}
        </div>
      </div>
      {#if p && d && source}
        <div class="side source">
          <span class="label"><KindIcon kind="passage" size={13} />{t("attn.inSource", { doc: d.title, page: p.page })}</span>
          {#if f.sources.length > 1}
            <div class="pills" role="tablist" aria-label={t("fx.source")}>
              {#each f.sources as s, i (s.passageId)}
                {@const sp = passage(s.passageId)}
                <button role="tab" aria-selected={i === sourceIndex} onclick={() => (sourceIndex = i)}>
                  {doc(sp?.docId ?? "")?.title.split(" ").slice(0, 2).join(" ")} · {t("common.page", { n: sp?.page ?? "" })}
                </button>
              {/each}
            </div>
          {/if}
          <p class="quote">“<Quote text={p.text} mark={source.match} />”</p>
          <div class="side-actions">
            <button class="link-btn" onclick={() => { ui.inspector = null; go(`/case/${h!.caseId}/evidence/doc/${d!.id}?p=${p!.id}`); }}><KindIcon kind="document" size={13} />{t("fx.openDoc")}</button>
          </div>
        </div>
      {/if}
    </section>

    <div class="ask">
      <span class="label">{t("attn.ask")}</span>
      <p class="t-serif">{f.question}</p>
      <button class="link-btn" onclick={copyQuestion}><Copy size={13} />{t("fx.copy")}</button>
    </div>

    <div class="actions">
      {#if f.reviewed}
        <button class="btn" onclick={() => setReviewed(f!, false)}><RotateCcw size={15} />{t("attn.reopen")}</button>
      {:else}
        <button class="btn btn-primary" onclick={() => { if (dirty) saveNote(f!, draft); setReviewed(f!, true); }}><Check size={15} />{t("attn.done")}</button>
      {/if}
      <button class="btn" onclick={() => openAssistant({ kind: "finding", id: f!.id }, undefined, [{ kind: "finding", id: f!.id }])}><MessageSquare size={15} />{t("fx.ask")}</button>
      <button class="btn" onclick={() => { ui.inspector = null; go(`/case/${h!.caseId}/findings?view=board&start=finding:${f.id}`); }}><LayoutDashboard size={15} />{t("fx.board")}</button>
    </div>

    {#if noteOpen || f.note}
      <div class="note">
        <label class="field-label" for="note-{f.id}">{t("fx.note")}</label>
        <textarea id="note-{f.id}" class="field" rows="3" placeholder={t("fx.notePlaceholder")} bind:value={draft}></textarea>
        <div class="note-row">
          {#if dirty}<span class="unsaved" role="status">{t("fx.unsaved")}</span>{/if}
          <span class="grow"></span>
          <button class="btn btn-sm" disabled={!dirty} onclick={() => saveNote(f!, draft)}>{t("fx.saveNote")}</button>
        </div>
      </div>
    {:else}
      <button class="link-btn add-note" onclick={() => (noteOpen = true)}><NotebookPen size={14} />{t("attn.addNote")}</button>
    {/if}

    <details class="why">
      <summary>{t("attn.why")}</summary>
      <div class="why-body">
        <p>{l(f.explanation)}</p>
        <div>
          <h3 class="t-label">{t("fx.verify")}</h3>
          <p>{l(f.verify)}</p>
        </div>
        {#if f.uncertainty}
          <div>
            <h3 class="t-label">{t("fx.uncertainty")}</h3>
            <p class="muted">{l(f.uncertainty)}</p>
          </div>
        {/if}
        {#if f.legal?.length && prefs.pasal}
          <div class="legal">
            <h3 class="t-label">{t("fx.legal")}</h3>
            {#each f.legal as lid (lid)}
              {@const ref = legalRef(lid)}
              {#if ref}
                <button class="legal-chip" onclick={() => inspect({ kind: "legal", id: lid })}>
                  <KindIcon kind="legal" size={14} /><span>{#if ref.article}<strong>{ref.article}</strong> · {/if}{ref.regulation.replace(/ tentang .*/, "")}</span>
                </button>
              {/if}
            {/each}
          </div>
        {/if}
        <p class="xsmall muted">{t("fx.mode")} · {t("fx.quoteMatches")}</p>
        <p class="xsmall muted">{t("fx.footer")}</p>
      </div>
    </details>
  </article>
{/if}

<style>
  .finding {
    display: grid;
    gap: 16px;
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
    gap: 10px;
  }
  @container finding (min-width: 560px) {
    .compare {
      grid-template-columns: 1fr 1fr;
    }
  }
  .side {
    display: grid;
    gap: 8px;
    align-content: start;
    padding: 14px;
    border-radius: var(--radius-action);
    border: 1px solid var(--line);
    background: var(--surface-2);
    min-width: 0;
  }
  .loud .side {
    border-color: color-mix(in srgb, var(--alert) 30%, var(--line));
  }
  .label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    letter-spacing: 0.02em;
  }
  .quote {
    font-family: var(--font-serif);
    font-size: 18px;
    line-height: 1.4;
    color: var(--ink-strong);
  }
  .who {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
  }
  .side-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
  }
  .pills {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .pills button {
    padding: 3px 9px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--line-strong);
    font-size: 11.5px;
    font-weight: 600;
    color: var(--muted);
  }
  .pills button[aria-selected="true"] {
    background: var(--ink-strong);
    border-color: var(--ink-strong);
    color: var(--surface);
  }
  .ask {
    display: grid;
    gap: 4px;
    padding: 14px 16px;
    border-radius: var(--radius-action);
    background: var(--selected);
  }
  .ask p {
    font-size: 19px;
    line-height: 1.35;
  }
  .ask .link-btn {
    justify-self: start;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .note {
    display: grid;
    gap: 8px;
  }
  .note-row {
    display: flex;
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
  .add-note {
    justify-self: start;
  }
  .why {
    border-top: 1px solid var(--line);
    padding-top: 12px;
  }
  .why summary {
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-strong);
    width: fit-content;
  }
  .why-body {
    display: grid;
    gap: 12px;
    padding-top: 12px;
  }
  .why-body p {
    margin-top: 2px;
    line-height: 1.6;
  }
  .legal {
    display: grid;
    gap: 6px;
  }
  .legal-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    min-height: var(--hit);
    padding: 4px 10px;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-control);
    font-size: 12px;
    text-align: left;
    background: var(--surface);
  }
</style>
