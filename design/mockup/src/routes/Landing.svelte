<script lang="ts">
  import { ArrowRight, Check, FileText, Menu as MenuIcon, RotateCcw, Scale, X } from "@lucide/svelte";
  import { onMount, tick } from "svelte";
  import caseFiles from "../../../../apps/web/static/images/jude-case-files.webp";
  import ivoryPaper from "../../../../apps/web/static/images/ivory-paper.webp";
  import { samplePage } from "../lib/data";
  import { t, type Key } from "../lib/i18n";
  import { prefs } from "../lib/prefs.svelte";
  import { go, href } from "../lib/router.svelte";

  /**
   * The front door, in the Editorial Case File world: the forest case-file cover frames the
   * opening, ivory source paper carries every demonstration, and the page reads like a well-made
   * brief, one idea per spread. Motion is finite: the comparison plays once (with a replay), the
   * sources gather once. Reduced motion, or no script, shows the finished state.
   */
  const motionOk = typeof matchMedia === "function" && !matchMedia("(prefers-reduced-motion: reduce)").matches;

  let menuOpen = $state(false);
  let menuButton: HTMLButtonElement | undefined = $state();
  let sheet: HTMLElement | undefined = $state();
  let desk: HTMLElement | undefined = $state();
  let playing = $state(false);
  let offscreen = $state(false);
  let hidden = $state(false);
  let gathered = $state(true);

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
    el?.scrollIntoView({ behavior: motionOk ? "smooth" : "auto", block: "start" });
    el?.focus({ preventScroll: true });
  }

  function closeMenu() {
    menuOpen = false;
    menuButton?.focus();
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
    // The sources gather once, the first time the desk comes into view on a wide screen.
    if (desk && matchMedia("(min-width: 900px)").matches && desk.getBoundingClientRect().top > innerHeight) {
      gathered = false;
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.intersectionRatio >= 0.35) {
            gathered = true;
            io.disconnect();
          }
        },
        { threshold: [0, 0.35] },
      );
      io.observe(desk);
      watchers.push(io);
    }
    const onVisibility = () => (hidden = document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      watchers.forEach((w) => w.disconnect());
      document.removeEventListener("visibilitychange", onVisibility);
    };
  });

  /** Splits a sentence around the phrase a source is about. */
  function around(text: string, mark: string) {
    const i = mark ? text.indexOf(mark) : -1;
    return i < 0 ? [text, "", ""] : [text.slice(0, i), mark, text.slice(i + mark.length)];
  }

  // Most of a hearing stays quiet; one line comes forward with its source.
  const quietLines: { who: Key; text: Key; matches: boolean }[] = [
    { who: "role.judge", text: "lp.t1", matches: true },
    { who: "role.witness", text: "lp.t2", matches: true },
    { who: "role.prosecutor", text: "lp.t3", matches: false },
  ];
  let raised = $derived(around(t("lp.t4"), t("lp.t4Mark")));

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

<div class="lp" style:--lp-case-files="url({caseFiles})" style:--lp-ivory="url({ivoryPaper})">
  <button class="skip" onclick={() => scrollToId("lp-main")}>{t("lp.skip")}</button>

  <header class="cover">
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
              <FileText size={15} />{t("lp.transcript")} · <span class="tabular">00:14:32</span>
            </button>
          </div>
          <div class="finding">
            <span class="pill">{t("status.potential_inconsistency")}</span>
            <svg class="thread" viewBox="0 0 240 16" preserveAspectRatio="none" aria-hidden="true">
              <circle cx="4" cy="8" r="3.5" />
              <path d="M8,8 C70,1 170,15 232,8" pathLength="1" />
              <circle cx="236" cy="8" r="3.5" />
            </svg>
            <p class="check">{t("lp.check")}</p>
          </div>
          <div class="side earlier">
            <h2 class="side-label">{t("lp.earlier")}</h2>
            <blockquote class="quote">“{t("lp.quote2")} <span class="hl two">{t("lp.time2")}</span>”</blockquote>
            <button class="source" onclick={() => go("/case/c1/findings/f1")}>
              <FileText size={15} />{t("lp.witnessStatement")} · {t("common.page", { n: 4 })}
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
      <div class="desk" class:scatter={!gathered} bind:this={desk}>
        <svg class="wires" viewBox="0 0 1200 560" aria-hidden="true">
          {#each slips as s (s.id)}
            <path class="wire" class:suggested={!s.reviewed} data-rel={s.rel} d={wires[s.id].d} pathLength="1" />
          {/each}
        </svg>
        <article class="slip statement">
          <p class="slip-meta">{t("lp.g.statementMeta")}</p>
          <p class="statement-text">“{t("lp.g.statement")}”</p>
        </article>
        {#each slips as s, i (s.id)}
          {@const parts = around(t(s.text), s.mark ? t(s.mark) : "")}
          <article class="slip source-slip {s.id}" style:--d="{i * 70}ms">
            <p class="slip-meta">{#if s.id === "law"}<Scale size={13} />{:else}<FileText size={13} />{/if}{t(s.meta)}</p>
            <p class="slip-text">{parts[0]}{#if parts[1]}<mark>{parts[1]}</mark>{/if}{parts[2]}</p>
            <p class="slip-rel" data-rel={s.rel}>{t(`rel.${s.rel}`)}</p>
          </article>
          <span class="wire-label" data-rel={s.rel} style:left="{wires[s.id].x}%" style:top="{wires[s.id].y}%">{t(`rel.${s.rel}`)}</span>
        {/each}
      </div>
      <p class="legend">{t("lp.g.legend")} · {t("lp.sample")}</p>
    </section>

    <section class="how wrap" id="lp-how" tabindex="-1" aria-labelledby="lp-how-title">
      <header class="section-head">
        <h2 class="headline" id="lp-how-title">{t("lp.howTitle1")}<br />{t("lp.howTitle2")}</h2>
        <p>{t("lp.howLead")}</p>
      </header>
      <ol class="steps">
        <li class="step">
          <div class="caption">
            <h3>{t("lp.s1.title")}</h3>
            <p>{t("lp.s1.text")}</p>
          </div>
          <div class="plate" style:--pos="6% 10%">
            <div class="vignette listen paper">
              <div class="v-line quiet">
                <span class="v-face" data-tone="judge">HK</span>
                <div><span class="v-name">{t("role.judge")}</span><p>{t("lp.v1.judge")}</p></div>
              </div>
              <div class="v-line now">
                <span class="v-face speaking" data-tone="witness">RH</span>
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
          <div class="plate" style:--pos="34% 4%">
            <div class="vignette reading paper">
              <p class="v-head">{t("lp.v2.title")}</p>
              <ul>
                <li><FileText size={15} /><span>{t("lp.v2.d1")}</span><span class="v-pages">{t("lp.v2.pages", { n: 6 })}</span><span class="v-state"><Check size={13} />{t("lp.v2.read")}</span></li>
                <li><FileText size={15} /><span>{t("lp.v2.d2")}</span><span class="v-pages">{t("lp.v2.pages", { n: 12 })}</span><span class="v-state"><Check size={13} />{t("lp.v2.read")}</span></li>
                <li><FileText size={15} /><span>{t("lp.v2.d3")}</span><span class="v-pages">{t("lp.v2.pages", { n: 9 })}</span><span class="v-state"><Check size={13} />{t("lp.v2.read")}</span></li>
                <li><Scale size={15} /><span>{t("lp.v2.d4")}</span><span class="v-pages">Pasal.id</span><span class="v-state"><Check size={13} />{t("lp.v2.referenced")}</span></li>
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
          <div class="plate" style:--pos="16% 22%">
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
    </section>

    <section class="signal wrap" aria-labelledby="lp-signal-title">
      <header class="section-head">
        <h2 class="headline" id="lp-signal-title">{t("lp.signalTitle")}</h2>
        <p>{t("lp.signalLead")}</p>
      </header>
      <ol class="transcript paper">
        {#each quietLines as line (line.text)}
          <li class="t-row">
            <span class="t-who">{t(line.who)}</span>
            <p class="t-text">{t(line.text)}</p>
            {#if line.matches}<span class="t-ok"><Check size={13} />{t("lp.tMatches")}</span>{:else}<span></span>{/if}
          </li>
        {/each}
        <li class="t-row raised">
          <span class="t-who">{t("role.witness")}</span>
          <p class="t-text">{raised[0]}<mark>{raised[1]}</mark>{raised[2]}</p>
          <span class="pill small">{t("status.potential_inconsistency")}</span>
          <p class="t-note">{t("lp.tNote")}</p>
        </li>
        <li class="t-row">
          <span class="t-who">{t("role.witness")}</span>
          <p class="t-text">{t("lp.t5")}</p>
          <span></span>
        </li>
      </ol>
    </section>

    <section class="spread wrap" aria-labelledby="lp-page-title">
      <div class="page paper" aria-label={t("lp.sample")}>
        <p class="page-folio tabular">{samplePage.folio}</p>
        {#each samplePage.heading as line (line)}<p class="page-heading">{line}</p>{/each}
        <p class="page-intro">{samplePage.intro}</p>
        <ol class="page-items">
          {#each samplePage.items as item (item.n)}
            {@const parts = around(item.a, item.mark)}
            <li class:marked={!!item.mark}>
              <span class="page-n tabular">{item.n}.</span>
              <div>
                <p><span class="page-tag">{samplePage.labels.q}:</span> {item.q}</p>
                <p><span class="page-tag">{samplePage.labels.a}:</span> {parts[0]}{#if parts[1]}<mark>{parts[1]}</mark>{/if}{parts[2]}</p>
                {#if item.mark}
                  <aside class="margin-note">
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
      <div class="spread-caption">
        <h2 class="headline" id="lp-page-title">{t("lp.pageTitle")}</h2>
        <p>{t("lp.pageText")}</p>
        <p class="quiet">{t("lp.pageOriginal")}</p>
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

    <section class="closing" aria-labelledby="lp-closing-title">
      <div class="closing-frame">
        <h2 class="headline" id="lp-closing-title">{t("lp.closingTitle1")}<br />{t("lp.closingTitle2")}</h2>
        <p>{t("lp.closingLead")}</p>
        <div class="actions">
          <a class="button cream" href={href("/case/c1")}>{t("lp.demo")}<ArrowRight size={22} strokeWidth={1.5} /></a>
          <a class="button outline" href={href("/cases")}>{t("lp.open")}</a>
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
    background-image: var(--lp-ivory);
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
    background: var(--lp-forest-deep) var(--lp-case-files) center bottom / cover no-repeat;
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
  }
  .hl {
    background: linear-gradient(var(--lp-amber-wash), var(--lp-amber-wash)) no-repeat 0 88% / 100% 0.55em;
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
    width: 100%;
    height: 16px;
    overflow: visible;
  }
  .thread path {
    fill: none;
    stroke: var(--lp-rel-conflicts);
    stroke-width: 1.5;
    stroke-dasharray: 1;
    vector-effect: non-scaling-stroke;
  }
  .thread circle {
    fill: var(--lp-rel-conflicts);
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
  .sheet.run .thread path {
    animation: lp-draw 0.8s var(--lp-ease) 1.6s both;
  }
  .sheet.run .thread circle {
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
      stroke-dashoffset: 1;
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
    transition: stroke-dashoffset 0.7s var(--lp-ease) 0.62s;
  }
  .wire.suggested {
    stroke-dasharray: 0.012 0.01;
    transition: opacity 0.6s var(--lp-ease) 0.7s;
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
  .scatter .wire {
    stroke-dashoffset: 1;
  }
  .scatter .wire.suggested {
    stroke-dashoffset: 0;
    opacity: 0;
  }
  .wire-label {
    position: absolute;
    transform: translate(-50%, -50%);
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--lp-bg);
    font-size: clamp(11px, 1cqi, 12.5px);
    font-weight: 600;
    transition: opacity 0.5s var(--lp-ease) 1s;
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
  .scatter .wire-label {
    opacity: 0;
  }
  .slip {
    position: absolute;
    display: grid;
    align-content: start;
    gap: 0.5cqi;
    padding: 1.15cqi 1.35cqi;
    border-radius: 6px;
    background-color: var(--lp-paper);
    background-image: var(--lp-ivory);
    background-size: 600px 600px;
    box-shadow:
      0 1px 0 rgb(17 28 22 / 0.06),
      0 10px 24px rgb(20 40 30 / 0.1);
    transform: rotate(var(--fr, 0deg));
    transition: transform 0.9s var(--lp-ease) var(--d, 0ms);
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
  .page mark {
    background: var(--lp-amber-wash);
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
    --sx: -70px;
    --sy: -40px;
    --sr: -7deg;
  }
  .log {
    left: 5%;
    top: 69.6%;
    width: 26.67%;
    height: 23.2%;
    --fr: 0.6deg;
    --sx: -100px;
    --sy: 50px;
    --sr: 5deg;
  }
  .shift {
    left: 70%;
    top: 8.9%;
    width: 26.67%;
    height: 23.2%;
    --fr: 0.7deg;
    --sx: 80px;
    --sy: -50px;
    --sr: 6deg;
  }
  .law {
    left: 68.33%;
    top: 67.9%;
    width: 26.67%;
    height: 23.2%;
    --fr: -0.6deg;
    --sx: 100px;
    --sy: 40px;
    --sr: -5deg;
  }
  .scatter .source-slip {
    transform: translate(var(--sx), var(--sy)) rotate(var(--sr));
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
    place-items: center;
    min-height: 380px;
    padding: 44px clamp(20px, 4vw, 64px);
    border-radius: 22px;
    background: var(--lp-forest-deep) var(--lp-case-files) no-repeat;
    background-size: 240% auto;
    background-position: var(--pos, 10% 10%);
  }
  .vignette {
    position: relative;
    display: grid;
    gap: 12px;
    width: min(100%, 480px);
    padding: 22px 24px 30px;
    border-radius: 9px;
    box-shadow: 0 18px 40px rgb(3 14 9 / 0.35);
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
  .v-face {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--tone-soft, #eee);
    color: var(--tone, #333);
    font-size: 13px;
    font-weight: 700;
  }
  .v-face.speaking {
    width: 52px;
    height: 52px;
    font-size: 15px;
    box-shadow:
      0 0 0 3px var(--lp-paper),
      0 0 0 5px var(--tone, #333);
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
    display: grid;
    list-style: none;
    margin: 0 auto;
    padding: 10px clamp(18px, 3vw, 36px);
    max-width: 980px;
    border-radius: 10px;
    box-shadow: 0 1px 0 rgb(17 28 22 / 0.05);
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

  /* The page: a real-looking source document, with Jude's note in its margin. */
  .spread {
    display: grid;
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    gap: clamp(40px, 6vw, 110px);
    align-items: center;
    padding: var(--lp-section) 0;
    border-top: 1px solid var(--lp-line);
  }
  .page {
    position: relative;
    padding: clamp(36px, 5vw, 64px) clamp(28px, 5.5vw, 76px) 56px;
    font-family: "Rufina", Georgia, serif;
    font-size: 15px;
    line-height: 1.75;
    box-shadow:
      0 1px 0 rgb(17 28 22 / 0.06),
      0 24px 50px rgb(20 40 30 / 0.12);
  }
  .page-folio {
    position: absolute;
    top: 20px;
    right: 28px;
    font-family: "Manrope", sans-serif;
    font-size: 12px;
    color: var(--lp-muted);
  }
  .page-heading {
    text-align: center;
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
  .page-tag {
    font-style: normal;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .margin-note {
    display: grid;
    justify-items: start;
    gap: 6px;
    margin: 10px 0 2px;
    padding: 12px 14px;
    border-radius: 6px;
    background: rgb(255 255 255 / 0.55);
    border: 1px solid rgb(181 117 57 / 0.35);
    font-family: "Manrope", sans-serif;
    font-size: 13.5px;
    line-height: 1.5;
  }
  .page-sample {
    position: absolute;
    left: clamp(28px, 5.5vw, 76px);
    bottom: 18px;
    font-family: "Manrope", sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: var(--lp-muted);
  }
  .spread-caption {
    display: grid;
    gap: 18px;
  }
  .spread-caption p {
    font-size: 17px;
    color: #3d4a41;
  }
  .spread-caption .quiet {
    font-size: 14px;
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
    justify-items: start;
    gap: 22px;
    padding: clamp(64px, 9vw, 120px) max(5%, 28px);
    border-radius: 28px;
    /* Only the cloth of the case file: the papers belong to the opening. */
    background: var(--lp-forest-deep) var(--lp-case-files) no-repeat;
    background-size: 240% auto;
    background-position: 8% 6%;
    color: var(--lp-cream);
  }
  .closing .headline {
    color: var(--lp-cream);
    max-width: 14em;
  }
  .closing p {
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

  @media (min-width: 1600px) {
    .opening {
      padding-top: 110px;
      padding-bottom: 120px;
    }
  }
  @media (max-width: 1100px) {
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
    .source {
      min-height: 44px;
    }
    .intro,
    .section-head,
    .spread,
    .principles li {
      grid-template-columns: 1fr;
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
      padding: 28px 16px;
      border-radius: 16px;
      background-size: 420% auto;
      background-position: 0 0;
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
    .page {
      font-size: 14px;
      padding: 40px 22px 48px;
    }
    .page-sample {
      left: 22px;
    }
    .closing {
      padding: 0 8px;
    }
    .closing-frame {
      border-radius: 18px;
      padding: 56px 20px 64px;
      background-size: 520% auto;
      background-position: 0 0;
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
