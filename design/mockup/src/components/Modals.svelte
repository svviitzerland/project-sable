<script lang="ts">
  import { Download, FilePlus2, FileUp, FolderOpen, Trash2, X } from "@lucide/svelte";
  import { t } from "../lib/i18n";
  import { endLive, live } from "../lib/live.svelte";
  import { prefs } from "../lib/prefs.svelte";
  import { go, route } from "../lib/router.svelte";
  import { caseById, db, hearing, renameSpeaker, speaker, speakerName, toast, toastT, ui } from "../lib/store.svelte";
  import NewHearingModal from "./NewHearingModal.svelte";
  import Overlay from "./Overlay.svelte";

  let modal = $derived(ui.modal);
  const close = () => (ui.modal = null);

  let titles = $derived.by(() => {
    switch (modal?.kind) {
      case "newHearing": return t("nh.title");
      case "newCase": return t("newCase.title");
      case "settings": return t("set.title");
      case "rename": return t("rn.title");
      case "shortcuts": return t("sc.title");
      case "endLive": return t("live.endTitle");
      case "account": return t("acc.title");
      default: return "";
    }
  });

  // New case
  let caseStep = $state<"choose" | "blank" | "import">("choose");
  let newTitle = $state("");
  let newRef = $state("");
  let importing = $state(false);

  // Settings
  let editTitle = $state("");
  let editRef = $state("");
  $effect(() => {
    if (modal?.kind === "settings") {
      const c = caseById(modal.caseId);
      editTitle = c?.title ?? "";
      editRef = c?.reference ?? "";
    }
    if (modal?.kind === "newCase") caseStep = "choose";
    if (modal?.kind === "rename") renameValue = "";
  });

  // Rename speaker
  let renameValue = $state("");

  function createCase() {
    const id = `c${Date.now()}`;
    db.cases.push({
      id,
      title: newTitle || "Perkara baru",
      reference: newRef,
      label: "synthetic",
      summary: { id: "Perkara baru. Belum ada berkas atau sidang.", en: "New case. No documents or hearings yet." },
      client: "—",
      court: "Pengadilan Negeri Contoh",
      updated: "2026-11-04",
    });
    newTitle = "";
    newRef = "";
    toastT("toast.caseCreated");
    close();
    go(`/case/${id}`);
  }

  async function importCase() {
    importing = true;
    await new Promise((r) => setTimeout(r, 1400));
    importing = false;
    close();
    toastT("toast.caseCreated");
    go("/case/c1");
  }

  const shortcuts = [
    { keys: ["/"], label: "sc.search" },
    { keys: ["A"], label: "sc.assistant" },
    { keys: ["G", "O · H · F · E"], label: "sc.go" },
    { keys: ["J", "K"], label: "sc.nextPrev" },
    { keys: ["R"], label: "sc.review" },
    { keys: ["C"], label: "sc.copy" },
    { keys: ["Esc"], label: "sc.close" },
    { keys: ["?"], label: "sc.help" },
  ] as const;
</script>

<Overlay open={!!modal} onclose={close} variant="dialog" label={titles} width={modal?.kind === "newHearing" ? 620 : 520}>
  {#if modal}
    <div class="head">
      <h2>{titles}</h2>
      <button class="btn btn-ghost btn-icon" aria-label={t("common.close")} onclick={close}><X size={18} /></button>
    </div>
    <div class="body scroll-y">
      {#if modal.kind === "newHearing"}
        <NewHearingModal caseId={route.parts[1] ?? "c1"} flow={modal.flow} hearingId={modal.hearingId} />
      {:else if modal.kind === "newCase"}
        {#if caseStep === "choose"}
          <div class="options">
            <button class="option" onclick={() => (caseStep = "blank")}><FilePlus2 size={20} /><span><strong>{t("newCase.blank")}</strong><span class="small muted">{t("newCase.blankText")}</span></span></button>
            <button class="option" onclick={() => (caseStep = "import")}><FileUp size={20} /><span><strong>{t("newCase.import")}</strong><span class="small muted">{t("newCase.importText")}</span></span></button>
            <button class="option" onclick={() => { close(); go("/case/c1"); }}><FolderOpen size={20} /><span><strong>{t("newCase.demo")}</strong><span class="small muted">{t("newCase.demoText")}</span></span></button>
          </div>
        {:else if caseStep === "blank"}
          <form class="form" onsubmit={(e) => { e.preventDefault(); createCase(); }}>
            <label class="field-label">{t("newCase.caseTitle")}<input class="field" bind:value={newTitle} placeholder={t("newCase.titlePlaceholder")} required data-autofocus /></label>
            <label class="field-label">{t("newCase.reference")}<input class="field" bind:value={newRef} placeholder="000/Pid.B/2026/PN …" /></label>
            <div class="foot">
              <button type="button" class="btn" onclick={() => (caseStep = "choose")}>{t("common.back")}</button>
              <button class="btn btn-primary" type="submit">{t("newCase.create")}</button>
            </div>
          </form>
        {:else}
          <label class="drop">
            <FileUp size={20} />
            <strong>{importing ? t("newCase.importing") : t("newCase.import")}</strong>
            <span class="xsmall muted">{t("newCase.importText")}</span>
            <input class="sr-only" type="file" accept=".jude" onchange={importCase} />
          </label>
          <button class="link-btn" onclick={importCase} disabled={importing}>{t("newCase.demo")} (.jude)</button>
          <div class="foot"><button class="btn" onclick={() => (caseStep = "choose")}>{t("common.back")}</button></div>
        {/if}
      {:else if modal.kind === "settings"}
        {@const c = caseById(modal.caseId)}
        {#if c}
          <section class="section">
            <h3>{t("set.details")}</h3>
            <label class="field-label">{t("set.caseTitle")}<input class="field" bind:value={editTitle} /></label>
            <label class="field-label">{t("set.reference")}<input class="field" bind:value={editRef} /></label>
            <div><button class="btn btn-primary" onclick={() => { c.title = editTitle; c.reference = editRef; toastT("toast.noteSaved"); }}>{t("set.save")}</button></div>
          </section>
          <section class="section">
            <h3>{t("set.export")}</h3>
            <p class="small muted">{t("set.exportText")}</p>
            <div><button class="btn" onclick={() => toastT("toast.exported")}><Download size={15} />{t("set.exportBtn")}</button></div>
          </section>
          <section class="section">
            <h3>{t("set.voices")}</h3>
            <p class="small muted">{t("set.voicesText")}</p>
            <div><button class="btn" onclick={() => toastT("toast.voices")}>{t("set.forget")}</button></div>
          </section>
          <section class="section danger">
            <h3>{t("set.danger")}</h3>
            <p class="small muted">{t("set.dangerText")}</p>
            <div><button class="btn btn-danger" onclick={() => toastT("toast.deleted")}><Trash2 size={15} />{t("set.delete")}</button></div>
          </section>
        {/if}
      {:else if modal.kind === "rename"}
        {@const sp = speaker(modal.speakerId)}
        <form class="form" onsubmit={(e) => { e.preventDefault(); renameSpeaker(modal.speakerId, renameValue); close(); }}>
          <p class="small muted">{t("rn.text")}</p>
          <p><strong>{speakerName(sp)}</strong></p>
          <label class="field-label">{t("rn.label")}<input class="field" bind:value={renameValue} placeholder={t("rn.placeholder")} required data-autofocus /></label>
          <div class="quick">
            <span class="xsmall muted">{t("rn.quick")}</span>
            {#each ["Penasihat Hukum", "Hakim Anggota", "Panitera Pengganti", "Saksi Yusuf"] as q (q)}
              <button type="button" class="chip" aria-pressed={renameValue === q} onclick={() => (renameValue = q)}>{q}</button>
            {/each}
          </div>
          <div class="foot">
            <button type="button" class="btn" onclick={close}>{t("common.cancel")}</button>
            <button class="btn btn-primary" type="submit" disabled={!renameValue.trim()}>{t("rn.save")}</button>
          </div>
        </form>
      {:else if modal.kind === "shortcuts"}
        <dl class="keys">
          {#each shortcuts as s (s.label)}
            <dt>{#each s.keys as k, i (k)}{#if i > 0}<span class="xsmall muted"> {s.label === "sc.go" ? t("sc.then") : "/"} </span>{/if}<span class="kbd">{k}</span>{/each}</dt>
            <dd>{t(s.label)}</dd>
          {/each}
        </dl>
      {:else if modal.kind === "endLive"}
        {@const h = hearing(live.hearingId)}
        <p>{t("live.endText")}</p>
        <div class="foot">
          <button class="btn" onclick={close}>{t("live.keep")}</button>
          <button class="btn btn-primary" onclick={() => {
            const ended = endLive();
            close();
            if (ended) {
              toast(t("toast.liveEnded", { n: ended.number }));
              go(`/case/${ended.caseId}/hearings/${ended.id}`);
            }
          }}>{t("live.endConfirm")}</button>
        </div>
        {#if !h}<p class="small muted">{t("live.stopped")}</p>{/if}
      {:else if modal.kind === "account"}
        <div class="account">
          <div class="me"><span class="avatar">A</span><span><strong>Advokat Contoh</strong><span class="small muted">advokat@contoh.id</span></span></div>
          <section class="section">
            <h3>{t("acc.plan")} · Advokat Pro <span class="tag tag-sand">{t("acc.simulated")}</span></h3>
            <div class="meter">
              <span class="small">{t("acc.hours")}</span>
              <span class="tabular small muted">{t("acc.usageOf", { used: "6,4", limit: "15" })}</span>
              <span class="bar"><span style="width:43%"></span></span>
            </div>
            <div class="meter">
              <span class="small">{t("acc.questions")}</span>
              <span class="tabular small muted">{t("acc.usageOf", { used: 41 + ui.chat.filter((m) => m.role === "user").length, limit: 300 })}</span>
              <span class="bar"><span style="width:{Math.min(100, ((41 + ui.chat.length) / 300) * 100)}%"></span></span>
            </div>
          </section>
          <section class="section">
            <h3>{t("acc.language")}</h3>
            <div class="seg" role="group" aria-label={t("acc.language")}>
              <button aria-pressed={prefs.lang === "id"} onclick={() => (prefs.lang = "id")}>Bahasa Indonesia</button>
              <button aria-pressed={prefs.lang === "en"} onclick={() => (prefs.lang = "en")}>English</button>
            </div>
          </section>
          <div class="foot"><button class="btn" onclick={() => { close(); toastT("toast.signOut"); }}>{t("acc.signOut")}</button></div>
        </div>
      {/if}
    </div>
  {/if}
</Overlay>

<style>
  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 12px 12px 20px;
    border-bottom: 1px solid var(--line);
  }
  .head h2 {
    flex: 1;
    font-family: var(--font-serif);
    font-size: 22px;
    font-weight: 400;
    color: var(--ink-strong);
  }
  .body {
    padding: 18px 20px 20px;
    display: grid;
    gap: 14px;
    min-height: 0;
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
  }
  .option > span {
    display: grid;
    gap: 2px;
  }
  .option:hover {
    border-color: var(--ink-strong);
    background: var(--surface-2);
  }
  .form {
    display: grid;
    gap: 12px;
  }
  .foot {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
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
  }
  .section {
    display: grid;
    gap: 8px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--line);
  }
  .section:last-child {
    border-bottom: 0;
  }
  .section h3 {
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-strong);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .danger h3 {
    color: var(--live);
  }
  .quick {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .keys {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 10px 16px;
    align-items: center;
  }
  .keys dt {
    display: flex;
    align-items: center;
    gap: 4px;
    justify-content: flex-end;
  }
  .account {
    display: grid;
    gap: 14px;
  }
  .me {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .me > span:last-child {
    display: grid;
  }
  .avatar {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--primary);
    color: var(--primary-ink);
    font-weight: 700;
  }
  .meter {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px 10px;
  }
  .bar {
    grid-column: 1 / -1;
    height: 6px;
    border-radius: 3px;
    background: var(--sunken);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--primary);
  }
</style>
