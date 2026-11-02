<script lang="ts">
  import { formatDate, t, tp, type MessageKey } from "../lib/i18n/index.svelte";
  import Skeleton from "./Skeleton.svelte";
  import {
    ArrowRight,
    AudioLines,
    Check,
    ChevronDown,
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
  import styles from "./case-tabs.module.css";
  import Modal from "./Modal.svelte";

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

  // Import lives behind a quiet disclosure; choosing a file opens it.
  let importOpen = $state(false);

  let dragOver = $state(false);

  function choose(selected: File) {
    importOpen = true;
    file = selected;
    preview = null;
    void prepare(selected);
  }

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

  const hearingStatuses = ["ready", "live", "paused", "complete"] as const;

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

<div class={styles.screen}>
  <header class={styles.heading}>
    <h2>{t("library.title")}</h2>
    <p>{t("library.lead")}</p>
    <div class={styles.headingActions}>
      <button
        class={styles.ghost}
        aria-expanded={importOpen}
        aria-controls="hearing-import"
        onclick={() => (importOpen = !importOpen)}
      >
        <Upload size={16}></Upload>
        {t("tabs.library.import")}
        <ChevronDown size={15} class={styles.chevron}></ChevronDown>
      </button>
      <button
        class={ui.primary}
        onclick={() => (creating = true)}
        disabled={!!busy}
      >
        <Plus size={16}></Plus>
        {t("library.new")}
      </button>
    </div>
  </header>
  <input
    bind:this={input.current}
    aria-label={t("library.uploadLabel")}
    class={ui.srOnly}
    tabindex="-1"
    type="file"
    accept=".jude,.zip,.json,.csv,.txt,.md,.srt,.vtt,.pdf,.docx"
    onchange={(event) => {
      const selected = event.currentTarget.files?.[0];
      event.currentTarget.value = "";
      if (selected) choose(selected);
    }}
  />
  <section
    id="hearing-import"
    class={`${styles.surface} ${styles.importPanel}`}
    hidden={!importOpen}
    aria-label={t("library.importTitle")}
  >
    <button
      class={styles.dropzone}
      data-over={dragOver}
      aria-disabled={!!busy}
      onclick={() => {
        if (!busy) input.current?.click();
      }}
      ondragover={(e) => {
        e.preventDefault();
        dragOver = true;
      }}
      ondragleave={() => (dragOver = false)}
      ondrop={(e) => {
        e.preventDefault();
        dragOver = false;
        const selected = e.dataTransfer?.files?.[0];
        if (selected && !busy) choose(selected);
      }}
    >
      <span class={styles.dropIcon} aria-hidden="true"
        ><AudioLines size={20}></AudioLines></span
      >
      <span style="text-align: left;">
        <strong>{t("tabs.library.drop")}</strong>
        <small>{t("library.formats")}</small>
      </span>
    </button>
    <div class={styles.importLinks}>
      <a rel="external" href="/api/v1/hearing-template">
        <Download size={14}></Download>
        {t("library.template")}
      </a>
      <span>{t("library.convertHint")}</span>
    </div>
    {#if file && (preview || error || reading)}<div
        class={styles.preview}
        role="region"
        aria-label={t("library.preview")}
      >
        <div class={styles.previewHead}>
          <FileText size={18}></FileText>
          <strong>{file.name}</strong>
          <span class={styles.chip}>
            {preview?.method === "ai_converted"
              ? t("library.aiConversion")
              : t("library.importPreview")}
          </span>
          <button
            class={styles.iconButton}
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
        </div>
        <p class={styles.quiet}>
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
          <div class={styles.previewFoot}>
            <span class={styles.meta}>
              {t("library.preserved", {
                statements: tp(
                  "count.statements",
                  preview.hearing.segments.length,
                ),
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
          </div>
        {:else}{#if preview?.method === "conversion_required"}<div
              class={styles.conversion}
            >
              <p class={styles.quiet}>{t("library.converterNote")}</p>
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
              {#if !configured}<small class={styles.meta}>
                  {t("library.convertUnavailable")}
                </small>{/if}
            </div>{/if}{/if}
      </div>{/if}
  </section>
  {#if error}<p role="alert" class={`${ui.error} ${styles.error}`}>
      {error}
    </p>{/if}
  {#if busy && !reading}<Skeleton
      variant="rows"
      count={1}
      label={t(busy)}
    />{/if}

  {#if detail.hearings.length > 0}
    <div class={styles.filters}>
      <label class={styles.searchBox}>
        <Search size={16}></Search>
        <span class={ui.srOnly}>{t("library.search")}</span>
        <input
          type="search"
          value={hearingQuery}
          oninput={(e) => (hearingQuery = e.currentTarget.value)}
          placeholder={t("library.searchPlaceholder")}
        />
      </label>
      <button
        class={styles.ghost}
        aria-pressed={reviewOnly}
        onclick={() => (reviewOnly = !reviewOnly)}
      >
        <ShieldCheck size={16}></ShieldCheck>
        {t("library.needsReview")}
      </button>
    </div>
    <div class={styles.listHead}>
      <h3>{t("library.caseHearings")}</h3>
      <span class={styles.meta} role="status">
        {t("library.shownOf", {
          shown: matchingHearings.length,
          total: detail.hearings.length,
        })}
      </span>
    </div>
  {/if}
  {#if matchingHearings.length}<ul class={styles.list}>
      {#each matchingHearings as { hearing, segments, findings, remaining } (hearing.id)}<li
        >
          <button class={styles.row} onclick={() => onOpen(hearing.id)}>
            <AudioLines size={20}></AudioLines>
            <span class={styles.rowMain}>
              <strong class={styles.hearingTitle}>{hearing.title}</strong>
              <small>
                {hearing.date
                  ? formatDate(hearing.date)
                  : t("library.dateNotSet")}
                ·&#32;
                {hearing.kind === "imported"
                  ? t("common.importedTranscript")
                  : t("library.record")}
                ·&#32;
                {tp("count.statements", segments.length)}
              </small>
            </span>
            <span class={styles.rowEnd}>
              {#if findings.length > 0}<span
                  class={`${styles.chip} ${remaining ? styles.chipWarm : styles.chipDone}`}
                >
                  {remaining
                    ? t("hearing.toReview", { count: remaining })
                    : t("library.allReviewed")}
                </span>
                <span class={styles.chip}
                  >{tp("count.findings", findings.length)}</span
                >{/if}
              <span
                class={`${styles.chip} ${hearing.status === "live" ? styles.chipLive : ""}`}
                >{hearingStatusLabel(hearing.status)}</span
              >
            </span>
            <ArrowRight size={17}></ArrowRight>
          </button>
        </li>{/each}
    </ul>{:else}{#if detail.hearings.length}<div class={styles.empty}>
        <Search size={28}></Search>
        <h3>{t("library.noMatchTitle")}</h3>
        <p>{t("library.noMatchText")}</p>
        <div class={styles.emptyActions}>
          <button
            class={ui.secondary}
            onclick={() => {
              hearingQuery = "";
              reviewOnly = false;
            }}
          >
            {t("library.clear")}
          </button>
        </div>
      </div>{:else}<div class={`${styles.empty} ${styles.surface}`}>
        <AudioLines size={30}></AudioLines>
        <h3>{t("library.firstTitle")}</h3>
        <p>{t("library.firstText")}</p>
        <div class={styles.emptyActions}>
          <button
            class={ui.secondary}
            onclick={() => {
              importOpen = true;
              input.current?.click();
            }}
          >
            <Upload size={16}></Upload>
            {t("library.upload")}
          </button>
        </div>
      </div>{/if}{/if}
</div>

<Modal
  open={creating}
  title={t("library.new")}
  onClose={() => (creating = false)}
>
  <form
    id="new-hearing"
    class={styles.modalForm}
    onsubmit={async (e) => {
      e.preventDefault();
      busy = "library.creating";
      error = "";
      try {
        const hearing = await api<Hearing>(
          `/cases/${detail.case.id}/hearings`,
          { method: "POST", body: JSON.stringify({ title, date }) },
        );
        creating = false;
        await refresh();
        onOpen(hearing.id);
      } catch (e) {
        error = (e as Error).message;
      } finally {
        busy = "";
      }
    }}
  >
    <p class={ui.muted}>{t("tabs.library.newText")}</p>
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
      {t("library.date")}
      <input
        type="date"
        value={date}
        oninput={(e) => (date = e.currentTarget.value)}
      />
    </label>
  </form>
  {#snippet footer()}
    <button class={ui.secondary} onclick={() => (creating = false)}>
      {t("common.cancel")}
    </button>
    <button
      class={ui.primary}
      type="submit"
      form="new-hearing"
      disabled={!!busy}
    >
      {t("library.create")}
    </button>
  {/snippet}
</Modal>
