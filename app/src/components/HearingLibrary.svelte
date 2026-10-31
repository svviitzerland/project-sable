<script lang="ts">
  import Skeleton from "./Skeleton.svelte";
  import {
    ArrowRight,
    AudioLines,
    Check,
    Download,
    FileText,
    Plus,
    Search,
    ShieldCheck,
    Sparkles,
    Upload,
    X,
  } from "@lucide/svelte";
  import { api, type Hearing, type CaseDetail } from "../lib/workspace-api";
  import ui from "./workspace.module.css";
  import styles from "./casebook.module.css";

  type Turn = { speaker: string; text: string; start: number; end: number };

  type HearingFile = {
    format: "jude";
    version: 1;
    kind: "hearing";
    title: string;
    date: string;
    segments: Turn[];
  };

  type Preview = {
    hearing: HearingFile | null;
    method: string;
    notice: string;
  };

  let {
    detail,
    onOpen,
    refresh,
    configured,
  }: {
    detail: CaseDetail;
    onOpen: (id: string) => void;
    refresh: () => Promise<void>;
    configured: boolean;
  } = $props();

  let file = $state<File | null>(null);

  let preview = $state<Preview | null>(null);

  let busy = $state("");

  let error = $state("");

  let creating = $state(false);

  let title = $state("");

  let date = $state("");

  const input = { current: null as HTMLInputElement | null };

  let hearingQuery = $state("");

  let reviewOnly = $state(false);

  let hearingRows = $derived(
    detail.hearings.map((hearing) => {
      const segments = detail.segments.filter(
        (s) => s.hearing_id === hearing.id,
      );
      const segmentIds = new Set(segments.map((s) => s.id));
      const findings = detail.findings.filter((f) =>
        segmentIds.has(f.segment_id),
      );
      return {
        hearing,
        segments,
        findings,
        remaining: findings.filter((f) => !f.reviewed).length,
      };
    }),
  );

  let hearingTerm = $derived(hearingQuery.trim().toLocaleLowerCase());

  let matchingHearings = $derived(
    hearingRows.filter(
      ({ hearing, segments, remaining }) =>
        (!reviewOnly || remaining > 0) &&
        (!hearingTerm ||
          [hearing.title, hearing.date, ...segments.map((s) => s.text)].some(
            (text) => text.toLocaleLowerCase().includes(hearingTerm),
          )),
    ),
  );

  async function prepare(selected: File, convert = false) {
    busy = convert ? "Converting transcript…" : "Reading transcript…";
    error = "";
    try {
      const body = new FormData();
      body.append("file", selected);
      body.append("convert", String(convert));
      const result = await api<Preview>(
        `/cases/${detail.case.id}/hearings/preview`,
        { method: "POST", body },
      );
      preview = result;
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = "";
    }
  }

  function editTurn(index: number, values: Partial<Turn>) {
    preview = ((current: typeof preview) =>
      current?.hearing
        ? {
            ...current,
            hearing: {
              ...current.hearing,
              segments: current.hearing.segments.map((turn, i) =>
                i === index ? { ...turn, ...values } : turn,
              ),
            },
          }
        : current)(preview);
  }

  function editHearing(fields: Partial<HearingFile>) {
    if (preview?.hearing)
      preview = { ...preview, hearing: { ...preview.hearing, ...fields } };
  }
</script>

<div class={styles.hearings}>
  <div class={styles.sectionHeader}>
    <div>
      <h2>Hearings</h2>
      <p>
        A complete record for every examination. Bring in a transcript, then
        follow its evidence.
      </p>
    </div>
    <button
      class={ui.secondary}
      onclick={() => (creating = !creating)}
      disabled={!!busy}
    >
      <Plus size={16}></Plus>
      New hearing
    </button>
  </div>
  <div class={styles.importWell}>
    <div class={styles.importIcon}>
      <AudioLines size={28}></AudioLines>
    </div>
    <div>
      <h3>Bring the whole hearing.</h3>
      <p>
        Upload a transcript instead of entering each statement. Review it here
        before adding it to your case.
      </p>
      <small> .jude, JSON, CSV, TXT, SRT, VTT, PDF or DOCX · up to 6 MB </small>
    </div>
    <button
      class={ui.primary}
      onclick={() => input.current?.click()}
      disabled={!!busy}
    >
      <Upload size={16}></Upload>
      Upload transcript
    </button>
    <input
      bind:this={input.current}
      aria-label="Upload hearing transcript"
      class={ui.srOnly}
      type="file"
      accept=".jude,.json,.csv,.txt,.md,.srt,.vtt,.pdf,.docx"
      onchange={(event) => {
        const selected = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (selected) {
          file = selected;
          preview = null;
          void prepare(selected);
        }
      }}
    />
  </div>
  <div class={styles.formatHint}>
    <a rel="external" href="/api/v1/hearing-template">
      <Download size={14}></Download>
      Download a .jude hearing template
    </a>
    <span>
      Readable files with unfamiliar layouts can be converted with AI.
    </span>
  </div>
  {#if error}<p role="alert" class={ui.error}>
      {error}
    </p>{/if}
  {#if busy && busy !== "Reading transcript…" && busy !== "Converting transcript…"}<Skeleton
      variant="rows"
      count={1}
      label={busy}
    />{/if}
  {#if creating}<form
      class={styles.newHearing}
      onsubmit={async (e) => {
        e.preventDefault();
        busy = "Creating hearing…";
        error = "";
        try {
          const hearing = await api<Hearing>(
            `/cases/${detail.case.id}/hearings`,
            { method: "POST", body: JSON.stringify({ title, date }) },
          );
          await refresh();
          onOpen(hearing.id);
        } catch (e) {
          error = (e as Error).message;
        } finally {
          busy = "";
        }
      }}
    >
      <label>
        Hearing title
        <input
          value={title}
          oninput={(e) => (title = e.currentTarget.value)}
          required
          maxlength={160}
          placeholder="Witness examination · day two"
        />
      </label>
      <label>
        Date&#32;
        <input
          type="date"
          value={date}
          oninput={(e) => (date = e.currentTarget.value)}
        />
      </label>
      <button class={ui.primary} disabled={!!busy}> Create hearing </button>
    </form>{/if}
  {#if file && (preview || error || busy === "Reading transcript…" || busy === "Converting transcript…")}<section
      class={styles.preview}
      aria-label="Transcript import preview"
    >
      <header>
        <div>
          <FileText size={19}></FileText>
          <strong>{file.name}</strong>
          <span>
            {preview?.method === "ai_converted"
              ? "AI conversion · review required"
              : "Import preview"}
          </span>
        </div>
        <button
          aria-label="Close import preview"
          onclick={() => {
            preview = null;
            file = null;
            error = "";
          }}
          disabled={!!busy}
        >
          <X size={18}></X>
        </button>
      </header>
      <p>
        {preview?.notice ||
          "Choose a supported text file or use the hearing template."}
      </p>
      {#if busy === "Reading transcript…" || busy === "Converting transcript…"}<Skeleton
          variant="reader"
          label={busy}
        />{:else if preview?.hearing}
        <div class={styles.previewFields}>
          <label>
            Imported hearing title
            <input
              value={preview.hearing.title}
              maxlength={160}
              oninput={(e) => editHearing({ title: e.currentTarget.value })}
            />
          </label>
          <label>
            Hearing date
            <input
              type="date"
              value={preview.hearing.date}
              oninput={(e) => editHearing({ date: e.currentTarget.value })}
            />
          </label>
        </div>
        <div class={styles.previewTurns}>
          {#each preview.hearing.segments as turn, index (index)}<div
              class={styles.previewTurn}
            >
              <label>
                Speaker {index + 1}
                <input
                  aria-label={`Speaker for statement ${index + 1}`}
                  value={turn.speaker}
                  maxlength={80}
                  oninput={(e) =>
                    editTurn(index, { speaker: e.currentTarget.value })}
                />
              </label>
              <label>
                Statement {index + 1}
                <textarea
                  aria-label={`Statement ${index + 1}`}
                  value={turn.text}
                  rows={2}
                  maxlength={6000}
                  oninput={(e) =>
                    editTurn(index, { text: e.currentTarget.value })}
                ></textarea>
              </label>
            </div>{/each}
        </div>
        <footer>
          <span>
            {preview.hearing.segments.length} statements · original upload preserved
          </span>
          <button
            class={ui.primary}
            disabled={!!busy || !preview.hearing.title.trim()}
            onclick={async () => {
              if (!file || !preview?.hearing) return;
              const selectedFile = file;
              const transcript = preview.hearing;
              busy = "Importing hearing…";
              error = "";
              try {
                const body = new FormData();
                body.append("file", selectedFile);
                body.append("transcript", JSON.stringify(transcript));
                const hearing = await api<Hearing>(
                  `/cases/${detail.case.id}/hearings/import`,
                  { method: "POST", body },
                );
                await refresh();
                onOpen(hearing.id);
              } catch (e) {
                error = (e as Error).message;
              } finally {
                busy = "";
              }
            }}
          >
            <Check size={16}></Check>
            Confirm & import hearing
          </button>
        </footer>
      {:else}{#if preview?.method === "conversion_required"}<div
            class={styles.conversion}
          >
            <p>
              The converter preserves source wording and leaves uncertain timing
              unknown. You will review its proposed speaker turns before import.
            </p>
            <button
              class={ui.primary}
              disabled={!!busy || !configured}
              onclick={() => {
                if (file) void prepare(file, true);
              }}
            >
              <Sparkles size={16}></Sparkles>
              Convert with AI
            </button>
            {#if !configured}<small>
                AI conversion is unavailable. Download the hearing template, add
                your transcript, and upload it again.
              </small>{/if}
          </div>{/if}{/if}
    </section>{/if}
  <div class={styles.hearingList}>
    <div class={styles.listHeading}>
      <h3>Case hearings</h3>
      <span role="status">
        {matchingHearings.length} of {detail.hearings.length} hearings
      </span>
    </div>
    {#if detail.hearings.length > 0}<div class={styles.libraryFilters}>
        <label>
          <span class={ui.srOnly}>Search hearings</span>
          <input
            type="search"
            value={hearingQuery}
            oninput={(e) => (hearingQuery = e.currentTarget.value)}
            placeholder="Find a hearing or transcript phrase…"
          />
        </label>
        <button
          class={ui.secondary}
          aria-pressed={reviewOnly}
          onclick={() => (reviewOnly = !reviewOnly)}
        >
          <ShieldCheck size={16}></ShieldCheck> Needs review
        </button>
      </div>{/if}
    {#if matchingHearings.length}{#each matchingHearings as { hearing, segments, findings, remaining } (hearing.id)}<button
          class={styles.hearingRow}
          onclick={() => onOpen(hearing.id)}
        >
          <AudioLines size={23}></AudioLines>
          <div>
            <h3>{hearing.title}</h3>
            <p>
              {hearing.date || "Date not set"} ·&#32;
              {hearing.kind === "simulation"
                ? "Synthetic exercise"
                : hearing.kind === "imported"
                  ? "Imported transcript"
                  : "Hearing record"}
            </p>
          </div>
          <div class={styles.hearingCounts}>
            <strong>{segments.length} statements</strong>
            <span>
              {findings.length} findings
              {findings.length > 0
                ? ` · ${remaining ? `${remaining} to review` : "All reviewed"}`
                : ""}
            </span>
          </div>
          <span class={styles.hearingStatus}>{hearing.status}</span>
          <ArrowRight size={17}></ArrowRight>
        </button>{/each}{:else}{#if detail.hearings.length}<div
          class={styles.empty}
        >
          <Search size={28}></Search>
          <h3>No hearings match this view.</h3>
          <p>Try another phrase or show all hearings.</p>
          <button
            class={ui.secondary}
            onclick={() => {
              hearingQuery = "";
              reviewOnly = false;
            }}
          >
            Clear hearing filters
          </button>
        </div>{:else}<div class={styles.empty}>
          <AudioLines size={32}></AudioLines>
          <h3>Your first hearing starts here.</h3>
          <p>
            Upload a prepared transcript or create a hearing for live audio and
            manual notes.
          </p>
        </div>{/if}{/if}
  </div>
</div>
