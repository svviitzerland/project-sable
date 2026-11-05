<script lang="ts">
  import { ArrowRight, Check, Menu as MenuIcon, RotateCcw, X } from "@lucide/svelte";
  import Lenis from "lenis";
  import "lenis/dist/lenis.css";
  import { onMount, tick } from "svelte";
  import Avatar from "../components/Avatar.svelte";
  import KindIcon from "../components/KindIcon.svelte";
  import { deskPapers, samplePage } from "../lib/data";
  import { t, type Key } from "../lib/i18n";
  import { prefs } from "../lib/prefs.svelte";
  import { go, href } from "../lib/router.svelte";

  /**
   * The front door, in the Editorial Case File world: the forest case-file cover frames the
   * opening, ivory source paper carries every demonstration, and the page reads like a well-made
   * brief, one idea per spread. The comparison plays once (with a replay); after it, scrolling
   * moves the story: the sources come out of the file one by one, the steps change on one plate,
   * one line of the hearing comes forward, the exact phrase is marked on its page. Scrolling back
   * plays each scene backwards. Reduced motion, or no script, shows the finished static page.
   */
  const motionOk = typeof matchMedia === "function" && !matchMedia("(prefers-reduced-motion: reduce)").matches;

  let menuOpen = $state(false);
  let menuButton: HTMLButtonElement | undefined = $state();
  let root: HTMLElement | undefined = $state();
  let sheet: HTMLElement | undefined = $state();
  let playing = $state(false);
  let offscreen = $state(false);
  let hidden = $state(false);
  let scrolly = $state(false);
  let pinned = $state(false);
  // Narrow but tall enough: only the showpiece pins, header above and model below in one screen.
  let showPin = $state(false);
  // Smooths wheel and trackpad scrolling so scrubbed scenes glide between steps; touch stays native.
  let lenis: Lenis | null = null;

  async function replay() {
    if (!motionOk || !sheet) return;
    playing = false;
    await tick();
    void sheet.offsetWidth;
    playing = true;
  }

  function scrollToId(id: string) {
    menuOpen = false;
    const el = document.getElementById(id);
    if (el && lenis) lenis.scrollTo(el);
    else el?.scrollIntoView({ behavior: motionOk ? "smooth" : "auto", block: "start" });
    el?.focus({ preventScroll: true });
  }

  function closeMenu() {
    menuOpen = false;
    menuButton?.focus();
  }

  /*
   * Scroll-driven scenes. On wide, tall-enough screens each scene pins its stage while its own
   * scroll length passes; that progress (below 0 while the stage is still arriving) drives the
   * named tracks, written as CSS variables that the styles turn into movement. Elsewhere nothing
   * pins: elements marked data-rise move with their own pass through the viewport, sideways only,
   * so measuring them never feeds back into their own motion.
   */
  const PIN_QUERY = "(min-width: 900px) and (min-height: 700px)";
  const SHOW_PIN_QUERY = "(max-width: 899px) and (min-height: 560px)";
  const tracks: Record<string, [name: string, from: number, to: number][]> = {
    hero: [["hv", 0, 1]],
    gather: [
      ["g0", -0.3, -0.05],
      ["g1", 0, 0.16],
      ["w1", 0.12, 0.24],
      ["g2", 0.2, 0.36],
      ["w2", 0.32, 0.44],
      ["g3", 0.4, 0.56],
      ["w3", 0.52, 0.64],
      ["g4", 0.6, 0.76],
      ["w4", 0.72, 0.84],
      ["gl", 0.84, 0.94],
    ],
    how: [
      ["h1o", 0.27, 0.37],
      ["h2", 0.29, 0.39],
      ["h2o", 0.6, 0.7],
      ["h3", 0.62, 0.72],
      ["hp", 0, 1],
    ],
    signal: [
      ["r1", -0.3, -0.12],
      ["r2", -0.18, 0],
      ["r3", -0.05, 0.12],
      ["r4", 0.08, 0.24],
      ["fw", 0.28, 0.48],
      ["mk", 0.36, 0.54],
      ["nt", 0.5, 0.68],
      ["r5", 0.66, 0.82],
    ],
    page: [
      ["pg", -0.35, 0.05],
      ["hl", 0.12, 0.36],
      ["nt", 0.36, 0.56],
      ["rl", 0.52, 0.7],
    ],
    closing: [
      ["cs", 0.1, 0.6],
      ["ck", 0.55, 0.85],
    ],
    // The showpiece: papers land on the desk, Jude reads them, three lines stay lit and are tied
    // together, then they come forward readable, and the finding after them.
    show: [
      ["si", -0.4, 0],
      ["dr", -0.3, 0.05],
      ["sc", 0.08, 0.42],
      ["fd", 0.4, 0.5],
      ["th", 0.48, 0.62],
      ["co", 0.54, 0.74],
      ["fs", 0.76, 0.9],
      ["orb", -0.4, 1],
    ],
  };
  const unit = (x: number) => Math.min(1, Math.max(0, x));
  const easeOut = (x: number) => 1 - (1 - x) ** 3;

  function scenes(el: HTMLElement) {
    const pinQuery = matchMedia(PIN_QUERY);
    const showQuery = matchMedia(SHOW_PIN_QUERY);
    const stages = [...el.querySelectorAll<HTMLElement>("[data-scene]")];
    const risers = [...el.querySelectorAll<HTMLElement>("[data-rise]")];
    const last = new Map<string, string>();
    let frame = 0;
    const write = (node: HTMLElement, key: string, name: string, value: number) => {
      const v = value.toFixed(3);
      if (last.get(key) === v) return;
      last.set(key, v);
      node.style.setProperty(`--${name}`, v);
    };
    const update = () => {
      frame = 0;
      const vh = innerHeight;
      // Every position is read before anything is written, so each frame lays out once.
      const sceneBoxes = stages.map((s) => s.getBoundingClientRect());
      const riseBoxes = pinned ? [] : risers.map((r) => r.getBoundingClientRect());
      stages.forEach((s, i) => {
        const name = s.dataset.scene ?? "";
        const box = sceneBoxes[i];
        let at: number;
        if (name === "hero") at = unit(-box.top / box.height);
        else if (name === "closing") at = unit((vh - box.top) / (vh * 0.8));
        else if (pinned || (name === "show" && showPin)) at = -box.top / Math.max(1, box.height - vh);
        else if (name === "show") at = (vh * 0.75 - box.top) / box.height;
        else return;
        for (const [track, from, to] of tracks[name] ?? []) write(s, `${i}${track}`, track, easeOut(unit((at - from) / (to - from))));
      });
      riseBoxes.forEach((box, i) => write(risers[i], `r${i}`, "p", easeOut(unit((vh - box.top) / (vh * 0.45)))));
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onPinChange = () => {
      pinned = pinQuery.matches;
      showPin = showQuery.matches;
      void tick().then(update);
    };
    pinned = pinQuery.matches;
    showPin = showQuery.matches;
    scrolly = true;
    void tick().then(update);
    addEventListener("scroll", request, { passive: true });
    addEventListener("resize", request);
    pinQuery.addEventListener("change", onPinChange);
    showQuery.addEventListener("change", onPinChange);
    // Smoothed scrolling sets the scroll position and the scenes in the same frame.
    lenis = new Lenis({ autoRaf: true, lerp: 0.11 });
    lenis.on("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", request);
      removeEventListener("resize", request);
      pinQuery.removeEventListener("change", onPinChange);
      showQuery.removeEventListener("change", onPinChange);
      lenis?.destroy();
      lenis = null;
    };
  }

  onMount(() => {
    if (!motionOk) return;
    const watchers: IntersectionObserver[] = [];
    // The comparison plays when it is first seen and pauses whenever it is not.
    if (sheet) {
      const io = new IntersectionObserver(([entry]) => {
        offscreen = !entry.isIntersecting;
        if (entry.isIntersecting && !playing) playing = true;
      });
      io.observe(sheet);
      watchers.push(io);
    }
    const onVisibility = () => (hidden = document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    const stopScenes = root ? scenes(root) : () => {};
    return () => {
      watchers.forEach((w) => w.disconnect());
      document.removeEventListener("visibilitychange", onVisibility);
      stopScenes();
    };
  });

  /** Splits a sentence around the phrase a source is about. */
  function around(text: string, mark: string) {
    const i = mark ? text.indexOf(mark) : -1;
    return i < 0 ? [text, "", ""] : [text.slice(0, i), mark, text.slice(i + mark.length)];
  }

  // Most of a hearing stays quiet; one line comes forward with its source.
  const quietLines: { who: Key; speaker: string; text: Key; matches: boolean }[] = [
    { who: "role.judge", speaker: "hk", text: "lp.t1", matches: true },
    { who: "role.witness", speaker: "rina", text: "lp.t2", matches: true },
    { who: "role.prosecutor", speaker: "pu", text: "lp.t3", matches: false },
  ];
  let raised = $derived(around(t("lp.t4"), t("lp.t4Mark")));
  const citedItem = samplePage.items.find((item) => item.mark);
  const bapCited = citedItem ? around(citedItem.a, citedItem.mark) : null;
  let logCited = $derived(around(t("lp.g.log"), t("lp.g.logMark")));
  let bapQuote = $derived(around(t("lp.g.bap"), t("lp.g.bapMark")));

  // The showpiece desk, drawn in its own 1000 × 640 space: six papers dropped every which way, in
  // the order they land. Lines and pins sit at fractions of a paper, turned with it.
  type Box = { x: number; y: number; w: number; h: number; r: number };
  const papers: Record<"bap" | "law" | "talk" | "roster" | "log" | "cctv", Box> = {
    bap: { x: 70, y: 46, w: 262, h: 330, r: -7 },
    law: { x: 52, y: 404, w: 238, h: 190, r: -12 },
    talk: { x: 372, y: 104, w: 276, h: 330, r: 4 },
    roster: { x: 712, y: 34, w: 212, h: 168, r: 11 },
    log: { x: 660, y: 262, w: 290, h: 214, r: -5 },
    cctv: { x: 380, y: 470, w: 218, h: 138, r: 7 },
  };
  const order = Object.keys(papers) as (keyof typeof papers)[];
  function on(p: keyof typeof papers, fx: number, fy: number) {
    const b = papers[p];
    const a = (b.r * Math.PI) / 180;
    const lx = (fx - 0.5) * b.w;
    const ly = (fy - 0.5) * b.h;
    return { x: b.x + b.w / 2 + lx * Math.cos(a) - ly * Math.sin(a), y: b.y + b.h / 2 + lx * Math.sin(a) + ly * Math.cos(a) };
  }
  const place = (p: keyof typeof papers) => {
    const b = papers[p];
    return `left:${b.x / 10}%;top:${b.y / 6.4}%;width:${b.w / 10}%;height:${b.h / 6.4}%;--r:${b.r}deg;--i:${order.indexOf(p)}`;
  };
  // Where each time sits across the desk (0 to 1), for the moment the reading light passes it.
  const across = (p: keyof typeof papers, fx: number, fy: number) => (on(p, fx, fy).x / 1000).toFixed(3);
  // The three lines that belong together, numbered as they are listed beside the desk.
  const pins = [
    { n: 1, ...on("talk", 20 / 276, 0.69) },
    { n: 2, ...on("bap", 20 / 262, 0.69) },
    { n: 3, ...on("log", 20 / 290, 0.633) },
  ];
  function thread(a: { x: number; y: number }, b: { x: number; y: number }, bend: number) {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const cx = (a.x + b.x) / 2 - ((b.y - a.y) / len) * bend;
    const cy = (a.y + b.y) / 2 + ((b.x - a.x) / len) * bend;
    return `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
  }
  const threads = [thread(pins[0], pins[1], -46), thread(pins[0], pins[2], 40)];
  const introCited = around(samplePage.intro, "pukul 10.00 WIB");

  const slips = [
    { id: "bap", meta: "lp.g.bapMeta", text: "lp.g.bap", mark: "lp.g.bapMark", rel: "conflicts", reviewed: true },
    { id: "log", meta: "lp.g.logMeta", text: "lp.g.log", mark: "lp.g.logMark", rel: "conflicts", reviewed: true },
    { id: "shift", meta: "lp.g.shiftMeta", text: "lp.g.shift", mark: "", rel: "context", reviewed: false },
    { id: "law", meta: "lp.g.lawMeta", text: "lp.g.law", mark: "", rel: "related", reviewed: false },
  ] as const;
  // Wire geometry in the desk's 1200 × 560 drawing space.
  const wires: Record<string, { d: string; x: number; y: number }> = {
    bap: { d: "M360,105 C405,105 392,255 430,255", x: 33.2, y: 31.5 },
    log: { d: "M380,455 C414,455 398,305 430,305", x: 33.8, y: 68 },
    shift: { d: "M840,115 C796,115 808,255 770,255", x: 66.8, y: 32.5 },
    law: { d: "M820,445 C788,445 802,305 770,305", x: 66.2, y: 67.5 },
  };
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && menuOpen && closeMenu()} />

<div class="lp" bind:this={root} class:scrolly class:pinned class:show-pin={showPin}>
  <button class="skip" onclick={() => scrollToId("lp-main")}>{t("lp.skip")}</button>

  <header class="cover" data-scene="hero">
    <div class="frame">
      <nav class="nav" aria-label={t("lp.nav.label")}>
        <a class="wordmark" href={href("/")}>jude.</a>
        <div class="links">
          <button onclick={() => scrollToId("lp-how")}>{t("lp.nav.how")}</button>
          <button onclick={() => scrollToId("lp-source")}>{t("lp.nav.source")}</button>
          <button onclick={() => scrollToId("lp-approach")}>{t("lp.nav.approach")}</button>
        </div>
        <div class="lang" role="group" aria-label={t("lp.language")}>
          <button aria-pressed={prefs.lang === "id"} onclick={() => (prefs.lang = "id")}>ID</button>
          <button aria-pressed={prefs.lang === "en"} onclick={() => (prefs.lang = "en")}>EN</button>
        </div>
        <a class="button outline nav-action" href={href("/cases")}>{t("lp.open")}<ArrowRight size={18} strokeWidth={1.5} /></a>
        <button
          class="menu-toggle"
          bind:this={menuButton}
          aria-expanded={menuOpen}
          aria-controls="lp-menu"
          aria-label={menuOpen ? t("lp.closeMenu") : t("lp.menu")}
          onclick={() => (menuOpen = !menuOpen)}
        >
          {#if menuOpen}<X size={20} />{:else}<MenuIcon size={20} />{/if}
        </button>
        {#if menuOpen}
          <div id="lp-menu" class="menu">
            <button onclick={() => scrollToId("lp-how")}>{t("lp.nav.how")}<ArrowRight size={17} /></button>
            <button onclick={() => scrollToId("lp-source")}>{t("lp.nav.source")}<ArrowRight size={17} /></button>
            <button onclick={() => scrollToId("lp-approach")}>{t("lp.nav.approach")}<ArrowRight size={17} /></button>
            <a href={href("/cases")}>{t("lp.open")}<ArrowRight size={17} /></a>
            <div class="lang menu-lang" role="group" aria-label={t("lp.language")}>
              <button aria-pressed={prefs.lang === "id"} onclick={() => (prefs.lang = "id")}>ID</button>
              <button aria-pressed={prefs.lang === "en"} onclick={() => (prefs.lang = "en")}>EN</button>
            </div>
          </div>
        {/if}
      </nav>

      <div class="opening">
        <h1 class="display">
          <span>{t("lp.title1")}</span>
          <span class="turn">{t("lp.title2")}</span>
        </h1>
        <p class="lead">{t("lp.lead")}</p>
        <div class="actions">
          <a class="button cream" href={href("/case/c1")}>{t("lp.demo")}<ArrowRight size={22} strokeWidth={1.5} /></a>
          <button class="button outline" onclick={() => scrollToId("lp-how")}>{t("lp.how")}</button>
        </div>
      </div>

      <figure class="sheet paper" class:run={playing} class:held={offscreen || hidden} bind:this={sheet}>
        <figcaption class="sheet-bar">
          <span class="sample">{t("lp.sample")}</span>
          {#if motionOk}<button class="replay" onclick={replay}><RotateCcw size={14} />{t("lp.replay")}</button>{/if}
        </figcaption>
        <div class="compare">
          <div class="side">
            <h2 class="side-label">{t("lp.testimony")}</h2>
            <blockquote class="quote">“{t("lp.quote1")} <span class="hl one">{t("lp.time1")}</span>”</blockquote>
            <button class="source" onclick={() => go("/case/c1/findings/f1")}>
              <KindIcon kind="hearing" size={15} />{t("lp.transcript")} · <span class="tabular">00:14:32</span>
            </button>
          </div>
          <div class="finding">
            <span class="pill">{t("status.potential_inconsistency")}</span>
            <span class="thread" aria-hidden="true"><i class="end"></i><i class="line"></i><i class="end"></i></span>
            <p class="check">{t("lp.check")}</p>
          </div>
          <div class="side earlier">
            <h2 class="side-label">{t("lp.earlier")}</h2>
            <blockquote class="quote typed">“{t("lp.quote2")} <span class="hl two">{t("lp.time2")}</span>”</blockquote>
            <button class="source" onclick={() => go("/case/c1/findings/f1")}>
              <KindIcon kind="document" size={15} />{t("lp.witnessStatement")} · {t("common.page", { n: 4 })}
            </button>
          </div>
        </div>
      </figure>
    </div>
  </header>

  <main id="lp-main" tabindex="-1">
    <section class="intro wrap" id="lp-source" tabindex="-1" aria-labelledby="lp-source-title">
      <div>
        <h2 class="rufina" id="lp-source-title">{t("lp.sourceTitle")}</h2>
        <p class="intro-lead">{t("lp.sourceLead")}</p>
      </div>
      <p class="intro-aside">{t("lp.sourceAside")}</p>
    </section>

    <section class="gather wrap" aria-label={t("lp.g.label")}>
      <div class="scene gather-scene" data-scene="gather">
        <div class="stage">
          <div class="desk">
            <svg class="wires" viewBox="0 0 1200 560" aria-hidden="true">
              {#each slips as s (s.id)}
                <path class="wire" class:suggested={!s.reviewed} data-rel={s.rel} data-slip={s.id} d={wires[s.id].d} pathLength="1" />
              {/each}
            </svg>
            <article class="slip statement" data-rise>
              <p class="slip-meta"><Avatar id="rina" size="xxs" />{t("lp.g.statementMeta")}</p>
              <p class="statement-text">“{t("lp.g.statement")}”</p>
            </article>
            {#each slips as s (s.id)}
              {@const parts = around(t(s.text), s.mark ? t(s.mark) : "")}
              <article class="slip source-slip {s.id}" data-rise>
                <p class="slip-meta">{#if s.id === "shift"}<Avatar id="rina" size="xxs" />{:else}<KindIcon kind={s.id === "law" ? "legal" : "document"} size={13} />{/if}{t(s.meta)}</p>
                <p class="slip-text" class:typed={s.id !== "shift"}>{parts[0]}{#if parts[1]}<mark>{parts[1]}</mark>{/if}{parts[2]}</p>
                <p class="slip-rel" data-rel={s.rel}>{t(`rel.${s.rel}`)}</p>
              </article>
              <span class="wire-label" data-rel={s.rel} data-slip={s.id} style:left="{wires[s.id].x}%" style:top="{wires[s.id].y}%">{t(`rel.${s.rel}`)}</span>
            {/each}
          </div>
          <p class="legend">{t("lp.g.legend")} · {t("lp.sample")}</p>
        </div>
      </div>
    </section>

    <section class="showcase" aria-labelledby="lp-show-title">
      <div class="scene show-scene" data-scene="show">
        <div class="stage show-stage">
          <div class="show-copy">
            <header class="show-head">
              <h2 class="headline" id="lp-show-title">{t("lp.show.title1")}<br />{t("lp.show.title2")}</h2>
              <p class="show-lead">{t("lp.show.lead")}</p>
            </header>
            <p class="show-status" aria-hidden="true">
              <span class="st-cue">{t("lp.show.cue")}</span>
              <span class="st-read">{t("lp.show.reading", { n: order.length })}</span>
              <span class="st-linked">{t("lp.show.linked", { n: pins.length })}</span>
            </p>
            <ol class="show-lines">
              <li style:--k="0">
                <span class="sl-n" aria-hidden="true">1</span>
                <span class="sl-meta"><KindIcon kind="hearing" size={13} />{t("lp.g.statementMeta")}</span>
                <span class="sl-text">{raised[0]}<mark>{raised[1]}</mark>{raised[2]}</span>
              </li>
              <li style:--k="1">
                <span class="sl-n" aria-hidden="true">2</span>
                <span class="sl-meta"><KindIcon kind="document" size={13} />{t("lp.g.bapMeta")}</span>
                <span class="sl-text typed">{bapQuote[0]}<mark>{bapQuote[1]}</mark>{bapQuote[2]}</span>
              </li>
              <li style:--k="2">
                <span class="sl-n" aria-hidden="true">3</span>
                <span class="sl-meta"><KindIcon kind="document" size={13} />{t("lp.g.logMeta")}</span>
                <span class="sl-text typed">{logCited[0]}<mark>{logCited[1]}</mark>{logCited[2]}</span>
              </li>
            </ol>
            <p class="show-sample">{t("lp.sample")}</p>
          </div>
          <p class="sr-only">{t("lp.show.alt")}</p>
          <div class="tb-wrap" aria-hidden="true">
            <div class="tb">
              <div class="tb-paper p-bap key" style={place("bap")}>
                <p class="pp-folio">{samplePage.folio}</p>
                {#each samplePage.heading as line (line)}<p class="pp-heading">{line}</p>{/each}
                <p class="pp-typed pp-intro">{introCited[0]}<mark class="tb-c" style:--mx={across("bap", 0.5, 0.33)}>{introCited[1]}</mark>{introCited[2]}</p>
                {#if bapCited}
                  <p class="pp-typed pp-key"><u>{samplePage.labels.a}:</u> {bapCited[0]}<mark class="tb-c key" style:--mx={across("bap", 0.45, 0.72)}>{bapCited[1]}</mark>{bapCited[2]}</p>
                {/if}
              </div>
              <div class="tb-paper p-law" style={place("law")}>
                <p class="pp-head">{t("lp.v2.d4")}</p>
                <p class="pp-typed">{t("lp.g.law")}</p>
                <span class="pp-lines"><i></i><i></i><i></i><i></i></span>
              </div>
              <div class="tb-paper p-talk key" style={place("talk")}>
                <p class="pp-head">{deskPapers.transcript}</p>
                <span class="pp-wave">{#each [3, 6, 4, 9, 5, 8, 3, 7, 10, 6, 4, 8, 5, 9, 3, 6, 8, 4, 7, 5] as h, i (i)}<i style:--h={h}></i>{/each}</span>
                {#each quietLines as line (line.text)}<p class="pp-line"><b>{t(line.who)}</b> {t(line.text)}</p>{/each}
                <p class="pp-line pp-key"><b>{t("role.witness")}</b> {raised[0]}<mark class="tb-c key" style:--mx={across("talk", 0.45, 0.7)}>{raised[1]}</mark>{raised[2]}</p>
              </div>
              <div class="tb-paper p-roster" style={place("roster")}>
                <p class="pp-head">{deskPapers.roster.title}</p>
                {#each deskPapers.roster.rows as row, i (row.shift)}
                  <p class="pp-row" style:--row={i}><span>{row.shift}</span><mark class="tb-c" style:--mx={across("roster", 0.7, 0.45 + i * 0.17)}>{row.time}</mark></p>
                {/each}
              </div>
              <div class="tb-paper p-log key" style={place("log")}>
                <p class="pp-folio">{deskPapers.log.folio}</p>
                <p class="pp-head">{deskPapers.log.title}</p>
                <p class="pp-sub">{deskPapers.log.sub}</p>
                {#each deskPapers.log.rows as row, i (row.time)}
                  <p class="pp-row pp-typed" style:--row={i}><mark class="tb-c" class:key={row.key} style:--mx={across("log", 0.24, 0.5 + i * 0.16)}>{row.time}</mark><span>{row.gate}</span><span>{row.who}</span></p>
                {/each}
              </div>
              <div class="tb-paper p-cctv" style={place("cctv")}>
                <span class="cc-frame"><span class="cc-cam">{deskPapers.cctv.cam}</span><mark class="tb-c cc-stamp" style:--mx={across("cctv", 0.68, 0.22)}>{deskPapers.cctv.stamp}</mark></span>
              </div>
              <div class="tb-light"></div>
              <svg class="tb-threads" viewBox="0 0 1000 640" preserveAspectRatio="none">
                {#each threads as d, i (i)}<path {d} pathLength="1" style:--k={i} />{/each}
              </svg>
              {#each pins as pin (pin.n)}<span class="tb-pin" style:left="{pin.x / 10}%" style:top="{pin.y / 6.4}%">{pin.n}</span>{/each}
            </div>
          </div>
          <div class="show-finding">
            <span class="pill small">{t("status.potential_inconsistency")}</span>
            <p class="sf-title">{t("lp.v3.title")}</p>
            <p class="sf-ask"><span>{t("lp.v3.ask")}</span>{t("lp.v3.question")}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="how wrap" id="lp-how" tabindex="-1" aria-labelledby="lp-how-title">
      <div class="scene steps-scene" data-scene="how">
        <div class="stage">
      <header class="section-head">
        <h2 class="headline" id="lp-how-title">{t("lp.howTitle1")}<br />{t("lp.howTitle2")}</h2>
        <p>{t("lp.howLead")}</p>
      </header>
      <div class="steps-stage">
      <div class="plate-bg" aria-hidden="true"></div>
      <ol class="steps">
        <li class="step">
          <div class="caption">
            <h3>{t("lp.s1.title")}</h3>
            <p>{t("lp.s1.text")}</p>
          </div>
          <div class="plate" data-rise>
            <div class="vignette listen paper">
              <div class="v-line quiet">
                <Avatar id="hk" size="md" />
                <div><span class="v-name">{t("role.judge")}</span><p>{t("lp.v1.judge")}</p></div>
              </div>
              <div class="v-line now">
                <Avatar id="rina" size="lg" speaking still />
                <div>
                  <span class="v-name">Saksi Rina Hartati <span class="v-listening">{t("live.listeningShort")}</span></span>
                  <p class="v-said">{t("lp.g.statement")}</p>
                </div>
              </div>
              <span class="v-sample">{t("lp.sample")}</span>
            </div>
          </div>
        </li>
        <li class="step flip">
          <div class="caption">
            <h3>{t("lp.s2.title")}</h3>
            <p>{t("lp.s2.text")}</p>
          </div>
          <div class="plate" data-rise>
            <div class="vignette reading paper">
              <p class="v-head">{t("lp.v2.title")}</p>
              <ul>
                <li><KindIcon kind="document" size={15} /><span>{t("lp.v2.d1")}</span><span class="v-pages">{t("lp.v2.pages", { n: 6 })}</span><span class="v-state"><Check size={13} />{t("lp.v2.read")}</span></li>
                <li><KindIcon kind="document" size={15} /><span>{t("lp.v2.d2")}</span><span class="v-pages">{t("lp.v2.pages", { n: 12 })}</span><span class="v-state"><Check size={13} />{t("lp.v2.read")}</span></li>
                <li><KindIcon kind="document" size={15} /><span>{t("lp.v2.d3")}</span><span class="v-pages">{t("lp.v2.pages", { n: 9 })}</span><span class="v-state"><Check size={13} />{t("lp.v2.read")}</span></li>
                <li><KindIcon kind="legal" size={15} /><span>{t("lp.v2.d4")}</span><span class="v-pages">Pasal.id</span><span class="v-state"><Check size={13} />{t("lp.v2.referenced")}</span></li>
              </ul>
              <span class="v-sample">{t("lp.sample")}</span>
            </div>
          </div>
        </li>
        <li class="step">
          <div class="caption">
            <h3>{t("lp.s3.title")}</h3>
            <p>{t("lp.s3.text")}</p>
          </div>
          <div class="plate" data-rise>
            <div class="vignette examine paper">
              <span class="pill">{t("status.potential_inconsistency")}</span>
              <p class="v-title">{t("lp.v3.title")}</p>
              <p class="v-sub">{t("lp.v3.checked")}</p>
              <ul class="v-checks">
                <li>{t("lp.v3.alt")}</li>
                <li>{t("lp.v3.context")}</li>
              </ul>
              <p class="v-sub">{t("lp.v3.ask")}</p>
              <p class="v-question">{t("lp.v3.question")}</p>
              <span class="v-sample">{t("lp.sample")}</span>
            </div>
          </div>
        </li>
      </ol>
      <div class="step-rule" aria-hidden="true"><span></span></div>
      </div>
        </div>
      </div>
    </section>

    <section class="signal wrap" aria-labelledby="lp-signal-title">
      <div class="scene signal-scene" data-scene="signal">
        <div class="stage">
      <header class="section-head">
        <h2 class="headline" id="lp-signal-title">{t("lp.signalTitle")}</h2>
        <p>{t("lp.signalLead")}</p>
      </header>
      <figure class="transcript paper">
      <ol class="t-list">
        {#each quietLines as line (line.text)}
          <li class="t-row" data-rise>
            <span class="t-who"><Avatar id={line.speaker} size="xxs" />{t(line.who)}</span>
            <p class="t-text">{t(line.text)}</p>
            {#if line.matches}<span class="t-ok"><Check size={13} />{t("lp.tMatches")}</span>{:else}<span></span>{/if}
          </li>
        {/each}
        <li class="t-row raised" data-rise>
          <span class="t-who"><Avatar id="rina" size="xxs" />{t("role.witness")}</span>
          <p class="t-text">{raised[0]}<mark>{raised[1]}</mark>{raised[2]}</p>
          <span class="pill small">{t("status.potential_inconsistency")}</span>
          <p class="t-note">{t("lp.tNote")}</p>
        </li>
        <li class="t-row" data-rise>
          <span class="t-who"><Avatar id="rina" size="xxs" />{t("role.witness")}</span>
          <p class="t-text">{t("lp.t5")}</p>
          <span></span>
        </li>
      </ol>
      <figcaption class="panel-sample">{t("lp.sample")}</figcaption>
      </figure>
        </div>
      </div>
    </section>

    <section class="page-spread wrap" aria-labelledby="lp-page-title">
      <header class="section-head">
        <h2 class="headline" id="lp-page-title">{t("lp.pageTitle")}</h2>
        <div class="spread-text">
          <p>{t("lp.pageText")}</p>
          <p class="quiet">{t("lp.pageOriginal")}</p>
        </div>
      </header>
      <div class="scene page-scene" data-scene="page">
        <div class="stage">
      <div class="page-row">
        <div class="page-sheet paper" aria-label={t("lp.sample")}>
          <p class="page-folio tabular">{samplePage.folio}</p>
          {#each samplePage.heading as line (line)}<p class="page-heading">{line}</p>{/each}
          <p class="page-intro">{samplePage.intro}</p>
          <ol class="page-items">
            {#each samplePage.items as item (item.n)}
              {@const parts = around(item.a, item.mark)}
              <li>
                <span class="page-n tabular">{item.n}.</span>
                <div class="page-qa">
                  <p><span class="page-tag">{samplePage.labels.q}:</span> {item.q}</p>
                  <p><span class="page-tag">{samplePage.labels.a}:</span> {parts[0]}{#if parts[1]}<mark data-rise>{parts[1]}</mark>{/if}{parts[2]}</p>
                  {#if item.mark}
                    <aside class="margin-note in-margin">
                      <span class="pill small">{t("status.potential_inconsistency")}</span>
                      <p>{t("lp.pageNote")}</p>
                    </aside>
                  {/if}
                </div>
              </li>
            {/each}
          </ol>
          <p class="page-sample">{t("lp.sample")}</p>
        </div>
        <aside class="margin-note below-page" data-rise>
          <span class="pill small">{t("status.potential_inconsistency")}</span>
          <p>{t("lp.pageNote")}</p>
        </aside>
      </div>
        </div>
      </div>
    </section>

    <section class="approach wrap" id="lp-approach" tabindex="-1" aria-labelledby="lp-approach-title">
      <header class="section-head">
        <h2 class="headline" id="lp-approach-title">{t("lp.approachTitle1")}<br />{t("lp.approachTitle2")}</h2>
        <p>{t("lp.approachLead")}</p>
      </header>
      <ul class="principles">
        <li><h3>{t("lp.p1.title")}</h3><p>{t("lp.p1.text")}</p></li>
        <li><h3>{t("lp.p2.title")}</h3><p>{t("lp.p2.text")}</p></li>
        <li><h3>{t("lp.p3.title")}</h3><p>{t("lp.p3.text")}</p></li>
      </ul>
    </section>

    <section class="closing" data-scene="closing" aria-labelledby="lp-closing-title">
      <div class="closing-frame">
        <div class="closing-copy">
          <h2 class="headline" id="lp-closing-title">{t("lp.closingTitle1")}<br />{t("lp.closingTitle2")}</h2>
          <p>{t("lp.closingLead")}</p>
          <div class="actions">
            <a class="button cream" href={href("/case/c1")}>{t("lp.demo")}<ArrowRight size={22} strokeWidth={1.5} /></a>
            <a class="button outline" href={href("/cases")}>{t("lp.open")}</a>
          </div>
        </div>
        <div class="closing-slip paper">
          <span class="pill">{t("status.potential_inconsistency")}</span>
          <p class="v-title">{t("lp.v3.title")}</p>
          <p class="closing-done"><Check size={15} />{t("lp.closingDone")}</p>
          <span class="v-sample">{t("lp.sample")}</span>
        </div>
      </div>
    </section>
  </main>

  <footer class="foot wrap">
    <div>
      <a class="wordmark foot-mark" href={href("/")}>jude.</a>
      <p>{t("lp.tagline")}</p>
    </div>
    <div class="foot-notes">
      <p>{t("lp.note")}</p>
      <p>{t("lp.footerNote")}</p>
      <p class="quiet">{t("lp.concept")}</p>
    </div>
  </footer>
</div>

<style>
  /*
   * Images (cloth, paper, the case-file photograph, and gradients) never go through var(), not even
   * a colour in the same shorthand: an image behind var() is resolved again whenever the element's
   * style is, and the scroll scenes restyle their surfaces every frame, re-rastering them each time.
   */
  .lp {
    --lp-bg: #faf7f0;
    --lp-ink: #14281f;
    --lp-forest: #16382b;
    --lp-forest-deep: #153328;
    --lp-cream: #f6f0e4;
    --lp-accent: #eadcc4;
    --lp-paper: #f5eee2;
    --lp-muted: #64675e;
    --lp-line: #d9d6ca;
    --lp-button: #f4ebda;
    --lp-button-ink: #15271d;
    --lp-button-hover: #e8d6b5;
    --lp-amber: #e9bf7c;
    --lp-amber-ink: #422d10;
    --lp-amber-wash: rgb(233 191 124 / 0.42);
    --lp-sage-ink: #245037;
    --lp-rel-conflicts: #b57539;
    --lp-rel-conflicts-text: #835025;
    --lp-rel-context: #83709b;
    --lp-rel-context-text: #67547e;
    --lp-rel-related: #8e9e91;
    --lp-rel-related-text: #546758;
    --lp-ease: cubic-bezier(0.16, 1, 0.3, 1);
    /* Written records are typed; spoken testimony keeps the display serif. */
    --lp-doc: "Courier Prime", "Courier New", Courier, monospace;
    --lp-section: 84px;
    min-height: 100dvh;
    background: var(--lp-bg);
    color: var(--lp-ink);
    font: 400 15px / 1.65 "Manrope", system-ui, sans-serif;
    overflow-x: clip;
  }
  .lp ::selection {
    background: var(--lp-amber-wash);
    color: inherit;
  }
  .lp :focus-visible {
    outline: 2px solid var(--lp-amber);
    outline-offset: 6px;
  }
  .lp [tabindex="-1"]:focus {
    outline: none;
  }
  .wrap {
    width: min(90%, 1440px);
    margin-inline: auto;
  }
  .tabular {
    font-variant-numeric: tabular-nums;
  }
  .paper {
    background-color: var(--lp-paper);
    background-image: url("../../../../apps/web/static/images/ivory-paper.webp");
    background-size: 600px 600px;
    color: #111c16;
  }
  .skip {
    position: fixed;
    z-index: 50;
    left: 16px;
    top: -100px;
    padding: 12px 20px;
    border-radius: 7px;
    background: var(--lp-paper);
    color: var(--lp-ink);
  }
  .skip:focus-visible {
    top: 16px;
  }

  /* Cover: the forest case file, set into the page with a quiet margin. */
  .cover {
    padding: 14px 14px 0;
  }
  .frame {
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: 28px 28px 0 0;
    background-color: var(--lp-forest-deep);
    background-image: url("../../../../apps/web/static/images/jude-case-files.webp");
    background-position: center bottom;
    background-size: cover;
    background-repeat: no-repeat;
    color: var(--lp-cream);
    padding: 0 max(5%, 28px);
    overflow: hidden;
  }
  .nav {
    position: relative;
    display: flex;
    align-items: center;
    gap: 28px;
    min-height: 104px;
  }
  .wordmark {
    font-family: "Rufina", Georgia, serif;
    font-size: 53px;
    line-height: 1;
    letter-spacing: -0.02em;
    color: inherit;
    text-decoration: none;
    margin-right: auto;
  }
  .links {
    display: flex;
    gap: 28px;
  }
  .links button {
    font-size: 15px;
    color: var(--lp-cream);
    text-underline-offset: 6px;
  }
  .links button:hover {
    text-decoration: underline;
    text-decoration-thickness: 1px;
  }
  .lang {
    display: inline-flex;
    padding: 3px;
    border-radius: 30px;
    border: 1px solid rgb(246 240 228 / 0.35);
  }
  .lang button {
    min-width: 36px;
    padding: 3px 9px;
    border-radius: 30px;
    font-size: 12.5px;
    font-weight: 600;
    color: rgb(246 240 228 / 0.8);
  }
  .lang button[aria-pressed="true"] {
    background: var(--lp-cream);
    color: var(--lp-forest);
  }
  .menu-toggle {
    display: none;
  }
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    min-height: 56px;
    padding: 10px 30px;
    border: 1px solid transparent;
    border-radius: 7px;
    font-family: "Caslon Display", Georgia, serif;
    font-size: 23px;
    line-height: 1.3;
    text-decoration: none;
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s;
  }
  .button :global(svg) {
    transition: transform 0.2s var(--lp-ease);
  }
  .button:hover :global(svg) {
    transform: translateX(4px);
  }
  .cream {
    background: var(--lp-button);
    color: var(--lp-button-ink);
  }
  .cream:hover {
    background: var(--lp-button-hover);
  }
  .outline {
    border-color: rgb(246 240 228 / 0.7);
    color: var(--lp-cream);
  }
  .outline:hover {
    background: var(--lp-paper);
    color: var(--lp-forest);
  }
  .nav-action {
    min-height: 48px;
    padding: 8px 22px;
    gap: 12px;
    font-size: 19px;
  }

  .opening {
    max-width: 980px;
    padding: clamp(40px, 7vh, 84px) 0 clamp(48px, 8vh, 96px);
  }
  .display {
    display: grid;
    font-family: "Rufina", Georgia, serif;
    font-weight: 400;
    font-size: clamp(58px, 5.85vw, 90px);
    line-height: 0.98;
    letter-spacing: -0.025em;
    text-wrap: balance;
  }
  .turn {
    color: var(--lp-accent);
  }
  .lead {
    max-width: 30em;
    margin-top: 28px;
    font-size: 20px;
    line-height: 1.55;
    color: rgb(246 240 228 / 0.88);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 36px;
  }

  /* The source paper rises from the lower edge of the cover. */
  .sheet {
    position: relative;
    align-self: center;
    width: min(85%, 1340px);
    margin: 0;
    padding: 18px clamp(24px, 3vw, 44px) 40px;
    border-radius: 14px 14px 0 0;
    box-shadow: 0 -14px 40px rgb(5 20 12 / 0.28);
  }
  .sheet-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 32px;
    margin-bottom: 18px;
    border-bottom: 1px solid rgb(17 28 22 / 0.12);
    padding-bottom: 12px;
  }
  .sample {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--lp-muted);
    white-space: nowrap;
  }
  .replay {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    min-height: 32px;
    padding: 4px 10px;
    border-radius: 5px;
    font-size: 13px;
    color: var(--lp-forest);
  }
  .replay:hover {
    background: rgb(22 56 43 / 0.07);
  }
  .compare {
    display: grid;
    grid-template-columns: 1.1fr 1fr 1.1fr;
    align-items: start;
  }
  .side {
    display: grid;
    gap: 14px;
    padding-right: 28px;
  }
  .side.earlier {
    padding: 0 0 0 28px;
  }
  .side-label {
    font-family: "Manrope", sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: var(--lp-muted);
  }
  .quote {
    margin: 0;
    font-family: "Caslon Display", Georgia, serif;
    font-size: clamp(27px, 2.65vw, 42px);
    line-height: 1.2;
    text-wrap: balance;
  }
  .quote.typed {
    font-family: var(--lp-doc);
    font-size: clamp(22px, 2.05vw, 32px);
    line-height: 1.3;
    letter-spacing: -0.01em;
  }
  .typed {
    font-family: var(--lp-doc);
  }
  .hl {
    /* --lp-amber-wash, written out: a gradient is an image, so no var() (see the note at the top). */
    background: linear-gradient(rgb(233 191 124 / 0.42), rgb(233 191 124 / 0.42)) no-repeat 0 88% / 100% 0.55em;
    padding: 0 2px;
  }
  .source {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    width: fit-content;
    min-height: 32px;
    font-size: 13.5px;
    color: var(--lp-forest);
    text-decoration: underline;
    text-decoration-color: rgb(22 56 43 / 0.35);
    text-underline-offset: 4px;
  }
  .source:hover {
    text-decoration-color: currentColor;
  }
  .finding {
    display: grid;
    justify-items: center;
    gap: 14px;
    align-self: stretch;
    padding: 6px 24px 0;
    border-inline: 1px solid rgb(17 28 22 / 0.14);
    text-align: center;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    padding: 7px 18px;
    border-radius: 30px;
    background: var(--lp-amber);
    color: var(--lp-amber-ink);
    font-size: 13.5px;
    font-weight: 600;
    white-space: nowrap;
  }
  .pill.small {
    padding: 3px 11px;
    font-size: 12px;
  }
  .thread {
    display: flex;
    align-items: center;
    width: 100%;
  }
  .thread .end {
    flex-shrink: 0;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--lp-rel-conflicts);
  }
  .thread .line {
    flex: 1;
    height: 1.5px;
    background: var(--lp-rel-conflicts);
    transform-origin: left center;
  }
  .check {
    max-width: 22em;
    font-size: 14.5px;
    line-height: 1.55;
    color: #2a3a31;
  }

  /* One finite sequence: the sheet settles, each time is marked, the thread draws, the finding lands. */
  .sheet.run {
    animation: lp-rise 0.75s var(--lp-ease) both;
  }
  .sheet.run .hl.one {
    animation: lp-mark 0.6s var(--lp-ease) 0.45s both;
  }
  .sheet.run .hl.two {
    animation: lp-mark 0.6s var(--lp-ease) 1.05s both;
  }
  .sheet.run .thread .line {
    animation: lp-draw 0.8s var(--lp-ease) 1.6s both;
  }
  .sheet.run .thread .end {
    animation: lp-fade 0.4s var(--lp-ease) 1.55s both;
  }
  .sheet.run .pill {
    animation: lp-settle 0.5s var(--lp-ease) 2.3s both;
  }
  .sheet.run .check {
    animation: lp-fade 0.6s var(--lp-ease) 2.5s both;
  }
  .sheet.held,
  .sheet.held * {
    animation-play-state: paused !important;
  }
  @keyframes lp-rise {
    from {
      transform: translateY(8px);
    }
  }
  @keyframes lp-mark {
    from {
      background-size: 0% 0.55em;
    }
  }
  @keyframes lp-draw {
    from {
      transform: scaleX(0);
    }
  }
  @keyframes lp-fade {
    from {
      opacity: 0.25;
    }
  }
  @keyframes lp-settle {
    from {
      transform: scale(0.94);
      opacity: 0.5;
    }
  }

  /* Editorial sections share one rhythm: more space above a heading than below it. */
  main {
    display: grid;
  }
  .intro {
    display: grid;
    grid-template-columns: minmax(0, 7fr) minmax(0, 4fr);
    gap: 40px clamp(40px, 6vw, 110px);
    align-items: end;
    padding: calc(var(--lp-section) * 1.15) 0 calc(var(--lp-section) * 0.6);
  }
  .rufina {
    font-family: "Rufina", Georgia, serif;
    font-weight: 400;
    font-size: clamp(40px, 4vw, 64px);
    line-height: 1.04;
    letter-spacing: -0.02em;
    color: var(--lp-forest);
    text-wrap: balance;
  }
  .intro-lead {
    max-width: 34em;
    margin-top: 22px;
    font-size: 19px;
    line-height: 1.6;
  }
  .intro-aside {
    font-size: 15.5px;
    color: var(--lp-muted);
    padding-top: 18px;
    border-top: 1px solid var(--lp-line);
  }
  .headline {
    font-family: "Caslon Display", Georgia, serif;
    font-weight: 400;
    font-size: clamp(42px, 4.2vw, 64px);
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: var(--lp-forest);
    text-wrap: balance;
  }
  .section-head {
    display: grid;
    grid-template-columns: minmax(0, 7fr) minmax(0, 4fr);
    gap: 24px clamp(40px, 6vw, 110px);
    align-items: end;
    margin-bottom: 52px;
  }
  .section-head p {
    font-size: 16.5px;
    color: var(--lp-muted);
  }

  /* The gathering: four sources around one statement, drawn as a case-wide thread. */
  .gather {
    padding-bottom: var(--lp-section);
  }
  .desk {
    position: relative;
    container-type: inline-size;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    aspect-ratio: 1200 / 560;
  }
  .wires {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .wire {
    fill: none;
    stroke-width: 1.5;
    stroke-dasharray: 1;
  }
  .wire.suggested {
    stroke-dasharray: 0.012 0.01;
  }
  .wire[data-rel="conflicts"] {
    stroke: var(--lp-rel-conflicts);
  }
  .wire[data-rel="context"] {
    stroke: var(--lp-rel-context);
  }
  .wire[data-rel="related"] {
    stroke: var(--lp-rel-related);
  }
  .wire-label {
    position: absolute;
    transform: translate(-50%, -50%);
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--lp-bg);
    font-size: clamp(11px, 1cqi, 12.5px);
    font-weight: 600;
  }
  .wire-label[data-rel="conflicts"],
  .slip-rel[data-rel="conflicts"] {
    color: var(--lp-rel-conflicts-text);
  }
  .wire-label[data-rel="context"],
  .slip-rel[data-rel="context"] {
    color: var(--lp-rel-context-text);
  }
  .wire-label[data-rel="related"],
  .slip-rel[data-rel="related"] {
    color: var(--lp-rel-related-text);
  }
  .slip {
    position: absolute;
    display: grid;
    align-content: start;
    gap: 0.5cqi;
    padding: 1.15cqi 1.35cqi;
    border-radius: 6px;
    background-color: var(--lp-paper);
    background-image: url("../../../../apps/web/static/images/ivory-paper.webp");
    background-size: 600px 600px;
    box-shadow:
      0 1px 0 rgb(17 28 22 / 0.06),
      0 10px 24px rgb(20 40 30 / 0.1);
    transform: rotate(var(--fr, 0deg));
    /* A transparent edge lets the browser smooth the outline of a turned slip. */
    outline: 1px solid transparent;
  }
  .slip-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: clamp(11px, 1.02cqi, 13px);
    font-weight: 600;
    color: var(--lp-muted);
  }
  .slip-text {
    font-size: clamp(12.5px, 1.24cqi, 15px);
    line-height: 1.45;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .slip mark,
  .t-text mark,
  .page-sheet mark {
    /* A gradient, so a scene can lay the mark across the phrase; --lp-amber-wash, written out. */
    background: linear-gradient(rgb(233 191 124 / 0.42), rgb(233 191 124 / 0.42)) no-repeat 0 0 / 100% 100%;
    color: inherit;
    padding: 0 2px;
    border-radius: 2px;
  }
  .slip-rel {
    display: none;
    font-size: 12.5px;
    font-weight: 600;
  }
  .statement {
    left: 35.83%;
    top: 35.7%;
    width: 28.33%;
    height: 28.57%;
    align-content: center;
    background: var(--lp-forest);
    background-image: none;
    color: var(--lp-cream);
    --fr: 0deg;
  }
  .statement .slip-meta {
    color: rgb(246 240 228 / 0.72);
  }
  .statement-text {
    font-family: "Caslon Display", Georgia, serif;
    font-size: clamp(18px, 2.3cqi, 28px);
    line-height: 1.2;
  }
  .bap {
    left: 3.33%;
    top: 7.14%;
    width: 26.67%;
    height: 23.2%;
    --fr: -0.8deg;
  }
  .log {
    left: 5%;
    top: 69.6%;
    width: 26.67%;
    height: 23.2%;
    --fr: 0.6deg;
  }
  .shift {
    left: 70%;
    top: 8.9%;
    width: 26.67%;
    height: 23.2%;
    --fr: 0.7deg;
  }
  .law {
    left: 68.33%;
    top: 67.9%;
    width: 26.67%;
    height: 23.2%;
    --fr: -0.6deg;
  }
  .legend {
    margin-top: 22px;
    text-align: center;
    font-size: 13px;
    color: var(--lp-muted);
  }

  /* How it works: ruled rows that pair a caption with one product moment on forest cloth. */
  .how {
    padding: var(--lp-section) 0;
    border-top: 1px solid var(--lp-line);
  }
  .steps {
    display: grid;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .step {
    display: grid;
    grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
    gap: clamp(32px, 5vw, 88px);
    align-items: center;
    padding: 44px 0;
    border-top: 1px solid var(--lp-line);
  }
  .step.flip .caption {
    order: 2;
  }
  .step.flip {
    grid-template-columns: minmax(0, 7fr) minmax(0, 4fr);
  }
  .caption h3 {
    font-family: "Caslon Display", Georgia, serif;
    font-weight: 400;
    font-size: 33px;
    line-height: 1.2;
    color: var(--lp-forest);
  }
  .caption p {
    max-width: 30em;
    margin-top: 14px;
    font-size: 16px;
    color: #3d4a41;
  }
  .plate {
    display: grid;
    place-items: end center;
    min-height: 360px;
    padding: 56px clamp(20px, 4vw, 64px) 0;
    border-radius: 22px;
    overflow: hidden;
    background-color: var(--lp-forest-deep);
    background-image: url("../assets/case-cloth.webp");
    background-repeat: repeat;
    background-size: 1300px auto;
  }
  .vignette {
    position: relative;
    display: grid;
    gap: 12px;
    width: min(100%, 480px);
    padding: 22px 24px 34px;
    border-radius: 9px 9px 0 0;
    box-shadow: 0 -10px 34px rgb(3 14 9 / 0.32);
  }
  .v-sample {
    position: absolute;
    right: 14px;
    bottom: 9px;
    font-size: 11px;
    font-weight: 600;
    color: var(--lp-muted);
  }
  .v-line {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .v-line.quiet {
    opacity: 0.62;
  }
  .v-name {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--tone, var(--lp-ink));
  }
  .v-listening {
    font-weight: 500;
    color: var(--lp-muted);
  }
  .v-line p {
    font-size: 14px;
  }
  .v-said {
    font-family: "Caslon Display", Georgia, serif;
    font-size: 26px !important;
    line-height: 1.2;
  }
  .v-head {
    font-size: 13px;
    font-weight: 600;
    color: var(--lp-muted);
  }
  .reading ul {
    display: grid;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .reading li {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    border-top: 1px solid rgb(17 28 22 / 0.1);
    font-size: 14px;
  }
  .v-pages {
    font-size: 12.5px;
    color: var(--lp-muted);
    font-variant-numeric: tabular-nums;
  }
  .v-state {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--lp-sage-ink);
  }
  .examine .pill {
    justify-self: start;
  }
  .v-title {
    font-family: "Caslon Display", Georgia, serif;
    font-size: 23px;
    line-height: 1.25;
  }
  .v-sub {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--lp-muted);
  }
  .v-checks {
    display: grid;
    gap: 6px;
    margin: -4px 0 0;
    padding-left: 18px;
    font-size: 14px;
  }
  .v-question {
    font-family: "Caslon Display", Georgia, serif;
    font-size: 19px;
    line-height: 1.3;
  }

  /* Signal: a transcript where almost everything stays quiet. */
  .signal {
    padding: var(--lp-section) 0;
    border-top: 1px solid var(--lp-line);
  }
  .transcript {
    width: 100%;
    margin: 0 auto;
    padding: 10px clamp(18px, 3vw, 36px) 16px;
    max-width: 980px;
    border-radius: 10px;
    box-shadow: 0 1px 0 rgb(17 28 22 / 0.05);
  }
  .t-list {
    display: grid;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .panel-sample {
    padding-top: 10px;
    border-top: 1px solid rgb(17 28 22 / 0.1);
    font-size: 12px;
    font-weight: 600;
    color: var(--lp-muted);
  }
  .t-row {
    display: grid;
    grid-template-columns: 150px minmax(0, 1fr) auto;
    gap: 6px 22px;
    align-items: baseline;
    padding: 16px 0;
    border-top: 1px solid rgb(17 28 22 / 0.1);
  }
  .t-row:first-child {
    border-top: 0;
  }
  .t-who {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--lp-muted);
  }
  .t-text {
    font-size: 16px;
    color: #4a554d;
  }
  .t-ok {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12.5px;
    color: var(--lp-sage-ink);
    white-space: nowrap;
  }
  .t-row.raised .t-who,
  .t-row.raised .t-text {
    color: var(--lp-ink);
  }
  .t-row.raised .t-text {
    font-family: "Caslon Display", Georgia, serif;
    font-size: 23px;
    line-height: 1.3;
  }
  .t-row .pill {
    justify-self: start;
  }
  .t-note {
    grid-column: 2 / -1;
    font-size: 14px;
    color: var(--lp-rel-conflicts-text);
  }

  /* The page: a real-looking source document; Jude's note stays in the margin, outside the record. */
  /* Not .spread or .page: the PDF.js viewer stylesheet is global and styles both names. */
  .page-spread {
    padding: var(--lp-section) 0;
    border-top: 1px solid var(--lp-line);
  }
  .spread-text {
    display: grid;
    gap: 10px;
  }
  .spread-text .quiet {
    font-size: 14px;
  }
  .page-row {
    display: grid;
    grid-template-columns: minmax(0, 720px) minmax(240px, 300px);
    gap: 0;
  }
  .page-sheet {
    --page-pad: clamp(28px, 5vw, 68px);
    position: relative;
    padding: clamp(36px, 5vw, 60px) var(--page-pad) 56px;
    font-family: var(--lp-doc);
    font-size: 14px;
    line-height: 1.7;
    box-shadow:
      0 1px 0 rgb(17 28 22 / 0.06),
      0 24px 50px rgb(20 40 30 / 0.12);
  }
  .page-folio {
    position: absolute;
    top: 20px;
    right: 28px;
    font-size: 12px;
    color: var(--lp-muted);
  }
  .page-heading {
    text-align: center;
    font-weight: 600;
    letter-spacing: 0.08em;
  }
  .page-heading + .page-heading {
    margin-bottom: 18px;
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  .page-intro {
    margin-bottom: 14px;
    text-align: justify;
    hyphens: auto;
  }
  .page-items {
    display: grid;
    gap: 12px;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .page-items li {
    display: grid;
    grid-template-columns: 26px minmax(0, 1fr);
  }
  .page-qa {
    position: relative;
  }
  .page-tag {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .margin-note {
    display: grid;
    justify-items: start;
    gap: 6px;
    padding: 12px 14px;
    border-radius: 6px;
    background: #fffdf8;
    border: 1px solid rgb(181 117 57 / 0.4);
    font-family: "Manrope", sans-serif;
    font-size: 13.5px;
    line-height: 1.5;
    color: var(--lp-ink);
  }
  /* Hangs beside the highlighted answer, joined to it by a fine rule. */
  .in-margin {
    position: absolute;
    top: 2.6em;
    left: calc(100% + var(--page-pad) + 32px);
    width: 250px;
  }
  .in-margin::before {
    content: "";
    position: absolute;
    top: 18px;
    right: 100%;
    width: calc(var(--page-pad) + 32px);
    border-top: 1px solid var(--lp-rel-conflicts);
  }
  .below-page {
    display: none;
  }
  .page-sample {
    position: absolute;
    left: var(--page-pad);
    bottom: 18px;
    font-family: "Manrope", sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: var(--lp-muted);
  }

  /* Approach: principles as ruled rows, not cards. */
  .approach {
    padding: var(--lp-section) 0;
    border-top: 1px solid var(--lp-line);
  }
  .principles {
    display: grid;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .principles li {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
    gap: 16px clamp(40px, 6vw, 110px);
    padding: 30px 0;
    border-top: 1px solid var(--lp-line);
  }
  .principles h3 {
    font-family: "Caslon Display", Georgia, serif;
    font-weight: 400;
    font-size: 30px;
    line-height: 1.2;
    color: var(--lp-forest);
  }
  .principles p {
    max-width: 36em;
    font-size: 16px;
    color: #3d4a41;
  }

  /* Closing: the case file again, as the back cover. */
  .closing {
    padding: 0 14px;
  }
  .closing-frame {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 400px);
    gap: 40px clamp(40px, 6vw, 96px);
    align-items: end;
    padding: 0 max(5%, 28px);
    border-radius: 28px;
    overflow: hidden;
    background-color: var(--lp-forest-deep);
    background-image: url("../assets/case-cloth.webp");
    background-repeat: repeat;
    background-size: 1300px auto;
    color: var(--lp-cream);
  }
  .closing-copy {
    display: grid;
    justify-items: start;
    gap: 22px;
    align-self: center;
    padding: clamp(64px, 9vw, 120px) 0;
  }
  .closing-slip {
    position: relative;
    display: grid;
    justify-items: start;
    gap: 12px;
    margin-top: 56px;
    padding: 24px 26px 40px;
    border-radius: 9px 9px 0 0;
    box-shadow: 0 -10px 34px rgb(3 14 9 / 0.32);
  }
  .closing-done {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--lp-sage-ink);
  }
  .closing .headline {
    color: var(--lp-cream);
    max-width: 14em;
  }
  .closing-copy > p {
    max-width: 30em;
    font-size: 19px;
    color: rgb(246 240 228 / 0.88);
  }
  .closing .actions {
    margin-top: 8px;
  }

  .foot {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    gap: 28px 60px;
    padding: 56px 0 72px;
  }
  .foot-mark {
    display: inline-block;
    font-size: 43px;
    color: var(--lp-forest);
    margin-bottom: 8px;
  }
  .foot p {
    font-size: 14px;
    color: var(--lp-muted);
  }
  .foot-notes {
    display: grid;
    gap: 8px;
    align-content: start;
  }
  .foot-notes p:first-child {
    color: var(--lp-ink);
  }

  /*
   * Scroll-driven scenes, only once the script sets .scrolly (motion welcome). On .pinned screens
   * each scene is a tall track whose stage stays put while its progress moves the material; every
   * value falls back to the finished state, which is also the static page.
   */
  .plate-bg,
  .step-rule {
    display: none;
  }
  .scrolly .sheet {
    translate: 0 calc(var(--hv, 0) * -64px);
  }
  .scrolly .opening {
    translate: 0 calc(var(--hv, 0) * -28px);
    opacity: calc(1 - var(--hv, 0) * 0.5);
  }
  /* The finding's slip rises from the band's edge, then is checked. */
  .scrolly .closing-slip {
    transform: translateY(calc((1 - var(--cs, 1)) * 85%));
  }
  .scrolly .closing-done {
    opacity: var(--ck, 1);
    transform: translateY(calc((1 - var(--ck, 1)) * 6px));
  }

  .pinned .gather-scene {
    height: 280vh;
  }
  .pinned .steps-scene {
    height: 270vh;
  }
  .pinned .signal-scene {
    height: 200vh;
  }
  .pinned .page-scene {
    height: 190vh;
  }
  .pinned .stage {
    position: sticky;
    top: 0;
    height: 100vh;
    display: grid;
    align-content: safe center;
  }

  /* The sources come out of the file one at a time, each threaded to the statement as it lands. */
  .pinned .statement {
    opacity: var(--g0, 1);
    transform: scale(calc(0.94 + 0.06 * var(--g0, 1)));
  }
  .pinned .source-slip {
    opacity: clamp(0, var(--k) * 1.6, 1);
    transform: translate(calc((1 - var(--k)) * var(--fx)), calc((1 - var(--k)) * var(--fy)))
      rotate(calc(var(--fr) + (1 - var(--k)) * var(--fs)));
  }
  .pinned .statement,
  .pinned .source-slip {
    will-change: transform, opacity;
  }
  .pinned .source-slip.bap {
    --k: var(--g1, 1);
    --fx: -34cqi;
    --fy: -9cqi;
    --fs: -9deg;
  }
  .pinned .source-slip.log {
    --k: var(--g2, 1);
    --fx: -36cqi;
    --fy: 11cqi;
    --fs: 7deg;
  }
  .pinned .source-slip.shift {
    --k: var(--g3, 1);
    --fx: 34cqi;
    --fy: -10cqi;
    --fs: 8deg;
  }
  .pinned .source-slip.law {
    --k: var(--g4, 1);
    --fx: 36cqi;
    --fy: 10cqi;
    --fs: -7deg;
  }
  .pinned [data-slip="bap"] {
    --w: var(--w1, 1);
  }
  .pinned [data-slip="log"] {
    --w: var(--w2, 1);
  }
  .pinned [data-slip="shift"] {
    --w: var(--w3, 1);
  }
  .pinned [data-slip="law"] {
    --w: var(--w4, 1);
  }
  .pinned .wire {
    stroke-dashoffset: calc(1 - var(--w));
  }
  .pinned .wire.suggested {
    stroke-dashoffset: 0;
    opacity: var(--w);
  }
  .pinned .wire-label {
    opacity: clamp(0, (var(--w) - 0.6) * 2.5, 1);
  }
  .pinned .legend {
    opacity: var(--gl, 1);
  }

  /* How it works: one plate; each step's paper rises from its edge while the last one sinks back. */
  .pinned .stage > .section-head {
    margin-bottom: 36px;
  }
  .pinned .steps-stage {
    display: grid;
    grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
    column-gap: clamp(32px, 5vw, 88px);
  }
  .pinned .plate-bg {
    display: block;
    grid-area: 1 / 2;
    border-radius: 22px;
    background-color: var(--lp-forest-deep);
    background-image: url("../assets/case-cloth.webp");
    background-repeat: repeat;
    background-size: 1300px auto;
  }
  .pinned .steps {
    grid-area: 1 / 1 / 2 / 3;
  }
  .pinned .step,
  .pinned .step.flip {
    grid-area: 1 / 1;
    grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
    align-items: stretch;
    padding: 0;
    border-top: 0;
  }
  .pinned .step.flip .caption {
    order: 0;
  }
  .pinned .step:nth-child(1) {
    --in: 1;
    --out: var(--h1o, 0);
  }
  .pinned .step:nth-child(2) {
    --in: var(--h2, 0);
    --out: var(--h2o, 0);
  }
  .pinned .step:nth-child(3) {
    --in: var(--h3, 0);
    --out: 0;
  }
  /* Captions hand over in turn (out, then in); the papers overlap as one sinks and the next rises. */
  .pinned .caption {
    align-self: center;
    opacity: calc(clamp(0, var(--in) * 2 - 1, 1) - clamp(0, var(--out) * 2, 1));
    transform: translateY(calc((1 - var(--in)) * 28px - var(--out) * 28px));
  }
  .pinned .plate {
    min-height: min(440px, 62vh);
    background: none;
  }
  .pinned .vignette {
    transform: translateY(calc((1 - var(--in)) * 112% + var(--out) * 112%));
    will-change: transform;
  }
  .pinned .step-rule {
    display: block;
    grid-area: 1 / 1;
    align-self: end;
    height: 1px;
    background: var(--lp-line);
  }
  .pinned .step-rule span {
    display: block;
    height: 100%;
    background: var(--lp-forest);
    transform: scaleX(var(--hp, 1));
    transform-origin: left center;
  }

  /* Signal: the hearing fills in line by line, then one line comes forward and the rest go quiet. */
  .pinned .t-row:nth-child(1) {
    --r: var(--r1, 1);
  }
  .pinned .t-row:nth-child(2) {
    --r: var(--r2, 1);
  }
  .pinned .t-row:nth-child(3) {
    --r: var(--r3, 1);
  }
  .pinned .t-row:nth-child(4) {
    --r: var(--r4, 1);
  }
  .pinned .t-row:nth-child(5) {
    --r: var(--r5, 1);
  }
  .pinned .t-row {
    opacity: calc(var(--r) * (1 - 0.14 * var(--fw, 1)));
    transform: translateY(calc((1 - var(--r)) * 14px));
  }
  .pinned .t-row.raised {
    position: relative;
    opacity: var(--r);
    transform: translateY(calc((1 - var(--r)) * 14px)) scale(calc(1 + 0.018 * var(--fw, 1)));
    transform-origin: 0 50%;
  }
  .pinned .t-row.raised::before {
    content: "";
    position: absolute;
    inset: 4px -16px;
    z-index: -1;
    border-radius: 8px;
    background: #fffdf8;
    box-shadow: 0 10px 28px rgb(20 40 30 / 0.12);
    opacity: var(--fw, 1);
  }
  .pinned .t-row.raised mark {
    background-size: calc(var(--mk, 1) * 100%) 100%;
  }
  .pinned .t-row.raised .pill,
  .pinned .t-row.raised .t-note {
    opacity: var(--nt, 1);
    transform: translateY(calc((1 - var(--nt, 1)) * 8px));
  }

  /* The page is laid down, the exact phrase is marked, then the note is pinned beside it. */
  .pinned .page-sheet {
    opacity: calc(0.2 + 0.8 * var(--pg, 1));
    transform: translateY(calc((1 - var(--pg, 1)) * 90px)) rotate(calc((1 - var(--pg, 1)) * -1.4deg));
    will-change: transform, opacity;
  }
  .pinned .page-sheet mark {
    background-size: calc(var(--hl, 1) * 100%) 100%;
  }
  .pinned .in-margin,
  .pinned .below-page {
    opacity: var(--nt, 1);
    transform: translateX(calc((1 - var(--nt, 1)) * 28px));
  }
  .pinned .in-margin::before {
    transform: scaleX(var(--rl, 1));
    transform-origin: left center;
  }

  /*
   * The showpiece: a desk of case papers, dropped every which way and shown off at an angle. Jude
   * reads them: a light passes over the desk and every time a paper mentions glints as it goes by;
   * the three lines about the witness's arrival stay lit, their papers lift, threads tie them
   * together, and beside the desk the same lines come forward flat and readable, then the finding.
   * Anything meant to be read faces the reader; only the papers are at an angle. Scroll scrubs it
   * and scrolling back undoes it. Static (no script, reduced motion): the finished desk.
   */
  .showcase {
    padding: 0 14px;
  }
  .show-scene {
    border-radius: 28px;
    background-color: var(--lp-forest-deep);
    background-image: url("../assets/case-cloth.webp");
    background-repeat: repeat;
    background-size: 1300px auto;
    color: var(--lp-cream);
    overflow: clip;
  }
  .show-stage {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
    align-items: center;
    gap: 24px clamp(20px, 3.4vw, 56px);
    padding: clamp(56px, 7vw, 88px) max(4%, 24px);
  }
  .show-copy {
    grid-area: 1 / 1;
    display: grid;
    align-content: center;
    gap: 16px;
    max-width: 31em;
  }
  .show-head {
    display: grid;
    gap: 14px;
  }
  .show-head .headline {
    font-size: clamp(38px, 3.4vw, 54px);
    color: var(--lp-cream);
  }
  .show-lead {
    font-size: 16.5px;
    line-height: 1.6;
    color: rgb(246 240 228 / 0.84);
  }
  .show-status {
    display: none;
  }
  .scrolly .show-status {
    display: grid;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--lp-accent);
  }
  .show-status > span {
    grid-area: 1 / 1;
  }
  .st-cue {
    opacity: clamp(0, calc(1 - var(--sc, 1) * 6), 1);
  }
  .st-read {
    opacity: calc(clamp(0, calc(var(--sc, 1) * 8), 1) * (1 - var(--fd, 1)));
  }
  .st-linked {
    opacity: var(--fd, 1);
  }
  .show-lines {
    display: grid;
    gap: 9px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .show-lines li,
  .show-finding {
    border-radius: 9px;
    background-color: var(--lp-paper);
    background-image: url("../../../../apps/web/static/images/ivory-paper.webp");
    background-size: 600px 600px;
    color: var(--lp-ink);
    box-shadow: 0 10px 26px rgb(3 14 9 / 0.3);
  }
  .show-lines li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 3px 11px;
    padding: 10px 14px 11px 11px;
  }
  .sl-n {
    grid-row: span 2;
    display: grid;
    place-items: center;
    width: 23px;
    height: 23px;
    border-radius: 50%;
    background-color: var(--lp-rel-conflicts);
    color: #fffaf0;
    font: 700 12px / 1 "Manrope", sans-serif;
  }
  .sl-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font: 600 12.5px / 1.35 "Manrope", sans-serif;
    color: #4f584f;
  }
  .sl-text {
    font: 400 15px / 1.45 "Manrope", sans-serif;
  }
  .sl-text.typed {
    font-family: var(--lp-doc);
    font-size: 13.5px;
    line-height: 1.5;
  }
  .sl-text mark {
    padding: 0 2px;
    border-radius: 2px;
    background-color: rgb(233 191 124 / 0.55);
    color: inherit;
  }
  /* The lines come forward one by one, in the order they are numbered on the desk. */
  .scrolly .show-lines li {
    --in: clamp(0, calc(var(--co, 1) * 2.4 - var(--k) * 0.7), 1);
    opacity: var(--in);
    translate: calc((1 - var(--in)) * -16px) 0;
  }
  .show-finding {
    grid-area: 1 / 2;
    align-self: end;
    justify-self: start;
    position: relative;
    z-index: 2;
    display: grid;
    justify-items: start;
    gap: 7px;
    width: min(390px, 62%);
    margin: 0 0 clamp(28px, 7vh, 72px) 1%;
    padding: 13px 16px 14px;
    box-shadow: 0 16px 36px rgb(3 14 9 / 0.42);
  }
  .show-finding .pill {
    font-family: "Manrope", sans-serif;
  }
  .sf-title {
    font-family: "Caslon Display", Georgia, serif;
    font-size: 21px;
    line-height: 1.2;
  }
  .sf-ask {
    display: grid;
    gap: 2px;
    font-family: "Caslon Display", Georgia, serif;
    font-size: 16px;
    line-height: 1.3;
    color: #2a3a31;
  }
  .sf-ask span {
    font: 600 12px / 1.35 "Manrope", sans-serif;
    color: #4f584f;
  }
  .scrolly .show-finding {
    opacity: var(--fs, 1);
    translate: 0 calc((1 - var(--fs, 1)) * 14px);
  }
  .show-sample {
    font-size: 12.5px;
    font-weight: 600;
    color: rgb(246 240 228 / 0.6);
  }

  /* The desk, in its own 1000 × 640 space; sizes inside it follow its width (cqi). */
  .tb-wrap {
    grid-area: 1 / 2;
    position: relative;
    container-type: inline-size;
    perspective: 1500px;
    perspective-origin: 50% 0%;
  }
  .tb {
    /* The desk tilts into view and turns a little as the section passes. */
    --rx: calc(20 + 26 * var(--si, 1));
    --rz: calc(-12 + 9 * var(--orb, 1));
    /* Where the reading light is across the desk, from 0 (left edge) to 1 (right edge). */
    --s: calc(var(--sc, 1) * 1.3 - 0.15);
    position: relative;
    aspect-ratio: 1000 / 640;
    border-radius: 2cqi;
    transform-style: preserve-3d;
    transform: translateY(calc((1 - var(--si, 1)) * 14cqi)) rotateX(calc(var(--rx) * 1deg)) rotateZ(calc(var(--rz) * 1deg));
    background-color: #102b21;
    background-image: url("../assets/case-cloth.webp");
    background-size: 900px auto;
    box-shadow:
      inset 0 0 0 1px rgb(246 240 228 / 0.08),
      inset 0 0 8cqi rgb(2 10 6 / 0.6),
      0 3cqi 7cqi rgb(2 10 6 / 0.5);
  }
  .tb-paper {
    /* Each paper's own fall, one after another; the ones that belong together lift at the end. */
    --pd: clamp(0, calc(var(--dr, 1) * 1.9 - var(--i) * 0.16), 1);
    --lift: 0px;
    position: absolute;
    display: grid;
    align-content: start;
    gap: 0.6cqi;
    padding: 2cqi 2.2cqi;
    border-radius: 0.35cqi;
    background-color: var(--lp-paper);
    background-image: url("../../../../apps/web/static/images/ivory-paper.webp");
    background-size: 600px 600px;
    color: #1d2a22;
    font-size: 1.05cqi;
    line-height: 1.45;
    overflow: hidden;
    transform: translateZ(calc(var(--i) * 0.5px + var(--lift) + (1 - var(--pd)) * 30cqi)) rotateZ(calc(var(--r) + (1 - var(--pd)) * 16deg));
    opacity: calc(var(--pd) * (1 - 0.45 * var(--fd, 1)));
    box-shadow: 0 0.5cqi 1.4cqi rgb(3 14 9 / 0.38);
  }
  .tb-paper.key {
    --lift: calc(var(--fd, 1) * 2.4cqi);
    opacity: var(--pd);
    box-shadow: 0 1.6cqi 3cqi rgb(3 14 9 / 0.45);
  }
  .pp-folio {
    position: absolute;
    top: 1.4cqi;
    right: 1.8cqi;
    font-family: var(--lp-doc);
    font-size: 0.9cqi;
    color: #6b6f63;
  }
  .pp-heading,
  .pp-head {
    font-family: var(--lp-doc);
    font-weight: 700;
    font-size: 1.05cqi;
    letter-spacing: 0.06em;
  }
  .pp-heading {
    text-align: center;
  }
  .pp-heading + .pp-heading {
    text-decoration: underline;
    text-underline-offset: 0.3cqi;
  }
  .pp-sub {
    font-size: 0.95cqi;
    color: #5d655c;
  }
  .pp-typed {
    font-family: var(--lp-doc);
    font-size: 1cqi;
  }
  .pp-intro {
    margin-top: 1cqi;
  }
  .pp-key {
    position: absolute;
    left: 4.2cqi;
    right: 2.2cqi;
    top: 66%;
  }
  .pp-lines {
    display: grid;
    gap: 1cqi;
    margin-top: 1cqi;
  }
  .pp-lines i {
    height: 0.5cqi;
    border-radius: 0.2cqi;
    background-color: rgb(17 28 22 / 0.14);
  }
  .pp-lines i:nth-child(3n) {
    width: 72%;
  }
  .pp-wave {
    display: flex;
    align-items: center;
    gap: 0.3cqi;
    height: 3cqi;
  }
  .pp-wave i {
    flex: 1;
    height: calc(var(--h) * 9%);
    border-radius: 0.2cqi;
    background-color: rgb(22 56 43 / 0.4);
  }
  .pp-line {
    color: #4a564d;
  }
  .pp-line b {
    font-weight: 700;
    color: #1d2a22;
  }
  .p-talk .pp-key {
    color: #1d2a22;
  }
  .pp-row {
    position: absolute;
    left: 2.2cqi;
    right: 2.2cqi;
    display: flex;
    align-items: baseline;
    gap: 1.6cqi;
  }
  .p-roster .pp-row {
    top: calc(38% + var(--row) * 17%);
    justify-content: space-between;
    font-size: 1.1cqi;
  }
  .p-log .pp-row {
    top: calc(44% + var(--row) * 16%);
    left: 4.2cqi;
  }
  .p-log .pp-row span:last-child {
    margin-left: auto;
  }
  .p-cctv {
    padding: 0;
  }
  .cc-frame {
    position: absolute;
    inset: 0.9cqi;
    border-radius: 0.2cqi;
    background: linear-gradient(160deg, #3a4540, #1b2420 60%, #101614);
    overflow: hidden;
  }
  .cc-frame::before {
    content: "";
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(0deg, rgb(255 255 255 / 0.05) 0 1px, transparent 1px 3px);
  }
  .cc-cam,
  .cc-stamp {
    position: absolute;
    font-family: var(--lp-doc);
    font-size: 0.9cqi;
    letter-spacing: 0.04em;
    color: rgb(232 238 232 / 0.86);
  }
  .cc-cam {
    left: 1cqi;
    bottom: 0.8cqi;
  }
  .cc-stamp {
    right: 1cqi;
    top: 0.8cqi;
  }
  /* A time on a paper: it glints as the reading light passes and fades again, unless it belongs
     with the testimony, in which case it stays lit. */
  .tb-c {
    position: relative;
    padding: 0 0.15em;
    background: none;
    color: inherit;
  }
  .tb-c::before {
    --d: calc(var(--s) - var(--mx));
    content: "";
    position: absolute;
    inset: -0.1em -0.05em;
    z-index: -1;
    border-radius: 0.2em;
    background-color: rgb(233 191 124);
    opacity: clamp(0, calc(1 - max(var(--d), calc(var(--d) * -1)) * 7), 1);
    will-change: opacity;
  }
  .tb-c.key::before {
    opacity: clamp(0, calc(1 + var(--d) * 7), 1);
  }
  .cc-stamp.tb-c {
    position: absolute;
  }
  .tb-light {
    position: absolute;
    top: -6%;
    bottom: -6%;
    left: -20%;
    width: 40%;
    pointer-events: none;
    background: linear-gradient(90deg, rgb(255 238 200 / 0), rgb(255 238 200 / 0.12) 40%, rgb(255 240 210 / 0.3) 50%, rgb(255 238 200 / 0.12) 60%, rgb(255 238 200 / 0));
    transform: translateZ(4cqi) translateX(calc(var(--s) * 250%));
    opacity: clamp(0, calc(min(var(--sc, 1), 1 - var(--sc, 1)) * 10), 1);
  }
  .tb-threads {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
    transform: translateZ(3.2cqi);
  }
  .tb-threads path {
    --tp: clamp(0, calc(var(--th, 1) * 1.8 - var(--k) * 0.8), 1);
    fill: none;
    stroke: rgb(233 191 124);
    stroke-width: 3.2;
    stroke-linecap: round;
    stroke-dasharray: 1;
    stroke-dashoffset: calc(1 - var(--tp));
  }
  /* The numbers stand up off the paper to face the reader, matching the lines beside the desk. */
  .tb-pin {
    position: absolute;
    display: grid;
    place-items: center;
    width: 3.4cqi;
    height: 3.4cqi;
    margin: -1.7cqi 0 0 -1.7cqi;
    border-radius: 50%;
    background-color: var(--lp-rel-conflicts);
    color: #fffaf0;
    font: 700 1.7cqi / 1 "Manrope", sans-serif;
    box-shadow:
      0 0 0 0.4cqi rgb(255 250 240 / 0.92),
      0 0.6cqi 1.4cqi rgb(3 14 9 / 0.4);
    transform: translateZ(4.4cqi) rotateZ(calc(var(--rz) * -1deg)) rotateX(calc(var(--rx) * -1deg)) scale(var(--fd, 1));
    opacity: var(--fd, 1);
  }
  .pinned .show-scene {
    height: 340vh;
  }
  .pinned .show-stage {
    padding-block: 0;
  }
  .pinned .tb {
    will-change: transform;
  }

  /* Narrow or short screens: no pinning; each piece moves with its own pass through the view. */
  .scrolly:not(.pinned) .slip[data-rise] {
    opacity: calc(0.15 + 0.85 * var(--p, 1));
    transform: translateX(calc((1 - var(--p, 1)) * var(--from, -24px)));
  }
  .scrolly:not(.pinned) .shift[data-rise],
  .scrolly:not(.pinned) .law[data-rise] {
    --from: 24px;
  }
  .scrolly:not(.pinned) .plate[data-rise] .vignette {
    transform: translateY(calc((1 - var(--p, 1)) * 70%));
  }
  .scrolly:not(.pinned) .t-row[data-rise] {
    opacity: calc(0.2 + 0.8 * var(--p, 1));
    transform: translateX(calc((1 - var(--p, 1)) * -16px));
  }
  .scrolly:not(.pinned) .t-row.raised[data-rise] mark,
  .scrolly:not(.pinned) mark[data-rise] {
    background-size: calc(var(--p, 1) * 100%) 100%;
  }
  .scrolly:not(.pinned) .below-page[data-rise] {
    opacity: calc(0.15 + 0.85 * var(--p, 1));
    transform: translateX(calc((1 - var(--p, 1)) * 20px));
  }

  @media (min-width: 1600px) {
    .opening {
      padding-top: 110px;
      padding-bottom: 120px;
    }
  }
  @media (max-width: 1100px) {
    .page-row {
      grid-template-columns: 1fr;
      gap: 14px;
    }
    .in-margin {
      display: none;
    }
    .below-page {
      display: grid;
      max-width: 520px;
    }
    .links {
      gap: 18px;
    }
    .display {
      font-size: 7vw;
    }
    .sheet {
      width: 90%;
    }
  }
  @media (max-width: 960px) {
    .links,
    .nav > .lang,
    .nav-action {
      display: none;
    }
    .menu-toggle {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 7px;
      border: 1px solid rgb(246 240 228 / 0.6);
      color: var(--lp-cream);
    }
    .menu {
      position: absolute;
      z-index: 20;
      top: 88px;
      right: 0;
      display: grid;
      min-width: 260px;
      padding: 10px;
      border-radius: 10px;
      background: var(--lp-forest);
      box-shadow: 0 18px 40px rgb(3 14 9 / 0.4);
    }
    .menu > button,
    .menu > a {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 48px;
      padding: 8px 12px;
      border-radius: 6px;
      color: var(--lp-cream);
      text-decoration: none;
      font-size: 16px;
    }
    .menu > button:hover,
    .menu > a:hover {
      background: rgb(246 240 228 / 0.08);
    }
    .menu-lang {
      justify-self: start;
      margin: 8px 12px 4px;
    }
  }
  @media (max-width: 899px) {
    .show-stage {
      grid-template-columns: 1fr;
      padding: 56px 20px 60px;
    }
    /* One column: the copy, the desk, then the lines and the finding. */
    .show-copy {
      display: contents;
    }
    .show-head {
      order: 1;
    }
    .show-status {
      order: 2;
    }
    .tb-wrap {
      order: 3;
      grid-area: auto;
      margin-block: 6px;
    }
    .show-lines {
      order: 4;
    }
    .show-finding {
      order: 5;
      grid-area: auto;
      justify-self: stretch;
      width: auto;
      margin: 0;
    }
    .show-sample {
      order: 6;
    }
    .sl-text {
      font-size: 14px;
    }
    .sl-text.typed {
      font-size: 12.5px;
    }
    .sf-title {
      font-size: 19px;
    }
    .show-head .headline {
      font-size: clamp(32px, 8.6vw, 40px);
    }
    /* Pinned on a phone: the copy yields to the desk, the lines rise below it, and the finding
       takes their place. */
    .show-pin .show-scene {
      height: 320svh;
    }
    .show-pin .show-stage {
      position: sticky;
      top: 0;
      height: 100svh;
      grid-template-rows: auto minmax(0, 1fr) auto;
      align-items: start;
      gap: 10px;
      padding: 44px 18px 18px;
    }
    .show-pin .show-head,
    .show-pin .show-status {
      grid-area: 1 / 1;
    }
    .show-pin .show-head {
      opacity: clamp(0, calc(1 - var(--sc, 1) * 5), 1);
    }
    .show-pin .show-status {
      align-self: end;
    }
    .show-pin .st-cue {
      display: none;
    }
    .show-pin .st-read {
      opacity: calc(clamp(0, calc(var(--sc, 1) * 8 - 2), 1) * (1 - var(--fd, 1)));
    }
    .show-pin .tb-wrap {
      grid-area: 2 / 1;
      align-self: center;
      margin: 0;
    }
    .show-pin .show-lines,
    .show-pin .show-finding {
      grid-area: 3 / 1;
    }
    .show-pin .show-lines {
      gap: 7px;
      opacity: calc(1 - var(--fs, 1));
    }
    .show-pin .show-lines li {
      padding: 8px 12px 9px 9px;
    }
    .show-pin .sl-text {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .show-pin .show-sample {
      position: absolute;
      top: 16px;
      right: 18px;
    }
    .desk {
      aspect-ratio: auto;
      display: grid;
      gap: 12px;
    }
    .wires,
    .wire-label {
      display: none;
    }
    .slip {
      position: static;
      width: auto !important;
      height: auto !important;
      padding: 14px 16px;
      gap: 6px;
      transform: none;
    }
    .slip-meta {
      font-size: 12.5px;
    }
    .slip-text {
      font-size: 15px;
      -webkit-line-clamp: unset;
      line-clamp: none;
    }
    .slip-rel {
      display: block;
    }
    .statement-text {
      font-size: 26px;
    }
  }
  /* Short phones, pinned: the headline alone, and tighter lines, so the desk keeps its room. */
  @media (max-width: 899px) and (max-height: 740px) {
    .show-pin .show-lead {
      display: none;
    }
    .show-pin .show-lines li {
      padding: 7px 10px 8px 8px;
    }
    .show-pin .sl-meta {
      font-size: 11.5px;
    }
    .show-pin .sl-text {
      font-size: 13px;
    }
    .show-pin .sl-text.typed {
      font-size: 12px;
    }
  }
  @media (max-width: 760px) {
    .lp {
      --lp-section: 55px;
    }
    .wrap {
      width: auto;
      margin-inline: 20px;
    }
    .cover {
      padding: 8px 8px 0;
    }
    .frame {
      border-radius: 18px 18px 0 0;
      padding: 0 20px;
    }
    .nav {
      min-height: 84px;
    }
    .wordmark {
      font-size: 47px;
    }
    .display {
      font-size: clamp(44px, 8.4vw, 63px);
      line-height: 1.03;
    }
    .lead {
      font-size: 17.5px;
      margin-top: 20px;
    }
    .actions {
      flex-direction: column;
      align-items: stretch;
    }
    .button {
      min-height: 50px;
      font-size: 21px;
    }
    .sheet {
      width: 100%;
      padding: 14px 18px 28px;
    }
    .compare {
      grid-template-columns: 1fr;
      gap: 22px;
    }
    .side,
    .side.earlier {
      padding: 0;
    }
    .finding {
      order: 3;
      justify-items: start;
      text-align: left;
      border: 0;
      border-top: 1px solid rgb(17 28 22 / 0.14);
      padding: 18px 0 0;
    }
    .thread {
      display: none;
    }
    .quote {
      font-size: 33px;
    }
    .quote.typed {
      font-size: 25px;
    }
    .source {
      min-height: 44px;
    }
    .intro,
    .section-head,
    .principles li {
      grid-template-columns: 1fr;
    }
    .page-row {
      grid-template-columns: 1fr;
      gap: 14px;
    }
    .in-margin {
      display: none;
    }
    .below-page {
      display: grid;
    }
    .page-intro {
      text-align: left;
      hyphens: manual;
    }
    .closing-frame {
      grid-template-columns: 1fr;
      gap: 0;
    }
    .closing-copy {
      padding: 56px 0 8px;
    }
    .closing-slip {
      margin-top: 32px;
    }
    .rufina {
      font-size: 42px;
    }
    .headline {
      font-size: 43px;
    }
    .step,
    .step.flip {
      grid-template-columns: 1fr;
      gap: 22px;
      padding: 32px 0;
    }
    .step.flip .caption {
      order: 0;
    }
    .caption h3 {
      font-size: 28px;
    }
    .plate {
      min-height: 0;
      padding: 32px 16px 0;
      border-radius: 16px;
    }
    .sheet-bar {
      flex-wrap: wrap;
      gap: 4px 12px;
    }
    .replay {
      margin-left: -10px;
    }
    .vignette {
      padding: 18px 18px 28px;
    }
    .reading li {
      grid-template-columns: 18px minmax(0, 1fr) auto;
    }
    .reading .v-pages {
      display: none;
    }
    .t-row {
      grid-template-columns: 1fr;
      gap: 4px;
    }
    .t-note {
      grid-column: 1;
    }
    .page-sheet {
      --page-pad: 22px;
      font-size: 13.5px;
      padding: 40px 22px 48px;
    }
    .closing {
      padding: 0 8px;
    }
    .closing-frame {
      border-radius: 18px;
      padding: 0 20px;
    }
    .foot {
      grid-template-columns: 1fr;
    }
    .foot-mark {
      font-size: 43px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .lp *,
    .lp *::before,
    .lp *::after {
      animation: none !important;
      transition: none !important;
    }
  }
</style>
