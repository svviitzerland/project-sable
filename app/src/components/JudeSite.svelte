<script lang="ts">
  import { resolve } from "$app/paths";
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
    X,
  } from "@lucide/svelte";
  import { examples, type SourceKind } from "../lib/jude-demo";
  import { landingMotion } from "./landing-motion.svelte";
  import { onMount, untrack } from "svelte";

  const nav = [
    ["How it works", "#how-it-works"],
    ["Built on evidence", "#evidence"],
    ["Our approach", "#approach"],
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

  onMount(() => landingMotion(hero.current));

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

  let example = $derived(examples[exampleIndex]);

  let isReviewed = $derived(reviewed.includes(example.id));

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

<a class="skip-link" href="#main"> Skip to content </a>
<main id="main">
  <div class="hero" id="top" bind:this={hero.current}>
    <header class="site-header wrap">
      <a class="wordmark" href="#top" aria-label="Jude home"> jude. </a>
      <nav class="desktop-nav" aria-label="Main navigation">
        {#each nav as [label, href] (label)}<a href={`#${href.slice(1)}`}>
            {label}
          </a>{/each}
        <a href={resolve("/workspace")}>Open workspace</a>
        <button class="button button-outline" onclick={() => openDemo()}>
          Explore the demo
        </button>
      </nav>
      <button
        class="menu-toggle"
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={menuOpen}
        aria-controls="mobile-navigation"
        onclick={() => (menuOpen = !menuOpen)}
      >
        {#if menuOpen}<X></X>{:else}<Menu></Menu>{/if}
      </button>
      {#if menuOpen}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions (Escape bubbles from the navigation links and restores the menu trigger.) -->
        <nav
          id="mobile-navigation"
          class="mobile-nav"
          aria-label="Mobile navigation"
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
              {label}
              <ArrowUpRight size={17}></ArrowUpRight>
            </a>{/each}
          <a href={resolve("/workspace")}>
            Open workspace
            <ArrowUpRight size={17}></ArrowUpRight>
          </a>
          <button onclick={() => openDemo()}>
            Explore the demo
            <ArrowRight size={17}></ArrowRight>
          </button>
        </nav>{/if}
    </header>
    <div class="hero-content">
      <div class="hero-copy wrap">
        <h1>
          Stay with the testimony.
          <br /> See the whole story.
        </h1>
        <p>
          An AI courtroom copilot that connects what is said
          <br class="desktop-break" /> to what the evidence shows.
        </p>
        <button class="button button-cream hero-cta" onclick={() => openDemo()}>
          Explore the demo <ArrowRight size={22} strokeWidth={1.5}></ArrowRight>
        </button>
      </div>
      <div class="hero-evidence paper">
        <p class="sample-label">Synthetic example</p>
        <div class="comparison">
          <div class="comparison-statement">
            <h2>Testimony</h2>
            <blockquote>“I arrived at 9:30 PM.”</blockquote>
            <button
              class="source-link"
              onclick={() => openDemo("transcript", true)}
            >
              <FileText aria-hidden="true"></FileText>
              <span>
                Hearing transcript&#32;
                <span class="source-separator">·</span>&#32;
                <span>00:14:32</span>
              </span>
            </button>
          </div>
          <div class="comparison-finding">
            <span class="status status-inconsistency">
              Potential inconsistency
            </span>
            <div class="evidence-thread" aria-hidden="true">
              <span></span>
              <span></span>
            </div>
            <p>
              Check whether both statements
              <br class="desktop-break" /> refer to the same event.
            </p>
          </div>
          <div class="comparison-statement earlier">
            <h2>Earlier statement</h2>
            <blockquote>
              “I arrived shortly
              <br class="desktop-break" /> after 8:00 PM.”
            </blockquote>
            <button
              class="source-link"
              onclick={() => openDemo("statement", true)}
            >
              <FileText aria-hidden="true"></FileText>
              <span>
                Witness statement&#32;
                <span class="source-separator">·</span> Page 4
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <section
    class="source-intro wrap"
    id="evidence"
    aria-labelledby="source-title"
  >
    <div>
      <h2 id="source-title">Every finding has a source.</h2>
      <p>
        Jude links testimony to case documents, surfaces possible
        inconsistencies, and keeps legal judgment with people.
      </p>
    </div>
    <p class="intro-aside">
      See the exact passages, compare them side by side, and follow the trail
      back to the original documents—so you can ask better questions and build
      stronger arguments.
    </p>
  </section>
  <section
    class="workflow wrap section-space"
    id="how-it-works"
    aria-labelledby="workflow-title"
  >
    <div class="section-heading">
      <h2 id="workflow-title">
        Keep your attention
        <br />
        where it matters.
      </h2>
      <p>
        Hear the testimony. Follow the argument. Jude is being built to connect
        the relevant details while you stay with the proceedings.
      </p>
    </div>
    <ol class="workflow-list">
      <li>
        <span class="step-number">01</span>
        <div>
          <h3>Listen in context.</h3>
          <p>
            A searchable transcript brings together what was said, when it was
            said, and who said it. Uncertain speaker identities stay uncertain.
          </p>
        </div>
        <span class="workflow-detail">
          Testimony <ArrowRight size={15}></ArrowRight> Meaningful statements
        </span>
      </li>
      <li>
        <span class="step-number">02</span>
        <div>
          <h3>Connect the evidence.</h3>
          <p>
            Relevant statements are compared with the case materials. Supporting
            passages and potential differences retain their document and page
            references.
          </p>
        </div>
        <span class="workflow-detail">
          Statement <ArrowRight size={15}></ArrowRight> Source passage
        </span>
      </li>
      <li>
        <span class="step-number">03</span>
        <div>
          <h3>Examine both sides.</h3>
          <p>
            Alternative explanations and missing context are considered before a
            finding is presented. You inspect the sources and decide what
            deserves a closer look.
          </p>
        </div>
        <span class="workflow-detail">
          Finding <ArrowRight size={15}></ArrowRight> Your judgment
        </span>
      </li>
    </ol>
  </section>
  <section class="demo-section" id="demo" aria-labelledby="demo-title">
    <div class="wrap">
      <div class="section-heading">
        <div>
          <h2 id="demo-title" bind:this={demoHeading.current} tabindex="-1">
            Look closer.
            <br />
            Follow the source.
          </h2>
          <p class="demo-disclosure">
            An interactive illustration using synthetic case material.
            <br />
            No audio is recorded and no AI analysis runs in this demo.
          </p>
        </div>
        <p>
          A difference is a starting point for a question. Explore how the
          available evidence changes the finding.
        </p>
      </div>
      <div
        class="demo-options"
        role="group"
        aria-label="Choose an evidence example"
      >
        {#each examples as item, index (index)}<button
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
            <span class="small-note">Synthetic case / 001</span>
          </div>
          <h3>{example.finding}</h3>
          <div class="demo-quotes">
            <div>
              <span class="detail-label">In the hearing</span>
              <blockquote>“{example.quote}”</blockquote>
              <button
                class="text-source"
                aria-pressed={source === "transcript"}
                onclick={() => (source = "transcript")}
              >
                <FileText size={16}></FileText>
                Transcript · {example.time}
                <ArrowUpRight size={14}></ArrowUpRight>
              </button>
            </div>
            <div>
              <span class="detail-label">In the case file</span>
              <blockquote>“{example.earlier}”</blockquote>
              <button
                class="text-source"
                aria-pressed={source === "statement"}
                onclick={() => (source = "statement")}
              >
                <FileText size={16}></FileText>
                Witness statement · Page {example.page}
                <ArrowUpRight size={14}></ArrowUpRight>
              </button>
            </div>
          </div>
          <p class="finding-explanation">{example.explanation}</p>
          <div class="verification">
            <span class="detail-label">What to verify</span>
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
            {isReviewed ? "Marked as reviewed" : "Mark as reviewed"}
            <span>For this visit only</span>
          </button>
        </div>
        <aside class="source-pane" aria-label="Original source excerpts">
          <div class="source-pane-title">
            <FileText size={18}></FileText>
            <h3>At the source</h3>
            <span>Synthetic</span>
          </div>
          <div class="source-tabs" role="group" aria-label="Source document">
            <button
              aria-pressed={source === "transcript"}
              onclick={() => (source = "transcript")}
            >
              Hearing transcript
            </button>
            <button
              aria-pressed={source === "statement"}
              onclick={() => (source = "statement")}
            >
              Witness statement
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
                  ? "HEARING RECORD"
                  : "WITNESS STATEMENT"}
              </span>
              <span>
                {source === "transcript"
                  ? example.time
                  : `PAGE ${example.page}`}
              </span>
            </div>
            <h4>
              {source === "transcript"
                ? "Examination of the witness"
                : "Earlier account of events"}
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
            <p class="excerpt-footnote">
              Prepared example for demonstration. Not a real case record or
              legal reference.
            </p>
          </div>
          <div class="suggested-question">
            <span class="detail-label">A question to consider</span>
            <p>{example.question}</p>
            <button class="text-action" onclick={copyQuestion}>
              {copied ? "Copied" : "Copy question"}
              {#if copied}<Check size={15}></Check>{:else}<ArrowUpRight
                  size={15}
                ></ArrowUpRight>{/if}
            </button>
            <span class="copy-feedback" role="status">
              {copyError
                ? "Copy unavailable. Select the question above to copy it manually."
                : copied
                  ? "Question copied to clipboard."
                  : ""}
            </span>
          </div>
        </aside>
      </div>
      <p class="demo-footer-note">
        These labels describe the relationship between a statement and the
        available evidence. They do not establish credibility, guilt, or a legal
        conclusion.
      </p>
    </div>
  </section>
  <section
    class="approach wrap section-space"
    id="approach"
    aria-labelledby="approach-title"
  >
    <div class="approach-lead">
      <h2 id="approach-title">
        Your judgment.
        <br />
        Better informed.
      </h2>
      <p>
        Built around a simple principle: the person examining the evidence
        should always be able to question the finding.
      </p>
      <a href="#questions" class="text-action">
        A few important questions <ArrowDown size={17}></ArrowDown>
      </a>
    </div>
    <div class="principles">
      <article>
        <span class="principle-icon">
          <FileText size={22} strokeWidth={1.3}></FileText>
        </span>
        <div>
          <h3>Traceable by design.</h3>
          <p>
            A substantive finding should retain its source, passage, and
            context. An answer without something to inspect is not enough.
          </p>
        </div>
      </article>
      <article>
        <span class="principle-icon">
          <Minus size={22} strokeWidth={1.3}></Minus>
        </span>
        <div>
          <h3>Uncertainty stays visible.</h3>
          <p>
            Missing context and insufficient evidence are meaningful results.
            Jude should surface those limits, rather than force a conclusion.
          </p>
        </div>
      </article>
      <article>
        <span class="principle-icon">
          <Check size={22} strokeWidth={1.3}></Check>
        </span>
        <div>
          <h3>People make the decisions.</h3>
          <p>
            Jude supports examination and preparation. Professional legal
            judgment and judicial independence remain with people.
          </p>
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
      Before we enter
      <br />
      the courtroom.
    </h2>
    <div class="faq-list">
      <details>
        <summary>
          Who is Jude being built for?
          <ChevronDown size={20}></ChevronDown>
        </summary>
        <p>
          The first use case is lawyers in Indonesian criminal proceedings. The
          current MVP includes a synthetic hearing and a case workspace.
          Prosecutor and judge workflows would require separate role-specific
          capabilities and safeguards.
        </p>
      </details>
      <details>
        <summary>
          Is this a live courtroom product?
          <ChevronDown size={20}></ChevronDown>
        </summary>
        <p>
          Jude is an MVP for evaluation using synthetic or authorized material.
          The workspace supports case documents, transcripts, source-linked
          findings, and review notes. Live speech and AI analysis require
          configured providers; the synthetic hearing runs without them.
          External integrations still require live validation before operational
          use.
        </p>
      </details>
      <details>
        <summary>
          Does an inconsistency mean a witness is wrong?
          <ChevronDown size={20}></ChevronDown>
        </summary>
        <p>
          No. Different accounts can reflect different events, ambiguous
          questions, incomplete context, or other explanations. Jude is intended
          to identify what may warrant examination—not decide whether a witness
          is lying or a defendant is guilty.
        </p>
      </details>
      <details>
        <summary>
          How will Indonesian legal references be used?
          <ChevronDown size={20}></ChevronDown>
        </summary>
        <p>
          The proposed product will retrieve relevant Indonesian legislation
          through Pasal.id, subject to available permissions. Verified legal
          text must be distinguished from metadata and unverified references.
          This demo does not retrieve or present legal advice.
        </p>
      </details>
      <details>
        <summary>
          Can I upload case documents here?
          <ChevronDown size={20}></ChevronDown>
        </summary>
        <p>
          The authenticated workspace accepts text-based PDF, DOCX, TXT, and
          Markdown documents, with original downloads and inspectable passages.
          Use synthetic or appropriately authorized material. Scanned PDFs
          require OCR before upload.
        </p>
      </details>
    </div>
  </section>
  <section class="closing">
    <div class="wrap">
      <h2>
        Stay present.
        <br />
        See what connects.
      </h2>
      <div>
        <p>
          A closer look at the evidence starts
          <br />
          with a better question.
        </p>
        <button class="button button-cream" onclick={() => openDemo()}>
          Explore the demo <ArrowRight size={21}></ArrowRight>
        </button>
        <span class="closing-note">
          Designed for Indonesian legal professionals.
        </span>
      </div>
    </div>
  </section>
</main>
<footer class="site-footer wrap">
  <a class="wordmark" href="#top" aria-label="Jude home"> jude. </a>
  <p>Evidence-grounded courtroom intelligence.</p>
  <span>Product concept · 2026</span>
  <a href="#top">
    Back to top <ArrowUpRight size={14}></ArrowUpRight>
  </a>
</footer>
