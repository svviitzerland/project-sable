<script lang="ts">
  import { t, type MessageKey } from "../lib/i18n/index.svelte";
  import Skeleton from "./Skeleton.svelte";
  import {
    ArrowRight,
    Check,
    FileText,
    GitBranch,
    Info,
    Mic,
    Search,
    Sparkles,
  } from "@lucide/svelte";
  import { api, relationLabel, speakerName } from "../lib/workspace-api";
  import type { DockSeed } from "./AssistantDock.svelte";
  import styles from "./evidence.module.css";
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

  type NoticeCode = "similarity_advisory" | "links_ready" | "ai_unverified";

  type Graph = {
    nodes: GraphNode[];
    edges: Edge[];
    total_passages: number;
    shown_passages: number;
    notice: string;
    notice_code?: NoticeCode;
  };

  type Filter = "all" | "conflicts" | "supports" | "context" | "open";

  let {
    caseId,
    speakers = {},
    openHearing,
    onAsk,
  }: {
    caseId: string;
    speakers?: Record<string, string>;
    openHearing: (id: string) => void;
    onAsk: (seed: Omit<DockSeed, "nonce">) => void;
  } = $props();

  let graph = $state<Graph | null>(null);
  let loading = $state(true);
  let error = $state("");
  let notice = $state("");
  let busy = $state<MessageKey | "">("");
  let filter = $state<Filter>("all");
  let query = $state("");
  let limit = $state(20);
  let expanded = $state<string | null>(null);

  const order: Record<string, number> = {
    conflicts: 0,
    context: 1,
    supports: 2,
    related: 3,
  };

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
        })
        .finally(() => {
          if (alive) loading = false;
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

  let nodes = $derived(new Map(graph?.nodes.map((n) => [n.id, n]) ?? []));

  let edges = $derived(
    (graph?.edges ?? [])
      .slice()
      .sort(
        (a, b) =>
          (order[a.relation] ?? 9) - (order[b.relation] ?? 9) ||
          Number(a.confirmed) - Number(b.confirmed),
      ),
  );

  let counts = $derived({
    conflicts: edges.filter((e) => e.relation === "conflicts").length,
    supports: edges.filter((e) => e.relation === "supports").length,
    context: edges.filter((e) => e.relation === "context").length,
    open: edges.filter((e) => !e.confirmed).length,
  });

  let term = $derived(query.trim().toLocaleLowerCase());

  let visible = $derived(
    edges.filter((e) => {
      if (
        filter === "open"
          ? e.confirmed
          : filter !== "all" && e.relation !== filter
      )
        return false;
      if (!term) return true;
      const a = nodes.get(e.source_id),
        b = nodes.get(e.target_id);
      return [e.explanation, a?.text, b?.text, a?.label, b?.label]
        .join(" ")
        .toLocaleLowerCase()
        .includes(term);
    }),
  );

  function title(n: GraphNode | undefined) {
    if (!n) return "";
    if (n.kind === "statement") return speakerName(n.label, speakers);
    const page =
      /^Page (\d+)$/.exec(n.detail)?.[1] ?? (n.detail ? null : n.page);
    return page
      ? `${n.label} · ${t("common.page", { page })}`
      : `${n.label} · ${n.detail}`;
  }

  function reference(n: GraphNode) {
    return n.kind === "statement" ? n.id : `passage:${n.id}`;
  }

  const noticeText = (code: NoticeCode | undefined, fallback: string) =>
    code ? t(`evidence.notice.${code}` as MessageKey) : fallback;
</script>

{#snippet side(n: GraphNode | undefined, quote: string)}
  {#if n}
    <div class={styles.side} data-kind={n.kind}>
      <span class={styles.sideLabel}>
        {#if n.kind === "statement"}<Mic size={12}></Mic>{:else}<FileText
            size={12}
          ></FileText>{/if}
        {title(n)}
      </span>
      <p>{quote || n.text}</p>
    </div>
  {/if}
{/snippet}

<div class={styles.view}>
  <header class={styles.head}>
    <div>
      <h1>{t("evidence.title")}</h1>
      <p>{t("evidence.lead")}</p>
    </div>
    <button
      class={styles.secondary}
      disabled={!!busy}
      onclick={() =>
        run("evidence.finding", async () => {
          const result = await api<{
            notice: string;
            notice_codes?: NoticeCode[];
          }>(`/cases/${caseId}/graph/build`, { method: "POST" });
          notice = result.notice_codes?.length
            ? result.notice_codes.map((code) => noticeText(code, "")).join(" ")
            : result.notice;
          await load();
        })}
    >
      <GitBranch size={15}></GitBranch>
      {busy === "evidence.finding" ? t("evidence.finding") : t("evidence.find")}
    </button>
  </header>

  {#if error}<p class={styles.alert} role="alert">{error}</p>{/if}
  {#if notice}<p class={styles.note} role="status">
      <Info size={14}></Info>
      {notice}
    </p>{/if}

  {#if !graph}
    {#if loading}<Skeleton
        variant="rows"
        label={t("evidence.loading")}
      />{:else}
      <div class={styles.empty}>
        <h3>{t("tabs.evidence.loadFailed")}</h3>
        <button
          class={styles.secondary}
          onclick={() => run("evidence.loading", load)}
          >{t("common.tryAgain")}</button
        >
      </div>
    {/if}
  {:else}
    <div class={styles.stats} role="group" aria-label={t("evidence.filter")}>
      {#each [["all", edges.length], ["conflicts", counts.conflicts], ["supports", counts.supports], ["context", counts.context], ["open", counts.open]] as [key, count] (key)}
        <button
          aria-pressed={filter === key}
          data-filter={key}
          onclick={() => {
            filter = key as Filter;
            limit = 20;
          }}
        >
          <b>{count}</b>
          <span>{t(`evidence.stat.${key}` as MessageKey)}</span>
        </button>
      {/each}
    </div>

    <label class={styles.search}>
      <Search size={15}></Search>
      <span class={styles.srOnly}>{t("evidence.searchList")}</span>
      <input
        type="search"
        placeholder={t("evidence.searchList")}
        bind:value={query}
      />
    </label>

    {#if visible.length}
      <ul class={styles.list}>
        {#each visible.slice(0, limit) as e (e.id)}{@const a = nodes.get(
            e.source_id,
          )}{@const b = nodes.get(e.target_id)}
          <li class={styles.card} data-relation={e.relation}>
            <div class={styles.cardTop}>
              <span class={styles.pill} data-relation={e.relation}
                >{relationLabel(e.relation)}</span
              >
              <small>
                {e.kind === "finding"
                  ? t("evidence.fromFinding")
                  : e.confirmed
                    ? t("evidence.confirmed")
                    : t("evidence.suggested")}
              </small>
            </div>
            <div class={styles.pair}>
              {@render side(a, e.source_quote)}
              <span class={styles.versus} aria-hidden="true"
                >{e.relation === "conflicts" ? "≠" : "↔"}</span
              >
              {@render side(b, e.target_quote)}
            </div>
            {#if e.explanation}<p
                class={styles.why}
                data-full={expanded === e.id || undefined}
              >
                {e.explanation}
              </p>
              {#if e.explanation.length > 260}<button
                  class={styles.link}
                  aria-expanded={expanded === e.id}
                  onclick={() => (expanded = expanded === e.id ? null : e.id)}
                  >{expanded === e.id
                    ? t("finding.showLess")
                    : t("finding.showMore")}</button
                >{/if}{/if}
            <div class={styles.actions}>
              {#if e.kind === "evidence"}<button
                  class={e.confirmed ? styles.secondary : styles.primary}
                  disabled={!!busy}
                  onclick={() =>
                    run("evidence.savingReview", async () => {
                      await api(`/cases/${caseId}/links/${e.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ confirmed: !e.confirmed }),
                      });
                      await load();
                    })}
                >
                  <Check size={14}></Check>
                  {e.confirmed ? t("evidence.reopen") : t("evidence.confirm")}
                </button>{/if}
              {#if a?.hearing_id}<button
                  class={styles.link}
                  onclick={() => openHearing(a.hearing_id!)}
                >
                  {t("common.openHearing")}
                  <ArrowRight size={13}></ArrowRight>
                </button>{/if}
              {#if a && b}<button
                  class={styles.link}
                  onclick={() =>
                    onAsk({
                      text: t("dock.ask.connection"),
                      references: [reference(a), reference(b)],
                      label: `${title(a)} ↔ ${title(b)}`,
                    })}
                >
                  <Sparkles size={13}></Sparkles>
                  {t("finding.askJude")}
                </button>{/if}
            </div>
          </li>
        {/each}
      </ul>
      {#if visible.length > limit}<button
          class={styles.moreButton}
          onclick={() => (limit += 20)}
          >{t("evidence.showMore", { count: visible.length - limit })}</button
        >{/if}
    {:else}
      <div class={styles.empty}>
        <GitBranch size={26}></GitBranch>
        <h3>
          {edges.length
            ? t("evidence.noMatchTitle")
            : t("evidence.noConnectionsTitle")}
        </h3>
        <p>
          {edges.length
            ? t("evidence.noMatchText")
            : t("evidence.noConnectionsText")}
        </p>
      </div>
    {/if}
    <p class={styles.footnote}>
      <Info size={13}></Info>
      {noticeText(graph.notice_code, graph.notice)}
    </p>
  {/if}
</div>
