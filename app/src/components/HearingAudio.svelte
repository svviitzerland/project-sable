<script lang="ts">
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
  <h3>Capture this hearing</h3>
  <p>
    Stream authorized microphone or prepared audio through Speechmatics. The
    transcript stays with this hearing.
  </p>
  <div>
    <select
      aria-label="Recognition language"
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
      I am authorized to process this audio with the configured providers.
    </label>
    {#if audio.status === "idle"}
      <button
        class={ui.primary}
        disabled={!authorized || !configured}
        onclick={() => audio.start(language)}
      >
        <AudioLines size={16}></AudioLines>
        Start microphone
      </button>
      <label class={ui.secondary}>
        Prepared audio
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
          ? "Cancel connection"
          : audio.status === "stopping"
            ? "Finishing transcript…"
            : "Stop recording"}
      </button>{/if}
  </div>
  <p role="status">
    {!configured
      ? "Speechmatics is not connected. You can upload a transcript above."
      : audio.status === "idle"
        ? "Microphone off. Raw audio is streamed, not saved by Jude."
        : audio.status === "recording"
          ? "Recording and streaming · keep this tab open"
          : audio.status === "stopping"
            ? "Waiting for final transcript…"
            : "Connecting…"}
  </p>
</section>
