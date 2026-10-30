"use client";

import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { examples, type SourceKind } from "@/lib/jude-demo";

import { useLandingMotion } from "./landing-motion";

const nav = [
  ["How it works", "#how-it-works"],
  ["Built on evidence", "#evidence"],
  ["Our approach", "#approach"],
] as const;

export function JudeSite() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [source, setSource] = useState<SourceKind>("transcript");
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const demoHeading = useRef<HTMLHeadingElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const excerpt = useRef<HTMLDivElement>(null);
  useLandingMotion(hero);
  useEffect(() => {
    if (menuOpen)
      document
        .querySelector<HTMLAnchorElement>("#mobile-navigation a")
        ?.focus();
  }, [menuOpen]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = excerpt.current?.animate(
      [{ opacity: 0.7 }, { opacity: 1 }],
      { duration: 180, easing: "ease-out" },
    );
    return () => animation?.cancel();
  }, [source, exampleIndex]);
  const example = examples[exampleIndex];
  const isReviewed = reviewed.includes(example.id);

  function openDemo(selectedSource: SourceKind = "transcript", reset = false) {
    if (reset) setExampleIndex(0);
    setSource(selectedSource);
    setMenuOpen(false);
    demoHeading.current?.focus({ preventScroll: true });
    document
      .getElementById("demo")
      ?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }
  async function copyQuestion() {
    try {
      await navigator.clipboard.writeText(example.question);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <main id="main">
        <div className="hero" id="top" ref={hero}>
          <header className="site-header wrap">
            <a className="wordmark" href="#top" aria-label="Jude home">
              jude.
            </a>
            <nav className="desktop-nav" aria-label="Main navigation">
              {nav.map(([label, href]) => (
                <a key={href} href={href}>
                  {label}
                </a>
              ))}
              <a href="/workspace">Open workspace</a>
              <button
                className="button button-outline"
                onClick={() => openDemo()}
              >
                Explore the demo
              </button>
            </nav>
            <button
              className="menu-toggle"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
            {menuOpen && (
              <nav
                id="mobile-navigation"
                className="mobile-nav"
                aria-label="Mobile navigation"
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setMenuOpen(false);
                    document
                      .querySelector<HTMLButtonElement>(".menu-toggle")
                      ?.focus();
                  }
                }}
              >
                {nav.map(([label, href]) => (
                  <a key={href} href={href} onClick={() => setMenuOpen(false)}>
                    {label}
                    <ArrowUpRight size={17} />
                  </a>
                ))}
                <a href="/workspace">
                  Open workspace
                  <ArrowUpRight size={17} />
                </a>
                <button onClick={() => openDemo()}>
                  Explore the demo
                  <ArrowRight size={17} />
                </button>
              </nav>
            )}
          </header>
          <div className="hero-content">
            <div className="hero-copy wrap">
              <h1>
                Stay with the testimony.
                <br /> See the whole story.
              </h1>
              <p>
                An AI courtroom copilot that connects what is said
                <br className="desktop-break" /> to what the evidence shows.
              </p>
              <button
                className="button button-cream hero-cta"
                onClick={() => openDemo()}
              >
                Explore the demo <ArrowRight size={22} strokeWidth={1.5} />
              </button>
            </div>
            <div className="hero-evidence paper">
              <p className="sample-label">Synthetic example</p>
              <div className="comparison">
                <div className="comparison-statement">
                  <h2>Testimony</h2>
                  <blockquote>“I arrived at 9:30 PM.”</blockquote>
                  <button
                    className="source-link"
                    onClick={() => openDemo("transcript", true)}
                  >
                    <FileText aria-hidden="true" />
                    <span>
                      Hearing transcript{" "}
                      <span className="source-separator">·</span>{" "}
                      <span>00:14:32</span>
                    </span>
                  </button>
                </div>
                <div className="comparison-finding">
                  <span className="status status-inconsistency">
                    Potential inconsistency
                  </span>
                  <div className="evidence-thread" aria-hidden="true">
                    <span />
                    <span />
                  </div>
                  <p>
                    Check whether both statements
                    <br className="desktop-break" /> refer to the same event.
                  </p>
                </div>
                <div className="comparison-statement earlier">
                  <h2>Earlier statement</h2>
                  <blockquote>
                    “I arrived shortly
                    <br className="desktop-break" /> after 8:00 PM.”
                  </blockquote>
                  <button
                    className="source-link"
                    onClick={() => openDemo("statement", true)}
                  >
                    <FileText aria-hidden="true" />
                    <span>
                      Witness statement{" "}
                      <span className="source-separator">·</span> Page 4
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <section
          className="source-intro wrap"
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
          <p className="intro-aside">
            See the exact passages, compare them side by side, and follow the
            trail back to the original documents—so you can ask better questions
            and build stronger arguments.
          </p>
        </section>
        <section
          className="workflow wrap section-space"
          id="how-it-works"
          aria-labelledby="workflow-title"
        >
          <div className="section-heading">
            <h2 id="workflow-title">
              Keep your attention
              <br />
              where it matters.
            </h2>
            <p>
              Hear the testimony. Follow the argument. Jude is being built to
              connect the relevant details while you stay with the proceedings.
            </p>
          </div>
          <ol className="workflow-list">
            <li>
              <span className="step-number">01</span>
              <div>
                <h3>Listen in context.</h3>
                <p>
                  A searchable transcript brings together what was said, when it
                  was said, and who said it. Uncertain speaker identities stay
                  uncertain.
                </p>
              </div>
              <span className="workflow-detail">
                Testimony <ArrowRight size={15} /> Meaningful statements
              </span>
            </li>
            <li>
              <span className="step-number">02</span>
              <div>
                <h3>Connect the evidence.</h3>
                <p>
                  Relevant statements are compared with the case materials.
                  Supporting passages and potential differences retain their
                  document and page references.
                </p>
              </div>
              <span className="workflow-detail">
                Statement <ArrowRight size={15} /> Source passage
              </span>
            </li>
            <li>
              <span className="step-number">03</span>
              <div>
                <h3>Examine both sides.</h3>
                <p>
                  Alternative explanations and missing context are considered
                  before a finding is presented. You inspect the sources and
                  decide what deserves a closer look.
                </p>
              </div>
              <span className="workflow-detail">
                Finding <ArrowRight size={15} /> Your judgment
              </span>
            </li>
          </ol>
        </section>
        <section
          className="demo-section"
          id="demo"
          aria-labelledby="demo-title"
        >
          <div className="wrap">
            <div className="section-heading">
              <div>
                <h2 id="demo-title" ref={demoHeading} tabIndex={-1}>
                  Look closer.
                  <br />
                  Follow the source.
                </h2>
                <p className="demo-disclosure">
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
              className="demo-options"
              role="group"
              aria-label="Choose an evidence example"
            >
              {examples.map((item, index) => (
                <button
                  key={item.id}
                  aria-pressed={index === exampleIndex}
                  onClick={() => {
                    setExampleIndex(index);
                    setSource("transcript");
                    setCopied(false);
                    setCopyError(false);
                  }}
                >
                  <span className={`option-dot dot-${item.id}`} />
                  {item.shortLabel}
                  <ArrowUpRight size={15} />
                </button>
              ))}
            </div>
            <div className="demo-workspace">
              <div className="finding-pane" aria-live="polite">
                <div className="finding-top">
                  <span className={`status status-${example.id}`}>
                    {example.label}
                  </span>
                  <span className="small-note">Synthetic case / 001</span>
                </div>
                <h3>{example.finding}</h3>
                <div className="demo-quotes">
                  <div>
                    <span className="detail-label">In the hearing</span>
                    <blockquote>“{example.quote}”</blockquote>
                    <button
                      className="text-source"
                      aria-pressed={source === "transcript"}
                      onClick={() => setSource("transcript")}
                    >
                      <FileText size={16} />
                      Transcript · {example.time}
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <div>
                    <span className="detail-label">In the case file</span>
                    <blockquote>“{example.earlier}”</blockquote>
                    <button
                      className="text-source"
                      aria-pressed={source === "statement"}
                      onClick={() => setSource("statement")}
                    >
                      <FileText size={16} />
                      Witness statement · Page {example.page}
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
                <p className="finding-explanation">{example.explanation}</p>
                <div className="verification">
                  <span className="detail-label">What to verify</span>
                  <p>{example.verify}</p>
                </div>
                <button
                  className={`review-button ${isReviewed ? "is-reviewed" : ""}`}
                  aria-pressed={isReviewed}
                  onClick={() =>
                    setReviewed(
                      isReviewed
                        ? reviewed.filter((id) => id !== example.id)
                        : [...reviewed, example.id],
                    )
                  }
                >
                  {isReviewed ? <Check size={16} /> : <Plus size={16} />}
                  {isReviewed ? "Marked as reviewed" : "Mark as reviewed"}
                  <span>For this visit only</span>
                </button>
              </div>
              <aside
                className="source-pane"
                aria-label="Original source excerpts"
              >
                <div className="source-pane-title">
                  <FileText size={18} />
                  <h3>At the source</h3>
                  <span>Synthetic</span>
                </div>
                <div
                  className="source-tabs"
                  role="group"
                  aria-label="Source document"
                >
                  <button
                    aria-pressed={source === "transcript"}
                    onClick={() => setSource("transcript")}
                  >
                    Hearing transcript
                  </button>
                  <button
                    aria-pressed={source === "statement"}
                    onClick={() => setSource("statement")}
                  >
                    Witness statement
                  </button>
                </div>
                <div
                  className="document-excerpt"
                  ref={excerpt}
                  aria-live="polite"
                >
                  <div className="document-meta">
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
                  <div className="excerpt-lines">
                    {(source === "transcript"
                      ? example.transcript
                      : example.statement
                    ).map((line, i) => (
                      <p key={`${example.id}-${source}-${i}`}>
                        <span className="line-number" aria-hidden="true">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span>{i === 1 ? <mark>{line}</mark> : line}</span>
                      </p>
                    ))}
                  </div>
                  <p className="excerpt-footnote">
                    Prepared example for demonstration. Not a real case record
                    or legal reference.
                  </p>
                </div>
                <div className="suggested-question">
                  <span className="detail-label">A question to consider</span>
                  <p>{example.question}</p>
                  <button className="text-action" onClick={copyQuestion}>
                    {copied ? "Copied" : "Copy question"}
                    {copied ? <Check size={15} /> : <ArrowUpRight size={15} />}
                  </button>
                  <span className="copy-feedback" role="status">
                    {copyError
                      ? "Copy unavailable. Select the question above to copy it manually."
                      : copied
                        ? "Question copied to clipboard."
                        : ""}
                  </span>
                </div>
              </aside>
            </div>
            <p className="demo-footer-note">
              These labels describe the relationship between a statement and the
              available evidence. They do not establish credibility, guilt, or a
              legal conclusion.
            </p>
          </div>
        </section>
        <section
          className="approach wrap section-space"
          id="approach"
          aria-labelledby="approach-title"
        >
          <div className="approach-lead">
            <h2 id="approach-title">
              Your judgment.
              <br />
              Better informed.
            </h2>
            <p>
              Built around a simple principle: the person examining the evidence
              should always be able to question the finding.
            </p>
            <a href="#questions" className="text-action">
              A few important questions <ArrowDown size={17} />
            </a>
          </div>
          <div className="principles">
            <article>
              <span className="principle-icon">
                <FileText size={22} strokeWidth={1.3} />
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
              <span className="principle-icon">
                <Minus size={22} strokeWidth={1.3} />
              </span>
              <div>
                <h3>Uncertainty stays visible.</h3>
                <p>
                  Missing context and insufficient evidence are meaningful
                  results. Jude should surface those limits, rather than force a
                  conclusion.
                </p>
              </div>
            </article>
            <article>
              <span className="principle-icon">
                <Check size={22} strokeWidth={1.3} />
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
          className="questions wrap section-space"
          id="questions"
          aria-labelledby="questions-title"
        >
          <h2 id="questions-title">
            Before we enter
            <br />
            the courtroom.
          </h2>
          <div className="faq-list">
            <details>
              <summary>
                Who is Jude being built for?
                <ChevronDown size={20} />
              </summary>
              <p>
                The first use case is lawyers in Indonesian criminal
                proceedings. The current MVP includes a synthetic hearing and a
                case workspace. Prosecutor and judge workflows would require
                separate role-specific capabilities and safeguards.
              </p>
            </details>
            <details>
              <summary>
                Is this a live courtroom product?
                <ChevronDown size={20} />
              </summary>
              <p>
                Jude is an MVP for evaluation using synthetic or authorized
                material. The workspace supports case documents, transcripts,
                source-linked findings, and review notes. Live speech and AI
                analysis require configured providers; the synthetic hearing
                runs without them. External integrations still require live
                validation before operational use.
              </p>
            </details>
            <details>
              <summary>
                Does an inconsistency mean a witness is wrong?
                <ChevronDown size={20} />
              </summary>
              <p>
                No. Different accounts can reflect different events, ambiguous
                questions, incomplete context, or other explanations. Jude is
                intended to identify what may warrant examination—not decide
                whether a witness is lying or a defendant is guilty.
              </p>
            </details>
            <details>
              <summary>
                How will Indonesian legal references be used?
                <ChevronDown size={20} />
              </summary>
              <p>
                The proposed product will retrieve relevant Indonesian
                legislation through Pasal.id, subject to available permissions.
                Verified legal text must be distinguished from metadata and
                unverified references. This demo does not retrieve or present
                legal advice.
              </p>
            </details>
            <details>
              <summary>
                Can I upload case documents here?
                <ChevronDown size={20} />
              </summary>
              <p>
                The authenticated workspace accepts text-based PDF, DOCX, TXT,
                and Markdown documents, with original downloads and inspectable
                passages. Use synthetic or appropriately authorized material.
                Scanned PDFs require OCR before upload.
              </p>
            </details>
          </div>
        </section>
        <section className="closing">
          <div className="wrap">
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
              <button
                className="button button-cream"
                onClick={() => openDemo()}
              >
                Explore the demo <ArrowRight size={21} />
              </button>
              <span className="closing-note">
                Designed for Indonesian legal professionals.
              </span>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer wrap">
        <a className="wordmark" href="#top" aria-label="Jude home">
          jude.
        </a>
        <p>Evidence-grounded courtroom intelligence.</p>
        <span>Product concept · 2026</span>
        <a href="#top">
          Back to top <ArrowUpRight size={14} />
        </a>
      </footer>
    </>
  );
}
