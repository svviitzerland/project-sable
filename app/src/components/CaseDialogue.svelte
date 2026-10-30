<script lang="ts">
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
  } from "@lucide/svelte";
  import { api, type Capabilities } from "../lib/workspace-api";
  import ui from "./workspace.module.css";
  import styles from "./case-dialogue.module.css";
  import { untrack } from "svelte";

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

  let {
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
  } = $props();

  let practice = $derived(kind === "practice");

  let sessions = $state<Dialogue[]>([]);

  let active = $state<Dialogue | null>(null);

  let references = $state<Reference[]>([]);

  let selectedRefs = $state<string[]>(
    untrack(() => (initialReference ? [initialReference] : [])),
  );

  let text = $state("");

  let law = $state("");

  let conditions = $state<Conditions>(defaults);

  let mode = $state(
    untrack(() => (caps?.analysis.configured ? "ai" : "guided")),
  );

  let rationale = $state("");

  let busy = $state("");

  let loading = $state(true);

  let error = $state("");

  const log = { current: null as HTMLDivElement | null };

  const composer = { current: null as HTMLTextAreaElement | null };

  const request = {
    current: null as { fingerprint: string; id: string } | null,
  };

  $effect(() => {
    void [caseId, kind];
    return untrack(() => {
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
            sessions = list;
            references = context.references;
            active = latest;
          }
        })
        .catch((e) => {
          if (alive) error = e.message;
        })
        .finally(() => {
          if (alive) loading = false;
        });
      return () => {
        alive = false;
      };
    });
  });

  $effect(() => {
    void [active?.id, active?.messages?.length];
    return untrack(() => {
      if (log.current) log.current.scrollTop = log.current.scrollHeight;
    });
  });

  async function refreshList() {
    sessions = await api<Dialogue[]>(`/cases/${caseId}/dialogues?kind=${kind}`);
  }

  async function run(label: string, operation: () => Promise<void>) {
    busy = label;
    error = "";
    try {
      await operation();
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = "";
    }
  }

  function newSession() {
    active = null;
    text = "";
    law = "";
    error = "";
    rationale = "";
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
    active = session;
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
        active = result;
        text = "";
        request.current = null;
        await refreshList();
        requestAnimationFrame(() => composer.current?.focus());
      },
    );
  }

  let messages = $derived(active?.messages ?? []);

  let canCompose = $derived(!practice || !!active);
</script>

<div class={styles.screen}>
  <header class={styles.heading}>
    <div>
      <h2>
        {practice ? "Prepare for the room." : "Think through the whole case."}
      </h2>
      <p>
        {practice
          ? "Rehearse an argument, question a witness, or practise directing the hearing. You choose your role and conditions."
          : "Ask follow-up questions across documents, hearings, findings, and confirmed evidence connections. Every case quotation stays inspectable."}
      </p>
    </div>
    <button
      class={ui.secondary}
      disabled={!!busy || loading}
      onclick={newSession}
    >
      <Plus size={16}></Plus>
      {practice ? "New rehearsal" : "New conversation"}
    </button>
  </header>
  {#if error}<p role="alert" class={ui.error}>
      {error}
    </p>{/if}
  <div class={styles.layout}>
    <aside
      class={styles.history}
      aria-label={practice ? "Saved rehearsals" : "Saved conversations"}
    >
      <h3>{practice ? "Your rehearsals" : "Conversations"}</h3>
      {#if active}<a
          class={ui.textButton}
          rel="external"
          href={`/api/v1/cases/${caseId}/dialogues/${active.id}/export`}
          download
        >
          Export {practice ? "rehearsal" : "conversation"}&#32;
          <ExternalLink size={13}></ExternalLink>
        </a>{/if}
      {#if sessions.length}{#each sessions as session (session.id)}<button
            disabled={!!busy}
            aria-pressed={active?.id === session.id}
            onclick={() =>
              run("Opening conversation…", async () => {
                const result = await api<Dialogue>(
                  `/cases/${caseId}/dialogues/${session.id}`,
                );
                active = result;
                text = "";
                error = "";
                request.current = null;
              })}
          >
            <span>{session.title}</span>
            <small>
              {new Date(session.created_at).toLocaleDateString()} ·&#32;
              {session.status === "complete"
                ? "Completed"
                : session.mode === "guided"
                  ? "Guided drill"
                  : session.kind === "practice"
                    ? "AI rehearsal"
                    : "Case conversation"}
            </small>
          </button>{/each}{:else}<p>
          {loading
            ? "Loading…"
            : practice
              ? "Your practice sessions will appear here."
              : "Your conversations stay with this case."}
        </p>{/if}
      <p class={styles.boundary}>
        {practice
          ? "Practice dialogue stays separate from evidence and hearing records."
          : "Case-scoped context. Other cases and practice conversations are excluded."}
      </p>
    </aside>
    <section
      class={styles.main}
      aria-label={practice
        ? "Courtroom practice"
        : "Case assistant conversation"}
    >
      {#if loading}<p class={styles.loading}>
          Opening this case’s conversations…
        </p>{:else}{#if practice && !active}<form
            class={styles.setup}
            onsubmit={(e) => {
              e.preventDefault();
              void run("Starting rehearsal…", async () => {
                await create();
              });
            }}
          >
            <div class={styles.setupHeading}>
              <div>
                <Gavel size={24}></Gavel>
                <h3>Set the scene.</h3>
                <p>
                  Review these assumptions before starting. They describe a
                  practice scenario, not a prediction.
                </p>
              </div>
              <button
                type="button"
                class={ui.secondary}
                disabled={!!busy || !caps?.analysis.configured}
                onclick={() =>
                  run("Suggesting trial conditions…", async () => {
                    const proposal = await api<{
                      conditions: Conditions;
                      rationale: string;
                    }>(`/cases/${caseId}/practice/propose`, {
                      method: "POST",
                      body: JSON.stringify(conditions),
                    });
                    conditions = proposal.conditions;
                    rationale = proposal.rationale;
                  })}
              >
                <Sparkles size={16}></Sparkles>
                Suggest from case
              </button>
            </div>
            {#if rationale}<div class={styles.proposal} role="status">
                <strong>Suggested setup · review and edit below</strong>
                <p>{rationale}</p>
              </div>{/if}
            <div class={styles.fields}>
              <label>
                Trial type
                <input
                  id="trial-type"
                  value={conditions.trial_type}
                  maxlength={160}
                  required
                  oninput={(e) =>
                    (conditions = {
                      ...conditions,
                      trial_type: e.currentTarget.value,
                    })}
                />
              </label>
              <label>
                Jurisdiction / court
                <input
                  value={conditions.jurisdiction}
                  maxlength={200}
                  required
                  oninput={(e) =>
                    (conditions = {
                      ...conditions,
                      jurisdiction: e.currentTarget.value,
                    })}
                />
              </label>
              <label>
                Stage
                <select
                  value={conditions.stage}
                  onchange={(e) =>
                    (conditions = {
                      ...conditions,
                      stage: e.currentTarget.value,
                    })}
                >
                  {#each stages as stage (stage)}<option>{stage}</option>{/each}
                </select>
              </label>
              <label>
                Your role
                <select
                  value={conditions.user_role}
                  onchange={(e) =>
                    (conditions = {
                      ...conditions,
                      user_role: e.currentTarget.value,
                    })}
                >
                  {#each ["defense", "opposing", "judge"] as role (role)}<option
                      value={role}
                    >
                      {roles[role]}
                    </option>{/each}
                </select>
              </label>
              <label>
                Difficulty
                <select
                  value={conditions.difficulty}
                  onchange={(e) =>
                    (conditions = {
                      ...conditions,
                      difficulty: e.currentTarget.value,
                    })}
                >
                  {#each ["Supportive", "Standard", "Challenging"] as v (v)}<option
                      >{v}</option
                    >{/each}
                </select>
              </label>
              <label>
                Language
                <input
                  value={conditions.language}
                  maxlength={80}
                  required
                  oninput={(e) =>
                    (conditions = {
                      ...conditions,
                      language: e.currentTarget.value,
                    })}
                />
              </label>
            </div>
            <label>
              Practice goals
              <textarea
                value={conditions.goals}
                maxlength={1500}
                rows={2}
                oninput={(e) =>
                  (conditions = {
                    ...conditions,
                    goals: e.currentTarget.value,
                  })}></textarea>
            </label>
            <label>
              Scenario assumptions and ground rules
              <textarea
                value={conditions.assumptions}
                maxlength={2500}
                rows={3}
                oninput={(e) =>
                  (conditions = {
                    ...conditions,
                    assumptions: e.currentTarget.value,
                  })}></textarea>
            </label>
            <div class={styles.setupFooter}>
              <label>
                Practice mode
                <select
                  value={mode}
                  onchange={(e) => (mode = e.currentTarget.value)}
                >
                  <option value="ai" disabled={!caps?.analysis.configured}>
                    AI roleplay
                  </option>
                  <option value="guided">
                    Guided drill · scripted prompts
                  </option>
                </select>
              </label>
              <button class={ui.primary} disabled={!!busy}>
                <Gavel size={16}></Gavel>
                Start rehearsal
              </button>
            </div>
            {#if !caps?.analysis.configured}<p class={styles.hint}>
                Connect an OpenRouter model for suggested conditions and
                responsive AI participants. The guided drill provides scripted
                prompts and a self-review checklist.
              </p>{/if}
          </form>{:else}
          <div class={styles.sessionHeader}>
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
            {#if practice && active?.status !== "complete"}<button
                class={ui.secondary}
                disabled={!!busy || !messages.some((m) => m.role === "user")}
                onclick={() => send(true)}
              >
                <Check size={16}></Check>
                Finish & debrief
              </button>{/if}
          </div>
          {#if practice}<details class={styles.conditions}>
              <summary>
                Trial conditions <ChevronDown size={15}></ChevronDown>
              </summary>
              <dl>
                {#each Object.entries(active!.conditions) as [key, value] (key)}<div
                  >
                    <dt>{key.replaceAll("_", " ")}</dt>
                    <dd>{key === "user_role" ? roles[value] : value}</dd>
                  </div>{/each}
              </dl>
              <button
                class={ui.secondary}
                disabled={!!busy}
                onclick={() => {
                  conditions = active!.conditions;
                  newSession();
                }}
              >
                Edit setup for a new rehearsal
              </button>
            </details>{/if}
          <div
            bind:this={log.current}
            class={styles.messages}
            role="log"
            aria-label={practice ? "Practice dialogue" : "Case conversation"}
            aria-live="polite"
            aria-relevant="additions"
          >
            {#if !messages.length}<div class={styles.welcome}>
                <MessageSquare size={32}></MessageSquare>
                <h3>Start with what you need to understand.</h3>
                <p>
                  Compare accounts, identify missing context, or prepare
                  questions. Select material below to give a source extra
                  attention.
                </p>
                <div>
                  {#each ["Summarize the case and what is still uncertain.", "Where do the witness accounts differ?", "What questions should I prepare for the next hearing?"] as question (question)}<button
                      class={ui.secondary}
                      onclick={() => {
                        text = question;
                        composer.current?.focus();
                      }}
                    >
                      {question}
                      <ArrowRight size={14}></ArrowRight>
                    </button>{/each}
                </div>
              </div>{/if}
            {#each messages as message (message.id)}<article
                class={`${styles.message} ${message.role === "user" ? styles.userMessage : ""}`}
              >
                <h4>
                  {message.role === "user"
                    ? practice
                      ? `You · ${roles[message.speaker] ?? message.speaker}`
                      : "You"
                    : (roles[message.speaker] ?? message.speaker)}
                </h4>
                <p>{message.text}</p>
                {#if !!message.citations.length}<div class={styles.citations}>
                    {#each message.citations as citation, index (index)}<details
                      >
                        <summary>
                          <FileText size={15}></FileText>
                          <span>
                            {citation.source.title}
                            {citation.source.page
                              ? ` · Page ${citation.source.page}`
                              : ""}
                          </span>
                          <ChevronDown size={14}></ChevronDown>
                        </summary>
                        <blockquote>“{citation.quote}”</blockquote>
                        <p class={styles.sourceText}>
                          {citation.source.text}
                        </p>
                        {#if citation.source.document_id}<a
                            href={`/api/v1/cases/${caseId}/documents/${citation.source.document_id}/original`}
                            target="_blank"
                            rel="external noreferrer"
                          >
                            Open original <ExternalLink size={13}
                            ></ExternalLink>
                          </a>{/if}
                        {#if citation.source.hearing_id}<button
                            class={ui.textButton}
                            disabled={!!busy}
                            onclick={() =>
                              openHearing(citation.source.hearing_id!)}
                          >
                            Open hearing <ArrowRight size={13}></ArrowRight>
                          </button>{/if}
                      </details>{/each}
                  </div>{/if}
                {#if !!message.legal.length}<div class={styles.legal}>
                    <strong>
                      <BookOpen size={15}></BookOpen>
                      Legal discovery · verify original text
                    </strong>
                    {#each message.legal as reference, index (index)}<a
                        href={reference.url}
                        target="_blank"
                        rel="external noreferrer"
                      >
                        {reference.title} · {reference.reference}
                        <ExternalLink size={13}></ExternalLink>
                      </a>{/each}
                  </div>{/if}
                {#if message.notice}<p class={styles.notice}>
                    {message.notice}
                  </p>{/if}
              </article>{/each}
          </div>
          {#if active?.status === "complete"}<div class={styles.complete}>
              <Check size={18}></Check>
              <p>Rehearsal complete. Your dialogue and debrief are saved.</p>
              <button class={ui.secondary} onclick={newSession}>
                Practise again
              </button>
            </div>{:else}{#if canCompose}<form
                class={styles.composer}
                onsubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                {#if !practice || active?.mode === "ai"}<details
                    class={styles.referencePicker}
                  >
                    <summary>
                      <FileText size={15}></FileText>
                      Reference case material
                      {selectedRefs.length ? ` (${selectedRefs.length})` : ""}
                      <ChevronDown size={14}></ChevronDown>
                    </summary>
                    <p>
                      Choose up to six records. Relevant excerpts are selected;
                      a reference does not attach every page.
                    </p>
                    {#if initialReference && !references.some((r) => r.id === initialReference)}<label
                      >
                        <input
                          type="checkbox"
                          checked={selectedRefs.includes(initialReference)}
                          oninput={(e) =>
                            (selectedRefs = e.currentTarget.checked
                              ? [...selectedRefs, initialReference]
                              : selectedRefs.filter(
                                  (id) => id !== initialReference,
                                ))}
                        />
                        Selected evidence passage
                      </label>{/if}
                    {#each references as reference (reference.id)}<label>
                        <input
                          type="checkbox"
                          checked={selectedRefs.includes(reference.id)}
                          disabled={!selectedRefs.includes(reference.id) &&
                            selectedRefs.length >= 6}
                          oninput={(e) =>
                            (selectedRefs = e.currentTarget.checked
                              ? [...selectedRefs, reference.id]
                              : selectedRefs.filter(
                                  (id) => id !== reference.id,
                                ))}
                        />
                        <span>
                          {reference.label}
                          <small>
                            {reference.kind === "hearing"
                              ? "Hearing transcript"
                              : "Case document"}
                          </small>
                        </span>
                      </label>{/each}
                    {#if !references.length && !initialReference}<p>
                        Add documents or a hearing to reference them here.
                      </p>{/if}
                  </details>{/if}
                {#if !practice}<details class={styles.referencePicker}>
                    <summary>
                      <BookOpen size={15}></BookOpen>
                      Include legal lookup
                      <ChevronDown size={14}></ChevronDown>
                    </summary>
                    <label>
                      Legal search terms
                      <input
                        value={law}
                        maxlength={300}
                        disabled={!caps?.legal.configured}
                        oninput={(e) => (law = e.currentTarget.value)}
                        placeholder="e.g. witness testimony, burden of proof"
                      />
                    </label>
                    <p>
                      {caps?.legal.configured
                        ? "Search generic legal terms. Pasal.id returns discovery metadata, not verified article text."
                        : "Connect Pasal.id in the backend to include legal discovery. Uploaded law documents can still be referenced as case material."}
                    </p>
                  </details>{/if}
                <label for="case-message">
                  {practice
                    ? `Your turn · ${roles[active!.conditions.user_role]}`
                    : "Ask about this case"}
                </label>
                <textarea
                  bind:this={composer.current}
                  id="case-message"
                  value={text}
                  maxlength={5000}
                  rows={3}
                  required
                  disabled={!!busy}
                  oninput={(e) => (text = e.currentTarget.value)}
                  placeholder={practice
                    ? "Make your argument, ask a question, or direct the hearing…"
                    : "Ask a question or follow up on an earlier answer…"}
                  onkeydown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      if (!busy) void send();
                    }
                  }}></textarea>
                <div class={styles.composerFooter}>
                  <span>
                    {practice
                      ? "Hypothetical practice · never added to evidence"
                      : caps?.analysis.configured
                        ? "Citations verify quoted text, not legal correctness."
                        : "Sources-only mode · connect OpenRouter for AI replies"}
                  </span>
                  <button class={ui.primary} disabled={!!busy || !text.trim()}>
                    <Send size={15}></Send>
                    {practice ? "Take your turn" : "Send message"}
                  </button>
                </div>
              </form>{/if}{/if}
        {/if}{/if}
      {#if busy}<p class={styles.busy} role="status">
          <LoaderCircle size={16}></LoaderCircle>
          {busy}
        </p>{/if}
    </section>
  </div>
</div>
