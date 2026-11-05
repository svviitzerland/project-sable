<script lang="ts">
  import { t, tp } from "../lib/i18n/index.svelte";
  import {
    ArrowLeft,
    Check,
    Download,
    Ellipsis,
    FileAudio,
    FilePlus2,
    Headphones,
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
  import Skeleton from "./Skeleton.svelte";

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

  type Filter = "all" | "conflicts" | "open";

  let filter = $state<Filter>("all");
  let selected = $state<string | null>(null);
  let menuOpen = $state(false);
  let manualOpen = $state(false);
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
  // Conflicts first, then newest: what needs attention is at the top.
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
      ["pending", "unavailable", "failed", "interrupted"].includes(
        s.analysis_state,
      ),
    ).length,
  );
  let selectedFinding = $derived(findings.find((f) => f.id === selected));
  let live = $derived(audio.status !== "idle" || hearing.status === "live");

  function choose(id: string) {
    selected = selected === id ? null : id;
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

  <header class={styles.top}>
    <div class={styles.titleBlock}>
      <h1>{hearing.title}</h1>
      <p class={styles.meta}>
        <i class={styles.dot} data-live={live} data-on={connected}></i>
        <span
          >{live
            ? t("hearing.state.live")
            : hearing.status === "complete"
              ? t("hearing.state.complete")
              : t("hearing.state.ready")}</span
        >
        <span aria-hidden="true">·</span>
        <span>{tp("count.statements", segments.length)}</span>
        {#if conflicts.length}<span aria-hidden="true">·</span>
          <strong class={styles.warm}
            >{tp("count.conflicts", conflicts.length)}</strong
          >{/if}
        {#if examining}<span aria-hidden="true">·</span>
          <span class={styles.pulse}>{tp("count.examining", examining)}</span
          >{/if}
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
              disabled={!caps?.speech.configured || audio.status !== "idle"}
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

  {#if waiting > 0 && !examining && caps?.analysis.configured}
    <div class={styles.banner}>
      <span>{t("hearing.waiting", { count: waiting })}</span>
      <button disabled={busy} onclick={analyze}>
        <ShieldCheck size={14}></ShieldCheck>
        {t("hearing.analyzeNow")}
      </button>
    </div>
  {:else if !caps?.analysis.configured}
    <p class={styles.quiet}>{t("hearing.analysisUnavailable")}</p>
  {/if}

  <div class={styles.grid}>
    <section class={styles.transcript} aria-labelledby="transcript-heading">
      <Transcript
        {segments}
        {speakers}
        {partial}
        {findings}
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
    </section>

    <section class={styles.findings} aria-labelledby="findings-heading">
      <div class={styles.colHead}>
        <h2 id="findings-heading">
          {t("hearing.findings")}
          {#if findings.length}<small
              >{t("hearing.reviewedOf", {
                done: findings.length - open.length,
                total: findings.length,
              })}</small
            >{/if}
        </h2>
      </div>
      {#if findings.length}
        <div
          class={styles.filters}
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
      <div class={styles.findingList}>
        {#if examining > 0 && !visible.length}<Skeleton
            variant="rows"
            count={2}
            label={t("hearing.examining")}
          />{/if}
        {#each visible as f (f.id)}{@const statement = segmentMap.get(
            f.segment_id,
          )}{@const expanded = selected === f.id}
          <article
            class={styles.finding}
            id={`finding-${f.id}`}
            data-status={f.status}
            data-open={expanded || undefined}
            data-reviewed={f.reviewed || undefined}
          >
            <button
              class={styles.findingHead}
              aria-expanded={expanded}
              onclick={() => choose(f.id)}
            >
              <span class={styles.pill} data-status={f.status}
                >{statusLabel(f.status)}</span
              >
              {#if f.reviewed}<span class={styles.done}
                  ><Check size={12}></Check>
                  {t("common.reviewed")}</span
                >{/if}
              <strong>{f.title}</strong>
              {#if statement && !expanded}<small
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
              <ShieldCheck size={24}></ShieldCheck>
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
      <button
        class={styles.askBar}
        onclick={() =>
          onAsk({
            text: t("dock.ask.hearingConflicts"),
            references: [],
            send: true,
          })}
      >
        <Sparkles size={15}></Sparkles>
        {t("hearing.askConflicts")}
      </button>
    </section>
  </div>
  <p class={styles.footnote}>{t("hearing.bottomNote")}</p>
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
