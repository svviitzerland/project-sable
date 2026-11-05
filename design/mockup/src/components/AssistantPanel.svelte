<script lang="ts">
  import { History, SquarePen, X } from "@lucide/svelte";
  import { tick } from "svelte";
  import { l, t } from "../lib/i18n";
  import { prefs } from "../lib/prefs.svelte";
  import { go } from "../lib/router.svelte";
  import { suggestionsFor, type Suggestion } from "../lib/services";
  import { ui } from "../lib/store.svelte";
  import { activeThread, asking, contextInfo, sameContext, sendQuestion } from "../lib/threads.svelte";
  import type { ContextRef } from "../lib/types";
  import ChatComposer from "./ChatComposer.svelte";
  import ChatLog from "./ChatLog.svelte";
  import KindIcon from "./KindIcon.svelte";
  import Overlay from "./Overlay.svelte";

  /**
   * The case assistant beside any page: it follows what is open, can carry more contexts, and
   * continues the current conversation; the full history is one click away on the Asisten page.
   */
  let { caseId, variant }: { caseId: string; variant: "docked" | "drawer" | "sheet" } = $props();

  let log: HTMLElement | undefined = $state();
  let composer: { focus: () => void } | undefined = $state();

  let thread = $derived(activeThread(caseId));
  let messages = $derived(thread?.messages ?? []);
  let suggestions = $derived(suggestionsFor(ui.assistantContext));
  let page = $derived(contextInfo(ui.assistantContext as ContextRef));

  async function send(text?: string, topic?: Suggestion["topic"]) {
    const question = (text ?? ui.chatDraft).trim();
    if (!question || ui.chatBusy) return;
    const here = ui.assistantContext as ContextRef;
    const asked = sendQuestion(caseId, question, [here, ...ui.chatRefs.filter((r) => !sameContext(r, here))], topic);
    await scrollDown();
    await asked;
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
    if (ui.assistantOpen && variant === "docked") setTimeout(() => composer?.focus(), 60);
  });

  function startNew() {
    ui.threadId = null;
    ui.chatRefs = [];
  }
  function allConversations() {
    ui.assistantOpen = false;
    go(`/case/${caseId}/assistant${thread ? `/${thread.id}` : ""}`);
  }
</script>

{#snippet content()}
  <div class="head">
    <div class="head-text">
      <h2>{t("as.title")}</h2>
      <div class="ctx">
        <span class="xsmall muted">{t("as.context")}:</span>
        <span class="ctx-chip" title={t("as.contextHint")}><KindIcon kind={page.icon} speakerId={page.speakerId} size={12} />{page.label}</span>
        {#if ui.assistantContext.kind !== "case"}
          <button class="ctx-x" aria-label={t("as.contextCase")} onclick={() => (ui.assistantContext = { kind: "case" })}><X size={12} /></button>
        {/if}
      </div>
    </div>
    <button class="btn btn-ghost btn-icon" aria-label={t("asp.openAll")} title={t("asp.openAll")} onclick={allConversations}><History size={17} /></button>
    <button class="btn btn-ghost btn-icon" aria-label={t("as.new")} title={t("as.new")} onclick={startNew}><SquarePen size={17} /></button>
    <button class="btn btn-ghost btn-icon" aria-label={t("as.close")} onclick={() => (ui.assistantOpen = false)}><X size={18} /></button>
  </div>

  <div class="log scroll-y" bind:this={log} role="log" aria-live="polite" aria-label={t("as.title")}>
    {#if messages.length === 0}
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
    <ChatLog {caseId} {messages} busy={ui.chatBusy && (!thread || asking.thread === thread.id)} />
  </div>

  <ChatComposer bind:this={composer} {caseId} onsend={(q) => send(q)} />
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
</style>
