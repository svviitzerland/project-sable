<script lang="ts">
  import { formatDate, t } from "../lib/i18n/index.svelte";
  import { api, type Recording } from "../lib/workspace-api";
  import { Mic, Square } from "@lucide/svelte";
  import Modal from "./Modal.svelte";
  import ui from "./workspace.module.css";
  import styles from "./hearing.module.css";
  import { untrack } from "svelte";

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

  let mode = $state<"mic" | "file" | null>(null);
  let authorized = $state(false);
  let keepRecording = $state(true);
  let language = $state("id");
  let file = $state<File | null>(null);
  let recordingsOpen = $state(false);
  let elapsed = $state(0);

  const clock = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;

  $effect(() => {
    void [audio.status];
    return untrack(() => {
      if (audio.status !== "recording") return;
      const started = Date.now() - elapsed * 1000;
      const timer = setInterval(
        () => (elapsed = Math.floor((Date.now() - started) / 1000)),
        1000,
      );
      return () => clearInterval(timer);
    });
  });

  function choose(next: "mic" | "file") {
    mode = next;
    authorized = false;
    file = null;
  }

  /** Menu entry: transcribe a prepared audio file. */
  export function chooseFile() {
    choose("file");
  }

  /** The empty hearing's main call to action. */
  export function startMic() {
    choose("mic");
  }

  /** Menu entry: list saved hearing recordings. */
  export function openRecordings() {
    recordingsOpen = true;
  }

  function begin() {
    if (!mode || !authorized) return;
    const chosen = mode;
    mode = null;
    elapsed = 0;
    if (chosen === "mic") void audio.start(language, undefined, keepRecording);
    else if (file) void audio.start(language, file, false);
  }
</script>

{#if audio.status === "idle"}
  <button
    class={styles.record}
    disabled={!configured}
    title={configured ? undefined : t("audio.unavailable")}
    onclick={() => choose("mic")}
  >
    <Mic size={16}></Mic>
    {t("audio.start")}
  </button>
{:else}
  <div class={styles.liveControl} role="status">
    <span class={styles.liveDot} data-state={audio.status} aria-hidden="true"
    ></span>
    <span>
      {audio.status === "recording"
        ? t("audio.recordingFor", { time: clock(elapsed) })
        : audio.status === "stopping"
          ? t("audio.waiting")
          : t("audio.connecting")}
    </span>
    <button onclick={audio.stop} disabled={audio.status === "stopping"}>
      <Square size={12}></Square>
      {audio.status === "connecting"
        ? t("audio.cancel")
        : audio.status === "stopping"
          ? t("audio.finishing")
          : t("audio.stop")}
    </button>
  </div>
{/if}

<Modal
  open={mode !== null}
  title={mode === "file"
    ? t("audio.modal.fileTitle")
    : t("audio.modal.micTitle")}
  onClose={() => (mode = null)}
>
  <div class={styles.form}>
    <p>
      {mode === "file" ? t("audio.modal.fileText") : t("audio.modal.micText")}
    </p>
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
    <label>
      {t("audio.recognitionLanguage")}
      <select bind:value={language}>
        <option value="id">Bahasa Indonesia</option>
        <option value="en">English</option>
      </select>
    </label>
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

<Modal
  open={recordingsOpen}
  title={t("audio.recordings")}
  onClose={() => (recordingsOpen = false)}
>
  <div class={styles.form}>
    <p>{t("audio.recordingsNote")}</p>
    {#if recordings.length}
      <ul class={styles.recordings}>
        {#each recordings as r (r.id)}
          <li>
            <span
              >{t("audio.recordingItem", {
                when: formatDate(r.created_at),
                duration: clock(r.duration),
              })}</span
            >
            <audio
              controls
              preload="none"
              src={`/api/v1/cases/${caseId}/recordings/${r.id}`}
            ></audio>
            <button
              class={styles.link}
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
    {:else}<p class={styles.quiet}>{t("audio.noRecordings")}</p>{/if}
  </div>
  {#snippet footer()}
    <button class={ui.secondary} onclick={() => (recordingsOpen = false)}>
      {t("common.close")}
    </button>
  {/snippet}
</Modal>
