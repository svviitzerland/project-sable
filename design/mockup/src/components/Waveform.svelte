<script lang="ts">
  import { fmtClock, l, t } from "../lib/i18n";
  import type { Finding, Statement } from "../lib/types";

  let {
    duration,
    time,
    markers,
    statementOf,
    onseek,
    onmarker,
  }: {
    duration: number;
    time: number;
    markers: Finding[];
    statementOf: (f: Finding) => Statement | undefined;
    onseek: (seconds: number) => void;
    onmarker: (f: Finding) => void;
  } = $props();

  let track: HTMLElement | undefined = $state();
  let trackWidth = $state(400);
  // Deterministic pseudo-waveform (speech-like bursts); the bar count follows the available width.
  let BARS = $derived(Math.max(30, Math.min(160, Math.floor(trackWidth / 4))));
  let heights = $derived(
    Array.from({ length: BARS }, (_, i) => {
      const x = (i / BARS) * 140;
      const a = Math.sin(x * 0.47) * 0.5 + Math.sin(x * 1.31 + 1) * 0.3 + Math.sin(x * 0.11) * 0.2;
      return 0.25 + Math.abs(a) * 0.75;
    }),
  );
  let progress = $derived(duration ? Math.min(1, time / duration) : 0);

  function seekFrom(event: PointerEvent) {
    if (!track) return;
    const box = track.getBoundingClientRect();
    onseek(Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)) * duration);
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key === "ArrowRight") onseek(Math.min(duration, time + 10));
    else if (event.key === "ArrowLeft") onseek(Math.max(0, time - 10));
    else return;
    event.preventDefault();
  }
</script>

<div class="wave">
  <div class="markers" aria-label={t("hv.timeline")}>
    {#each markers as f (f.id)}
      {@const s = statementOf(f)}
      {#if s}
        <button
          class="marker"
          data-status={f.status}
          class:done={f.reviewed}
          style:left="{(s.t / duration) * 100}%"
          title={`${fmtClock(s.t)} · ${l(f.title)}`}
          aria-label={`${t(`status.${f.status}`)} · ${fmtClock(s.t)}`}
          onclick={() => onmarker(f)}
        ></button>
      {/if}
    {/each}
  </div>
  <div
    class="track"
    bind:this={track}
    bind:clientWidth={trackWidth}
    role="slider"
    tabindex="0"
    aria-label={t("hv.timeline")}
    aria-valuemin={0}
    aria-valuemax={Math.round(duration)}
    aria-valuenow={Math.round(time)}
    aria-valuetext={fmtClock(time)}
    onpointerdown={seekFrom}
    {onkeydown}
  >
    {#each heights as hgt, i (i)}
      <span class="bar" class:played={i / BARS < progress} style:height="{hgt * 100}%"></span>
    {/each}
    <span class="head" style:left="{progress * 100}%"></span>
  </div>
</div>

<style>
  .wave {
    display: grid;
    gap: 2px;
    min-width: 0;
    flex: 1;
    overflow: hidden;
  }
  .markers {
    position: relative;
    height: 12px;
  }
  .marker {
    position: absolute;
    top: 1px;
    width: 10px;
    height: 10px;
    margin-left: -5px;
    border-radius: 50%;
    border: 2px solid var(--surface);
    box-shadow: 0 0 0 1px var(--line-strong);
  }
  .marker[data-status="potential_inconsistency"] { background: var(--st-inconsistency-dot); border-radius: 2px; transform: rotate(45deg); }
  .marker[data-status="supported"] { background: var(--st-supported-dot); }
  .marker[data-status="context_needed"] { background: var(--st-context-dot); }
  .marker[data-status="insufficient_evidence"] { background: var(--st-insufficient-dot); }
  .marker.done {
    opacity: 0.45;
  }
  .marker:hover,
  .marker:focus-visible {
    box-shadow: 0 0 0 2px var(--ink-strong);
    opacity: 1;
  }
  .track {
    position: relative;
    display: flex;
    align-items: center;
    gap: 2px;
    height: 34px;
    cursor: pointer;
    touch-action: none;
  }
  .bar {
    flex: 1;
    min-width: 1px;
    border-radius: 1px;
    background: var(--line-strong);
  }
  .bar.played {
    background: var(--ink-strong);
  }
  .head {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 2px;
    margin-left: -1px;
    background: var(--live);
  }
</style>
