<script lang="ts">
  import Skeleton from "./Skeleton.svelte";
  import { resolve } from "$app/paths";
  import { pushState, replaceState } from "$app/navigation";
  import {
    ArrowRight,
    AudioLines,
    ChevronRight,
    CircleHelp,
    FileText,
    FolderOpen,
    GitBranch,
    Menu,
    Gavel,
    Plus,
    Settings,
    X,
    PanelLeftOpen,
    PanelLeftClose,
  } from "@lucide/svelte";
  import {
    api,
    ApiError,
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
  import Documents from "./Documents.svelte";
  import SessionSettings from "./SessionSettings.svelte";
  import HearingLibrary from "./HearingLibrary.svelte";
  import EvidenceWorkspace from "./EvidenceWorkspace.svelte";
  import CaseDialogue from "./CaseDialogue.svelte";
  import HearingView from "./HearingView.svelte";
  import AssistantDock, { type DockSeed } from "./AssistantDock.svelte";
  import AccountMenu from "./AccountMenu.svelte";
  import { t } from "../lib/i18n/index.svelte";
  import { maybeStartTour, startTour } from "../lib/tour";

  type Tab = "hearing" | "evidence" | "documents" | "practice" | "settings";

  const icons = {
    hearing: AudioLines,
    evidence: GitBranch,
    documents: FileText,
    practice: Gavel,
    settings: Settings,
  };

  const titles = {
    hearing: "tab.hearing",
    evidence: "tab.evidence",
    documents: "tab.documents",
    practice: "tab.practice",
    settings: "tab.settings",
  } as const satisfies Record<Tab, string>;

  const tabKeys = Object.keys(titles) as Tab[];
  const isTab = (value: string | null): value is Tab =>
    !!value && (tabKeys as string[]).includes(value);

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

  let tab = $state<Tab>("hearing");

  let hearingId = $state<string | null>(null);

  /** The case assistant floats over every case screen. */
  let dockOpen = $state(false);
  let dockSeed = $state<DockSeed | null>(null);

  function ask(seed: Omit<DockSeed, "nonce">) {
    dockSeed = { ...seed, nonce: Date.now() };
    dockOpen = true;
  }

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
        user = null;
      } else if (e instanceof ApiError && e.status === 404) {
        // The case was deleted (here or in another tab): leave it quietly.
        chooseCase(null);
        await loadCases();
      } else error = e instanceof Error ? e.message : t("error.loadCase");
    } finally {
      if (activeCase.current === id && version === refreshVersion.current)
        detailLoading = false;
    }
  };

  const chooseCase = (id: string | null, view?: Partial<Location>) => {
    if (activeCase.current === id) return;
    refreshVersion.current++;
    activeCase.current = id;
    caseId = id;
    detailLoading = !!id;
    hearingId = view?.hearing ?? null;
    tab = view?.tab ?? "hearing";
    detail = null;
    partial = "";
    error = "";
    connected = false;
    dockOpen = false;
    dockSeed = null;
  };

  /** Where the lawyer is, kept in the address so a reload or a shared link returns there. */
  type Location = { case: string | null; tab: Tab; hearing: string | null };

  function readLocation(): Location {
    const params = new URL(window.location.href).searchParams;
    const view = params.get("view");
    return {
      case: params.get("case"),
      tab: isTab(view) ? view : "hearing",
      hearing: params.get("hearing"),
    };
  }

  function locationQuery() {
    const pairs: [string, string][] = [];
    if (caseId) {
      pairs.push(["case", caseId]);
      if (tab !== "hearing") pairs.push(["view", tab]);
      else if (hearingId) pairs.push(["hearing", hearingId]);
    }
    const query = pairs
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");
    return query ? `?${query}` : "";
  }

  /** The location requested by the address when the workspace opened. */
  let requested: Location | null = null;
  let routerReady = false;

  onMount(() => {
    requested = readLocation();
    const back = () => {
      const target = readLocation();
      if (
        target.case &&
        target.case !== caseId &&
        cases.some((c) => c.id === target.case)
      )
        chooseCase(target.case, target);
      else {
        tab = target.tab;
        hearingId = target.hearing;
      }
    };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  });

  $effect(() => {
    void [caseId, tab, hearingId];
    return untrack(() => {
      if (!routerReady || typeof window === "undefined") return;
      const query = locationQuery();
      if (query === window.location.search) return;
      // Opening the workspace normalizes the address; later moves can go back.
      const href = `${resolve("/workspace")}${query}`;
      // The path is resolved above; only the query string changes.
      if (new URL(window.location.href).searchParams.has("case"))
        pushState(href, {}); // eslint-disable-line svelte/no-navigation-without-resolve
      else replaceState(href, {}); // eslint-disable-line svelte/no-navigation-without-resolve
    });
  });

  // A stale hearing in the address (deleted, or from another case) falls back to the list.
  $effect(() => {
    if (detail && hearingId && !detail.hearings.some((h) => h.id === hearingId))
      untrack(() => (hearingId = null));
  });

  function selectTab(next: Tab) {
    tab = next;
    if (next !== "hearing") hearingId = null;
  }

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
            const wanted = requested?.case
              ? list.find((c) => c.id === requested!.case)
              : undefined;
            if (wanted) chooseCase(wanted.id, requested!);
            else chooseCase(list[0]?.id ?? null);
            requested = null;
            routerReady = true;
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

  let liveHearing = $derived(
    audio.status !== "idle" || hearing?.status === "live",
  );

  function openHearing(id: string) {
    hearingId = id;
    tab = "hearing";
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
      data-workspace
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
              {#each tabKeys as key (key)}{@const Icon = icons[key]}<button
                  role="tab"
                  aria-selected={tab === key}
                  aria-controls={`panel-${key}`}
                  id={`tab-${key}`}
                  data-tour={`tab-${key}`}
                  tabindex={tab === key ? 0 : -1}
                  onkeydown={(event) => {
                    const index = tabKeys.indexOf(key);
                    const next =
                      event.key === "ArrowRight"
                        ? tabKeys[(index + 1) % tabKeys.length]
                        : event.key === "ArrowLeft"
                          ? tabKeys[
                              (index + tabKeys.length - 1) % tabKeys.length
                            ]
                          : event.key === "Home"
                            ? tabKeys[0]
                            : event.key === "End"
                              ? tabKeys.at(-1)
                              : null;
                    if (next) {
                      event.preventDefault();
                      selectTab(next);
                      document.getElementById(`tab-${next}`)?.focus();
                    }
                  }}
                  onclick={() => selectTab(key)}
                >
                  <Icon size={16}></Icon>
                  {t(titles[key])}
                  {#if key === "documents"}<span>{detail.documents.length}</span
                    >{/if}
                  {#if key === "hearing" && liveHearing}<i
                      class={styles.liveTab}
                      aria-label={t("hearing.state.live")}
                    ></i>{/if}
                </button>{/each}
            </div>
            <div
              id={`panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`tab-${tab}`}
              class={styles.panel}
              tabindex={-1}
            >
              {#if tab === "practice"}{#key caseId}<CaseDialogue
                    {caseId}
                    kind="practice"
                    {caps}
                    {openHearing}
                  ></CaseDialogue>{/key}{/if}
              {#if tab === "hearing" && !hearing}
                {#if !detail.documents.length && !detail.segments.length && !detail.hearings.length}<section
                    class={tabs.screen}
                  >
                    <header class={tabs.heading}>
                      <h2>{t("ws.start.title")}</h2>
                      <p>{t("ws.start.text")}</p>
                    </header>
                    <div class={tabs.startOptions}>
                      <button
                        class={tabs.startOption}
                        onclick={() => selectTab("documents")}
                      >
                        <FileText size={22} />
                        <span
                          ><strong>{t("ws.start.docs")}</strong><small
                            >{t("ws.start.docsText")}</small
                          ></span
                        >
                        <ArrowRight size={18} />
                      </button>
                    </div>
                    <p class={tabs.note}>
                      <CircleHelp size={15}></CircleHelp>
                      {t("ws.start.then")}
                    </p>
                  </section>{/if}
                {#key caseId}<HearingLibrary
                    {detail}
                    onOpen={openHearing}
                    {refresh}
                    configured={!!caps?.analysis.configured}
                  ></HearingLibrary>{/key}
              {/if}
              {#if tab === "hearing" && hearing}{#key hearing.id}<HearingView
                    caseId={detail.case.id}
                    {detail}
                    {hearing}
                    {caps}
                    {audio}
                    {partial}
                    {connected}
                    {busy}
                    {action}
                    {refresh}
                    onAsk={ask}
                    onBack={() => {
                      hearingId = null;
                    }}
                  />{/key}{/if}
              {#if tab === "evidence"}{#key caseId}<EvidenceWorkspace
                    {caseId}
                    speakers={session?.speakers ?? {}}
                    onAsk={ask}
                    {openHearing}
                  ></EvidenceWorkspace>{/key}{/if}
              {#if tab === "documents"}{#key caseId}<Documents
                    {caseId}
                    documents={detail.documents}
                    run={action}
                    {busy}
                  ></Documents>{/key}{/if}
              {#if tab === "settings"}{#key caseId}<SessionSettings
                    {detail}
                    {busy}
                    run={action}
                    onDeleted={async () => {
                      chooseCase(null);
                      await loadCases();
                    }}
                  ></SessionSettings>{/key}{/if}
            </div>
            {#key caseId}<AssistantDock
                caseId={detail.case.id}
                {caps}
                open={dockOpen}
                onOpen={() => (dockOpen = true)}
                onClose={() => {
                  dockOpen = false;
                }}
                hearing={tab === "hearing" && hearing
                  ? {
                      id: hearing.id,
                      title: hearing.title,
                      live: liveHearing,
                    }
                  : null}
                seed={dockSeed}
                openHearing={(id) => {
                  openHearing(id);
                  if (window.matchMedia("(max-width: 640px)").matches)
                    dockOpen = false;
                }}
              />{/key}
          {/if}{/if}
      </main>
    </div>{/if}{/if}
