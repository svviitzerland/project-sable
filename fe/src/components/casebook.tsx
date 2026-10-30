"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  Check,
  Download,
  FileText,
  GitBranch,
  Link2,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  api,
  type Case,
  type Hearing,
  type CaseDetail,
  type Source,
  type Citation,
} from "@/lib/workspace-api";
import ui from "./workspace.module.css";
import styles from "./casebook.module.css";

type Turn = { speaker: string; text: string; start: number; end: number };
type HearingFile = {
  format: "jude";
  version: 1;
  kind: "hearing";
  title: string;
  date: string;
  segments: Turn[];
};
type Preview = { hearing: HearingFile | null; method: string; notice: string };

export function ArchiveImport({
  onImport,
}: {
  onImport: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className={styles.archiveImport}>
      <label className={styles.archiveButton}>
        <Upload size={16} />
        {busy ? "Importing case…" : "Import .jude"}
        <input
          type="file"
          accept=".jude"
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setBusy(true);
            setError("");
            try {
              if (file.size > 64 * 1024 * 1024)
                throw new Error("Use a .jude case archive up to 64 MB.");
              const body = new FormData();
              body.append("file", file);
              const imported = await api<Case>("/cases/import", {
                method: "POST",
                body,
              });
              await onImport(imported.id);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export function HearingLibrary({
  detail,
  onOpen,
  refresh,
  configured,
}: {
  detail: CaseDetail;
  onOpen: (id: string) => void;
  refresh: () => Promise<void>;
  configured: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [hearingQuery, setHearingQuery] = useState("");
  const [reviewOnly, setReviewOnly] = useState(false);
  const hearingRows = detail.hearings.map((hearing) => {
    const segments = detail.segments.filter((s) => s.hearing_id === hearing.id);
    const segmentIds = new Set(segments.map((s) => s.id));
    const findings = detail.findings.filter((f) =>
      segmentIds.has(f.segment_id),
    );
    return {
      hearing,
      segments,
      findings,
      remaining: findings.filter((f) => !f.reviewed).length,
    };
  });
  const hearingTerm = hearingQuery.trim().toLocaleLowerCase();
  const matchingHearings = hearingRows.filter(
    ({ hearing, segments, remaining }) =>
      (!reviewOnly || remaining > 0) &&
      (!hearingTerm ||
        [hearing.title, hearing.date, ...segments.map((s) => s.text)].some(
          (text) => text.toLocaleLowerCase().includes(hearingTerm),
        )),
  );
  async function prepare(selected: File, convert = false) {
    setBusy(convert ? "Converting transcript…" : "Reading transcript…");
    setError("");
    try {
      const body = new FormData();
      body.append("file", selected);
      body.append("convert", String(convert));
      const result = await api<Preview>(
        `/cases/${detail.case.id}/hearings/preview`,
        { method: "POST", body },
      );
      setPreview(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  function editTurn(index: number, values: Partial<Turn>) {
    setPreview((current) =>
      current?.hearing
        ? {
            ...current,
            hearing: {
              ...current.hearing,
              segments: current.hearing.segments.map((turn, i) =>
                i === index ? { ...turn, ...values } : turn,
              ),
            },
          }
        : current,
    );
  }
  return (
    <div className={styles.hearings}>
      <div className={styles.sectionHeader}>
        <div>
          <h2>Hearings</h2>
          <p>
            A complete record for every examination. Bring in a transcript, then
            follow its evidence.
          </p>
        </div>
        <button
          className={ui.secondary}
          onClick={() => setCreating(!creating)}
          disabled={!!busy}
        >
          <Plus size={16} />
          New hearing
        </button>
      </div>
      <div className={styles.importWell}>
        <div className={styles.importIcon}>
          <AudioLines size={28} />
        </div>
        <div>
          <h3>Bring the whole hearing.</h3>
          <p>
            Upload a transcript instead of entering each statement. Review it
            here before adding it to your case.
          </p>
          <small>
            .jude, JSON, CSV, TXT, SRT, VTT, PDF or DOCX · up to 6 MB
          </small>
        </div>
        <button
          className={ui.primary}
          onClick={() => input.current?.click()}
          disabled={!!busy}
        >
          <Upload size={16} />
          Upload transcript
        </button>
        <input
          ref={input}
          aria-label="Upload hearing transcript"
          className={ui.srOnly}
          type="file"
          accept=".jude,.json,.csv,.txt,.md,.srt,.vtt,.pdf,.docx"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            event.target.value = "";
            if (selected) {
              setFile(selected);
              setPreview(null);
              void prepare(selected);
            }
          }}
        />
      </div>
      <div className={styles.formatHint}>
        <a href="/api/v1/hearing-template">
          <Download size={14} />
          Download a .jude hearing template
        </a>
        <span>
          Readable files with unfamiliar layouts can be converted with AI.
        </span>
      </div>
      {error && (
        <p role="alert" className={ui.error}>
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className={styles.progress}>
          <LoaderCircle size={16} />
          {busy}
        </p>
      )}
      {creating && (
        <form
          className={styles.newHearing}
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy("Creating hearing…");
            setError("");
            try {
              const hearing = await api<Hearing>(
                `/cases/${detail.case.id}/hearings`,
                { method: "POST", body: JSON.stringify({ title, date }) },
              );
              await refresh();
              onOpen(hearing.id);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy("");
            }
          }}
        >
          <label>
            Hearing title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={160}
              placeholder="Witness examination · day two"
            />
          </label>
          <label>
            Date{" "}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <button className={ui.primary} disabled={!!busy}>
            Create hearing
          </button>
        </form>
      )}
      {file && (preview || error) && (
        <section
          className={styles.preview}
          aria-label="Transcript import preview"
        >
          <header>
            <div>
              <FileText size={19} />
              <strong>{file.name}</strong>
              <span>
                {preview?.method === "ai_converted"
                  ? "AI conversion · review required"
                  : "Import preview"}
              </span>
            </div>
            <button
              aria-label="Close import preview"
              onClick={() => {
                setPreview(null);
                setFile(null);
                setError("");
              }}
              disabled={!!busy}
            >
              <X size={18} />
            </button>
          </header>
          <p>
            {preview?.notice ||
              "Choose a supported text file or use the hearing template."}
          </p>
          {preview?.hearing ? (
            <>
              <div className={styles.previewFields}>
                <label>
                  Imported hearing title
                  <input
                    value={preview.hearing.title}
                    maxLength={160}
                    onChange={(e) =>
                      setPreview({
                        ...preview,
                        hearing: { ...preview.hearing!, title: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  Hearing date
                  <input
                    type="date"
                    value={preview.hearing.date}
                    onChange={(e) =>
                      setPreview({
                        ...preview,
                        hearing: { ...preview.hearing!, date: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
              <div className={styles.previewTurns}>
                {preview.hearing.segments.map((turn, index) => (
                  <div key={index} className={styles.previewTurn}>
                    <label>
                      Speaker {index + 1}
                      <input
                        aria-label={`Speaker for statement ${index + 1}`}
                        value={turn.speaker}
                        maxLength={80}
                        onChange={(e) =>
                          editTurn(index, { speaker: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Statement {index + 1}
                      <textarea
                        aria-label={`Statement ${index + 1}`}
                        value={turn.text}
                        rows={2}
                        maxLength={6000}
                        onChange={(e) =>
                          editTurn(index, { text: e.target.value })
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
              <footer>
                <span>
                  {preview.hearing.segments.length} statements · original upload
                  preserved
                </span>
                <button
                  className={ui.primary}
                  disabled={!!busy || !preview.hearing.title.trim()}
                  onClick={async () => {
                    setBusy("Importing hearing…");
                    setError("");
                    try {
                      const body = new FormData();
                      body.append("file", file);
                      body.append(
                        "transcript",
                        JSON.stringify(preview.hearing),
                      );
                      const hearing = await api<Hearing>(
                        `/cases/${detail.case.id}/hearings/import`,
                        { method: "POST", body },
                      );
                      await refresh();
                      onOpen(hearing.id);
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy("");
                    }
                  }}
                >
                  <Check size={16} />
                  Confirm & import hearing
                </button>
              </footer>
            </>
          ) : (
            preview?.method === "conversion_required" && (
              <div className={styles.conversion}>
                <p>
                  The converter preserves source wording and leaves uncertain
                  timing unknown. You will review its proposed speaker turns
                  before import.
                </p>
                <button
                  className={ui.primary}
                  disabled={!!busy || !configured}
                  onClick={() => void prepare(file, true)}
                >
                  <Sparkles size={16} />
                  Convert with AI
                </button>
                {!configured && (
                  <small>
                    Connect an OpenRouter analysis model in the backend to
                    enable conversion. The template works without AI.
                  </small>
                )}
              </div>
            )
          )}
        </section>
      )}
      <div className={styles.hearingList}>
        <div className={styles.listHeading}>
          <h3>Case hearings</h3>
          <span role="status">
            {matchingHearings.length} of {detail.hearings.length} hearings
          </span>
        </div>
        {detail.hearings.length > 0 && (
          <div className={styles.libraryFilters}>
            <label>
              <span className={ui.srOnly}>Search hearings</span>
              <input
                type="search"
                value={hearingQuery}
                onChange={(e) => setHearingQuery(e.target.value)}
                placeholder="Find a hearing or transcript phrase…"
              />
            </label>
            <button
              className={ui.secondary}
              aria-pressed={reviewOnly}
              onClick={() => setReviewOnly(!reviewOnly)}
            >
              <ShieldCheck size={16} /> Needs review
            </button>
          </div>
        )}
        {matchingHearings.length ? (
          matchingHearings.map(({ hearing, segments, findings, remaining }) => {
            return (
              <button
                key={hearing.id}
                className={styles.hearingRow}
                onClick={() => onOpen(hearing.id)}
              >
                <AudioLines size={23} />
                <div>
                  <h3>{hearing.title}</h3>
                  <p>
                    {hearing.date || "Date not set"} ·{" "}
                    {hearing.kind === "simulation"
                      ? "Synthetic exercise"
                      : hearing.kind === "imported"
                        ? "Imported transcript"
                        : "Hearing record"}
                  </p>
                </div>
                <div className={styles.hearingCounts}>
                  <strong>{segments.length} statements</strong>
                  <span>
                    {findings.length} findings
                    {findings.length > 0 &&
                      ` · ${remaining ? `${remaining} to review` : "All reviewed"}`}
                  </span>
                </div>
                <span className={styles.hearingStatus}>{hearing.status}</span>
                <ArrowRight size={17} />
              </button>
            );
          })
        ) : detail.hearings.length ? (
          <div className={styles.empty}>
            <Search size={28} />
            <h3>No hearings match this view.</h3>
            <p>Try another phrase or show all hearings.</p>
            <button
              className={ui.secondary}
              onClick={() => {
                setHearingQuery("");
                setReviewOnly(false);
              }}
            >
              Clear hearing filters
            </button>
          </div>
        ) : (
          <div className={styles.empty}>
            <AudioLines size={32} />
            <h3>Your first hearing starts here.</h3>
            <p>
              Upload a prepared transcript or create a hearing for live audio
              and manual notes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

type GraphNode = {
  id: string;
  kind: "passage" | "statement";
  label: string;
  detail: string;
  text: string;
  document_id?: string;
  page?: number;
  hearing_id?: string;
  finding_id?: string;
};
type Edge = {
  id: string;
  source_id: string;
  target_id: string;
  relation: string;
  explanation: string;
  basis: string;
  confirmed: boolean;
  score: number | null;
  source_quote: string;
  target_quote: string;
  kind: string;
};
type Graph = {
  nodes: GraphNode[];
  edges: Edge[];
  total_passages: number;
  shown_passages: number;
  indexed_passages: number;
  notice: string;
};
type Answer = {
  answer: string | null;
  citations: Citation[];
  sources: Source[];
  method: string;
  notice: string;
};
const relationColors: Record<string, string> = {
  supports: "#4b7958",
  conflicts: "#b57539",
  context: "#83709b",
  related: "#8e9e91",
};

const relationTextColors: Record<string, string> = {
  supports: "#315841",
  conflicts: "#835025",
  context: "#67547e",
  related: "#546758",
};

export function EvidenceWorkspace({
  caseId,
  openHearing,
}: {
  caseId: string;
  openHearing: (id: string) => void;
}) {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [edgeId, setEdgeId] = useState<string | null>(null);
  const [view, setView] = useState<"graph" | "list">("graph");
  const [zoom, setZoom] = useState(1);
  const [linking, setLinking] = useState(false);
  const [target, setTarget] = useState("");
  const [relation, setRelation] = useState("related");
  const [explanation, setExplanation] = useState("");
  async function load() {
    setGraph(await api<Graph>(`/cases/${caseId}/graph`));
  }
  useEffect(() => {
    let alive = true;
    api<Graph>(`/cases/${caseId}/graph`)
      .then((data) => {
        if (alive) setGraph(data);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [caseId]);
  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const sourceFromSearch = answer?.sources.find((s) => s.id === selected);
  const node =
    graph?.nodes.find((n) => n.id === selected) ??
    (sourceFromSearch
      ? {
          id: sourceFromSearch.id,
          kind: "passage" as const,
          label: sourceFromSearch.document_name,
          detail: `Page ${sourceFromSearch.page}`,
          text: sourceFromSearch.text,
          document_id: sourceFromSearch.document_id,
          page: sourceFromSearch.page,
        }
      : null);
  const edge = graph?.edges.find((e) => e.id === edgeId);
  const nodeMap = new Map(graph?.nodes.map((n) => [n.id, n]) ?? []);
  const visible = (graph?.nodes ?? []).slice(0, 24);
  const positions = new Map(
    visible.map((n, index) => {
      const angle =
        (index / Math.max(1, visible.length)) * Math.PI * 2 - Math.PI / 2;
      return [
        n.id,
        { x: 400 + Math.cos(angle) * 285, y: 300 + Math.sin(angle) * 215 },
      ];
    }),
  );
  const inspectorReturn = useRef<HTMLElement | SVGElement | null>(null);
  function focusInspector() {
    if (
      !document
        .getElementById("evidence-detail")
        ?.contains(document.activeElement)
    )
      inspectorReturn.current = document.activeElement as
        | HTMLElement
        | SVGElement;
    if (window.innerWidth < 1000)
      requestAnimationFrame(() => {
        const inspector = document.getElementById("evidence-detail");
        inspector?.focus({ preventScroll: true });
        inspector?.scrollIntoView({ behavior: "instant", block: "start" });
      });
  }
  function inspect(id: string) {
    setSelected(id);
    setEdgeId(null);
    setLinking(false);
    focusInspector();
  }
  function inspectEdge(id: string) {
    setEdgeId(id);
    setSelected(null);
    setLinking(false);
    focusInspector();
  }
  return (
    <div className={styles.evidence}>
      <div className={styles.sectionHeader}>
        <div>
          <h2>Follow the evidence.</h2>
          <p>
            Ask the case a question. Trace each answer back to its sources and
            the connections between them.
          </p>
        </div>
        <button
          className={ui.secondary}
          disabled={!!busy}
          onClick={() =>
            run("Finding connections…", async () => {
              const result = await api<{ notice: string; scope: string }>(
                `/cases/${caseId}/graph/build`,
                { method: "POST" },
              );
              setNotice(result.notice + " " + result.scope);
              await load();
            })
          }
        >
          <GitBranch size={16} />
          Find connections
        </button>
      </div>
      <form
        className={styles.askForm}
        onSubmit={(e) => {
          e.preventDefault();
          void run("Searching the case…", async () => {
            setAnswer(
              await api<Answer>(`/cases/${caseId}/ask`, {
                method: "POST",
                body: JSON.stringify({ query }),
              }),
            );
          });
        }}
      >
        <Search size={20} />
        <label className={ui.srOnly} htmlFor="ask-evidence">
          Ask about this case
        </label>
        <input
          id="ask-evidence"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do the witnesses say about the arrival time?"
          required
          minLength={2}
          maxLength={600}
        />
        <button className={ui.primary} disabled={!!busy}>
          Search evidence
          <ArrowRight size={16} />
        </button>
      </form>
      {error && (
        <p className={ui.error} role="alert">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className={styles.progress}>
          <LoaderCircle size={16} />
          {busy}
        </p>
      )}
      {notice && (
        <p className={styles.graphNotice} role="status">
          {notice}
        </p>
      )}
      {answer && (
        <section className={styles.answer}>
          <header>
            <h3>
              {answer.answer ? "A source-grounded answer" : "Relevant passages"}
            </h3>
            <span>
              {answer.method === "hybrid"
                ? "Semantic + keyword retrieval"
                : "Keyword retrieval"}
            </span>
            <button
              aria-label="Close search results"
              onClick={() => setAnswer(null)}
            >
              <X size={17} />
            </button>
          </header>
          {answer.answer && <p>{answer.answer}</p>}
          {answer.notice && <p>{answer.notice}</p>}
          <div className={styles.searchSources}>
            {answer.sources.map((source, index) => (
              <button key={source.id} onClick={() => inspect(source.id)}>
                <span>{index + 1}</span>
                <div>
                  <strong>{source.document_name}</strong>
                  <small>{source.section || `Page ${source.page}`}</small>
                  <p>
                    {source.text.slice(0, 210)}
                    {source.text.length > 210 ? "…" : ""}
                  </p>
                  {answer.citations
                    .filter((c) => c.chunk_id === source.id)
                    .map((c, i) => (
                      <blockquote key={i}>“{c.quote}”</blockquote>
                    ))}
                </div>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
        </section>
      )}
      {!graph ? (
        <p className={styles.empty}>Loading evidence…</p>
      ) : (
        <>
          <div className={styles.graphToolbar}>
            <div className={styles.viewSwitch}>
              <button
                aria-pressed={view === "graph"}
                onClick={() => setView("graph")}
              >
                <GitBranch size={16} />
                Evidence map
              </button>
              <button
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <Link2 size={16} />
                Connections
              </button>
            </div>
            <span>
              {graph.total_passages} passages · {graph.indexed_passages}{" "}
              embedded · {graph.edges.length} links
            </span>
          </div>
          <div className={styles.graphLayout}>
            <section
              className={styles.graphCanvas}
              aria-label="Evidence relationships"
            >
              {view === "graph" ? (
                <>
                  {visible.length ? (
                    <>
                      <div className={styles.zoom}>
                        <button
                          aria-label="Zoom in"
                          onClick={() => setZoom(Math.min(2, zoom + 0.2))}
                        >
                          <ZoomIn size={17} />
                        </button>
                        <button
                          aria-label="Zoom out"
                          onClick={() => setZoom(Math.max(0.6, zoom - 0.2))}
                        >
                          <ZoomOut size={17} />
                        </button>
                        <button onClick={() => setZoom(1)}>Reset</button>
                      </div>
                      <svg
                        role="group"
                        aria-label="Interactive evidence graph"
                        viewBox={`${400 - 400 / zoom} ${300 - 300 / zoom} ${800 / zoom} ${600 / zoom}`}
                        className={styles.graphSvg}
                      >
                        {graph.edges.map((e) => {
                          const a = positions.get(e.source_id),
                            b = positions.get(e.target_id);
                          if (!a || !b) return null;
                          return (
                            <g key={e.id}>
                              <line
                                x1={a.x}
                                y1={a.y}
                                x2={b.x}
                                y2={b.y}
                                stroke={relationColors[e.relation]}
                                strokeWidth={edgeId === e.id ? 3 : 1.5}
                                strokeDasharray={e.confirmed ? "" : "5 5"}
                                opacity={
                                  selected &&
                                  e.source_id !== selected &&
                                  e.target_id !== selected
                                    ? 0.3
                                    : 0.8
                                }
                              />
                              <line
                                role="button"
                                tabIndex={0}
                                aria-label={`${e.relation}: ${nodeMap.get(e.source_id)?.label} to ${nodeMap.get(e.target_id)?.label}`}
                                onClick={() => {
                                  inspectEdge(e.id);
                                }}
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    inspectEdge(e.id);
                                  }
                                }}
                                x1={a.x}
                                y1={a.y}
                                x2={b.x}
                                y2={b.y}
                                stroke="transparent"
                                strokeWidth={14}
                              />
                            </g>
                          );
                        })}
                        {visible.map((n) => {
                          const pos = positions.get(n.id)!;
                          return (
                            <g
                              key={n.id}
                              transform={`translate(${pos.x},${pos.y})`}
                              role="button"
                              tabIndex={0}
                              aria-label={`${n.label}, ${n.detail}`}
                              onClick={() => inspect(n.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  inspect(n.id);
                                }
                              }}
                            >
                              <circle
                                r={selected === n.id ? 23 : 19}
                                fill={
                                  n.kind === "statement" ? "#ddc9a6" : "#eff3e9"
                                }
                                stroke={
                                  selected === n.id ? "#a66e27" : "#315541"
                                }
                                strokeWidth={selected === n.id ? 3 : 1.5}
                              />
                              <text
                                textAnchor="middle"
                                dominantBaseline="central"
                                className={styles.nodeNumber}
                              >
                                {n.kind === "statement"
                                  ? "H"
                                  : String(
                                      visible
                                        .filter((v) => v.kind === "passage")
                                        .indexOf(n) + 1,
                                    )}
                              </text>
                              <text
                                y={35}
                                textAnchor="middle"
                                className={styles.nodeLabel}
                              >
                                {n.label.length > 23
                                  ? n.label.slice(0, 21) + "…"
                                  : n.label}
                              </text>
                              <text
                                y={49}
                                textAnchor="middle"
                                className={styles.nodeDetail}
                              >
                                {n.detail}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                      <p className={styles.mapCaption}>
                        Select a passage or a connecting line. Dashed
                        connections await review. On a small screen, swipe
                        across the map or use Connections.
                      </p>
                    </>
                  ) : (
                    <div className={styles.empty}>
                      <GitBranch size={38} />
                      <h3>Build a picture of the case.</h3>
                      <p>
                        Add case documents or import a .jude case. Their
                        passages will appear here, ready to search and connect.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.edgeList}>
                  {graph.edges.length ? (
                    graph.edges.map((e) => (
                      <button
                        className={edgeId === e.id ? styles.selectedRow : ""}
                        key={e.id}
                        onClick={() => {
                          inspectEdge(e.id);
                        }}
                      >
                        <span
                          className={styles.relation}
                          style={{ color: relationTextColors[e.relation] }}
                        >
                          {e.relation}
                        </span>
                        <strong>
                          {nodeMap.get(e.source_id)?.label}{" "}
                          <ArrowRight size={12} />{" "}
                          {nodeMap.get(e.target_id)?.label}
                        </strong>
                        <small>
                          {e.confirmed ? "Reviewed" : "Suggested"} · {e.basis}
                        </small>
                      </button>
                    ))
                  ) : (
                    <div className={styles.empty}>
                      <Link2 size={30} />
                      <h3>No connections yet.</h3>
                      <p>
                        Find connections automatically, or select a passage to
                        create your own link.
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div className={styles.legend}>
                {Object.entries(relationColors).map(([name, color]) => (
                  <span key={name}>
                    <i style={{ background: color }} />
                    {name}
                  </span>
                ))}
              </div>
              {graph.nodes.length > 24 && view === "graph" && (
                <p className={styles.mapCaption}>
                  Map shows 24 nodes. All {graph.nodes.length} available nodes
                  are listed below; search covers the whole case.
                </p>
              )}
            </section>
            <aside
              id="evidence-detail"
              tabIndex={-1}
              className={styles.graphInspector}
              aria-label="Evidence inspector"
            >
              {(edge || node) && (
                <button
                  className={styles.inspectorBack}
                  onClick={() => {
                    const origin = inspectorReturn.current;
                    origin?.focus();
                    origin?.scrollIntoView({
                      behavior: "instant",
                      block: "center",
                    });
                  }}
                >
                  Back to evidence
                </button>
              )}
              {edge ? (
                <>
                  <h3>Examine the connection</h3>
                  <span
                    className={styles.relation}
                    style={{ color: relationTextColors[edge.relation] }}
                  >
                    {edge.relation} ·{" "}
                    {edge.confirmed ? "reviewed" : "suggested"}
                  </span>
                  <p>{edge.explanation}</p>
                  <div className={styles.edgeSource}>
                    <button onClick={() => inspect(edge.source_id)}>
                      {nodeMap.get(edge.source_id)?.label}
                      <ArrowRight size={14} />
                    </button>
                    <blockquote>“{edge.source_quote}”</blockquote>
                  </div>
                  <div className={styles.edgeSource}>
                    <button onClick={() => inspect(edge.target_id)}>
                      {nodeMap.get(edge.target_id)?.label}
                      <ArrowRight size={14} />
                    </button>
                    <blockquote>“{edge.target_quote}”</blockquote>
                  </div>
                  <p className={styles.muted}>
                    {edge.basis === "ai"
                      ? "AI-proposed relationship"
                      : edge.basis === "semantic"
                        ? "Embedding similarity"
                        : edge.basis === "keywords"
                          ? "Shared terms"
                          : edge.basis === "simulation"
                            ? "Authored synthetic example"
                            : edge.basis === "imported"
                              ? "Imported relationship"
                              : "Recorded relationship"}
                    .{" "}
                    {edge.score !== null
                      ? `Similarity ${(edge.score * 100).toFixed(0)}%; not a probability of truth.`
                      : ""}
                  </p>
                  {edge.kind === "evidence" && (
                    <button
                      className={ui.primary}
                      disabled={!!busy}
                      onClick={() =>
                        run("Saving review…", async () => {
                          await api(`/cases/${caseId}/links/${edge.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({
                              confirmed: !edge.confirmed,
                            }),
                          });
                          await load();
                        })
                      }
                    >
                      <Check size={16} />
                      {edge.confirmed
                        ? "Reopen connection"
                        : "Confirm connection"}
                    </button>
                  )}
                </>
              ) : node ? (
                <>
                  <h3>{node.label}</h3>
                  <span className={styles.muted}>{node.detail}</span>
                  <p className={styles.passage}>{node.text}</p>
                  {node.document_id && (
                    <a
                      className={ui.textButton}
                      href={`/api/v1/cases/${caseId}/documents/${node.document_id}/original`}
                    >
                      <Download size={14} />
                      Download original
                    </a>
                  )}
                  {node.hearing_id && (
                    <button
                      className={ui.secondary}
                      onClick={() => openHearing(node.hearing_id!)}
                    >
                      Open hearing
                      <ArrowRight size={14} />
                    </button>
                  )}
                  <h4>Connected evidence</h4>
                  {graph.edges
                    .filter(
                      (e) => e.source_id === node.id || e.target_id === node.id,
                    )
                    .map((e) => (
                      <button
                        key={e.id}
                        className={styles.neighbor}
                        onClick={() => {
                          inspectEdge(e.id);
                        }}
                      >
                        <span>{e.relation}</span>
                        {
                          nodeMap.get(
                            e.source_id === node.id ? e.target_id : e.source_id,
                          )?.label
                        }
                        <ArrowRight size={13} />
                      </button>
                    ))}
                  {node.kind === "passage" && (
                    <>
                      <button
                        className={ui.secondary}
                        onClick={() => setLinking(!linking)}
                      >
                        <Plus size={15} />
                        Link another passage
                      </button>
                      {linking && (
                        <form
                          className={styles.linkForm}
                          onSubmit={(e) => {
                            e.preventDefault();
                            void run("Saving connection…", async () => {
                              await api(`/cases/${caseId}/links`, {
                                method: "POST",
                                body: JSON.stringify({
                                  source_id: node.id,
                                  target_id: target,
                                  relation,
                                  explanation,
                                }),
                              });
                              setLinking(false);
                              setExplanation("");
                              await load();
                            });
                          }}
                        >
                          <label>
                            Other passage
                            <select
                              value={target}
                              onChange={(e) => setTarget(e.target.value)}
                              required
                            >
                              <option value="">Choose a passage</option>
                              {graph.nodes
                                .filter(
                                  (n) =>
                                    n.kind === "passage" && n.id !== node.id,
                                )
                                .map((n) => (
                                  <option key={n.id} value={n.id}>
                                    {n.label} · {n.detail}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label>
                            Relationship
                            <select
                              value={relation}
                              onChange={(e) => setRelation(e.target.value)}
                            >
                              {Object.keys(relationColors).map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Why are they connected?
                            <textarea
                              value={explanation}
                              onChange={(e) => setExplanation(e.target.value)}
                              required
                              minLength={3}
                              maxLength={2000}
                              rows={3}
                            />
                          </label>
                          <button className={ui.primary} disabled={!!busy}>
                            Save confirmed link
                          </button>
                        </form>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className={styles.empty}>
                  <FileText size={31} />
                  <h3>A source behind every connection.</h3>
                  <p>
                    Select a passage to read the original text, or a link to
                    inspect how two pieces of evidence relate.
                  </p>
                </div>
              )}
            </aside>
          </div>
          <p className={styles.graphNotice}>{graph.notice}</p>
          <details className={styles.allPassages}>
            <summary>
              Browse available passages and statements ({graph.nodes.length})
            </summary>
            <div>
              {graph.nodes.map((n) => (
                <button key={n.id} onClick={() => inspect(n.id)}>
                  {n.label}
                  <span>{n.detail}</span>
                  <ArrowRight size={13} />
                </button>
              ))}
            </div>
          </details>
        </>
      )}
    </div>
  );
}

export function HearingAudio({
  audio,
  configured,
}: {
  audio: ReturnType<typeof import("@/lib/use-hearing-audio").useHearingAudio>;
  configured: boolean;
}) {
  const [authorized, setAuthorized] = useState(false);
  const [language, setLanguage] = useState("id");
  return (
    <section className={styles.hearingAudio}>
      <h3>Capture this hearing</h3>
      <p>
        Stream authorized microphone or prepared audio through Speechmatics. The
        transcript stays with this hearing.
      </p>
      <div>
        <select
          aria-label="Recognition language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={audio.status !== "idle"}
        >
          <option value="id">Bahasa Indonesia</option>
          <option value="en">English</option>
        </select>
        <label>
          <input
            type="checkbox"
            checked={authorized}
            onChange={(e) => setAuthorized(e.target.checked)}
            disabled={audio.status !== "idle"}
          />
          I am authorized to process this audio with the configured providers.
        </label>
        {audio.status === "idle" ? (
          <>
            <button
              className={ui.primary}
              disabled={!authorized || !configured}
              onClick={() => audio.start(language)}
            >
              <AudioLines size={16} />
              Start microphone
            </button>
            <label className={ui.secondary}>
              Prepared audio
              <input
                type="file"
                accept="audio/*"
                disabled={!authorized || !configured}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void audio.start(language, file);
                }}
              />
            </label>
          </>
        ) : (
          <button
            className={ui.primary}
            onClick={audio.stop}
            disabled={audio.status === "stopping"}
          >
            {audio.status === "connecting"
              ? "Cancel connection"
              : audio.status === "stopping"
                ? "Finishing transcript…"
                : "Stop recording"}
          </button>
        )}
      </div>
      <p role="status">
        {!configured
          ? "Speechmatics is not connected. You can upload a transcript above."
          : audio.status === "idle"
            ? "Microphone off. Raw audio is streamed, not saved by Jude."
            : audio.status === "recording"
              ? "Recording and streaming · keep this tab open"
              : audio.status === "stopping"
                ? "Waiting for final transcript…"
                : "Connecting…"}
      </p>
    </section>
  );
}
