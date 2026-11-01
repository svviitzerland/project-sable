<script lang="ts">
  import { formatDate, t } from "../lib/i18n/index.svelte";
  import { api, type Recording } from "../lib/workspace-api";
  import Skeleton from "./Skeleton.svelte";
  import { AudioLines } from "@lucide/svelte";
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

  let authorized = $state(false);
  let keepRecording = $state(true);
  const minutes = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;

  let language = $state("id");
</script>

<section class={styles.hearingAudio}>
  <h3>{t("audio.title")}</h3>
  <p>{t("audio.text")}</p>
  <div>
    <select
      aria-label={t("audio.recognitionLanguage")}
      value={language}
      onchange={(e) => (language = e.currentTarget.value)}
      disabled={audio.status !== "idle"}
    >
      <option value="id">Bahasa Indonesia</option>
      <option value="en">English</option>
    </select>
    <label>
      <input
        type="checkbox"
        checked={authorized}
        oninput={(e) => (authorized = e.currentTarget.checked)}
        disabled={audio.status !== "idle"}
      />
      {t("audio.permission")}
    </label>
    <label>
      <input
        type="checkbox"
        checked={keepRecording}
        oninput={(e) => (keepRecording = e.currentTarget.checked)}
        disabled={audio.status !== "idle"}
      />
      {t("audio.keepRecording")}
    </label>
    {#if audio.status === "idle"}
      <button
        class={ui.primary}
        disabled={!authorized || !configured}
        onclick={() => audio.start(language, undefined, keepRecording)}
      >
        <AudioLines size={16}></AudioLines>
        {t("audio.start")}
      </button>
      <label class={ui.secondary}>
        {t("audio.prepared")}
        <input
          type="file"
          accept="audio/*"
          disabled={!authorized || !configured}
          onchange={(e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            if (file) void audio.start(language, file);
          }}
        />
      </label>
    {:else}<button
        class={ui.primary}
        onclick={audio.stop}
        disabled={audio.status === "stopping"}
      >
        {audio.status === "connecting"
          ? t("audio.cancel")
          : audio.status === "stopping"
            ? t("audio.finishing")
            : t("audio.stop")}
      </button>{/if}
  </div>
  {#if audio.status === "connecting" || audio.status === "stopping"}<Skeleton
      variant="compact"
      label={audio.status === "connecting"
        ? t("audio.connectingAudio")
        : t("audio.savingFinal")}
    />{/if}
  <p role="status">
    {!configured
      ? t("audio.unavailable")
      : audio.status === "idle"
        ? t("audio.idle")
        : audio.status === "recording"
          ? t("audio.recording")
          : audio.status === "stopping"
            ? t("audio.waiting")
            : t("audio.connecting")}
  </p>
  {#if recordings.length}
    <div class={styles.recordings}>
      <h4>{t("audio.recordings")}</h4>
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
              class={ui.secondary}
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
