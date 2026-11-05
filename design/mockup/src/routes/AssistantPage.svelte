<script lang="ts">
  import { ArrowLeft, Search, SquarePen, Trash2 } from "@lucide/svelte";
  import { tick } from "svelte";
  import ChatComposer from "../components/ChatComposer.svelte";
  import ChatLog from "../components/ChatLog.svelte";
  import KindIcon from "../components/KindIcon.svelte";
  import { fmtDate, l, t } from "../lib/i18n";
  import { prefs } from "../lib/prefs.svelte";
  import { href, redirect } from "../lib/router.svelte";
  import { suggestionsFor, type Suggestion } from "../lib/services";
  import { ui } from "../lib/store.svelte";
  import {
    asPageContext,
    asking,
    contextInfo,
    contextKey,
    contextsOfThread,
    deleteThread,
    openContext,
    sameContext,
    sendQuestion,
    threadById,
    threadsOf,
  } from "../lib/threads.svelte";
  import type { ContextRef, Thread } from "../lib/types";

  /**
   * Asisten: every conversation with the case assistant, like a chat app, with the context each
   * question was asked with. The composer combines contexts, so one question can cross hearings,
   * documents and findings. The side panel continues whichever conversation is open here.
   */
  let { caseId, threadId }: { caseId: string; threadId?: string } = $props();

  let width = $state(0);
  let wide = $derived(width >= 880);
  let query = $state("");
  let only = $state<ContextRef | null>(null);
  let log: HTMLElement | undefined = $state();

  let all = $derived(threadsOf(caseId));
  let current = $derived(threadId && threadId !== "new" ? threadById(threadId) : undefined);
  // A wide page always shows a conversation: the open one, or a new one.
  let composing = $derived(!current && (threadId === "new" || wide));

  // The open conversation is the one the side panel continues; its last contexts carry on.
  let lastOpened = "";
  $effect(() => {
    const id = current?.id ?? "";
    if (id === lastOpened) return;
    lastOpened = id;
    ui.threadId = current?.id ?? null;
    const asked = current ? [...current.messages].reverse().find((m) => m.role === "user" && m.contexts?.length) : undefined;
    if (asked?.contexts) ui.chatRefs = asked.contexts.map((c) => ({ ...c }));
    void scrollDown(false);
  });

  // Contexts used across conversations, most used first, to filter the history by.
  let used = $derived.by(() => {
    const count = new Map<string, { c: ContextRef; n: number }>();
    for (const th of all) {
      for (const c of contextsOfThread(th)) {
        const k = contextKey(c);
        count.set(k, { c, n: (count.get(k)?.n ?? 0) + 1 });
      }
    }
    return [...count.values()].sort((a, b) => b.n - a.n).slice(0, 6).map((x) => x.c);
  });
  let shown = $derived(
    all.filter((th) => {
      if (only && !contextsOfThread(th).some((c) => sameContext(c, only!))) return false;
      const q = query.trim().toLowerCase();
      return !q || l(th.title).toLowerCase().includes(q) || th.messages.some((m) => l(m.text).toLowerCase().includes(q));
    }),
  );
  let groups = $derived.by(() => {
    const day = (ms: number) => new Date(ms).toDateString();
    const today = day(Date.now());
    const yesterday = day(Date.now() - 86_400_000);
    const out: { label: string; items: Thread[] }[] = [];
    for (const th of shown) {
      const d = day(th.updated);
      const label = d === today ? t("asp.today") : d === yesterday ? t("asp.yesterday") : t("asp.earlier");
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(th);
      else out.push({ label, items: [th] });
    }
    return out;
  });
  const when = (ms: number) => {
    const d = new Date(ms);
    return d.toDateString() === new Date().toDateString()
      ? d.toLocaleTimeString(prefs.lang === "id" ? "id-ID" : "en-GB", { hour: "2-digit", minute: "2-digit" })
      : fmtDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, { day: "numeric", month: "short" });
  };

  let contexts = $derived<ContextRef[]>(ui.chatRefs.length ? ui.chatRefs : [{ kind: "case" }]);
  let suggestions = $derived(suggestionsFor(asPageContext(contexts.find((c) => c.kind !== "case") ?? contexts[0])));

  async function scrollDown(smooth = true) {
    await tick();
    log?.scrollTo({ top: log.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }
  async function send(text: string, topic?: Suggestion["topic"]) {
    if (!text.trim() || ui.chatBusy) return;
    if (!current) ui.threadId = null;
    const asked = sendQuestion(caseId, text, $state.snapshot(contexts), topic);
    if (!current && ui.threadId) redirect(`/case/${caseId}/assistant/${ui.threadId}`);
    await scrollDown();
    await asked;
    await scrollDown();
  }
  function remove(th: Thread) {
    deleteThread(th.id);
    redirect(`/case/${caseId}/assistant`);
  }
</script>

<div class="page assistant-page" bind:clientWidth={width}>
  <header class="page-head" class:in-thread={!wide && !!threadId}>
    <div>
      <h1>{t("nav.assistant")}</h1>
      <p>{t("asp.lead")}</p>
    </div>
  </header>

  <div class="layout" class:wide>
    {#if wide || !threadId}
      <aside class="history" aria-label={t("asp.history")}>
        <a
          class="btn btn-primary new"
          href={href(`/case/${caseId}/assistant/new`)}
          onclick={() => {
            ui.threadId = null;
            ui.chatRefs = [];
          }}><SquarePen size={16} />{t("as.new")}</a
        >
        <div class="search">
          <Search size={15} />
          <label class="sr-only" for="asp-search">{t("asp.search")}</label>
          <input id="asp-search" class="field" type="search" placeholder={t("asp.search")} bind:value={query} />
        </div>
        {#if used.length > 1}
          <div class="filters" role="group" aria-label={t("asp.filter")}>
            <button class="chip" aria-pressed={!only} onclick={() => (only = null)}>{t("asp.filterAll")}</button>
            {#each used as c (contextKey(c))}
              {@const info = contextInfo(c)}
              <button class="chip" aria-pressed={!!only && sameContext(only, c)} title={info.label} onclick={() => (only = only && sameContext(only, c) ? null : c)}>
                <KindIcon kind={info.icon} speakerId={info.speakerId} size={12} /><span class="chip-label">{info.label}</span>
              </button>
            {/each}
          </div>
        {/if}
        {#if !all.length}
          <p class="small muted empty">{t("asp.empty")}</p>
        {:else if !shown.length}
          <p class="small muted empty">{t("asp.none")}</p>
        {/if}
        {#each groups as g (g.label)}
          <h2 class="t-label day">{g.label}</h2>
          <ul class="threads">
            {#each g.items as th (th.id)}
              {@const ctx = contextsOfThread(th)}
              <li>
                <a class="thread" href={href(`/case/${caseId}/assistant/${th.id}`)} aria-current={current?.id === th.id ? "page" : undefined}>
                  <span class="title clamp-2">{l(th.title)}</span>
                  <span class="meta xsmall muted">
                    {t("asp.messages", { n: th.messages.length })} · {when(th.updated)}{#if th.sample} · {t("asp.sample")}{/if}
                  </span>
                  {#if ctx.length}
                    <span class="ctxs">
                      {#each ctx.slice(0, 3) as c (contextKey(c))}
                        {@const info = contextInfo(c)}
                        <span class="mini" title={info.label}><KindIcon kind={info.icon} speakerId={info.speakerId} size={11} /><span>{info.label}</span></span>
                      {/each}
                      {#if ctx.length > 3}<span class="mini more">+{ctx.length - 3}</span>{/if}
                    </span>
                  {/if}
                </a>
              </li>
            {/each}
          </ul>
        {/each}
      </aside>
    {/if}

    {#if current || composing}
      <section class="conversation" aria-label={current ? l(current.title) : t("as.new")}>
        <header class="conv-head">
          {#if !wide}<a class="link-btn back" href={href(`/case/${caseId}/assistant`)}><ArrowLeft size={15} />{t("asp.back")}</a>{/if}
          <div class="conv-title">
            <h2 class="t-serif">{current ? l(current.title) : t("as.new")}</h2>
            {#if current}
              {@const ctx = contextsOfThread(current)}
              {#if ctx.length}
                <p class="used">
                  <span class="xsmall muted">{t("asp.used")}</span>
                  {#each ctx as c (contextKey(c))}
                    {@const info = contextInfo(c)}
                    <button class="mini" title={info.label} onclick={() => openContext(caseId, c)}><KindIcon kind={info.icon} speakerId={info.speakerId} size={11} /><span>{info.label}</span></button>
                  {/each}
                </p>
              {/if}
            {/if}
          </div>
          {#if current}
            {#if current.sample}<span class="tag">{t("asp.sample")}</span>{/if}
            <button class="btn btn-ghost btn-icon" aria-label={t("asp.delete")} title={t("asp.delete")} onclick={() => remove(current!)}><Trash2 size={16} /></button>
          {/if}
        </header>
        <div class="log scroll-y" bind:this={log} role="log" aria-live="polite" aria-label={t("asp.history")}>
          {#if current}
            <ChatLog {caseId} messages={current.messages} busy={ui.chatBusy && asking.thread === current.id} showContexts />
          {:else}
            <div class="welcome">
              <p>{t("asp.start")}</p>
              <h3 class="t-label">{t("as.suggested")}</h3>
              <div class="suggestions">
                {#each suggestions as s (s.text.en)}
                  <button class="suggestion" onclick={() => send(l(s.text), s.topic)}>{l(s.text)}</button>
                {/each}
              </div>
              {#if !prefs.ai}<p class="notice">{t("as.aiOff")}</p>{/if}
            </div>
          {/if}
        </div>
        {#if !ui.chatRefs.length}
          <p class="default xsmall muted"><KindIcon kind="case" size={12} />{t("asp.defaultContext")}</p>
        {/if}
        <ChatComposer {caseId} wholeCase inputId="asp-input" onsend={(q) => send(q)} />
      </section>
    {/if}
  </div>
</div>

<style>
  .assistant-page {
    max-width: 1400px;
  }
  .layout {
    --chat-h: clamp(520px, calc(100dvh - 250px), 900px);
    display: grid;
    gap: 16px;
    align-items: start;
  }
  .layout.wide {
    grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  }
  .history {
    display: grid;
    align-content: start;
    gap: 10px;
    min-width: 0;
  }
  .wide .history {
    max-height: var(--chat-h);
    overflow: auto;
    padding-right: 4px;
  }
  .new {
    justify-self: start;
  }
  .search {
    position: relative;
    display: flex;
    align-items: center;
  }
  .search :global(svg) {
    position: absolute;
    left: 10px;
    color: var(--muted);
    pointer-events: none;
  }
  .search .field {
    width: 100%;
    padding-left: 32px;
  }
  /* One row that scrolls sideways, so the conversations start high. */
  .filters {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    padding-bottom: 2px;
  }
  .filters .chip {
    flex-shrink: 0;
  }
  .filters .chip {
    max-width: 100%;
  }
  .chip-label {
    min-width: 0;
    max-width: 18ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .empty {
    margin: 4px 0;
  }
  .day {
    margin: 8px 0 0;
  }
  .threads {
    display: grid;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .thread {
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    border: 1px solid transparent;
    border-radius: var(--radius-control);
    color: var(--ink);
    text-decoration: none;
  }
  .thread:hover {
    background: var(--sunken);
  }
  .thread[aria-current="page"] {
    border-color: var(--selected-line);
    background: var(--selected);
  }
  .title {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.35;
    color: var(--ink-strong);
  }
  .ctxs,
  .used {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    margin: 0;
    min-width: 0;
  }
  .used > .xsmall {
    flex-shrink: 0;
    white-space: nowrap;
  }
  .mini {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    max-width: 100%;
    padding: 1px 6px 1px 3px;
    border-radius: 20px;
    background: var(--surface-2);
    border: 1px solid var(--line);
    font-size: 11px;
    font-weight: 600;
    color: var(--ink);
  }
  .mini span {
    min-width: 0;
    max-width: 22ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mini.more {
    padding: 1px 6px;
    color: var(--muted);
  }
  button.mini:hover {
    background: var(--sunken);
  }
  .conversation {
    display: flex;
    flex-direction: column;
    min-width: 0;
    height: var(--chat-h);
    border: 1px solid var(--line);
    border-radius: var(--radius-surface);
    background: var(--surface);
    overflow: hidden;
  }
  .conv-head {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 8px 10px;
    padding: 14px 14px 12px 18px;
    border-bottom: 1px solid var(--line);
  }
  .back {
    flex-basis: 100%;
  }
  .conv-title {
    flex: 1;
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  .conv-title h2 {
    font-size: 22px;
    line-height: 1.2;
  }
  .log {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 18px 20px;
  }
  .welcome {
    display: grid;
    gap: 12px;
    max-width: 640px;
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
    font-size: 13.5px;
    color: var(--ink-strong);
    background: var(--surface);
  }
  .suggestion:hover {
    border-color: var(--muted);
    background: var(--surface-2);
  }
  .default {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    padding: 8px 16px 0;
    border-top: 1px solid var(--line);
  }
  .default + :global(.composer) {
    border-top: 0;
  }
  /* On a narrow page an open conversation takes the screen; the top bar already names it. */
  .page-head.in-thread {
    display: none;
  }
  @media (max-width: 879px) {
    .conversation {
      height: calc(100dvh - 190px);
      min-height: 440px;
    }
    .used {
      flex-wrap: nowrap;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .used .mini {
      flex-shrink: 0;
    }
  }
</style>
