<script lang="ts">
  import Mark from "./Mark.svelte";
  import { fmtClock, t } from "../lib/i18n";
  import { roleTone } from "../lib/people";
  import { speaker, speakerName, ui } from "../lib/store.svelte";
  import Avatar from "./Avatar.svelte";
  import Quote from "./Quote.svelte";

  /**
   * The current line, framed like a dialogue box in a story game: portrait, name plate, words.
   * A voice nobody has named yet asks who it is, right where it speaks.
   */
  let {
    speakerId,
    text,
    partial = false,
    speaking = false,
    time,
    mark = "",
    compact = false,
    portrait = "xl",
    alert = false,
    onalert,
  }: {
    speakerId: string;
    text: string;
    partial?: boolean;
    speaking?: boolean;
    time?: number;
    mark?: string;
    compact?: boolean;
    portrait?: "md" | "lg" | "xl";
    alert?: boolean;
    onalert?: () => void;
  } = $props();

  let sp = $derived(speaker(speakerId));
  let unknown = $derived(!!sp && sp.role === "unknown" && !sp.confirmed);
</script>

<div class="dialogue" class:compact class:alert data-tone={roleTone(sp?.role)}>
  <Avatar id={speakerId} size={compact ? "md" : portrait} {speaking} />
  <div class="body">
    <div class="plate">
      <span class="name">{speakerName(sp)}</span>
      {#if sp && sp.role !== "unknown"}<span class="role">{t(`role.${sp.role}`)}</span>{/if}
      {#if unknown && sp}<button class="who" onclick={() => (ui.modal = { kind: "rename", speakerId: sp.id })}>{t("stage.whoIs")}</button>{/if}
      {#if partial}<span class="listening">{t("live.listeningShort")}</span>{/if}
      {#if time !== undefined && !partial}<span class="time tabular">{fmtClock(time)}</span>{/if}
    </div>
    <p class="line" class:partial>
      {#if text}<Quote {text} {mark} />{/if}{#if partial}<span class="caret" aria-hidden="true"></span>{/if}
    </p>
  </div>
  {#if alert && onalert}
    <button class="flag" onclick={onalert} aria-label={t("attn.title")}><Mark size={14} /></button>
  {/if}
</div>

<style>
  .dialogue {
    position: relative;
    display: flex;
    gap: 18px;
    align-items: flex-start;
    padding: 18px 20px 20px;
    border-radius: var(--radius-surface);
    background: var(--surface);
    border: 1px solid color-mix(in srgb, var(--tone) 28%, var(--line));
    min-height: 120px;
  }
  .compact {
    gap: 12px;
    padding: 12px 14px;
    min-height: 0;
  }
  .alert {
    border-color: color-mix(in srgb, var(--alert) 50%, var(--line));
  }
  .body {
    display: grid;
    gap: 6px;
    min-width: 0;
    flex: 1;
  }
  .plate {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
  }
  .name {
    font-weight: 700;
    font-size: 14px;
    color: var(--tone);
  }
  .role,
  .time {
    font-size: 12px;
    color: var(--muted);
  }
  .who {
    padding: 2px 10px;
    border-radius: var(--radius-pill);
    border: 1px dashed var(--tone);
    color: var(--tone);
    font-size: 12px;
    font-weight: 700;
  }
  .who:hover {
    background: var(--tone-soft);
  }
  .listening {
    font-size: 12px;
    font-weight: 600;
    color: var(--live);
  }
  .line {
    font-size: calc(var(--live-size, 16px) * 1.3);
    line-height: 1.45;
    color: var(--ink-strong);
    font-weight: 500;
  }
  .compact .line {
    font-size: 15px;
  }
  .line.partial {
    color: color-mix(in srgb, var(--ink-strong) 70%, transparent);
  }
  .caret {
    display: inline-block;
    width: 2px;
    height: 1em;
    margin-left: 3px;
    background: var(--tone);
    vertical-align: -3px;
    animation: blink 1s steps(2) infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
  .flag {
    position: absolute;
    top: -12px;
    right: 14px;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--alert);
    color: #fff;
    font-weight: 800;
    box-shadow: 0 4px 12px color-mix(in srgb, var(--alert) 40%, transparent);
  }
</style>
