<script lang="ts">
  import {
    formatDate,
    t,
    type MessageKey,
  } from "../lib/i18n/index.svelte";
  import Skeleton from "./Skeleton.svelte";
  import {
    ArrowRight,
    BookOpen,
    Check,
    ChevronDown,
    ExternalLink,
    FileText,
    Gavel,
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

  /**
   * Free-text defaults follow the UI language, including `language`, so AI
   * practice replies in the lawyer's language unless they change it.
   * `stage`, `difficulty` and `user_role` are API enum values; only their
   * labels are translated.
   */
  function defaultConditions(): Conditions {
    return {
      trial_type: t("dialogue.default.trialType"),
      jurisdiction: t("dialogue.default.jurisdiction"),
      stage: "Witness examination",
      user_role: "defense",
      difficulty: "Standard",
      language: t("dialogue.default.language"),
      goals: t("dialogue.default.goals"),
      assumptions: t("dialogue.default.assumptions"),
    };
  }

  const roleKeys = ["defense", "opposing", "judge", "witness"] as const;

  const stages = [
    "Opening statements",
    "Witness examination",
    "Cross-examination",
    "Closing arguments",
    "Procedural hearing",
  ] as const;

  const difficulties = ["Supportive", "Standard", "Challenging"] as const;

  function roleLabel(role: string) {
    return (roleKeys as readonly string[]).includes(role)
      ? t(`role.${role as (typeof roleKeys)[number]}`)
      : role;
  }

  function stageLabel(stage: string) {
    return (stages as readonly string[]).includes(stage)
      ? t(`stage.${stage as (typeof stages)[number]}`)
      : stage;
  }

  function difficultyLabel(value: string) {
    return (difficulties as readonly string[]).includes(value)
      ? t(`difficulty.${value as (typeof difficulties)[number]}`)
      : value;
  }

  function conditionValue(key: string, value: string) {
    return key === "user_role"
      ? roleLabel(value)
      : key === "stage"
        ? stageLabel(value)
        : key === "difficulty"
          ? difficultyLabel(value)
          : value;
  }

  const conditionKeys = [
    "trial_type",
    "jurisdiction",
    "stage",
    "user_role",
    "difficulty",
    "language",
    "goals",
    "assumptions",
  ] as const;

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

  let conditions = $state<Conditions>(untrack(defaultConditions));

  let mode = $state(
    untrack(() => (caps?.analysis.configured ? "ai" : "guided")),
  );

  let rationale = $state("");

  let busy = $state<MessageKey | "">("");
  let responding = $derived(
    busy === "dialogue.busy.reading" ||
      busy === "dialogue.busy.responding" ||
      busy === "dialogue.busy.debrief",
  );

  let loading = $state(true);
  let historyOpen = $state(false);

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
    void [active?.id, active?.messages?.length, responding];
    return untrack(() => {
      if (log.current) log.current.scrollTop = log.current.scrollHeight;
    });
  });

  async function refreshList() {
    sessions = await api<Dialogue[]>(`/cases/${caseId}/dialogues?kind=${kind}`);
  }

  async function run(label: MessageKey, operation: () => Promise<void>) {
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
        ? "dialogue.busy.debrief"
        : practice
          ? "dialogue.busy.responding"
          : "dialogue.busy.reading",
      async () => {
        const session = active ?? (await create());
        const message = finish
          ? t("dialogue.finishMessage")
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
        {practice
          ? t("dialogue.practiceTitle")
          : t("dialogue.assistantTitle")}
      </h2>
      <p>
        {practice ? t("dialogue.practiceLead") : t("dialogue.assistantLead")}
      </p>
    </div>
    <button
      class={ui.secondary}
      disabled={!!busy || loading}
      onclick={newSession}
    >
      <Plus size={16}></Plus>
      {practice ? t("dialogue.newRehearsal") : t("dialogue.newConversation")}
    </button>
  </header>
  {#if error}<p role="alert" class={ui.error}>
      {error}
    </p>{/if}
  <div class={styles.layout}>
    <button
      class={styles.historyToggle}
      aria-expanded={historyOpen}
      aria-controls="dialogue-history"
      onclick={() => (historyOpen = !historyOpen)}
    >
      {practice
        ? t("dialogue.savedRehearsals")
        : t("dialogue.savedConversations")} ({sessions.length})
      <ChevronDown size={16} />
    </button>
    <aside
      id="dialogue-history"
      class={`${styles.history} ${historyOpen ? styles.historyOpen : ""}`}
      aria-label={practice
        ? t("dialogue.savedRehearsals")
        : t("dialogue.savedConversations")}
    >
      <h3>
        {practice ? t("dialogue.yourRehearsals") : t("dialogue.conversations")}
      </h3>
      {#if active}<a
          class={ui.textButton}
          rel="external"
          href={`/api/v1/cases/${caseId}/dialogues/${active.id}/export`}
          download
        >
          {practice
            ? t("dialogue.exportRehearsal")
            : t("dialogue.exportConversation")}&#32;
          <ExternalLink size={13}></ExternalLink>
        </a>{/if}
      {#if loading}<Skeleton
          variant="rows"
          label={t("dialogue.loadingSaved")}
        />{:else if sessions.length}{#each sessions as session (session.id)}<button
            disabled={!!busy}
            aria-pressed={active?.id === session.id}
            onclick={() =>
              run("dialogue.busy.opening", async () => {
                const result = await api<Dialogue>(
                  `/cases/${caseId}/dialogues/${session.id}`,
                );
                active = result;
                historyOpen = false;
                text = "";
                error = "";
                request.current = null;
              })}
          >
            <span>{session.title}</span>
            <small>
              {formatDate(session.created_at)} ·&#32;
              {session.status === "complete"
                ? t("dialogue.completed")
                : session.mode === "guided"
                  ? t("dialogue.guidedDrill")
                  : session.kind === "practice"
                    ? t("dialogue.aiRehearsal")
                    : t("dialogue.caseConversation")}
            </small>
          </button>{/each}{:else}<p>
          {practice
            ? t("dialogue.emptyPractice")
            : t("dialogue.emptyAssistant")}
        </p>{/if}
      <p class={styles.boundary}>
        {practice
          ? t("dialogue.boundaryPractice")
          : t("dialogue.boundaryAssistant")}
      </p>
    </aside>
    <section
      class={styles.main}
      aria-label={practice
        ? t("dialogue.mainPractice")
        : t("dialogue.mainAssistant")}
    >
      {#if loading || busy === "dialogue.busy.opening" || busy === "dialogue.busy.starting"}<Skeleton
          variant={practice && !active ? "form" : "conversation"}
          label={loading || !busy
            ? t("dialogue.openingConversations")
            : t(busy)}
        />{:else}{#if practice && !active}<form
            class={styles.setup}
            onsubmit={(e) => {
              e.preventDefault();
              void run("dialogue.busy.starting", async () => {
                await create();
              });
            }}
          >
            <div class={styles.setupHeading}>
              <div>
                <Gavel size={24}></Gavel>
                <h3>{t("dialogue.setTitle")}</h3>
                <p>{t("dialogue.setText")}</p>
              </div>
              <button
                type="button"
                class={ui.secondary}
                disabled={!!busy || !caps?.analysis.configured}
                onclick={() =>
                  run("dialogue.busy.suggesting", async () => {
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
                {t("dialogue.suggest")}
              </button>
            </div>
            {#if busy === "dialogue.busy.suggesting"}<Skeleton
                variant="reader"
                label={t(busy)}
              />{:else if rationale}<div class={styles.proposal} role="status">
                <strong>{t("dialogue.suggestedSetup")}</strong>
                <p>{rationale}</p>
              </div>{/if}
            <div class={styles.fields}>
              <label>
                {t("dialogue.field.trial_type")}
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
                {t("dialogue.field.jurisdiction")}
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
                {t("dialogue.field.stage")}
                <select
                  value={conditions.stage}
                  onchange={(e) =>
                    (conditions = {
                      ...conditions,
                      stage: e.currentTarget.value,
                    })}
                >
                  {#each stages as stage (stage)}<option value={stage}
                      >{stageLabel(stage)}</option
                    >{/each}
                </select>
              </label>
              <label>
                {t("dialogue.field.user_role")}
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
                      {roleLabel(role)}
                    </option>{/each}
                </select>
              </label>
              <label>
                {t("dialogue.field.difficulty")}
                <select
                  value={conditions.difficulty}
                  onchange={(e) =>
                    (conditions = {
                      ...conditions,
                      difficulty: e.currentTarget.value,
                    })}
                >
                  {#each difficulties as v (v)}<option value={v}
                      >{difficultyLabel(v)}</option
                    >{/each}
                </select>
              </label>
              <label>
                {t("dialogue.field.language")}
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
              {t("dialogue.field.goals")}
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
              {t("dialogue.field.assumptions")}
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
                {t("dialogue.mode")}
                <select
                  value={mode}
                  onchange={(e) => (mode = e.currentTarget.value)}
                >
                  <option value="ai" disabled={!caps?.analysis.configured}>
                    {t("dialogue.aiRoleplay")}
                  </option>
                  <option value="guided">
                    {t("dialogue.guidedOption")}
                  </option>
                </select>
              </label>
              <button class={ui.primary} disabled={!!busy}>
                <Gavel size={16}></Gavel>
                {t("dialogue.start")}
              </button>
            </div>
            {#if !caps?.analysis.configured}<p class={styles.hint}>
                {t("dialogue.aiUnavailable")}
              </p>{/if}
          </form>{:else}
          <div class={styles.sessionHeader}>
            <div>
              <h3>
                {active?.title ?? t("dialogue.assistantEmptyTitle")}
              </h3>
              <p>
                {practice
                  ? t("dialogue.practiceMeta", {
                      role: roleLabel(active!.conditions.user_role),
                      stage: stageLabel(active!.conditions.stage),
                      mode:
                        active!.mode === "guided"
                          ? t("dialogue.scriptedDrill")
                          : t("dialogue.aiRoleplay"),
                    })
                  : t("dialogue.assistantMeta")}
              </p>
            </div>
            {#if practice && active?.status !== "complete"}<button
                class={ui.secondary}
                disabled={!!busy || !messages.some((m) => m.role === "user")}
                onclick={() => send(true)}
              >
                <Check size={16}></Check>
                {t("dialogue.finish")}
              </button>{/if}
          </div>
          {#if practice}<details class={styles.conditions}>
              <summary>
                {t("dialogue.conditions")}
                <ChevronDown size={15}></ChevronDown>
              </summary>
              <dl>
                {#each conditionKeys as key (key)}<div>
                    <dt>{t(`dialogue.field.${key}`)}</dt>
                    <dd>{conditionValue(key, active!.conditions[key])}</dd>
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
                {t("dialogue.editSetup")}
              </button>
            </details>{/if}
          <div
            bind:this={log.current}
            class={styles.messages}
            role="log"
            aria-label={practice
              ? t("dialogue.logPractice")
              : t("dialogue.logAssistant")}
            aria-live="polite"
            aria-relevant="additions"
          >
            {#if !messages.length && !responding}<div class={styles.welcome}>
                <MessageSquare size={32}></MessageSquare>
                <h3>{t("dialogue.welcomeTitle")}</h3>
                <p>{t("dialogue.welcomeText")}</p>
                <div>
                  {#each [t("dialogue.suggestion1"), t("dialogue.suggestion2"), t("dialogue.suggestion3")] as question (question)}<button
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
                      ? t("dialogue.youRole", {
                          role: roleLabel(message.speaker),
                        })
                      : t("dialogue.you")
                    : roleLabel(message.speaker)}
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
                              ? t("common.pageSuffix", {
                                  page: citation.source.page,
                                })
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
                            {t("dialogue.openOriginal")}
                            <ExternalLink size={13}></ExternalLink>
                          </a>{/if}
                        {#if citation.source.hearing_id}<button
                            class={ui.textButton}
                            disabled={!!busy}
                            onclick={() =>
                              openHearing(citation.source.hearing_id!)}
                          >
                            {t("common.openHearing")}
                            <ArrowRight size={13}></ArrowRight>
                          </button>{/if}
                      </details>{/each}
                  </div>{/if}
                {#if !!message.legal.length}<div class={styles.legal}>
                    <strong>
                      <BookOpen size={15}></BookOpen>
                      {t("dialogue.legalDiscovery")}
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
            {#if responding}<div class={styles.replyLoading}>
                <p>{busy ? t(busy) : ""}</p>
                <Skeleton variant="compact" label={busy ? t(busy) : undefined} />
              </div>{/if}
          </div>
          {#if active?.status === "complete"}<div class={styles.complete}>
              <Check size={18}></Check>
              <p>{t("dialogue.complete")}</p>
              <button class={ui.secondary} onclick={newSession}>
                {t("dialogue.again")}
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
                      {t("dialogue.reference")}
                      {selectedRefs.length ? ` (${selectedRefs.length})` : ""}
                      <ChevronDown size={14}></ChevronDown>
                    </summary>
                    <p>{t("dialogue.referenceHelp")}</p>
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
                        {t("dialogue.selectedPassage")}
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
                              ? t("common.hearingTranscript")
                              : t("dialogue.caseDocument")}
                          </small>
                        </span>
                      </label>{/each}
                    {#if !references.length && !initialReference}<p>
                        {t("dialogue.noReferences")}
                      </p>{/if}
                  </details>{/if}
                {#if !practice}<details class={styles.referencePicker}>
                    <summary>
                      <BookOpen size={15}></BookOpen>
                      {t("dialogue.legalLookup")}
                      <ChevronDown size={14}></ChevronDown>
                    </summary>
                    <label>
                      {t("dialogue.legalTerms")}
                      <input
                        value={law}
                        maxlength={300}
                        disabled={!caps?.legal.configured}
                        oninput={(e) => (law = e.currentTarget.value)}
                        placeholder={t("dialogue.legalPlaceholder")}
                      />
                    </label>
                    <p>
                      {caps?.legal.configured
                        ? t("dialogue.legalHelp")
                        : t("dialogue.legalUnavailable")}
                    </p>
                  </details>{/if}
                <label for="case-message">
                  {practice
                    ? t("dialogue.yourTurn", {
                        role: roleLabel(active!.conditions.user_role),
                      })
                    : t("dialogue.askLabel")}
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
                    ? t("dialogue.practicePlaceholder")
                    : t("dialogue.assistantPlaceholder")}
                  onkeydown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      if (!busy) void send();
                    }
                  }}></textarea>
                <div class={styles.composerFooter}>
                  <span>
                    {practice
                      ? t("dialogue.footerPractice")
                      : caps?.analysis.configured
                        ? t("dialogue.footerAi")
                        : t("dialogue.footerNoAi")}
                  </span>
                  <button class={ui.primary} disabled={!!busy || !text.trim()}>
                    <Send size={15}></Send>
                    {practice ? t("dialogue.takeTurn") : t("dialogue.send")}
                  </button>
                </div>
              </form>{/if}{/if}
        {/if}{/if}
    </section>
  </div>
</div>
