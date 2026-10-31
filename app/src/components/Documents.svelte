<script lang="ts">
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
      if (saved && kind === "upload")
        uploadNotice =
          "Document added. Select it below to read its passages, or ask the case assistant about it.";
    } finally {
      pending = "";
    }
  }
</script>

<div class={styles.documents}>
  <div class={styles.sectionTitle}>
    <div>
      <h2>The case file.</h2>
      <p>
        Original documents, preserved passages, and a trail back to the source.
      </p>
    </div>
  </div>
  <div class={styles.uploadBox}>
    <Upload size={25}></Upload>
    <div>
      <h3>Add authorized case documents</h3>
      <p>PDF, DOCX, TXT, or Markdown · up to 6 MB · text-based PDFs only</p>
      <small>
        Keep the original files and search their text. AI features may process
        excerpts to help find related material.
      </small>
    </div>
    <label class={styles.secondary}>
      {pending === "upload" ? "Processing…" : "Choose a file"}
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
      Search case evidence
    </label>
    <input
      id="document-search"
      value={query}
      oninput={(e) => (query = e.currentTarget.value)}
      minLength={2}
      maxlength={600}
      placeholder="Search only this case’s evidence…"
      required
    />
    <button class={styles.primary} disabled={busy}> Search </button>
  </form>
  {#if results !== null}<button
      class={styles.textButton}
      disabled={busy}
      onclick={() => {
        results = null;
        query = "";
      }}><X size={14} /> Clear search results</button
    >{/if}
  <div class={styles.documentGrid}>
    <div>
      <h3>
        {documents.length} document{documents.length !== 1 ? "s" : ""}
      </h3>
      {#if pending === "upload"}<Skeleton
          variant="rows"
          count={1}
          label="Processing document…"
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
                  ? "Text section"
                  : `${doc.pages} page${doc.pages !== 1 ? "s" : ""}`}&#32; ·
                Ready to search
              </small>
            </span>
            <ChevronRight size={16}></ChevronRight>
          </button>{/each}{:else}<Empty
          title="Start with a source."
          text="Upload your first case document to make its passages available for search and comparison."
          >{#snippet icon()}<FileText size={26}></FileText>{/snippet}</Empty
        >{/if}
    </div>
    <div class={styles.documentReader}>
      {#if pending === "search" || pending === "read"}<Skeleton
          variant="reader"
          label={pending === "search"
            ? "Searching case documents…"
            : "Loading document passages…"}
        />{:else if results !== null}
        <h3>
          Search results&#32;
          <small>
            {results.length} matching passage{results.length === 1 ? "" : "s"}
          </small>
        </h3>
        {#if results.length}{#each results as s (s.id)}{#key s.id}<SourceCard
                source={s}
                {caseId}
              ></SourceCard>{/key}{/each}{:else}<Empty
            title="No matching passages."
            text="Try different words or add the document containing this detail."
            >{#snippet icon()}<Search size={26}></Search>{/snippet}</Empty
          >{/if}
      {:else}{#if selectedDoc}
          <h3>Extracted passages</h3>
          {#each chunks as s (s.id)}{#key s.id}<SourceCard source={s} {caseId}
              ></SourceCard>{/key}{/each}
        {:else}<Empty
            title="Open the record."
            text="Choose a document to read its extracted passages, or search for a detail across this case."
            >{#snippet icon()}<BookOpen size={30}></BookOpen>{/snippet}</Empty
          >{/if}{/if}
    </div>
  </div>
</div>
