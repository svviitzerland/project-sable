<script lang="ts">
  import { localizeFixedText, localizeNotice } from "../lib/notice";
  import { i18n, t, type MessageKey } from "../lib/i18n/index.svelte";
  import Markdown from "./Markdown.svelte";
  import {
    ArrowRight,
    ArrowUp,
    AudioLines,
    ExternalLink,
    History,
    Plus,
    Sparkles,
    X,
  } from "@lucide/svelte";
  import { api, type Capabilities } from "../lib/workspace-api";
  import styles from "./assistant-dock.module.css";
  import { untrack } from "svelte";

  /** A request from elsewhere in the workspace: ask about this material, optionally at once. */
  export type DockSeed = {
    text?: string;
    references: string[];
    label?: string;
    send?: boolean;
    nonce: number;
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
  };

  type Dialogue = {
    id: string;
    title: string;
    kind: string;
    created_at: string;
    messages?: Message[];
  };

  let {
    caseId,
    caps,
    open,
    onOpen,
    onClose,
    hearing = null,
    seed = null,
    openHearing,
  }: {
    caseId: string;
    caps: Capabilities | null;
    open: boolean;
    onOpen: () => void;
    onClose: () => void;
    /** The hearing on screen; the assistant follows it while it is open. */
    hearing?: { id: string; title: string; live: boolean } | null;
    seed?: DockSeed | null;
    openHearing: (id: string) => void;
  } = $props();

  let sessions = $state<Dialogue[]>([]);
  let active = $state<Dialogue | null>(null);
  let text = $state("");
  let pendingText = $state("");
  let busy = $state<MessageKey | "">("");
  let error = $state("");
  let historyOpen = $state(false);
  let loaded = $state(false);
  /** Extra material attached from a finding or passage. */
  let attached = $state<{ references: string[]; label: string } | null>(null);
  /** Whether the hearing on screen is included as context. */
  let followHearing = $state(true);
  let openCitation = $state<Record<string, number>>({});

  const log = { current: null as HTMLDivElement | null };
  const composer = { current: null as HTMLTextAreaElement | null };
  const request = {
    current: null as { fingerprint: string; id: string } | null,
  };

  let aiReady = $derived(!!caps?.analysis.configured);
  let messages = $derived(active?.messages ?? []);

  let suggestions = $derived<MessageKey[]>(
    hearing && followHearing
      ? hearing.live
        ? [
            "dock.ask.liveConflicts",
            "dock.ask.liveSummary",
            "dock.ask.liveQuestions",
          ]
        : [
            "dock.ask.hearingConflicts",
            "dock.ask.hearingSummary",
            "dock.ask.hearingQuestions",
          ]
      : [
          "dock.ask.caseSummary",
          "dock.ask.caseConflicts",
          "dock.ask.caseQuestions",
        ],
  );

  // Load conversations the first time the panel opens for this case.
  $effect(() => {
    void [caseId, open];
    return untrack(() => {
      if (!open || loaded) return;
      let alive = true;
      api<Dialogue[]>(`/cases/${caseId}/dialogues?kind=assistant`)
        .then(async (list) => {
          const latest = list[0]
            ? await api<Dialogue>(`/cases/${caseId}/dialogues/${list[0].id}`)
            : null;
          if (alive) {
            sessions = list;
            // A question sent while this loaded already has its conversation.
            if (!active && !busy) active = latest;
            loaded = true;
          }
        })
        .catch((e) => {
          if (alive) error = e.message;
        });
      return () => {
        alive = false;
      };
    });
  });

  // A seed from a finding, passage or quick action.
  $effect(() => {
    void [seed?.nonce];
    return untrack(() => {
      if (!seed) return;
      attached = seed.references.length
        ? { references: seed.references, label: seed.label ?? "" }
        : null;
      if (seed.text) text = seed.text;
      if (seed.send && seed.text) void send();
      else requestAnimationFrame(() => composer.current?.focus());
    });
  });

  $effect(() => {
    void [open, active?.id, messages.length, busy, pendingText];
    return untrack(() => {
      requestAnimationFrame(() => {
        if (log.current) log.current.scrollTop = log.current.scrollHeight;
      });
    });
  });

  $effect(() => {
    void [open];
    return untrack(() => {
      if (open) requestAnimationFrame(() => composer.current?.focus());
    });
  });

  function references() {
    return [
      ...(hearing && followHearing ? [`hearing:${hearing.id}`] : []),
      ...(attached?.references ?? []),
    ].filter((value, index, list) => list.indexOf(value) === index);
  }

  async function send() {
    const message = text.trim();
    if (busy || !message) return;
    busy = "dock.thinking";
    error = "";
    pendingText = message;
    text = "";
    try {
      const session =
        active ??
        (await api<Dialogue>(`/cases/${caseId}/dialogues`, {
          method: "POST",
          body: JSON.stringify({ kind: "assistant" }),
        }));
      active = session;
      const data = {
        text: message,
        reference_ids: references(),
        legal_query: "",
        finish: false,
      };
      const fingerprint = JSON.stringify({ session: session.id, ...data });
      if (request.current?.fingerprint !== fingerprint)
        request.current = { fingerprint, id: crypto.randomUUID() };
      active = await api<Dialogue>(
        `/cases/${caseId}/dialogues/${session.id}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ ...data, request_id: request.current.id }),
        },
      );
      request.current = null;
      attached = null;
      sessions = await api<Dialogue[]>(
        `/cases/${caseId}/dialogues?kind=assistant`,
      );
    } catch (e) {
      text = message;
      error = (e as Error).message;
    } finally {
      pendingText = "";
      busy = "";
      requestAnimationFrame(() => composer.current?.focus());
    }
  }

  function fresh() {
    active = null;
    text = "";
    error = "";
    attached = null;
    historyOpen = false;
    openCitation = {};
    request.current = null;
    requestAnimationFrame(() => composer.current?.focus());
  }

  async function openSession(id: string) {
    historyOpen = false;
    busy = "dock.opening";
    try {
      active = await api<Dialogue>(`/cases/${caseId}/dialogues/${id}`);
      openCitation = {};
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = "";
    }
  }

  function sessionTitle(session: Dialogue) {
    return session.title === "Case conversation"
      ? t("dialogue.caseConversation")
      : session.title;
  }
</script>

{#if !open}
  <button
    class={styles.bubble}
    data-compact={hearing ? true : undefined}
    title={t("dock.bubble")}
    data-tour="assistant"
    aria-label={t("dock.open")}
    onclick={onOpen}
  >
    <Sparkles size={20}></Sparkles>
    {#if !hearing}<span>{t("dock.bubble")}</span>{/if}
    {#if hearing?.live}<i class={styles.liveDot} aria-hidden="true"></i>{/if}
  </button>
{:else}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions (Escape closes the panel.) -->
  <section
    class={styles.panel}
    aria-label={t("dock.title")}
    id="assistant-dock"
    onkeydown={(e) => {
      if (e.key === "Escape") onClose();
    }}
  >
    <header class={styles.head}>
      <span class={styles.mark} aria-hidden="true"
        ><Sparkles size={16}></Sparkles></span
      >
      <div class={styles.headText}>
        <h2>{t("dock.title")}</h2>
        <small>
          {hearing && followHearing
            ? t("dock.following", { title: hearing.title })
            : t("dock.wholeCase")}
        </small>
      </div>
      <button
        class={styles.icon}
        aria-label={t("dock.history")}
        title={t("dock.history")}
        aria-expanded={historyOpen}
        onclick={() => (historyOpen = !historyOpen)}
      >
        <History size={17}></History>
      </button>
      <button
        class={styles.icon}
        aria-label={t("dock.new")}
        title={t("dock.new")}
        onclick={fresh}
      >
        <Plus size={17}></Plus>
      </button>
      <button
        class={styles.icon}
        aria-label={t("common.close")}
        title={t("common.close")}
        onclick={onClose}
      >
        <X size={18}></X>
      </button>
    </header>

    {#if historyOpen}
      <div class={styles.history}>
        {#if sessions.length}
          <ul>
            {#each sessions as session (session.id)}<li>
                <button
                  aria-current={session.id === active?.id ? "true" : undefined}
                  onclick={() => openSession(session.id)}
                  >{sessionTitle(session)}</button
                >
              </li>{/each}
          </ul>
        {:else}<p class={styles.quiet}>{t("dock.noHistory")}</p>{/if}
      </div>
    {/if}

    <div class={styles.log} bind:this={log.current} aria-live="polite">
      {#if !loaded && !active && !pendingText}
        <div class={styles.thinking} role="status">
          <span></span><span></span><span></span>
          {t("dock.opening")}
        </div>
      {:else if !messages.length && !pendingText}
        <div class={styles.welcome}>
          <h3>
            {hearing && followHearing
              ? t("dock.welcomeHearing")
              : t("dock.welcome")}
          </h3>
          <p>{aiReady ? t("dock.welcomeText") : t("dock.aiOff")}</p>
          <div class={styles.suggestions}>
            {#each suggestions as key (key)}<button
                disabled={!!busy}
                onclick={() => {
                  text = t(key);
                  void send();
                }}
              >
                {t(key)}
                <ArrowRight size={14}></ArrowRight>
              </button>{/each}
          </div>
        </div>
      {/if}
      {#each messages as message (message.id)}
        {#if message.role === "user"}
          <div class={styles.user}><p>{message.text}</p></div>
        {:else}
          <article class={styles.reply}>
            <Markdown
              text={message.speaker === "Case assistant"
                ? localizeFixedText(message.text, i18n.lang)
                : message.text}
            />
            {#if message.citations.length}
              <div class={styles.cites}>
                {#each message.citations as citation, index (index)}<button
                    aria-expanded={openCitation[message.id] === index}
                    onclick={() =>
                      (openCitation = {
                        ...openCitation,
                        [message.id]:
                          openCitation[message.id] === index ? -1 : index,
                      })}
                  >
                    <b>{index + 1}</b>
                    <span
                      >{citation.source.title}{citation.source.page
                        ? t("common.pageSuffix", {
                            page: citation.source.page,
                          })
                        : ""}</span
                    >
                  </button>{/each}
              </div>
              {#each message.citations as citation, index (index)}{#if openCitation[message.id] === index}
                  <div class={styles.cite}>
                    <q>{citation.quote}</q>
                    <div class={styles.citeLinks}>
                      {#if citation.source.document_id}<a
                          href={`/api/v1/cases/${caseId}/documents/${citation.source.document_id}/original`}
                          target="_blank"
                          rel="external noreferrer"
                        >
                          {t("dialogue.openOriginal")}
                          <ExternalLink size={12}></ExternalLink>
                        </a>{/if}
                      {#if citation.source.hearing_id}<button
                          onclick={() =>
                            openHearing(citation.source.hearing_id!)}
                        >
                          {t("common.openHearing")}
                          <ArrowRight size={12}></ArrowRight>
                        </button>{/if}
                    </div>
                  </div>
                {/if}{/each}
            {/if}
            {#if message.notice}<p class={styles.notice}>
                {localizeNotice(message.notice, i18n.lang)}
              </p>{/if}
          </article>
        {/if}
      {/each}
      {#if pendingText}<div class={styles.user}><p>{pendingText}</p></div>{/if}
      {#if busy}<div class={styles.thinking} role="status">
          <span></span><span></span><span></span>
          {t(busy)}
        </div>{/if}
    </div>

    {#if error}<p class={styles.error} role="alert">{error}</p>{/if}

    <form
      class={styles.composer}
      onsubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      {#if hearing || attached}
        <div class={styles.context}>
          {#if hearing}<button
              type="button"
              class={styles.chip}
              aria-pressed={followHearing}
              onclick={() => (followHearing = !followHearing)}
              title={t("dock.toggleHearing")}
            >
              <AudioLines size={13}></AudioLines>
              <span>{hearing.title}</span>
              {#if followHearing}<X size={12}></X>{:else}<Plus size={12}
                ></Plus>{/if}
            </button>{/if}
          {#if attached}<button
              type="button"
              class={styles.chip}
              aria-pressed="true"
              onclick={() => (attached = null)}
              title={t("dock.removeAttached")}
            >
              <span>{attached.label || t("dock.attached")}</span>
              <X size={12}></X>
            </button>{/if}
        </div>
      {/if}
      <div class={styles.box}>
        <label class={styles.srOnly} for="dock-message">{t("dock.label")}</label
        >
        <textarea
          id="dock-message"
          bind:this={composer.current}
          bind:value={text}
          rows={1}
          maxlength={4000}
          placeholder={hearing && followHearing
            ? t("dock.placeholderHearing")
            : t("dock.placeholder")}
          onkeydown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
              e.preventDefault();
              void send();
            }
          }}></textarea>
        <button
          class={styles.send}
          aria-label={t("dock.send")}
          disabled={!!busy || !text.trim()}
        >
          <ArrowUp size={17}></ArrowUp>
        </button>
      </div>
      <p class={styles.hint}>{t("dock.hint")}</p>
    </form>
  </section>
{/if}
