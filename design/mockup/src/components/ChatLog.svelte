<script lang="ts">
  import { fmtClock, l, t } from "../lib/i18n";
  import type { Kind } from "../lib/kinds";
  import { go } from "../lib/router.svelte";
  import { doc, finding, hearing, inspect, legalRef, openFinding, passage, speaker, speakerName, statement } from "../lib/store.svelte";
  import { contextInfo, contextKey, openContext } from "../lib/threads.svelte";
  import type { ChatMessage, Citation } from "../lib/types";
  import KindIcon from "./KindIcon.svelte";
  import Rich from "./Rich.svelte";

  /**
   * A conversation's messages. A question can show the contexts it was asked with; an answer
   * shows its numbered sources (each opens in place) and any legal references to verify.
   */
  let { caseId, messages, busy = false, showContexts = false }: { caseId: string; messages: ChatMessage[]; busy?: boolean; showContexts?: boolean } = $props();

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
</script>

{#each messages as m (m.id)}
  {#if m.role === "user"}
    <div class="msg user">
      <span class="who">{t("as.you")}</span>
      {#if showContexts && m.contexts?.length}
        <p class="asked">
          <span class="asked-label">{t("asp.askedWith")}</span>
          {#each m.contexts as c (contextKey(c))}
            {@const info = contextInfo(c)}
            <button class="ctx" title={info.label} onclick={() => openContext(caseId, c)}><KindIcon kind={info.icon} speakerId={info.speakerId} size={12} /><span>{info.label}</span></button>
          {/each}
        </p>
      {/if}
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

{#if busy}
  <div class="msg bot busy" role="status">
    <span class="who">{t("as.title")}</span>
    <span class="small muted">{t("as.thinking")}</span>
    <span class="skeleton" style="height:10px;width:92%"></span>
    <span class="skeleton" style="height:10px;width:76%"></span>
    <span class="skeleton" style="height:10px;width:84%"></span>
  </div>
{/if}

<style>
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
  .asked {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 6px;
    margin: 0;
    font-size: 11.5px;
  }
  .asked-label {
    color: var(--muted);
  }
  .ctx {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    max-width: 100%;
    min-width: 0;
    padding: 1px 7px 1px 4px;
    border: 1px solid color-mix(in srgb, var(--selected-line) 55%, transparent);
    border-radius: 20px;
    background: var(--surface);
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ink-strong);
  }
  .ctx span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 30ch;
  }
  .ctx:hover {
    background: var(--sunken);
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
</style>
