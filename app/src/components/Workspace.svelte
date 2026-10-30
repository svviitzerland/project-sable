<script lang="ts">
  import { resolve } from "$app/paths";
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
    MessageSquare,
    Gavel,
    Pause,
    Play,
    Plus,
    Settings,
    ShieldCheck,
    X,
  } from "@lucide/svelte";
  import {
    api,
    ApiError,
    labels,
    type Capabilities,
    type Case,
    type CaseDetail,
    type User,
  } from "../lib/workspace-api";
  import { createHearingAudio } from "../lib/hearing-audio.svelte";
  import styles from "./workspace.module.css";
  import book from "./casebook.module.css";
  import { onMount, untrack } from "svelte";
  import Auth from "./Auth.svelte";
  import NewCase from "./NewCase.svelte";
  import Empty from "./Empty.svelte";
  import StatusLabel from "./StatusLabel.svelte";
  import Transcript from "./Transcript.svelte";
  import ManualTranscript from "./ManualTranscript.svelte";
  import FindingInspector from "./FindingInspector.svelte";
  import Documents from "./Documents.svelte";
  import References from "./References.svelte";
  import SessionSettings from "./SessionSettings.svelte";
  import ArchiveImport from "./ArchiveImport.svelte";
  import HearingLibrary from "./HearingLibrary.svelte";
  import EvidenceWorkspace from "./EvidenceWorkspace.svelte";
  import HearingAudio from "./HearingAudio.svelte";
  import CaseDialogue from "./CaseDialogue.svelte";

  type Tab =
    | "assistant"
    | "practice"
    | "evidence"
    | "hearing"
    | "documents"
    | "references"
    | "settings";

  const icons = {
    assistant: MessageSquare,
    practice: Gavel,
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
    assistant: "Case assistant",
    practice: "Courtroom practice",
    references: "Legal references",
    settings: "Session & connections",
  };

  let user = $state<User | null>(null);

  function setUser(value: typeof user) {
    user = value;
  }

  let caps = $state<Capabilities | null>(null);

  function setCaps(value: typeof caps) {
    caps = value;
  }

  let booting = $state(true);

  let cases = $state<Case[]>([]);

  let caseId = $state<string | null>(null);

  let detail = $state<CaseDetail | null>(null);

  let tab = $state<Tab>("evidence");

  let assistantReference = $state<string | null>(null);

  let hearingId = $state<string | null>(null);

  let selected = $state<string | null>(null);

  let filter = $state("all");

  let error = $state("");

  function setError(value: typeof error) {
    error = value;
  }

  let busy = $state(false);

  let creating = $state(false);

  let sidebar = $state(false);

  let connected = $state(false);

  let partial = $state("");

  const returnTarget = { current: null as HTMLElement | null };

  let noteDrafts = $state<Record<string, string>>({});

  const refreshVersion = { current: 0 as number };

  const activeCase = { current: null as string | null };

  const fail = (message: string) => (error = message);

  const audio = createHearingAudio(
    () => caseId,
    fail,
    () => hearingId,
    (text) => {
      partial = text;
    },
  );

  const refresh = async () => {
    const id = activeCase.current;
    if (!id) return;
    const version = ++refreshVersion.current;
    try {
      const result = await api<CaseDetail>(`/cases/${id}`);
      if (activeCase.current === id && version === refreshVersion.current) {
        detail = result;
        cases = ((current: typeof cases) =>
          current.map((c) => (c.id === id ? result.case : c)))(cases);
      }
    } catch (e) {
      if (activeCase.current !== id || version !== refreshVersion.current)
        return;
      if (e instanceof ApiError && e.status === 401) {
        activeCase.current = null;
        caseId = null;
        detail = null;
        cases = [];
        noteDrafts = {};
        user = null;
      } else
        error = e instanceof Error ? e.message : "Could not load this case.";
    }
  };

  const chooseCase = (id: string | null) => {
    if (activeCase.current === id) return;
    refreshVersion.current++;
    activeCase.current = id;
    caseId = id;
    assistantReference = null;
    hearingId = null;
    tab = "evidence";
    detail = null;
    selected = null;
    partial = "";
    filter = "all";
    error = "";
    connected = false;
  };

  const loadCases = async (preferred?: string) => {
    const list = await api<Case[]>("/cases");
    cases = list;
    const id =
      preferred ??
      (list.some((c) => c.id === activeCase.current)
        ? activeCase.current
        : (list[0]?.id ?? null));
    if (id !== activeCase.current) chooseCase(id);
  };

  onMount(() => {
    Promise.all([
      api<Capabilities>("/capabilities").then(setCaps),
      api<User>("/auth/me")
        .then(setUser)
        .catch((e) => {
          if (!(e instanceof ApiError && e.status === 401)) throw e;
        }),
    ])
      .catch(
        () =>
          (error =
            "The Jude server is unavailable. Please try reloading the workspace."),
      )
      .finally(() => (booting = false));
  });

  $effect(() => {
    void [user, chooseCase];
    return untrack(() => {
      if (!user) return;
      let active = true;
      api<Case[]>("/cases")
        .then((list) => {
          if (active) {
            cases = list;
            chooseCase(list[0]?.id ?? null);
          }
        })
        .catch((e) => {
          if (active) error = e.message;
        });
      return () => {
        active = false;
      };
    });
  });

  $effect(() => {
    void [caseId, refresh];
    return untrack(() => {
      if (!caseId) return;
      void refresh();
      let disposed = false;
      const socket = new EventSource(`/api/v1/cases/${caseId}/events`);
      let debounce: ReturnType<typeof setTimeout>;
      socket.onopen = () => {
        if (!disposed) {
          connected = true;
          void refresh();
        }
      };
      socket.onmessage = (event) => {
        if (disposed) return;
        const message = JSON.parse(event.data);
        if (message.type !== "heartbeat") {
          clearTimeout(debounce);
          debounce = setTimeout(() => void refresh(), 100);
        }
      };
      socket.onerror = () => {
        if (!disposed) connected = false;
      };
      const poll = setInterval(() => void refresh(), 5000);
      return () => {
        disposed = true;
        clearTimeout(debounce);
        clearInterval(poll);
        socket?.close();
      };
    });
  });

  $effect(() => {
    void [sidebar];
    return untrack(() => {
      if (!sidebar) return;
      const close = document.querySelector<HTMLButtonElement>(
        '[aria-label="Close case navigation"]',
      );
      close?.focus();
    });
  });

  function closeSidebar() {
    sidebar = false;
    document
      .querySelector<HTMLButtonElement>('[aria-controls="case-navigation"]')
      ?.focus();
  }

  function inspectFinding(id: string) {
    returnTarget.current = document.activeElement as HTMLElement;
    selected = id;
    if (window.matchMedia("(max-width: 1320px)").matches) {
      requestAnimationFrame(() => {
        const inspector = document.getElementById("finding-inspector");
        inspector?.focus({ preventScroll: true });
        inspector?.scrollIntoView({ behavior: "instant", block: "start" });
      });
    }
  }

  async function action(run: () => Promise<unknown>) {
    busy = true;
    error = "";
    try {
      await run();
      await refresh();
      return true;
    } catch (e) {
      error =
        e instanceof Error ? e.message : "Something went wrong. Try again.";
      return false;
    } finally {
      busy = false;
    }
  }

  let hearing = $derived(detail?.hearings.find((h) => h.id === hearingId));

  let hearingSegments = $derived(
    detail?.segments.filter((s) => s.hearing_id === hearingId) ?? [],
  );

  let hearingFindings = $derived(
    detail?.findings.filter((f) =>
      hearingSegments.some((s) => s.id === f.segment_id),
    ) ?? [],
  );

  let visibleFindings = $derived(
    hearingFindings
      .filter(
        (f) =>
          filter === "all" ||
          (filter === "unreviewed" ? !f.reviewed : f.status === filter),
      )
      .slice()
      .reverse(),
  );

  let finding = $derived(
    visibleFindings.find((f) => f.id === selected) ??
      visibleFindings[0] ??
      null,
  );

  let unreviewedFindings = $derived(hearingFindings.filter((f) => !f.reviewed));

  let nextUnreviewed = $derived(
    unreviewedFindings.length
      ? unreviewedFindings[
          (unreviewedFindings.findIndex((f) => f.id === finding?.id) + 1) %
            unreviewedFindings.length
        ]
      : undefined,
  );

  let pending = $derived(
    hearingSegments.filter((s) =>
      [
        "queued",
        "extracting",
        "retrieving",
        "analyzing",
        "reviewing",
        "synthesizing",
      ].includes(s.analysis_state),
    ).length,
  );

  function openHearing(id: string) {
    hearingId = id;
    tab = "hearing";
    selected = null;
    filter = "all";
    partial = "";
  }

  let session = $derived(detail?.case);
</script>

{#if booting}<div class={styles.app}>
    <div class={styles.loading}>
      <span class={styles.brand}>jude.</span>
      <p>Opening your workspace…</p>
    </div>
  </div>{:else}{#if !user}<div class={styles.app}>
      <Auth {caps} {error} {setError} onUser={setUser}></Auth>
    </div>{:else}<div class={styles.app}>
      <a class={styles.skip} href="#workspace-main"> Skip to workspace </a>
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions (Handle Escape and trap Tab from the mobile navigation controls.) -->
      <aside
        class={`${styles.sidebar} ${sidebar ? styles.sidebarOpen : ""}`}
        id="case-navigation"
        aria-label="Cases and account"
        onkeydown={(e) => {
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
        <div class={styles.sidebarBrand}>
          <a href={resolve("/")} class={styles.brand}> jude. </a>
          <button
            class={styles.mobileClose}
            onclick={closeSidebar}
            aria-label="Close case navigation"
          >
            <X size={20}></X>
          </button>
        </div>
        <p class={styles.workspaceLabel}>Your workspace</p>
        <button
          class={styles.newCase}
          onclick={() => {
            creating = true;
            sidebar = false;
          }}
        >
          <Plus size={17}></Plus>
          New case
        </button>
        <ArchiveImport
          onImport={async (id) => {
            await loadCases(id);
            tab = "evidence";
          }}
        ></ArchiveImport>
        <nav aria-label="Your cases" class={styles.caseList}>
          {#each cases as c (c.id)}<button
              class={c.id === caseId ? styles.caseActive : ""}
              aria-current={c.id === caseId ? "page" : undefined}
              onclick={() => {
                chooseCase(c.id);
                closeSidebar();
              }}
            >
              <FolderOpen size={17}></FolderOpen>
              <span>
                {c.title}
                <small>
                  {c.synthetic
                    ? "Synthetic exercise"
                    : c.reference || "Case workspace"}
                </small>
              </span>
            </button>{/each}
        </nav>
        <div class={styles.sidebarBottom}>
          <span class={styles.accountAvatar}>{user.name.slice(0, 1)}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{user.demo ? "Demo session" : "Lawyer workspace"}</small>
          </div>
          <button
            aria-label="Sign out"
            title="Sign out"
            onclick={() =>
              action(async () => {
                audio.stop();
                await api("/auth/logout", { method: "POST" });
                user = null;
                cases = [];
                noteDrafts = {};
                chooseCase(null);
              })}
          >
            <LogOut size={17}></LogOut>
          </button>
        </div>
      </aside>
      <main id="workspace-main" class={styles.main}>
        <div class={styles.topbar}>
          <button
            class={styles.mobileMenu}
            aria-label="Open case navigation"
            aria-expanded={sidebar}
            aria-controls="case-navigation"
            onclick={() => (sidebar = true)}
          >
            <Menu size={21}></Menu>
          </button>
          <span>
            <FolderOpen size={15}></FolderOpen>
            Cases <ChevronRight size={14}></ChevronRight>
            {session?.title ?? "Workspace"}
          </span>
          <a href={resolve("/")}>
            About Jude <ExternalLink size={13}></ExternalLink>
          </a>
        </div>
        {#if error}<div class={styles.error} role="alert">
            <span>{error}</span>
            <button aria-label="Dismiss error" onclick={() => (error = "")}>
              <X size={18}></X>
            </button>
          </div>{/if}
        {#if creating}<NewCase
            {busy}
            close={() => (creating = false)}
            submit={(body) =>
              action(async () => {
                const c = await api<Case>("/cases", {
                  method: "POST",
                  body: JSON.stringify(body),
                });
                await loadCases(c.id);
                creating = false;
              })}
          ></NewCase>{/if}
        {#if !caseId}<div class={styles.welcome}>
            <FolderOpen size={38}></FolderOpen>
            <h1>A place for the whole case.</h1>
            <p>
              Create a case to bring together documents, testimony, and the
              questions that deserve a closer look.
            </p>
            <button class={styles.primary} onclick={() => (creating = true)}>
              <Plus size={17}></Plus>
              Create your first case
            </button>
            {#if caps?.demo_available}<button
                class={styles.secondary}
                disabled={busy}
                onclick={() =>
                  action(async () => {
                    const c = await api<Case>("/cases/synthetic", {
                      method: "POST",
                    });
                    await loadCases(c.id);
                  })}
              >
                Try a synthetic hearing <ArrowRight size={16}></ArrowRight>
              </button>{/if}
          </div>{:else}{#if !detail}<div class={styles.loading}>
              <p>Loading case record…</p>
              <button class={styles.secondary} onclick={refresh}>
                Retry connection
              </button>
            </div>{:else}
            <header class={styles.caseHeader}>
              <div>
                <h1>{session?.title}</h1>
                <div class={styles.caseMeta}>
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
              <div class={styles.headerActions}>
                <a
                  class={styles.secondary}
                  rel="external"
                  href={`/api/v1/cases/${caseId}/export.jude`}
                >
                  <Download size={15}></Download>
                  Export .jude
                </a>
              </div>
            </header>
            <div class={styles.tabs} role="tablist" aria-label="Case sections">
              {#each Object.keys(titles) as Tab[] as key (key)}{@const Icon =
                  icons[key]}<button
                  role="tab"
                  aria-selected={tab === key}
                  aria-controls={`panel-${key}`}
                  id={`tab-${key}`}
                  tabindex={tab === key ? 0 : -1}
                  onkeydown={(event) => {
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
                      tab = next;
                      document.getElementById(`tab-${next}`)?.focus();
                    }
                  }}
                  onclick={() => (tab = key)}
                >
                  <Icon size={16}></Icon>
                  {titles[key]}
                  {#if key === "documents"}<span>{detail.documents.length}</span
                    >{/if}
                </button>{/each}
            </div>
            <div
              id={`panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`tab-${tab}`}
              class={styles.panel}
              tabindex={0}
            >
              {#if tab === "assistant" || tab === "practice"}{#key `${caseId}-${tab}`}<CaseDialogue
                    {caseId}
                    kind={tab === "practice" ? "practice" : "assistant"}
                    initialReference={tab === "assistant"
                      ? assistantReference
                      : null}
                    {caps}
                    {openHearing}
                  ></CaseDialogue>{/key}{/if}
              {#if tab === "evidence"}{#key caseId}<EvidenceWorkspace
                    {caseId}
                    askAssistant={(reference) => {
                      assistantReference = reference;
                      tab = "assistant";
                      requestAnimationFrame(() =>
                        document.getElementById("tab-assistant")?.focus(),
                      );
                    }}
                    {openHearing}
                  ></EvidenceWorkspace>{/key}{/if}
              {#if tab === "hearing" && !hearing}{#key caseId}<HearingLibrary
                    {detail}
                    onOpen={openHearing}
                    {refresh}
                    configured={!!caps?.analysis.configured}
                  ></HearingLibrary>{/key}{/if}
              {#if tab === "hearing" && hearing}
                <div class={book.hearingDetailHeader}>
                  <button
                    class={book.hearingBack}
                    onclick={() => {
                      audio.stop();
                      hearingId = null;
                    }}
                  >
                    <ArrowLeft size={15}></ArrowLeft>
                    All hearings
                  </button>
                  <h2>{hearing.title}</h2>
                  <div>
                    <a
                      class={styles.secondary}
                      rel="external"
                      href={`/api/v1/cases/${caseId}/hearings/${hearing.id}/export.jude`}
                    >
                      <Download size={15}></Download>
                      Export hearing
                    </a>
                    {#if hearing.kind === "simulation"}<button
                        class={styles.primary}
                        disabled={busy ||
                          hearing.status === "complete" ||
                          audio.status !== "idle"}
                        onclick={() =>
                          action(() =>
                            api(
                              `/cases/${caseId}/${hearing.status === "simulation" ? "pause" : "simulation"}?hearing_id=${hearing.id}`,
                              { method: "POST" },
                            ),
                          )}
                      >
                        {#if hearing.status === "simulation"}<Pause size={16}
                          ></Pause>{:else}<Play size={16}></Play>{/if}&#32;
                        {hearing.status === "complete"
                          ? "Simulation complete"
                          : hearing.status === "simulation"
                            ? "Pause hearing"
                            : "Start simulated hearing"}
                      </button>{:else}<button
                        class={styles.primary}
                        disabled={busy ||
                          pending > 0 ||
                          !hearingSegments.length ||
                          !caps?.analysis.configured}
                        onclick={() =>
                          action(() =>
                            api(
                              `/cases/${caseId}/hearings/${hearing.id}/analyze`,
                              { method: "POST" },
                            ),
                          )}
                      >
                        <ShieldCheck size={16}></ShieldCheck>
                        Analyze hearing
                      </button>{/if}
                  </div>
                </div>
                <div class={styles.sessionBar}>
                  <span>
                    <i class={connected ? styles.onlineDot : styles.offlineDot}
                    ></i>
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
                {#if hearing.kind !== "simulation" && !caps?.analysis.configured}<p
                    class={styles.notice}
                  >
                    Transcript saved. Connect an OpenRouter analysis model to
                    examine this hearing.
                  </p>{/if}
                {#if hearing.kind === "simulation"}<p class={styles.notice}>
                    <CircleHelp size={15}></CircleHelp>
                    Simulation uses prepared testimony and authored findings. It does
                    not run speech recognition or AI analysis.
                  </p>{/if}
                <div class={styles.hearingGrid}>
                  <section
                    class={styles.transcriptPane}
                    aria-labelledby="transcript-heading"
                  >
                    <div class={styles.paneHeading}>
                      <h2 id="transcript-heading">Transcript</h2>
                      <span>{hearingSegments.length} segments</span>
                    </div>
                    {#key hearing.id}<Transcript
                        segments={hearingSegments}
                        speakers={session?.speakers ?? {}}
                        {partial}
                        {caseId}
                        onRetry={(id) =>
                          action(() =>
                            api(`/cases/${caseId}/transcripts/${id}/retry`, {
                              method: "POST",
                            }),
                          )}
                        select={(id) => {
                          const f = hearingFindings.find(
                            (f) => f.segment_id === id,
                          );
                          if (f) {
                            filter = "all";
                            inspectFinding(f.id);
                          }
                        }}
                        findings={hearingFindings}
                      ></Transcript>{/key}
                    {#key hearing.id}<ManualTranscript
                        {busy}
                        submit={(body) =>
                          action(() =>
                            api(`/cases/${caseId}/transcripts`, {
                              method: "POST",
                              body: JSON.stringify({
                                ...body,
                                hearing_id: hearing.id,
                              }),
                            }),
                          )}
                      ></ManualTranscript>{/key}
                  </section>
                  <section
                    class={styles.findingPane}
                    aria-labelledby="findings-heading"
                  >
                    <div class={styles.paneHeading}>
                      <h2 id="findings-heading" tabindex="-1">Findings</h2>
                      <span>
                        {hearingFindings.filter((f) => !f.reviewed).length} to review
                      </span>
                    </div>
                    {#if hearingFindings.length > 0}<div
                        class={styles.reviewSummary}
                      >
                        <span role="status">
                          {hearingFindings.length -
                            unreviewedFindings.length}&#32; of {hearingFindings.length}
                          reviewed
                        </span>
                        <button
                          class={styles.textButton}
                          disabled={!nextUnreviewed || busy}
                          onclick={() => {
                            if (nextUnreviewed) {
                              filter = "unreviewed";
                              inspectFinding(nextUnreviewed.id);
                            }
                          }}
                        >
                          Next unreviewed <ArrowRight size={14}></ArrowRight>
                        </button>
                      </div>{/if}
                    <label class={styles.filterLabel}>
                      <span class={styles.srOnly}>Filter findings</span>
                      <select
                        value={filter}
                        onchange={(e) => (filter = e.currentTarget.value)}
                      >
                        <option value="all">All findings</option>
                        <option value="unreviewed">Needs your review</option>
                        {#each Object.entries(labels) as [value, label] (value)}<option
                            {value}
                          >
                            {label}
                          </option>{/each}
                      </select>
                    </label>
                    <div class={styles.findingList}>
                      {#if visibleFindings.length}{#each visibleFindings as f (f.id)}<button
                            class={`${styles.findingRow} ${finding?.id === f.id ? styles.findingSelected : ""}`}
                            aria-pressed={finding?.id === f.id}
                            onclick={() => inspectFinding(f.id)}
                          >
                            <div>
                              <StatusLabel status={f.status}></StatusLabel>
                              {#if f.reviewed}<Check
                                  size={15}
                                  aria-label="Reviewed"
                                ></Check>{/if}
                            </div>
                            <h3>{f.title}</h3>
                            <p>{f.verification}</p>
                            <small>
                              {f.mode === "simulation"
                                ? "Scripted example"
                                : f.mode === "imported"
                                  ? "Imported finding · verify sources"
                                  : "AI · source-validated"}&#32; · {f.citations
                                .length} source
                              {f.citations.length !== 1 ? "s" : ""}
                              <ChevronRight size={14}></ChevronRight>
                            </small>
                          </button>{/each}{:else}<Empty
                          title={filter === "all"
                            ? "Follow the evidence."
                            : "No findings in this view."}
                          text={filter === "all"
                            ? "Findings appear here as finalized statements are examined. Start the simulation or add a transcript statement."
                            : "Choose another filter to see the rest of the record."}
                          >{#snippet icon()}<ShieldCheck size={30}
                            ></ShieldCheck>{/snippet}</Empty
                        >{/if}
                    </div>
                  </section>
                  <section
                    id="finding-inspector"
                    tabindex="-1"
                    class={styles.inspectorPane}
                    aria-label="Finding and source inspector"
                  >
                    <button
                      class={`${styles.textButton} ${styles.returnFindings}`}
                      onclick={() => {
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
                      <ArrowLeft size={14}></ArrowLeft>
                      Back to findings
                    </button>
                    {#if finding}{#key finding.id}<FindingInspector
                          {finding}
                          segment={hearingSegments.find(
                            (s) => s.id === finding.segment_id,
                          )}
                          {caseId}
                          {busy}
                          note={noteDrafts[finding.id] ?? finding.note}
                          onNote={(note) =>
                            (noteDrafts = ((current: typeof noteDrafts) => ({
                              ...current,
                              [finding.id]: note,
                            }))(noteDrafts))}
                          save={async (body) => {
                            const savedFindingId = finding.id;
                            const saved = await action(() =>
                              api(`/cases/${caseId}/findings/${finding.id}`, {
                                method: "PATCH",
                                body: JSON.stringify(body),
                              }),
                            );
                            if (saved)
                              noteDrafts = ((current: typeof noteDrafts) => {
                                if (current[savedFindingId] !== body.note)
                                  return current;
                                const next = { ...current };
                                delete next[savedFindingId];
                                return next;
                              })(noteDrafts);
                            return saved;
                          }}
                        ></FindingInspector>{/key}{:else}<Empty
                        title="Every finding, inspectable."
                        text="Select a finding to compare its testimony with original passages, alternative explanations, and a verification step."
                        >{#snippet icon()}<BookOpen size={30}
                          ></BookOpen>{/snippet}</Empty
                      >{/if}
                  </section>
                </div>
                {#if hearing.kind !== "simulation"}{#key hearing.id}<HearingAudio
                      {audio}
                      configured={!!caps?.speech.configured}
                    ></HearingAudio>{/key}{/if}
                <p class={styles.bottomNote}>
                  Findings describe evidence relationships. They do not
                  determine credibility, guilt, or legal outcomes.
                </p>
              {/if}
              {#if tab === "documents"}{#key caseId}<Documents
                    {caseId}
                    documents={detail.documents}
                    run={action}
                    {busy}
                  ></Documents>{/key}{/if}
              {#if tab === "references"}{#key caseId}<References
                    {caseId}
                    configured={!!caps?.legal.configured}
                  ></References>{/key}{/if}
              {#if tab === "settings"}{#key caseId}<SessionSettings
                    {caps}
                    {detail}
                    {busy}
                    run={action}
                  ></SessionSettings>{/key}{/if}
            </div>
          {/if}{/if}
      </main>
    </div>{/if}{/if}
