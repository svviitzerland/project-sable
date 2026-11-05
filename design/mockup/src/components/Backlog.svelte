<script lang="ts">
  import { Bookmark, Play, Scale } from "@lucide/svelte";
  import { fmtClock, t } from "../lib/i18n";
  import { roleTone } from "../lib/people";
  import { prefs } from "../lib/prefs.svelte";
  import { findingForStatement, inspect, isMeaningful, isShown, legalRef, speaker, speakerName } from "../lib/store.svelte";
  import type { Statement } from "../lib/types";
  import Avatar from "./Avatar.svelte";
  import FindingLink from "./FindingLink.svelte";
  import Quote from "./Quote.svelte";

  /**
   * The transcript as a story log: portrait, name, line. A line with a finding carries a link to
   * it; the finding itself is worked on in Temuan.
   */
  let {
    statements,
    currentId = null,
    highlightId = null,
    query = "",
    compact = false,
    showTime = true,
    onplay,
  }: {
    statements: Statement[];
    currentId?: string | null;
    highlightId?: string | null;
    query?: string;
    compact?: boolean;
    showTime?: boolean;
    onplay?: (seconds: number) => void;
  } = $props();
</script>

<ol class="log" class:compact>
  {#each statements as s, i (s.id)}
    {@const sp = speaker(s.speakerId)}
    {@const f = findingForStatement(s.id)}
    {@const shown = f && isShown(f) ? f : undefined}
    {@const sameAsPrev = i > 0 && speaker(statements[i - 1].speakerId)?.id === sp?.id}
    <li
      class="row"
      data-sid={s.id}
      data-tone={roleTone(sp?.role)}
      class:current={currentId === s.id}
      class:highlight={highlightId === s.id}
      class:attention={shown && isMeaningful(shown) && !shown.reviewed}
      class:continued={sameAsPrev && !compact}
    >
      <span class="who">{#if !sameAsPrev || compact}<Avatar id={s.speakerId} size={compact ? "xs" : "sm"} />{/if}</span>
      <div class="body">
        {#if !sameAsPrev || compact}
          <div class="meta">
            <span class="name">{speakerName(sp)}</span>
            {#if showTime}
              {#if onplay}
                <button class="time tabular" onclick={() => onplay(s.t)} aria-label={t("hv.playFrom", { time: fmtClock(s.t) })}><Play size={10} />{fmtClock(s.t)}</button>
              {:else}
                <span class="time tabular">{fmtClock(s.t)}</span>
              {/if}
            {/if}
            {#if s.flagged}<Bookmark size={12} class="flag" aria-label={t("live.flagged")} />{/if}
          </div>
        {/if}
        <p class="text">
          <Quote text={s.text} mark={shown?.said ?? (query || "")} />
          {#each s.legal ?? [] as lid (lid)}
            {@const ref = legalRef(lid)}
            {#if ref && prefs.pasal}<button class="law" onclick={() => inspect({ kind: "legal", id: lid })}><Scale size={11} />{ref.article}</button>{/if}
          {/each}
        </p>
        {#if shown}<FindingLink f={shown} variant="pill" />{/if}
      </div>
    </li>
  {/each}
</ol>

<style>
  .log {
    display: grid;
  }
  .row {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 10px;
    padding: 8px 12px 8px 10px;
    border-radius: var(--radius-control);
  }
  .row.continued {
    padding-top: 0;
  }
  .compact .row {
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 8px;
    padding: 5px 8px;
  }
  .row.current {
    background: color-mix(in srgb, var(--tone-soft) 60%, transparent);
  }
  .row.highlight {
    background: var(--selected);
  }
  .row.attention {
    background: color-mix(in srgb, var(--alert-soft) 35%, transparent);
  }
  .who {
    padding-top: 2px;
  }
  .body {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .name {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--tone);
  }
  .compact .name {
    font-size: 11.5px;
  }
  .time {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    color: var(--muted);
    border-radius: 3px;
    padding: 0 3px;
  }
  button.time:hover {
    background: var(--sunken);
    color: var(--ink-strong);
  }
  .meta :global(.flag) {
    color: var(--focus);
  }
  .text {
    color: var(--ink-strong);
    line-height: 1.5;
    font-size: calc(var(--live-size, 14px) * 0.95);
  }
  .compact .text {
    font-size: 13px;
    color: var(--ink);
  }
  .law {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    margin-left: 6px;
    padding: 0 6px;
    border-radius: 4px;
    background: var(--sand);
    color: var(--sand-ink);
    font-size: 11.5px;
    font-weight: 600;
    vertical-align: 1px;
  }
</style>
