<script lang="ts">
  import { Briefcase, CircleHelp, Gavel, Shield, User, UserRound } from "@lucide/svelte";
  import { initials, roleTone } from "../lib/people";
  import { speaker, speakerName } from "../lib/store.svelte";

  /**
   * A game-style portrait: initials on the role color, a small role emblem, and a voice ring
   * with sound bars while the person speaks. Decorative; names are always written beside it.
   */
  let {
    id,
    size = "md",
    speaking = false,
    dim = false,
    badge = false,
  }: { id: string; size?: "xs" | "sm" | "md" | "lg" | "xl"; speaking?: boolean; dim?: boolean; badge?: boolean } = $props();

  let sp = $derived(speaker(id));
  let tone = $derived(roleTone(sp?.role));
  const icons = { judge: Gavel, prosecutor: Briefcase, defense: Shield, witness: UserRound, defendant: User, unknown: CircleHelp };
  let Icon = $derived(icons[tone as keyof typeof icons] ?? CircleHelp);
  const iconSize = { xs: 0, sm: 9, md: 11, lg: 13, xl: 15 };
</script>

<span class="avatar {size}" data-tone={tone} class:speaking class:dim class:unknown={tone === "unknown"} title={speakerName(sp)} aria-hidden="true">
  <span class="face">{initials(sp)}</span>
  {#if size !== "xs"}<span class="emblem"><Icon size={iconSize[size]} strokeWidth={2.2} /></span>{/if}
  {#if speaking && size !== "xs"}<span class="eq"><i></i><i></i><i></i></span>{/if}
  {#if badge}<span class="quest">!</span>{/if}
</span>

<style>
  .avatar {
    --s: 44px;
    position: relative;
    display: inline-grid;
    place-items: center;
    flex-shrink: 0;
    width: var(--s);
    height: var(--s);
    border-radius: 50%;
    background: var(--tone-soft);
    color: var(--tone);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--tone) 35%, transparent);
    transition: transform 0.25s ease, opacity 0.25s ease, filter 0.25s ease, box-shadow 0.25s ease;
  }
  .xs { --s: 22px; }
  .sm { --s: 30px; }
  .md { --s: 44px; }
  .lg { --s: 58px; }
  .xl { --s: 72px; }
  .face {
    font-family: var(--font-ui);
    font-weight: 700;
    font-size: calc(var(--s) * 0.36);
    letter-spacing: 0.02em;
    line-height: 1;
  }
  .xs .face {
    font-size: 9px;
  }
  .emblem {
    position: absolute;
    right: -2px;
    bottom: -2px;
    display: grid;
    place-items: center;
    width: calc(var(--s) * 0.42);
    height: calc(var(--s) * 0.42);
    min-width: 15px;
    min-height: 15px;
    border-radius: 50%;
    background: var(--tone);
    color: var(--surface);
    border: 2px solid var(--surface);
  }
  .unknown {
    background: transparent;
    box-shadow: none;
    border: 2px dashed var(--tone);
  }
  .speaking {
    transform: scale(1.08);
    animation: voice-ring 1.15s ease-out infinite;
  }
  .dim {
    opacity: 0.5;
    filter: saturate(0.6);
  }
  .eq {
    position: absolute;
    left: 50%;
    top: -14px;
    transform: translateX(-50%);
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 10px;
  }
  .eq i {
    display: block;
    width: 3px;
    height: 100%;
    border-radius: 2px;
    background: var(--tone);
    transform-origin: bottom;
    animation: eq 0.7s ease-in-out infinite;
  }
  .eq i:nth-child(2) {
    animation-delay: -0.25s;
    animation-duration: 0.55s;
  }
  .eq i:nth-child(3) {
    animation-delay: -0.45s;
    animation-duration: 0.8s;
  }
  .quest {
    position: absolute;
    left: 50%;
    top: -20px;
    transform: translateX(-50%);
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--alert);
    color: #fff;
    font-size: 12px;
    font-weight: 800;
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.2);
    animation: bob 1.4s ease-in-out infinite;
  }
  .speaking .quest {
    top: -30px;
  }
  @media (prefers-reduced-motion: reduce) {
    .speaking {
      animation: none;
      box-shadow: 0 0 0 3px var(--tone);
    }
    .eq i,
    .quest {
      animation: none;
    }
  }
</style>
