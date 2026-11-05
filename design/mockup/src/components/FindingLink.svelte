<script lang="ts">
  import { ArrowRight } from "@lucide/svelte";
  import { fmtClock, l, t } from "../lib/i18n";
  import { href } from "../lib/router.svelte";
  import { findingPath, hearing, isMeaningful, statement } from "../lib/store.svelte";
  import type { Finding } from "../lib/types";
  import Mark from "./Mark.svelte";

  /**
   * A finding mentioned outside Temuan. Findings are worked on in Temuan only, so everywhere
   * else they are a link that opens them there: `lead` tops the live hearing, `row` sits in
   * lists, `pill` hangs under a transcript line or a passage.
   */
  let { f, variant = "row", showHearing = false }: { f: Finding; variant?: "lead" | "row" | "pill"; showHearing?: boolean } = $props();

  let s = $derived(statement(f.statementId));
  let h = $derived(hearing(f.hearingId));
  let kind = $derived<"done" | "look" | "quiet">(f.reviewed ? "done" : isMeaningful(f) ? "look" : "quiet");
</script>

<a
  class="flink {variant}"
  class:loud={kind === "look" && f.status === "potential_inconsistency"}
  class:muted-tone={kind !== "look"}
  class:fresh={variant === "lead" && f.isNew}
  href={href(findingPath(f.id))}
  title={variant === "pill" ? t("fl.open") : undefined}
>
  <span class="dot" aria-hidden="true"><Mark {kind} size={variant === "lead" ? 12 : 10} /></span>
  {#if variant === "pill"}
    <span class="pill-text">{t(`status.${f.status}`)} · {l(f.title)}</span>
    <ArrowRight size={12} aria-hidden="true" />
  {:else}
    <span class="body">
      <span class="meta">
        <span>{t(`status.${f.status}`)}</span>
        {#if s}<span class="tabular">{fmtClock(s.t)}</span>{/if}
        {#if showHearing && h}<span>{t("common.hearingN", { n: h.number })}</span>{/if}
      </span>
      <span class="title" class:clamp-2={variant === "row"}>{l(f.title)}</span>
    </span>
    <span class="go">{#if variant === "lead"}<span class="go-text">{t("fl.open")}</span>{/if}<ArrowRight size={variant === "lead" ? 16 : 14} /></span>
  {/if}
</a>

<style>
  .flink {
    --tone: var(--st-context-dot);
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    color: var(--ink-strong);
    text-decoration: none;
  }
  .flink.loud {
    --tone: var(--alert);
  }
  .flink.muted-tone {
    --tone: var(--line-strong);
  }
  .dot {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--tone);
    color: #fff;
  }
  .body {
    display: grid;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0 8px;
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--muted);
  }
  .meta > span + span::before {
    content: "·";
    margin-right: 8px;
    font-weight: 400;
  }
  .go {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    color: var(--muted);
  }
  .flink:hover .go {
    color: var(--ink-strong);
  }

  /* In lists: one quiet line per finding. */
  .row {
    min-height: 48px;
    padding: 8px 10px;
    border-radius: var(--radius-control);
  }
  .row:hover {
    background: var(--sunken);
  }
  .row .title {
    font-size: 14px;
    font-weight: 500;
    line-height: 1.35;
  }

  /* Top of the live hearing: the one finding most worth a look, as a way into Temuan. */
  .lead {
    padding: 12px 16px;
    border: 1px solid color-mix(in srgb, var(--tone) 45%, var(--line));
    border-radius: var(--radius-surface);
    background: color-mix(in srgb, var(--tone) 7%, var(--surface));
  }
  .lead.fresh {
    background: color-mix(in srgb, var(--tone) 14%, var(--surface));
  }
  .lead:hover {
    border-color: var(--tone);
  }
  .lead .dot {
    width: 24px;
    height: 24px;
  }
  .lead .title {
    font-family: var(--font-serif);
    font-size: 19px;
    line-height: 1.3;
  }
  .lead .go {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--ink-strong);
  }

  /* Under a transcript line or a passage. */
  .pill {
    gap: 8px;
    max-width: 100%;
    width: fit-content;
    padding: 4px 10px 4px 4px;
    border-radius: var(--radius-pill);
    border: 1px solid color-mix(in srgb, var(--tone) 40%, var(--line));
    background: color-mix(in srgb, var(--tone) 14%, var(--surface));
    font-size: 12.5px;
    font-weight: 600;
  }
  .pill.muted-tone {
    background: var(--surface);
    font-weight: 500;
    color: var(--muted);
  }
  .pill:hover {
    border-color: var(--tone);
  }
  .pill-text {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 560px) {
    .lead {
      padding: 10px 12px;
    }
    .lead .title {
      font-size: 17px;
    }
    .go-text {
      display: none;
    }
  }
</style>
