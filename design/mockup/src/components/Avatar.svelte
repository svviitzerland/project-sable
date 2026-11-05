<script lang="ts">
  import Mark from "./Mark.svelte";
  import { roleTone } from "../lib/people";
  import { speaker, speakerName } from "../lib/store.svelte";

  /**
   * A talking-head silhouette in the role's colour. Sound waves come from the mouth only while
   * the person is speaking; a voice nobody has named yet is drawn as a dashed outline.
   * Decorative: names are always written beside it. `still` shows the waves without motion.
   */
  let {
    id,
    size = "md",
    speaking = false,
    still = false,
    dim = false,
    badge = false,
  }: {
    id: string;
    size?: "xxs" | "xs" | "sm" | "md" | "lg" | "xl";
    speaking?: boolean;
    still?: boolean;
    dim?: boolean;
    badge?: boolean;
  } = $props();

  let sp = $derived(speaker(id));
  let tone = $derived(roleTone(sp?.role));
  let unknown = $derived(tone === "unknown" && !sp?.confirmed);
</script>

<span
  class="avatar {size}"
  data-tone={tone}
  class:speaking
  class:still
  class:dim
  class:unknown
  title={speakerName(sp)}
  aria-hidden="true"
>
  <span class="disc">
    <svg viewBox="0 0 48 48">
      <g transform="translate(1.6 2.4) scale(0.93)">
        <path
          class="head"
          d="M2 52 C2 44 7 40.5 13 38.5 C14.5 36 13.5 33.5 12 31 C9.5 27 9 21 11 16.5 C13.5 10.5 19 7.5 24.5 8 C29.5 8.5 32 12.5 32 17.5 C32 19 32.6 20.2 33.6 21.8 C34.2 22.8 33.8 23.6 32.6 23.9 C32.2 24.6 32.4 25.3 32.6 26 C32.4 26.6 31.8 26.9 31.6 27.2 C32 27.8 32 28.5 31.6 29 C31.4 30.6 30.6 31.8 28.6 32.2 C27.4 32.4 26.6 33 26.4 34.4 L26.4 37.6 C32 38.6 39 40.5 41 52 Z"
        />
        {#if size !== "xs" && size !== "xxs"}
          <path class="wave w1" d="M36.6 23.2 A4.8 4.8 0 0 1 36.6 29.6" />
          <path class="wave w2" d="M39.6 20.6 A8.4 8.4 0 0 1 39.6 32.2" />
          {#if size !== "sm"}<path class="wave w3" d="M42.4 18 A12 12 0 0 1 42.4 34.8" />{/if}
        {/if}
      </g>
    </svg>
  </span>
  {#if badge}<span class="quest"><Mark size={11} /></span>{/if}
</span>

<style>
  .avatar {
    --s: 44px;
    position: relative;
    display: inline-grid;
    flex-shrink: 0;
    width: var(--s);
    height: var(--s);
    border-radius: 50%;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--tone) 32%, transparent);
    transition:
      opacity 0.2s ease,
      filter 0.2s ease,
      box-shadow 0.2s ease;
  }
  .xxs { --s: 18px; }
  .xs { --s: 22px; }
  .sm { --s: 30px; }
  .md { --s: 44px; }
  .lg { --s: 58px; }
  .xl { --s: 72px; }
  .disc {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
    background: var(--tone-soft);
  }
  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  .head {
    fill: var(--tone);
  }
  .wave {
    fill: none;
    stroke: var(--tone);
    stroke-width: 2.3;
    stroke-linecap: round;
    opacity: 0;
  }
  /* Talking: the waves leave the mouth one after another. */
  .speaking {
    box-shadow: 0 0 0 2px var(--tone);
  }
  .speaking .wave {
    animation: talk 1.2s ease-out infinite;
  }
  .speaking .w2 {
    animation-delay: 0.16s;
  }
  .speaking .w3 {
    animation-delay: 0.32s;
  }
  .still .wave {
    animation: none;
    opacity: 1;
  }
  @keyframes talk {
    0%,
    100% {
      opacity: 0.12;
    }
    30% {
      opacity: 1;
    }
  }
  /* Not named yet: an outline of a person, nothing filled in. */
  .unknown {
    box-shadow: none;
    border: 1.5px dashed var(--tone);
  }
  .unknown .disc {
    background: transparent;
  }
  .unknown .head {
    fill: color-mix(in srgb, var(--tone) 14%, transparent);
    stroke: var(--tone);
    stroke-width: 1.6;
    stroke-dasharray: 2.6 2.2;
  }
  .dim {
    opacity: 0.5;
    filter: saturate(0.6);
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
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.2);
    animation: bob 1.4s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .speaking .wave {
      animation: none;
      opacity: 1;
    }
    .quest {
      animation: none;
    }
  }
</style>
