import { keyOf, parseKey } from "./board.svelte";
import { fmtClock, l, t } from "./i18n";
import { shortName } from "./people";
import {
  connectionsOfCase,
  db,
  doc,
  finding,
  findingsOfCase,
  hearing,
  isMeaningful,
  passage,
  passagesOf,
  speaker,
  speakerName,
  statement,
  toast,
  toastT,
} from "./store.svelte";
import type { Connection, NodeRef, Relation, Status } from "./types";

/**
 * Evidence is anything that belongs to a case: a line said in a hearing, a passage of a document,
 * a finding. A pairing joins two pieces of evidence: a recorded connection (a line and a passage,
 * or two passages, or two lines), a finding and the line it is about, or a passage a finding cites
 * that no connection records yet. A group is everything pairings join, directly or through other
 * evidence. Pairings run both ways, so a group is the strongly connected component of any member.
 */
export type EvidenceKind = "statement" | "passage" | "finding";
export interface Pairing {
  key: string;
  a: string;
  b: string;
  relation: Relation;
  confirmed: boolean;
  /** link: recorded, and adjusted here. about and cited: they come from a finding, kept in Temuan. */
  source: "link" | "about" | "cited";
  connectionId?: string;
  findingId?: string;
}

export const relations: Relation[] = ["conflicts", "context", "supports", "related"];
const statusRelation: Record<Status, Relation> = {
  potential_inconsistency: "conflicts",
  context_needed: "context",
  supported: "supports",
  insufficient_evidence: "related",
};

export function pairingsOf(caseId: string): Pairing[] {
  const out: Pairing[] = [];
  const seen = new Set<string>();
  const pair = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (const c of connectionsOfCase(caseId)) {
    const a = keyOf(c.from);
    const b = keyOf(c.to);
    seen.add(pair(a, b));
    out.push({ key: c.id, a, b, relation: c.relation, confirmed: c.reviewed, source: "link", connectionId: c.id });
  }
  for (const f of findingsOfCase(caseId)) {
    const fk = `finding:${f.id}`;
    const sk = `statement:${f.statementId}`;
    out.push({ key: `${f.id}:about`, a: sk, b: fk, relation: statusRelation[f.status], confirmed: f.reviewed, source: "about", findingId: f.id });
    for (const s of f.sources) {
      const pk = `passage:${s.passageId}`;
      if (seen.has(pair(sk, pk))) continue;
      seen.add(pair(sk, pk));
      out.push({ key: `${f.id}:${s.passageId}`, a: sk, b: pk, relation: s.relation, confirmed: f.reviewed, source: "cited", findingId: f.id });
    }
  }
  return out;
}

/** Each piece of evidence that has a pairing, numbered by the group it belongs to. */
export function groupsOf(pairings: Pairing[]) {
  const next = new Map<string, string[]>();
  const link = (x: string, y: string) => next.set(x, [...(next.get(x) ?? []), y]);
  for (const p of pairings) {
    link(p.a, p.b);
    link(p.b, p.a);
  }
  const group = new Map<string, number>();
  let count = 0;
  for (const start of next.keys()) {
    if (group.has(start)) continue;
    const queue = [start];
    group.set(start, count);
    for (let i = 0; i < queue.length; i++) {
      for (const w of next.get(queue[i]) ?? []) {
        if (!group.has(w)) {
          group.set(w, count);
          queue.push(w);
        }
      }
    }
    count++;
  }
  return { group, count };
}

/** The evidence a selection stands for: itself, or every passage of a document. */
export function keysFor(key: string | undefined): string[] {
  const ref = parseKey(key);
  if (!ref) return [];
  if (ref.kind === "document") return passagesOf(ref.id).map((p) => `passage:${p.id}`);
  return [keyOf(ref)];
}

/** The selection's group, or groups when a document spans several; evidence on its own stays alone. */
export function membersOf(groups: ReturnType<typeof groupsOf>, keys: string[]) {
  const ids = new Set(keys.map((k) => groups.group.get(k)).filter((g): g is number => g !== undefined));
  const out = new Set(keys);
  for (const [k, g] of groups.group) if (ids.has(g)) out.add(k);
  return out;
}

export const kindOf = (key: string) => key.slice(0, key.indexOf(":")) as EvidenceKind;
export const idOf = (key: string) => key.slice(key.indexOf(":") + 1);

/** A short name for one piece of evidence: who and when, which page, or the finding. */
export function shortLabel(key: string): string {
  const id = idOf(key);
  if (kindOf(key) === "statement") {
    const s = statement(id);
    const sp = speaker(s?.speakerId ?? "");
    return s ? `${shortName(sp) || speakerName(sp)} ${fmtClock(s.t)}` : "";
  }
  if (kindOf(key) === "passage") {
    const p = passage(id);
    return p ? `${doc(p.docId)?.title ?? ""} · ${t("common.page", { n: p.page })}` : "";
  }
  return l(finding(id)?.title);
}

/** Where a piece of evidence comes from, in full. */
export function whereOf(key: string): string {
  const id = idOf(key);
  if (kindOf(key) === "statement") {
    const s = statement(id);
    const h = hearing(s?.hearingId);
    return s && h ? `${speakerName(speaker(s.speakerId))} · ${t("common.hearingN", { n: h.number })} · ${fmtClock(s.t)}` : "";
  }
  if (kindOf(key) === "passage") return shortLabel(key);
  const f = finding(id);
  const s = f ? statement(f.statementId) : undefined;
  return f ? `${t(`status.${f.status}`)}${s ? ` · ${fmtClock(s.t)}` : ""}` : "";
}

/** A group is named by its finding worth a look, else any finding, else what it is around. */
export function groupName(members: Set<string>, selected: string[]): string {
  const found = [...members].filter((k) => kindOf(k) === "finding").map((k) => finding(idOf(k))).filter((f) => !!f);
  const top = found.find((f) => isMeaningful(f!)) ?? found[0];
  if (top) return l(top.title);
  const ref = parseKey(selected[0]);
  if (ref?.kind === "passage") {
    const p = passage(ref.id);
    if (p && selected.length > 1) return t("cx.group.around", { what: doc(p.docId)?.title ?? "" });
  }
  return t("cx.group.around", { what: selected[0] ? shortLabel(selected[0]) : "" });
}

// Adjusting pairings. Only recorded connections change here; a finding's own sources stay in Temuan.
export function setRelation(c: Connection, relation: Relation) {
  if (c.relation === relation) return;
  c.relation = relation;
  toastT("toast.relation");
}

export function unpair(c: Connection) {
  const i = db.connections.findIndex((x) => x.id === c.id);
  if (i < 0) return;
  const kept = $state.snapshot(db.connections[i]);
  db.connections.splice(i, 1);
  // A finding that cites the same passage keeps the two together; say so rather than seem stuck.
  const said = c.from.kind === "statement" ? c.from.id : c.to.kind === "statement" ? c.to.id : null;
  const cited = c.from.kind === "passage" ? c.from.id : c.to.kind === "passage" ? c.to.id : null;
  const stillCited = !!said && !!cited && db.findings.some((f) => f.statementId === said && f.sources.some((x) => x.passageId === cited));
  toast(t(stillCited ? "toast.unpairedCited" : "toast.unpaired"), {
    action: { label: t("common.undo"), run: () => db.connections.splice(Math.min(i, db.connections.length), 0, kept) },
  });
}

/** Pairs two pieces of evidence (lines or passages), as the lawyer's own confirmed link. */
export function pair(from: NodeRef, to: NodeRef, relation: Relation = "related") {
  const a = keyOf(from);
  const b = keyOf(to);
  if (a === b) return null;
  const existing = db.connections.find((c) => (keyOf(c.from) === a && keyOf(c.to) === b) || (keyOf(c.from) === b && keyOf(c.to) === a));
  if (existing) return existing.id;
  const id = `cn-u${Date.now().toString(36)}`;
  db.connections.push({ id, from, to, relation, reviewed: true, basis: "manual", why: { id: "Dipasangkan oleh Anda.", en: "Paired by you." } });
  toastT("toast.paired");
  return id;
}
