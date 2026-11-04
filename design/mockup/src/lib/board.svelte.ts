import { t } from "./i18n";
import { searchCase } from "./services";
import { connectionsFor, finding, findingForStatement, findingsCiting, passage, passagesOf, statement } from "./store.svelte";
import type { L10n, Relation } from "./types";

/**
 * What relates to what, case-wide. The findings board uses it: the lawyer picks a starting
 * point (usually a finding), Jude suggests what relates to it, and only what the lawyer pins goes
 * on the board. Evidence's Connections list uses the same suggestions, ranked.
 */
export type BoardKind = "finding" | "statement" | "passage" | "document";
export interface BoardRef {
  kind: BoardKind;
  id: string;
}
export interface BoardCard extends BoardRef {
  key: string;
  x: number;
  y: number;
}
export interface BoardLink {
  from: string;
  to: string;
  relation: Relation;
  connectionId?: string;
  findingId?: string;
}
export interface Board {
  cards: BoardCard[];
  links: BoardLink[];
  driver: string | null;
}
export interface Candidate {
  ref: BoardRef;
  key: string;
  relation: Relation;
  source: "link" | "finding" | "words";
  why?: L10n | string;
  connectionId?: string;
  findingId?: string;
  via?: string;
  /** The phrase in the candidate's own text that the relation is about. */
  mark?: string;
}

export const CARD_W = 280;
export const CARD_H = 128;

export const keyOf = (ref: BoardRef) => `${ref.kind}:${ref.id}`;
export function parseKey(key: string | null | undefined): BoardRef | null {
  if (!key) return null;
  const [kind, ...rest] = key.split(":");
  const id = rest.join(":");
  return kind === "finding" || kind === "statement" || kind === "passage" || kind === "document" ? { kind, id } : null;
}

export const boards = $state<Record<string, Board>>({});
const EMPTY: Board = { cards: [], links: [], driver: null };
export const getBoard = (caseId: string): Board => boards[caseId] ?? EMPTY;

function ensure(caseId: string): Board {
  if (!boards[caseId]) boards[caseId] = { cards: [], links: [], driver: null };
  return boards[caseId];
}

function collect(ref: BoardRef, withFindings: boolean, via?: string): Candidate[] {
  const out: Candidate[] = [];
  const add = (c: Candidate) => {
    if (c.key === keyOf(ref) || out.some((x) => x.key === c.key)) return;
    out.push(c);
  };
  const findingRef = (id: string): BoardRef => ({ kind: "finding", id });
  if (ref.kind === "finding") {
    const f = finding(ref.id);
    if (f) {
      const said: BoardRef = { kind: "statement", id: f.statementId };
      add({ ref: said, key: keyOf(said), relation: "related", source: "finding", why: t("cx.whySaid"), findingId: f.id, mark: f.said });
      for (const s of f.sources) {
        const other: BoardRef = { kind: "passage", id: s.passageId };
        add({ ref: other, key: keyOf(other), relation: s.relation, source: "finding", why: f.title, findingId: f.id, mark: s.match });
      }
      // Other findings that lean on the same passages belong in the same conversation.
      for (const s of f.sources) {
        for (const g of findingsCiting(s.passageId)) {
          if (g.id !== f.id) add({ ref: findingRef(g.id), key: keyOf(findingRef(g.id)), relation: "related", source: "finding", why: t("cx.sameSource"), findingId: g.id });
        }
      }
    }
  }
  if (ref.kind === "statement" || ref.kind === "passage") {
    for (const c of connectionsFor({ kind: ref.kind, id: ref.id })) {
      const other = c.from.kind === ref.kind && c.from.id === ref.id ? c.to : c.from;
      add({ ref: other, key: keyOf(other), relation: c.relation, source: "link", why: c.why, connectionId: c.id, via });
    }
  }
  if (ref.kind === "statement") {
    const f = findingForStatement(ref.id);
    if (f && withFindings) add({ ref: findingRef(f.id), key: keyOf(findingRef(f.id)), relation: f.sources[0]?.relation ?? "related", source: "finding", why: f.title, findingId: f.id });
    for (const s of f?.sources ?? []) {
      const other: BoardRef = { kind: "passage", id: s.passageId };
      add({ ref: other, key: keyOf(other), relation: s.relation, source: "finding", why: f!.title, findingId: f!.id, mark: s.match });
    }
  }
  if (ref.kind === "passage") {
    for (const f of findingsCiting(ref.id)) {
      const rel = f.sources.find((s) => s.passageId === ref.id)?.relation ?? "related";
      if (withFindings) add({ ref: findingRef(f.id), key: keyOf(findingRef(f.id)), relation: rel, source: "finding", why: f.title, findingId: f.id, via });
      const other: BoardRef = { kind: "statement", id: f.statementId };
      add({ ref: other, key: keyOf(other), relation: rel, source: "finding", why: f.title, findingId: f.id, via, mark: f.said });
    }
  }
  return out;
}

/** What relates to the starting point: recorded links and findings first, shared words after. */
export function candidatesFor(
  caseId: string,
  ref: BoardRef,
  withFindings = false,
): { related: Candidate[]; maybe: Candidate[] } {
  let related: Candidate[] = [];
  if (ref.kind === "document") {
    for (const p of passagesOf(ref.id)) {
      for (const c of collect({ kind: "passage", id: p.id }, withFindings, p.id)) {
        if (c.ref.kind === "passage" && passage(c.ref.id)?.docId === ref.id) continue;
        if (!related.some((x) => x.key === c.key)) related.push(c);
      }
    }
  } else {
    related = collect(ref, withFindings);
  }
  related.sort((a, b) => (a.source === "link" ? 0 : 1) - (b.source === "link" ? 0 : 1));
  let maybe: Candidate[] = [];
  if (ref.kind === "statement" || ref.kind === "passage") {
    const text = ref.kind === "statement" ? statement(ref.id)?.text : passage(ref.id)?.text;
    const wanted = ref.kind === "statement" ? "passage" : "statement";
    maybe = searchCase(caseId, text ?? "", 10)
      .filter((c) => c.kind === wanted)
      .map((c) => ({ ref: { kind: c.kind as BoardKind, id: c.id }, key: `${c.kind}:${c.id}`, relation: "related" as Relation, source: "words" as const }))
      .filter((c) => c.key !== keyOf(ref) && !related.some((r) => r.key === c.key))
      .slice(0, 4);
  }
  return { related, maybe };
}

function overlaps(board: Board, x: number, y: number) {
  return board.cards.some((c) => Math.abs(c.x - x) < CARD_W - 10 && Math.abs(c.y - y) < CARD_H - 8);
}

function placeNear(board: Board, anchor: BoardCard | undefined) {
  if (!anchor) return { x: 40, y: 40 + board.cards.length * (CARD_H + 20) };
  const x = anchor.x + CARD_W + 90;
  for (let k = 0; k < 24; k++) {
    const step = Math.ceil(k / 2) * (k % 2 ? -1 : 1);
    const y = anchor.y + step * (CARD_H + 18);
    if (y >= 16 && !overlaps(board, x, y)) return { x, y };
  }
  return { x: x + CARD_W + 40, y: anchor.y };
}

/** Starts a fresh board from one statement, passage or document. */
export function startBoard(caseId: string, ref: BoardRef) {
  const board = ensure(caseId);
  board.cards = [{ ...ref, key: keyOf(ref), x: 40, y: 170 }];
  board.links = [];
  board.driver = keyOf(ref);
}

/** Puts one thing on the board and makes it the starting point, keeping what is already there. */
export function addToBoard(caseId: string, ref: BoardRef) {
  const board = ensure(caseId);
  if (!board.cards.length) return startBoard(caseId, ref);
  const key = keyOf(ref);
  if (!board.cards.some((c) => c.key === key)) {
    const lowest = Math.max(...board.cards.map((c) => c.y));
    board.cards.push({ ...ref, key, x: 40, y: lowest + CARD_H + 40 });
  }
  board.driver = key;
}

export function setDriver(caseId: string, key: string) {
  ensure(caseId).driver = key;
}

export function pin(caseId: string, c: Candidate) {
  const board = ensure(caseId);
  const anchor = board.cards.find((x) => x.key === board.driver);
  if (!board.cards.some((x) => x.key === c.key)) board.cards.push({ ...c.ref, key: c.key, ...placeNear(board, anchor) });
  if (anchor && !board.links.some((l) => (l.from === anchor.key && l.to === c.key) || (l.from === c.key && l.to === anchor.key))) {
    board.links.push({ from: anchor.key, to: c.key, relation: c.relation, connectionId: c.connectionId, findingId: c.findingId });
  }
}

export function unpin(caseId: string, key: string) {
  const board = ensure(caseId);
  board.cards = board.cards.filter((c) => c.key !== key);
  board.links = board.links.filter((l) => l.from !== key && l.to !== key);
  if (board.driver === key) board.driver = board.cards[0]?.key ?? null;
}

export function moveCard(caseId: string, key: string, x: number, y: number) {
  const card = ensure(caseId).cards.find((c) => c.key === key);
  if (!card) return;
  card.x = Math.max(0, Math.round(x));
  card.y = Math.max(0, Math.round(y));
}

export function clearBoard(caseId: string) {
  const board = ensure(caseId);
  board.cards = [];
  board.links = [];
  board.driver = null;
}
