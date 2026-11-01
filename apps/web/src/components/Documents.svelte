<script lang="ts">
  import { formatDate, t, tp } from "../lib/i18n/index.svelte";
  import Skeleton from "./Skeleton.svelte";
  import {
    ArrowLeft,
    ArrowRight,
    FileText,
    Search,
    Upload,
    X,
  } from "@lucide/svelte";
  import { api, type Document, type Source } from "../lib/workspace-api";
  import ui from "./workspace.module.css";
  import styles from "./case-tabs.module.css";
  import SourceCard from "./SourceCard.svelte";

  let {
    caseId,
    documents,
    busy,
    run,
  }: {
    caseId: string;
    documents: Document[];
    busy: boolean;
    run: (action: () => Promise<unknown>) => Promise<boolean>;
  } = $props();

  let query = $state("");
  let uploadNotice = $state("");

  let results = $state<Source[] | null>(null);

  let selectedDoc = $state<string | null>(null);

  let chunks = $state<Source[]>([]);
  let pending = $state<"" | "upload" | "search" | "read">("");
  let dragOver = $state(false);

  let reading = $derived(documents.find((d) => d.id === selectedDoc));

  async function withLoading(
    kind: typeof pending,
    operation: () => Promise<unknown>,
  ) {
    if (pending) return;
    pending = kind;
    uploadNotice = "";
    try {
      const saved = await run(operation);
      if (saved && kind === "upload") uploadNotice = t("docs.added");
    } finally {
      pending = "";
    }
  }

  function upload(file: File) {
    void withLoading("upload", async () => {
      const body = new FormData();
      body.append("file", file);
      await api(`/cases/${caseId}/documents`, { method: "POST", body });
    });
  }

  /** File type from the name; Word files have sections instead of pages. */
  function kind(doc: Document) {
    return (doc.name.split(".").pop() ?? "").toUpperCase().slice(0, 5);
  }
</script>

<div class={styles.screen}>
  <header class={styles.heading}>
    <h2>{t("docs.title")}</h2>
    <p>{t("docs.lead")}</p>
  </header>

  <label
    class={styles.dropzone}
    data-over={dragOver}
    aria-disabled={busy || pending === "upload"}
    ondragover={(e) => {
      e.preventDefault();
      dragOver = true;
    }}
    ondragleave={() => (dragOver = false)}
    ondrop={(e) => {
      e.preventDefault();
      dragOver = false;
      const file = e.dataTransfer?.files?.[0];
      if (file && !busy) upload(file);
    }}
  >
    <span class={styles.dropIcon} aria-hidden="true"
      ><Upload size={18}></Upload></span
    >
    <span>
      <strong>
        {pending === "upload" ? t("docs.processing") : t("tabs.docs.drop")}
      </strong>
      <small>{t("docs.formats")}</small>
    </span>
    <input
      class={ui.srOnly}
      type="file"
      accept=".pdf,.docx,.txt,.md"
      disabled={busy}
      onchange={(e) => {
        const file = e.currentTarget.files?.[0];
        if (file) upload(file);
        e.currentTarget.value = "";
      }}
    />
  </label>
  <div class={styles.under}>
    <p class={styles.meta}>{t("docs.note")}</p>
  </div>
  {#if uploadNotice}<p class={`${styles.note} ${styles.error}`} role="status">
      {uploadNotice}
    </p>{/if}

  <form
    class={styles.searchBox}
    style="margin-top: 24px;"
    onsubmit={(e) => {
      e.preventDefault();
      void withLoading("search", async () => {
        const data = await api<{ results: Source[]; method: string }>(
          `/cases/${caseId}/search?q=${encodeURIComponent(query)}`,
        );
        results = data.results;
      });
    }}
  >
    <Search size={18}></Search>
    <label class={ui.srOnly} for="document-search">
      {t("docs.searchLabel")}
    </label>
    <input
      id="document-search"
      value={query}
      oninput={(e) => (query = e.currentTarget.value)}
      minLength={2}
      maxlength={600}
      placeholder={t("docs.searchPlaceholder")}
      required
    />
    <button class={ui.secondary} disabled={busy}>
      {t("docs.search")}
    </button>
  </form>

  {#if pending === "search" || pending === "read"}<div
      class={styles.loadingBlock}
    >
      <Skeleton
        variant="reader"
        label={pending === "search"
          ? t("docs.searchingDocs")
          : t("docs.loadingPassages")}
      />
    </div>{:else if results !== null}
    <div class={styles.readerHead}>
      <h3>
        {t("docs.results")}&#32;
        <small class={styles.meta}>
          {tp("count.passages", results.length)}
        </small>
      </h3>
      <button
        class={styles.ghost}
        disabled={busy}
        onclick={() => {
          results = null;
          query = "";
        }}><X size={14} /> {t("docs.clear")}</button
      >
    </div>
    {#if results.length}<div class={styles.passageList}>
        {#each results as s (s.id)}{#key s.id}<SourceCard source={s} {caseId}
            ></SourceCard>{/key}{/each}
      </div>{:else}<div class={styles.empty}>
        <Search size={28}></Search>
        <h3>{t("docs.noMatchTitle")}</h3>
        <p>{t("docs.noMatchText")}</p>
      </div>{/if}
  {:else if selectedDoc}
    <div class={styles.readerHead}>
      <div>
        <button class={styles.back} onclick={() => (selectedDoc = null)}>
          <ArrowLeft size={14}></ArrowLeft>
          {t("tabs.docs.all")}
        </button>
        <h3>{t("docs.extracted")}</h3>
      </div>
      {#if reading}<span class={styles.meta}>{reading.name}</span>{/if}
    </div>
    <div class={styles.passageList}>
      {#each chunks as s (s.id)}{#key s.id}<SourceCard source={s} {caseId}
          ></SourceCard>{/key}{/each}
    </div>
  {:else}
    <div class={styles.listHead}>
      <h3>{tp("count.documents", documents.length)}</h3>
    </div>
    {#if pending === "upload"}<Skeleton
        variant="rows"
        count={1}
        label={t("docs.processingDoc")}
      />{/if}
    {#if documents.length}<ul class={styles.list}>
        {#each documents as doc (doc.id)}<li>
            <button
              class={styles.row}
              disabled={busy}
              onclick={() =>
                withLoading("read", async () => {
                  chunks = await api<Source[]>(
                    `/cases/${caseId}/documents/${doc.id}/chunks`,
                  );
                  selectedDoc = doc.id;
                  results = null;
                })}
            >
              <FileText size={20}></FileText>
              <span class={styles.rowMain}>
                <strong>{doc.name}</strong>
                <small>
                  {doc.mime.includes("wordprocessing")
                    ? t("docs.textSection")
                    : tp("count.pages", doc.pages)}
                  · {t("tabs.docs.added", { date: formatDate(doc.created_at) })}
                </small>
              </span>
              <span class={styles.rowEnd}>
                <span class={styles.chip}>{kind(doc)}</span>
              </span>
              <ArrowRight size={16}></ArrowRight>
            </button>
          </li>{/each}
      </ul>{:else if pending !== "upload"}<div class={styles.empty}>
        <FileText size={28}></FileText>
        <h3>{t("docs.emptyTitle")}</h3>
        <p>{t("docs.emptyText")}</p>
      </div>{/if}
  {/if}
</div>
