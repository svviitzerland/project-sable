<script lang="ts">
  import { t, tp } from "../lib/i18n/index.svelte";
  import {
    ArrowLeft,
    Download,
    Ellipsis,
    FileAudio,
    FilePlus2,
    Headphones,
    Mic,
    ShieldCheck,
    Sparkles,
  } from "@lucide/svelte";
  import {
    api,
    speakerName,
    statusLabel,
    timestamp,
    type Capabilities,
    type CaseDetail,
    type Hearing,
  } from "../lib/workspace-api";
  import type { createHearingAudio } from "../lib/hearing-audio.svelte";
  import type { DockSeed } from "./AssistantDock.svelte";
  import styles from "./hearing.module.css";
  import HearingAudio from "./HearingAudio.svelte";
  import Transcript from "./Transcript.svelte";
  import ManualTranscript from "./ManualTranscript.svelte";
  import FindingInspector from "./FindingInspector.svelte";
  import { untrack } from "svelte";

  let {
    caseId,
    detail,
    hearing,
    caps,
    audio,
    partial,
    connected,
    busy,
    action,
    onBack,
    onAsk,
    refresh,
  }: {
    caseId: string;
    detail: CaseDetail;
    hearing: Hearing;
    caps: Capabilities | null;
    audio: ReturnType<typeof createHearingAudio>;
    partial: string;
    connected: boolean;
    busy: boolean;
    action: (run: () => Promise<unknown>) => Promise<boolean>;
    onBack: () => void;
    onAsk: (seed: Omit<DockSeed, "nonce">) => void;
    refresh: () => void;
  } = $props();

  type Filter = "conflicts" | "all" | "open";

  let filter = $state<Filter>("all");
  let selected = $state<string | null>(null);
  let menuOpen = $state(false);
  let manualOpen = $state(false);
  /** Phones show one pane at a time. */
  let pane = $state<"transcript" | "findings">("transcript");
  let capture = $state<HearingAudio>();

  const working = [
    "queued",
    "extracting",
    "retrieving",
    "analyzing",
    "reviewing",
    "synthesizing",
  ];

  let speakers = $derived(detail.case.speakers ?? {});
  let segments = $derived(
    detail.segments.filter((s) => s.hearing_id === hearing.id),
  );
  let segmentMap = $derived(new Map(segments.map((s) => [s.id, s])));
  let findings = $derived(
    detail.findings.filter((f) => segmentMap.has(f.segment_id)),
  );
  // Differences first, then newest: what needs attention is at the top.
  let ordered = $derived(
    findings
      .slice()
      .reverse()
      .sort(
        (a, b) =>
          Number(b.status === "potential_inconsistency") -
          Number(a.status === "potential_inconsistency"),
      ),
  );
  let conflicts = $derived(
    findings.filter((f) => f.status === "potential_inconsistency"),
  );
  let open = $derived(findings.filter((f) => !f.reviewed));
  let visible = $derived(
    ordered.filter((f) =>
      filter === "conflicts"
        ? f.status === "potential_inconsistency"
        : filter === "open"
          ? !f.reviewed
          : true,
    ),
  );
  let examining = $derived(
    segments.filter((s) => working.includes(s.analysis_state)).length,
  );
  let waiting = $derived(
    segments.filter((s) =>
      ["pending", "interrupted"].includes(s.analysis_state),
    ).length,
  );
  let selectedFinding = $derived(findings.find((f) => f.id === selected));
  let recording = $derived(audio.status !== "idle");
  let live = $derived(recording || hearing.status === "live");

  // Findings that arrive while this hearing is open are marked as new.
  const seen = new Set(untrack(() => findings.map((f) => f.id)));

  function choose(id: string) {
    selected = selected === id ? null : id;
    pane = "findings";
    if (selected)
      requestAnimationFrame(() =>
        document
          .getElementById(`finding-${id}`)
          ?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
      );
  }

  function analyze() {
    menuOpen = false;
    return action(() =>
      api(`/cases/${caseId}/hearings/${hearing.id}/analyze`, {
        method: "POST",
      }),
    );
  }

  function ask(text: string) {
    onAsk({ text, references: [], send: true });
  }
</script>

<svelte:window
  onclick={(e) => {
    if (menuOpen && !(e.target as HTMLElement).closest("[data-menu]"))
      menuOpen = false;
  }}
/>

<div class={styles.view}>
  <button
    class={styles.back}
    onclick={() => {
      audio.stop();
      onBack();
    }}
  >
    <ArrowLeft size={14}></ArrowLeft>
    {t("hearing.all")}
  </button>

  <header class={styles.stage} data-live={live || undefined}>
    <div class={styles.titleBlock}>
      {#if live}<span class={styles.liveTag}
          ><i aria-hidden="true"></i>{t("hearing.liveTag")}</span
        >{/if}
      <h1>{hearing.title}</h1>
      <p class={styles.meta}>
        <span>{tp("count.statements", segments.length)}</span>
        <span aria-hidden="true">·</span>
        <span class={conflicts.length ? styles.warm : ""}
          >{tp("count.conflicts", conflicts.length)}</span
        >
        {#if !live}<span aria-hidden="true">·</span>
          <span
            >{hearing.status === "complete"
              ? t("hearing.state.complete")
              : t("hearing.state.ready")}</span
          >{/if}
        {#if !connected}<span aria-hidden="true">·</span>
          <span>{t("hearing.checking")}</span>{/if}
      </p>
    </div>
    <div class={styles.controls}>
      <HearingAudio
        bind:this={capture}
        {audio}
        configured={!!caps?.speech.configured}
        {caseId}
        recordings={detail.recordings.filter(
          (r) => r.hearing_id === hearing.id,
        )}
        onChanged={refresh}
      />
      <div class={styles.menuWrap} data-menu>
        <button
          class={styles.iconButton}
          aria-label={t("hearing.more")}
          title={t("hearing.more")}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onclick={() => (menuOpen = !menuOpen)}
        >
          <Ellipsis size={18}></Ellipsis>
        </button>
        {#if menuOpen}
          <div class={styles.menu} role="menu">
            <button
              role="menuitem"
              disabled={!caps?.speech.configured || recording}
              onclick={() => {
                menuOpen = false;
                capture?.chooseFile();
              }}
            >
              <FileAudio size={15}></FileAudio>
              {t("audio.prepared")}
            </button>
            <button
              role="menuitem"
              onclick={() => {
                menuOpen = false;
                manualOpen = true;
              }}
            >
              <FilePlus2 size={15}></FilePlus2>
              {t("manual.add")}
            </button>
            <button
              role="menuitem"
              disabled={busy ||
                examining > 0 ||
                !segments.length ||
                !caps?.analysis.configured}
              onclick={analyze}
            >
              <ShieldCheck size={15}></ShieldCheck>
              {t("hearing.analyze")}
            </button>
            <button
              role="menuitem"
              onclick={() => {
                menuOpen = false;
                capture?.openRecordings();
              }}
            >
              <Headphones size={15}></Headphones>
              {t("audio.recordings")}
            </button>
            <a
              role="menuitem"
              rel="external"
              href={`/api/v1/cases/${caseId}/hearings/${hearing.id}/export.jude`}
            >
              <Download size={15}></Download>
              {t("hearing.export")}
            </a>
          </div>
        {/if}
      </div>
    </div>
  </header>

  <div class={styles.switch} role="group" aria-label={t("hearing.panes")}>
    <button
      aria-pressed={pane === "transcript"}
      onclick={() => (pane = "transcript")}>{t("hearing.transcript")}</button
    >
    <button
      aria-pressed={pane === "findings"}
      onclick={() => (pane = "findings")}
      >{t("hearing.highlights")}
      {#if conflicts.length}<b>{conflicts.length}</b>{/if}</button
    >
  </div>

  <div class={styles.grid} data-pane={pane}>
    <section class={styles.panel} aria-labelledby="transcript-heading">
      {#if !segments.length && !partial && !recording}
        <div class={styles.hero}>
          <span class={styles.heroIcon} aria-hidden="true"
            ><Mic size={28}></Mic></span
          >
          <h2 id="transcript-heading">{t("hearing.hero.title")}</h2>
          <p>{t("hearing.hero.text")}</p>
          <button
            class={styles.heroButton}
            disabled={!caps?.speech.configured}
            onclick={() => capture?.startMic()}
          >
            <Mic size={18}></Mic>
            {t("audio.start")}
          </button>
          <div class={styles.heroAlt}>
            <button
              disabled={!caps?.speech.configured}
              onclick={() => capture?.chooseFile()}
              >{t("audio.prepared")}</button
            >
            <span aria-hidden="true">·</span>
            <button onclick={() => (manualOpen = true)}
              >{t("manual.add")}</button
            >
          </div>
          {#if !caps?.speech.configured}<p class={styles.quiet}>
              {t("audio.unavailable")}
            </p>{/if}
          <ol class={styles.steps}>
            <li><b>1</b>{t("hearing.hero.step1")}</li>
            <li><b>2</b>{t("hearing.hero.step2")}</li>
            <li><b>3</b>{t("hearing.hero.step3")}</li>
          </ol>
        </div>
      {:else}
        <Transcript
          {segments}
          {speakers}
          {partial}
          {findings}
          {recording}
          selectedSegment={selectedFinding?.segment_id ?? null}
          onRename={(speaker, label) =>
            action(() =>
              api(`/cases/${caseId}/speakers`, {
                method: "PATCH",
                body: JSON.stringify({ speaker, label }),
              }),
            )}
          onRetry={(id) =>
            action(() =>
              api(`/cases/${caseId}/transcripts/${id}/retry`, {
                method: "POST",
              }),
            )}
          select={(id) => {
            const f = findings.find((f) => f.segment_id === id);
            if (f) {
              filter = "all";
              selected = null;
              choose(f.id);
            }
          }}
        />
      {/if}
    </section>

    <section
      class={`${styles.panel} ${styles.highlights}`}
      aria-labelledby="findings-heading"
    >
      <div class={styles.panelHead}>
        <h2 id="findings-heading">
          <Sparkles size={16}></Sparkles>
          {t("hearing.highlights")}
        </h2>
        {#if findings.length}<small
            >{t("hearing.reviewedOf", {
              done: findings.length - open.length,
              total: findings.length,
            })}</small
          >{/if}
      </div>

      {#if findings.length}
        <div
          class={styles.segmented}
          role="group"
          aria-label={t("hearing.filter")}
        >
          <button
            aria-pressed={filter === "all"}
            onclick={() => (filter = "all")}
            >{t("hearing.filter.all")} <b>{findings.length}</b></button
          >
          <button
            aria-pressed={filter === "conflicts"}
            data-tone="warm"
            onclick={() => (filter = "conflicts")}
            >{t("hearing.filter.conflicts")} <b>{conflicts.length}</b></button
          >
          <button
            aria-pressed={filter === "open"}
            onclick={() => (filter = "open")}
            >{t("hearing.filter.open")} <b>{open.length}</b></button
          >
        </div>
      {/if}

      {#if !caps?.analysis.configured}<p class={styles.examining} data-idle>
          {t("hearing.analysisUnavailable")}
        </p>{:else if examining > 0}<p class={styles.examining} role="status">
          <i aria-hidden="true"></i>{tp("count.examining", examining)}
        </p>{:else if waiting > 0 && !live && caps?.analysis.configured}<p
          class={styles.examining}
          data-idle
        >
          {t("hearing.waiting", { count: waiting })}
          <button disabled={busy} onclick={analyze}
            >{t("hearing.analyzeNow")}</button
          >
        </p>{/if}

      <div class={styles.feed}>
        {#each visible as f (f.id)}{@const statement = segmentMap.get(
            f.segment_id,
          )}{@const expanded = selected === f.id}
          <article
            class={styles.card}
            id={`finding-${f.id}`}
            data-status={f.status}
            data-open={expanded || undefined}
            data-reviewed={f.reviewed || undefined}
          >
            <button
              class={styles.cardHead}
              aria-expanded={expanded}
              onclick={() => choose(f.id)}
            >
              <span class={styles.cardTop}>
                <span class={styles.pill} data-status={f.status}
                  >{statusLabel(f.status)}</span
                >
                {#if !seen.has(f.id)}<span class={styles.new}
                    >{t("hearing.new")}</span
                  >{/if}
                {#if f.reviewed}<span class={styles.done}
                    >{t("common.reviewed")}</span
                  >{/if}
              </span>
              <strong>{f.title}</strong>
              {#if statement}<small
                  >{speakerName(statement.speaker, speakers)} · {timestamp(
                    statement.start,
                  )}</small
                >{/if}
            </button>
            {#if expanded}
              <FindingInspector
                finding={f}
                segment={statement}
                {caseId}
                {busy}
                {speakers}
                onAsk={() =>
                  onAsk({
                    text: t("dock.ask.finding", { title: f.title }),
                    references: [`statement:${f.segment_id}`],
                    label: f.title,
                  })}
                save={(body) =>
                  action(() =>
                    api(`/cases/${caseId}/findings/${f.id}`, {
                      method: "PATCH",
                      body: JSON.stringify(body),
                    }),
                  )}
              />
            {/if}
          </article>
        {:else}
          {#if examining === 0}<div class={styles.empty}>
              <span class={styles.emptyIcon} aria-hidden="true"
                ><ShieldCheck size={22}></ShieldCheck></span
              >
              <h3>
                {filter === "all"
                  ? t("hearing.emptyTitle")
                  : t("hearing.emptyFilterTitle")}
              </h3>
              <p>
                {filter === "all"
                  ? t("hearing.emptyText")
                  : t("hearing.emptyFilterText")}
              </p>
            </div>{/if}
        {/each}
      </div>

      <div class={styles.quick}>
        <button
          onclick={() =>
            ask(
              live
                ? t("dock.ask.liveConflicts")
                : t("dock.ask.hearingConflicts"),
            )}
        >
          <Sparkles size={14}></Sparkles>
          {t("hearing.quick.conflicts")}
        </button>
        <button
          onclick={() =>
            ask(
              live
                ? t("dock.ask.liveQuestions")
                : t("dock.ask.hearingQuestions"),
            )}>{t("hearing.quick.questions")}</button
        >
        <button
          onclick={() =>
            ask(
              live ? t("dock.ask.liveSummary") : t("dock.ask.hearingSummary"),
            )}>{t("hearing.quick.summary")}</button
        >
      </div>
    </section>
  </div>
</div>

<ManualTranscript
  open={manualOpen}
  onClose={() => (manualOpen = false)}
  {busy}
  submit={(body) =>
    action(() =>
      api(`/cases/${caseId}/transcripts`, {
        method: "POST",
        body: JSON.stringify({ ...body, hearing_id: hearing.id }),
      }),
    )}
/>
