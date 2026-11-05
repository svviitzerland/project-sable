import { fmtClock, l, t } from "./i18n";
import type { Kind } from "./kinds";
import { go } from "./router.svelte";
import { ask, sampleReply, type Topic } from "./services";
import {
  connection,
  db,
  doc,
  finding,
  hearing,
  inspect,
  openFinding,
  passage,
  speaker,
  speakerName,
  statement,
  toast,
  ui,
  type AssistantContext,
} from "./store.svelte";
import type { ChatMessage, ContextRef, L10n, Thread } from "./types";

/**
 * Conversations with the case assistant. Each question keeps every context it was asked with
 * (the page it was asked from and anything added), so the history can show them, and a question
 * can combine several: hearings, documents, findings and the whole case at once.
 */

/** The conversation waiting for an answer, so only it shows the assistant reading. */
export const asking = $state({ thread: null as string | null });

export const sameContext = (a: ContextRef, b: ContextRef) => a.kind === b.kind && ("id" in a ? a.id : "") === ("id" in b ? b.id : "");
export const contextKey = (c: ContextRef) => ("id" in c ? `${c.kind}:${c.id}` : c.kind);

export function threadsOf(caseId: string): Thread[] {
  return db.threads.filter((x) => x.caseId === caseId).sort((a, b) => b.updated - a.updated);
}
export const threadById = (id: string | null | undefined) => db.threads.find((x) => x.id === id);
export function activeThread(caseId: string) {
  const th = threadById(ui.threadId);
  return th?.caseId === caseId ? th : undefined;
}
/** Every context a conversation's questions used, in the order they first appeared. */
export function contextsOfThread(th: Thread): ContextRef[] {
  const out: ContextRef[] = [];
  for (const m of th.messages) for (const c of m.contexts ?? []) if (!out.some((x) => sameContext(x, c))) out.push(c);
  return out;
}

/** A context as the assistant's topic routing understands it (one page at a time). */
export function asPageContext(c: ContextRef | undefined): AssistantContext {
  if (!c || c.kind === "case") return { kind: "case" };
  if (c.kind === "documents" || c.kind === "document") return { kind: "documents" };
  if (c.kind === "statement") {
    const h = statement(c.id)?.hearingId;
    return h ? { kind: "hearing", id: h } : { kind: "case" };
  }
  return { kind: c.kind, id: c.id };
}

/** Icon, speaker and name of a context, for chips. */
export function contextInfo(c: ContextRef): { icon: Kind; speakerId?: string; label: string } {
  switch (c.kind) {
    case "case":
      return { icon: "case", label: t("as.contextCase") };
    case "documents":
      return { icon: "document", label: t("nav.documents") };
    case "hearing": {
      const h = hearing(c.id);
      return { icon: "hearing", label: h ? t("common.hearingN", { n: h.number }) : c.id };
    }
    case "document":
      return { icon: "document", label: doc(c.id)?.title ?? c.id };
    case "passage": {
      const p = passage(c.id);
      return { icon: "passage", label: p ? `${doc(p.docId)?.title} · ${t("common.page", { n: p.page })}` : c.id };
    }
    case "statement": {
      const s = statement(c.id);
      const h = hearing(s?.hearingId);
      return { icon: "statement", speakerId: s?.speakerId, label: s && h ? `${speakerName(speaker(s.speakerId))} · ${t("common.hearingN", { n: h.number })} · ${fmtClock(s.t)}` : c.id };
    }
    case "finding":
      return { icon: "finding", label: l(finding(c.id)?.title) || c.id };
    case "connection":
      return { icon: "connection", label: `${t("ix.connection")} · ${t(`rel.${connection(c.id)?.relation ?? "related"}`)}` };
  }
}

/** Opens what a context stands for. */
export function openContext(caseId: string, c: ContextRef) {
  if (c.kind === "case") go(`/case/${caseId}`);
  else if (c.kind === "documents") go(`/case/${caseId}/documents`);
  else if (c.kind === "document") go(`/case/${caseId}/documents/${c.id}`);
  else if (c.kind === "hearing") go(`/case/${caseId}/hearings/${c.id}`);
  else if (c.kind === "finding") openFinding(c.id);
  else inspect({ kind: c.kind, id: c.id });
}

/** Asks in the current conversation, or starts one; the question keeps its contexts. */
export async function sendQuestion(caseId: string, question: string, contexts: ContextRef[], topic?: Topic) {
  const text = question.trim();
  if (!text || ui.chatBusy) return;
  let th = activeThread(caseId);
  if (!th) {
    db.threads.push({ id: `t${Date.now().toString(36)}`, caseId, title: text.length > 90 ? `${text.slice(0, 88)}…` : text, updated: Date.now(), messages: [] });
    th = db.threads[db.threads.length - 1];
    ui.threadId = th.id;
  }
  th.messages.push({ id: `u${Date.now()}`, role: "user", text, contexts: $state.snapshot(contexts) });
  th.updated = Date.now();
  ui.chatDraft = "";
  ui.chatBusy = true;
  asking.thread = th.id;
  const reply = await ask(caseId, text, asPageContext(contexts.find((c) => c.kind !== "case") ?? contexts[0]), ui.chatLegal, topic);
  th.messages.push({ id: `a${Date.now()}`, role: "assistant", text: reply.text, citations: reply.citations, legal: reply.legal, mode: reply.mode });
  th.updated = Date.now();
  ui.chatBusy = false;
  asking.thread = null;
  return th.id;
}

export function deleteThread(id: string) {
  const i = db.threads.findIndex((x) => x.id === id);
  if (i < 0) return;
  const kept = $state.snapshot(db.threads[i]);
  db.threads.splice(i, 1);
  if (ui.threadId === id) ui.threadId = null;
  toast(t("asp.deleted"), { action: { label: t("common.undo"), run: () => db.threads.splice(Math.min(i, db.threads.length), 0, kept) } });
}

/** Synthetic sample conversations for the demo case, labelled as such. Called from an effect. */
export function ensureSamples(caseId: string) {
  if (caseId !== "c1" || db.threadsSeeded.includes(caseId)) return;
  db.threadsSeeded.push(caseId);
  const now = Date.now();
  const min = 60_000;
  const turn = (id: string, question: L10n, topic: Topic, contexts: ContextRef[]): ChatMessage[] => {
    const r = sampleReply(topic);
    return [
      { id: `${id}u`, role: "user", text: question, contexts },
      { id: `${id}a`, role: "assistant", text: r.text, citations: r.citations, legal: r.legal, mode: "ai" },
    ];
  };
  db.threads.push(
    {
      id: "th-differences",
      caseId,
      sample: true,
      title: { id: "Di mana keterangan para saksi berbeda?", en: "Where do the witness accounts differ?" },
      updated: now - 26 * min,
      messages: [
        ...turn("th1-1", { id: "Di mana keterangan para saksi berbeda dari BAP dan log akses?", en: "Where does the testimony differ from the BAPs and the access log?" }, "differences", [
          { kind: "hearing", id: "h2" },
          { kind: "document", id: "d1" },
          { kind: "document", id: "d3" },
        ]),
        ...turn("th1-2", { id: "Pertanyaan apa yang perlu saya siapkan untuk sidang berikutnya?", en: "What questions should I prepare for the next hearing?" }, "questions", [
          { kind: "hearing", id: "h2" },
          { kind: "finding", id: "f1" },
        ]),
      ],
    },
    {
      id: "th-keys",
      caseId,
      sample: true,
      title: { id: "Siapa saja yang memegang kunci Gudang B?", en: "Who held keys to Warehouse B?" },
      updated: now - 160 * min,
      messages: turn("th2-1", { id: "Siapa saja yang memegang kunci Gudang B?", en: "Who held keys to Warehouse B?" }, "keys", [
        { kind: "hearing", id: "h3" },
        { kind: "document", id: "d2" },
      ]),
    },
    {
      id: "th-summary",
      caseId,
      sample: true,
      title: { id: "Ringkasan perkara dan yang belum pasti", en: "Case summary and what is uncertain" },
      updated: now - 26 * 60 * min,
      messages: turn("th3-1", { id: "Ringkas perkara ini dan hal yang masih belum pasti.", en: "Summarize the case and what is still uncertain." }, "summary", [{ kind: "case" }]),
    },
    {
      id: "th-timeline",
      caseId,
      sample: true,
      title: { id: "Linimasa malam 14 Maret", en: "Timeline of the night of 14 March" },
      updated: now - 3 * 24 * 60 * min,
      messages: turn("th4-1", { id: "Susun linimasa malam 14 Maret dari dokumen.", en: "Build a timeline of 14 March from the documents." }, "times", [
        { kind: "documents" },
        { kind: "finding", id: "f5" },
      ]),
    },
  );
}
