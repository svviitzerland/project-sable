<script lang="ts">
  import { FlaskConical, LayoutGrid, Map as MapIcon, MonitorSmartphone, Palette, RotateCcw, Sparkles, X } from "@lucide/svelte";
  import { fly } from "svelte/transition";
  import { t } from "../lib/i18n";
  import { replayLive } from "../lib/live.svelte";
  import { prefs } from "../lib/prefs.svelte";
  import { go, route } from "../lib/router.svelte";
  import { resetData, toastT, ui } from "../lib/store.svelte";

  let { phone, offsetRight }: { phone: boolean; offsetRight: number } = $props();

  let layout = $derived(
    ui.vw < 720 ? t("mk.phone") : ui.vw < 1024 ? t("mk.tablet") : ui.vw < 1280 ? t("mk.laptop") : t("mk.desktop"),
  );

  function onkeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && ui.mockOpen) {
      event.stopPropagation();
      ui.mockOpen = false;
    }
  }
</script>

{#snippet seg(label: string, value: unknown, options: { v: any; label: string }[], set: (v: any) => void)}
  <div class="ctl">
    <span class="ctl-label">{label}</span>
    <div class="seg" role="group" aria-label={label}>
      {#each options as o (String(o.v))}
        <button aria-pressed={value === o.v} onclick={() => set(o.v)}>{o.label}</button>
      {/each}
    </div>
  </div>
{/snippet}

<div class="mock" style:--offset="{offsetRight}px" class:phone role="presentation" {onkeydown}>
  {#if ui.mockOpen}
    <section class="panel scroll-y" aria-label={t("mk.title")} transition:fly={{ y: 12, duration: 160 }}>
      <header>
        <div>
          <h2>{t("mk.title")}</h2>
          <p class="xsmall muted">{t("mk.note")}</p>
        </div>
        <button class="btn btn-ghost btn-icon btn-sm" aria-label={t("common.close")} onclick={() => (ui.mockOpen = false)}><X size={16} /></button>
      </header>
      <p class="viewport tabular">{t("mk.viewport", { w: ui.vw, layout })}</p>

      {@render seg(t("mk.language"), prefs.lang, [{ v: "id", label: "Bahasa Indonesia" }, { v: "en", label: "English" }], (v) => (prefs.lang = v))}
      {@render seg(t("mk.theme"), prefs.theme, [{ v: "paper", label: t("mk.paper") }, { v: "night", label: t("mk.night") }, { v: "system", label: t("mk.system") }], (v) => (prefs.theme = v))}
      {@render seg(t("mk.density"), prefs.density, [{ v: "comfortable", label: t("mk.comfortable") }, { v: "compact", label: t("mk.compact") }], (v) => (prefs.density = v))}

      <h3 class="t-label">{t("mk.variants")}</h3>
      {@render seg(t("mk.assistant"), prefs.assistantMode, [{ v: "docked", label: t("mk.docked") }, { v: "overlay", label: t("mk.overlay") }], (v) => (prefs.assistantMode = v))}
      {@render seg(t("mk.scope"), prefs.findingScope, [{ v: "meaningful", label: t("mk.meaningful") }, { v: "all", label: t("mk.allFindings") }], (v) => (prefs.findingScope = v))}

      <h3 class="t-label">{t("mk.services")}</h3>
      {@render seg(t("mk.ai"), prefs.ai, [{ v: true, label: "On" }, { v: false, label: "Off" }], (v) => (prefs.ai = v))}
      {@render seg(t("mk.pasal"), prefs.pasal, [{ v: true, label: "On" }, { v: false, label: "Off" }], (v) => (prefs.pasal = v))}
      {@render seg(t("mk.transcribe"), prefs.transcribe, [{ v: true, label: "On" }, { v: false, label: "Off" }], (v) => (prefs.transcribe = v))}
      {@render seg(t("mk.speed"), prefs.liveSpeed, [{ v: 1, label: "1×" }, { v: 2, label: "2×" }, { v: 4, label: "4×" }], (v) => (prefs.liveSpeed = v))}

      <div class="row">
        <button class="btn btn-sm" onclick={() => { replayLive(); go("/case/c1/hearings/h3"); ui.mockOpen = false; }}>{t("mk.replay")}</button>
        <button class="btn btn-sm" onclick={() => { resetData(); replayLive(); toastT("toast.reset"); }}><RotateCcw size={14} />{t("mk.reset")}</button>
      </div>

      <h3 class="t-label">{t("mk.pages")}</h3>
      <nav class="pages">
        <button class="page-link" aria-current={route.parts[0] === "map" ? "page" : undefined} onclick={() => { go("/map"); ui.mockOpen = false; }}><MapIcon size={16} />{t("nav.featureMap")}</button>
        <button class="page-link" aria-current={route.parts[0] === "moodboard" ? "page" : undefined} onclick={() => { go("/moodboard"); ui.mockOpen = false; }}><Palette size={16} />{t("nav.moodboard")}</button>
        <a class="page-link" href={`./#/canvas?route=${encodeURIComponent(route.path === "/canvas" ? "/case/c1" : route.path)}`} onclick={() => (ui.mockOpen = false)}><MonitorSmartphone size={16} />{t("nav.canvas")}</a>
        <button class="page-link" onclick={() => { go("/cases"); ui.mockOpen = false; }}><LayoutGrid size={16} />{t("nav.cases")}</button>
        <button class="page-link" aria-current={route.path === "/" ? "page" : undefined} onclick={() => { go("/"); ui.mockOpen = false; }}><Sparkles size={16} />{t("mk.landing")}</button>
      </nav>
    </section>
  {/if}
  <button class="fab" aria-expanded={ui.mockOpen} onclick={() => (ui.mockOpen = !ui.mockOpen)}>
    <FlaskConical size={16} />
    {#if !phone}<span>{t("mk.button")}</span>{/if}
  </button>
</div>

<style>
  .mock {
    position: fixed;
    z-index: 70;
    right: calc(16px + var(--offset));
    bottom: calc(16px + var(--safe-bottom));
    display: grid;
    justify-items: end;
    gap: 10px;
  }
  .mock.phone {
    right: 10px;
    bottom: calc(var(--bottomnav-h) + var(--safe-bottom) + 70px);
  }
  .fab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 14px;
    border-radius: 20px;
    background: #2b2340;
    color: #f3efff;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.03em;
    box-shadow: var(--shadow-float);
    border: 1px dashed #a99be0;
  }
  .phone .fab {
    width: 34px;
    height: 34px;
    padding: 0;
    justify-content: center;
    opacity: 0.85;
  }
  .panel {
    width: min(360px, calc(100vw - 20px));
    max-height: min(680px, calc(100dvh - 120px));
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--line);
    border-top: 3px solid #6f5fb5;
    border-radius: var(--radius-surface);
    box-shadow: var(--shadow-overlay);
    padding: 14px;
    display: grid;
    gap: 10px;
  }
  header {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  header > div {
    flex: 1;
  }
  h2 {
    font-size: 14px;
    font-weight: 700;
    color: var(--ink-strong);
  }
  h3 {
    margin-top: 6px;
  }
  .viewport {
    font-size: 12px;
    font-weight: 600;
    padding: 6px 8px;
    border-radius: var(--radius-control);
    background: var(--sunken);
  }
  .ctl {
    display: grid;
    gap: 4px;
  }
  .ctl-label {
    font-size: 12px;
    font-weight: 500;
  }
  .ctl .seg {
    display: flex;
    flex-wrap: wrap;
  }
  .ctl .seg button {
    flex: 1;
    justify-content: center;
    font-size: 12px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .pages {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .page-link {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 38px;
    padding: 0 10px;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-control);
    font-size: 12.5px;
    font-weight: 500;
    color: var(--ink-strong);
    text-decoration: none;
  }
  .page-link:hover,
  .page-link[aria-current="page"] {
    background: var(--selected);
  }
</style>
