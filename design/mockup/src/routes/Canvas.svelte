<script lang="ts">
  import { ArrowLeft, ExternalLink } from "@lucide/svelte";
  import { t } from "../lib/i18n";
  import { prefs } from "../lib/prefs.svelte";
  import { route } from "../lib/router.svelte";

  /** Side-by-side device frames of one screen. Each frame is the real mockup in an iframe. */
  const screens = [
    { path: "/", label: "Landing page" },
    { path: "/cases", label: "Cases" },
    { path: "/case/c1", label: "Case overview" },
    { path: "/case/c1/hearings", label: "Hearings" },
    { path: "/case/c1/hearings/h3", label: "Live hearing" },
    { path: "/case/c1/hearings/h2", label: "Recorded hearing (review)" },
    { path: "/case/c1/findings", label: "Findings queue" },
    { path: "/case/c1/documents", label: "Documents · case files" },
    { path: "/case/c1/documents/d3", label: "Document reader" },
    { path: "/case/c1/findings?view=board&start=finding:f1", label: "Findings · board" },
    { path: "/case/c1/connections?of=statement:s208", label: "Connections" },
    { path: "/case/c3", label: "Empty case" },
    { path: "/map", label: "Feature map" },
  ];
  const devices = [
    { id: "phone", label: "Phone", w: 390, h: 844 },
    { id: "tablet", label: "Tablet", w: 834, h: 1112 },
    { id: "desktop", label: "Desktop", w: 1440, h: 900 },
  ];

  // svelte-ignore state_referenced_locally
  let path = $state(route.query.route ?? "/case/c1");
  let enabled = $state<Record<string, boolean>>({ phone: true, tablet: true, desktop: true });
  let width = $state(1200);
  let height = $state(800);

  let shown = $derived(devices.filter((d) => enabled[d.id]));
  let scale = $derived.by(() => {
    // Gaps and device bezels do not scale, so they come off the available width first.
    const fixed = 48 + (shown.length - 1) * 40 + shown.length * 16;
    const totalW = shown.reduce((n, d) => n + d.w, 0);
    const maxH = Math.max(...shown.map((d) => d.h), 1);
    return Math.min(1, (width - fixed) / totalW, (height - 150) / maxH);
  });
  let src = $derived(`./?embed=1#${path}`);
</script>

<svelte:window bind:innerWidth={width} bind:innerHeight={height} />

<div class="canvas-page">
  <header class="bar">
    <a class="btn btn-ghost" href={`#${path}`}><ArrowLeft size={16} />Mockup</a>
    <h1>{t("cv.title")}</h1>
    <label class="field-label inline">
      <span class="sr-only">{t("cv.screen")}</span>
      <select class="field" bind:value={path}>
        {#each screens as s (s.path)}<option value={s.path}>{s.label}</option>{/each}
      </select>
    </label>
    <div class="seg" role="group" aria-label="Devices">
      {#each devices as d (d.id)}
        <button aria-pressed={enabled[d.id]} onclick={() => (enabled[d.id] = !enabled[d.id])}>{d.label}</button>
      {/each}
    </div>
    <div class="seg" role="group" aria-label={t("mk.language")}>
      <button aria-pressed={prefs.lang === "id"} onclick={() => (prefs.lang = "id")}>ID</button>
      <button aria-pressed={prefs.lang === "en"} onclick={() => (prefs.lang = "en")}>EN</button>
    </div>
    <div class="seg" role="group" aria-label={t("mk.theme")}>
      <button aria-pressed={prefs.theme === "paper"} onclick={() => (prefs.theme = "paper")}>{t("mk.paper")}</button>
      <button aria-pressed={prefs.theme === "night"} onclick={() => (prefs.theme = "night")}>{t("mk.night")}</button>
    </div>
    <a class="btn btn-ghost" href={src} target="_blank" rel="noopener"><ExternalLink size={15} />{t("cv.openTab")}</a>
  </header>
  <p class="lead small muted">{t("cv.lead")}</p>
  <div class="frames">
    {#each shown as d (d.id)}
      <figure class="frame" style:width="{d.w * scale}px">
        <figcaption><strong>{d.label}</strong> <span class="tabular muted">{d.w}×{d.h} · {Math.round(scale * 100)}%</span></figcaption>
        <div class="device" style:width="{d.w * scale}px" style:height="{d.h * scale}px">
          {#key src}
            <iframe title={`${d.label} ${path}`} {src} width={d.w} height={d.h} style:transform="scale({scale})"></iframe>
          {/key}
        </div>
      </figure>
    {/each}
  </div>
</div>

<style>
  .canvas-page {
    min-height: 100dvh;
    padding: 12px 24px 24px;
    background: color-mix(in srgb, var(--bg) 70%, #8b8f86 30%);
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }
  h1 {
    font-family: var(--font-serif);
    font-weight: 400;
    font-size: 22px;
    color: var(--ink-strong);
    margin-right: auto;
  }
  .inline select {
    min-width: 220px;
  }
  .lead {
    margin: 6px 0 14px;
  }
  .frames {
    display: flex;
    gap: 40px;
    align-items: flex-start;
    justify-content: center;
  }
  .frame {
    margin: 0;
    display: grid;
    gap: 8px;
    flex-shrink: 0;
  }
  figcaption {
    font-size: 12px;
    display: flex;
    gap: 8px;
    color: var(--ink-strong);
  }
  .device {
    position: relative;
    overflow: hidden;
    border-radius: 14px;
    box-shadow: 0 0 0 8px #1d2621, 0 18px 40px rgb(0 0 0 / 0.3);
    background: #1d2621;
  }
  iframe {
    border: 0;
    transform-origin: 0 0;
    background: var(--bg);
    display: block;
  }
</style>
