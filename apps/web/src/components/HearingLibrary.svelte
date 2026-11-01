<script lang="ts">
  import {
    formatDate,
    t,
    tp,
    type MessageKey,
  } from "../lib/i18n/index.svelte";
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

  let busy = $state<MessageKey | "">("");
  let reading = $derived(
    busy === "library.reading" || busy === "library.converting",
  );

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
    busy = convert ? "library.converting" : "library.reading";
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

  const hearingStatuses = [
    "ready",
    "live",
    "simulation",
    "paused",
    "complete",
  ] as const;

  function hearingStatusLabel(status: string) {
    return (hearingStatuses as readonly string[]).includes(status)
      ? t(`hearingStatus.${status as (typeof hearingStatuses)[number]}`)
      : status;
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
      <h2>{t("library.title")}</h2>
      <p>{t("library.lead")}</p>
    </div>
    <button
      class={ui.secondary}
      onclick={() => (creating = !creating)}
      disabled={!!busy}
    >
      <Plus size={16}></Plus>
      {t("library.new")}
    </button>
  </div>
  <div class={styles.importWell}>
    <div class={styles.importIcon}>
      <AudioLines size={28}></AudioLines>
    </div>
    <div>
      <h3>{t("library.importTitle")}</h3>
      <p>{t("library.importText")}</p>
      <small>{t("library.formats")}</small>
    </div>
    <button
      class={ui.primary}
      onclick={() => input.current?.click()}
      disabled={!!busy}
    >
      <Upload size={16}></Upload>
      {t("library.upload")}
    </button>
    <input
      bind:this={input.current}
      aria-label={t("library.uploadLabel")}
      class={ui.srOnly}
      type="file"
      accept=".jude,.zip,.json,.csv,.txt,.md,.srt,.vtt,.pdf,.docx"
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
      {t("library.template")}
    </a>
    <span>{t("library.convertHint")}</span>
  </div>
  {#if error}<p role="alert" class={ui.error}>
      {error}
    </p>{/if}
  {#if busy && !reading}<Skeleton
      variant="rows"
      count={1}
      label={t(busy)}
    />{/if}
  {#if creating}<form
      class={styles.newHearing}
      onsubmit={async (e) => {
        e.preventDefault();
        busy = "library.creating";
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
        {t("library.hearingTitle")}
        <input
          value={title}
          oninput={(e) => (title = e.currentTarget.value)}
          required
          maxlength={160}
          placeholder={t("library.titlePlaceholder")}
        />
      </label>
      <label>
        {t("library.date")}&#32;
        <input
          type="date"
          value={date}
          oninput={(e) => (date = e.currentTarget.value)}
        />
      </label>
      <button class={ui.primary} disabled={!!busy}>
        {t("library.create")}
      </button>
    </form>{/if}
  {#if file && (preview || error || reading)}<section
      class={styles.preview}
      aria-label={t("library.preview")}
    >
      <header>
        <div>
          <FileText size={19}></FileText>
          <strong>{file.name}</strong>
          <span>
            {preview?.method === "ai_converted"
              ? t("library.aiConversion")
              : t("library.importPreview")}
          </span>
        </div>
        <button
          aria-label={t("library.closePreview")}
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
        {preview?.notice || t("library.chooseSupported")}
      </p>
      {#if busy && reading}<Skeleton
          variant="reader"
          label={t(busy)}
        />{:else if preview?.hearing}
        <div class={styles.previewFields}>
          <label>
            {t("library.importedTitle")}
            <input
              value={preview.hearing.title}
              maxlength={160}
              oninput={(e) => editHearing({ title: e.currentTarget.value })}
            />
          </label>
          <label>
            {t("library.hearingDate")}
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
                {t("library.speakerN", { n: index + 1 })}
                <input
                  aria-label={t("library.speakerFor", { n: index + 1 })}
                  value={turn.speaker}
                  maxlength={80}
                  oninput={(e) =>
                    editTurn(index, { speaker: e.currentTarget.value })}
                />
              </label>
              <label>
                {t("library.statementN", { n: index + 1 })}
                <textarea
                  aria-label={t("library.statementN", { n: index + 1 })}
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
            {t("library.preserved", {
              statements: tp("count.statements", preview.hearing.segments.length),
            })}
          </span>
          <button
            class={ui.primary}
            disabled={!!busy || !preview.hearing.title.trim()}
            onclick={async () => {
              if (!file || !preview?.hearing) return;
              const selectedFile = file;
              const transcript = preview.hearing;
              busy = "library.importing";
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
            {t("library.confirm")}
          </button>
        </footer>
      {:else}{#if preview?.method === "conversion_required"}<div
            class={styles.conversion}
          >
            <p>{t("library.converterNote")}</p>
            <button
              class={ui.primary}
              disabled={!!busy || !configured}
              onclick={() => {
                if (file) void prepare(file, true);
              }}
            >
              <Sparkles size={16}></Sparkles>
              {t("library.convert")}
            </button>
            {#if !configured}<small>
                {t("library.convertUnavailable")}
              </small>{/if}
          </div>{/if}{/if}
    </section>{/if}
  <div class={styles.hearingList}>
    <div class={styles.listHeading}>
      <h3>{t("library.caseHearings")}</h3>
      <span role="status">
        {t("library.shownOf", {
          shown: matchingHearings.length,
          total: detail.hearings.length,
        })}
      </span>
    </div>
    {#if detail.hearings.length > 0}<div class={styles.libraryFilters}>
        <label>
          <span class={ui.srOnly}>{t("library.search")}</span>
          <input
            type="search"
            value={hearingQuery}
            oninput={(e) => (hearingQuery = e.currentTarget.value)}
            placeholder={t("library.searchPlaceholder")}
          />
        </label>
        <button
          class={ui.secondary}
          aria-pressed={reviewOnly}
          onclick={() => (reviewOnly = !reviewOnly)}
        >
          <ShieldCheck size={16}></ShieldCheck>
          {t("library.needsReview")}
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
              {hearing.date ? formatDate(hearing.date) : t("library.dateNotSet")}
              ·&#32;
              {hearing.kind === "simulation"
                ? t("common.syntheticExercise")
                : hearing.kind === "imported"
                  ? t("common.importedTranscript")
                  : t("library.record")}
            </p>
          </div>
          <div class={styles.hearingCounts}>
            <strong>{tp("count.statements", segments.length)}</strong>
            <span>
              {tp("count.findings", findings.length)}
              {findings.length > 0
                ? ` · ${remaining ? t("hearing.toReview", { count: remaining }) : t("library.allReviewed")}`
                : ""}
            </span>
          </div>
          <span class={styles.hearingStatus}
            >{hearingStatusLabel(hearing.status)}</span
          >
          <ArrowRight size={17}></ArrowRight>
        </button>{/each}{:else}{#if detail.hearings.length}<div
          class={styles.empty}
        >
          <Search size={28}></Search>
          <h3>{t("library.noMatchTitle")}</h3>
          <p>{t("library.noMatchText")}</p>
          <button
            class={ui.secondary}
            onclick={() => {
              hearingQuery = "";
              reviewOnly = false;
            }}
          >
            {t("library.clear")}
          </button>
        </div>{:else}<div class={styles.empty}>
          <AudioLines size={32}></AudioLines>
          <h3>{t("library.firstTitle")}</h3>
          <p>{t("library.firstText")}</p>
        </div>{/if}{/if}
  </div>
</div>
