<script lang="ts">
  import Mark from "./Mark.svelte";
  import { Check, ChevronRight, Copy, RotateCcw } from "@lucide/svelte";
  import { fmtClock, l, t } from "../lib/i18n";
  import { doc, passage, setReviewed, statement, toastT } from "../lib/store.svelte";
  import type { Finding } from "../lib/types";
  import Quote from "./Quote.svelte";
  import SpeakerTag from "./SpeakerTag.svelte";
  import StatusChip from "./StatusChip.svelte";

  /**
   * A finding worth a look, shown as the two phrases that disagree (or need context), side by
   * side, plus the question it suggests. "hero" arrives with emphasis during a live hearing;
   * "compact" is a single line that opens it. `brief` keeps only the words around each phrase.
   */
  let {
    f,
    mode = "card",
    now = false,
    brief = false,
    onview,
    onlater,
    onopen,
  }: {
    f: Finding;
    mode?: "hero" | "card" | "inline" | "compact";
    now?: boolean;
    brief?: boolean;
    onview?: () => void;
    onlater?: () => void;
    onopen?: () => void;
  } = $props();

  let st = $derived(statement(f.statementId));
  let source = $derived(f.sources[0]);
  let p = $derived(source ? passage(source.passageId) : undefined);
  let d = $derived(p ? doc(p.docId) : undefined);
  let loud = $derived(f.status === "potential_inconsistency");

  async function copy() {
    try {
      await navigator.clipboard.writeText(f.question);
    } catch {
      /* The toast still confirms intent in the mockup. */
    }
    toastT("toast.copied");
  }
</script>

{#if mode === "compact"}
  <button class="compact" class:loud class:done={f.reviewed} onclick={onopen}>
    <span class="mark" aria-hidden="true"><Mark kind={f.reviewed ? "done" : "look"} size={12} /></span>
    <span class="compact-body">
      <span class="compact-title clamp-2">{l(f.title)}</span>
      <span class="xsmall muted">{t(`status.${f.status}`)}{st ? ` · ${fmtClock(st.t)}` : ""}</span>
    </span>
    <ChevronRight size={16} />
  </button>
{:else}
  <article class="alert {mode}" class:loud class:brief class:done={f.reviewed}>
    <header class="head">
      <StatusChip status={f.status} />
      {#if st}<span class="xsmall muted tabular">{fmtClock(st.t)}</span>{/if}
      {#if f.reviewed}<span class="tag"><Check size={12} />{t("attn.done")}</span>{/if}
      {#if brief && onlater && !f.reviewed}<span class="grow"></span><button class="btn btn-sm btn-ghost" onclick={onlater}>{t("attn.later")}</button>{/if}
    </header>
    <h3 class="title t-serif">{l(f.title)}</h3>
    {#if st}
      <div class="compare">
        <div class="side said">
          <span class="label">{now ? t("attn.saidNow") : t("attn.said")}</span>
          <p class="quote">“<Quote text={st.text} mark={f.said} around={brief ? 4 : 0} />”</p>
          {#if mode !== "inline" && !brief}<SpeakerTag id={st.speakerId} compact />{/if}
        </div>
        {#if p && d}
          <div class="side source">
            <span class="label">{t("attn.inSource", { doc: d.title, page: p.page })}</span>
            <p class="quote">“<Quote text={p.text} mark={source.match} around={brief ? 4 : 0} />”</p>
            {#if f.sources.length > 1}<span class="xsmall muted">{t("attn.more", { n: f.sources.length - 1 })}</span>{/if}
          </div>
        {/if}
      </div>
    {/if}
    <div class="ask">
      <span class="label ask-label">
        {t("attn.ask")}
        {#if brief}<button class="copy-mini" onclick={copy} aria-label={t("attn.copy")} title={t("attn.copy")}><Copy size={13} /></button>{/if}
      </span>
      <p class="t-serif">{f.question}</p>
    </div>
    <footer class="actions">
      {#if !brief}<button class="btn btn-sm btn-ghost" onclick={copy}><Copy size={14} />{t("attn.copy")}</button>{/if}
      {#if onview}<button class="btn btn-sm" onclick={onview}>{t("attn.view")}</button>{/if}
      <span class="grow"></span>
      {#if !brief && onlater && !f.reviewed}<button class="btn btn-sm btn-ghost" onclick={onlater}>{t("attn.later")}</button>{/if}
      {#if f.reviewed}
        <button class="btn btn-sm" onclick={() => setReviewed(f, false)}><RotateCcw size={14} />{t("attn.reopen")}</button>
      {:else}
        <button class="btn btn-sm btn-primary" onclick={() => setReviewed(f, true)}><Check size={14} />{t("attn.done")}</button>
      {/if}
    </footer>
  </article>
{/if}

<style>
  .alert {
    --accent: var(--st-context-dot);
    container-type: inline-size;
    display: grid;
    gap: 12px;
    padding: 16px;
    border-radius: var(--radius-surface);
    background: var(--surface);
    border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--line));
    min-width: 0;
  }
  .alert.loud {
    --accent: var(--alert);
    background: color-mix(in srgb, var(--alert-soft) 45%, var(--surface));
  }
  .alert.done {
    --accent: var(--line-strong);
    background: var(--surface);
  }
  .hero {
    animation: alert-in 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both, alert-glow 1.2s ease-in-out 0.5s 2;
    box-shadow: var(--shadow-float);
  }
  .inline {
    padding: 14px;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 10px;
  }
  .title {
    font-size: 20px;
    line-height: 1.25;
  }
  .inline .title {
    font-size: 18px;
  }
  .compare {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  /* Full quotes stack on narrow cards; brief excerpts stay side by side, like a split screen. */
  @container (max-width: 420px) {
    .alert:not(.brief) .compare {
      grid-template-columns: 1fr;
    }
    .brief {
      gap: 10px;
      padding: 14px;
    }
    .brief .title {
      font-size: 18px;
    }
    .brief .side {
      padding: 8px 10px;
    }
    .brief .quote {
      font-size: 13.5px;
    }
    .brief .ask p {
      font-size: 15.5px;
    }
  }
  .ask-label {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .copy-mini {
    display: inline-grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    color: var(--muted);
  }
  .copy-mini:hover {
    background: var(--sunken);
    color: var(--ink-strong);
  }
  .side {
    display: grid;
    gap: 6px;
    align-content: start;
    padding: 10px 12px;
    border-radius: var(--radius-control);
    background: var(--surface-2);
    border: 1px solid var(--line);
    min-width: 0;
  }
  .label {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    letter-spacing: 0.02em;
  }
  .quote {
    font-size: 14px;
    line-height: 1.5;
    color: var(--ink-strong);
  }
  .ask p {
    font-size: 17px;
    line-height: 1.35;
    margin-top: 2px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .grow {
    flex: 1;
  }
  .compact {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    text-align: left;
    border-radius: var(--radius-action);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--ink-strong);
  }
  .compact:hover {
    border-color: var(--line-strong);
  }
  .compact .mark {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--st-context-dot);
    color: #fff;
    font-weight: 800;
    font-size: 13px;
  }
  .compact.loud .mark {
    background: var(--alert);
  }
  .compact.done .mark {
    background: var(--line-strong);
  }
  .compact-body {
    display: grid;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }
  .compact-title {
    font-size: 13px;
    font-weight: 600;
  }
  @media (prefers-reduced-motion: reduce) {
    .hero {
      animation: none;
    }
  }
</style>
