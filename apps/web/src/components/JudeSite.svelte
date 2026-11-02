<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import {
    ArrowDown,
    ArrowRight,
    ArrowUpRight,
    Check,
    ChevronDown,
    FileText,
    Menu,
    Minus,
    Plus,
    RotateCcw,
    X,
  } from "@lucide/svelte";
  import { examples, type SourceKind } from "../lib/jude-demo";
  import { i18n, t } from "../lib/i18n/index.svelte";
  import LanguageToggle from "./LanguageToggle.svelte";
  import { landingMotion } from "./landing-motion.svelte";
  import { onMount, untrack } from "svelte";

  const nav = [
    ["landing.nav.howItWorks", "#how-it-works"],
    ["landing.nav.evidence", "#evidence"],
    ["landing.nav.approach", "#approach"],
  ] as const;

  let menuOpen = $state(false);

  let exampleIndex = $state(0);

  let source = $state<SourceKind>("transcript");

  let reviewed = $state<string[]>([]);

  let copied = $state(false);

  let copyError = $state(false);

  const demoHeading = { current: null as HTMLHeadingElement | null };

  const hero = { current: null as HTMLDivElement | null };

  const excerpt = { current: null as HTMLDivElement | null };

  let replayComparison = $state<(() => void) | null>(null);
  onMount(() => {
    const motion = landingMotion(hero.current);
    replayComparison = motion?.replay ?? null;
    return () => motion?.destroy();
  });

  $effect(() => {
    void [menuOpen];
    return untrack(() => {
      if (menuOpen)
        document
          .querySelector<HTMLAnchorElement>("#mobile-navigation a")
          ?.focus();
    });
  });

  $effect(() => {
    void [source, exampleIndex];
    return untrack(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const animation = excerpt.current?.animate(
        [{ opacity: 0.7 }, { opacity: 1 }],
        { duration: 180, easing: "ease-out" },
      );
      return () => animation?.cancel();
    });
  });

  let example = $derived(examples[i18n.lang][exampleIndex]);

  let isReviewed = $derived(reviewed.includes(example.id));

  // From the root layout: signed-in visitors see a way back to their workspace.
  const signedIn = $derived(Boolean(page.data.signedIn));

  function openDemo(selectedSource: SourceKind = "transcript", reset = false) {
    if (reset) exampleIndex = 0;
    source = selectedSource;
    menuOpen = false;
    demoHeading.current?.focus({ preventScroll: true });
    document.getElementById("demo")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }

  async function copyQuestion() {
    try {
      await navigator.clipboard.writeText(example.question);
      copied = true;
      copyError = false;
      window.setTimeout(() => (copied = false), 2200);
    } catch {
      copyError = true;
    }
  }
</script>

<a class="skip-link" href="#main">{t("landing.skip")}</a>
<main id="main">
  <div class="hero" id="top" bind:this={hero.current}>
    <header class="site-header wrap">
      <a class="wordmark" href="#top" aria-label={t("landing.home")}> jude. </a>
      <div class="header-end">
        <nav class="desktop-nav" aria-label={t("landing.mainNav")}>
          {#each nav as [label, href] (label)}<a href={`#${href.slice(1)}`}>
              {t(label)}
            </a>{/each}
          <a href={resolve("/pricing")}>{t("landing.nav.pricing")}</a>
          {#if signedIn}<a
              class="button button-outline"
              href={resolve("/workspace")}>{t("landing.openWorkspace")}</a
            >{:else}<a href={resolve("/workspace")}>{t("common.signIn")}</a>
            <button class="button button-outline" onclick={() => openDemo()}>
              {t("landing.exploreDemo")}
            </button>{/if}
        </nav>
        <LanguageToggle />
        <button
          class="menu-toggle"
          aria-label={menuOpen ? t("landing.closeNav") : t("landing.openNav")}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onclick={() => (menuOpen = !menuOpen)}
        >
          {#if menuOpen}<X></X>{:else}<Menu></Menu>{/if}
        </button>
      </div>
      {#if menuOpen}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions (Escape bubbles from the navigation links and restores the menu trigger.) -->
        <nav
          id="mobile-navigation"
          class="mobile-nav"
          aria-label={t("landing.mobileNav")}
          onkeydown={(event) => {
            if (event.key === "Escape") {
              menuOpen = false;
              document
                .querySelector<HTMLButtonElement>(".menu-toggle")
                ?.focus();
            }
          }}
        >
          {#each nav as [label, href] (label)}<a
              href={`#${href.slice(1)}`}
              onclick={() => (menuOpen = false)}
            >
              {t(label)}
              <ArrowUpRight size={17}></ArrowUpRight>
            </a>{/each}
          <a href={resolve("/pricing")}>
            {t("landing.nav.pricing")}
            <ArrowUpRight size={17}></ArrowUpRight>
          </a>
          <a href={resolve("/workspace")}>
            {signedIn ? t("landing.openWorkspace") : t("common.signIn")}
            <ArrowUpRight size={17}></ArrowUpRight>
          </a>
          {#if !signedIn}<button onclick={() => openDemo()}>
              {t("landing.exploreDemo")}
              <ArrowRight size={17}></ArrowRight>
            </button>{/if}
        </nav>{/if}
    </header>
    <div class="hero-content">
      <div class="hero-copy wrap">
        <h1>
          {t("landing.hero.title1")}
          <br />
          {t("landing.hero.title2")}
        </h1>
        <p>
          {t("landing.hero.lead1")}
          <br class="desktop-break" />
          {t("landing.hero.lead2")}
        </p>
        <div class="hero-actions hero-cta">
          <a class="button button-cream" href={resolve("/workspace")}>
            {t("landing.openWorkspace")}
            <ArrowRight size={22} strokeWidth={1.5}></ArrowRight>
          </a>
          <button class="button button-outline" onclick={() => openDemo()}>
            {t("landing.exploreDemo")}
          </button>
        </div>
        {#if !signedIn}<div class="hero-entry-note">
            {t("landing.hero.entry")}
          </div>{/if}
      </div>
      <div class="hero-evidence paper">
        <div class="comparison-toolbar">
          <p class="sample-label">{t("landing.hero.sample")}</p>
          {#if replayComparison}<button
              class="replay-comparison"
              onclick={replayComparison}
              ><RotateCcw size={14} /> {t("landing.hero.replay")}</button
            >{/if}
        </div>
        <div class="comparison">
          <div class="comparison-statement">
            <h2>{t("landing.hero.testimony")}</h2>
            <blockquote>
              “{t("landing.hero.quote1")}
              <span class="quote-detail"
                ><i class="quote-highlight" aria-hidden="true"></i>{t(
                  "landing.hero.time1",
                )}</span
              >”
            </blockquote>
            <button
              class="source-link"
              onclick={() => openDemo("transcript", true)}
            >
              <FileText aria-hidden="true"></FileText>
              <span>
                {t("common.hearingTranscript")}&#32;
                <span class="source-separator">·</span>&#32;
                <span>00:14:32</span>
              </span>
            </button>
          </div>
          <div class="comparison-finding">
            <span class="status status-inconsistency">
              {t("status.potential_inconsistency")}
            </span>
            <div class="evidence-thread" aria-hidden="true">
              <span></span>
              <span></span>
            </div>
            <p>
              {t("landing.hero.check1")}
              <br class="desktop-break" />
              {t("landing.hero.check2")}
            </p>
          </div>
          <div class="comparison-statement earlier">
            <h2>{t("landing.hero.earlier")}</h2>
            <blockquote>
              “{t("landing.hero.quote2a")}
              <br class="desktop-break" />
              {t("landing.hero.quote2b")}
              <span class="quote-detail"
                ><i class="quote-highlight" aria-hidden="true"></i>{t(
                  "landing.hero.time2",
                )}</span
              >”
            </blockquote>
            <button
              class="source-link"
              onclick={() => openDemo("statement", true)}
            >
              <FileText aria-hidden="true"></FileText>
              <span>
                {t("landing.hero.witnessStatement")}&#32;
                <span class="source-separator">·</span>
                {t("common.page", { page: 4 })}
              </span>
            </button>
          </div>
        </div>
        <span class="comparison-progress" aria-hidden="true"></span>
      </div>
    </div>
  </div>
  <section
    class="source-intro wrap"
    id="evidence"
    aria-labelledby="source-title"
  >
    <div>
      <h2 id="source-title">{t("landing.source.title")}</h2>
      <p>{t("landing.source.lead")}</p>
    </div>
    <p class="intro-aside">{t("landing.source.aside")}</p>
  </section>
  <section
    class="workflow wrap section-space"
    id="how-it-works"
    aria-labelledby="workflow-title"
  >
    <div class="section-heading">
      <h2 id="workflow-title">
        {t("landing.workflow.title1")}
        <br />
        {t("landing.workflow.title2")}
      </h2>
      <p>{t("landing.workflow.lead")}</p>
    </div>
    <ol class="workflow-list">
      <li>
        <span class="step-number">01</span>
        <div>
          <h3>{t("landing.step1.title")}</h3>
          <p>{t("landing.step1.text")}</p>
        </div>
        <span class="workflow-detail">
          {t("landing.step1.from")}
          <ArrowRight size={15}></ArrowRight>
          {t("landing.step1.to")}
        </span>
      </li>
      <li>
        <span class="step-number">02</span>
        <div>
          <h3>{t("landing.step2.title")}</h3>
          <p>{t("landing.step2.text")}</p>
        </div>
        <span class="workflow-detail">
          {t("landing.step2.from")}
          <ArrowRight size={15}></ArrowRight>
          {t("landing.step2.to")}
        </span>
      </li>
      <li>
        <span class="step-number">03</span>
        <div>
          <h3>{t("landing.step3.title")}</h3>
          <p>{t("landing.step3.text")}</p>
        </div>
        <span class="workflow-detail">
          {t("landing.step3.from")}
          <ArrowRight size={15}></ArrowRight>
          {t("landing.step3.to")}
        </span>
      </li>
    </ol>
  </section>
  <section class="demo-section" id="demo" aria-labelledby="demo-title">
    <div class="wrap">
      <div class="section-heading">
        <div>
          <h2 id="demo-title" bind:this={demoHeading.current} tabindex="-1">
            {t("landing.demo.title1")}
            <br />
            {t("landing.demo.title2")}
          </h2>
          <p class="demo-disclosure">
            {t("landing.demo.disclosure1")}
            <br />
            {t("landing.demo.disclosure2")}
          </p>
        </div>
        <p>{t("landing.demo.lead")}</p>
      </div>
      <div
        class="demo-options"
        role="group"
        aria-label={t("landing.demo.choose")}
      >
        {#each examples[i18n.lang] as item, index (index)}<button
            aria-pressed={index === exampleIndex}
            onclick={() => {
              exampleIndex = index;
              source = "transcript";
              copied = false;
              copyError = false;
            }}
          >
            <span class={`option-dot dot-${item.id}`}></span>
            {item.shortLabel}
            <ArrowUpRight size={15}></ArrowUpRight>
          </button>{/each}
      </div>
      <div class="demo-workspace">
        <div class="finding-pane" aria-live="polite">
          <div class="finding-top">
            <span class={`status status-${example.id}`}>
              {example.label}
            </span>
            <span class="small-note">{t("landing.demo.caseLabel")}</span>
          </div>
          <h3>{example.finding}</h3>
          <div class="demo-quotes">
            <div>
              <span class="detail-label">{t("landing.demo.inHearing")}</span>
              <blockquote>“{example.quote}”</blockquote>
              <button
                class="text-source"
                aria-pressed={source === "transcript"}
                onclick={() => (source = "transcript")}
              >
                <FileText size={16}></FileText>
                {t("landing.demo.transcriptAt", { time: example.time })}
                <ArrowUpRight size={14}></ArrowUpRight>
              </button>
            </div>
            <div>
              <span class="detail-label">{t("landing.demo.inCaseFile")}</span>
              <blockquote>“{example.earlier}”</blockquote>
              <button
                class="text-source"
                aria-pressed={source === "statement"}
                onclick={() => (source = "statement")}
              >
                <FileText size={16}></FileText>
                {t("landing.demo.statementPage", { page: example.page })}
                <ArrowUpRight size={14}></ArrowUpRight>
              </button>
            </div>
          </div>
          <p class="finding-explanation">{example.explanation}</p>
          <div class="verification">
            <span class="detail-label">{t("common.whatToVerify")}</span>
            <p>{example.verify}</p>
          </div>
          <button
            class={`review-button ${isReviewed ? "is-reviewed" : ""}`}
            aria-pressed={isReviewed}
            onclick={() =>
              (reviewed = isReviewed
                ? reviewed.filter((id) => id !== example.id)
                : [...reviewed, example.id])}
          >
            {#if isReviewed}<Check size={16}></Check>{:else}<Plus size={16}
              ></Plus>{/if}
            {isReviewed ? t("landing.demo.marked") : t("landing.demo.mark")}
            <span>{t("landing.demo.visitOnly")}</span>
          </button>
        </div>
        <aside class="source-pane" aria-label={t("landing.demo.excerpts")}>
          <div class="source-pane-title">
            <FileText size={18}></FileText>
            <h3>{t("common.atSource")}</h3>
            <span>{t("landing.demo.publicRecord")}</span>
          </div>
          <div
            class="source-tabs"
            role="group"
            aria-label={t("landing.demo.sourceDocument")}
          >
            <button
              aria-pressed={source === "transcript"}
              onclick={() => (source = "transcript")}
            >
              {t("common.hearingTranscript")}
            </button>
            <button
              aria-pressed={source === "statement"}
              onclick={() => (source = "statement")}
            >
              {t("landing.demo.witnessStatement")}
            </button>
          </div>
          <div
            class="document-excerpt"
            bind:this={excerpt.current}
            aria-live="polite"
          >
            <div class="document-meta">
              <span>
                {source === "transcript"
                  ? t("landing.demo.recordCaps")
                  : t("landing.demo.statementCaps")}
              </span>
              <span>
                {source === "transcript"
                  ? example.time
                  : t("landing.demo.pageCaps", { page: example.page })}
              </span>
            </div>
            <h4>
              {source === "transcript"
                ? t("landing.demo.examination")
                : t("landing.demo.earlierAccount")}
            </h4>
            <div class="excerpt-lines">
              {#each source === "transcript" ? example.transcript : example.statement as line, i (i)}<p
                >
                  <span class="line-number" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    >{#if i === 1}<mark>{line}</mark>{:else}{line}{/if}</span
                  >
                </p>{/each}
            </div>
            <p class="excerpt-footnote">{t("landing.demo.footnote")}</p>
          </div>
          <div class="suggested-question">
            <span class="detail-label">{t("common.questionToConsider")}</span>
            <p>{example.question}</p>
            <button class="text-action" onclick={copyQuestion}>
              {copied ? t("common.copied") : t("common.copyQuestion")}
              {#if copied}<Check size={15}></Check>{:else}<ArrowUpRight
                  size={15}
                ></ArrowUpRight>{/if}
            </button>
            <span class="copy-feedback" role="status">
              {copyError
                ? t("landing.demo.copyUnavailable")
                : copied
                  ? t("landing.demo.copiedStatus")
                  : ""}
            </span>
          </div>
        </aside>
      </div>
      <p class="demo-footer-note">{t("landing.demo.footer")}</p>
    </div>
  </section>
  <section
    class="approach wrap section-space"
    id="approach"
    aria-labelledby="approach-title"
  >
    <div class="approach-lead">
      <h2 id="approach-title">
        {t("landing.approach.title1")}
        <br />
        {t("landing.approach.title2")}
      </h2>
      <p>{t("landing.approach.lead")}</p>
      <a href="#questions" class="text-action">
        {t("landing.approach.faqLink")}
        <ArrowDown size={17}></ArrowDown>
      </a>
    </div>
    <div class="principles">
      <article>
        <span class="principle-icon">
          <FileText size={22} strokeWidth={1.3}></FileText>
        </span>
        <div>
          <h3>{t("landing.principle1.title")}</h3>
          <p>{t("landing.principle1.text")}</p>
        </div>
      </article>
      <article>
        <span class="principle-icon">
          <Minus size={22} strokeWidth={1.3}></Minus>
        </span>
        <div>
          <h3>{t("landing.principle2.title")}</h3>
          <p>{t("landing.principle2.text")}</p>
        </div>
      </article>
      <article>
        <span class="principle-icon">
          <Check size={22} strokeWidth={1.3}></Check>
        </span>
        <div>
          <h3>{t("landing.principle3.title")}</h3>
          <p>{t("landing.principle3.text")}</p>
        </div>
      </article>
    </div>
  </section>
  <section
    class="questions wrap section-space"
    id="questions"
    aria-labelledby="questions-title"
  >
    <h2 id="questions-title">
      {t("landing.faq.title1")}
      <br />
      {t("landing.faq.title2")}
    </h2>
    <div class="faq-list">
      {#each [1, 2, 3, 4, 5] as const as n (n)}
        <details>
          <summary>
            {t(`landing.faq.q${n}`)}
            <ChevronDown size={20}></ChevronDown>
          </summary>
          <p>{t(`landing.faq.a${n}`)}</p>
        </details>
      {/each}
    </div>
  </section>
  <section class="closing">
    <div class="wrap">
      <h2>
        {t("landing.closing.title1")}
        <br />
        {t("landing.closing.title2")}
      </h2>
      <div>
        <p>
          {t("landing.closing.lead1")}
          <br />
          {t("landing.closing.lead2")}
        </p>
        <button class="button button-cream" onclick={() => openDemo()}>
          {t("landing.exploreDemo")}
          <ArrowRight size={21}></ArrowRight>
        </button>
        <a class="closing-pricing" href={resolve("/pricing")}>
          {t("landing.closing.pricing")}
          <ArrowUpRight size={15}></ArrowUpRight>
        </a>
        <span class="closing-note">{t("landing.closing.note")}</span>
      </div>
    </div>
  </section>
</main>
<footer class="site-footer wrap">
  <a class="wordmark" href="#top" aria-label={t("landing.home")}> jude. </a>
  <p>{t("landing.footer.tagline")}</p>
  <a class="footer-pricing" href={resolve("/pricing")}
    >{t("landing.nav.pricing")}</a
  >
  <span>{t("landing.footer.concept")}</span>
  <a href="#top">
    {t("landing.footer.top")}
    <ArrowUpRight size={14}></ArrowUpRight>
  </a>
</footer>
