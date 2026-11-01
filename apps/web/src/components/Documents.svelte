<script lang="ts">
  import { t, tp } from "../lib/i18n/index.svelte";
  import Skeleton from "./Skeleton.svelte";
  import {
    BookOpen,
    ChevronRight,
    FileText,
    Search,
    Upload,
    X,
  } from "@lucide/svelte";
  import { api, type Document, type Source } from "../lib/workspace-api";
  import styles from "./workspace.module.css";
  import Empty from "./Empty.svelte";
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
</script>

<div class={styles.documents}>
  <div class={styles.sectionTitle}>
    <div>
      <h2>{t("docs.title")}</h2>
      <p>{t("docs.lead")}</p>
    </div>
  </div>
  <div class={styles.uploadBox}>
    <Upload size={25}></Upload>
    <div>
      <h3>{t("docs.addTitle")}</h3>
      <p>{t("docs.formats")}</p>
      <small>{t("docs.note")}</small>
    </div>
    <label class={styles.secondary}>
      {pending === "upload" ? t("docs.processing") : t("docs.choose")}
      <input
        class={styles.srOnly}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        disabled={busy}
        onchange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (file)
            void withLoading("upload", async () => {
              const body = new FormData();
              body.append("file", file);
              await api(`/cases/${caseId}/documents`, {
                method: "POST",
                body,
              });
            });
          e.currentTarget.value = "";
        }}
      />
    </label>
  </div>
  {#if uploadNotice}<p class={styles.notice} role="status">
      {uploadNotice}
    </p>{/if}
  <form
    class={styles.searchForm}
    onsubmit={(e) => {
      e.preventDefault();
      void withLoading("search", async () => {
        const data = await api<{ results: Source[]; method: string }>(
          `/cases/${caseId}/search?q=${encodeURIComponent(query)}`,
        );
        results = data.results;
        selectedDoc = null;
      });
    }}
  >
    <Search size={18}></Search>
    <label class={styles.srOnly} for="document-search">
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
    <button class={styles.primary} disabled={busy}>
      {t("docs.search")}
    </button>
  </form>
  {#if results !== null}<button
      class={styles.textButton}
      disabled={busy}
      onclick={() => {
        results = null;
        query = "";
      }}><X size={14} /> {t("docs.clear")}</button
    >{/if}
  <div class={styles.documentGrid}>
    <div>
      <h3>
        {tp("count.documents", documents.length)}
      </h3>
      {#if pending === "upload"}<Skeleton
          variant="rows"
          count={1}
          label={t("docs.processingDoc")}
        />{/if}
      {#if documents.length || pending === "upload"}{#each documents as doc (doc.id)}<button
            class={`${styles.docRow} ${selectedDoc === doc.id ? styles.docSelected : ""}`}
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
            <FileText size={22}></FileText>
            <span>
              <strong>{doc.name}</strong>
              <small>
                {doc.mime.includes("wordprocessing")
                  ? t("docs.textSection")
                  : tp("count.pages", doc.pages)}&#32; ·
                {t("docs.ready")}
              </small>
            </span>
            <ChevronRight size={16}></ChevronRight>
          </button>{/each}{:else}<Empty
          title={t("docs.emptyTitle")}
          text={t("docs.emptyText")}
          >{#snippet icon()}<FileText size={26}></FileText>{/snippet}</Empty
        >{/if}
    </div>
    <div class={styles.documentReader}>
      {#if pending === "search" || pending === "read"}<Skeleton
          variant="reader"
          label={pending === "search"
            ? t("docs.searchingDocs")
            : t("docs.loadingPassages")}
        />{:else if results !== null}
        <h3>
          {t("docs.results")}&#32;
          <small>
            {tp("count.passages", results.length)}
          </small>
        </h3>
        {#if results.length}{#each results as s (s.id)}{#key s.id}<SourceCard
                source={s}
                {caseId}
              ></SourceCard>{/key}{/each}{:else}<Empty
            title={t("docs.noMatchTitle")}
            text={t("docs.noMatchText")}
            >{#snippet icon()}<Search size={26}></Search>{/snippet}</Empty
          >{/if}
      {:else}{#if selectedDoc}
          <h3>{t("docs.extracted")}</h3>
          {#each chunks as s (s.id)}{#key s.id}<SourceCard source={s} {caseId}
              ></SourceCard>{/key}{/each}
        {:else}<Empty title={t("docs.openTitle")} text={t("docs.openText")}
            >{#snippet icon()}<BookOpen size={30}></BookOpen>{/snippet}</Empty
          >{/if}{/if}
    </div>
  </div>
</div>
