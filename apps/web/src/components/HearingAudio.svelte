<script lang="ts">
  import { t } from "../lib/i18n/index.svelte";
  import Skeleton from "./Skeleton.svelte";
  import { AudioLines } from "@lucide/svelte";
  import ui from "./workspace.module.css";
  import styles from "./casebook.module.css";

  let {
    audio,
    configured,
  }: {
    audio: ReturnType<
      typeof import("../lib/hearing-audio.svelte").createHearingAudio
    >;
    configured: boolean;
  } = $props();

  let authorized = $state(false);

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
    {#if audio.status === "idle"}
      <button
        class={ui.primary}
        disabled={!authorized || !configured}
        onclick={() => audio.start(language)}
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
</section>
