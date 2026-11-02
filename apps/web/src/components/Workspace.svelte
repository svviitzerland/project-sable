<script lang="ts">
  import Skeleton from "./Skeleton.svelte";
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
    FileText,
    FolderOpen,
    GitBranch,
    Menu,
    MessageSquare,
    Gavel,
    Pause,
    Play,
    Plus,
    Settings,
    ShieldCheck,
    X,
    PanelLeftOpen,
    PanelLeftClose,
  } from "@lucide/svelte";
  import {
    api,
    ApiError,
    statuses,
    statusLabel,
    publicRecord,
    type Capabilities,
    type Case,
    type CaseDetail,
    type User,
  } from "../lib/workspace-api";
  import { createHearingAudio } from "../lib/hearing-audio.svelte";
  import styles from "./workspace.module.css";
  import tabs from "./case-tabs.module.css";
  import { onMount, untrack } from "svelte";
  import Auth from "./Auth.svelte";
  import NewCase from "./NewCase.svelte";
  import StatusLabel from "./StatusLabel.svelte";
  import Transcript from "./Transcript.svelte";
  import ManualTranscript from "./ManualTranscript.svelte";
  import FindingInspector from "./FindingInspector.svelte";
  import Documents from "./Documents.svelte";
  import References from "./References.svelte";
  import SessionSettings from "./SessionSettings.svelte";
  import HearingLibrary from "./HearingLibrary.svelte";
  import EvidenceWorkspace from "./EvidenceWorkspace.svelte";
  import HearingAudio from "./HearingAudio.svelte";
  import CaseDialogue from "./CaseDialogue.svelte";
  import AccountMenu from "./AccountMenu.svelte";
  import { t, tp } from "../lib/i18n/index.svelte";
  import { maybeStartTour, startTour } from "../lib/tour";

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

  const titles = {
    evidence: "tab.evidence",
    hearing: "tab.hearing",
    documents: "tab.documents",
    assistant: "tab.assistant",
    practice: "tab.practice",
    references: "tab.references",
    settings: "tab.settings",
  } as const satisfies Record<Tab, string>;

  let user = $state<User | null>(null);

  function setUser(value: typeof user) {
    if (value) casesLoading = true;
    user = value;
  }

  let caps = $state<Capabilities | null>(null);

  function setCaps(value: typeof caps) {
    caps = value;
  }

  let booting = $state(true);

  let cases = $state<Case[]>([]);
  let caseSearch = $state("");
  let visibleCases = $derived(
    cases.filter((record) =>
      `${record.title} ${record.reference}`
        .toLowerCase()
        .includes(caseSearch.trim().toLowerCase()),
    ),
  );

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
  let casesLoading = $state(true);
  let detailLoading = $state(false);

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
    () => void refresh(),
  );

  // Desktop sidebar: a slim rail that expands on hover or focus, or stays pinned open.
  // Read before the first render so a pinned rail never animates open on load.
  let pinned = $state(
    (() => {
      try {
        return (
          typeof localStorage !== "undefined" &&
          localStorage.getItem("jude.sidebar.pinned") === "1"
        );
      } catch {
        return false;
      }
    })(),
  );
  // Transitions and hover expansion switch on after the first paint, so a reload never
  // animates the rail open and closed.
  let shellReady = $state(false);
  onMount(() => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => (shellReady = true)),
    );
  });
  function togglePinned() {
    pinned = !pinned;
    try {
      localStorage.setItem("jude.sidebar.pinned", pinned ? "1" : "0");
    } catch {
      /* Not persisted in private mode. */
    }
  }
  const openDemo = () =>
    action(async () => {
      const c = await api<Case>("/cases/synthetic", { method: "POST" });
      await loadCases(c.id);
    });
  // The guided tour introduces a case, so it starts once when the first case is open.
  let tourChecked = false;
  $effect(() => {
    if (user && detail && !tourChecked) {
      tourChecked = true;
      maybeStartTour();
    }
  });

  const refresh = async () => {
    const id = activeCase.current;
    if (!id) return;
    const version = ++refreshVersion.current;
    if (!detail) detailLoading = true;
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
      } else error = e instanceof Error ? e.message : t("error.loadCase");
    } finally {
      if (activeCase.current === id && version === refreshVersion.current)
        detailLoading = false;
    }
  };

  const chooseCase = (id: string | null) => {
    if (activeCase.current === id) return;
    refreshVersion.current++;
    activeCase.current = id;
    caseId = id;
    detailLoading = !!id;
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
    if (preferred) caseSearch = "";
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
      .catch(() => (error = t("error.serverUnavailable")))
      .finally(() => (booting = false));
  });

  $effect(() => {
    void [user, chooseCase];
    return untrack(() => {
      if (!user) return;
      casesLoading = true;
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
        })
        .finally(() => {
          if (active) casesLoading = false;
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
      // SSE is advisory and polling stays authoritative. Poll every 5 s while the
      // stream is down, every 30 s while it delivers heartbeats (every 10 s), and
      // not at all while the tab is hidden.
      let heard = 0;
      let poll: ReturnType<typeof setTimeout> | undefined;
      const healthy = () => connected && Date.now() - heard < 25_000;
      const schedule = () => {
        clearTimeout(poll);
        if (disposed || document.hidden) return;
        poll = setTimeout(
          () => {
            void refresh();
            schedule();
          },
          healthy() ? 30_000 : 5_000,
        );
      };
      socket.onopen = () => {
        if (!disposed) {
          connected = true;
          heard = Date.now();
          void refresh();
          schedule();
        }
      };
      socket.onmessage = (event) => {
        if (disposed) return;
        heard = Date.now();
        const message = JSON.parse(event.data);
        if (message.type !== "heartbeat") {
          clearTimeout(debounce);
          debounce = setTimeout(() => void refresh(), 100);
        }
      };
      socket.onerror = () => {
        if (disposed) return;
        connected = false;
        schedule();
      };
      const visibility = () => {
        if (disposed) return;
        if (!document.hidden) void refresh();
        schedule();
      };
      document.addEventListener("visibilitychange", visibility);
      schedule();
      return () => {
        disposed = true;
        clearTimeout(debounce);
        clearTimeout(poll);
        document.removeEventListener("visibilitychange", visibility);
        socket?.close();
      };
    });
  });

  $effect(() => {
    void [sidebar];
    return untrack(() => {
      if (!sidebar) return;
      const close = document.getElementById("close-case-navigation");
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
    // One column on narrow screens: move focus to the opened finding.
    const narrow = window.matchMedia("(max-width: 960px)").matches;
    requestAnimationFrame(() => {
      const inspector = document.getElementById("finding-inspector");
      if (narrow) inspector?.focus({ preventScroll: true });
      inspector?.scrollIntoView({
        behavior: "instant",
        block: narrow ? "start" : "nearest",
      });
    });
  }

  async function action(run: () => Promise<unknown>) {
    busy = true;
    error = "";
    try {
      await run();
      await refresh();
      return true;
    } catch (e) {
      error = e instanceof Error ? e.message : t("error.unexpected");
      return false;
    } finally {
      busy = false;
    }
  }

  let hearing = $derived(detail?.hearings.find((h) => h.id === hearingId));

  let hearingSegments = $derived(
    detail?.segments.filter((s) => s.hearing_id === hearingId) ?? [],
  );

  let hearingFindings = $derived.by(() => {
    const ids = new Set(hearingSegments.map((s) => s.id));
    return detail?.findings.filter((f) => ids.has(f.segment_id)) ?? [];
  });

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
    <Skeleton variant="workspace" label={t("common.openingWorkspace")} />
  </div>{:else}{#if !user}<div class={styles.app}>
      <Auth {caps} {error} {setError} onUser={setUser}></Auth>
    </div>{:else}<div
      class={`${styles.app} ${shellReady ? styles.shellReady : ""}`}
    >
      <a class={styles.skip} href="#workspace-main">{t("ws.skip")}</a>
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions (Handle Escape and trap Tab from the mobile navigation controls.) -->
      <aside
        class={`${styles.sidebar} ${sidebar ? styles.sidebarOpen : ""} ${pinned ? styles.sidebarPinned : ""}`}
        id="case-navigation"
        aria-label={t("ws.sidebar")}
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
          <a href={resolve("/")} class={styles.brand}
            ><span class="side-text">jude.</span><span
              class={styles.brandMark}
              aria-hidden="true">j.</span
            ></a
          >
          <button
            class={styles.pinButton}
            aria-pressed={pinned}
            aria-label={pinned ? t("ws.unpinSidebar") : t("ws.pinSidebar")}
            title={pinned ? t("ws.unpinSidebar") : t("ws.pinSidebar")}
            onclick={togglePinned}
          >
            {#if pinned}<PanelLeftClose size={17}
              ></PanelLeftClose>{:else}<PanelLeftOpen size={17}
              ></PanelLeftOpen>{/if}
          </button>
          <button
            id="close-case-navigation"
            class={styles.mobileClose}
            onclick={closeSidebar}
            aria-label={t("ws.closeNav")}
          >
            <X size={20}></X>
          </button>
        </div>
        <p class={`${styles.workspaceLabel} side-text`}>
          {t("ws.yourWorkspace")}
        </p>
        <button
          class={styles.newCase}
          data-tour="new-case"
          aria-label={t("ws.newCase")}
          title={t("ws.newCase")}
          onclick={() => {
            creating = true;
            sidebar = false;
          }}
        >
          <Plus size={17}></Plus>
          <span class="side-text">{t("ws.newCase")}</span>
        </button>
        {#if cases.length > 0}<label class={`${styles.caseSearch} side-text`}>
            <span class={styles.srOnly}>{t("ws.findCase")}</span>
            <input
              type="search"
              placeholder={t("ws.findCasePlaceholder")}
              bind:value={caseSearch}
            />
          </label>{/if}
        <nav aria-label={t("ws.yourCases")} class={styles.caseList}>
          {#if casesLoading}<Skeleton
              variant="rows"
              label={t("common.loadingCases")}
              inverse
            />{/if}
          {#each visibleCases as c (c.id)}<button
              class={c.id === caseId ? styles.caseActive : ""}
              aria-current={c.id === caseId ? "page" : undefined}
              title={c.title}
              onclick={() => {
                chooseCase(c.id);
                closeSidebar();
              }}
            >
              <span class={styles.caseInitial} aria-hidden="true"
                >{c.title.trim().slice(0, 1).toUpperCase()}</span
              >
              <span class="side-text">
                {c.title}
                <small>
                  {c.synthetic
                    ? t("common.syntheticExercise")
                    : publicRecord(c)
                      ? t("ws.publicRecord")
                      : c.reference || t("ws.caseWorkspace")}
                </small>
              </span>
            </button>{/each}
          {#if caseSearch && !visibleCases.length}<p
              class={styles.caseSearchEmpty}
            >
              {t("ws.noMatchingCases")}
              <button onclick={() => (caseSearch = "")}
                >{t("ws.clearSearch")}</button
              >
            </p>{/if}
        </nav>
        <div class={styles.sidebarBottom}>
          <AccountMenu
            name={user.name}
            subtitle={user.demo ? t("ws.demoSession") : t("ws.lawyerWorkspace")}
            onTour={startTour}
            onSignOut={() =>
              action(async () => {
                audio.stop();
                await api("/auth/logout", { method: "POST" });
                user = null;
                cases = [];
                noteDrafts = {};
                chooseCase(null);
              })}
          />
        </div>
      </aside>
      <main id="workspace-main" class={styles.main}>
        <div class={styles.topbar}>
          <button
            class={styles.mobileMenu}
            aria-label={t("ws.openNav")}
            aria-expanded={sidebar}
            aria-controls="case-navigation"
            onclick={() => (sidebar = true)}
          >
            <Menu size={21}></Menu>
          </button>
          <span>
            <FolderOpen size={15}></FolderOpen>
            {t("ws.cases")}
            <ChevronRight size={14}></ChevronRight>
            {session?.title ?? t("ws.workspace")}
          </span>
        </div>
        {#if error}<div class={styles.error} role="alert">
            <span>{error}</span>
            <button
              aria-label={t("ws.dismissError")}
              onclick={() => (error = "")}
            >
              <X size={18}></X>
            </button>
          </div>{/if}
        <NewCase
          open={creating}
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
          onImported={async (id) => {
            creating = false;
            await loadCases(id);
            tab = "evidence";
          }}
          onDemo={caps?.demo_available ? openDemo : undefined}
        ></NewCase>
        {#if casesLoading}<Skeleton
            variant="case"
            label={t("common.loadingCases")}
          />{:else if !caseId}<div class={styles.welcome}>
            <FolderOpen size={38}></FolderOpen>
            <h1>{t("ws.welcomeTitle")}</h1>
            <p>{t("ws.welcomeText")}</p>
            <button class={styles.primary} onclick={() => (creating = true)}>
              <Plus size={17}></Plus>
              {t("ws.createFirst")}
            </button>
            {#if caps?.demo_available}<button
                class={styles.secondary}
                disabled={busy}
                onclick={openDemo}
              >
                {t("ws.trySynthetic")}
                <ArrowRight size={16}></ArrowRight>
              </button>{/if}
          </div>{:else}{#if !detail}{#if detailLoading}<Skeleton
                variant="case"
                label={t("ws.loadingCase")}
              />{:else}<div class={styles.loading}>
                <p>{t("ws.caseLoadFailed")}</p>
                <button class={styles.secondary} onclick={refresh}>
                  {t("common.tryAgain")}
                </button>
              </div>{/if}{:else}
            <header class={styles.caseHeader}>
              <h1>{session?.title}</h1>
              <div class={styles.caseMeta}>
                {#if session?.reference}<span class={styles.caseRef}
                    >{session.reference}</span
                  >{/if}
                <span
                  >{session?.synthetic
                    ? t("ws.syntheticMaterial")
                    : publicRecord(session)
                      ? t("ws.publicRecord")
                      : t("ws.privateCase")}</span
                >
              </div>
            </header>
            <div
              class={styles.tabs}
              role="tablist"
              aria-label={t("ws.caseSections")}
            >
              {#each Object.keys(titles) as Tab[] as key (key)}{@const Icon =
                  icons[key]}<button
                  role="tab"
                  aria-selected={tab === key}
                  aria-controls={`panel-${key}`}
                  id={`tab-${key}`}
                  data-tour={`tab-${key}`}
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
                  {t(titles[key])}
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
              {#if tab === "evidence" && !detail.documents.length && !detail.segments.length}<section
                  class={tabs.screen}
                >
                  <header class={tabs.heading}>
                    <h2>{t("ws.start.title")}</h2>
                    <p>{t("ws.start.text")}</p>
                  </header>
                  <div class={tabs.startOptions}>
                    <button
                      class={tabs.startOption}
                      onclick={() => (tab = "documents")}
                    >
                      <FileText size={22} />
                      <span
                        ><strong>{t("ws.start.docs")}</strong><small
                          >{t("ws.start.docsText")}</small
                        ></span
                      >
                      <ArrowRight size={18} />
                    </button>
                    <button
                      class={tabs.startOption}
                      onclick={() => (tab = "hearing")}
                    >
                      <AudioLines size={22} />
                      <span
                        ><strong>{t("ws.start.hearing")}</strong><small
                          >{t("ws.start.hearingText")}</small
                        ></span
                      >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                  <p class={tabs.note}>
                    <CircleHelp size={15}></CircleHelp>
                    {t("ws.start.then")}
                  </p>
                </section>{:else if tab === "evidence"}{#key caseId}<EvidenceWorkspace
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
                <div class={`${tabs.screen} ${tabs.wide}`}>
                  <button
                    class={tabs.back}
                    onclick={() => {
                      audio.stop();
                      hearingId = null;
                    }}
                  >
                    <ArrowLeft size={14}></ArrowLeft>
                    {t("hearing.all")}
                  </button>
                  <header class={tabs.heading}>
                    <h2>{hearing.title}</h2>
                    <div class={tabs.headingActions}>
                      <a
                        class={tabs.ghost}
                        rel="external"
                        href={`/api/v1/cases/${caseId}/hearings/${hearing.id}/export.jude`}
                      >
                        <Download size={15}></Download>
                        {t("hearing.export")}
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
                            ? t("hearing.simComplete")
                            : hearing.status === "simulation"
                              ? t("hearing.pause")
                              : t("hearing.startSim")}
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
                          {t("hearing.analyze")}
                        </button>{/if}
                    </div>
                  </header>
                  <p class={tabs.statusLine}>
                    <i class={tabs.dot} data-on={connected} aria-hidden="true"
                    ></i>
                    <strong>
                      {hearing.status === "simulation"
                        ? t("hearing.state.simulation")
                        : hearing.status === "live"
                          ? t("hearing.state.live")
                          : hearing.status === "complete"
                            ? t("hearing.state.complete")
                            : t("hearing.state.ready")}
                    </strong>
                    <span class={tabs.sep} aria-hidden="true">·</span>
                    <span
                      >{connected
                        ? t("hearing.autoUpdates")
                        : t("hearing.checking")}</span
                    >
                    <span class={tabs.sep} aria-hidden="true">·</span>
                    <span>
                      {pending > 0
                        ? tp("count.examining", pending)
                        : hearingSegments.some(
                              (s) => s.analysis_state === "pending",
                            )
                          ? t("hearing.readyForAnalysis")
                          : t("hearing.upToDate")}
                    </span>
                  </p>
                  {#if hearing.kind === "simulation" || !caps?.analysis.configured}<p
                      class={tabs.note}
                    >
                      <CircleHelp size={14}></CircleHelp>
                      {hearing.kind === "simulation"
                        ? t("hearing.simNotice")
                        : t("hearing.analysisUnavailable")}
                    </p>{/if}
                  {#if hearing.kind !== "simulation"}{#key hearing.id}<HearingAudio
                        {audio}
                        configured={!!caps?.speech.configured}
                        caseId={detail.case.id}
                        recordings={detail.recordings.filter(
                          (r) => r.hearing_id === hearing.id,
                        )}
                        onChanged={() => void refresh()}
                        empty={hearingSegments.length === 0}
                      />{/key}{/if}
                  <div class={tabs.hearingGrid}>
                    <section
                      class={`${tabs.column} ${tabs.transcriptColumn}`}
                      aria-labelledby="transcript-heading"
                    >
                      {#key hearing.id}<Transcript
                          segments={hearingSegments}
                          speakers={session?.speakers ?? {}}
                          onRename={(speaker, label) =>
                            action(() =>
                              api(`/cases/${caseId}/speakers`, {
                                method: "PATCH",
                                body: JSON.stringify({ speaker, label }),
                              }),
                            )}
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
                      class={tabs.column}
                      aria-labelledby="findings-heading"
                    >
                      <div class={tabs.colHead}>
                        <div class={tabs.colTitle}>
                          <h2 id="findings-heading" tabindex="-1">
                            {t("hearing.findings")}
                          </h2>
                          {#if hearingFindings.length > 0}<span
                              class={`${tabs.chip} ${unreviewedFindings.length ? tabs.chipWarm : tabs.chipDone}`}
                            >
                              {unreviewedFindings.length
                                ? t("hearing.toReview", {
                                    count: unreviewedFindings.length,
                                  })
                                : t("library.allReviewed")}
                            </span>{/if}
                        </div>
                        {#if hearingFindings.length > 0}<div
                            class={tabs.progress}
                            aria-hidden="true"
                          >
                            <span
                              style={`width: ${((hearingFindings.length - unreviewedFindings.length) / hearingFindings.length) * 100}%`}
                            ></span>
                          </div>
                          <div class={tabs.reviewLine}>
                            <span role="status">
                              {t("hearing.reviewedOf", {
                                done:
                                  hearingFindings.length -
                                  unreviewedFindings.length,
                                total: hearingFindings.length,
                              })}
                            </span>
                            <button
                              class={tabs.ghost}
                              disabled={!nextUnreviewed || busy}
                              onclick={() => {
                                if (nextUnreviewed) {
                                  filter = "unreviewed";
                                  inspectFinding(nextUnreviewed.id);
                                }
                              }}
                            >
                              {t("hearing.nextUnreviewed")}
                              <ArrowRight size={14}></ArrowRight>
                            </button>
                          </div>{/if}
                        <label>
                          <span class={styles.srOnly}
                            >{t("hearing.filter")}</span
                          >
                          <select
                            value={filter}
                            onchange={(e) => (filter = e.currentTarget.value)}
                          >
                            <option value="all"
                              >{t("hearing.allFindings")}</option
                            >
                            <option value="unreviewed"
                              >{t("hearing.needsReview")}</option
                            >
                            {#each statuses as value (value)}<option {value}>
                                {statusLabel(value)}
                              </option>{/each}
                          </select>
                        </label>
                      </div>
                      {#if pending > 0}<Skeleton
                          variant="rows"
                          count={1}
                          label={t("hearing.examining")}
                        />{/if}
                      <div class={tabs.findings}>
                        {#if visibleFindings.length}{#each visibleFindings as f (f.id)}{@const open =
                              finding?.id === f.id}{@const statement =
                              hearingSegments.find(
                                (s) => s.id === f.segment_id,
                              )}
                            <div
                              class={`${tabs.card} ${open ? tabs.cardSelected : ""}`}
                              id={open ? "finding-inspector" : undefined}
                              role={open ? "region" : undefined}
                              aria-label={open
                                ? t("hearing.inspector")
                                : undefined}
                              tabindex="-1"
                            >
                              <button
                                class={tabs.cardButton}
                                aria-pressed={open}
                                onclick={() => inspectFinding(f.id)}
                              >
                                <span class={tabs.cardTop}>
                                  <StatusLabel status={f.status}></StatusLabel>
                                  {#if f.reviewed}<span
                                      class={tabs.reviewedMark}
                                      ><Check
                                        size={14}
                                        aria-label={t("common.reviewed")}
                                      ></Check></span
                                    >{/if}
                                </span>
                                <h3>{f.title}</h3>
                                <small class={tabs.cardMode}>
                                  {f.mode === "simulation"
                                    ? t("hearing.mode.simulation")
                                    : f.mode === "imported"
                                      ? t("hearing.mode.imported")
                                      : t("hearing.mode.ai")}
                                </small>
                              </button>
                              {#if open}<div class={tabs.cardDetail}>
                                  {#key f.id}<FindingInspector
                                      finding={f}
                                      segment={statement}
                                      {caseId}
                                      {busy}
                                      note={noteDrafts[f.id] ?? f.note}
                                      onNote={(note) =>
                                        (noteDrafts = ((
                                          current: typeof noteDrafts,
                                        ) => ({
                                          ...current,
                                          [f.id]: note,
                                        }))(noteDrafts))}
                                      onBack={() => {
                                        const target = returnTarget.current
                                          ?.isConnected
                                          ? returnTarget.current
                                          : document.getElementById(
                                              "findings-heading",
                                            );
                                        target?.focus();
                                        target?.scrollIntoView({
                                          behavior: "instant",
                                          block: "center",
                                        });
                                      }}
                                      save={async (body) => {
                                        const savedFindingId = f.id;
                                        const saved = await action(() =>
                                          api(
                                            `/cases/${caseId}/findings/${f.id}`,
                                            {
                                              method: "PATCH",
                                              body: JSON.stringify(body),
                                            },
                                          ),
                                        );
                                        if (saved)
                                          noteDrafts = ((
                                            current: typeof noteDrafts,
                                          ) => {
                                            if (
                                              current[savedFindingId] !==
                                              body.note
                                            )
                                              return current;
                                            const next = { ...current };
                                            delete next[savedFindingId];
                                            return next;
                                          })(noteDrafts);
                                        return saved;
                                      }}
                                    ></FindingInspector>{/key}
                                </div>{:else}<div class={tabs.cardQuotes}>
                                  {#if statement}<p class={tabs.cardQuote}>
                                      <span>{t("tabs.finding.testimony")}</span>
                                      <q>{statement.text}</q>
                                    </p>{/if}
                                  {#if f.citations[0]?.quote}<p
                                      class={tabs.cardQuote}
                                    >
                                      <span>{t("tabs.finding.source")}</span>
                                      <q>{f.citations[0].quote}</q>
                                    </p>{/if}
                                </div>{/if}
                            </div>{/each}{:else if pending === 0}<div
                            class={tabs.empty}
                          >
                            <ShieldCheck size={28}></ShieldCheck>
                            <h3>
                              {filter === "all"
                                ? t("hearing.emptyTitle")
                                : t("hearing.emptyFilterTitle")}
                            </h3>
                            <p>
                              {filter === "all"
                                ? t("hearing.emptyText")
                                : t("hearing.emptyFilterText")}
                            </p>
                          </div>{/if}
                      </div>
                    </section>
                  </div>
                  <p class={tabs.footnote}>
                    {t("hearing.bottomNote")}
                  </p>
                </div>
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
                    {detail}
                    {busy}
                    run={action}
                    onDeleted={async () => {
                      activeCase.current = null;
                      tab = "evidence";
                      await loadCases();
                    }}
                  ></SessionSettings>{/key}{/if}
            </div>
          {/if}{/if}
      </main>
    </div>{/if}{/if}
