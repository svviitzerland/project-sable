<script lang="ts">
  import { ArrowUp, Plus, X } from "@lucide/svelte";
  import { l, t } from "../lib/i18n";
  import { prefs } from "../lib/prefs.svelte";
  import { docsOf, findingsOfCase, hearingsOf, isMeaningful, needsLook, ui } from "../lib/store.svelte";
  import { contextInfo, contextKey, sameContext } from "../lib/threads.svelte";
  import type { ContextRef } from "../lib/types";
  import KindIcon from "./KindIcon.svelte";
  import StatusChip from "./StatusChip.svelte";

  /**
   * Where a question is written. It carries contexts, and several can be combined (hearings,
   * documents, findings, the whole case) so one question can cross them. Enter sends,
   * Shift+Enter starts a new line.
   */
  let {
    caseId,
    onsend,
    wholeCase = false,
    inputId = "assistant-input",
  }: { caseId: string; onsend: (question: string) => void; wholeCase?: boolean; inputId?: string } = $props();

  let input: HTMLTextAreaElement | undefined = $state();
  let open = $state(false);
  export function focus() {
    input?.focus();
  }

  const has = (c: ContextRef) => ui.chatRefs.some((r) => sameContext(r, c));
  function toggle(c: ContextRef) {
    const i = ui.chatRefs.findIndex((r) => sameContext(r, c));
    if (i >= 0) ui.chatRefs.splice(i, 1);
    else if (ui.chatRefs.length < 6) ui.chatRefs.push(c);
  }
  function onkey(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      onsend(ui.chatDraft);
    }
  }
  let findingOptions = $derived(
    findingsOfCase(caseId)
      .filter(isMeaningful)
      .sort((a, b) => Number(needsLook(b)) - Number(needsLook(a)))
      .slice(0, 8),
  );
</script>

<div class="composer">
  {#if ui.chatRefs.length}
    <div class="refs" role="group" aria-label={t("asp.contexts")}>
      {#each ui.chatRefs as r (contextKey(r))}
        {@const info = contextInfo(r)}
        <span class="ref">
          <KindIcon kind={info.icon} speakerId={info.speakerId} size={12} />
          <span class="ref-label">{info.label}</span>
          <button aria-label={t("as.removeRef", { label: info.label })} onclick={() => toggle(r)}><X size={12} /></button>
        </span>
      {/each}
    </div>
  {/if}
  <label class="sr-only" for={inputId}>{t("as.placeholder")}</label>
  <textarea id={inputId} class="field input" rows="2" placeholder={t("as.placeholder")} bind:value={ui.chatDraft} bind:this={input} onkeydown={onkey}></textarea>
  <div class="tools">
    <button class="chip" aria-expanded={open} onclick={() => (open = !open)}><Plus size={14} />{t("as.references")}</button>
    <button
      class="chip"
      aria-pressed={ui.chatLegal && prefs.pasal}
      disabled={!prefs.pasal}
      title={prefs.pasal ? t("as.legalToggle") : t("as.legalOff")}
      onclick={() => (ui.chatLegal = !ui.chatLegal)}><KindIcon kind="legal" size={14} />Pasal.id</button
    >
    <span class="grow"></span>
    <button class="btn btn-primary btn-icon send" aria-label={t("as.send")} disabled={!ui.chatDraft.trim() || ui.chatBusy} onclick={() => onsend(ui.chatDraft)}><ArrowUp size={18} /></button>
  </div>
  {#if open}
    <div class="picker">
      <p class="xsmall muted">{t("as.referencesHelp")}</p>
      <div class="picker-list scroll-y">
        {#if wholeCase}
          {@const c = { kind: "case" as const }}
          <label class="pick"><input type="checkbox" checked={has(c)} onchange={() => toggle(c)} /><KindIcon kind="case" size={14} />{t("as.contextCase")}</label>
        {/if}
        {#each hearingsOf(caseId).filter((h) => h.mode !== "scheduled") as h (h.id)}
          {@const c = { kind: "hearing" as const, id: h.id }}
          <label class="pick"><input type="checkbox" checked={has(c)} onchange={() => toggle(c)} /><KindIcon kind="hearing" size={14} />{t("common.hearingN", { n: h.number })} · {l(h.title)}</label>
        {/each}
        {#each docsOf(caseId) as d (d.id)}
          {@const c = { kind: "document" as const, id: d.id }}
          <label class="pick"><input type="checkbox" checked={has(c)} onchange={() => toggle(c)} /><KindIcon kind="document" size={14} />{d.title}</label>
        {/each}
        {#each findingOptions as f (f.id)}
          {@const c = { kind: "finding" as const, id: f.id }}
          <label class="pick"><input type="checkbox" checked={has(c)} onchange={() => toggle(c)} /><StatusChip status={f.status} size="sm" /><span class="clamp-2">{l(f.title)}</span></label>
        {/each}
      </div>
    </div>
  {/if}
  <p class="foot xsmall muted">{prefs.ai ? t("as.footer") : t("as.sourcesOnly")} · {t("as.enterHint")}</p>
</div>

<style>
  .composer {
    position: relative;
    display: grid;
    gap: 8px;
    padding: 12px 14px;
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
    z-index: 3;
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
    max-height: 280px;
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
