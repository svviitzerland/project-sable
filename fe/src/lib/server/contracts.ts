import { z } from "zod";
export const credentials = z.strictObject({
  email: z.email().max(254),
  password: z.string().min(10).max(128),
  name: z.string().trim().min(1).max(100).default("Counsel"),
});
export const caseInput = z.strictObject({
  title: z.string().trim().min(1).max(160),
  reference: z.string().max(100).default(""),
  description: z.string().max(2000).default(""),
});
export const hearingInput = z.strictObject({
  title: z.string().trim().min(1).max(160),
  date: z.string().max(40).default(""),
});
export const segmentInput = z.strictObject({
  hearing_id: z.string().max(36).nullable().default(null),
  text: z.string().trim().min(3).max(6000),
  speaker: z.string().trim().min(1).max(80).default("Unknown"),
  start: z.number().min(0).max(86400).default(0),
  end: z.number().min(0).max(86400).default(0),
});
export const statusSchema = z.enum([
  "supported",
  "potential_inconsistency",
  "context_needed",
  "insufficient_evidence",
]);
export const citationSchema = z.strictObject({
  chunk_id: z.string(),
  quote: z.string().min(1).max(3000),
  relation: z.enum(["supports", "conflicts", "context"]),
});
export const conclusionSchema = z.strictObject({
  status: statusSchema,
  title: z.string().max(240),
  explanation: z.string().max(3000),
  uncertainty: z.string().max(2000),
  verification: z.string().max(1000),
  question: z.string().max(1000),
  citations: z.array(citationSchema).max(8),
});
export const assessmentSchema = z.strictObject({
  summary: z.string().max(2000),
  alternative_explanations: z.array(z.string()).max(5),
  missing_context: z.array(z.string()).max(5),
});
export const claimSchema = z.strictObject({
  checkable: z.boolean(),
  assertion: z.string().max(1500),
  search_query: z.string().max(600),
  legal_query: z.string().max(160),
  reason: z.string().max(600),
});
export const turnSchema = z.strictObject({
  speaker: z.string().trim().min(1).max(80).default("Unknown"),
  text: z.string().trim().min(1).max(6000),
  start: z.number().min(0).max(86400).default(0),
  end: z.number().min(0).max(86400).default(0),
});
export const hearingFileSchema = z.strictObject({
  format: z.literal("jude").default("jude"),
  version: z.literal(1).default(1),
  kind: z.literal("hearing").default("hearing"),
  title: z.string().trim().min(1).max(160),
  date: z.string().max(40).default(""),
  segments: z.array(turnSchema).min(1).max(500),
});
export type Citation = z.infer<typeof citationSchema>;
export type Conclusion = z.infer<typeof conclusionSchema>;
export type HearingFile = z.infer<typeof hearingFileSchema>;
export type Json =
  null | boolean | number | string | Json[] | { [key: string]: Json };
export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  demo: boolean;
}
export interface Case {
  id: string;
  owner_id: string;
  title: string;
  reference: string;
  description: string;
  synthetic: boolean;
  status: string;
  created_at: string;
  speakers: Record<string, string>;
}
export interface Document {
  id: string;
  case_id: string;
  name: string;
  mime: string;
  storage_key: string;
  storage: string;
  digest: string;
  pages: number;
  created_at: string;
}
export interface Chunk {
  id: string;
  case_id: string;
  document_id: string;
  page: number;
  section: string;
  text: string;
  embedding: number[] | null;
  embedding_model: string;
}
export interface Source {
  id: string;
  document_id: string;
  document_name: string;
  page: number;
  section: string;
  text: string;
  score: number;
}
export interface Hearing {
  id: string;
  case_id: string;
  title: string;
  date: string;
  kind: string;
  status: string;
  source_document_id: string | null;
  created_at: string;
}
export interface Segment {
  id: string;
  case_id: string;
  hearing_id: string | null;
  text: string;
  speaker: string;
  start: number;
  end: number;
  confidence: number | null;
  origin: string;
  analysis_state: string;
  analysis_error: string | null;
  created_at: string;
}
export interface Finding extends Conclusion {
  id: string;
  case_id: string;
  segment_id: string;
  review: Record<string, Json>;
  legal: Legal[];
  mode: string;
  elapsed_ms: number;
  reviewed: boolean;
  note: string;
  created_at: string;
}
export interface Legal {
  id: string;
  title: string;
  reference: string;
  status?: string;
  status_uncertain?: boolean;
  url: string;
  content?: string;
  articles?: { article: string; url: string }[];
}
export interface Link {
  id: string;
  case_id: string;
  source_id: string;
  target_id: string;
  relation: string;
  explanation: string;
  basis: string;
  confirmed: boolean;
  score: number | null;
  source_quote: string;
  target_quote: string;
  created_at: string;
}
export interface Dialogue {
  id: string;
  case_id: string;
  kind: string;
  title: string;
  mode: string;
  conditions: Record<string, string>;
  status: string;
  created_at: string;
}
export interface DialogueMessage {
  id: string;
  dialogue_id: string;
  sequence: number;
  role: string;
  speaker: string;
  text: string;
  citations: (Citation & { source?: ContextSource })[];
  legal: Legal[];
  notice: string;
  request_id: string | null;
  created_at: string;
}
export interface ContextSource {
  chunk_id: string;
  kind: "document" | "testimony";
  title: string;
  text: string;
  document_id: string | null;
  page: number | null;
  hearing_id: string | null;
}
export interface Tables {
  users: User;
  sessions: { token_hash: string; user_id: string; expires: number };
  cases: Case;
  documents: Document;
  chunks: Chunk;
  hearings: Hearing;
  segments: Segment;
  findings: Finding;
  evidence_links: Link;
  dialogues: Dialogue;
  dialogue_messages: DialogueMessage;
  runtime_leases: { key: string; owner: string; expires: number };
  runtime_events: {
    case_id: string;
    revision: number;
    payload: Record<string, Json>;
  };
  runtime_rates: { key: string; hits: number; expires: number };
  socket_tickets: {
    token_hash: string;
    session_hash: string;
    case_id: string;
    purpose: string;
    expires: number;
  };
  analysis_jobs: {
    segment_id: string;
    status: string;
    attempts: number;
    dispatched_at: number;
    created_at: number;
  };
  file_transfers: {
    id: string;
    owner_id: string;
    name: string;
    size: number;
    kind: string;
    parts: Record<string, string>;
    expires: number;
  };
  audio_sessions: {
    id: string;
    case_id: string;
    hearing_id: string;
    session_hash: string;
    offset: number;
    last_sequence: number;
    expires: number;
    status: string;
  };
}
