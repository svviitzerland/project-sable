<script lang="ts">
  import { t, tp, type MessageKey } from "../lib/i18n/index.svelte";
  import Skeleton from "./Skeleton.svelte";
  import {
    ArrowLeft,
    ArrowRight,
    Check,
    ChevronDown,
    Download,
    FileText,
    GitBranch,
    Info,
    Link2,
    MessageSquare,
    Plus,
    Search,
    X,
  } from "@lucide/svelte";
  import {
    api,
    relationLabel,
    speakerName,
    type Source,
    type Citation,
  } from "../lib/workspace-api";
  import ui from "./workspace.module.css";
  import styles from "./case-tabs.module.css";
  import { untrack } from "svelte";
  import { arcPath, crossPath, layoutEvidenceMap } from "../lib/evidence-map";

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
    notice_code?: NoticeCode;
  };

  type NoticeCode =
    | "similarity_advisory"
    | "links_ready"
    | "embeddings_partial"
    | "ai_unverified";

  type Answer = {
    answer: string | null;
    citations: Citation[];
    sources: Source[];
    method: string;
    notice: string;
    notice_code?: "no_passages" | "ai_off" | "answer_unverified" | "ai_failed";
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

  let {
    caseId,
    openHearing,
    askAssistant,
  }: {
    caseId: string;
    openHearing: (id: string) => void;
    askAssistant: (reference: string) => void;
  } = $props();

  let graph = $state<Graph | null>(null);
  let graphLoading = $state(true);

  let query = $state("");

  let answer = $state<Answer | null>(null);

  let error = $state("");

  let notice = $state("");

  let busy = $state<MessageKey | "">("");

  let selected = $state<string | null>(null);

  let edgeId = $state<string | null>(null);

  let view = $state<"graph" | "list">("graph");

  let hovered = $state<string | null>(null);

  let linking = $state(false);

  let target = $state("");

  let relation = $state("related");

  let explanation = $state("");

  /** Unnamed recorded speakers read "Speaker 1" rather than their raw key. */
  function named(data: Graph): Graph {
    for (const n of data.nodes)
      if (n.kind === "statement") n.label = speakerName(n.label, {});
    return data;
  }

  async function load() {
    graphLoading = !graph;
    try {
      graph = named(await api<Graph>(`/cases/${caseId}/graph`));
    } finally {
      graphLoading = false;
    }
  }

  $effect(() => {
    void [caseId];
    return untrack(() => {
      let alive = true;
      api<Graph>(`/cases/${caseId}/graph`)
        .then((data) => {
          if (alive) graph = named(data);
        })
        .catch((e) => {
          if (alive) error = e.message;
        })
        .finally(() => {
          if (alive) graphLoading = false;
        });
      return () => {
        alive = false;
      };
    });
  });

  async function run(label: MessageKey, fn: () => Promise<void>) {
    busy = label;
    error = "";
    try {
      await fn();
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = "";
    }
  }

  let sourceFromSearch = $derived(
    answer?.sources.find((s) => s.id === selected),
  );

  let node = $derived(
    graph?.nodes.find((n) => n.id === selected) ??
      (sourceFromSearch
        ? {
            id: sourceFromSearch.id,
            kind: "passage" as const,
            label: sourceFromSearch.document_name,
            detail: sourceFromSearch.section,
            text: sourceFromSearch.text,
            document_id: sourceFromSearch.document_id,
            page: sourceFromSearch.page,
          }
        : null),
  );

  let edge = $derived(graph?.edges.find((e) => e.id === edgeId));

  let neighbours = $derived(
    node && graph
      ? graph.edges.filter(
          (e) => e.source_id === node.id || e.target_id === node.id,
        )
      : [],
  );

  let nodeMap = $derived(new Map(graph?.nodes.map((n) => [n.id, n]) ?? []));

  // Fixed row heights: labels in the structured map cannot collide.
  const MAP_SIZES = { row: 48, groupHead: 36, groupGap: 16 };

  let layout = $derived(
    layoutEvidenceMap(graph?.nodes ?? [], graph?.edges ?? [], MAP_SIZES),
  );

  /** The node being traced: hover first, then the selected node or edge. */
  let focusIds = $derived.by(() => {
    const id = hovered ?? selected;
    if (id && nodeMap.has(id)) {
      const ids = new Set([
        id,
        ...(graph?.edges ?? []).flatMap((e) =>
          e.source_id === id
            ? [e.target_id]
            : e.target_id === id
              ? [e.source_id]
              : [],
        ),
      ]);
      return { nodes: ids, edge: null as string | null, node: id };
    }
    if (edge) {
      return {
        nodes: new Set([edge.source_id, edge.target_id]),
        edge: edge.id,
        node: null,
      };
    }
    return null;
  });

  function edgeActive(e: Edge) {
    if (!focusIds) return null;
    return focusIds.edge
      ? e.id === focusIds.edge
      : e.source_id === focusIds.node || e.target_id === focusIds.node;
  }

  function nodePage(n: GraphNode) {
    const page =
      /^Page (\d+)$/.exec(n.detail)?.[1] ?? (n.detail ? null : n.page);
    return page ? String(page) : null;
  }

  /** Compact row label: "Hal. 5" for a page, otherwise the section name. */
  function shortLabel(n: GraphNode) {
    if (n.kind === "statement") return n.label;
    const page = nodePage(n);
    return page ? t("evidence.pageShort", { page }) : n.detail;
  }

  /** Name that tells two passages of one document apart. */
  function nodeName(n: GraphNode | undefined) {
    if (!n) return "";
    return n.kind === "statement" ? n.label : `${n.label} · ${shortLabel(n)}`;
  }

  function trace(id: string | null) {
    hovered = id;
  }

  function noticeText(code: NoticeCode | undefined, fallback: string) {
    return code ? t(`evidence.notice.${code}` as MessageKey) : fallback;
  }

  const inspectorReturn = {
    current: null as HTMLElement | SVGElement | null,
  };

  function focusInspector() {
    if (
      !document
        .getElementById("evidence-detail")
        ?.contains(document.activeElement)
    )
      inspectorReturn.current = document.activeElement as
        HTMLElement | SVGElement;
    if (window.innerWidth < 1000)
      requestAnimationFrame(() => {
        const inspector = document.getElementById("evidence-detail");
        inspector?.focus({ preventScroll: true });
        inspector?.scrollIntoView({ behavior: "instant", block: "start" });
      });
  }

  /** Passage pages and statement labels come from the server in English. */
  function nodeDetail(n: GraphNode) {
    if (n.kind === "statement") return t("evidence.hearingStatement");
    const page = nodePage(n);
    return page ? t("common.page", { page }) : n.detail;
  }

  const basisKeys: Record<string, MessageKey> = {
    ai: "evidence.basis.ai",
    semantic: "evidence.basis.semantic",
    keywords: "evidence.basis.keywords",
    imported: "evidence.basis.imported",
  };

  function inspect(id: string) {
    selected = id;
    edgeId = null;
    linking = false;
    focusInspector();
  }

  function inspectEdge(id: string) {
    edgeId = id;
    selected = null;
    linking = false;
    focusInspector();
  }
</script>

<div class={`${styles.screen} ${styles.wide}`}>
  <header class={styles.heading}>
    <h2>{t("evidence.title")}</h2>
    <p>{t("evidence.lead")}</p>
    <div class={styles.headingActions}>
      <button
        class={styles.ghost}
        disabled={!!busy}
        onclick={() =>
          run("evidence.finding", async () => {
            const result = await api<{
              notice: string;
              notice_codes?: NoticeCode[];
              scope: string;
            }>(`/cases/${caseId}/graph/build`, { method: "POST" });
            notice = result.notice_codes?.length
              ? result.notice_codes
                  .map((code) => noticeText(code, ""))
                  .join(" ")
              : result.notice;
            await load();
          })}
      >
        <GitBranch size={16}></GitBranch>
        {t("evidence.find")}
      </button>
    </div>
  </header>
  <form
    class={`${styles.searchBox} ${styles.ask}`}
    onsubmit={(e) => {
      e.preventDefault();
      void run("evidence.searching", async () => {
        answer = await api<Answer>(`/cases/${caseId}/ask`, {
          method: "POST",
          body: JSON.stringify({ query }),
        });
      });
    }}
  >
    <Search size={20}></Search>
    <label class={ui.srOnly} for="ask-evidence">{t("evidence.ask")}</label>
    <input
      id="ask-evidence"
      value={query}
      oninput={(e) => (query = e.currentTarget.value)}
      placeholder={t("evidence.askPlaceholder")}
      required
      minLength={2}
      maxlength={600}
    />
    <button class={ui.primary} disabled={!!busy}>
      {t("evidence.searchEvidence")}
      <ArrowRight size={16}></ArrowRight>
    </button>
  </form>
  <div class={styles.under}>
    <p class={styles.meta}>{t("tabs.evidence.askHint")}</p>
    {#if busy && busy !== "evidence.searching"}<p
        class={styles.meta}
        role="status"
      >
        {t(busy)}
      </p>{/if}
  </div>
  {#if error}<p class={`${ui.error} ${styles.error}`} role="alert">
      {error}
    </p>{/if}
  {#if notice}<p class={`${styles.note} ${styles.error}`} role="status">
      <Info size={15}></Info>
      {notice}
    </p>{/if}
  {#if busy === "evidence.searching"}<div class={styles.answer}>
      <Skeleton variant="reader" label={t("evidence.searching")} />
    </div>{:else if answer}<section
      class={`${styles.surface} ${styles.answer}`}
      aria-labelledby="evidence-answer"
    >
      <div class={styles.answerHead}>
        <h3 id="evidence-answer">
          {answer.answer
            ? t("evidence.groundedAnswer")
            : t("evidence.relevantPassages")}
        </h3>
        <span class={styles.chip}>
          {tp("count.sources", answer.sources.length)}
        </span>
        <button
          class={styles.iconButton}
          aria-label={t("evidence.closeResults")}
          onclick={() => (answer = null)}
        >
          <X size={17}></X>
        </button>
      </div>
      {#if answer.answer}<p class={styles.answerText}>{answer.answer}</p>{/if}
      {#if answer.notice}<p class={`${styles.quiet} ${styles.error}`}>
          {answer.notice_code
            ? t(`evidence.answerNotice.${answer.notice_code}`)
            : answer.notice}
        </p>{/if}
      <ol class={styles.sources}>
        {#each answer.sources as source, index (index)}<li>
            <button onclick={() => inspect(source.id)}>
              <span class={styles.number}>{index + 1}</span>
              <span>
                <strong>{source.document_name}</strong>
                <small
                  >{source.section ||
                    t("common.page", { page: source.page })}</small
                >
                <p>
                  {source.text.slice(0, 210)}
                  {source.text.length > 210 ? "…" : ""}
                </p>
                {#each answer.citations.filter((c) => c.chunk_id === source.id) as c, i (i)}<blockquote
                  >
                    “{c.quote}”
                  </blockquote>{/each}
              </span>
              <ArrowRight size={15}></ArrowRight>
            </button>
          </li>{/each}
      </ol>
    </section>{/if}
  {#if !graph}{#if graphLoading}<div class={styles.loadingBlock}>
        <Skeleton variant="graph" label={t("evidence.loadingMap")} />
      </div>{:else}<div class={styles.empty}>
        <GitBranch size={30}></GitBranch>
        <h3>{t("tabs.evidence.loadFailed")}</h3>
        <div class={styles.emptyActions}>
          <button
            class={ui.secondary}
            onclick={() => run("evidence.loading", load)}
            >{t("evidence.retry")}</button
          >
        </div>
      </div>{/if}{:else}
    <div class={styles.toolbar}>
      <div
        class={styles.segmented}
        role="group"
        aria-label={t("tabs.evidence.view")}
      >
        <button
          aria-pressed={view === "graph"}
          onclick={() => (view = "graph")}
        >
          <GitBranch size={15}></GitBranch>
          {t("evidence.map")}
        </button>
        <button aria-pressed={view === "list"} onclick={() => (view = "list")}>
          <Link2 size={15}></Link2>
          {t("evidence.connections")}
        </button>
      </div>
      <div class={styles.toolbarEnd}>
        <div class={styles.legend}>
          {#each Object.entries(relationColors) as [name, color] (name)}<span>
              <i style={`background: ${color};`}></i>
              {relationLabel(name)}
            </span>{/each}
        </div>
        <span class={styles.meta}>
          {t("evidence.summary", {
            passages: graph.total_passages,
            connections: graph.edges.length,
          })}
        </span>
      </div>
    </div>
    <div class={styles.evidenceLayout}>
      <section class={styles.canvas} aria-label={t("evidence.relationships")}>
        {#if view === "graph"}
          {#if layout.groups.length}
            {@const hasStatements = layout.statements.length > 0}
            {@const hasArcs = layout.arcs.length > 0}
            <div
              class={styles.map}
              data-traced={focusIds ? "" : undefined}
              role="group"
              aria-label={t("evidence.graph")}
              style={`--row: ${MAP_SIZES.row}px; --group-head: ${MAP_SIZES.groupHead}px; grid-template-columns: ${hasStatements ? "minmax(0, 1fr) var(--gutter) " : ""}minmax(0, 1.2fr)${hasArcs ? " var(--arc)" : ""};`}
            >
              {#if hasStatements}<div class={styles.mapHead}>
                  {t("evidence.column.statements")}
                </div>
                <div class={styles.mapHead} aria-hidden="true"></div>{/if}
              <div class={styles.mapHead}>{t("evidence.column.passages")}</div>
              {#if hasArcs}<div
                  class={styles.mapHead}
                  aria-hidden="true"
                ></div>{/if}
              {#if hasStatements}
                <ul
                  class={styles.mapColumn}
                  style={`height: ${layout.height}px;`}
                  aria-label={t("evidence.column.statements")}
                >
                  {#each layout.statements as s (s.node.id)}{@const n = s.node}
                    <li style={`top: ${s.top}px;`}>
                      <button
                        data-node
                        data-on={focusIds?.nodes.has(n.id) ? "" : undefined}
                        class={`${styles.mapNode} ${styles.mapStatement}`}
                        aria-pressed={selected === n.id}
                        aria-label={`${n.label}, ${nodeDetail(n)}`}
                        title={n.text}
                        onclick={() => inspect(n.id)}
                        onpointerenter={() => trace(n.id)}
                        onpointerleave={() => trace(null)}
                        onfocus={() => trace(n.id)}
                        onblur={() => trace(null)}
                      >
                        <strong>{n.label}</strong>
                        <span>{n.text}</span>
                        <i aria-hidden="true"></i>
                      </button>
                    </li>{/each}
                </ul>
                <svg
                  class={styles.mapEdges}
                  viewBox={`0 0 100 ${layout.height}`}
                  preserveAspectRatio="none"
                  style={`height: ${layout.height}px;`}
                >
                  {#each layout.cross as e (e.id)}{@const active =
                      edgeActive(e)}{@const d = crossPath(layout, e)}<path
                      {d}
                      class={styles.edgeLine}
                      data-state={active === null
                        ? undefined
                        : active
                          ? "on"
                          : "off"}
                      stroke={relationColors[e.relation]}
                      stroke-dasharray={e.confirmed ? "" : "4 4"}
                    ></path>
                    <path
                      {d}
                      class={styles.edgeHit}
                      role="button"
                      tabindex={0}
                      aria-label={t("evidence.edgeLabel", {
                        relation: relationLabel(e.relation),
                        from: nodeName(nodeMap.get(e.source_id)),
                        to: nodeName(nodeMap.get(e.target_id)),
                      })}
                      onclick={() => inspectEdge(e.id)}
                      onkeydown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          inspectEdge(e.id);
                        }
                      }}
                    ></path>{/each}
                </svg>
              {/if}
              <div
                class={styles.mapColumn}
                style={`height: ${layout.height}px;`}
              >
                {#each layout.groups as g (g.id)}<p
                    class={styles.mapGroup}
                    style={`top: ${g.top}px;`}
                    title={g.name}
                  >
                    <FileText size={14}></FileText>
                    <span>{g.name}</span>
                  </p>
                  <ul aria-label={g.name}>
                    {#each g.rows as r (r.node.id)}{@const n = r.node}
                      <li style={`top: ${r.top}px;`}>
                        <button
                          data-node
                          data-on={focusIds?.nodes.has(n.id) ? "" : undefined}
                          class={`${styles.mapNode} ${styles.mapPassage}`}
                          aria-pressed={selected === n.id}
                          aria-label={`${n.label}, ${nodeDetail(n)}`}
                          title={n.text}
                          onclick={() => inspect(n.id)}
                          onpointerenter={() => trace(n.id)}
                          onpointerleave={() => trace(null)}
                          onfocus={() => trace(n.id)}
                          onblur={() => trace(null)}
                        >
                          {#if layout.ports.cross.has(n.id)}<i
                              aria-hidden="true"
                            ></i>{/if}
                          <strong>{shortLabel(n)}</strong>
                          <span>{n.text}</span>
                          {#if layout.ports.arc.has(n.id)}<b aria-hidden="true"
                            ></b>{/if}
                        </button>
                      </li>{/each}
                  </ul>{/each}
              </div>
              {#if hasArcs}<svg
                  class={styles.mapEdges}
                  viewBox={`0 0 100 ${layout.height}`}
                  preserveAspectRatio="none"
                  style={`height: ${layout.height}px;`}
                >
                  {#each layout.arcs as e (e.id)}{@const active =
                      edgeActive(e)}{@const d = arcPath(layout, e)}<path
                      {d}
                      class={styles.edgeLine}
                      data-state={active === null
                        ? undefined
                        : active
                          ? "on"
                          : "off"}
                      stroke={relationColors[e.relation]}
                      stroke-dasharray={e.confirmed ? "" : "4 4"}
                    ></path>
                    <path
                      {d}
                      class={styles.edgeHit}
                      role="button"
                      tabindex={0}
                      aria-label={t("evidence.edgeLabel", {
                        relation: relationLabel(e.relation),
                        from: nodeName(nodeMap.get(e.source_id)),
                        to: nodeName(nodeMap.get(e.target_id)),
                      })}
                      onclick={() => inspectEdge(e.id)}
                      onkeydown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          inspectEdge(e.id);
                        }
                      }}
                    ></path>{/each}
                </svg>{/if}
            </div>
            <p class={styles.caption}>{t("evidence.mapCaption")}</p>
            {#if layout.unlinked}<p class={styles.caption}>
                {t("evidence.mapUnlinked", { count: layout.unlinked })}
              </p>{/if}
            {#if graph.total_passages > graph.shown_passages}<p
                class={styles.caption}
              >
                {t("evidence.mapLimit", {
                  shown: graph.shown_passages,
                  total: graph.total_passages,
                })}
              </p>{/if}
          {:else}<div class={styles.empty}>
              <GitBranch size={30}></GitBranch>
              <h3>{t("evidence.emptyTitle")}</h3>
              <p>{t("evidence.emptyText")}</p>
            </div>{/if}
        {:else if graph.edges.length}<ul class={styles.edgeList}>
            {#each graph.edges as e (e.id)}<li>
                <button
                  aria-pressed={edgeId === e.id}
                  onclick={() => {
                    inspectEdge(e.id);
                  }}
                >
                  <span
                    class={styles.relation}
                    style={`color: ${relationTextColors[e.relation]}; margin: 0;`}
                  >
                    {relationLabel(e.relation)}
                  </span>
                  <strong>
                    {nodeName(nodeMap.get(e.source_id))}&#32;
                    <ArrowRight size={12}></ArrowRight>&#32;
                    {nodeName(nodeMap.get(e.target_id))}
                  </strong>
                  <span
                    class={`${styles.chip} ${e.confirmed ? styles.chipDone : ""}`}
                  >
                    {e.confirmed
                      ? t("common.reviewed")
                      : t("evidence.suggested")}
                  </span>
                </button>
              </li>{/each}
          </ul>{:else}<div class={styles.empty}>
            <Link2 size={30}></Link2>
            <h3>{t("evidence.noConnectionsTitle")}</h3>
            <p>{t("evidence.noConnectionsText")}</p>
          </div>{/if}
      </section>
      <aside
        id="evidence-detail"
        tabindex="-1"
        class={styles.inspector}
        aria-label={t("evidence.inspector")}
      >
        {#if edge || node}<button
            class={`${styles.back} ${styles.inspectorBack}`}
            onclick={() => {
              const origin = inspectorReturn.current;
              origin?.focus();
              origin?.scrollIntoView({
                behavior: "instant",
                block: "center",
              });
            }}
          >
            <ArrowLeft size={14}></ArrowLeft>
            {t("evidence.back")}
          </button>{/if}
        {#if edge}
          <h3>{t("evidence.examine")}</h3>
          <span
            class={styles.relation}
            style={`color: ${relationTextColors[edge.relation]};`}
          >
            {relationLabel(edge.relation)} ·&#32;
            {edge.confirmed
              ? t("evidence.reviewedLower")
              : t("evidence.suggestedLower")}
          </span>
          <p class={styles.passage}>{edge.explanation}</p>
          <div class={styles.edgeQuote}>
            <button onclick={() => inspect(edge.source_id)}>
              {nodeName(nodeMap.get(edge.source_id))}
              <ArrowRight size={14}></ArrowRight>
            </button>
            <blockquote>“{edge.source_quote}”</blockquote>
          </div>
          <div class={styles.edgeQuote}>
            <button onclick={() => inspect(edge.target_id)}>
              {nodeName(nodeMap.get(edge.target_id))}
              <ArrowRight size={14}></ArrowRight>
            </button>
            <blockquote>“{edge.target_quote}”</blockquote>
          </div>
          <p class={`${styles.caption} ${styles.edgeQuote}`}>
            {t(basisKeys[edge.basis] ?? "evidence.basis.recorded")}.&#32;
            {edge.score !== null
              ? t("evidence.similarity", {
                  value: (edge.score * 100).toFixed(0),
                })
              : ""}
          </p>
          {#if edge.kind === "evidence"}<button
              class={ui.primary}
              style="margin-top: 16px;"
              disabled={!!busy}
              onclick={() =>
                run("evidence.savingReview", async () => {
                  await api(`/cases/${caseId}/links/${edge.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      confirmed: !edge.confirmed,
                    }),
                  });
                  await load();
                })}
            >
              <Check size={16}></Check>
              {edge.confirmed ? t("evidence.reopen") : t("evidence.confirm")}
            </button>{/if}
        {:else}{#if node}
            <h3>{node.label}</h3>
            <span class={styles.meta}>{nodeDetail(node)}</span>
            <p class={styles.passage}>{node.text}</p>
            <div class={styles.actionsStack}>
              <button
                class={ui.secondary}
                onclick={() =>
                  askAssistant(
                    node.kind === "statement" ? node.id : `passage:${node.id}`,
                  )}
              >
                <MessageSquare size={15}></MessageSquare>
                {t("evidence.discuss")}
              </button>
              {#if node.hearing_id}<button
                  class={styles.ghost}
                  onclick={() => openHearing(node.hearing_id!)}
                >
                  {t("common.openHearing")}
                  <ArrowRight size={14}></ArrowRight>
                </button>{/if}
              {#if node.document_id}<a
                  class={styles.ghost}
                  rel="external"
                  href={`/api/v1/cases/${caseId}/documents/${node.document_id}/original`}
                >
                  <Download size={14}></Download>
                  {t("common.downloadOriginal")}
                </a>{/if}
            </div>
            {#if neighbours.length}<h4>{t("evidence.connected")}</h4>
              <div class={styles.neighbors}>
                {#each neighbours as e (e.id)}<button
                    onclick={() => {
                      inspectEdge(e.id);
                    }}
                  >
                    <span>{relationLabel(e.relation)}</span>
                    <strong
                      >{nodeName(
                        nodeMap.get(
                          e.source_id === node.id ? e.target_id : e.source_id,
                        ),
                      )}</strong
                    >
                    <ArrowRight size={13}></ArrowRight>
                  </button>{/each}
              </div>{/if}
            {#if node.kind === "passage"}
              <h4>{t("tabs.evidence.linkHeading")}</h4>
              <button
                class={styles.ghost}
                aria-expanded={linking}
                onclick={() => (linking = !linking)}
              >
                <Plus size={15}></Plus>
                {t("evidence.link")}
              </button>
              {#if linking}<form
                  class={styles.linkForm}
                  onsubmit={(e) => {
                    e.preventDefault();
                    void run("evidence.savingConnection", async () => {
                      await api(`/cases/${caseId}/links`, {
                        method: "POST",
                        body: JSON.stringify({
                          source_id: node.id,
                          target_id: target,
                          relation,
                          explanation,
                        }),
                      });
                      linking = false;
                      explanation = "";
                      await load();
                    });
                  }}
                >
                  <label>
                    {t("evidence.otherPassage")}
                    <select
                      value={target}
                      onchange={(e) => (target = e.currentTarget.value)}
                      required
                    >
                      <option value="">{t("evidence.choosePassage")}</option>
                      {#each graph.nodes.filter((n) => n.kind === "passage" && n.id !== node.id) as n (n.id)}<option
                          value={n.id}
                        >
                          {n.label} · {nodeDetail(n)}
                        </option>{/each}
                    </select>
                  </label>
                  <label>
                    {t("evidence.relationship")}
                    <select
                      value={relation}
                      onchange={(e) => (relation = e.currentTarget.value)}
                    >
                      {#each Object.keys(relationColors) as r (r)}<option
                          value={r}
                        >
                          {relationLabel(r)}
                        </option>{/each}
                    </select>
                  </label>
                  <label>
                    {t("evidence.why")}
                    <textarea
                      value={explanation}
                      oninput={(e) => (explanation = e.currentTarget.value)}
                      required
                      minLength={3}
                      maxlength={2000}
                      rows={3}></textarea>
                  </label>
                  <button class={ui.primary} disabled={!!busy}>
                    {t("evidence.saveLink")}
                  </button>
                </form>{/if}
            {/if}
          {:else}<div class={styles.empty}>
              <FileText size={28}></FileText>
              <h3>{t("evidence.inspectorEmptyTitle")}</h3>
              <p>{t("evidence.inspectorEmptyText")}</p>
            </div>{/if}{/if}
      </aside>
    </div>
    {#if graph.notice}<p class={`${styles.note} ${styles.error}`}>
        <Info size={15}></Info>
        {noticeText(graph.notice_code, graph.notice)}
      </p>{/if}
    <details class={styles.passages}>
      <summary>
        {t("evidence.browse", { count: graph.nodes.length })}
        <ChevronDown size={15}></ChevronDown>
      </summary>
      <ul>
        {#each graph.nodes as n (n.id)}<li>
            <button onclick={() => inspect(n.id)}>
              <span>{n.label}</span>
              <span>{nodeDetail(n)}</span>
            </button>
          </li>{/each}
      </ul>
    </details>
  {/if}
</div>
