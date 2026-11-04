export type Lang = "id" | "en";
/** Text shown in the interface language. Verbatim testimony and documents stay plain strings. */
export type L10n = { id: string; en: string };

export type Status =
  | "supported"
  | "potential_inconsistency"
  | "context_needed"
  | "insufficient_evidence";
export type Relation = "supports" | "conflicts" | "context" | "related";
export type Phase =
  | "queued"
  | "retrieving"
  | "analyzing"
  | "reviewing"
  | "complete"
  | "saved";

export type Role =
  | "judge"
  | "judge_member"
  | "prosecutor"
  | "defense"
  | "witness"
  | "defendant"
  | "unknown";

export interface Speaker {
  id: string;
  label: string;
  role: Role;
  /** Voice matches are suggestions until a person confirms the name. */
  confirmed: boolean;
  /** An unidentified voice the user assigned to a participant. */
  alias?: string;
}

export interface CaseRecord {
  id: string;
  title: string;
  reference: string;
  label: "synthetic" | "private";
  summary: L10n;
  client: string;
  court: string;
  updated: string;
  nextHearing?: { date: string; time: string; title: L10n };
}

export type HearingMode = "live" | "recorded" | "imported" | "scheduled";

export interface Hearing {
  id: string;
  caseId: string;
  number: number;
  title: L10n;
  date: string;
  mode: HearingMode;
  /** Seconds of audio for recorded hearings. */
  duration?: number;
  time?: string;
}

export interface Statement {
  id: string;
  hearingId: string;
  speakerId: string;
  /** Seconds from the start of the hearing. */
  t: number;
  text: string;
  phase?: Phase;
  legal?: string[];
  flagged?: boolean;
}

export interface CaseDocument {
  id: string;
  caseId: string;
  title: string;
  kind: L10n;
  pages: number;
  file: "PDF" | "DOCX" | "TXT";
  size: string;
  added: string;
}

export interface Passage {
  id: string;
  docId: string;
  page: number;
  text: string;
  before?: string;
  after?: string;
}

export interface FindingSource {
  passageId: string;
  relation: Relation;
  /** The phrase in the passage that the testimony is compared with. */
  match?: string;
}

export interface Finding {
  id: string;
  hearingId: string;
  statementId: string;
  status: Status;
  title: L10n;
  explanation: L10n;
  verify: L10n;
  uncertainty?: L10n;
  /** Suggested question in the courtroom language (Indonesian). */
  question: string;
  /** The phrase in the testimony that the finding is about. */
  said?: string;
  sources: FindingSource[];
  legal?: string[];
  reviewed: boolean;
  note: string;
  isNew?: boolean;
}

export type NodeRef = { kind: "statement" | "passage"; id: string };

export interface Connection {
  id: string;
  from: NodeRef;
  to: NodeRef;
  relation: Relation;
  reviewed: boolean;
  basis: "ai" | "semantic" | "keywords" | "manual";
  why: L10n;
}

export interface LegalRef {
  id: string;
  type: string;
  regulation: string;
  article: string;
  summary: L10n;
  keywords: string[];
}

export type InspectTarget =
  | { kind: "finding"; id: string }
  | { kind: "passage"; id: string }
  | { kind: "statement"; id: string }
  | { kind: "connection"; id: string }
  | { kind: "legal"; id: string };

export type Citation = { kind: "passage" | "statement" | "finding" | "document" | "hearing"; id: string };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: L10n | string;
  citations?: Citation[];
  legal?: string[];
  mode?: "ai" | "sources-only";
  context?: string;
}
