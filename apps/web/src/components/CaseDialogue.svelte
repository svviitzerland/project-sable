<script lang="ts">
  import { formatDate, t, type MessageKey } from "../lib/i18n/index.svelte";
  import Skeleton from "./Skeleton.svelte";
  import {
    ArrowRight,
    ArrowUp,
    BookOpen,
    Check,
    ChevronDown,
    Download,
    ExternalLink,
    FileText,
    Gavel,
    History,
    Lightbulb,
    Plus,
    Scale,
    Shield,
    Sparkles,
    X,
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

  const practiceRoles = [
    { key: "defense", icon: Shield },
    { key: "opposing", icon: Scale },
    { key: "judge", icon: Gavel },
  ] as const;

  const stages = [
    "Opening statements",
    "Witness examination",
    "Cross-examination",
    "Closing arguments",
    "Procedural hearing",
  ] as const;

  const difficulties = ["Supportive", "Standard", "Challenging"] as const;

  /** Fixed server speaker names that are shown in the interface language. */
  const speakerKeys: Record<string, MessageKey> = {
    "Case assistant": "dialogue.speaker.assistant",
    "Practice facilitator": "dialogue.speaker.facilitator",
    "Practice coach": "dialogue.speaker.coach",
  };

  function roleLabel(role: string) {
    if ((roleKeys as readonly string[]).includes(role))
      return t(`role.${role as (typeof roleKeys)[number]}`);
    return speakerKeys[role] ? t(speakerKeys[role]) : role;
  }

  /** AI characters are saved as "role" or "witness:Name" (a name taken from the case material). */
  function speakerLabel(speaker: string) {
    const split = speaker.indexOf(":");
    if (split < 0) return roleLabel(speaker);
    const role = speaker.slice(0, split),
      name = speaker.slice(split + 1).trim();
    return name ? `${roleLabel(role)} · ${name}` : roleLabel(role);
  }

  function speakerRole(speaker: string) {
    return speaker.split(":")[0];
  }

  const coachKinds = [
    "leading",
    "compound",
    "contradiction",
    "procedure",
    "clarity",
    "strength",
  ] as const;

  function coachLabel(kind: string) {
    return (coachKinds as readonly string[]).includes(kind)
      ? t(`dialogue.coach.${kind as (typeof coachKinds)[number]}`)
      : t("dialogue.coachNote");
  }

  const debriefSections = ["strength", "tighten", "revisit"] as const;

  /** The opening scene note, rendered from the saved conditions in the interface language. */
  function sceneText() {
    const role = active?.conditions.user_role ?? "defense";
    const cast = (practiceRoles.map((r) => r.key) as string[]).includes(role)
      ? (role as (typeof practiceRoles)[number]["key"])
      : "defense";
    return t("dialogue.scene", {
      stage: stageLabel(active?.conditions.stage ?? ""),
      role: roleLabel(role),
      cast: t(`dialogue.cast.${cast}`),
    });
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

  /** Practice is AI roleplay only; without a provider it shows an unavailable state. */
  let aiReady = $derived(!!caps?.analysis.configured);

  /** Short coaching notes after each turn; a per-viewer preference. */
  let coaching = $state(
    untrack(() => {
      try {
        return localStorage.getItem("jude.practice.coaching") !== "0";
      } catch {
        return true;
      }
    }),
  );

  function setCoaching(on: boolean) {
    coaching = on;
    try {
      localStorage.setItem("jude.practice.coaching", on ? "1" : "0");
    } catch {
      // Storage can be unavailable; the toggle still applies to this view.
    }
  }

  let rationale = $state("");

  let busy = $state<MessageKey | "">("");
  let responding = $derived(
    busy === "dialogue.busy.reading" ||
      busy === "dialogue.busy.responding" ||
      busy === "dialogue.busy.debrief",
  );

  let loading = $state(true);
  let historyOpen = $state(false);
  let sourcesOpen = $state(false);
  let editOpen = $state(false);
  /** Open citation per message id, so each answer expands one source at a time. */
  let openCitation = $state<Record<string, number>>({});

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

  function newSession(focusId?: string) {
    active = null;
    text = "";
    law = "";
    error = "";
    rationale = "";
    historyOpen = false;
    openCitation = {};
    request.current = null;
    requestAnimationFrame(() => {
      (
        document.getElementById(
          focusId ?? (practice ? "practice-role-defense" : "case-message"),
        ) as HTMLElement | null
      )?.focus();
    });
  }

  async function create() {
    const session = await api<Dialogue>(`/cases/${caseId}/dialogues`, {
      method: "POST",
      body: JSON.stringify({
        kind,
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
        const message = finish ? t("dialogue.finishMessage") : text.trim();
        const data = {
          text: message,
          reference_ids: selectedRefs,
          legal_query: law.trim(),
          finish,
          ...(practice ? { coaching } : {}),
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
        sourcesOpen = false;
        request.current = null;
        await refreshList();
        requestAnimationFrame(() => composer.current?.focus());
      },
    );
  }

  function openSession(session: Dialogue) {
    return run("dialogue.busy.opening", async () => {
      const result = await api<Dialogue>(
        `/cases/${caseId}/dialogues/${session.id}`,
      );
      active = result;
      historyOpen = false;
      openCitation = {};
      text = "";
      error = "";
      request.current = null;
    });
  }

  function toggleRef(id: string, on: boolean) {
    selectedRefs = on
      ? [...selectedRefs, id]
      : selectedRefs.filter((value) => value !== id);
  }

  function refLabel(id: string) {
    if (id === initialReference && !references.some((r) => r.id === id))
      return t("dialogue.selectedPassage");
    return references.find((r) => r.id === id)?.label ?? id;
  }

  function setCondition<K extends keyof Conditions>(key: K, value: string) {
    conditions = { ...conditions, [key]: value };
  }

  /** Practice titles are generated as "stage · role" enums; show them translated. */
  function sessionTitle(session: Dialogue) {
    const { stage, user_role } = session.conditions ?? {};
    return session.kind === "practice" && session.title === `${stage} · ${user_role}`
      ? `${stageLabel(stage)} · ${roleLabel(user_role)}`
      : session.title;
  }

  let messages = $derived(active?.messages ?? []);

  /** Legacy scripted-drill sessions stay readable but cannot continue. */
  let legacy = $derived(practice && active?.mode === "guided");

  let canCompose = $derived(
    !practice || (!!active && aiReady && !legacy),
  );

  type Block =
    | { type: "message"; message: Message }
    | { type: "debrief"; items: Message[] };

  /** Consecutive debrief items render as one debrief section. */
  let blocks = $derived(
    messages.reduce<Block[]>((list, message) => {
      const last = list.at(-1);
      if (message.role === "debrief") {
        if (last?.type === "debrief") last.items.push(message);
        else list.push({ type: "debrief", items: [message] });
      } else list.push({ type: "message", message });
      return list;
    }, []),
  );

  let conditionSummary = $derived(
    [
      conditions.trial_type,
      stageLabel(conditions.stage),
      difficultyLabel(conditions.difficulty),
      conditions.language,
    ]
      .filter(Boolean)
      .join(" · "),
  );
</script>

{#snippet citations(message: Message)}
{#if !!message.citations.length}<div class={styles.citations}>
                  <div
                    class={styles.citationChips}
                    role="group"
                    aria-label={t("dialogue.cited")}
                  >
                    {#each message.citations as citation, index (index)}<button
                        type="button"
                        class={styles.citationChip}
                        aria-expanded={openCitation[message.id] === index}
                        aria-controls={`cite-${message.id}-${index}`}
                        onclick={() =>
                          (openCitation = {
                            ...openCitation,
                            [message.id]:
                              openCitation[message.id] === index ? -1 : index,
                          })}
                      >
                        <span class={styles.citationNumber}>{index + 1}</span>
                        <span class={styles.citationTitle}
                          >{citation.source.title}{citation.source.page
                            ? t("common.pageSuffix", {
                                page: citation.source.page,
                              })
                            : ""}</span
                        >
                      </button>{/each}
                  </div>
                  {#each message.citations as citation, index (index)}<div
                      id={`cite-${message.id}-${index}`}
                      class={styles.citationPanel}
                      hidden={openCitation[message.id] !== index}
                    >
                      <blockquote>“{citation.quote}”</blockquote>
                      <p class={styles.sourceText}>{citation.source.text}</p>
                      <div class={styles.citationLinks}>
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
                      </div>
                    </div>{/each}
                </div>{/if}
{/snippet}

<div class={styles.screen}>
  <header class={styles.heading}>
    <h2>
      {practice ? t("dialogue.practiceTitle") : t("dialogue.assistantTitle")}
    </h2>
    <p>
      {practice ? t("dialogue.practiceLead") : t("dialogue.assistantLead")}
    </p>
    <div class={styles.headingActions}>
      <button
        class={styles.historyToggle}
        aria-expanded={historyOpen}
        aria-controls="dialogue-history"
        disabled={loading}
        onclick={() => (historyOpen = !historyOpen)}
      >
        <History size={16} aria-hidden="true"></History>
        <span>{t("dialogue.history")}</span>
        <span class={styles.count}>{sessions.length}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      <button
        class={ui.secondary}
        disabled={!!busy || loading}
        onclick={() => newSession()}
      >
        <Plus size={16}></Plus>
        {practice ? t("dialogue.newRehearsal") : t("dialogue.newConversation")}
      </button>
    </div>
  </header>

  <aside
    id="dialogue-history"
    class={styles.history}
    hidden={!historyOpen}
    aria-label={practice
      ? t("dialogue.savedRehearsals")
      : t("dialogue.savedConversations")}
  >
    {#if loading}<Skeleton
        variant="rows"
        label={t("dialogue.loadingSaved")}
      />{:else if sessions.length}<ul>
        {#each sessions as session (session.id)}<li>
            <button
              disabled={!!busy}
              aria-pressed={active?.id === session.id}
              onclick={() => openSession(session)}
            >
              <span>{sessionTitle(session)}</span>
              <small>
                {formatDate(session.created_at)} ·&#32;
                {session.status === "complete"
                  ? t("dialogue.completed")
                  : session.kind === "practice"
                    ? t("dialogue.aiRehearsal")
                    : t("dialogue.caseConversation")}
              </small>
            </button>
          </li>{/each}
      </ul>{:else}<p class={styles.quiet}>
        {practice ? t("dialogue.emptyPractice") : t("dialogue.emptyAssistant")}
      </p>{/if}
    <p class={styles.boundary}>
      {practice
        ? t("dialogue.boundaryPractice")
        : t("dialogue.boundaryAssistant")}
    </p>
  </aside>

  {#if error}<p role="alert" class={ui.error}>
      {error}
    </p>{/if}

  <section
    class={`${styles.main} ${practice && !active && !loading ? styles.plain : ""}`}
    aria-label={practice
      ? t("dialogue.mainPractice")
      : t("dialogue.mainAssistant")}
  >
    {#if loading || busy === "dialogue.busy.opening" || busy === "dialogue.busy.starting"}<div
        class={styles.pad}
      >
        <Skeleton
          variant={practice && !active ? "form" : "conversation"}
          label={loading || !busy
            ? t("dialogue.openingConversations")
            : t(busy)}
        />
      </div>{:else if practice && !active && caps && !aiReady}<div
        class={styles.unavailable}
        role="status"
      >
        <span class={styles.unavailableIcon} aria-hidden="true"
          ><Gavel size={20}></Gavel></span
        >
        <h3>{t("dialogue.unavailableTitle")}</h3>
        <p>{t("dialogue.unavailableText")}</p>
        {#if sessions.length}<p class={styles.quiet}>
            {t("dialogue.unavailableHistory")}
          </p>{/if}
      </div>{:else if practice && !active}<form
        class={styles.setup}
        onsubmit={(e) => {
          e.preventDefault();
          void run("dialogue.busy.starting", async () => {
            await create();
          });
        }}
      >
        <fieldset class={styles.step}>
          <legend>
            <span class={styles.stepNumber} aria-hidden="true">1</span>
            {t("dialogue.step.role")}
          </legend>
          <div class={styles.roles}>
            {#each practiceRoles as role (role.key)}<label class={styles.role}>
                <input
                  type="radio"
                  name="practice-role"
                  id={`practice-role-${role.key}`}
                  value={role.key}
                  checked={conditions.user_role === role.key}
                  aria-labelledby={`practice-role-${role.key}-name`}
                  aria-describedby={`practice-role-${role.key}-hint`}
                  onchange={() => setCondition("user_role", role.key)}
                />
                <role.icon size={22} aria-hidden="true"></role.icon>
                <span
                  class={styles.roleName}
                  id={`practice-role-${role.key}-name`}
                  >{roleLabel(role.key)}</span
                >
                <span
                  class={styles.roleHint}
                  id={`practice-role-${role.key}-hint`}
                  >{t(`dialogue.roleHint.${role.key}`)}</span
                >
              </label>{/each}
          </div>
        </fieldset>

        <section class={styles.step} aria-labelledby="practice-conditions">
          <h3 class={styles.stepTitle} id="practice-conditions">
            <span class={styles.stepNumber} aria-hidden="true">2</span>
            {t("dialogue.step.conditions")}
          </h3>
          <div class={styles.summary}>
            <div>
              <p class={styles.summaryLine}>{conditionSummary}</p>
              <p class={styles.quiet}>{conditions.jurisdiction}</p>
            </div>
            <button
              type="button"
              class={ui.secondary}
              aria-expanded={editOpen}
              aria-controls="practice-fields"
              onclick={() => (editOpen = !editOpen)}
            >
              {t("dialogue.editConditions")}
              <ChevronDown
                size={15}
                aria-hidden="true"
                class={styles.chevron}
              />
            </button>
          </div>
          {#if rationale && !editOpen}<p class={styles.proposal} role="status">
              <Sparkles size={15} aria-hidden="true"></Sparkles>
              <span
                ><strong>{t("dialogue.suggestedSetup")}</strong>
                {rationale}</span
              >
            </p>{/if}
          <div id="practice-fields" class={styles.edit} hidden={!editOpen}>
            <div class={styles.suggestRow}>
              <p class={styles.quiet}>{t("dialogue.setText")}</p>
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
              />{:else if rationale}<p class={styles.proposal} role="status">
                <Sparkles size={15} aria-hidden="true"></Sparkles>
                <span
                  ><strong>{t("dialogue.suggestedSetup")}</strong>
                  {rationale}</span
                >
              </p>{/if}
            <div class={styles.fields}>
              <label class={styles.half}>
                {t("dialogue.field.trial_type")}
                <input
                  id="trial-type"
                  value={conditions.trial_type}
                  maxlength={160}
                  required
                  oninput={(e) =>
                    setCondition("trial_type", e.currentTarget.value)}
                />
              </label>
              <label class={styles.half}>
                {t("dialogue.field.jurisdiction")}
                <input
                  value={conditions.jurisdiction}
                  maxlength={200}
                  required
                  oninput={(e) =>
                    setCondition("jurisdiction", e.currentTarget.value)}
                />
              </label>
              <label>
                {t("dialogue.field.stage")}
                <select
                  value={conditions.stage}
                  onchange={(e) => setCondition("stage", e.currentTarget.value)}
                >
                  {#each stages as stage (stage)}<option value={stage}
                      >{stageLabel(stage)}</option
                    >{/each}
                </select>
              </label>
              <label>
                {t("dialogue.field.difficulty")}
                <select
                  value={conditions.difficulty}
                  onchange={(e) =>
                    setCondition("difficulty", e.currentTarget.value)}
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
                    setCondition("language", e.currentTarget.value)}
                />
              </label>
              <label class={styles.wide}>
                {t("dialogue.field.goals")}
                <textarea
                  value={conditions.goals}
                  maxlength={1500}
                  rows={2}
                  oninput={(e) => setCondition("goals", e.currentTarget.value)}
                ></textarea>
              </label>
              <label class={styles.wide}>
                {t("dialogue.field.assumptions")}
                <textarea
                  value={conditions.assumptions}
                  maxlength={2500}
                  rows={3}
                  oninput={(e) =>
                    setCondition("assumptions", e.currentTarget.value)}
                ></textarea>
              </label>
            </div>
          </div>
        </section>

        <div class={styles.startRow}>
          <p class={styles.quiet}>{t("dialogue.summaryNote")}</p>
          <button
            class={`${ui.primary} ${styles.start}`}
            disabled={!!busy || !aiReady}
          >
            <Gavel size={16}></Gavel>
            {t("dialogue.start")}
          </button>
        </div>
      </form>{:else}
      {#if active}<div class={styles.sessionHeader}>
          <div>
            <h3>{sessionTitle(active)}</h3>
            <p>
              {practice
                ? t("dialogue.practiceMeta", {
                    role: roleLabel(active.conditions.user_role),
                    stage: stageLabel(active.conditions.stage),
                    difficulty: difficultyLabel(active.conditions.difficulty),
                  })
                : t("dialogue.assistantMeta")}
            </p>
          </div>
          <div class={styles.sessionActions}>
            <a
              class={styles.iconLink}
              rel="external"
              href={`/api/v1/cases/${caseId}/dialogues/${active.id}/export`}
              download
            >
              <Download size={14} aria-hidden="true"></Download>
              {practice
                ? t("dialogue.exportRehearsal")
                : t("dialogue.exportConversation")}
            </a>
            {#if practice && active.status !== "complete" && canCompose}<button
                class={ui.primary}
                disabled={!!busy || !messages.some((m) => m.role === "user")}
                onclick={() => send(true)}
              >
                <Check size={16}></Check>
                {t("dialogue.finishDebrief")}
              </button>{/if}
          </div>
        </div>{/if}
      {#if practice && active}<details class={styles.conditions}>
          <summary>
            <span>{t("dialogue.conditions")}</span>
            <ChevronDown size={15} aria-hidden="true"></ChevronDown>
          </summary>
          <dl>
            {#each conditionKeys as key (key)}<div>
                <dt>{t(`dialogue.field.${key}`)}</dt>
                <dd>{conditionValue(key, active.conditions[key])}</dd>
              </div>{/each}
          </dl>
          <button
            class={ui.secondary}
            disabled={!!busy}
            onclick={() => {
              conditions = active!.conditions;
              editOpen = true;
              newSession("trial-type");
            }}
          >
            {t("dialogue.editSetup")}
          </button>
        </details>{/if}
      <div
        bind:this={log.current}
        class={`${styles.messages} ${practice ? styles.transcript : ""}`}
        role="log"
        aria-label={practice
          ? t("dialogue.logPractice")
          : t("dialogue.logAssistant")}
        aria-live="polite"
        aria-relevant="additions"
      >
        {#if !messages.length && !responding}{#if practice}<p
              class={styles.quiet}
            >
              {t("dialogue.footerPractice")}
            </p>{:else}<div class={styles.welcome}>
              <h3>{t("dialogue.welcomeTitle")}</h3>
              <p>{t("dialogue.welcomeShort")}</p>
              <div class={styles.chips} aria-label={t("dialogue.tryAsking")}>
                {#each [t("dialogue.suggestion1"), t("dialogue.suggestion2"), t("dialogue.suggestion3")] as question (question)}<button
                    type="button"
                    class={styles.chip}
                    disabled={!!busy}
                    onclick={() => {
                      text = question;
                      void send();
                    }}
                  >
                    {question}
                    <ArrowRight size={14} aria-hidden="true"></ArrowRight>
                  </button>{/each}
              </div>
            </div>{/if}{/if}
        {#each blocks as block, blockIndex (block.type === "message" ? block.message.id : `debrief-${blockIndex}`)}{#if block.type === "debrief"}<section
              class={styles.debrief}
              aria-labelledby={`debrief-${block.items[0].id}`}
            >
              <h4 id={`debrief-${block.items[0].id}`}>
                {t("dialogue.debrief.title")}
              </h4>
              {#each block.items.filter((item) => item.speaker === "summary") as item (item.id)}<p
                  class={styles.debriefSummary}
                >
                  {item.text}
                </p>{/each}
              {#each debriefSections as section (section)}{#if block.items.some((item) => item.speaker === section)}<div
                    class={styles.debriefSection}
                  >
                    <h5>{t(`dialogue.debrief.${section}`)}</h5>
                    <ul>
                      {#each block.items.filter((item) => item.speaker === section) as item (item.id)}<li
                        >
                          <p>{item.text}</p>
                          {@render citations(item)}
                        </li>{/each}
                    </ul>
                  </div>{/if}{/each}
              {#if block.items.at(-1)?.notice}<p class={styles.notice}>
                  {block.items.at(-1)?.notice}
                </p>{/if}
            </section>{:else if block.message.role === "scene"}<p
              class={styles.scene}
            >
              {sceneText()}
            </p>{:else if block.message.role === "coach"}<aside
              class={styles.coach}
              aria-label={t("dialogue.coachNote")}
            >
              <Lightbulb size={14} aria-hidden="true"></Lightbulb>
              <div>
                <p>
                  <strong>{coachLabel(block.message.speaker)}</strong>
                  {block.message.text}
                </p>
                {@render citations(block.message)}
              </div>
            </aside>{:else}{@const message = block.message}<article
              class={`${styles.message} ${message.role === "user" ? styles.userMessage : ""}`}
              data-speaker={practice && message.role !== "user"
                ? speakerRole(message.speaker)
                : undefined}
            >
              <h4>
                {message.role === "user"
                  ? practice
                    ? t("dialogue.youRole", {
                        role: roleLabel(message.speaker),
                      })
                    : t("dialogue.you")
                  : speakerLabel(message.speaker)}
              </h4>
              <div class={styles.body}>
                <p>{message.text}</p>
                {@render citations(message)}
                {#if !!message.legal.length}<div class={styles.legal}>
                    <strong>
                      <BookOpen size={14} aria-hidden="true"></BookOpen>
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
              </div>
            </article>{/if}{/each}
        {#if responding}<div class={styles.replyLoading}>
            <p>{busy ? t(busy) : ""}</p>
            <Skeleton variant="compact" label={busy ? t(busy) : undefined} />
          </div>{/if}
      </div>
      {#if active?.status === "complete"}<div class={styles.complete}>
          <Check size={18}></Check>
          <p>{t("dialogue.complete")}</p>
          <button class={ui.secondary} onclick={() => newSession()}>
            {t("dialogue.again")}
          </button>
        </div>{:else if canCompose}<form
          class={styles.composer}
          onsubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label
            for="case-message"
            class={practice ? styles.turnLabel : ui.srOnly}
          >
            {practice
              ? t("dialogue.yourTurn", {
                  role: roleLabel(active!.conditions.user_role),
                })
              : t("dialogue.askLabel")}
          </label>
          <div class={styles.box}>
            {#if selectedRefs.length}<ul
                class={styles.selected}
              >
                {#each selectedRefs as id (id)}<li>
                    <FileText size={13} aria-hidden="true"></FileText>
                    <span>{refLabel(id)}</span>
                    <button
                      type="button"
                      aria-label={t("dialogue.removeSource", {
                        label: refLabel(id),
                      })}
                      onclick={() => toggleRef(id, false)}
                    >
                      <X size={13} aria-hidden="true"></X>
                    </button>
                  </li>{/each}
              </ul>{/if}
            <textarea
              bind:this={composer.current}
              id="case-message"
              value={text}
              maxlength={5000}
              rows={2}
              required
              disabled={!!busy}
              oninput={(e) => (text = e.currentTarget.value)}
              placeholder={practice
                ? t("dialogue.practicePlaceholder")
                : t("dialogue.composerPlaceholder")}
              onkeydown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.isComposing &&
                  (!e.shiftKey || e.ctrlKey || e.metaKey)
                ) {
                  e.preventDefault();
                  if (!busy) void send();
                }
              }}></textarea>
            <div class={styles.toolbar}>
              <div class={styles.tools}>
                <button
                  type="button"
                  class={styles.sourcesToggle}
                  aria-expanded={sourcesOpen}
                  aria-controls="dialogue-sources"
                  onclick={() => (sourcesOpen = !sourcesOpen)}
                >
                  <Plus size={15} aria-hidden="true"></Plus>
                  {t("dialogue.sources")}{selectedRefs.length
                    ? ` (${selectedRefs.length})`
                    : ""}
                </button>
                {#if practice}<button
                    type="button"
                    class={styles.sourcesToggle}
                    aria-pressed={coaching}
                    title={t("dialogue.coachingHint")}
                    onclick={() => setCoaching(!coaching)}
                  >
                    <Lightbulb size={15} aria-hidden="true"></Lightbulb>
                    {t("dialogue.coaching")}
                  </button>{/if}
              </div>
              <button
                class={`${ui.primary} ${styles.send}`}
                disabled={!!busy || !text.trim()}
              >
                {practice ? t("dialogue.takeTurn") : t("dialogue.send")}
                <ArrowUp size={15} aria-hidden="true"></ArrowUp>
              </button>
            </div>
            <div
                id="dialogue-sources"
                class={styles.sources}
                hidden={!sourcesOpen}
              >
                <fieldset>
                  <legend>
                    <FileText size={14} aria-hidden="true"></FileText>
                    {t("dialogue.reference")}
                  </legend>
                  <p class={styles.quiet}>{t("dialogue.referenceHelp")}</p>
                  <div class={styles.refList}>
                    {#if initialReference && !references.some((r) => r.id === initialReference)}<label
                      >
                        <input
                          type="checkbox"
                          checked={selectedRefs.includes(initialReference)}
                          oninput={(e) =>
                            toggleRef(initialReference, e.currentTarget.checked)}
                        />
                        <span>{t("dialogue.selectedPassage")}</span>
                      </label>{/if}
                    {#each references as reference (reference.id)}<label>
                        <input
                          type="checkbox"
                          checked={selectedRefs.includes(reference.id)}
                          disabled={!selectedRefs.includes(reference.id) &&
                            selectedRefs.length >= 6}
                          oninput={(e) =>
                            toggleRef(reference.id, e.currentTarget.checked)}
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
                    {#if !references.length && !initialReference}<p
                        class={styles.quiet}
                      >
                        {t("dialogue.noReferences")}
                      </p>{/if}
                  </div>
                </fieldset>
                {#if !practice}<div class={styles.legalField}>
                    <label>
                      <span class={styles.legend}>
                        <BookOpen size={14} aria-hidden="true"></BookOpen>
                        {t("dialogue.legalTerms")}
                      </span>
                      <input
                        value={law}
                        maxlength={300}
                        disabled={!caps?.legal.configured}
                        oninput={(e) => (law = e.currentTarget.value)}
                        placeholder={t("dialogue.legalPlaceholder")}
                      />
                    </label>
                    <p class={styles.quiet}>
                      {caps?.legal.configured
                        ? t("dialogue.legalHelp")
                        : t("dialogue.legalUnavailable")}
                    </p>
                  </div>{/if}
              </div>
          </div>
          <p class={styles.footnote}>
            {practice
              ? t("dialogue.footerPractice")
              : caps?.analysis.configured
                ? t("dialogue.footerAi")
                : t("dialogue.footerNoAi")}
            <span aria-hidden="true"> · {t("dialogue.enterHint")}</span>
          </p>
        </form>{:else if practice && active}<div class={styles.complete}>
          <p>
            {legacy ? t("dialogue.legacyReadOnly") : t("dialogue.unavailablePaused")}
          </p>
          <button class={ui.secondary} onclick={() => newSession()}>
            {t("dialogue.newRehearsal")}
          </button>
        </div>{/if}
    {/if}
  </section>
</div>
