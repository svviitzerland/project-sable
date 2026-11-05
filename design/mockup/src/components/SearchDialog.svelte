<script lang="ts">
  import { Search } from "@lucide/svelte";
  import type { Kind } from "../lib/kinds";
  import { fmtClock, l, t } from "../lib/i18n";
  import { go } from "../lib/router.svelte";
  import { db, doc, findingsOfCase, hearing, hearingsOf, inspect, speaker, speakerName } from "../lib/store.svelte";
  import KindIcon from "./KindIcon.svelte";
  import Overlay from "./Overlay.svelte";

  let { open, caseId, onclose }: { open: boolean; caseId: string | null; onclose: () => void } = $props();

  let query = $state("");
  let active = $state(0);

  type Hit = { group: string; kind: Kind; speakerId?: string; title: string; meta: string; run: () => void };

  let hits = $derived.by<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: Hit[] = [];
    const cases = caseId ? db.cases.filter((c) => c.id === caseId) : db.cases;
    for (const c of cases) {
      for (const h of hearingsOf(c.id).filter((h) => l(h.title).toLowerCase().includes(q)).slice(0, 4)) {
        out.push({ group: t("nav.hearings"), kind: "hearing", title: `${t("common.hearingN", { n: h.number })} · ${l(h.title)}`, meta: t(`mode.${h.mode}`), run: () => go(`/case/${c.id}/hearings/${h.id}`) });
      }
      for (const f of findingsOfCase(c.id).filter((f) => `${l(f.title)} ${l(f.explanation)}`.toLowerCase().includes(q)).slice(0, 4)) {
        out.push({ group: t("nav.findings"), kind: "finding", title: l(f.title), meta: t(`status.${f.status}`), run: () => inspect({ kind: "finding", id: f.id }) });
      }
      const docIds = new Set(db.documents.filter((d) => d.caseId === c.id).map((d) => d.id));
      for (const p of db.passages.filter((p) => docIds.has(p.docId) && p.text.toLowerCase().includes(q)).slice(0, 4)) {
        const d = doc(p.docId);
        out.push({ group: t("nav.evidence"), kind: "passage", title: p.text, meta: `${d?.title} · ${t("common.page", { n: p.page })}`, run: () => inspect({ kind: "passage", id: p.id }) });
      }
      const hearingIds = new Set(hearingsOf(c.id).map((h) => h.id));
      for (const s of db.statements.filter((s) => hearingIds.has(s.hearingId) && s.text.toLowerCase().includes(q)).slice(0, 5)) {
        const h = hearing(s.hearingId);
        out.push({ group: t("hv.transcript"), kind: "statement", speakerId: s.speakerId, title: s.text, meta: `${h ? t("common.hearingN", { n: h.number }) : ""} · ${fmtClock(s.t)} · ${speakerName(speaker(s.speakerId))}`, run: () => inspect({ kind: "statement", id: s.id }) });
      }
    }
    return out;
  });

  $effect(() => {
    void query;
    active = 0;
  });

  function choose(hit: Hit | undefined) {
    if (!hit) return;
    onclose();
    query = "";
    setTimeout(hit.run, 0);
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      active = Math.min(active + 1, hits.length - 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      active = Math.max(active - 1, 0);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(hits[active]);
    }
  }

  function mark(text: string) {
    const q = query.trim();
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0 || !q) return { before: text, hit: "", after: "" };
    const start = Math.max(0, i - 40);
    return { before: (start > 0 ? "…" : "") + text.slice(start, i), hit: text.slice(i, i + q.length), after: text.slice(i + q.length, i + q.length + 90) };
  }
</script>

<Overlay {open} {onclose} variant="dialog" label={t("top.search")} width={640}>
  <div class="search-box">
    <Search size={18} />
    <input
      class="input"
      type="search"
      role="combobox"
      aria-expanded={hits.length > 0}
      aria-controls="search-results"
      aria-activedescendant={hits.length ? `hit-${active}` : undefined}
      placeholder={t("top.searchPlaceholder")}
      bind:value={query}
      {onkeydown}
      data-autofocus
    />
    <span class="kbd">Esc</span>
  </div>
  <ul class="results scroll-y" id="search-results" role="listbox" aria-label={t("top.search")}>
    {#each hits as hit, i (i)}
      {@const m = mark(hit.title)}
      {#if i === 0 || hits[i - 1].group !== hit.group}
        <li class="group" role="presentation">{hit.group}</li>
      {/if}
      <li id="hit-{i}" role="option" aria-selected={i === active}>
        <button class="hit" class:active={i === active} onclick={() => choose(hit)} onmouseenter={() => (active = i)} tabindex="-1">
          <KindIcon kind={hit.kind} speakerId={hit.speakerId} size={18} />
          <span class="hit-body">
            <span class="hit-title clamp-2">{m.before}<mark>{m.hit}</mark>{m.after}</span>
            <span class="xsmall muted">{hit.meta}</span>
          </span>
        </button>
      </li>
    {:else}
      {#if query.trim().length >= 2}<li class="empty small muted">{t("ev.noResults")}</li>{/if}
    {/each}
  </ul>
</Overlay>

<style>
  .search-box {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--line);
    color: var(--muted);
  }
  .input {
    flex: 1;
    border: 0;
    background: transparent;
    font-size: 16px;
    min-height: 36px;
    color: var(--ink-strong);
  }
  .input:focus-visible {
    outline: none;
  }
  .results {
    max-height: min(60dvh, 520px);
    padding: 6px;
  }
  .group {
    padding: 10px 10px 4px;
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .hit {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    width: 100%;
    padding: 9px 10px;
    border-radius: var(--radius-control);
    text-align: left;
    color: var(--ink);
  }
  .hit :global(svg) {
    margin-top: 2px;
    color: var(--muted);
  }
  .hit.active {
    background: var(--selected);
  }
  .hit-body {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .hit-title {
    font-size: 13px;
  }
  .empty {
    padding: 20px;
    text-align: center;
  }
</style>
