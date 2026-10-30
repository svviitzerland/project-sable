"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  GitBranch,
  LogOut,
  Menu,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import {
  api,
  ApiError,
  labels,
  timestamp,
  wsUrl,
  type Capabilities,
  type Case,
  type CaseDetail,
  type Document,
  type Finding,
  type LegalReference,
  type Segment,
  type Source,
  type Status,
  type User,
} from "@/lib/workspace-api";
import { useHearingAudio } from "@/lib/use-hearing-audio";
import styles from "./workspace.module.css";
import book from "./casebook.module.css";
import {
  ArchiveImport,
  EvidenceWorkspace,
  HearingAudio,
  HearingLibrary,
} from "./casebook";

type Tab = "evidence" | "hearing" | "documents" | "references" | "settings";
const icons = {
  evidence: GitBranch,
  hearing: AudioLines,
  documents: FileText,
  references: BookOpen,
  settings: Settings,
};
const titles: Record<Tab, string> = {
  evidence: "Evidence",
  hearing: "Hearings",
  documents: "Case documents",
  references: "Legal references",
  settings: "Session & connections",
};

export function Workspace() {
  const [user, setUser] = useState<User | null>(null);
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [booting, setBooting] = useState(true);
  const [cases, setCases] = useState<Case[]>([]);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [tab, setTab] = useState<Tab>("evidence");
  const [hearingId, setHearingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [connected, setConnected] = useState(false);
  const [partial, setPartial] = useState("");
  const returnTarget = useRef<HTMLElement | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const refreshVersion = useRef(0);
  const activeCase = useRef<string | null>(null);
  const fail = useCallback((message: string) => setError(message), []);
  const audio = useHearingAudio(caseId, fail, hearingId);
  const refresh = useCallback(async () => {
    const id = activeCase.current;
    if (!id) return;
    const version = ++refreshVersion.current;
    try {
      const result = await api<CaseDetail>(`/cases/${id}`);
      if (activeCase.current === id && version === refreshVersion.current) {
        setDetail(result);
        setCases((current) =>
          current.map((c) => (c.id === id ? result.case : c)),
        );
      }
    } catch (e) {
      if (activeCase.current !== id || version !== refreshVersion.current)
        return;
      if (e instanceof ApiError && e.status === 401) {
        activeCase.current = null;
        setCaseId(null);
        setDetail(null);
        setCases([]);
        setNoteDrafts({});
        setUser(null);
      } else
        setError(e instanceof Error ? e.message : "Could not load this case.");
    }
  }, []);
  const chooseCase = useCallback((id: string | null) => {
    if (activeCase.current === id) return;
    refreshVersion.current++;
    activeCase.current = id;
    setCaseId(id);
    setHearingId(null);
    setTab("evidence");
    setDetail(null);
    setSelected(null);
    setPartial("");
    setFilter("all");
    setError("");
    setConnected(false);
  }, []);
  const loadCases = useCallback(
    async (preferred?: string) => {
      const list = await api<Case[]>("/cases");
      setCases(list);
      const id =
        preferred ??
        (list.some((c) => c.id === activeCase.current)
          ? activeCase.current
          : (list[0]?.id ?? null));
      if (id !== activeCase.current) chooseCase(id);
    },
    [chooseCase],
  );
  useEffect(() => {
    Promise.all([
      api<Capabilities>("/capabilities").then(setCaps),
      api<User>("/auth/me")
        .then(setUser)
        .catch((e) => {
          if (!(e instanceof ApiError && e.status === 401)) throw e;
        }),
    ])
      .catch(() =>
        setError(
          "The Jude backend is unavailable. Start FastAPI, then reload the workspace.",
        ),
      )
      .finally(() => setBooting(false));
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    api<Case[]>("/cases")
      .then((list) => {
        if (active) {
          setCases(list);
          chooseCase(list[0]?.id ?? null);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [user, chooseCase]);
  useEffect(() => {
    if (!caseId) return;
    void refresh();
    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnect: ReturnType<typeof setTimeout>;
    let debounce: ReturnType<typeof setTimeout>;
    function connect() {
      if (disposed) return;
      socket = new WebSocket(wsUrl(`/cases/${caseId}/events`));
      socket.onopen = () => {
        if (disposed) return;
        setConnected(true);
        void refresh();
      };
      socket.onmessage = (event) => {
        if (disposed) return;
        const message = JSON.parse(event.data);
        if (message.type === "partial") setPartial(message.text);
        else if (message.type !== "heartbeat") {
          if (message.type === "transcript") setPartial("");
          clearTimeout(debounce);
          debounce = setTimeout(() => void refresh(), 100);
        }
      };
      socket.onclose = () => {
        if (!disposed) {
          setConnected(false);
          reconnect = setTimeout(connect, 4000);
        }
      };
      socket.onerror = () => socket?.close();
    }
    connect();
    const poll = setInterval(() => void refresh(), 5000);
    return () => {
      disposed = true;
      clearTimeout(reconnect);
      clearTimeout(debounce);
      clearInterval(poll);
      socket?.close();
    };
  }, [caseId, refresh]);
  useEffect(() => {
    if (!sidebar) return;
    const close = document.querySelector<HTMLButtonElement>(
      '[aria-label="Close case navigation"]',
    );
    close?.focus();
  }, [sidebar]);
  function closeSidebar() {
    setSidebar(false);
    document
      .querySelector<HTMLButtonElement>('[aria-controls="case-navigation"]')
      ?.focus();
  }
  function inspectFinding(id: string) {
    returnTarget.current = document.activeElement as HTMLElement;
    setSelected(id);
    if (window.matchMedia("(max-width: 1320px)").matches) {
      requestAnimationFrame(() => {
        const inspector = document.getElementById("finding-inspector");
        inspector?.focus({ preventScroll: true });
        inspector?.scrollIntoView({ behavior: "instant", block: "start" });
      });
    }
  }
  async function action(run: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await run();
      await refresh();
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Try again.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  const hearing = detail?.hearings.find((h) => h.id === hearingId);
  const hearingSegments =
    detail?.segments.filter((s) => s.hearing_id === hearingId) ?? [];
  const hearingFindings =
    detail?.findings.filter((f) =>
      hearingSegments.some((s) => s.id === f.segment_id),
    ) ?? [];
  const visibleFindings = hearingFindings
    .filter(
      (f) =>
        filter === "all" ||
        (filter === "unreviewed" ? !f.reviewed : f.status === filter),
    )
    .slice()
    .reverse();
  const finding =
    visibleFindings.find((f) => f.id === selected) ??
    visibleFindings[0] ??
    null;
  const unreviewedFindings = hearingFindings.filter((f) => !f.reviewed);
  const nextUnreviewed = unreviewedFindings.length
    ? unreviewedFindings[
        (unreviewedFindings.findIndex((f) => f.id === finding?.id) + 1) %
          unreviewedFindings.length
      ]
    : undefined;
  const pending = hearingSegments.filter((s) =>
    [
      "queued",
      "extracting",
      "retrieving",
      "analyzing",
      "reviewing",
      "synthesizing",
    ].includes(s.analysis_state),
  ).length;
  function openHearing(id: string) {
    setHearingId(id);
    setTab("hearing");
    setSelected(null);
    setFilter("all");
    setPartial("");
  }
  const session = detail?.case;
  if (booting)
    return (
      <div className={styles.app}>
        <div className={styles.loading}>
          <span className={styles.brand}>jude.</span>
          <p>Opening your workspace…</p>
        </div>
      </div>
    );
  if (!user)
    return (
      <div className={styles.app}>
        <Auth caps={caps} error={error} setError={setError} onUser={setUser} />
      </div>
    );
  return (
    <div className={styles.app}>
      <a className={styles.skip} href="#workspace-main">
        Skip to workspace
      </a>
      <aside
        className={`${styles.sidebar} ${sidebar ? styles.sidebarOpen : ""}`}
        id="case-navigation"
        aria-label="Cases and account"
        onKeyDown={(e) => {
          if (e.key === "Escape") closeSidebar();
          if (
            e.key === "Tab" &&
            sidebar &&
            window.matchMedia("(max-width: 640px)").matches
          ) {
            const controls = Array.from(
              e.currentTarget.querySelectorAll<HTMLElement>(
                "a[href], button:not(:disabled), input:not(:disabled)",
              ),
            );
            const first = controls[0],
              last = controls.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className={styles.sidebarBrand}>
          <Link href="/" className={styles.brand}>
            jude.
          </Link>
          <button
            className={styles.mobileClose}
            onClick={closeSidebar}
            aria-label="Close case navigation"
          >
            <X size={20} />
          </button>
        </div>
        <p className={styles.workspaceLabel}>Your workspace</p>
        <button
          className={styles.newCase}
          onClick={() => {
            setCreating(true);
            setSidebar(false);
          }}
        >
          <Plus size={17} />
          New case
        </button>
        <ArchiveImport
          onImport={async (id) => {
            await loadCases(id);
            setTab("evidence");
          }}
        />
        <nav aria-label="Your cases" className={styles.caseList}>
          {cases.map((c) => (
            <button
              key={c.id}
              className={c.id === caseId ? styles.caseActive : ""}
              aria-current={c.id === caseId ? "page" : undefined}
              onClick={() => {
                chooseCase(c.id);
                closeSidebar();
              }}
            >
              <FolderOpen size={17} />
              <span>
                {c.title}
                <small>
                  {c.synthetic
                    ? "Synthetic exercise"
                    : c.reference || "Case workspace"}
                </small>
              </span>
            </button>
          ))}
        </nav>
        <div className={styles.sidebarBottom}>
          <span className={styles.accountAvatar}>{user.name.slice(0, 1)}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{user.demo ? "Demo session" : "Lawyer workspace"}</small>
          </div>
          <button
            aria-label="Sign out"
            title="Sign out"
            onClick={() =>
              action(async () => {
                audio.stop();
                await api("/auth/logout", { method: "POST" });
                setUser(null);
                setCases([]);
                setNoteDrafts({});
                chooseCase(null);
              })
            }
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <main id="workspace-main" className={styles.main}>
        <div className={styles.topbar}>
          <button
            className={styles.mobileMenu}
            aria-label="Open case navigation"
            aria-expanded={sidebar}
            aria-controls="case-navigation"
            onClick={() => setSidebar(true)}
          >
            <Menu size={21} />
          </button>
          <span>
            <FolderOpen size={15} />
            Cases <ChevronRight size={14} />
            {session?.title ?? "Workspace"}
          </span>
          <Link href="/">
            About Jude <ExternalLink size={13} />
          </Link>
        </div>
        {error && (
          <div className={styles.error} role="alert">
            <span>{error}</span>
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X size={18} />
            </button>
          </div>
        )}
        {creating && (
          <NewCase
            busy={busy}
            close={() => setCreating(false)}
            submit={(body) =>
              action(async () => {
                const c = await api<Case>("/cases", {
                  method: "POST",
                  body: JSON.stringify(body),
                });
                await loadCases(c.id);
                setCreating(false);
              })
            }
          />
        )}
        {!caseId ? (
          <div className={styles.welcome}>
            <FolderOpen size={38} />
            <h1>A place for the whole case.</h1>
            <p>
              Create a case to bring together documents, testimony, and the
              questions that deserve a closer look.
            </p>
            <button
              className={styles.primary}
              onClick={() => setCreating(true)}
            >
              <Plus size={17} />
              Create your first case
            </button>
            {caps?.demo_available && (
              <button
                className={styles.secondary}
                disabled={busy}
                onClick={() =>
                  action(async () => {
                    const c = await api<Case>("/cases/synthetic", {
                      method: "POST",
                    });
                    await loadCases(c.id);
                  })
                }
              >
                Try a synthetic hearing <ArrowRight size={16} />
              </button>
            )}
          </div>
        ) : !detail ? (
          <div className={styles.loading}>
            <p>Loading case record…</p>
            <button className={styles.secondary} onClick={refresh}>
              Retry connection
            </button>
          </div>
        ) : (
          <>
            <header className={styles.caseHeader}>
              <div>
                <h1>{session?.title}</h1>
                <div className={styles.caseMeta}>
                  {session?.reference || "Case workspace"}
                  <span>
                    {session?.synthetic ? "Synthetic material" : "Private case"}
                  </span>
                </div>
                <p>
                  {session?.description ||
                    "Bring testimony and source material together."}
                </p>
              </div>
              <div className={styles.headerActions}>
                <a
                  className={styles.secondary}
                  href={`/api/v1/cases/${caseId}/export.jude`}
                >
                  <Download size={15} />
                  Export .jude
                </a>
              </div>
            </header>
            <div
              className={styles.tabs}
              role="tablist"
              aria-label="Case sections"
            >
              {(Object.keys(titles) as Tab[]).map((key) => {
                const Icon = icons[key];
                return (
                  <button
                    role="tab"
                    aria-selected={tab === key}
                    aria-controls={`panel-${key}`}
                    id={`tab-${key}`}
                    key={key}
                    tabIndex={tab === key ? 0 : -1}
                    onKeyDown={(event) => {
                      const keys = Object.keys(titles) as Tab[];
                      const index = keys.indexOf(key);
                      const next =
                        event.key === "ArrowRight"
                          ? keys[(index + 1) % keys.length]
                          : event.key === "ArrowLeft"
                            ? keys[(index + keys.length - 1) % keys.length]
                            : event.key === "Home"
                              ? keys[0]
                              : event.key === "End"
                                ? keys.at(-1)
                                : null;
                      if (next) {
                        event.preventDefault();
                        setTab(next);
                        document.getElementById(`tab-${next}`)?.focus();
                      }
                    }}
                    onClick={() => setTab(key)}
                  >
                    <Icon size={16} />
                    {titles[key]}
                    {key === "documents" && (
                      <span>{detail.documents.length}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div
              id={`panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`tab-${tab}`}
              className={styles.panel}
              tabIndex={0}
            >
              {tab === "evidence" && (
                <EvidenceWorkspace
                  key={caseId}
                  caseId={caseId}
                  openHearing={openHearing}
                />
              )}
              {tab === "hearing" && !hearing && (
                <HearingLibrary
                  key={caseId}
                  detail={detail}
                  onOpen={openHearing}
                  refresh={refresh}
                  configured={!!caps?.analysis.configured}
                />
              )}
              {tab === "hearing" && hearing && (
                <>
                  <div className={book.hearingDetailHeader}>
                    <button
                      className={book.hearingBack}
                      onClick={() => {
                        audio.stop();
                        setHearingId(null);
                      }}
                    >
                      <ArrowLeft size={15} />
                      All hearings
                    </button>
                    <h2>{hearing.title}</h2>
                    <div>
                      <a
                        className={styles.secondary}
                        href={`/api/v1/cases/${caseId}/hearings/${hearing.id}/export.jude`}
                      >
                        <Download size={15} />
                        Export hearing
                      </a>
                      {hearing.kind === "simulation" ? (
                        <button
                          className={styles.primary}
                          disabled={
                            busy ||
                            hearing.status === "complete" ||
                            audio.status !== "idle"
                          }
                          onClick={() =>
                            action(() =>
                              api(
                                `/cases/${caseId}/${hearing.status === "simulation" ? "pause" : "simulation"}?hearing_id=${hearing.id}`,
                                { method: "POST" },
                              ),
                            )
                          }
                        >
                          {hearing.status === "simulation" ? (
                            <Pause size={16} />
                          ) : (
                            <Play size={16} />
                          )}{" "}
                          {hearing.status === "complete"
                            ? "Simulation complete"
                            : hearing.status === "simulation"
                              ? "Pause hearing"
                              : "Start simulated hearing"}
                        </button>
                      ) : (
                        <button
                          className={styles.primary}
                          disabled={
                            busy ||
                            pending > 0 ||
                            !hearingSegments.length ||
                            !caps?.analysis.configured
                          }
                          onClick={() =>
                            action(() =>
                              api(
                                `/cases/${caseId}/hearings/${hearing.id}/analyze`,
                                { method: "POST" },
                              ),
                            )
                          }
                        >
                          <ShieldCheck size={16} />
                          Analyze hearing
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={styles.sessionBar}>
                    <span>
                      <i
                        className={
                          connected ? styles.onlineDot : styles.offlineDot
                        }
                      />
                      {hearing.status === "simulation"
                        ? "Simulated hearing running"
                        : hearing.status === "live"
                          ? "Live audio session"
                          : hearing.status === "complete"
                            ? "Hearing complete"
                            : "Ready for testimony"}
                      <small>
                        {connected
                          ? "Updates connected"
                          : "Reconnecting · polling active"}
                      </small>
                    </span>
                    <span>
                      {pending > 0
                        ? `${pending} statement${pending > 1 ? "s" : ""} being examined`
                        : hearingSegments.some(
                              (s) => s.analysis_state === "pending",
                            )
                          ? "Saved transcript · ready for analysis"
                          : "All saved testimony is up to date"}
                    </span>
                  </div>
                  {hearing.kind !== "simulation" &&
                    !caps?.analysis.configured && (
                      <p className={styles.notice}>
                        Transcript saved. Connect an OpenRouter analysis model
                        to examine this hearing.
                      </p>
                    )}
                  {hearing.kind === "simulation" && (
                    <p className={styles.notice}>
                      <CircleHelp size={15} />
                      Simulation uses prepared testimony and authored findings.
                      It does not run speech recognition or AI analysis.
                    </p>
                  )}
                  <div className={styles.hearingGrid}>
                    <section
                      className={styles.transcriptPane}
                      aria-labelledby="transcript-heading"
                    >
                      <div className={styles.paneHeading}>
                        <h2 id="transcript-heading">Transcript</h2>
                        <span>{hearingSegments.length} segments</span>
                      </div>
                      <Transcript
                        key={hearing.id}
                        segments={hearingSegments}
                        speakers={session?.speakers ?? {}}
                        partial={partial}
                        caseId={caseId}
                        onRetry={(id) =>
                          action(() =>
                            api(`/cases/${caseId}/transcripts/${id}/retry`, {
                              method: "POST",
                            }),
                          )
                        }
                        select={(id) => {
                          const f = hearingFindings.find(
                            (f) => f.segment_id === id,
                          );
                          if (f) {
                            setFilter("all");
                            inspectFinding(f.id);
                          }
                        }}
                        findings={hearingFindings}
                      />
                      <ManualTranscript
                        key={hearing.id}
                        busy={busy}
                        submit={(body) =>
                          action(() =>
                            api(`/cases/${caseId}/transcripts`, {
                              method: "POST",
                              body: JSON.stringify({
                                ...body,
                                hearing_id: hearing.id,
                              }),
                            }),
                          )
                        }
                      />
                    </section>
                    <section
                      className={styles.findingPane}
                      aria-labelledby="findings-heading"
                    >
                      <div className={styles.paneHeading}>
                        <h2 id="findings-heading" tabIndex={-1}>
                          Findings
                        </h2>
                        <span>
                          {hearingFindings.filter((f) => !f.reviewed).length} to
                          review
                        </span>
                      </div>
                      {hearingFindings.length > 0 && (
                        <div className={styles.reviewSummary}>
                          <span role="status">
                            {hearingFindings.length - unreviewedFindings.length}{" "}
                            of {hearingFindings.length} reviewed
                          </span>
                          <button
                            className={styles.textButton}
                            disabled={!nextUnreviewed || busy}
                            onClick={() => {
                              if (nextUnreviewed) {
                                setFilter("unreviewed");
                                inspectFinding(nextUnreviewed.id);
                              }
                            }}
                          >
                            Next unreviewed <ArrowRight size={14} />
                          </button>
                        </div>
                      )}
                      <label className={styles.filterLabel}>
                        <span className={styles.srOnly}>Filter findings</span>
                        <select
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                        >
                          <option value="all">All findings</option>
                          <option value="unreviewed">Needs your review</option>
                          {Object.entries(labels).map(([value, label]) => (
                            <option value={value} key={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className={styles.findingList}>
                        {visibleFindings.length ? (
                          visibleFindings.map((f) => (
                            <button
                              className={`${styles.findingRow} ${finding?.id === f.id ? styles.findingSelected : ""}`}
                              key={f.id}
                              aria-pressed={finding?.id === f.id}
                              onClick={() => inspectFinding(f.id)}
                            >
                              <div>
                                <StatusLabel status={f.status} />
                                {f.reviewed && (
                                  <Check size={15} aria-label="Reviewed" />
                                )}
                              </div>
                              <h3>{f.title}</h3>
                              <p>{f.verification}</p>
                              <small>
                                {f.mode === "simulation"
                                  ? "Scripted example"
                                  : f.mode === "imported"
                                    ? "Imported finding · verify sources"
                                    : "AI · source-validated"}{" "}
                                · {f.citations.length} source
                                {f.citations.length !== 1 ? "s" : ""}
                                <ChevronRight size={14} />
                              </small>
                            </button>
                          ))
                        ) : (
                          <Empty
                            icon={<ShieldCheck size={30} />}
                            title={
                              filter === "all"
                                ? "Follow the evidence."
                                : "No findings in this view."
                            }
                            text={
                              filter === "all"
                                ? "Findings appear here as finalized statements are examined. Start the simulation or add a transcript statement."
                                : "Choose another filter to see the rest of the record."
                            }
                          />
                        )}
                      </div>
                    </section>
                    <section
                      id="finding-inspector"
                      tabIndex={-1}
                      className={styles.inspectorPane}
                      aria-label="Finding and source inspector"
                    >
                      <button
                        className={`${styles.textButton} ${styles.returnFindings}`}
                        onClick={() => {
                          const target = returnTarget.current?.isConnected
                            ? returnTarget.current
                            : document.getElementById("findings-heading");
                          target?.focus();
                          target?.scrollIntoView({
                            behavior: "instant",
                            block: "center",
                          });
                        }}
                      >
                        <ArrowLeft size={14} />
                        Back to findings
                      </button>
                      {finding ? (
                        <FindingInspector
                          key={finding.id}
                          finding={finding}
                          segment={hearingSegments.find(
                            (s) => s.id === finding.segment_id,
                          )}
                          caseId={caseId}
                          busy={busy}
                          note={noteDrafts[finding.id] ?? finding.note}
                          onNote={(note) =>
                            setNoteDrafts((current) => ({
                              ...current,
                              [finding.id]: note,
                            }))
                          }
                          save={async (body) => {
                            const saved = await action(() =>
                              api(`/cases/${caseId}/findings/${finding.id}`, {
                                method: "PATCH",
                                body: JSON.stringify(body),
                              }),
                            );
                            if (saved)
                              setNoteDrafts((current) => {
                                if (current[finding.id] !== body.note)
                                  return current;
                                const next = { ...current };
                                delete next[finding.id];
                                return next;
                              });
                            return saved;
                          }}
                        />
                      ) : (
                        <Empty
                          icon={<BookOpen size={30} />}
                          title="Every finding, inspectable."
                          text="Select a finding to compare its testimony with original passages, alternative explanations, and a verification step."
                        />
                      )}
                    </section>
                  </div>
                  {hearing.kind !== "simulation" && (
                    <HearingAudio
                      key={hearing.id}
                      audio={audio}
                      configured={!!caps?.speech.configured}
                    />
                  )}
                  <p className={styles.bottomNote}>
                    Findings describe evidence relationships. They do not
                    determine credibility, guilt, or legal outcomes.
                  </p>
                </>
              )}
              {tab === "documents" && (
                <Documents
                  key={caseId}
                  caseId={caseId}
                  documents={detail.documents}
                  run={action}
                  busy={busy}
                />
              )}
              {tab === "references" && (
                <References
                  key={caseId}
                  caseId={caseId}
                  configured={!!caps?.legal.configured}
                />
              )}
              {tab === "settings" && (
                <SessionSettings
                  key={caseId}
                  caps={caps}
                  detail={detail}
                  busy={busy}
                  run={action}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Auth({
  caps,
  error,
  setError,
  onUser,
}: {
  caps: Capabilities | null;
  error: string;
  setError: (v: string) => void;
  onUser: (u: User) => void;
}) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError("");
    try {
      onUser(
        await api<User>(`/auth/${register ? "register" : "login"}`, {
          method: "POST",
          body: JSON.stringify(values),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.auth}>
      <div className={styles.authStory}>
        <Link href="/" className={styles.brand}>
          jude.
        </Link>
        <div>
          <h1>
            Stay with the testimony.
            <br />
            Keep the evidence close.
          </h1>
          <p>
            A working space for your case documents, hearing record, and the
            questions that connect them.
          </p>
          <div className={styles.authPrinciple}>
            <ShieldCheck size={23} />
            <span>
              Sources you can inspect.
              <br />
              Judgment that stays with you.
            </span>
          </div>
        </div>
        <Link href="/">
          <ArrowLeft size={16} />
          Back to the introduction
        </Link>
      </div>
      <div className={styles.authForm}>
        <h2>
          {register ? "Create your workspace." : "Welcome to your workspace."}
        </h2>
        <p>
          {register
            ? "Start with a case. Bring the evidence together."
            : "Sign in to continue examining your cases."}
        </p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <form onSubmit={submit}>
          {register && (
            <label>
              Your name
              <input name="name" autoComplete="name" required maxLength={100} />
            </label>
          )}
          <label>
            Email address
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              minLength={10}
              maxLength={128}
              autoComplete={register ? "new-password" : "current-password"}
              required
            />
            <small>At least 10 characters.</small>
          </label>
          <button className={styles.primary} disabled={busy}>
            {busy
              ? "Opening workspace…"
              : register
                ? "Create account"
                : "Sign in"}
            <ArrowRight size={17} />
          </button>
        </form>
        <button
          className={styles.textButton}
          onClick={() => setRegister(!register)}
        >
          {register
            ? "Already have an account? Sign in"
            : "New to Jude? Create an account"}
        </button>
        {caps?.demo_available && (
          <div className={styles.demoEntry}>
            <span>Explore before you start</span>
            <button
              className={styles.secondary}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  onUser(await api<User>("/auth/demo", { method: "POST" }));
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Play size={16} />
              Open a synthetic case
            </button>
            <p>
              A private demo session with prepared evidence. No microphone or
              provider account needed.
            </p>
          </div>
        )}
        <small className={styles.authFootnote}>
          Prototype for authorized material. Provider connections are configured
          by the operator.
        </small>
      </div>
    </div>
  );
}
function NewCase({
  busy,
  close,
  submit,
}: {
  busy: boolean;
  close: () => void;
  submit: (body: Record<string, FormDataEntryValue>) => void;
}) {
  return (
    <section className={styles.newCaseForm}>
      <div>
        <h2>Create a case</h2>
        <button aria-label="Cancel new case" onClick={close}>
          <X size={18} />
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(Object.fromEntries(new FormData(e.currentTarget)));
        }}
      >
        <label>
          Case title
          <input
            name="title"
            required
            maxLength={160}
            placeholder="e.g. Warehouse inquiry"
            autoFocus
          />
        </label>
        <label>
          Reference
          <input
            name="reference"
            maxLength={100}
            placeholder="Your case reference"
          />
        </label>
        <label className={styles.fullWidth}>
          Description
          <textarea
            name="description"
            maxLength={2000}
            rows={2}
            placeholder="Context for this case and its material"
          />
        </label>
        <div>
          <button className={styles.primary} disabled={busy}>
            {busy ? "Creating…" : "Create case"}
          </button>
          <button type="button" className={styles.secondary} onClick={close}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
function Empty({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className={styles.empty}>
      {icon}
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function StatusLabel({ status }: { status: Status }) {
  return (
    <span className={`${styles.status} ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
function Transcript({
  segments,
  speakers,
  partial,
  onRetry,
  select,
  findings,
}: {
  segments: Segment[];
  speakers: Record<string, string>;
  partial: string;
  caseId: string;
  onRetry: (id: string) => void;
  select: (id: string) => void;
  findings: Finding[];
}) {
  const [follow, setFollow] = useState(true);
  const [query, setQuery] = useState("");
  const [speaker, setSpeaker] = useState("");
  const term = query.trim().toLocaleLowerCase();
  const filtering = !!term || !!speaker;
  const visibleSegments = segments.filter(
    (s) =>
      (!speaker || s.speaker === speaker) &&
      (!term || s.text.toLocaleLowerCase().includes(term)),
  );
  const speakerIds = Array.from(new Set(segments.map((s) => s.speaker)));
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (follow && !filtering && scroller.current)
      scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [segments.length, partial, follow, filtering]);
  useEffect(() => {
    if (scroller.current && filtering) scroller.current.scrollTop = 0;
  }, [query, speaker, filtering]);
  return (
    <>
      <div className={styles.transcriptFilters}>
        <label>
          <span className={styles.srOnly}>Search this transcript</span>
          <input
            type="search"
            placeholder="Find words in this hearing…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          <span className={styles.srOnly}>Filter transcript by speaker</span>
          <select value={speaker} onChange={(e) => setSpeaker(e.target.value)}>
            <option value="">All speakers</option>
            {speakerIds.map((id) => (
              <option key={id} value={id}>
                {speakers[id] ?? id}
              </option>
            ))}
          </select>
        </label>
        {filtering && (
          <div className={styles.transcriptResults}>
            <span role="status">
              {visibleSegments.length} of {segments.length} statements
            </span>
            <button
              className={styles.textButton}
              onClick={() => {
                setQuery("");
                setSpeaker("");
              }}
            >
              Clear transcript filters
            </button>
          </div>
        )}
      </div>
      <label className={styles.follow}>
        <input
          type="checkbox"
          checked={follow && !filtering}
          disabled={filtering}
          onChange={(e) => setFollow(e.target.checked)}
        />
        {filtering
          ? "Following paused while filtering"
          : "Follow new testimony"}
      </label>
      <div
        ref={scroller}
        className={`${styles.transcriptScroll} ${filtering ? styles.transcriptFiltered : ""}`}
      >
        {visibleSegments.length ? (
          visibleSegments.map((s) => {
            const finding = findings.find((f) => f.segment_id === s.id);
            return (
              <article className={styles.segment} key={s.id}>
                <div>
                  <strong>{speakers[s.speaker] ?? s.speaker}</strong>
                  <time>
                    {s.origin === "imported" && !s.start && !s.end
                      ? "Time not supplied"
                      : timestamp(s.start)}
                  </time>
                </div>
                <p>
                  <TranscriptText text={s.text} term={term} />
                </p>
                <div className={styles.segmentMeta}>
                  <span>
                    {s.origin === "simulation"
                      ? "Scripted"
                      : s.origin === "manual"
                        ? "Manually entered"
                        : s.origin === "imported"
                          ? "Imported transcript"
                          : s.confidence === null
                            ? "Confidence unavailable"
                            : `${Math.round(s.confidence * 100)}% word confidence`}
                    {!speakers[s.speaker] && s.origin === "speechmatics"
                      ? " · Role unconfirmed"
                      : ""}
                  </span>
                  {finding ? (
                    <button onClick={() => select(s.id)}>
                      View finding <ChevronRight size={12} />
                    </button>
                  ) : (
                    ![
                      "skipped",
                      "unavailable",
                      "failed",
                      "interrupted",
                    ].includes(s.analysis_state) && (
                      <span className={styles.phase}>{s.analysis_state}</span>
                    )
                  )}
                </div>
                {s.analysis_error && (
                  <div className={styles.segmentError}>
                    <p>{s.analysis_error}</p>
                    <button onClick={() => onRetry(s.id)}>
                      <RefreshCw size={12} />
                      Retry analysis
                    </button>
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <Empty
            icon={<AudioLines size={28} />}
            title={
              filtering ? "No matching statements." : "Ready when you are."
            }
            text={
              filtering
                ? "Try another phrase or clear the speaker filter. Filters do not change the hearing record."
                : "Start a simulated hearing, connect live audio in Session & connections, or add a statement below."
            }
          />
        )}
        {partial && !filtering && (
          <div className={styles.partial}>
            <span>Listening · provisional</span>
            <p>{partial}</p>
          </div>
        )}
      </div>
    </>
  );
}
function TranscriptText({ text, term }: { text: string; term: string }) {
  if (!term) return text;
  const pieces: React.ReactNode[] = [];
  const lower = text.toLocaleLowerCase();
  let start = 0;
  let match = lower.indexOf(term);
  while (match !== -1) {
    pieces.push(
      text.slice(start, match),
      <mark key={match}>{text.slice(match, match + term.length)}</mark>,
    );
    start = match + term.length;
    match = lower.indexOf(term, start);
  }
  pieces.push(text.slice(start));
  return <>{pieces}</>;
}
function ManualTranscript({
  busy,
  submit,
}: {
  busy: boolean;
  submit: (body: {
    text: string;
    speaker: string;
    start: number;
    end: number;
  }) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [speaker, setSpeaker] = useState("Unknown");
  return (
    <div className={styles.manual}>
      <button
        className={styles.textButton}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Plus size={15} />
        Add transcript text
      </button>
      {open && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (await submit({ text, speaker, start: 0, end: 0 })) setText("");
          }}
        >
          <label>
            Speaker label
            <input
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              required
              maxLength={80}
            />
          </label>
          <label>
            Finalized statement
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              minLength={3}
              maxLength={6000}
              rows={3}
              placeholder="Enter the exact words spoken…"
            />
          </label>
          <button className={styles.primary} disabled={busy}>
            {busy ? "Saving…" : "Save & examine"}
          </button>
        </form>
      )}
    </div>
  );
}

function FindingInspector({
  finding,
  segment,
  caseId,
  busy,
  note,
  onNote,
  save,
}: {
  note: string;
  onNote: (note: string) => void;
  finding: Finding;
  segment?: Segment;
  caseId: string;
  busy: boolean;
  save: (body: { reviewed: boolean; note: string }) => Promise<boolean>;
}) {
  const [source, setSource] = useState<Source | null>(null);
  const [sourceError, setSourceError] = useState("");
  const [citationIndex, setCitationIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const citation = finding.citations[citationIndex];
  useEffect(() => {
    let alive = true;
    if (citation?.chunk_id)
      api<Source>(`/cases/${caseId}/sources/${citation.chunk_id}`)
        .then((s) => {
          if (alive) setSource(s);
        })
        .catch((e) => {
          if (alive) setSourceError(e.message);
        });
    return () => {
      alive = false;
    };
  }, [caseId, citation?.chunk_id]);
  return (
    <div className={styles.inspector}>
      <div className={styles.paneHeading}>
        <h2>Examine the finding</h2>
        <ShieldCheck size={17} />
      </div>
      <div className={styles.inspectorBody}>
        <StatusLabel status={finding.status} />
        <h3>{finding.title}</h3>
        <div className={styles.quote}>
          <span>Hearing · {timestamp(segment?.start ?? 0)}</span>
          <blockquote>“{segment?.text}”</blockquote>
        </div>
        <p>{finding.explanation}</p>
        <h4>At the source</h4>
        {finding.citations.length > 1 && (
          <div className={styles.citationTabs}>
            {finding.citations.map((c, i) => (
              <button
                key={c.chunk_id}
                aria-pressed={i === citationIndex}
                onClick={() => {
                  setCitationIndex(i);
                  setSource(null);
                  setSourceError("");
                }}
              >
                Source {i + 1} · {c.relation}
              </button>
            ))}
          </div>
        )}
        {sourceError ? (
          <p role="alert" className={styles.error}>
            {sourceError}
          </p>
        ) : source && source.id === citation?.chunk_id ? (
          <SourceCard source={source} caseId={caseId} quote={citation?.quote} />
        ) : (
          <p className={styles.muted}>
            {citation
              ? "Loading original passage…"
              : "No source citation supports this finding."}
          </p>
        )}
        <div className={styles.verify}>
          <h4>What to verify</h4>
          <p>{finding.verification}</p>
        </div>
        <h4>Uncertainty</h4>
        <p>{finding.uncertainty}</p>
        <details className={styles.reviewDetails}>
          <summary>
            {finding.mode === "simulation"
              ? "About this scripted finding"
              : finding.mode === "imported"
                ? "Imported review · not re-run"
                : "Independent review"}
          </summary>
          <p>{finding.review.summary}</p>
          {finding.review.alternative_explanations?.map((item, i) => (
            <p key={i}>Alternative: {item}</p>
          ))}
          {finding.review.missing_context?.map((item, i) => (
            <p key={i}>Missing context: {item}</p>
          ))}
          {finding.review.analyst_summary && (
            <p>Analyst: {finding.review.analyst_summary}</p>
          )}
          {finding.review.legal_note && <p>{finding.review.legal_note}</p>}
          <small>
            {finding.mode === "simulation"
              ? "Authored fixture · not an AI evaluation"
              : finding.mode === "imported"
                ? "Imported finding · verify against the original sources"
                : `Source verification passed · ${finding.review.retrieval} retrieval · ${(finding.elapsed_ms / 1000).toFixed(1)}s`}
          </small>
        </details>
        {finding.legal.length > 0 && (
          <>
            <h4>Related legal discovery</h4>
            <LegalResults results={finding.legal} />
          </>
        )}
        <div className={styles.question}>
          <h4>A question to consider</h4>
          <p>{finding.question}</p>
          <button
            className={styles.textButton}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(finding.question);
                setCopied(true);
                setCopyError("");
              } catch {
                setCopyError(
                  "Clipboard unavailable. Select and copy the question manually.",
                );
              }
            }}
          >
            {copied ? <Check size={14} /> : <Download size={14} />}
            {copied ? "Copied" : "Copy question"}
          </button>
          <span className={styles.srOnly} role="status">
            {copied ? "Question copied" : ""}
          </span>
          {copyError && <p role="alert">{copyError}</p>}
        </div>
        <label className={styles.noteField}>
          Your review note
          <textarea
            value={note}
            onChange={(e) => onNote(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="What needs follow-up?"
          />
        </label>
        {note !== finding.note && (
          <p className={styles.draftNotice} role="status">
            Unsaved note · Save your changes before leaving.
          </p>
        )}
        <div className={styles.reviewActions}>
          <button
            className={styles.primary}
            disabled={busy}
            onClick={() => save({ reviewed: !finding.reviewed, note })}
          >
            <Check size={15} />
            {finding.reviewed ? "Reopen for review" : "Mark reviewed"}
          </button>
          <button
            className={styles.secondary}
            disabled={busy || note === finding.note}
            onClick={() => save({ reviewed: finding.reviewed, note })}
          >
            Save note
          </button>
        </div>
        {finding.reviewed && (
          <p className={styles.reviewed}>
            <Check size={14} />
            Reviewed by you · saved to the case
          </p>
        )}
      </div>
    </div>
  );
}
function SourceCard({
  source,
  caseId,
  quote,
}: {
  source: Source;
  caseId: string;
  quote?: string;
}) {
  const index = quote ? source.text.indexOf(quote) : -1;
  return (
    <div className={styles.sourceCard}>
      <div>
        <FileText size={15} />
        <strong>{source.document_name}</strong>
      </div>
      <span>
        {source.section
          ? "DOCX text section · pagination unavailable"
          : `Page ${source.page}`}
      </span>
      <p>
        {index >= 0 && quote ? (
          <>
            {source.text.slice(0, index)}
            <mark>{quote}</mark>
            {source.text.slice(index + quote.length)}
          </>
        ) : (
          source.text
        )}
      </p>
      <a
        href={`/api/v1/cases/${caseId}/documents/${source.document_id}/original`}
      >
        <Download size={13} />
        Download original
      </a>
    </div>
  );
}

function Documents({
  caseId,
  documents,
  busy,
  run,
}: {
  caseId: string;
  documents: Document[];
  busy: boolean;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Source[] | null>(null);
  const [method, setMethod] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [chunks, setChunks] = useState<Source[]>([]);
  return (
    <div className={styles.documents}>
      <div className={styles.sectionTitle}>
        <div>
          <h2>The case file.</h2>
          <p>
            Original documents, preserved passages, and a trail back to the
            source.
          </p>
        </div>
      </div>
      <div className={styles.uploadBox}>
        <Upload size={25} />
        <div>
          <h3>Add authorized case documents</h3>
          <p>PDF, DOCX, TXT, or Markdown · up to 6 MB · text-based PDFs only</p>
          <small>
            DOCX uses text sections; PDF page numbers are preserved. Configured
            embedding providers receive extracted text.
          </small>
        </div>
        <label className={styles.secondary}>
          {busy ? "Processing…" : "Choose a file"}
          <input
            className={styles.srOnly}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                void run(async () => {
                  const body = new FormData();
                  body.append("file", file);
                  await api(`/cases/${caseId}/documents`, {
                    method: "POST",
                    body,
                  });
                });
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <form
        className={styles.searchForm}
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const data = await api<{ results: Source[]; method: string }>(
              `/cases/${caseId}/search?q=${encodeURIComponent(query)}`,
            );
            setResults(data.results);
            setMethod(data.method);
            setSelectedDoc(null);
          });
        }}
      >
        <Search size={18} />
        <label className={styles.srOnly} htmlFor="document-search">
          Search case evidence
        </label>
        <input
          id="document-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          minLength={2}
          maxLength={600}
          placeholder="Search only this case’s evidence…"
          required
        />
        <button className={styles.primary} disabled={busy}>
          Search
        </button>
      </form>
      <div className={styles.documentGrid}>
        <div>
          <h3>
            {documents.length} document{documents.length !== 1 ? "s" : ""}
          </h3>
          {documents.length ? (
            documents.map((doc) => (
              <button
                className={`${styles.docRow} ${selectedDoc === doc.id ? styles.docSelected : ""}`}
                key={doc.id}
                onClick={() =>
                  run(async () => {
                    setChunks(
                      await api<Source[]>(
                        `/cases/${caseId}/documents/${doc.id}/chunks`,
                      ),
                    );
                    setSelectedDoc(doc.id);
                    setResults(null);
                  })
                }
              >
                <FileText size={22} />
                <span>
                  <strong>{doc.name}</strong>
                  <small>
                    {doc.mime.includes("wordprocessing")
                      ? "Text section"
                      : `${doc.pages} page${doc.pages !== 1 ? "s" : ""}`}{" "}
                    · Ready to search
                  </small>
                </span>
                <ChevronRight size={16} />
              </button>
            ))
          ) : (
            <Empty
              icon={<FileText size={26} />}
              title="Start with a source."
              text="Upload your first case document to make its passages available for evidence retrieval."
            />
          )}
        </div>
        <div className={styles.documentReader}>
          {results !== null ? (
            <>
              <h3>
                Search results{" "}
                <small>
                  {method === "hybrid"
                    ? "Semantic + keyword"
                    : "Keyword retrieval"}
                </small>
              </h3>
              {results.length ? (
                results.map((s) => (
                  <SourceCard key={s.id} source={s} caseId={caseId} />
                ))
              ) : (
                <Empty
                  icon={<Search size={26} />}
                  title="No matching passages."
                  text="Try different words or add the document containing this detail."
                />
              )}
            </>
          ) : selectedDoc ? (
            <>
              <h3>Extracted passages</h3>
              {chunks.map((s) => (
                <SourceCard key={s.id} source={s} caseId={caseId} />
              ))}
            </>
          ) : (
            <Empty
              icon={<BookOpen size={30} />}
              title="Open the record."
              text="Choose a document to read its extracted passages, or search for a detail across this case."
            />
          )}
        </div>
      </div>
    </div>
  );
}
function LegalResults({ results }: { results: LegalReference[] }) {
  return (
    <div className={styles.lawResults}>
      {results.map((r) => (
        <article key={r.id}>
          <span>
            {r.reference} · {r.status}
            {r.status_uncertain ? " (uncertain)" : ""}
          </span>
          <h3>
            <a href={r.url} target="_blank" rel="noreferrer">
              {r.title}
              <ExternalLink size={14} />
            </a>
          </h3>
          <p>Discovery metadata · legal text not retrieved</p>
          {r.articles.map((a) => (
            <a key={a.url} href={a.url} target="_blank" rel="noreferrer">
              Pasal {a.article} <ExternalLink size={12} />
            </a>
          ))}
        </article>
      ))}
    </div>
  );
}
function References({
  caseId,
  configured,
}: {
  caseId: string;
  configured: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LegalReference[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className={styles.referencePage}>
      <div className={styles.sectionTitle}>
        <h2>Find the relevant legal source.</h2>
        <p>
          Discover Indonesian legislation through Pasal.id, then inspect its
          text at the original link.
        </p>
      </div>
      <p className={styles.notice}>
        <BookOpen size={17} />
        The REST API returns metadata and article links, not verified legal
        text. Results are not legal advice or a finding of applicability.
      </p>
      <form
        className={styles.searchForm}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const result = await api<{ results: LegalReference[] }>(
              `/cases/${caseId}/legal?q=${encodeURIComponent(query)}`,
            );
            setResults(result.results);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Search size={18} />
        <label className={styles.srOnly} htmlFor="legal-search">
          Search Indonesian regulations
        </label>
        <input
          id="legal-search"
          placeholder="Use legal keywords, e.g. keterangan saksi"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          minLength={2}
          maxLength={160}
          required
        />
        <button className={styles.primary} disabled={!configured || busy}>
          {busy ? "Searching…" : "Search Pasal.id"}
        </button>
      </form>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!configured ? (
        <Empty
          icon={<BookOpen size={32} />}
          title="Connect legal discovery."
          text="Add PASAL_API_KEY to the backend environment to enable authenticated searches. No legal references are fabricated in the offline demonstration."
        />
      ) : results === null ? (
        <Empty
          icon={<Search size={30} />}
          title="Begin with a legal issue."
          text="Search generic legal terms rather than names or personal case details. Every result opens its source for your review."
        />
      ) : results.length ? (
        <LegalResults results={results} />
      ) : (
        <Empty
          icon={<Search size={30} />}
          title="No references found."
          text="Try a different regulation title or legal keyword."
        />
      )}
    </div>
  );
}
function SessionSettings({
  caps,
  detail,
  busy,
  run,
}: {
  caps: Capabilities | null;
  detail: CaseDetail;
  busy: boolean;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const speakers = [...new Set(detail.segments.map((s) => s.speaker))];
  return (
    <div className={styles.settingsPage}>
      <section>
        <h2>Speaker labels</h2>
        <p>
          Voice IDs are not identities. Assign a courtroom role only after you
          have verified who is speaking.
        </p>
        {speakers.length ? (
          speakers.map((s) => (
            <form
              className={styles.speakerForm}
              key={s}
              onSubmit={(e) => {
                e.preventDefault();
                const label = new FormData(e.currentTarget).get("label");
                void run(() =>
                  api(`/cases/${detail.case.id}/speakers`, {
                    method: "PATCH",
                    body: JSON.stringify({ speaker: s, label }),
                  }),
                );
              }}
            >
              <label>
                {s}
                <input
                  name="label"
                  defaultValue={detail.case.speakers[s] ?? ""}
                  placeholder="Verified name or role"
                  required
                  maxLength={80}
                />
              </label>
              <button className={styles.secondary} disabled={busy}>
                Save label
              </button>
            </form>
          ))
        ) : (
          <p className={styles.muted}>
            Speaker IDs appear after testimony is added.
          </p>
        )}
      </section>
      <section>
        <h2>Connections</h2>
        <p>
          Configured means credentials are present; a successful request
          verifies the provider. Secrets stay on the backend.
        </p>
        {caps &&
          (["analysis", "speech", "legal", "embeddings"] as const).map(
            (key) => (
              <div className={styles.connection} key={key}>
                <span
                  className={
                    caps[key].configured ? styles.onlineDot : styles.offlineDot
                  }
                />
                <div>
                  <h3>
                    {
                      {
                        analysis: "OpenRouter analysis",
                        speech: "Speechmatics transcription",
                        legal: "Pasal.id legal discovery",
                        embeddings: "Evidence embeddings",
                      }[key]
                    }
                  </h3>
                  <p>{caps[key].note}</p>
                </div>
                <span>
                  {caps[key].configured ? "Configured" : "Not connected"}
                </span>
              </div>
            ),
          )}
        <div className={styles.connection}>
          <FolderOpen size={17} />
          <div>
            <h3>{caps?.storage ?? "Storage"}</h3>
            <p>
              Case records persist on the backend. Original files use local
              private storage or the configured Supabase bucket.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
