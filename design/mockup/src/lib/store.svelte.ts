import * as seed from "./data";
import { t, type Key, type Vars } from "./i18n";
import { prefs } from "./prefs.svelte";
import { go, route } from "./router.svelte";
import type {
  Citation,
  Connection,
  ContextRef,
  Finding,
  InspectTarget,
  NodeRef,
  Speaker,
  Statement,
  Thread,
} from "./types";

function fresh() {
  return {
    cases: structuredClone(seed.cases),
    hearings: structuredClone(seed.hearings),
    statements: structuredClone(seed.statements),
    findings: structuredClone(seed.findings),
    documents: structuredClone(seed.documents),
    passages: structuredClone(seed.passages),
    connections: structuredClone(seed.connections),
    speakers: structuredClone(seed.speakers),
    legal: structuredClone(seed.legal),
    threads: [] as Thread[],
    /** Cases whose sample conversations have been added. */
    threadsSeeded: [] as string[],
  };
}

/** The whole mock case record. Mutations stand in for API calls. */
export const db = $state(fresh());

export type Modal =
  | { kind: "newHearing"; flow?: "live" | "upload" | "import" | "schedule"; hearingId?: string }
  | { kind: "newCase" }
  | { kind: "settings"; caseId: string }
  | { kind: "rename"; speakerId: string }
  | { kind: "shortcuts" }
  | { kind: "endLive" }
  | { kind: "account" };

export interface Toast {
  id: number;
  text: string;
  tone?: "default" | "finding";
  count?: number;
  action?: { label: string; run: () => void };
}

export type AssistantContext =
  | { kind: "case" }
  | { kind: "hearing"; id: string }
  | { kind: "finding"; id: string }
  | { kind: "documents" }
  | { kind: "passage"; id: string }
  | { kind: "connection"; id: string };

export const ui = $state({
  assistantOpen: false,
  assistantContext: { kind: "case" } as AssistantContext,
  /** The conversation the assistant panel continues; null starts a new one on the next question. */
  threadId: null as string | null,
  chatBusy: false,
  chatRefs: [] as ContextRef[],
  chatLegal: true,
  chatDraft: "",
  chatAutoSend: false,
  inspector: null as InspectTarget | null,
  inspectorQueue: [] as string[],
  modal: null as Modal | null,
  toasts: [] as Toast[],
  mockOpen: false,
  /** Last viewport width, for adaptive behavior decided in script. */
  vw: typeof window === "undefined" ? 1280 : window.innerWidth,
});

let toastId = 0;
export function toast(text: string, opts: Partial<Omit<Toast, "id" | "text">> = {}) {
  const id = ++toastId;
  ui.toasts.push({ id, text, ...opts });
  if (ui.toasts.length > 2) ui.toasts.shift();
  setTimeout(() => dismissToast(id), opts.action ? 6000 : 3600);
}
export const toastT = (key: Key, vars?: Vars) => toast(t(key, vars));
export function dismissToast(id: number) {
  const i = ui.toasts.findIndex((x) => x.id === id);
  if (i >= 0) ui.toasts.splice(i, 1);
}

export function resetData() {
  Object.assign(db, fresh());
  ui.threadId = null;
  ui.chatRefs = [];
  ui.inspector = null;
}

// Selectors (plain functions read reactive state, so templates update automatically).
export const caseById = (id: string | null | undefined) => db.cases.find((c) => c.id === id);
export const hearing = (id: string | null | undefined) => db.hearings.find((h) => h.id === id);
export const hearingsOf = (caseId: string) =>
  db.hearings.filter((h) => h.caseId === caseId).sort((a, b) => a.number - b.number);
export const statement = (id: string) => db.statements.find((s) => s.id === id);
export const statementsOf = (hearingId: string) =>
  db.statements.filter((s) => s.hearingId === hearingId).sort((a, b) => a.t - b.t);
export const finding = (id: string | null | undefined) => db.findings.find((f) => f.id === id);
export const findingsOf = (hearingId: string) =>
  db.findings
    .filter((f) => f.hearingId === hearingId)
    .sort((a, b) => (statement(a.statementId)?.t ?? 0) - (statement(b.statementId)?.t ?? 0));
export const findingsOfCase = (caseId: string) => {
  const ids = new Set(hearingsOf(caseId).map((h) => h.id));
  const order = new Map(hearingsOf(caseId).map((h) => [h.id, h.number]));
  return db.findings
    .filter((f) => ids.has(f.hearingId))
    .sort(
      (a, b) =>
        (order.get(a.hearingId) ?? 0) - (order.get(b.hearingId) ?? 0) ||
        (statement(a.statementId)?.t ?? 0) - (statement(b.statementId)?.t ?? 0),
    );
};
export const findingForStatement = (statementId: string) =>
  db.findings.find((f) => f.statementId === statementId);
export const doc = (id: string) => db.documents.find((d) => d.id === id);
export const docsOf = (caseId: string) => db.documents.filter((d) => d.caseId === caseId);
export const passage = (id: string) => db.passages.find((p) => p.id === id);
export const passagesOf = (docId: string) =>
  db.passages.filter((p) => p.docId === docId).sort((a, b) => a.page - b.page);
export const passagesOfCase = (caseId: string) => {
  const ids = new Set(docsOf(caseId).map((d) => d.id));
  return db.passages.filter((p) => ids.has(p.docId));
};
export const legalRef = (id: string) => db.legal.find((x) => x.id === id);
export const connection = (id: string) => db.connections.find((c) => c.id === id);
const nodeCase = (ref: NodeRef) => {
  if (ref.kind === "statement") return hearing(statement(ref.id)?.hearingId)?.caseId;
  const p = passage(ref.id);
  return p ? doc(p.docId)?.caseId : undefined;
};
export const connectionsOfCase = (caseId: string) =>
  db.connections.filter((c) => nodeCase(c.from) === caseId);
export const connectionsFor = (ref: NodeRef) =>
  db.connections.filter(
    (c) => (c.from.kind === ref.kind && c.from.id === ref.id) || (c.to.kind === ref.kind && c.to.id === ref.id),
  );
export const findingsCiting = (passageId: string) =>
  db.findings.filter((f) => f.sources.some((s) => s.passageId === passageId));

/** Resolves voices the user has assigned to a participant, so they render as that person. */
export function speaker(id: string): Speaker | undefined {
  const sp = db.speakers.find((s) => s.id === id);
  return sp?.alias && sp.alias !== id ? speaker(sp.alias) : sp;
}
export function speakerName(sp: Speaker | undefined) {
  if (!sp) return "—";
  if (sp.label) return sp.label;
  const n = Number(sp.id.replace(/\D/g, "")) || 1;
  return t("common.unknownVoice", { n });
}

export const caseOfHearing = (hearingId: string) => hearing(hearingId)?.caseId;

/**
 * Findings worth a lawyer's attention: a difference from the source, or a point that needs
 * context. Supported and insufficient-evidence findings stay quiet unless "all" is chosen.
 */
export const isMeaningful = (f: Finding) => f.status === "potential_inconsistency" || f.status === "context_needed";
export const isShown = (f: Finding) => prefs.findingScope === "all" || isMeaningful(f);
export const needsLook = (f: Finding) => isMeaningful(f) && !f.reviewed;

/** People in the room for a hearing: the regular parties plus anyone who has spoken. */
export function participantsOf(hearingId: string, extra: string[] = []): Speaker[] {
  const spoken = new Set([...statementsOf(hearingId).map((s) => s.speakerId), ...extra.filter(Boolean)]);
  const seen = new Set<string>();
  const out: Speaker[] = [];
  const add = (sp: Speaker | undefined) => {
    if (sp && !seen.has(sp.id)) {
      seen.add(sp.id);
      out.push(sp);
    }
  };
  for (const sp of db.speakers) {
    if (sp.alias) continue;
    if (["judge", "prosecutor", "defense", "defendant"].includes(sp.role)) add(sp);
  }
  for (const id of spoken) add(speaker(id));
  return out;
}

/** Assigns an unidentified voice to someone already in the room. Their lines follow. */
export function assignVoice(voiceId: string, targetId: string) {
  const voice = db.speakers.find((s) => s.id === voiceId);
  const target = speaker(targetId);
  if (!voice || !target || voice.id === target.id) return;
  const before = speakerName(voice);
  voice.alias = target.id;
  voice.confirmed = true;
  toast(t("stage.assigned", { voice: before, name: speakerName(target) }));
}

// Actions
export function setReviewed(f: Finding, reviewed: boolean) {
  f.reviewed = reviewed;
  f.isNew = false;
  toastT(reviewed ? "toast.reviewed" : "toast.reopened");
}

export function saveNote(f: Finding, note: string) {
  f.note = note;
  toastT("toast.noteSaved");
}

export function setConnectionReviewed(c: Connection, reviewed: boolean) {
  c.reviewed = reviewed;
  toastT(reviewed ? "toast.connConfirmed" : "toast.connReopened");
}

export function toggleFlag(s: Statement) {
  s.flagged = !s.flagged;
  toastT(s.flagged ? "toast.flagged" : "toast.unflagged");
}

export function renameSpeaker(id: string, label: string) {
  const sp = speaker(id);
  if (!sp || !label.trim()) return;
  sp.label = label.trim();
  sp.confirmed = true;
  toastT("toast.speakerNamed");
}

/**
 * Findings are worked on in one place, Temuan. Everywhere else a finding is a link that opens
 * it there, selected; Temuan can also be opened filtered to one hearing or one document.
 */
export function findingPath(id: string) {
  const f = finding(id);
  const caseId = f ? hearing(f.hearingId)?.caseId : undefined;
  return caseId ? `/case/${caseId}/findings/${id}` : "/cases";
}
export const findingsPath = (caseId: string, only: { hearing?: string; doc?: string } = {}) =>
  `/case/${caseId}/findings${only.hearing ? `?hearing=${only.hearing}` : only.doc ? `?doc=${only.doc}` : ""}`;
export function openFinding(id: string) {
  ui.inspector = null;
  go(findingPath(id));
}

export function inspect(target: InspectTarget, queue: string[] = []) {
  // Outside Temuan a finding never opens in place: it opens in Temuan.
  if (target.kind === "finding" && !(route.parts[0] === "case" && route.parts[2] === "findings")) return openFinding(target.id);
  ui.inspector = target;
  ui.inspectorQueue = queue;
}

/** Opens the assistant with what the person is looking at as context. */
export function openAssistant(context?: AssistantContext, question?: string, refs?: Citation[], send = false) {
  if (context) ui.assistantContext = context;
  if (refs) {
    for (const ref of refs) {
      if (!ui.chatRefs.some((r) => r.kind === ref.kind && r.id === ref.id) && ui.chatRefs.length < 6) {
        ui.chatRefs.push(ref);
      }
    }
  }
  if (question !== undefined) ui.chatDraft = question;
  ui.chatAutoSend = send && !!question;
  ui.inspector = null;
  ui.assistantOpen = true;
}
