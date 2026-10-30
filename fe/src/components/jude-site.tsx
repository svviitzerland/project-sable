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
import { PaperHero, PaperWorkflow } from "./landing-paper";
import styles from "./landing-paper.module.css";

const nav = [
  ["The workspace", "#how-it-works"],
  ["See the evidence", "#demo"],
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
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (menuOpen)
      document
        .querySelector<HTMLAnchorElement>("#mobile-navigation a")
        ?.focus();
  }, [menuOpen]);
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
    <div className={styles.page}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={styles.header} id="top">
        <a className={styles.brand} href="#top" aria-label="Jude home">
          jude.
        </a>
        <nav className={styles.navigation} aria-label="Main navigation">
          {nav.map(([label, href]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
          <a className={styles.headerAction} href="/workspace">
            Open workspace <ArrowUpRight size={16} />
          </a>
        </nav>
        <button
          ref={menuButton}
          className={styles.menuButton}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        {menuOpen && (
          <nav
            id="mobile-navigation"
            className={styles.mobileNavigation}
            aria-label="Mobile navigation"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setMenuOpen(false);
                menuButton.current?.focus();
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
      <main id="main">
        <PaperHero openDemo={openDemo} />
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
        <PaperWorkflow />
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
                  key={`${example.id}-${source}`}
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
                The workspace supports legal-reference discovery through
                Pasal.id when configured. Discovery metadata is kept separate
                from case evidence; read and verify the original legislation
                before relying on it. This illustration does not retrieve legal
                references or provide legal advice.
              </p>
            </details>
            <details>
              <summary>
                Can I upload case documents here?
                <ChevronDown size={20} />
              </summary>
              <p>
                Yes. The workspace accepts text-based PDF, DOCX, TXT, and
                Markdown evidence and complete hearing transcripts. Readable
                unfamiliar transcript layouts can be converted with a configured
                AI model, then reviewed before import. Export and import
                complete cases with .jude. Use synthetic or authorized material;
                scanned PDFs need OCR first.
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
              <a className="button button-cream" href="/workspace">
                Open your workspace <ArrowUpRight size={21} />
              </a>
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
        <span>MVP · For evaluation</span>
        <a href="#top">
          Back to top <ArrowUpRight size={14} />
        </a>
      </footer>
    </div>
  );
}
