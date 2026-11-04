<script lang="ts">
  import Mark from "./Mark.svelte";
  import { fmtClock, l, t } from "../lib/i18n";
  import { roleTone, roleOrder, shortName } from "../lib/people";
  import { speaker, speakerName, statement, statementsOf } from "../lib/store.svelte";
  import type { Finding } from "../lib/types";
  import Avatar from "./Avatar.svelte";

  /**
   * "Who spoke when", like a match replay: one lane per person with their turns as colored
   * blocks, a playhead, and a marker only where a finding is worth a look.
   */
  let {
    hearingId,
    duration,
    time,
    markers,
    single = false,
    onseek,
    onmarker,
  }: {
    hearingId: string;
    duration: number;
    time: number;
    markers: Finding[];
    single?: boolean;
    onseek: (seconds: number) => void;
    onmarker: (f: Finding) => void;
  } = $props();

  let statements = $derived(statementsOf(hearingId));
  // A turn lasts until the next one starts, or roughly as long as its words take to say.
  let turns = $derived(
    statements.map((s, i) => {
      const next = statements[i + 1]?.t ?? duration;
      const end = Math.min(next, s.t + Math.max(5, s.text.length / 11));
      return { s, start: s.t, end, sp: speaker(s.speakerId) };
    }),
  );
  let lanes = $derived.by(() => {
    const ids: string[] = [];
    for (const turn of turns) if (turn.sp && !ids.includes(turn.sp.id)) ids.push(turn.sp.id);
    return ids
      .map((id) => speaker(id)!)
      .sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role))
      .map((sp) => {
        const own = turns.filter((x) => x.sp?.id === sp.id);
        const talk = own.reduce((n, x) => n + (x.end - x.start), 0);
        return { sp, turns: own, talk };
      });
  });
  let totalTalk = $derived(lanes.reduce((n, lane) => n + lane.talk, 0) || 1);
  let pct = (seconds: number) => `${Math.min(100, (seconds / duration) * 100)}%`;
  let active = $derived(turns.find((x) => time >= x.start && time < x.end));

  function seekFrom(event: MouseEvent) {
    const el = event.currentTarget as HTMLElement;
    const box = el.getBoundingClientRect();
    onseek(Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)) * duration);
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key === "ArrowRight") onseek(Math.min(duration, time + 10));
    else if (event.key === "ArrowLeft") onseek(Math.max(0, time - 10));
    else return;
    event.preventDefault();
  }
</script>

<div
  class="timeline"
  class:single
  role="slider"
  tabindex="0"
  aria-label={t("rv.timeline")}
  aria-valuemin={0}
  aria-valuemax={Math.round(duration)}
  aria-valuenow={Math.round(time)}
  aria-valuetext={fmtClock(time)}
  {onkeydown}
>
  <div class="pins">
    <span class="pin-gutter"></span>
    <div class="pin-track">
      {#each markers as f (f.id)}
        {@const s = statement(f.statementId)}
        {#if s}
          <button
            class="pin"
            class:loud={f.status === "potential_inconsistency"}
            class:done={f.reviewed}
            style:left={pct(s.t)}
            title={`${fmtClock(s.t)} · ${l(f.title)}`}
            aria-label={`${t(`status.${f.status}`)} · ${fmtClock(s.t)}`}
            onclick={() => onmarker(f)}><span class="pin-mark"><Mark kind={f.reviewed ? "done" : "look"} size={10} /></span></button
          >
        {/if}
      {/each}
    </div>
  </div>

  {#if single}
    <div class="lane">
      <span class="gutter"></span>
      <div class="track" role="presentation" onclick={seekFrom}>
        {#each turns as turn (turn.s.id)}
          <span class="turn" class:on={active?.s.id === turn.s.id} data-tone={roleTone(turn.sp?.role)} style:left={pct(turn.start)} style:width={pct(turn.end - turn.start)}></span>
        {/each}
        <span class="head" style:left={pct(time)}></span>
      </div>
    </div>
  {:else}
    {#each lanes as lane (lane.sp.id)}
      <div class="lane" data-tone={roleTone(lane.sp.role)} class:speaking={active?.sp?.id === lane.sp.id}>
        <span class="gutter" title={speakerName(lane.sp)}>
          <Avatar id={lane.sp.id} size="xs" />
          <span class="lane-name">{shortName(lane.sp)}</span>
          <span class="lane-pct tabular">{Math.round((lane.talk / totalTalk) * 100)}%</span>
        </span>
        <div class="track" role="presentation" onclick={seekFrom}>
          {#each lane.turns as turn (turn.s.id)}
            <span class="turn" class:on={active?.s.id === turn.s.id} style:left={pct(turn.start)} style:width={pct(turn.end - turn.start)}></span>
          {/each}
          <span class="head" style:left={pct(time)}></span>
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .timeline {
    display: grid;
    gap: 3px;
    min-width: 0;
    flex: 1 1 100%;
    border-radius: var(--radius-control);
  }
  .pins,
  .lane {
    display: grid;
    grid-template-columns: 138px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
  }
  .single .pins,
  .single .lane {
    grid-template-columns: 0 minmax(0, 1fr);
    gap: 0;
  }
  .pin-track {
    position: relative;
    height: 20px;
  }
  .pin {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50% 50% 50% 0;
    rotate: -45deg;
    background: var(--st-context-dot);
    color: #fff;
    font-size: 10px;
    font-weight: 800;
  }
  .pin-mark {
    rotate: 45deg;
  }
  .pin.loud {
    background: var(--alert);
  }
  .pin.done {
    background: var(--line-strong);
  }
  .pin:hover,
  .pin:focus-visible {
    box-shadow: 0 0 0 2px var(--ink-strong);
  }
  .gutter {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .lane-name {
    flex: 1;
    min-width: 0;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .speaking .lane-name {
    color: var(--tone);
  }
  .lane-pct {
    font-size: 10.5px;
    color: var(--muted);
  }
  .track {
    position: relative;
    height: 14px;
    border-radius: 4px;
    background: var(--sunken);
    cursor: pointer;
  }
  .single .track {
    height: 22px;
  }
  .turn {
    position: absolute;
    top: 2px;
    bottom: 2px;
    min-width: 2px;
    border-radius: 2px;
    background: color-mix(in srgb, var(--tone) 55%, transparent);
  }
  .turn.on {
    top: 0;
    bottom: 0;
    background: var(--tone);
  }
  .head {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 2px;
    margin-left: -1px;
    background: var(--ink-strong);
    pointer-events: none;
  }
  @container main (max-width: 560px) {
    .pins,
    .lane {
      grid-template-columns: 34px minmax(0, 1fr);
    }
    .lane-name,
    .lane-pct {
      display: none;
    }
  }
</style>
