"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Check,
  FileText,
  FolderOpen,
  GitBranch,
  Link2,
  Pause,
  Play,
  RotateCcw,
  Upload,
} from "lucide-react";
import type { SourceKind } from "@/lib/jude-demo";
import styles from "./landing-paper.module.css";

export function PaperHero({
  openDemo,
}: {
  openDemo: (source?: SourceKind, reset?: boolean) => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [take, setTake] = useState(0);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let started = false;
    const motion = () => {
      setReduced(preference.matches);
      if (preference.matches) setRunning(false);
    };
    motion();
    preference.addEventListener("change", motion);
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting && !started && !preference.matches) {
          started = true;
          setRunning(true);
        }
      },
      { threshold: 0.2 },
    );
    if (stage.current) observer.observe(stage.current);
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return (
    <section className={styles.hero} aria-labelledby="landing-title">
      <div className={styles.heroCopy}>
        <h1 id="landing-title">
          Stay with the testimony.
          <br />
          <span>See the whole story.</span>
        </h1>
        <p>
          Your case has a lot to say. Jude brings testimony, documents, and the
          connections between them into focus.
        </p>
        <div className={styles.heroActions}>
          <a href="/workspace" className={styles.primary}>
            Open your workspace <ArrowUpRight size={18} />
          </a>
          <button className={styles.secondary} onClick={() => openDemo()}>
            <Play size={14} /> Try an example
          </button>
        </div>
        <span className={styles.audience}>
          An evidence-grounded copilot for Indonesian legal professionals.
        </span>
      </div>
      <div className={styles.stageFrame} ref={stage}>
        <div
          className={`${styles.stage} ${running ? styles.running : ""}`}
          data-motion-paused={paused || !visible || hidden}
        >
          <div className={styles.stageHeader}>
            <span>
              <FolderOpen size={15} /> The warehouse hearing
            </span>
            <span>Synthetic illustration</span>
          </div>
          <div className={styles.paperScene} key={take}>
            <svg
              className={styles.connections}
              viewBox="0 0 1100 410"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M365 160 C510 135 525 90 710 152" />
              <path d="M830 265 C805 365 660 380 560 325" />
              <circle cx="365" cy="160" r="4" />
              <circle cx="710" cy="152" r="4" />
            </svg>
            <article className={`${styles.sheet} ${styles.testimony}`}>
              <div className={styles.sheetHeading}>
                <AudioLines size={20} />
                <h2>In the hearing</h2>
              </div>
              <p className={styles.documentMeta}>
                Witness testimony · 00:14:32
              </p>
              <blockquote>
                “I arrived at
                <br />
                <mark>9:30 PM.</mark>”
              </blockquote>
              <div className={styles.sheetRule} />
              <button onClick={() => openDemo("transcript", true)}>
                Read the transcript <ArrowUpRight size={16} />
              </button>
            </article>
            <article className={`${styles.sheet} ${styles.statement}`}>
              <div className={styles.sheetHeading}>
                <FileText size={20} />
                <h2>In the case file</h2>
              </div>
              <p className={styles.documentMeta}>
                Earlier witness statement · Page 4
              </p>
              <blockquote>
                “I arrived shortly
                <br />
                <mark>after 8:00 PM.</mark>”
              </blockquote>
              <div className={styles.sheetRule} />
              <button onClick={() => openDemo("statement", true)}>
                Read the statement <ArrowUpRight size={16} />
              </button>
            </article>
            <article
              className={styles.questionNote}
              onAnimationEnd={(event) => {
                if (event.target === event.currentTarget) setRunning(false);
              }}
            >
              <h3>
                A difference. <br />A better question.
              </h3>
              <span className={styles.noteStatus}>Potential inconsistency</span>
              <p>Do both accounts refer to the same event?</p>
              <button onClick={() => openDemo("statement", true)}>
                Examine the sources <ArrowRight size={15} />
              </button>
            </article>
          </div>
          <div className={styles.stageFooter}>
            <span>
              <Link2 size={14} /> Follow the source. Keep the context.
            </span>
            <span>Human judgment comes next.</span>
          </div>
        </div>
        <div className={styles.motionBar}>
          <p>Two accounts. One question worth asking.</p>
          <div className={styles.motionControls}>
            {running && (
              <button
                onClick={() => setPaused(!paused)}
                aria-label={
                  paused ? "Resume paper animation" : "Pause paper animation"
                }
              >
                {paused ? <Play size={14} /> : <Pause size={14} />}
                {paused ? "Resume" : "Pause"}
              </button>
            )}
            <button
              disabled={reduced}
              onClick={() => {
                setTake(take + 1);
                setPaused(false);
                setRunning(true);
              }}
              aria-label="Replay paper animation"
            >
              <RotateCcw size={14} />
              {reduced ? "Reduced motion" : "Replay"}
            </button>
          </div>
        </div>
      </div>
      <a className={styles.scrollCue} href="#how-it-works">
        A little less searching. A little more seeing.
        <ArrowDown size={17} />
      </a>
    </section>
  );
}

const chapters = [
  {
    title: "Bring the whole case.",
    text: "Start with the documents you already have. Keep originals close, and move the complete record with a .jude file.",
    label: "Case files",
    icon: FolderOpen,
  },
  {
    title: "Give every hearing its place.",
    text: "Upload a transcript in one go. Review its speaker turns, then keep the testimony and its findings together.",
    label: "Hearings",
    icon: AudioLines,
  },
  {
    title: "Find the thread between them.",
    text: "Ask in your own words. Follow relevant passages across an evidence map, and inspect each suggested connection.",
    label: "Evidence",
    icon: GitBranch,
  },
];

export function PaperWorkflow() {
  const [chapter, setChapter] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <section
      className={styles.workflow}
      id="how-it-works"
      aria-labelledby="workflow-title"
    >
      <div className={styles.workflowHeading}>
        <h2 id="workflow-title">
          Less shuffling.
          <br />
          More understanding.
        </h2>
        <p>
          From a stack of documents to a case you can navigate. Everything has a
          place. Every connection has a source.
        </p>
      </div>
      <div className={styles.workflowBody}>
        <div
          className={styles.chapters}
          role="tablist"
          aria-label="Explore the workspace"
          aria-orientation="vertical"
        >
          {chapters.map((item, i) => (
            <button
              key={item.label}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              id={`chapter-${i}`}
              role="tab"
              aria-selected={chapter === i}
              aria-controls="workspace-preview"
              tabIndex={chapter === i ? 0 : -1}
              onClick={() => setChapter(i)}
              onKeyDown={(e) => {
                const next =
                  e.key === "ArrowDown"
                    ? (i + 1) % 3
                    : e.key === "ArrowUp"
                      ? (i + 2) % 3
                      : e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? 2
                          : null;
                if (next !== null) {
                  e.preventDefault();
                  setChapter(next);
                  tabs.current[next]?.focus();
                }
              }}
            >
              <span className={styles.chapterTitle}>
                {item.title}
                <ArrowUpRight size={20} />
              </span>
              <span className={styles.chapterText}>{item.text}</span>
            </button>
          ))}
        </div>
        <div className={styles.previewSurface}>
          <div className={styles.previewTop}>
            <span className={styles.previewBrand}>jude.</span>
            <span>The warehouse hearing</span>
            <span className={styles.sample}>Synthetic</span>
          </div>
          <div className={styles.previewTabs} aria-hidden="true">
            {chapters.map((item, i) => {
              const Icon = item.icon;
              return (
                <span
                  key={item.label}
                  className={chapter === i ? styles.previewTabActive : ""}
                >
                  <Icon size={15} />
                  {item.label}
                </span>
              );
            })}
          </div>
          <div
            role="tabpanel"
            id="workspace-preview"
            aria-labelledby={`chapter-${chapter}`}
            tabIndex={0}
            className={styles.previewContent}
            key={chapter}
          >
            {chapter === 0 ? (
              <>
                <div className={styles.previewTitle}>
                  <h3>A place for every piece.</h3>
                  <FileText size={23} />
                </div>
                <div className={styles.fileRows}>
                  {[
                    ["Witness statement.pdf", "Earlier account · 6 pages"],
                    ["Investigation notes.docx", "Context and follow-up"],
                    ["Warehouse hearing.jude", "Portable case record"],
                  ].map(([name, detail], i) => (
                    <div key={name}>
                      <span className={styles.fileIcon}>
                        <FileText size={19} />
                      </span>
                      <div>
                        <strong>{name}</strong>
                        <span>{detail}</span>
                      </div>
                      <Check
                        size={16}
                        aria-label={i === 2 ? "Export ready" : "Saved"}
                      />
                    </div>
                  ))}
                </div>
                <p className={styles.previewNote}>
                  <FolderOpen size={15} />
                  Original files stay attached to their source passages.
                </p>
              </>
            ) : chapter === 1 ? (
              <>
                <div className={styles.previewTitle}>
                  <h3>The examination, together.</h3>
                  <AudioLines size={23} />
                </div>
                <div className={styles.transcriptImport}>
                  <Upload size={20} />
                  <div>
                    <strong>witness-examination.txt</strong>
                    <span>Transcript ready for your review</span>
                  </div>
                  <Check size={17} />
                </div>
                <div className={styles.previewTranscript}>
                  <div>
                    <span>Counsel</span>
                    <p>What time did you arrive?</p>
                  </div>
                  <div>
                    <span>Witness</span>
                    <p>I arrived at 9:30 PM.</p>
                  </div>
                </div>
                <p className={styles.previewNote}>
                  Review the wording and speaker labels before import.
                </p>
              </>
            ) : (
              <>
                <div className={styles.previewQuestion}>
                  <span>
                    <GitBranch size={17} />
                    What differs about the arrival time?
                  </span>
                  <ArrowRight size={17} />
                </div>
                <div
                  className={styles.miniGraph}
                  aria-label="Illustration: testimony and earlier statement connected to an arrival-time question"
                >
                  <svg viewBox="0 0 540 195" aria-hidden="true">
                    <path d="M100 55 L270 145 L440 55" />
                    <circle cx="100" cy="55" r="23" />
                    <circle cx="440" cy="55" r="23" />
                    <circle cx="270" cy="145" r="23" />
                  </svg>
                  <span className={styles.graphLabelLeft}>
                    Testimony
                    <br />
                    <strong>9:30 PM</strong>
                  </span>
                  <span className={styles.graphLabelRight}>
                    Earlier statement
                    <br />
                    <strong>After 8:00 PM</strong>
                  </span>
                  <span className={styles.graphLabelBottom}>Same event?</span>
                </div>
                <p className={styles.previewNote}>
                  A possible difference to verify, not a conclusion.
                </p>
              </>
            )}
          </div>
          <div className={styles.previewBottom}>
            <span>Illustration · no AI runs here</span>
            <a href="/workspace">
              Try the workspace <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
