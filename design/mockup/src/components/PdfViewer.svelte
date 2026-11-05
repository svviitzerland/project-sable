<script lang="ts">
  import "pdfjs-dist/web/pdf_viewer.css";
  import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
  import { ChevronDown, ChevronUp, Copy, LayoutDashboard, Minus, Plus, ScanLine, Search, Waypoints } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { t } from "../lib/i18n";
  import { go } from "../lib/router.svelte";
  import { connectionsFor, findingsCiting, findingsPath, inspect, isMeaningful, openAssistant, openFinding, passagesOf, toastT } from "../lib/store.svelte";
  import type { CaseDocument, Passage } from "../lib/types";
  import KindIcon from "./KindIcon.svelte";

  /**
   * The original document, rendered by PDF.js exactly as filed (tables, images, figures, math,
   * scans), with Jude's layer on top: cited passages highlighted, a mark in the margin for each
   * finding, and a toolbar for any selected text that hands it to the assistant with its page.
   */
  let { caseId, d, focus = null }: { caseId: string; d: CaseDocument; focus?: string | null } = $props();

  let host: HTMLDivElement | undefined = $state();
  let frame: HTMLDivElement | undefined = $state();
  let loading = $state(true);
  let failed = $state(false);
  let pageCount = $state(0);
  let page = $state(1);
  let zoom = $state(100);
  let query = $state("");
  let found = $state<{ current: number; total: number } | null>(null);
  let sel = $state<{ x: number; y: number; text: string; page: number; pid?: string } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let viewer: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bus: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let task: any = null;

  let passages = $derived(passagesOf(d.id));
  let cited = $derived(new Set(passages.filter((p) => findingsCiting(p.id).length).map((p) => p.page)));

  onMount(() => {
    let gone = false;
    (async () => {
      const lib = await import("pdfjs-dist");
      // The viewer components read the core library from globalThis.
      (globalThis as unknown as { pdfjsLib: typeof lib }).pdfjsLib = lib;
      lib.GlobalWorkerOptions.workerSrc = workerUrl;
      const { EventBus, PDFLinkService, PDFFindController, PDFViewer } = await import("pdfjs-dist/web/pdf_viewer.mjs");
      if (gone || !host) return;
      // Jude's marks are real buttons inside PDF.js's page layers, so clicks and selections are
      // read from the page container, the way PDF.js wires its own layers.
      host.addEventListener("click", onLayerClick);
      host.addEventListener("pointerup", () => setTimeout(onSelect, 0));
      host.addEventListener("keyup", onSelect);
      bus = new EventBus();
      const links = new PDFLinkService({ eventBus: bus });
      const finder = new PDFFindController({ eventBus: bus, linkService: links });
      viewer = new PDFViewer({ container: host, eventBus: bus, linkService: links, findController: finder, removePageBorders: false });
      links.setViewer(viewer);
      bus.on("pagesinit", () => {
        viewer.currentScaleValue = "page-width";
        pageCount = viewer.pagesCount;
        loading = false;
        if (focus) goToPassage(focus);
      });
      bus.on("pagechanging", (e: { pageNumber: number }) => (page = e.pageNumber));
      bus.on("scalechanging", (e: { scale: number }) => (zoom = Math.round(e.scale * 100)));
      bus.on("textlayerrendered", (e: { pageNumber: number }) => decorate(e.pageNumber));
      const onCount = (e: { matchesCount: { current: number; total: number } }) => (found = e.matchesCount);
      bus.on("updatefindmatchescount", onCount);
      bus.on("updatefindcontrolstate", onCount);
      task = lib.getDocument({ url: d.pdf, enableXfa: false });
      const pdf = await task.promise;
      if (gone) return;
      viewer.setDocument(pdf);
      links.setDocument(pdf);
    })().catch(() => {
      failed = true;
      loading = false;
    });
    return () => {
      gone = true;
      // Ends the document's worker work; the loading task owns it in PDF.js 6.
      void task?.destroy?.();
    };
  });

  // Follow ?p= changes while the viewer is open.
  $effect(() => {
    const id = focus;
    if (id && pageCount) goToPassage(id);
  });

  function goToPassage(id: string) {
    const p = passages.find((x) => x.id === id);
    if (!p || !viewer) return;
    viewer.scrollPageIntoView({ pageNumber: p.page });
    flash = id;
  }
  let flash: string | null = null;

  /** Rectangles of a passage on a rendered page, matched against the text layer ignoring spacing. */
  function rectsFor(layer: HTMLElement, text: string): DOMRect[] {
    const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
    const map: { node: Text; i: number }[] = [];
    let flat = "";
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      for (let i = 0; i < node.data.length; i++) {
        if (/\s/.test(node.data[i])) continue;
        flat += node.data[i];
        map.push({ node, i });
      }
    }
    const want = text.replace(/\s+/g, "");
    const at = flat.indexOf(want);
    if (at < 0) return [];
    const range = document.createRange();
    range.setStart(map[at].node, map[at].i);
    const end = map[at + want.length - 1];
    range.setEnd(end.node, end.i + 1);
    return [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
  }

  // The same marks as the rest of the app: "!" worth a look, a tick once checked, a dot when a finding asks nothing.
  const markSvg = `<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2.1v4.8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="6" cy="9.5" r="1.1" fill="currentColor"/></svg>`;
  const doneSvg = `<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.6 6.3l2.2 2.2 4.6-4.9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const dotSvg = `<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="1.9" fill="currentColor"/></svg>`;

  function decorate(n: number) {
    const view = viewer?.getPageView(n - 1);
    const div: HTMLElement | undefined = view?.div;
    const layer = div?.querySelector(".textLayer") as HTMLElement | null;
    if (!div || !layer) return;
    div.querySelector(".jude-layer")?.remove();
    const overlay = document.createElement("div");
    overlay.className = "jude-layer";
    const box = div.getBoundingClientRect();
    const pct = (v: number, of: number) => `${(v / of) * 100}%`;
    for (const p of passages.filter((x) => x.page === n)) {
      const findings = findingsCiting(p.id);
      const linked = connectionsFor({ kind: "passage", id: p.id }).length > 0;
      if (!findings.length && !linked && !d.scanned) continue;
      const loud = findings.some((f) => f.status === "potential_inconsistency");
      const tone = findings.some(isMeaningful) ? (loud ? "loud" : "context") : findings.length ? "quiet" : "linked";
      const rects = rectsFor(layer, p.text);
      if (!rects.length) {
        // A picture page has no text to highlight: mark the page once, and open the OCR text.
        const tag = document.createElement("button");
        tag.className = `jude-ocr ${findings.length ? tone : "plain"}`;
        tag.dataset.pid = p.id;
        tag.innerHTML = `${findings.length ? markSvg : ""}<span>${findings.length ? t("pdf.ocrMark") : t("pdf.ocrText")}</span>`;
        overlay.append(tag);
        continue;
      }
      for (const r of rects) {
        const hl = document.createElement("button");
        hl.className = `jude-hl ${tone}${flash === p.id ? " flash" : ""}`;
        hl.dataset.pid = p.id;
        hl.tabIndex = -1;
        hl.setAttribute("aria-hidden", "true");
        hl.style.left = pct(r.left - box.left, box.width);
        hl.style.top = pct(r.top - box.top, box.height);
        hl.style.width = pct(r.width, box.width);
        hl.style.height = pct(r.height, box.height);
        overlay.append(hl);
      }
      if (findings.length) {
        const mark = document.createElement("button");
        mark.className = `jude-mark ${tone}`;
        mark.dataset.fid = findings[0].id;
        mark.title = t("pdf.cited");
        mark.setAttribute("aria-label", `${t("pdf.cited")} · ${t("common.page", { n })}`);
        const open = findings.filter((f) => isMeaningful(f) && !f.reviewed);
        mark.innerHTML = open.length ? markSvg : findings.some(isMeaningful) ? doneSvg : dotSvg;
        mark.style.top = pct(rects[0].top - box.top, box.height);
        overlay.append(mark);
      }
    }
    div.append(overlay);
    if (flash && host && passages.some((x) => x.id === flash && x.page === n)) {
      // Scroll the document pane only, so the page around it stays put.
      const el = overlay.querySelector(`[data-pid="${flash}"]`);
      if (el) host.scrollTop += el.getBoundingClientRect().top - host.getBoundingClientRect().top - host.clientHeight / 3;
      flash = null;
    }
  }

  function onLayerClick(event: MouseEvent) {
    const el = (event.target as HTMLElement).closest("[data-pid], [data-fid]") as HTMLElement | null;
    if (!el || window.getSelection()?.toString()) return;
    if (el.dataset.fid) openFinding(el.dataset.fid);
    else if (el.dataset.pid) inspect({ kind: "passage", id: el.dataset.pid });
  }

  // Any selection on a page gets the same few actions, wherever it is.
  function onSelect() {
    const s = window.getSelection();
    const text = s?.toString().replace(/\s+/g, " ").trim() ?? "";
    if (!s || s.isCollapsed || text.length < 3 || !frame) return void (sel = null);
    const anchor = (s.anchorNode instanceof Element ? s.anchorNode : s.anchorNode?.parentElement)?.closest(".page") as HTMLElement | null;
    if (!anchor || !host?.contains(anchor)) return void (sel = null);
    const n = Number(anchor.dataset.pageNumber);
    const r = s.getRangeAt(0).getBoundingClientRect();
    const f = frame.getBoundingClientRect();
    const squash = (v: string) => v.replace(/\s+/g, "").toLowerCase();
    const p: Passage | undefined = passages.find((x) => x.page === n && (squash(x.text).includes(squash(text)) || squash(text).includes(squash(x.text).slice(0, 40))));
    sel = {
      x: Math.min(Math.max(r.left + r.width / 2 - f.left, 150), f.width - 150),
      y: Math.max(r.top - f.top - 8, 46),
      text,
      page: n,
      pid: p?.id,
    };
  }

  function ask() {
    if (!sel) return;
    const quote = sel.text.length > 220 ? sel.text.slice(0, 220) + "…" : sel.text;
    openAssistant({ kind: "documents" }, t("pdf.askQuestion", { quote, doc: d.title, page: sel.page }), [sel.pid ? { kind: "passage", id: sel.pid } : { kind: "document", id: d.id }], true);
    sel = null;
  }

  async function copyCite() {
    if (!sel) return;
    try {
      await navigator.clipboard.writeText(`“${sel.text}” (${d.title}, ${t("common.page", { n: sel.page })})`);
    } catch {
      /* The toast still confirms intent in the mockup. */
    }
    toastT("toast.citeCopied");
    sel = null;
  }

  function step(delta: number) {
    if (!viewer) return;
    if (delta > 0) viewer.increaseScale();
    else viewer.decreaseScale();
  }

  function find(again = false, back = false) {
    if (!bus) return;
    if (!query.trim()) return void (found = null);
    bus.dispatch("find", { source: null, type: again ? "again" : "", query: query.trim(), caseSensitive: false, entireWord: false, highlightAll: true, findPrevious: back, matchDiacritics: false });
  }

  let findTimer: ReturnType<typeof setTimeout> | undefined;
  function onQuery() {
    clearTimeout(findTimer);
    findTimer = setTimeout(() => find(), 220);
  }
</script>

<svelte:document onselectionchange={() => { if (window.getSelection()?.isCollapsed) sel = null; }} />

<div class="viewer">
  <nav class="rail" aria-label={t("docs.reader")}>
    {#each Array.from({ length: pageCount || d.pages }, (_, i) => i + 1) as n (n)}
      <button class="rail-item" aria-current={n === page ? "page" : undefined} onclick={() => viewer && (viewer.currentPageNumber = n)}>
        <span>{t("docs.pageN", { n })}</span>
        {#if cited.has(n)}<span class="pip" title={t("pdf.cited")}></span>{/if}
      </button>
    {/each}
  </nav>

  <div class="main">
    <div class="bar" role="toolbar" aria-label={d.title}>
      <span class="tabular page-no">{t("pdf.page", { n: page, total: pageCount || d.pages })}</span>
      <span class="zoom">
        <button class="btn btn-sm btn-ghost btn-icon" aria-label={t("pdf.zoomOut")} title={t("pdf.zoomOut")} onclick={() => step(-1)}><Minus size={15} /></button>
        <span class="tabular zoom-val">{zoom}%</span>
        <button class="btn btn-sm btn-ghost btn-icon" aria-label={t("pdf.zoomIn")} title={t("pdf.zoomIn")} onclick={() => step(1)}><Plus size={15} /></button>
        <button class="btn btn-sm" onclick={() => viewer && (viewer.currentScaleValue = "page-width")}>{t("pdf.fit")}</button>
      </span>
      <span class="find">
        <Search size={15} />
        <label class="sr-only" for="pdf-find">{t("pdf.find")}</label>
        <input
          id="pdf-find"
          class="field"
          type="search"
          placeholder={t("pdf.find")}
          bind:value={query}
          oninput={onQuery}
          onkeydown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              find(true, e.shiftKey);
            }
          }}
        />
        {#if query.trim() && found}
          <span class="xsmall muted tabular">{found.total ? t("pdf.matches", { i: found.current, n: found.total }) : t("pdf.noMatch")}</span>
          <button class="btn btn-sm btn-ghost btn-icon" aria-label={t("pdf.prev")} onclick={() => find(true, true)}><ChevronUp size={15} /></button>
          <button class="btn btn-sm btn-ghost btn-icon" aria-label={t("pdf.next")} onclick={() => find(true)}><ChevronDown size={15} /></button>
        {/if}
      </span>
    </div>

    {#if d.file === "DOCX"}<p class="notice small">{t("pdf.converted")}</p>{/if}
    {#if d.scanned}<p class="notice small"><ScanLine size={15} />{t("pdf.scanned")}</p>{/if}

    <div class="frame" bind:this={frame}>
      <div class="host" bind:this={host} role="document" aria-label={d.title}>
        <div class="pdfViewer"></div>
      </div>
      {#if loading}<p class="state small muted">{t("pdf.loading")}</p>{/if}
      {#if failed}<p class="state notice">{t("pdf.failed")}</p>{/if}
      {#if sel}
        <div class="sel" role="toolbar" aria-label={t("pdf.selection")} style:left="{sel.x}px" style:top="{sel.y}px">
          <button class="btn btn-sm btn-primary" onclick={ask}><KindIcon kind="assistant" size={14} />{t("pdf.ask")}</button>
          <button class="btn btn-sm" onclick={copyCite}><Copy size={14} />{t("pdf.copy")}</button>
          {#if sel.pid}
            <button class="btn btn-sm" onclick={() => go(`/case/${caseId}/connections?of=passage:${sel!.pid}`)}><Waypoints size={14} />{t("fx.connections")}</button>
            <button class="btn btn-sm" onclick={() => go(`${findingsPath(caseId)}?view=board&start=passage:${sel!.pid}`)}><LayoutDashboard size={14} />{t("fx.board")}</button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .viewer {
    display: grid;
    grid-template-columns: 132px minmax(0, 1fr);
    gap: 16px;
  }
  .rail {
    display: grid;
    align-content: start;
    gap: 2px;
    position: sticky;
    top: calc(var(--topbar-h) + 12px);
    max-height: calc(100dvh - var(--topbar-h) - 40px);
    overflow-y: auto;
  }
  .rail-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 7px 10px;
    border-radius: var(--radius-control);
    font-size: 13px;
    color: var(--muted);
    text-align: left;
  }
  .rail-item:hover {
    background: var(--sunken);
    color: var(--ink-strong);
  }
  .rail-item[aria-current="page"] {
    background: var(--selected);
    color: var(--ink-strong);
    font-weight: 600;
  }
  .pip {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--alert);
  }
  .main {
    display: grid;
    gap: 10px;
    min-width: 0;
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 14px;
  }
  .page-no {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-strong);
    min-width: 72px;
  }
  .zoom {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }
  .zoom-val {
    min-width: 46px;
    text-align: center;
    font-size: 13px;
    color: var(--muted);
  }
  .find {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: 1 1 240px;
    color: var(--muted);
  }
  .find .field {
    flex: 1;
    min-width: 0;
    min-height: 34px;
  }
  .notice {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
  }
  .frame {
    position: relative;
    height: calc(100dvh - var(--topbar-h) - 200px);
    min-height: 440px;
    border-radius: var(--radius-surface);
    border: 1px solid var(--line);
    background: var(--sunken);
    overflow: hidden;
  }
  /* PDF.js needs an absolutely positioned scroll container. */
  .host {
    position: absolute;
    inset: 0;
    overflow: auto;
  }
  .host :global(.pdfViewer .page) {
    margin: 14px auto;
    border: 0;
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.08), 0 8px 24px rgb(20 40 30 / 0.12);
  }
  .host :global(.textLayer ::selection) {
    background: color-mix(in srgb, var(--focus) 35%, transparent);
  }
  .host :global(.jude-layer) {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 3;
  }
  .host :global(.jude-hl) {
    position: absolute;
    pointer-events: auto;
    cursor: pointer;
    mix-blend-mode: multiply;
    border-radius: 2px;
    background: color-mix(in srgb, var(--alert) 24%, transparent);
    border-bottom: 2px solid var(--alert);
  }
  .host :global(.jude-hl.context) {
    background: color-mix(in srgb, var(--st-context-dot) 22%, transparent);
    border-bottom-color: var(--st-context-dot);
  }
  .host :global(.jude-hl.quiet) {
    background: color-mix(in srgb, var(--st-supported-dot) 18%, transparent);
    border-bottom-color: var(--st-supported-dot);
  }
  .host :global(.jude-hl.linked) {
    background: transparent;
    border-bottom: 1.5px dashed var(--rel-related, var(--muted));
  }
  .host :global(.jude-hl.flash) {
    animation: alert-glow 1.1s ease-in-out 2;
  }
  .host :global(.jude-mark) {
    position: absolute;
    right: 10px;
    transform: translateY(-2px);
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    pointer-events: auto;
    background: var(--alert);
    color: #fff;
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.18);
  }
  .host :global(.jude-mark.context) {
    background: var(--st-context-dot);
  }
  .host :global(.jude-mark.quiet) {
    background: var(--st-supported-dot);
  }
  .host :global(.jude-ocr) {
    position: absolute;
    top: 12px;
    right: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px 4px 6px;
    border-radius: var(--radius-pill);
    pointer-events: auto;
    background: var(--alert);
    color: #fff;
    font: 600 12px/1.2 var(--font-ui);
  }
  .host :global(.jude-ocr.plain) {
    padding: 4px 10px;
    background: var(--surface);
    color: var(--ink-strong);
    border: 1px solid var(--line-strong);
  }
  @media (pointer: coarse) {
    .host :global(.jude-mark) {
      width: 30px;
      height: 30px;
      right: 6px;
    }
  }
  .state {
    position: absolute;
    inset: auto 0 50% 0;
    text-align: center;
    margin: 0 auto;
    width: fit-content;
  }
  .sel {
    position: absolute;
    z-index: 5;
    transform: translate(-50%, -100%);
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    max-width: 92%;
    padding: 6px;
    border-radius: var(--radius-action);
    background: var(--surface);
    border: 1px solid var(--line-strong);
    box-shadow: var(--shadow-float);
  }
  @container main (max-width: 760px) {
    .viewer {
      grid-template-columns: 1fr;
    }
    .rail {
      display: none;
    }
    .frame {
      height: calc(100dvh - var(--topbar-h) - 230px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .host :global(.jude-hl.flash) {
      animation: none;
    }
  }
</style>
