<script lang="ts">
  import { ArrowRight, Pause, Play } from "@lucide/svelte";
  import { fmtClock, l, t } from "../lib/i18n";
  import { live, pause, resume } from "../lib/live.svelte";
  import { go, href } from "../lib/router.svelte";
  import { findingsOf, findingsPath, hearing, needsLook, speaker, statementsOf } from "../lib/store.svelte";
  import Avatar from "./Avatar.svelte";
  import Mark from "./Mark.svelte";

  let { phone }: { phone: boolean } = $props();

  let h = $derived(hearing(live.hearingId));
  let latest = $derived(h ? statementsOf(h.id).at(-1) : undefined);
  let activeId = $derived(speaker(live.partial ? live.partialSpeaker : (latest?.speakerId ?? ""))?.id ?? "");
  let attention = $derived(h ? findingsOf(h.id).filter(needsLook).length : 0);
</script>

<!-- A persistent "now playing" bar: the hearing keeps recording while the lawyer checks other screens. -->
{#if h}
  <div class="livebar" class:phone role="region" aria-label={t("live.mini")}>
    <button class="main" onclick={() => go(`/case/${h.caseId}/hearings/${h.id}`)}>
      <span class="state">
        {#if live.status === "recording"}<span class="live-dot"></span>{:else}<span class="paused-dot"></span>{/if}
        <span class="badge-text">{live.status === "paused" ? t("live.paused") : t("live.badge")}</span>
        <span class="tabular clock">{fmtClock(live.elapsed)}</span>
      </span>
      {#if activeId}<Avatar id={activeId} size="sm" speaking={!!live.partial && live.status === "recording"} />{/if}
      <span class="what">
        <span class="title">{t("common.hearingN", { n: h.number })} · {l(h.title)}</span>
        {#if !phone}
          <span class="snippet" aria-hidden="true">{live.partial || latest?.text || ""}</span>
        {/if}
      </span>
      <span class="go">{#if !phone}{t("hearings.returnLive")}{/if}<ArrowRight size={16} /></span>
    </button>
    {#if attention}
      <a class="badge badge-amber attn" href={href(findingsPath(h.caseId, { hearing: h.id }))} title={t("fl.all")}><Mark size={10} />{t("attn.count", { n: attention })}</a>
    {/if}
    <button
      class="btn btn-ghost btn-icon pause"
      aria-label={live.status === "paused" ? t("live.resume") : t("live.pause")}
      onclick={() => (live.status === "paused" ? resume() : pause())}
    >
      {#if live.status === "paused"}<Play size={16} />{:else}<Pause size={16} />{/if}
    </button>
  </div>
{/if}

<style>
  .livebar {
    position: sticky;
    top: var(--topbar-h);
    z-index: 14;
    display: flex;
    align-items: center;
    gap: 4px;
    margin: 0;
    padding: 4px clamp(8px, 2vw, 20px);
    background: var(--live-soft);
    border-bottom: 1px solid color-mix(in srgb, var(--live) 30%, var(--line));
  }
  .livebar.phone {
    position: fixed;
    top: auto;
    left: 8px;
    right: 8px;
    bottom: calc(var(--bottomnav-h) + var(--safe-bottom) + 8px);
    border: 1px solid color-mix(in srgb, var(--live) 30%, var(--line));
    border-radius: 12px;
    box-shadow: var(--shadow-float);
    padding: 4px 6px;
  }
  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 40px;
    padding: 0 6px;
    text-align: left;
    border-radius: var(--radius-control);
  }
  .main:hover .go {
    text-decoration: underline;
  }
  .state {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;
    color: var(--live);
    white-space: nowrap;
  }
  .paused-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: var(--muted);
  }
  .clock {
    color: var(--ink-strong);
    font-weight: 600;
  }
  .what {
    display: grid;
    min-width: 0;
    flex: 1;
    line-height: 1.3;
  }
  .title {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-strong);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .snippet {
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .attn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    text-decoration: none;
  }
  .go {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-strong);
    white-space: nowrap;
  }
  .phone .badge-text {
    display: none;
  }
</style>
