<script lang="ts">
  import { CalendarPlus, Check, FileAudio, FileUp, Mic, Upload } from "@lucide/svelte";
  import { fmtDate, l, t } from "../lib/i18n";
  import { isLive, live, startLive } from "../lib/live.svelte";
  import { prefs } from "../lib/prefs.svelte";
  import { go } from "../lib/router.svelte";
  import { importTranscript, previewTranscript, transcribeUpload, type PreviewTurn } from "../lib/services";
  import { db, hearing, hearingsOf, toastT, ui } from "../lib/store.svelte";

  let { caseId, flow: initialFlow, hearingId }: { caseId: string; flow?: "live" | "upload" | "import" | "schedule"; hearingId?: string } = $props();

  type Flow = "live" | "upload" | "import" | "schedule";
  // svelte-ignore state_referenced_locally
  let flow = $state<Flow | null>(initialFlow ?? null);
  let target = $derived(hearingId ? hearing(hearingId) : undefined);
  let nextNumber = $derived(Math.max(0, ...hearingsOf(caseId).map((h) => h.number)) + 1);
  // svelte-ignore state_referenced_locally
  let title = $state(target ? l(target.title) : "");
  let date = $state("2026-11-04");
  let permission = $state(false);
  let keepAudio = $state(true);
  let language = $state("id-ID");
  let busyLive = $derived(isLive() && live.hearingId !== hearingId);
  let liveHearing = $derived(hearing(live.hearingId));

  let stage = $state<"idle" | "uploading" | "transcribing" | "examining" | "done">("idle");
  let progress = $state(0);
  let fileName = $state("");
  let createdId = $state("");

  let preview = $state<{ title: string; date: string; turns: PreviewTurn[] } | null>(null);
  let previewLoading = $state(false);

  const close = () => (ui.modal = null);

  function begin() {
    let id = hearingId;
    if (!id) {
      id = `hn${Date.now()}`;
      db.hearings.push({
        id,
        caseId,
        number: nextNumber,
        title: title ? { id: title, en: title } : { id: "Pemeriksaan saksi", en: "Witness examination" },
        date: "2026-11-04",
        mode: "scheduled",
      });
    }
    if (startLive(id)) {
      close();
      go(`/case/${caseId}/hearings/${id}`);
    }
  }

  async function upload() {
    stage = "uploading";
    createdId = await transcribeUpload(caseId, title || fileName, (s, p) => {
      stage = s;
      progress = p;
    });
  }

  async function loadPreview() {
    previewLoading = true;
    preview = await previewTranscript();
    previewLoading = false;
  }

  function confirmImport() {
    if (!preview) return;
    const id = importTranscript(caseId, preview.title, preview.date, preview.turns);
    toastT("toast.hearingCreated");
    close();
    go(`/case/${caseId}/hearings/${id}`);
  }

  function schedule() {
    const id = `hs${Date.now()}`;
    db.hearings.push({
      id,
      caseId,
      number: nextNumber,
      title: title ? { id: title, en: title } : { id: "Sidang lanjutan", en: "Continued hearing" },
      date,
      mode: "scheduled",
      time: "09.00",
    });
    toastT("toast.hearingCreated");
    close();
    go(`/case/${caseId}/hearings/${id}`);
  }

  const options = [
    { key: "live", icon: Mic, title: "nh.live", text: "nh.liveText" },
    { key: "upload", icon: FileAudio, title: "nh.upload", text: "nh.uploadText" },
    { key: "import", icon: FileUp, title: "nh.import", text: "nh.importText" },
    { key: "schedule", icon: CalendarPlus, title: "nh.schedule", text: "nh.scheduleText" },
  ] as const;
  const speakers = ["Hakim Ketua", "Hakim Anggota", "Penuntut Umum", "Penasihat Hukum", "Saksi", "Unknown"];
</script>

<div class="modal-body">
  {#if !flow}
    <p class="muted">{t("nh.lead")}</p>
    <div class="options">
      {#each options as o (o.key)}
        <button class="option" onclick={() => (flow = o.key)} disabled={o.key === "live" && !prefs.transcribe}>
          <span class="option-icon" class:live={o.key === "live"}><o.icon size={20} /></span>
          <span class="option-text">
            <span class="option-title">{t(o.title)}</span>
            <span class="small muted">{t(o.text)}</span>
          </span>
        </button>
      {/each}
    </div>
    {#if !prefs.transcribe}<p class="notice">{t("nh.transcribeOff")}</p>{/if}
  {:else if flow === "live"}
    {#if busyLive && liveHearing}
      <p class="notice notice-sand">{t("nh.busy", { n: liveHearing.number })}</p>
    {/if}
    {#if !target}
      <label class="field-label">{t("nh.hearingTitle")}<input class="field" bind:value={title} placeholder={t("nh.titlePlaceholder")} data-autofocus /></label>
    {:else}
      <p><strong>{t("common.hearingN", { n: target.number })} · {l(target.title)}</strong></p>
    {/if}
    <label class="field-label">{t("nh.language")}
      <select class="field" bind:value={language}>
        <option value="id-ID">Bahasa Indonesia (id-ID)</option>
        <option value="en-US">English (en-US)</option>
      </select>
    </label>
    <label class="checkbox"><input type="checkbox" bind:checked={keepAudio} /><span>{t("nh.keepAudio")}</span></label>
    <div class="consent">
      <label class="checkbox"><input type="checkbox" bind:checked={permission} /><span><strong>{t("nh.permission")}</strong></span></label>
      <p class="xsmall muted">{t("nh.permissionNote")}</p>
    </div>
    <div class="foot">
      <button class="btn" onclick={() => (initialFlow ? close() : (flow = null))}>{t("common.back")}</button>
      <button class="btn btn-live" disabled={!permission || busyLive || !prefs.transcribe} onclick={begin}><Mic size={16} />{t("nh.begin")}</button>
    </div>
  {:else if flow === "upload"}
    {#if stage === "idle"}
      <label class="field-label">{t("nh.hearingTitle")}<input class="field" bind:value={title} placeholder={t("nh.titlePlaceholder")} /></label>
      <label class="drop">
        <Upload size={20} />
        <span>{fileName || t("nh.chooseFile")}</span>
        <span class="xsmall muted">{t("nh.uploadText")}</span>
        <input type="file" accept="audio/*" class="sr-only" onchange={(e) => (fileName = (e.currentTarget as HTMLInputElement).files?.[0]?.name ?? "")} />
      </label>
      <button class="link-btn" onclick={() => (fileName = "sidang-2026-10-28.m4a")}>{t("nh.useSample")}</button>
      <div class="foot">
        <button class="btn" onclick={() => (initialFlow ? close() : (flow = null))}>{t("common.back")}</button>
        <button class="btn btn-primary" disabled={!fileName || !prefs.transcribe} onclick={upload}>{t("nh.transcribe")}</button>
      </div>
    {:else}
      <ol class="stages" aria-live="polite">
        {#each [["uploading", "nh.uploading"], ["transcribing", "nh.transcribing"], ["examining", "nh.examining"]] as const as [key, label], i (key)}
          {@const order = ["uploading", "transcribing", "examining", "done"]}
          {@const done = order.indexOf(stage) > i}
          {@const active = stage === key}
          <li class:done class:active>
            <span class="stage-dot">{#if done}<Check size={13} />{/if}</span>
            <span>{t(label)}</span>
            {#if active && key === "uploading"}<span class="tabular small muted">{progress}%</span>{/if}
          </li>
        {/each}
      </ol>
      {#if stage === "done"}
        <p class="notice"><Check size={14} />{t("nh.done")}</p>
        <div class="foot">
          <button class="btn btn-primary" onclick={() => { close(); go(`/case/${caseId}/hearings/${createdId}`); }}>{t("nh.openHearing")}</button>
        </div>
      {/if}
    {/if}
  {:else if flow === "import"}
    {#if !preview}
      <label class="drop">
        <FileUp size={20} />
        <span>{t("nh.drop")}</span>
        <span class="xsmall muted">{t("nh.importText")}</span>
        <input type="file" class="sr-only" accept=".jude,.json,.csv,.txt,.srt,.vtt,.pdf,.docx,.md" onchange={loadPreview} />
      </label>
      <button class="link-btn" onclick={loadPreview}>{t("nh.useSampleTranscript")}</button>
      {#if previewLoading}
        <div class="loading" role="status"><span class="skeleton" style="height:12px;width:60%"></span><span class="skeleton" style="height:12px;width:90%"></span><span class="skeleton" style="height:12px;width:80%"></span></div>
      {/if}
      <div class="foot"><button class="btn" onclick={() => (initialFlow ? close() : (flow = null))}>{t("common.back")}</button></div>
    {:else}
      <div class="preview">
        <p class="small muted">{t("nh.previewText")}</p>
        <div class="two">
          <label class="field-label">{t("nh.hearingTitle")}<input class="field" bind:value={preview.title} /></label>
          <label class="field-label">{t("nh.date")}<input class="field" type="date" bind:value={preview.date} /></label>
        </div>
        <ol class="turns">
          {#each preview.turns as turn, i (i)}
            <li>
              <span class="tabular xsmall muted">{turn.time}</span>
              <select class="field speaker" aria-label={`${t("nh.speaker")} ${i + 1}`} bind:value={turn.speaker}>
                {#each speakers as s (s)}<option value={s}>{s}</option>{/each}
              </select>
              <p class="turn-text">{turn.text}</p>
            </li>
          {/each}
        </ol>
      </div>
      <div class="foot">
        <button class="btn" onclick={() => (preview = null)}>{t("common.back")}</button>
        <button class="btn btn-primary" onclick={confirmImport}><Check size={16} />{t("nh.confirmImport")}</button>
      </div>
    {/if}
  {:else if flow === "schedule"}
    <label class="field-label">{t("nh.hearingTitle")}<input class="field" bind:value={title} placeholder={t("nh.titlePlaceholder")} data-autofocus /></label>
    <label class="field-label">{t("nh.date")}<input class="field" type="date" bind:value={date} /></label>
    <p class="xsmall muted">{fmtDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
    <div class="foot">
      <button class="btn" onclick={() => (initialFlow ? close() : (flow = null))}>{t("common.back")}</button>
      <button class="btn btn-primary" onclick={schedule}>{t("nh.create")}</button>
    </div>
  {/if}
</div>

<style>
  .modal-body {
    display: grid;
    gap: 14px;
  }
  .options {
    display: grid;
    gap: 8px;
  }
  .option {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding: 14px;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-action);
    text-align: left;
    background: var(--surface);
  }
  .option:hover:not(:disabled) {
    border-color: var(--ink-strong);
    background: var(--surface-2);
  }
  .option-icon {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--selected);
    color: var(--ink-strong);
    flex-shrink: 0;
  }
  .option-icon.live {
    background: var(--live-soft);
    color: var(--live);
  }
  .option-text {
    display: grid;
    gap: 2px;
  }
  .option-title {
    font-weight: 600;
    color: var(--ink-strong);
  }
  .consent {
    display: grid;
    gap: 6px;
    padding: 12px;
    border-radius: var(--radius-control);
    background: var(--sand);
    color: var(--sand-ink);
  }
  .consent .muted {
    color: inherit;
    opacity: 0.85;
  }
  .foot {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 6px;
  }
  .drop {
    display: grid;
    justify-items: center;
    gap: 6px;
    padding: 26px 16px;
    border: 1.5px dashed var(--line-strong);
    border-radius: var(--radius-action);
    background: var(--surface-2);
    text-align: center;
    cursor: pointer;
    font-weight: 600;
    color: var(--ink-strong);
  }
  .drop:hover,
  .drop:focus-within {
    border-color: var(--ink-strong);
  }
  .stages {
    display: grid;
    gap: 10px;
  }
  .stages li {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--muted);
  }
  .stages li.active {
    color: var(--ink-strong);
    font-weight: 600;
  }
  .stages li.done {
    color: var(--ink);
  }
  .stage-dot {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1.5px solid var(--line-strong);
    color: var(--primary-ink);
  }
  .active .stage-dot {
    border-color: var(--ink-strong);
    border-top-color: transparent;
    animation: spin 0.9s linear infinite;
  }
  .done .stage-dot {
    background: var(--primary);
    border-color: var(--primary);
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .loading {
    display: grid;
    gap: 8px;
  }
  .preview {
    display: grid;
    gap: 12px;
  }
  .two {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 10px;
  }
  @media (max-width: 599px) {
    .two {
      grid-template-columns: 1fr;
    }
  }
  .turns {
    display: grid;
    gap: 0;
    border: 1px solid var(--line);
    border-radius: var(--radius-control);
    max-height: 320px;
    overflow-y: auto;
  }
  .turns li {
    display: grid;
    grid-template-columns: 64px 170px 1fr;
    gap: 10px;
    align-items: start;
    padding: 10px;
    border-bottom: 1px solid var(--line);
  }
  .turns li:last-child {
    border-bottom: 0;
  }
  @media (max-width: 599px) {
    .turns li {
      grid-template-columns: 1fr;
      gap: 6px;
    }
  }
  .speaker {
    min-height: 32px;
    padding: 4px 28px 4px 8px;
    font-size: 12px;
  }
  .turn-text {
    font-size: 13px;
  }
</style>
