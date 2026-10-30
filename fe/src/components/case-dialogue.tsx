"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Gavel,
  LoaderCircle,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { api, type Capabilities } from "@/lib/workspace-api";
import ui from "./workspace.module.css";
import styles from "./case-dialogue.module.css";

type Conditions = {
  trial_type: string;
  jurisdiction: string;
  stage: string;
  user_role: string;
  difficulty: string;
  language: string;
  goals: string;
  assumptions: string;
};
type Source = {
  chunk_id: string;
  kind: "document" | "testimony";
  title: string;
  text: string;
  document_id: string | null;
  page: number | null;
  hearing_id: string | null;
};
type Message = {
  id: string;
  role: string;
  speaker: string;
  text: string;
  notice: string;
  citations: {
    chunk_id: string;
    quote: string;
    relation: string;
    source: Source;
  }[];
  legal: { id: string; title: string; reference: string; url: string }[];
};
type Dialogue = {
  id: string;
  title: string;
  kind: string;
  mode: string;
  status: string;
  conditions: Conditions;
  created_at: string;
  messages?: Message[];
};
type Reference = { id: string; label: string; kind: string };
const defaults: Conditions = {
  trial_type: "Criminal trial",
  jurisdiction: "Indonesia — confirm applicable procedure",
  stage: "Witness examination",
  user_role: "defense",
  difficulty: "Standard",
  language: "English",
  goals: "Practice precise questions and source-based arguments.",
  assumptions:
    "Procedure and scenario details are practice assumptions, not established case facts.",
};
const roles: Record<string, string> = {
  defense: "Defense counsel",
  opposing: "Opposing counsel",
  judge: "Judge",
  witness: "Witness",
};
const stages = [
  "Opening statements",
  "Witness examination",
  "Cross-examination",
  "Closing arguments",
  "Procedural hearing",
];

export function CaseDialogue({
  caseId,
  kind,
  caps,
  openHearing,
  initialReference,
}: {
  caseId: string;
  kind: "assistant" | "practice";
  caps: Capabilities | null;
  openHearing: (id: string) => void;
  initialReference?: string | null;
}) {
  const practice = kind === "practice";
  const [sessions, setSessions] = useState<Dialogue[]>([]);
  const [active, setActive] = useState<Dialogue | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);
  const [selectedRefs, setSelectedRefs] = useState<string[]>(
    initialReference ? [initialReference] : [],
  );
  const [text, setText] = useState("");
  const [law, setLaw] = useState("");
  const [conditions, setConditions] = useState<Conditions>(defaults);
  const [mode, setMode] = useState(caps?.analysis.configured ? "ai" : "guided");
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([
      api<Dialogue[]>(`/cases/${caseId}/dialogues?kind=${kind}`),
      api<{ references: Reference[] }>(`/cases/${caseId}/assistant/context`),
    ])
      .then(async ([list, context]) => {
        const latest = list[0]
          ? await api<Dialogue>(`/cases/${caseId}/dialogues/${list[0].id}`)
          : null;
        if (alive) {
          setSessions(list);
          setReferences(context.references);
          setActive(latest);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [caseId, kind]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [active?.id, active?.messages?.length]);
  async function refreshList() {
    setSessions(
      await api<Dialogue[]>(`/cases/${caseId}/dialogues?kind=${kind}`),
    );
  }
  async function run(label: string, operation: () => Promise<void>) {
    setBusy(label);
    setError("");
    try {
      await operation();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  function newSession() {
    setActive(null);
    setText("");
    setLaw("");
    setError("");
    setRationale("");
    request.current = null;
    requestAnimationFrame(() => {
      (
        document.getElementById(
          practice ? "trial-type" : "case-message",
        ) as HTMLElement | null
      )?.focus();
    });
  }
  async function create() {
    const session = await api<Dialogue>(`/cases/${caseId}/dialogues`, {
      method: "POST",
      body: JSON.stringify({
        kind,
        mode: practice ? mode : "ai",
        ...(practice ? { conditions } : {}),
      }),
    });
    setActive(session);
    await refreshList();
    return session;
  }
  async function send(finish = false) {
    if (busy || (!text.trim() && !finish)) return;
    await run(
      finish
        ? "Preparing your debrief…"
        : practice
          ? "The courtroom is responding…"
          : "Reading the case…",
      async () => {
        const session = active ?? (await create());
        const message = finish
          ? "End this rehearsal and give me a practice debrief."
          : text.trim();
        const data = {
          text: message,
          reference_ids: selectedRefs,
          legal_query: law.trim(),
          finish,
        };
        const fingerprint = JSON.stringify({ session: session.id, ...data });
        if (request.current?.fingerprint !== fingerprint)
          request.current = { fingerprint, id: crypto.randomUUID() };
        const result = await api<Dialogue>(
          `/cases/${caseId}/dialogues/${session.id}/messages`,
          {
            method: "POST",
            body: JSON.stringify({ ...data, request_id: request.current.id }),
          },
        );
        setActive(result);
        setText("");
        request.current = null;
        await refreshList();
        requestAnimationFrame(() => composer.current?.focus());
      },
    );
  }
  const messages = active?.messages ?? [];
  const canCompose = !practice || !!active;
  return (
    <div className={styles.screen}>
      <header className={styles.heading}>
        <div>
          <h2>
            {practice
              ? "Prepare for the room."
              : "Think through the whole case."}
          </h2>
          <p>
            {practice
              ? "Rehearse an argument, question a witness, or practise directing the hearing. You choose your role and conditions."
              : "Ask follow-up questions across documents, hearings, findings, and confirmed evidence connections. Every case quotation stays inspectable."}
          </p>
        </div>
        <button
          className={ui.secondary}
          disabled={!!busy || loading}
          onClick={newSession}
        >
          <Plus size={16} />
          {practice ? "New rehearsal" : "New conversation"}
        </button>
      </header>
      {error && (
        <p role="alert" className={ui.error}>
          {error}
        </p>
      )}
      <div className={styles.layout}>
        <aside
          className={styles.history}
          aria-label={practice ? "Saved rehearsals" : "Saved conversations"}
        >
          <h3>{practice ? "Your rehearsals" : "Conversations"}</h3>
          {active && (
            <a
              className={ui.textButton}
              href={`/api/v1/cases/${caseId}/dialogues/${active.id}/export`}
              download
            >
              Export {practice ? "rehearsal" : "conversation"}{" "}
              <ExternalLink size={13} />
            </a>
          )}
          {sessions.length ? (
            sessions.map((session) => (
              <button
                key={session.id}
                disabled={!!busy}
                aria-pressed={active?.id === session.id}
                onClick={() =>
                  run("Opening conversation…", async () => {
                    const result = await api<Dialogue>(
                      `/cases/${caseId}/dialogues/${session.id}`,
                    );
                    setActive(result);
                    setText("");
                    setError("");
                    request.current = null;
                  })
                }
              >
                <span>{session.title}</span>
                <small>
                  {new Date(session.created_at).toLocaleDateString()} ·{" "}
                  {session.status === "complete"
                    ? "Completed"
                    : session.mode === "guided"
                      ? "Guided drill"
                      : session.kind === "practice"
                        ? "AI rehearsal"
                        : "Case conversation"}
                </small>
              </button>
            ))
          ) : (
            <p>
              {loading
                ? "Loading…"
                : practice
                  ? "Your practice sessions will appear here."
                  : "Your conversations stay with this case."}
            </p>
          )}
          <p className={styles.boundary}>
            {practice
              ? "Practice dialogue stays separate from evidence and hearing records."
              : "Case-scoped context. Other cases and practice conversations are excluded."}
          </p>
        </aside>
        <section
          className={styles.main}
          aria-label={
            practice ? "Courtroom practice" : "Case assistant conversation"
          }
        >
          {loading ? (
            <p className={styles.loading}>Opening this case’s conversations…</p>
          ) : practice && !active ? (
            <form
              className={styles.setup}
              onSubmit={(e) => {
                e.preventDefault();
                void run("Starting rehearsal…", async () => {
                  await create();
                });
              }}
            >
              <div className={styles.setupHeading}>
                <div>
                  <Gavel size={24} />
                  <h3>Set the scene.</h3>
                  <p>
                    Review these assumptions before starting. They describe a
                    practice scenario, not a prediction.
                  </p>
                </div>
                <button
                  type="button"
                  className={ui.secondary}
                  disabled={!!busy || !caps?.analysis.configured}
                  onClick={() =>
                    run("Suggesting trial conditions…", async () => {
                      const proposal = await api<{
                        conditions: Conditions;
                        rationale: string;
                      }>(`/cases/${caseId}/practice/propose`, {
                        method: "POST",
                        body: JSON.stringify(conditions),
                      });
                      setConditions(proposal.conditions);
                      setRationale(proposal.rationale);
                    })
                  }
                >
                  <Sparkles size={16} />
                  Suggest from case
                </button>
              </div>
              {rationale && (
                <div className={styles.proposal} role="status">
                  <strong>Suggested setup · review and edit below</strong>
                  <p>{rationale}</p>
                </div>
              )}
              <div className={styles.fields}>
                <label>
                  Trial type
                  <input
                    id="trial-type"
                    value={conditions.trial_type}
                    maxLength={160}
                    required
                    onChange={(e) =>
                      setConditions({
                        ...conditions,
                        trial_type: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Jurisdiction / court
                  <input
                    value={conditions.jurisdiction}
                    maxLength={200}
                    required
                    onChange={(e) =>
                      setConditions({
                        ...conditions,
                        jurisdiction: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Stage
                  <select
                    value={conditions.stage}
                    onChange={(e) =>
                      setConditions({ ...conditions, stage: e.target.value })
                    }
                  >
                    {stages.map((stage) => (
                      <option key={stage}>{stage}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Your role
                  <select
                    value={conditions.user_role}
                    onChange={(e) =>
                      setConditions({
                        ...conditions,
                        user_role: e.target.value,
                      })
                    }
                  >
                    {["defense", "opposing", "judge"].map((role) => (
                      <option key={role} value={role}>
                        {roles[role]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Difficulty
                  <select
                    value={conditions.difficulty}
                    onChange={(e) =>
                      setConditions({
                        ...conditions,
                        difficulty: e.target.value,
                      })
                    }
                  >
                    {["Supportive", "Standard", "Challenging"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Language
                  <input
                    value={conditions.language}
                    maxLength={80}
                    required
                    onChange={(e) =>
                      setConditions({ ...conditions, language: e.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                Practice goals
                <textarea
                  value={conditions.goals}
                  maxLength={1500}
                  rows={2}
                  onChange={(e) =>
                    setConditions({ ...conditions, goals: e.target.value })
                  }
                />
              </label>
              <label>
                Scenario assumptions and ground rules
                <textarea
                  value={conditions.assumptions}
                  maxLength={2500}
                  rows={3}
                  onChange={(e) =>
                    setConditions({
                      ...conditions,
                      assumptions: e.target.value,
                    })
                  }
                />
              </label>
              <div className={styles.setupFooter}>
                <label>
                  Practice mode
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                  >
                    <option value="ai" disabled={!caps?.analysis.configured}>
                      AI roleplay
                    </option>
                    <option value="guided">
                      Guided drill · scripted prompts
                    </option>
                  </select>
                </label>
                <button className={ui.primary} disabled={!!busy}>
                  <Gavel size={16} />
                  Start rehearsal
                </button>
              </div>
              {!caps?.analysis.configured && (
                <p className={styles.hint}>
                  Connect an OpenRouter model for suggested conditions and
                  responsive AI participants. The guided drill provides scripted
                  prompts and a self-review checklist.
                </p>
              )}
            </form>
          ) : (
            <>
              <div className={styles.sessionHeader}>
                <div>
                  <h3>
                    {active?.title ?? "A question, with the case behind it."}
                  </h3>
                  <p>
                    {practice
                      ? `You: ${roles[active!.conditions.user_role]} · ${active!.conditions.stage} · ${active!.mode === "guided" ? "Scripted drill" : "AI roleplay"}`
                      : "Relevant excerpts are retrieved for each message; the model does not receive every page at once."}
                  </p>
                </div>
                {practice && active?.status !== "complete" && (
                  <button
                    className={ui.secondary}
                    disabled={
                      !!busy || !messages.some((m) => m.role === "user")
                    }
                    onClick={() => send(true)}
                  >
                    <Check size={16} />
                    Finish & debrief
                  </button>
                )}
              </div>
              {practice && (
                <details className={styles.conditions}>
                  <summary>
                    Trial conditions <ChevronDown size={15} />
                  </summary>
                  <dl>
                    {Object.entries(active!.conditions).map(([key, value]) => (
                      <div key={key}>
                        <dt>{key.replaceAll("_", " ")}</dt>
                        <dd>{key === "user_role" ? roles[value] : value}</dd>
                      </div>
                    ))}
                  </dl>
                  <button
                    className={ui.secondary}
                    disabled={!!busy}
                    onClick={() => {
                      setConditions(active!.conditions);
                      newSession();
                    }}
                  >
                    Edit setup for a new rehearsal
                  </button>
                </details>
              )}
              <div
                ref={log}
                className={styles.messages}
                role="log"
                aria-label={
                  practice ? "Practice dialogue" : "Case conversation"
                }
                aria-live="polite"
                aria-relevant="additions"
              >
                {!messages.length && (
                  <div className={styles.welcome}>
                    <MessageSquare size={32} />
                    <h3>Start with what you need to understand.</h3>
                    <p>
                      Compare accounts, identify missing context, or prepare
                      questions. Select material below to give a source extra
                      attention.
                    </p>
                    <div>
                      {[
                        "Summarize the case and what is still uncertain.",
                        "Where do the witness accounts differ?",
                        "What questions should I prepare for the next hearing?",
                      ].map((question) => (
                        <button
                          key={question}
                          className={ui.secondary}
                          onClick={() => {
                            setText(question);
                            composer.current?.focus();
                          }}
                        >
                          {question}
                          <ArrowRight size={14} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`${styles.message} ${message.role === "user" ? styles.userMessage : ""}`}
                  >
                    <h4>
                      {message.role === "user"
                        ? practice
                          ? `You · ${roles[message.speaker] ?? message.speaker}`
                          : "You"
                        : (roles[message.speaker] ?? message.speaker)}
                    </h4>
                    <p>{message.text}</p>
                    {!!message.citations.length && (
                      <div className={styles.citations}>
                        {message.citations.map((citation, index) => (
                          <details key={`${citation.chunk_id}-${index}`}>
                            <summary>
                              <FileText size={15} />
                              <span>
                                {citation.source.title}
                                {citation.source.page
                                  ? ` · Page ${citation.source.page}`
                                  : ""}
                              </span>
                              <ChevronDown size={14} />
                            </summary>
                            <blockquote>“{citation.quote}”</blockquote>
                            <p className={styles.sourceText}>
                              {citation.source.text}
                            </p>
                            {citation.source.document_id && (
                              <a
                                href={`/api/v1/cases/${caseId}/documents/${citation.source.document_id}/original`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open original <ExternalLink size={13} />
                              </a>
                            )}
                            {citation.source.hearing_id && (
                              <button
                                className={ui.textButton}
                                disabled={!!busy}
                                onClick={() =>
                                  openHearing(citation.source.hearing_id!)
                                }
                              >
                                Open hearing <ArrowRight size={13} />
                              </button>
                            )}
                          </details>
                        ))}
                      </div>
                    )}
                    {!!message.legal.length && (
                      <div className={styles.legal}>
                        <strong>
                          <BookOpen size={15} />
                          Legal discovery · verify original text
                        </strong>
                        {message.legal.map((reference, index) => (
                          <a
                            key={`${reference.id}-${index}`}
                            href={reference.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {reference.title} · {reference.reference}
                            <ExternalLink size={13} />
                          </a>
                        ))}
                      </div>
                    )}
                    {message.notice && (
                      <p className={styles.notice}>{message.notice}</p>
                    )}
                  </article>
                ))}
              </div>
              {active?.status === "complete" ? (
                <div className={styles.complete}>
                  <Check size={18} />
                  <p>
                    Rehearsal complete. Your dialogue and debrief are saved.
                  </p>
                  <button className={ui.secondary} onClick={newSession}>
                    Practise again
                  </button>
                </div>
              ) : (
                canCompose && (
                  <form
                    className={styles.composer}
                    onSubmit={(e) => {
                      e.preventDefault();
                      void send();
                    }}
                  >
                    {(!practice || active?.mode === "ai") && (
                      <details className={styles.referencePicker}>
                        <summary>
                          <FileText size={15} />
                          Reference case material
                          {selectedRefs.length
                            ? ` (${selectedRefs.length})`
                            : ""}
                          <ChevronDown size={14} />
                        </summary>
                        <p>
                          Choose up to six records. Relevant excerpts are
                          selected; a reference does not attach every page.
                        </p>
                        {initialReference &&
                          !references.some(
                            (r) => r.id === initialReference,
                          ) && (
                            <label>
                              <input
                                type="checkbox"
                                checked={selectedRefs.includes(
                                  initialReference,
                                )}
                                onChange={(e) =>
                                  setSelectedRefs(
                                    e.target.checked
                                      ? [...selectedRefs, initialReference]
                                      : selectedRefs.filter(
                                          (id) => id !== initialReference,
                                        ),
                                  )
                                }
                              />
                              Selected evidence passage
                            </label>
                          )}
                        {references.map((reference) => (
                          <label key={reference.id}>
                            <input
                              type="checkbox"
                              checked={selectedRefs.includes(reference.id)}
                              disabled={
                                !selectedRefs.includes(reference.id) &&
                                selectedRefs.length >= 6
                              }
                              onChange={(e) =>
                                setSelectedRefs(
                                  e.target.checked
                                    ? [...selectedRefs, reference.id]
                                    : selectedRefs.filter(
                                        (id) => id !== reference.id,
                                      ),
                                )
                              }
                            />
                            <span>
                              {reference.label}
                              <small>
                                {reference.kind === "hearing"
                                  ? "Hearing transcript"
                                  : "Case document"}
                              </small>
                            </span>
                          </label>
                        ))}
                        {!references.length && !initialReference && (
                          <p>
                            Add documents or a hearing to reference them here.
                          </p>
                        )}
                      </details>
                    )}
                    {!practice && (
                      <details className={styles.referencePicker}>
                        <summary>
                          <BookOpen size={15} />
                          Include legal lookup
                          <ChevronDown size={14} />
                        </summary>
                        <label>
                          Legal search terms
                          <input
                            value={law}
                            maxLength={300}
                            disabled={!caps?.legal.configured}
                            onChange={(e) => setLaw(e.target.value)}
                            placeholder="e.g. witness testimony, burden of proof"
                          />
                        </label>
                        <p>
                          {caps?.legal.configured
                            ? "Search generic legal terms. Pasal.id returns discovery metadata, not verified article text."
                            : "Connect Pasal.id in the backend to include legal discovery. Uploaded law documents can still be referenced as case material."}
                        </p>
                      </details>
                    )}
                    <label htmlFor="case-message">
                      {practice
                        ? `Your turn · ${roles[active!.conditions.user_role]}`
                        : "Ask about this case"}
                    </label>
                    <textarea
                      ref={composer}
                      id="case-message"
                      value={text}
                      maxLength={5000}
                      rows={3}
                      required
                      disabled={!!busy}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={
                        practice
                          ? "Make your argument, ask a question, or direct the hearing…"
                          : "Ask a question or follow up on an earlier answer…"
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          if (!busy) void send();
                        }
                      }}
                    />
                    <div className={styles.composerFooter}>
                      <span>
                        {practice
                          ? "Hypothetical practice · never added to evidence"
                          : caps?.analysis.configured
                            ? "Citations verify quoted text, not legal correctness."
                            : "Sources-only mode · connect OpenRouter for AI replies"}
                      </span>
                      <button
                        className={ui.primary}
                        disabled={!!busy || !text.trim()}
                      >
                        <Send size={15} />
                        {practice ? "Take your turn" : "Send message"}
                      </button>
                    </div>
                  </form>
                )
              )}
            </>
          )}
          {busy && (
            <p className={styles.busy} role="status">
              <LoaderCircle size={16} />
              {busy}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
