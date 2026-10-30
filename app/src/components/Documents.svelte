<script lang="ts">
  import {
    BookOpen,
    ChevronRight,
    FileText,
    Search,
    Upload,
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

  let results = $state<Source[] | null>(null);

  let method = $state("");

  let selectedDoc = $state<string | null>(null);

  let chunks = $state<Source[]>([]);
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
        DOCX uses text sections; PDF page numbers are preserved. Configured
        embedding providers receive extracted text.
      </small>
    </div>
    <label class={styles.secondary}>
      {busy ? "Processing…" : "Choose a file"}
      <input
        class={styles.srOnly}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        disabled={busy}
        onchange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (file)
            void run(async () => {
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
  <form
    class={styles.searchForm}
    onsubmit={(e) => {
      e.preventDefault();
      void run(async () => {
        const data = await api<{ results: Source[]; method: string }>(
          `/cases/${caseId}/search?q=${encodeURIComponent(query)}`,
        );
        results = data.results;
        method = data.method;
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
  <div class={styles.documentGrid}>
    <div>
      <h3>
        {documents.length} document{documents.length !== 1 ? "s" : ""}
      </h3>
      {#if documents.length}{#each documents as doc (doc.id)}<button
            class={`${styles.docRow} ${selectedDoc === doc.id ? styles.docSelected : ""}`}
            onclick={() =>
              run(async () => {
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
          text="Upload your first case document to make its passages available for evidence retrieval."
          >{#snippet icon()}<FileText size={26}></FileText>{/snippet}</Empty
        >{/if}
    </div>
    <div class={styles.documentReader}>
      {#if results !== null}
        <h3>
          Search results&#32;
          <small>
            {method === "hybrid" ? "Semantic + keyword" : "Keyword retrieval"}
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
