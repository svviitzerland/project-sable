<script lang="ts">
  import { t } from "../lib/i18n/index.svelte";
  import { onMount } from "svelte";

  let {
    variant = "reader",
    label = t("common.loadingContent"),
    count = 3,
    inverse = false,
  }: {
    variant?:
      | "workspace"
      | "case"
      | "graph"
      | "conversation"
      | "reader"
      | "rows"
      | "form"
      | "compact";
    label?: string;
    count?: number;
    inverse?: boolean;
  } = $props();
  let root: HTMLDivElement;
  let animate = $state(true);

  onMount(() => {
    let visible = true;
    const sync = () => {
      animate = visible && !document.hidden;
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(root);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  });
</script>

{#snippet lines()}
  <span class="bone line wide"></span>
  <span class="bone line"></span>
  <span class="bone line short"></span>
{/snippet}
{#snippet rows(n: number)}
  {#each Array(n).keys() as i (i)}
    <div class="row">
      <span class="bone icon"></span>
      <div class="copy">
        <span class="bone line wide"></span><span class="bone line short"
        ></span>
      </div>
    </div>
  {/each}
{/snippet}
{#snippet record()}
  <div class="record-header">
    <span class="bone title"></span><span class="bone line short"></span><span
      class="bone line wide"
    ></span>
  </div>
  <div class="tabs">
    {#each Array(5).keys() as i (i)}<span class="bone tab"></span>{/each}
  </div>
  <div class="panes">
    <div>{@render rows(4)}</div>
    <div class="reading">
      <span class="bone heading"></span>{@render lines()}
      <div class="gap"></div>
      {@render lines()}
    </div>
  </div>
{/snippet}

<div
  bind:this={root}
  class="skeleton"
  class:inverse
  class:paused={!animate}
  class:workspace={variant === "workspace"}
  class:record={variant === "case"}
  data-skeleton={variant}
  role="status"
  aria-label={label}
  aria-busy="true"
>
  <span class="sr-only">{label}</span>
  <div class="shapes" aria-hidden="true">
    {#if variant === "workspace"}
      <!-- Mirrors the collapsed rail exactly so the real shell replaces it in place. -->
      <div class="rail">
        <span class="brand">j.</span>
        <span class="bone dot"></span>
        <span class="bone dot"></span>
      </div>
      <div class="workspace-main">
        {@render record()}
      </div>
    {:else if variant === "case"}
      {@render record()}
    {:else if variant === "graph"}
      <div class="tabs">
        <span class="bone tab"></span><span class="bone tab"></span>
      </div>
      <div class="graph-layout">
        <div class="map">
          <svg viewBox="0 0 600 300" preserveAspectRatio="none"
            ><path
              d="M100 70 L300 150 L500 65 M300 150 L120 245 M300 150 L480 240"
            /></svg
          >
          {#each [[8, 12], [39, 40], [71, 10], [12, 74], [68, 73]] as position, i (i)}<div
              class="node"
              style={`left:${position[0]}%;top:${position[1]}%`}
            >
              <span class="bone line"></span><span class="bone line short"
              ></span>
            </div>{/each}
        </div>
        <div class="reading">
          <span class="bone heading"></span>{@render lines()}
          <div class="gap"></div>
          {@render lines()}
        </div>
      </div>
    {:else if variant === "conversation"}
      <div class="reading">
        <span class="bone heading"></span><span class="bone line short"></span>
      </div>
      <div class="messages">
        {#each Array(count).keys() as i (i)}<div class:outgoing={i % 2 === 0}>
            <span class="bone line short"></span>{@render lines()}
          </div>{/each}
      </div>
      <div class="composer bone"></div>
    {:else if variant === "rows"}
      {@render rows(count)}
    {:else if variant === "form"}
      <div class="reading">
        <span class="bone heading"></span>{@render lines()}
      </div>
      <div class="fields">
        {#each Array(4).keys() as i (i)}<div>
            <span class="bone line short"></span><span class="bone field"
            ></span>
          </div>{/each}
      </div>
    {:else}
      <div
        class:reading={variant !== "compact"}
        class:compact={variant === "compact"}
      >
        {#if variant !== "compact"}<span class="bone heading"></span>{/if}
        {@render lines()}
        {#if variant === "reader"}<div class="gap"></div>
          {@render lines()}{/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .skeleton {
    --skeleton-fill: #dfe4da;
    --skeleton-rule: #e2e5dc;
    width: 100%;
    min-width: 0;
    color: #173a2c;
  }
  .inverse {
    --skeleton-fill: #587564;
    --skeleton-rule: #43614f;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .shapes {
    animation: breathe 1.8s ease-in-out infinite;
  }
  .paused .shapes {
    animation-play-state: paused;
  }
  .bone {
    display: block;
    border-radius: 4px;
    background: var(--skeleton-fill);
  }
  .line {
    height: 10px;
    width: 94%;
    margin-block: 11px;
  }
  .wide {
    width: 82%;
  }
  .short {
    width: 48%;
  }
  .title {
    width: min(460px, 78%);
    height: 34px;
    margin-bottom: 22px;
  }
  .heading {
    width: 60%;
    height: 20px;
    margin-bottom: 22px;
  }
  .icon {
    width: 26px;
    height: 32px;
    flex: 0 0 auto;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px 12px;
    border-bottom: 1px solid var(--skeleton-rule);
  }
  .copy {
    flex: 1;
    min-width: 0;
  }
  .copy .line {
    margin-block: 8px;
  }
  .reading {
    padding: 24px;
    min-width: 0;
  }
  .compact {
    padding: 12px 0;
    max-width: 640px;
  }
  .gap {
    height: 22px;
  }
  .record-header {
    padding: 30px 0 20px;
  }
  .record {
    padding-inline: 30px;
  }
  .tabs {
    display: flex;
    gap: 16px;
    padding: 16px 0;
    overflow: hidden;
    border-bottom: 1px solid var(--skeleton-rule);
  }
  .tab {
    width: 100px;
    height: 28px;
    flex-shrink: 0;
  }
  .panes,
  .graph-layout {
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    min-height: 320px;
    background: var(--surface, #fcfbf7);
  }
  .graph-layout {
    grid-template-columns: 1.7fr 1fr;
  }
  .map {
    position: relative;
    min-height: 320px;
    overflow: hidden;
  }
  .map svg {
    position: absolute;
    width: 100%;
    height: 100%;
    fill: none;
    stroke: var(--skeleton-rule);
    stroke-width: 2;
  }
  .node {
    position: absolute;
    width: 23%;
    padding: 8px;
    background: var(--surface, #fcfbf7);
    border: 1px solid var(--skeleton-rule);
    border-radius: 5px;
  }
  .node .line {
    margin-block: 6px;
    height: 8px;
  }
  .messages {
    padding: 8px 24px;
  }
  .messages > div {
    padding: 16px;
    width: 84%;
    margin: 0 0 18px;
  }
  .messages .outgoing {
    margin-left: auto;
    background: #eff1e9;
  }
  .composer {
    height: 84px;
    margin: 24px;
    width: calc(100% - 48px);
  }
  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    padding: 0 24px 32px;
  }
  .field {
    height: 42px;
  }
  .workspace {
    min-height: 100vh;
  }
  .workspace > .shapes {
    display: flex;
    min-height: 100vh;
    animation: none;
  }
  .rail {
    --skeleton-fill: #4a6a57;
    --skeleton-rule: #43614f;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 76px;
    padding: 20px 12px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    border-radius: 0 20px 20px 0;
    background: linear-gradient(180deg, #1c4433 0%, #163a2b 100%);
    box-shadow: 4px 0 24px rgb(10 30 20 / 12%);
  }
  .brand {
    display: block;
    font:
      40px/1 Rufina,
      Georgia,
      serif;
    letter-spacing: -2px;
    color: #e9eee4;
    min-height: 58px;
    padding-top: 2px;
  }
  .dot {
    width: 44px;
    height: 44px;
    border-radius: 11px;
  }
  .workspace-main {
    flex: 1;
    min-width: 0;
    padding: 10px 32px 0;
  }
  @keyframes breathe {
    0%,
    100% {
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
  }
  @media (max-width: 640px) {
    .rail {
      display: none;
    }
    .workspace-main {
      padding: 0 20px;
    }
    .panes,
    .graph-layout,
    .fields {
      grid-template-columns: 1fr;
    }
    .messages {
      padding-inline: 12px;
    }
    .messages > div {
      width: 94%;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .shapes {
      animation: none;
    }
  }
</style>
