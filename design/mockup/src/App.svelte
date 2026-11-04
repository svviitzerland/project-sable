<script lang="ts">
  import AssistantPanel from "./components/AssistantPanel.svelte";
  import BottomNav from "./components/BottomNav.svelte";
  import InspectorSheet from "./components/InspectorSheet.svelte";
  import LiveBar from "./components/LiveBar.svelte";
  import MockToolbar from "./components/MockToolbar.svelte";
  import Modals from "./components/Modals.svelte";
  import Rail from "./components/Rail.svelte";
  import SearchDialog from "./components/SearchDialog.svelte";
  import Toasts from "./components/Toasts.svelte";
  import TopBar from "./components/TopBar.svelte";
  import { t } from "./lib/i18n";
  import { isLive, live, startEngine } from "./lib/live.svelte";
  import { prefs } from "./lib/prefs.svelte";
  import { embedded, go, route } from "./lib/router.svelte";
  import { caseById, hearing, openAssistant, ui } from "./lib/store.svelte";
  import Canvas from "./routes/Canvas.svelte";
  import CaseOverview from "./routes/CaseOverview.svelte";
  import Cases from "./routes/Cases.svelte";
  import DocumentReader from "./routes/DocumentReader.svelte";
  import Evidence from "./routes/Evidence.svelte";
  import FeatureMap from "./routes/FeatureMap.svelte";
  import Findings from "./routes/Findings.svelte";
  import HearingLive from "./routes/HearingLive.svelte";
  import HearingReview from "./routes/HearingReview.svelte";
  import Hearings from "./routes/Hearings.svelte";
  import Moodboard from "./routes/Moodboard.svelte";

  startEngine();

  let vw = $state(typeof window === "undefined" ? 1280 : window.innerWidth);
  $effect(() => {
    ui.vw = vw;
  });

  // Layout tiers. Phones get a bottom bar, tablets an icon rail, laptops and desktops the full rail.
  let phone = $derived(vw < 720);
  let tablet = $derived(vw >= 720 && vw < 1024);
  let railCollapsed = $derived(tablet || prefs.railCollapsed);
  let assistantVariant = $derived<"docked" | "drawer" | "sheet">(
    phone ? "sheet" : vw >= 1280 && prefs.assistantMode === "docked" ? "docked" : "drawer",
  );

  let systemDark = $state(typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches);
  $effect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const handler = () => (systemDark = media.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  });
  let theme = $derived(prefs.theme === "system" ? (systemDark ? "night" : "paper") : prefs.theme);
  $effect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.density = prefs.density;
    root.lang = prefs.lang;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "night" ? "#09110d" : "#183b2d");
  });

  let caseId = $derived(route.parts[0] === "case" && caseById(route.parts[1]) ? route.parts[1] : null);
  let section = $derived(route.parts[2] ?? "overview");
  let sub = $derived(route.parts[3]);
  let currentHearing = $derived(section === "hearings" && sub ? hearing(sub) : undefined);
  let onLivePage = $derived(!!currentHearing && currentHearing.id === live.hearingId);
  let showLiveBar = $derived(isLive() && !onLivePage && hearing(live.hearingId)?.caseId === caseId && !!caseId);

  // The assistant follows what the person is looking at.
  $effect(() => {
    if (!caseId) {
      ui.assistantOpen = false;
      return;
    }
    if (section === "hearings" && sub) ui.assistantContext = { kind: "hearing", id: sub };
    else if (section === "findings" && sub) ui.assistantContext = { kind: "finding", id: sub };
    else if (section === "evidence") ui.assistantContext = { kind: "evidence" };
    else ui.assistantContext = { kind: "case" };
  });

  let main: HTMLElement | undefined = $state();
  // A page is identified by case, section and record. Selecting a finding in the queue only
  // changes the selection, so it keeps the page (and its filters and scroll) mounted.
  let pageKey = $derived(
    `${route.parts[0] ?? ""}/${caseId ?? ""}/${section}/${section === "findings" ? "" : `${sub ?? ""}/${route.parts[4] ?? ""}`}`,
  );
  let lastKey = "";
  $effect(() => {
    const key = pageKey;
    if (key !== lastKey) {
      lastKey = key;
      window.scrollTo({ top: 0 });
      ui.inspector = null;
    }
  });

  let searchOpen = $state(false);
  let pendingG = false;

  function typing(target: EventTarget | null) {
    const el = target as HTMLElement | null;
    return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || typing(event.target) || event.altKey) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchOpen = true;
      return;
    }
    if (event.metaKey || event.ctrlKey) return;
    if (ui.modal || searchOpen) return;
    if (pendingG && caseId) {
      pendingG = false;
      const target = { o: "", h: "/hearings", f: "/findings", e: "/evidence" }[event.key.toLowerCase()];
      if (target !== undefined) {
        event.preventDefault();
        go(`/case/${caseId}${target}`);
        return;
      }
    }
    if (event.key === "/") {
      event.preventDefault();
      searchOpen = true;
    } else if (event.key === "?") {
      ui.modal = { kind: "shortcuts" };
    } else if (event.key.toLowerCase() === "a" && caseId && !ui.inspector) {
      if (ui.assistantOpen) ui.assistantOpen = false;
      else openAssistant();
    } else if (event.key.toLowerCase() === "g") {
      pendingG = true;
      setTimeout(() => (pendingG = false), 1200);
    } else if (event.key === "Escape" && ui.assistantOpen && assistantVariant === "docked") {
      ui.assistantOpen = false;
    }
  }
</script>

<svelte:window bind:innerWidth={vw} {onkeydown} />

{#if route.parts[0] === "canvas"}
  <Canvas />
{:else}
  <a class="skip" href="#main">{t("nav.skip")}</a>
  <div class="shell" class:phone class:docked={assistantVariant === "docked" && ui.assistantOpen && !!caseId}>
    {#if !phone}
      <Rail {caseId} collapsed={railCollapsed} canCollapse={!tablet} />
    {/if}
    <div class="column">
      <TopBar {caseId} {phone} onsearch={() => (searchOpen = true)} />
      {#if showLiveBar && !phone}<LiveBar phone={false} />{/if}
      <main id="main" class="main" class:with-livebar={phone && showLiveBar} bind:this={main} tabindex="-1">
        {#if route.parts[0] === "map"}
          <FeatureMap />
        {:else if route.parts[0] === "moodboard"}
          <Moodboard />
        {:else if caseId}
          {#key pageKey}
            {#if section === "hearings" && currentHearing}
              {#if currentHearing.mode === "live" || currentHearing.mode === "scheduled"}
                <HearingLive hearingId={currentHearing.id} {phone} />
              {:else}
                <HearingReview hearingId={currentHearing.id} />
              {/if}
            {:else if section === "hearings"}
              <Hearings {caseId} />
            {:else if section === "findings"}
              <Findings {caseId} selectedId={sub} />
            {:else if section === "evidence" && sub === "doc" && route.parts[4]}
              <DocumentReader {caseId} docId={route.parts[4]} />
            {:else if section === "evidence"}
              <Evidence {caseId} />
            {:else}
              <CaseOverview {caseId} />
            {/if}
          {/key}
        {:else}
          <Cases />
        {/if}
      </main>
    </div>
    {#if caseId}
      <AssistantPanel {caseId} variant={assistantVariant} />
    {/if}
  </div>
  {#if phone && caseId}
    {#if showLiveBar}<LiveBar phone={true} />{/if}
    <BottomNav {caseId} />
  {/if}
  <InspectorSheet />
  <Modals />
  <SearchDialog open={searchOpen} {caseId} onclose={() => (searchOpen = false)} />
  <Toasts />
  {#if !embedded && !(phone && (ui.assistantOpen || ui.inspector || ui.modal || searchOpen))}
    <MockToolbar {phone} offsetRight={assistantVariant === "docked" && ui.assistantOpen && caseId ? 404 : 0} />
  {/if}
{/if}

<style>
  .skip {
    position: fixed;
    left: 12px;
    top: -60px;
    z-index: 100;
    padding: 10px 16px;
    background: var(--surface);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-control);
  }
  .skip:focus {
    top: 12px;
  }
  .shell {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    min-height: 100dvh;
  }
  .shell.phone {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .column {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 100dvh;
  }
  .main {
    flex: 1;
    min-width: 0;
    container: main / inline-size;
    outline: none;
  }
  .phone .main {
    padding-bottom: calc(var(--bottomnav-h) + var(--safe-bottom));
  }
  .phone .main.with-livebar {
    padding-bottom: calc(var(--bottomnav-h) + var(--safe-bottom) + 70px);
  }
</style>
