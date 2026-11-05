<script lang="ts">
  import { ArrowUp, Paperclip, SquarePen, X } from "@lucide/svelte";
  import { tick } from "svelte";
  import { fmtClock, l, t } from "../lib/i18n";
  import { prefs } from "../lib/prefs.svelte";
  import { go } from "../lib/router.svelte";
  import { ask, suggestionsFor, type Suggestion } from "../lib/services";
  import {
    connection,
    doc,
    docsOf,
    finding,
    findingsOfCase,
    hearing,
    hearingsOf,
    inspect,
    openFinding,
    legalRef,
    passage,
    speaker,
    speakerName,
    statement,
    ui,
  } from "../lib/store.svelte";
  import type { Kind } from "../lib/kinds";
  import type { Citation } from "../lib/types";
  import KindIcon from "./KindIcon.svelte";
  import Overlay from "./Overlay.svelte";
  import Rich from "./Rich.svelte";
  import StatusChip from "./StatusChip.svelte";

  let { caseId, variant }: { caseId: string; variant: "docked" | "drawer" | "sheet" } = $props();

  let log: HTMLElement | undefined = $state();
  let input: HTMLTextAreaElement | undefined = $state();
  let refsOpen = $state(false);

  let suggestions = $derived(suggestionsFor(ui.assistantContext));
  let contextLabel = $derived.by(() => {
    const c = ui.assistantContext;
    if (c.kind === "hearing") {
      const h = hearing(c.id);
      return h ? t("common.hearingN", { n: h.number }) : t("as.contextCase");
    }
    if (c.kind === "finding") return `${t("nav.findings")} · ${l(finding(c.id)?.title).slice(0, 38)}…`;
    if (c.kind === "documents") return t("nav.documents");
    if (c.kind === "passage") {
      const p = passage(c.id);
      return p ? `${doc(p.docId)?.title} · ${t("common.page", { n: p.page })}` : t("nav.documents");
    }
    if (c.kind === "connection") return `${t("ix.connection")} · ${connection(c.id)?.relation ?? ""}`;
    return t("as.contextCase");
  });
  const contextKinds: Record<string, Kind> = { case: "case", hearing: "hearing", finding: "finding", documents: "document", passage: "passage", connection: "connection" };
  let contextKind = $derived(contextKinds[ui.assistantContext.kind] ?? "case");

  function citeLabel(c: Citation) {
    if (c.kind === "passage") {
      const p = passage(c.id);
      const d = p ? doc(p.docId) : undefined;
      return { kind: "passage" as Kind, speakerId: undefined, title: d ? `${d.title} · ${t("common.page", { n: p!.page })}` : c.id, quote: p?.text ?? "" };
    }
    if (c.kind === "statement") {
      const s = statement(c.id);
      const h = hearing(s?.hearingId);
      return {
        kind: "statement" as Kind,
        speakerId: s?.speakerId,
        title: s && h ? `${t("common.hearingN", { n: h.number })} · ${fmtClock(s.t)} · ${speakerName(speaker(s.speakerId))}` : c.id,
        quote: s?.text ?? "",
      };
    }
    if (c.kind === "document") return { kind: "document" as Kind, speakerId: undefined, title: doc(c.id)?.title ?? c.id, quote: "" };
    if (c.kind === "hearing") {
      const h = hearing(c.id);
      return { kind: "hearing" as Kind, speakerId: undefined, title: h ? `${t("common.hearingN", { n: h.number })} · ${l(h.title)}` : c.id, quote: "" };
    }
    const f = finding(c.id);
    return { kind: "finding" as Kind, speakerId: undefined, title: f ? l(f.title) : c.id, quote: "" };
  }

  function open(c: Citation) {
    if (c.kind === "document") go(`/case/${caseId}/documents/${c.id}`);
    else if (c.kind === "hearing") go(`/case/${caseId}/hearings/${c.id}`);
    else if (c.kind === "finding") openFinding(c.id);
    else inspect({ kind: c.kind, id: c.id });
  }

  async function send(text?: string, topic?: Suggestion["topic"]) {
    const question = (text ?? ui.chatDraft).trim();
    if (!question || ui.chatBusy) return;
    ui.chat.push({ id: `u${Date.now()}`, role: "user", text: question });
    ui.chatDraft = "";
    ui.chatBusy = true;
    await scrollDown();
    const reply = await ask(caseId, question, ui.assistantContext, ui.chatLegal, topic);
    ui.chat.push({ id: `a${Date.now()}`, role: "assistant", text: reply.text, citations: reply.citations, legal: reply.legal, mode: reply.mode });
    ui.chatBusy = false;
    await scrollDown();
  }

  async function scrollDown() {
    await tick();
    log?.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
  }

  $effect(() => {
    if (ui.assistantOpen && ui.chatAutoSend) {
      ui.chatAutoSend = false;
      void send();
    }
  });

  $effect(() => {
    if (ui.assistantOpen && variant === "docked") setTimeout(() => input?.focus(), 60);
  });

  function onkey(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      void send();
    }
  }

  function toggleRef(c: Citation) {
    const i = ui.chatRefs.findIndex((r) => r.kind === c.kind && r.id === c.id);
    if (i >= 0) ui.chatRefs.splice(i, 1);
    else if (ui.chatRefs.length < 6) ui.chatRefs.push(c);
  }
  const hasRef = (c: Citation) => ui.chatRefs.some((r) => r.kind === c.kind && r.id === c.id);
  function refLabel(c: Citation) {
    if (c.kind === "passage") {
      const p = passage(c.id);
      return p ? `${doc(p.docId)?.title} · ${t("common.page", { n: p.page })}` : c.id;
    }
    if (c.kind === "statement") {
      const s = statement(c.id);
      const h = hearing(s?.hearingId);
      return s && h ? `${t("common.hearingN", { n: h.number })} · ${fmtClock(s.t)}` : c.id;
    }
    if (c.kind === "document") return doc(c.id)?.title ?? c.id;
    if (c.kind === "hearing") {
      const h = hearing(c.id);
      return h ? `${t("common.hearingN", { n: h.number })} · ${l(h.title)}` : c.id;
    }
    return l(finding(c.id)?.title) || c.id;
  }
</script>

{#snippet content()}
  <div class="head">
    <div class="head-text">
      <h2>{t("as.title")}</h2>
      <div class="ctx">
        <span class="xsmall muted">{t("as.context")}:</span>
        <span class="ctx-chip" title={t("as.contextHint")}><KindIcon kind={contextKind} size={12} />{contextLabel}</span>
        {#if ui.assistantContext.kind !== "case"}
          <button class="ctx-x" aria-label={t("as.contextCase")} onclick={() => (ui.assistantContext = { kind: "case" })}><X size={12} /></button>
        {/if}
      </div>
    </div>
    <button class="btn btn-ghost btn-icon" aria-label={t("as.new")} title={t("as.new")} onclick={() => { ui.chat = []; ui.chatRefs = []; }}><SquarePen size={17} /></button>
    <button class="btn btn-ghost btn-icon" aria-label={t("as.close")} onclick={() => (ui.assistantOpen = false)}><X size={18} /></button>
  </div>

  <div class="log scroll-y" bind:this={log} role="log" aria-live="polite" aria-label={t("as.title")}>
    {#if ui.chat.length === 0}
      <div class="welcome">
        <p>{t("as.welcome")}</p>
        <h3 class="t-label">{t("as.suggested")}</h3>
        <div class="suggestions">
          {#each suggestions as s (s.text.en)}
            <button class="suggestion" onclick={() => send(l(s.text), s.topic)}>{l(s.text)}</button>
          {/each}
        </div>
        {#if !prefs.ai}<p class="notice">{t("as.aiOff")}</p>{/if}
      </div>
    {/if}

    {#each ui.chat as m (m.id)}
      {#if m.role === "user"}
        <div class="msg user">
          <span class="who">{t("as.you")}</span>
          <p>{l(m.text)}</p>
        </div>
      {:else}
        <div class="msg bot">
          <span class="who">
            {t("as.title")}
            <span class="tag">{m.mode === "sources-only" ? t("as.sourcesOnly") : t("as.simulated")}</span>
          </span>
          {#if m.mode === "sources-only"}
            <p class="notice">{t("as.aiOff")}</p>
          {:else if l(m.text)}
            <Rich text={l(m.text)} oncite={(i) => m.citations?.[i] && open(m.citations[i])} />
          {/if}
          {#if m.citations?.length}
            <div class="sources">
              <h3 class="t-label">{t("as.sources")}</h3>
              <ol>
                {#each m.citations as c, i (i)}
                  {@const info = citeLabel(c)}
                  <li>
                    <button class="source" onclick={() => open(c)}>
                      <span class="num">{i + 1}</span>
                      <span class="source-body">
                        <span class="source-title"><KindIcon kind={info.kind} speakerId={info.speakerId} size={13} />{info.title}</span>
                        {#if info.quote}<span class="source-quote clamp-2" class:doc-text={info.kind === "passage"}>“{info.quote}”</span>{/if}
                      </span>
                    </button>
                  </li>
                {/each}
              </ol>
            </div>
          {:else if m.mode === "sources-only" || !l(m.text)}
            <p class="small muted">{t("as.noMatch")}</p>
          {/if}
          {#if m.legal?.length}
            <div class="sources">
              <h3 class="t-label">{t("as.legal")}</h3>
              {#each m.legal as lid (lid)}
                {@const ref = legalRef(lid)}
                {#if ref}
                  <button class="source" onclick={() => inspect({ kind: "legal", id: lid })}>
                    <span class="num"><KindIcon kind="legal" size={12} /></span>
                    <span class="source-body">
                      <span class="source-title">{ref.article ? `${ref.article} · ` : ""}{ref.regulation.replace(/ tentang .*/, "")}</span>
                      <span class="source-quote clamp-2 doc-text">{l(ref.summary)}</span>
                    </span>
                  </button>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/each}

    {#if ui.chatBusy}
      <div class="msg bot busy" role="status">
        <span class="who">{t("as.title")}</span>
        <span class="small muted">{t("as.thinking")}</span>
        <span class="skeleton" style="height:10px;width:92%"></span>
        <span class="skeleton" style="height:10px;width:76%"></span>
        <span class="skeleton" style="height:10px;width:84%"></span>
      </div>
    {/if}
  </div>

  <div class="composer">
    {#if ui.chatRefs.length}
      <div class="refs">
        {#each ui.chatRefs as r (r.kind + r.id)}
          <span class="ref">
            <KindIcon kind={r.kind} speakerId={r.kind === "statement" ? statement(r.id)?.speakerId : undefined} size={12} />
            <span class="ref-label">{refLabel(r)}</span>
            <button aria-label={t("as.removeRef", { label: refLabel(r) })} onclick={() => toggleRef(r)}><X size={12} /></button>
          </span>
        {/each}
      </div>
    {/if}
    <label class="sr-only" for="assistant-input">{t("as.placeholder")}</label>
    <textarea
      id="assistant-input"
      class="field input"
      rows="2"
      placeholder={t("as.placeholder")}
      bind:value={ui.chatDraft}
      bind:this={input}
      onkeydown={onkey}
    ></textarea>
    <div class="tools">
      <button class="chip" aria-expanded={refsOpen} onclick={() => (refsOpen = !refsOpen)}><Paperclip size={14} />{t("as.references")}</button>
      <button
        class="chip"
        aria-pressed={ui.chatLegal && prefs.pasal}
        disabled={!prefs.pasal}
        title={prefs.pasal ? t("as.legalToggle") : t("as.legalOff")}
        onclick={() => (ui.chatLegal = !ui.chatLegal)}><KindIcon kind="legal" size={14} />Pasal.id</button
      >
      <span class="grow"></span>
      <button class="btn btn-primary btn-icon send" aria-label={t("as.send")} disabled={!ui.chatDraft.trim() || ui.chatBusy} onclick={() => send()}><ArrowUp size={18} /></button>
    </div>
    {#if refsOpen}
      <div class="picker">
        <p class="xsmall muted">{t("as.referencesHelp")}</p>
        <div class="picker-list scroll-y">
          {#each docsOf(caseId) as d (d.id)}
            {@const c = { kind: "document" as const, id: d.id }}
            <label class="pick"><input type="checkbox" checked={hasRef(c)} onchange={() => toggleRef(c)} /><KindIcon kind="document" size={14} />{d.title}</label>
          {/each}
          {#each hearingsOf(caseId).filter((h) => h.mode !== "scheduled") as h (h.id)}
            {@const c = { kind: "hearing" as const, id: h.id }}
            <label class="pick"><input type="checkbox" checked={hasRef(c)} onchange={() => toggleRef(c)} /><KindIcon kind="hearing" size={14} />{t("common.hearingN", { n: h.number })} · {l(h.title)}</label>
          {/each}
          {#each findingsOfCase(caseId).filter((f) => !f.reviewed).slice(0, 5) as f (f.id)}
            {@const c = { kind: "finding" as const, id: f.id }}
            <label class="pick"><input type="checkbox" checked={hasRef(c)} onchange={() => toggleRef(c)} /><StatusChip status={f.status} size="sm" /><span class="clamp-2">{l(f.title)}</span></label>
          {/each}
        </div>
      </div>
    {/if}
    <p class="foot xsmall muted">{prefs.ai ? t("as.footer") : t("as.sourcesOnly")} · {t("as.enterHint")}</p>
  </div>
{/snippet}

{#if variant === "docked"}
  {#if ui.assistantOpen}
    <aside class="panel docked" aria-label={t("as.title")}>{@render content()}</aside>
  {/if}
{:else}
  <Overlay open={ui.assistantOpen} onclose={() => (ui.assistantOpen = false)} variant={variant === "sheet" ? "sheet" : "drawer"} label={t("as.title")} width={440}>
    <div class="panel">{@render content()}</div>
  </Overlay>
{/if}

<style>
  .panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    background: var(--surface);
  }
  .docked {
    position: sticky;
    top: 0;
    height: 100dvh;
    width: var(--assistant-w);
    border-left: 1px solid var(--line);
  }
  .head {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    padding: 12px 10px 10px 16px;
    border-bottom: 1px solid var(--line);
  }
  .head-text {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 4px;
  }
  .head h2 {
    font-size: 15px;
    font-weight: 600;
    color: var(--ink-strong);
  }
  .ctx {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .ctx-chip {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-strong);
    background: var(--selected);
    padding: 1px 8px;
    border-radius: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .ctx-x {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    color: var(--muted);
  }
  .ctx-x:hover {
    background: var(--sunken);
  }
  .log {
    flex: 1;
    min-height: 0;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .welcome {
    display: grid;
    gap: 12px;
  }
  .welcome > p {
    color: var(--muted);
  }
  .suggestions {
    display: grid;
    gap: 6px;
  }
  .suggestion {
    text-align: left;
    padding: 10px 12px;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-action);
    font-size: 13px;
    color: var(--ink-strong);
    background: var(--surface);
  }
  .suggestion:hover {
    border-color: var(--muted);
    background: var(--surface-2);
  }
  .msg {
    display: grid;
    gap: 8px;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    letter-spacing: 0.02em;
  }
  .user {
    background: var(--selected);
    padding: 10px 12px;
    border-radius: var(--radius-action);
  }
  .bot {
    padding-bottom: 14px;
    border-bottom: 1px solid var(--line);
  }
  .busy {
    gap: 7px;
  }
  .sources {
    display: grid;
    gap: 6px;
  }
  .sources ol {
    display: grid;
    gap: 4px;
  }
  .source {
    display: flex;
    gap: 8px;
    width: 100%;
    padding: 7px 8px;
    border-radius: var(--radius-control);
    text-align: left;
    align-items: flex-start;
  }
  .source:hover {
    background: var(--sunken);
  }
  .num {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    min-width: 18px;
    height: 18px;
    border-radius: 4px;
    background: var(--selected);
    font-size: 10.5px;
    font-weight: 700;
    color: var(--ink-strong);
    margin-top: 1px;
  }
  .source-body {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .source-title {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-strong);
  }
  .source-quote {
    font-size: 12px;
    color: var(--muted);
  }
  .composer {
    position: relative;
    display: grid;
    gap: 8px;
    padding: 12px 14px 12px;
    border-top: 1px solid var(--line);
    background: var(--surface);
  }
  .input {
    resize: none;
    field-sizing: content;
    min-height: 64px;
    max-height: 180px;
  }
  .refs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .ref {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    max-width: 100%;
    padding: 3px 4px 3px 8px;
    border-radius: 4px;
    background: var(--selected);
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ink-strong);
  }
  .ref-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 26ch;
  }
  .ref button {
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 3px;
  }
  .ref button:hover {
    background: var(--sunken);
  }
  .tools {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .grow {
    flex: 1;
  }
  .send {
    border-radius: 50%;
  }
  .picker {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: calc(100% - 6px);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-action);
    box-shadow: var(--shadow-float);
    padding: 10px;
    display: grid;
    gap: 8px;
  }
  .picker-list {
    display: grid;
    gap: 2px;
    max-height: 260px;
  }
  .pick {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: var(--hit);
    padding: 4px 6px;
    border-radius: var(--radius-control);
    font-size: 12.5px;
    cursor: pointer;
  }
  .pick:hover {
    background: var(--sunken);
  }
  .pick input {
    accent-color: var(--primary);
    width: 16px;
    height: 16px;
  }
  .foot {
    line-height: 1.4;
  }
</style>
