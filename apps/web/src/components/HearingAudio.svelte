<script lang="ts">
  import { formatDate, t } from "../lib/i18n/index.svelte";
  import { api, type Recording } from "../lib/workspace-api";
  import { FileAudio, Mic, Square, ChevronDown } from "@lucide/svelte";
  import Modal from "./Modal.svelte";
  import ui from "./workspace.module.css";
  import styles from "./casebook.module.css";

  let {
    audio,
    configured,
    caseId,
    recordings = [],
    onChanged = () => undefined,
  }: {
    audio: ReturnType<
      typeof import("../lib/hearing-audio.svelte").createHearingAudio
    >;
    configured: boolean;
    caseId: string;
    recordings?: Recording[];
    onChanged?: () => void;
  } = $props();

  // One small decision modal per start: microphone or prepared file.
  let mode = $state<"mic" | "file" | null>(null);
  let authorized = $state(false);
  let keepRecording = $state(true);
  let language = $state("id");
  let file = $state<File | null>(null);
  let showRecordings = $state(false);

  const minutes = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;

  function choose(next: "mic" | "file") {
    mode = next;
    authorized = false;
    file = null;
  }
  function begin() {
    if (!mode || !authorized) return;
    const chosen = mode;
    mode = null;
    if (chosen === "mic") void audio.start(language, undefined, keepRecording);
    else if (file) void audio.start(language, file, false);
  }
</script>

<section class={styles.capture} aria-label={t("audio.title")}>
  {#if audio.status === "idle"}
    <div class={styles.captureBar}>
      <button
        class={ui.primary}
        disabled={!configured}
        onclick={() => choose("mic")}
      >
        <Mic size={16}></Mic>
        {t("audio.start")}
      </button>
      <button
        class={ui.secondary}
        disabled={!configured}
        onclick={() => choose("file")}
      >
        <FileAudio size={16}></FileAudio>
        {t("audio.prepared")}
      </button>
      {#if recordings.length}
        <button
          class={styles.captureLink}
          aria-expanded={showRecordings}
          onclick={() => (showRecordings = !showRecordings)}
        >
          {t("audio.recordings")} ({recordings.length})
          <ChevronDown size={14}></ChevronDown>
        </button>
      {/if}
      <span class={styles.captureHint} role="status">
        {configured ? t("audio.idleShort") : t("audio.unavailable")}
      </span>
    </div>
  {:else}
    <div class={styles.captureLive} role="status">
      <span class={styles.liveDot} data-state={audio.status} aria-hidden="true"
      ></span>
      <strong>
        {audio.status === "recording"
          ? t("audio.recording")
          : audio.status === "stopping"
            ? t("audio.waiting")
            : t("audio.connecting")}
      </strong>
      <button
        class={ui.primary}
        onclick={audio.stop}
        disabled={audio.status === "stopping"}
      >
        <Square size={13}></Square>
        {audio.status === "connecting"
          ? t("audio.cancel")
          : audio.status === "stopping"
            ? t("audio.finishing")
            : t("audio.stop")}
      </button>
    </div>
  {/if}

  {#if showRecordings && recordings.length}
    <div class={styles.recordings}>
      <p class={ui.muted}>{t("audio.recordingsNote")}</p>
      <ul>
        {#each recordings as r (r.id)}
          <li>
            <span
              >{t("audio.recordingItem", {
                when: formatDate(r.created_at),
                duration: minutes(r.duration),
              })}</span
            >
            <audio
              controls
              preload="none"
              src={`/api/v1/cases/${caseId}/recordings/${r.id}`}
            ></audio>
            <button
              class={styles.captureLink}
              onclick={async () => {
                await api(`/cases/${caseId}/recordings/${r.id}`, {
                  method: "DELETE",
                });
                onChanged();
              }}>{t("audio.deleteRecording")}</button
            >
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</section>

<Modal
  open={mode !== null}
  title={mode === "file"
    ? t("audio.modal.fileTitle")
    : t("audio.modal.micTitle")}
  onClose={() => (mode = null)}
>
  <div class={styles.captureForm}>
    <p>
      {mode === "file" ? t("audio.modal.fileText") : t("audio.modal.micText")}
    </p>
    <label>
      {t("audio.recognitionLanguage")}
      <select bind:value={language}>
        <option value="id">Bahasa Indonesia</option>
        <option value="en">English</option>
      </select>
    </label>
    {#if mode === "file"}
      <label>
        {t("audio.modal.chooseFile")}
        <input
          type="file"
          accept="audio/*"
          onchange={(e) => (file = e.currentTarget.files?.[0] ?? null)}
        />
      </label>
    {/if}
    <label class={styles.check}>
      <input type="checkbox" bind:checked={authorized} />
      <span>{t("audio.permission")}</span>
    </label>
    {#if mode === "mic"}
      <label class={styles.check}>
        <input type="checkbox" bind:checked={keepRecording} />
        <span>{t("audio.keepRecording")}</span>
      </label>
    {/if}
  </div>
  {#snippet footer()}
    <button class={ui.secondary} onclick={() => (mode = null)}>
      {t("common.cancel")}
    </button>
    <button
      class={ui.primary}
      disabled={!authorized || (mode === "file" && !file)}
      onclick={begin}
    >
      {mode === "file" ? t("audio.modal.transcribe") : t("audio.modal.begin")}
    </button>
  {/snippet}
</Modal>
