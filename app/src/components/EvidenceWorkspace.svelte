<script lang="ts">
  import {
    ArrowRight,
    Check,
    Download,
    FileText,
    GitBranch,
    Link2,
    LoaderCircle,
    Plus,
    Search,
    X,
    ZoomIn,
    ZoomOut,
  } from "@lucide/svelte";
  import { api, type Source, type Citation } from "../lib/workspace-api";
  import ui from "./workspace.module.css";
  import styles from "./casebook.module.css";
  import { untrack } from "svelte";

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
  };

  type Answer = {
    answer: string | null;
    citations: Citation[];
    sources: Source[];
    method: string;
    notice: string;
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

  let query = $state("");

  let answer = $state<Answer | null>(null);

  let error = $state("");

  let notice = $state("");

  let busy = $state("");

  let selected = $state<string | null>(null);

  let edgeId = $state<string | null>(null);

  let view = $state<"graph" | "list">("graph");

  let zoom = $state(1);

  let linking = $state(false);

  let target = $state("");

  let relation = $state("related");

  let explanation = $state("");

  async function load() {
    graph = await api<Graph>(`/cases/${caseId}/graph`);
  }

  $effect(() => {
    void [caseId];
    return untrack(() => {
      let alive = true;
      api<Graph>(`/cases/${caseId}/graph`)
        .then((data) => {
          if (alive) graph = data;
        })
        .catch((e) => {
          if (alive) error = e.message;
        });
      return () => {
        alive = false;
      };
    });
  });

  async function run(label: string, fn: () => Promise<void>) {
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
            detail: `Page ${sourceFromSearch.page}`,
            text: sourceFromSearch.text,
            document_id: sourceFromSearch.document_id,
            page: sourceFromSearch.page,
          }
        : null),
  );

  let edge = $derived(graph?.edges.find((e) => e.id === edgeId));

  let nodeMap = $derived(new Map(graph?.nodes.map((n) => [n.id, n]) ?? []));

  let visible = $derived((graph?.nodes ?? []).slice(0, 24));

  let positions = $derived(
    new Map(
      visible.map((n, index) => {
        const angle =
          (index / Math.max(1, visible.length)) * Math.PI * 2 - Math.PI / 2;
        return [
          n.id,
          { x: 400 + Math.cos(angle) * 285, y: 300 + Math.sin(angle) * 215 },
        ];
      }),
    ),
  );

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

<div class={styles.evidence}>
  <div class={styles.sectionHeader}>
    <div>
      <h2>Follow the evidence.</h2>
      <p>
        Ask the case a question. Trace each answer back to its sources and the
        connections between them.
      </p>
    </div>
    <button
      class={ui.secondary}
      disabled={!!busy}
      onclick={() =>
        run("Finding connections…", async () => {
          const result = await api<{ notice: string; scope: string }>(
            `/cases/${caseId}/graph/build`,
            { method: "POST" },
          );
          notice = result.notice + " " + result.scope;
          await load();
        })}
    >
      <GitBranch size={16}></GitBranch>
      Find connections
    </button>
  </div>
  <form
    class={styles.askForm}
    onsubmit={(e) => {
      e.preventDefault();
      void run("Searching the case…", async () => {
        answer = await api<Answer>(`/cases/${caseId}/ask`, {
          method: "POST",
          body: JSON.stringify({ query }),
        });
      });
    }}
  >
    <Search size={20}></Search>
    <label class={ui.srOnly} for="ask-evidence"> Ask about this case </label>
    <input
      id="ask-evidence"
      value={query}
      oninput={(e) => (query = e.currentTarget.value)}
      placeholder="What do the witnesses say about the arrival time?"
      required
      minLength={2}
      maxlength={600}
    />
    <button class={ui.primary} disabled={!!busy}>
      Search evidence
      <ArrowRight size={16}></ArrowRight>
    </button>
  </form>
  {#if error}<p class={ui.error} role="alert">
      {error}
    </p>{/if}
  {#if busy}<p role="status" class={styles.progress}>
      <LoaderCircle size={16}></LoaderCircle>
      {busy}
    </p>{/if}
  {#if notice}<p class={styles.graphNotice} role="status">
      {notice}
    </p>{/if}
  {#if answer}<section class={styles.answer}>
      <header>
        <h3>
          {answer.answer ? "A source-grounded answer" : "Relevant passages"}
        </h3>
        <span>
          {answer.method === "hybrid"
            ? "Semantic + keyword retrieval"
            : "Keyword retrieval"}
        </span>
        <button
          aria-label="Close search results"
          onclick={() => (answer = null)}
        >
          <X size={17}></X>
        </button>
      </header>
      {#if answer.answer}<p>{answer.answer}</p>{/if}
      {#if answer.notice}<p>{answer.notice}</p>{/if}
      <div class={styles.searchSources}>
        {#each answer.sources as source, index (index)}<button
            onclick={() => inspect(source.id)}
          >
            <span>{index + 1}</span>
            <div>
              <strong>{source.document_name}</strong>
              <small>{source.section || `Page ${source.page}`}</small>
              <p>
                {source.text.slice(0, 210)}
                {source.text.length > 210 ? "…" : ""}
              </p>
              {#each answer.citations.filter((c) => c.chunk_id === source.id) as c, i (i)}<blockquote
                >
                  “{c.quote}”
                </blockquote>{/each}
            </div>
            <ArrowRight size={15}></ArrowRight>
          </button>{/each}
      </div>
    </section>{/if}
  {#if !graph}<p class={styles.empty}>Loading evidence…</p>{:else}
    <div class={styles.graphToolbar}>
      <div class={styles.viewSwitch}>
        <button
          aria-pressed={view === "graph"}
          onclick={() => (view = "graph")}
        >
          <GitBranch size={16}></GitBranch>
          Evidence map
        </button>
        <button aria-pressed={view === "list"} onclick={() => (view = "list")}>
          <Link2 size={16}></Link2>
          Connections
        </button>
      </div>
      <span>
        {graph.total_passages} passages · {graph.indexed_passages}&#32; embedded
        · {graph.edges.length} links
      </span>
    </div>
    <div class={styles.graphLayout}>
      <section class={styles.graphCanvas} aria-label="Evidence relationships">
        {#if view === "graph"}
          {#if visible.length}
            <div class={styles.zoom}>
              <button
                aria-label="Zoom in"
                onclick={() => (zoom = Math.min(2, zoom + 0.2))}
              >
                <ZoomIn size={17}></ZoomIn>
              </button>
              <button
                aria-label="Zoom out"
                onclick={() => (zoom = Math.max(0.6, zoom - 0.2))}
              >
                <ZoomOut size={17}></ZoomOut>
              </button>
              <button onclick={() => (zoom = 1)}>Reset</button>
            </div>
            <svg
              role="group"
              aria-label="Interactive evidence graph"
              viewBox={`${400 - 400 / zoom} ${300 - 300 / zoom} ${800 / zoom} ${600 / zoom}`}
              class={styles.graphSvg}
            >
              {#each graph.edges as e (e.id)}{@const a = positions.get(
                  e.source_id,
                )}{@const b = positions.get(e.target_id)}{#if !a || !b}{:else}<g
                  >
                    <line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={relationColors[e.relation]}
                      stroke-width={edgeId === e.id ? 3 : 1.5}
                      stroke-dasharray={e.confirmed ? "" : "5 5"}
                      opacity={selected &&
                      e.source_id !== selected &&
                      e.target_id !== selected
                        ? 0.3
                        : 0.8}
                    ></line>
                    <line
                      role="button"
                      tabindex={0}
                      aria-label={`${e.relation}: ${nodeMap.get(e.source_id)?.label} to ${nodeMap.get(e.target_id)?.label}`}
                      onclick={() => {
                        inspectEdge(e.id);
                      }}
                      onkeydown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          inspectEdge(e.id);
                        }
                      }}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="transparent"
                      stroke-width={14}
                    ></line>
                  </g>{/if}{/each}
              {#each visible as n (n.id)}{@const pos = positions.get(n.id)!}<g
                  transform={`translate(${pos.x},${pos.y})`}
                  role="button"
                  tabindex={0}
                  aria-label={`${n.label}, ${n.detail}`}
                  onclick={() => inspect(n.id)}
                  onkeydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      inspect(n.id);
                    }
                  }}
                >
                  <circle
                    r={selected === n.id ? 23 : 19}
                    fill={n.kind === "statement" ? "#ddc9a6" : "#eff3e9"}
                    stroke={selected === n.id ? "#a66e27" : "#315541"}
                    stroke-width={selected === n.id ? 3 : 1.5}
                  ></circle>
                  <text
                    text-anchor="middle"
                    dominant-baseline="central"
                    class={styles.nodeNumber}
                  >
                    {n.kind === "statement"
                      ? "H"
                      : String(
                          visible
                            .filter((v) => v.kind === "passage")
                            .indexOf(n) + 1,
                        )}
                  </text>
                  <text y={35} text-anchor="middle" class={styles.nodeLabel}>
                    {n.label.length > 23 ? n.label.slice(0, 21) + "…" : n.label}
                  </text>
                  <text y={49} text-anchor="middle" class={styles.nodeDetail}>
                    {n.detail}
                  </text>
                </g>{/each}
            </svg>
            <p class={styles.mapCaption}>
              Select a passage or a connecting line. Dashed connections await
              review. On a small screen, swipe across the map or use
              Connections.
            </p>
          {:else}<div class={styles.empty}>
              <GitBranch size={38}></GitBranch>
              <h3>Build a picture of the case.</h3>
              <p>
                Add case documents or import a .jude case. Their passages will
                appear here, ready to search and connect.
              </p>
            </div>{/if}
        {:else}<div class={styles.edgeList}>
            {#if graph.edges.length}{#each graph.edges as e (e.id)}<button
                  class={edgeId === e.id ? styles.selectedRow : ""}
                  onclick={() => {
                    inspectEdge(e.id);
                  }}
                >
                  <span
                    class={styles.relation}
                    style={`color: ${relationTextColors[e.relation]};`}
                  >
                    {e.relation}
                  </span>
                  <strong>
                    {nodeMap.get(e.source_id)?.label}&#32;
                    <ArrowRight size={12}></ArrowRight>&#32;
                    {nodeMap.get(e.target_id)?.label}
                  </strong>
                  <small>
                    {e.confirmed ? "Reviewed" : "Suggested"} · {e.basis}
                  </small>
                </button>{/each}{:else}<div class={styles.empty}>
                <Link2 size={30}></Link2>
                <h3>No connections yet.</h3>
                <p>
                  Find connections automatically, or select a passage to create
                  your own link.
                </p>
              </div>{/if}
          </div>{/if}
        <div class={styles.legend}>
          {#each Object.entries(relationColors) as [name, color] (name)}<span>
              <i style={`background: ${color};`}></i>
              {name}
            </span>{/each}
        </div>
        {#if graph.nodes.length > 24 && view === "graph"}<p
            class={styles.mapCaption}
          >
            Map shows 24 nodes. All {graph.nodes.length} available nodes are listed
            below; search covers the whole case.
          </p>{/if}
      </section>
      <aside
        id="evidence-detail"
        tabindex="-1"
        class={styles.graphInspector}
        aria-label="Evidence inspector"
      >
        {#if edge || node}<button
            class={styles.inspectorBack}
            onclick={() => {
              const origin = inspectorReturn.current;
              origin?.focus();
              origin?.scrollIntoView({
                behavior: "instant",
                block: "center",
              });
            }}
          >
            Back to evidence
          </button>{/if}
        {#if edge}
          <h3>Examine the connection</h3>
          <span
            class={styles.relation}
            style={`color: ${relationTextColors[edge.relation]};`}
          >
            {edge.relation} ·&#32;
            {edge.confirmed ? "reviewed" : "suggested"}
          </span>
          <p>{edge.explanation}</p>
          <div class={styles.edgeSource}>
            <button onclick={() => inspect(edge.source_id)}>
              {nodeMap.get(edge.source_id)?.label}
              <ArrowRight size={14}></ArrowRight>
            </button>
            <blockquote>“{edge.source_quote}”</blockquote>
          </div>
          <div class={styles.edgeSource}>
            <button onclick={() => inspect(edge.target_id)}>
              {nodeMap.get(edge.target_id)?.label}
              <ArrowRight size={14}></ArrowRight>
            </button>
            <blockquote>“{edge.target_quote}”</blockquote>
          </div>
          <p class={styles.muted}>
            {edge.basis === "ai"
              ? "AI-proposed relationship"
              : edge.basis === "semantic"
                ? "Embedding similarity"
                : edge.basis === "keywords"
                  ? "Shared terms"
                  : edge.basis === "simulation"
                    ? "Authored synthetic example"
                    : edge.basis === "imported"
                      ? "Imported relationship"
                      : "Recorded relationship"}
            .&#32;
            {edge.score !== null
              ? `Similarity ${(edge.score * 100).toFixed(0)}%; not a probability of truth.`
              : ""}
          </p>
          {#if edge.kind === "evidence"}<button
              class={ui.primary}
              disabled={!!busy}
              onclick={() =>
                run("Saving review…", async () => {
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
              {edge.confirmed ? "Reopen connection" : "Confirm connection"}
            </button>{/if}
        {:else}{#if node}
            <h3>{node.label}</h3>
            <span class={styles.muted}>{node.detail}</span>
            <p class={styles.passage}>{node.text}</p>
            {#if node.document_id}<a
                class={ui.textButton}
                rel="external"
                href={`/api/v1/cases/${caseId}/documents/${node.document_id}/original`}
              >
                <Download size={14}></Download>
                Download original
              </a>{/if}
            {#if node.hearing_id}<button
                class={ui.secondary}
                onclick={() => openHearing(node.hearing_id!)}
              >
                Open hearing
                <ArrowRight size={14}></ArrowRight>
              </button>{/if}
            <button
              class={ui.secondary}
              onclick={() =>
                askAssistant(
                  node.kind === "statement" ? node.id : `passage:${node.id}`,
                )}
            >
              Discuss with assistant <ArrowRight size={14}></ArrowRight>
            </button>
            <h4>Connected evidence</h4>
            {#each graph.edges.filter((e) => e.source_id === node.id || e.target_id === node.id) as e (e.id)}<button
                class={styles.neighbor}
                onclick={() => {
                  inspectEdge(e.id);
                }}
              >
                <span>{e.relation}</span>
                {nodeMap.get(
                  e.source_id === node.id ? e.target_id : e.source_id,
                )?.label}
                <ArrowRight size={13}></ArrowRight>
              </button>{/each}
            {#if node.kind === "passage"}
              <button class={ui.secondary} onclick={() => (linking = !linking)}>
                <Plus size={15}></Plus>
                Link another passage
              </button>
              {#if linking}<form
                  class={styles.linkForm}
                  onsubmit={(e) => {
                    e.preventDefault();
                    void run("Saving connection…", async () => {
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
                    Other passage
                    <select
                      value={target}
                      onchange={(e) => (target = e.currentTarget.value)}
                      required
                    >
                      <option value="">Choose a passage</option>
                      {#each graph.nodes.filter((n) => n.kind === "passage" && n.id !== node.id) as n (n.id)}<option
                          value={n.id}
                        >
                          {n.label} · {n.detail}
                        </option>{/each}
                    </select>
                  </label>
                  <label>
                    Relationship
                    <select
                      value={relation}
                      onchange={(e) => (relation = e.currentTarget.value)}
                    >
                      {#each Object.keys(relationColors) as r (r)}<option
                          value={r}
                        >
                          {r}
                        </option>{/each}
                    </select>
                  </label>
                  <label>
                    Why are they connected?
                    <textarea
                      value={explanation}
                      oninput={(e) => (explanation = e.currentTarget.value)}
                      required
                      minLength={3}
                      maxlength={2000}
                      rows={3}></textarea>
                  </label>
                  <button class={ui.primary} disabled={!!busy}>
                    Save confirmed link
                  </button>
                </form>{/if}
            {/if}
          {:else}<div class={styles.empty}>
              <FileText size={31}></FileText>
              <h3>A source behind every connection.</h3>
              <p>
                Select a passage to read the original text, or a link to inspect
                how two pieces of evidence relate.
              </p>
            </div>{/if}{/if}
      </aside>
    </div>
    <p class={styles.graphNotice}>{graph.notice}</p>
    <details class={styles.allPassages}>
      <summary>
        Browse available passages and statements ({graph.nodes.length})
      </summary>
      <div>
        {#each graph.nodes as n (n.id)}<button onclick={() => inspect(n.id)}>
            {n.label}
            <span>{n.detail}</span>
            <ArrowRight size={13}></ArrowRight>
          </button>{/each}
      </div>
    </details>
  {/if}
</div>
