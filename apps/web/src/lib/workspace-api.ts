import { t, type MessageKey } from "./i18n/index.svelte";
export type User = { id: string; name: string; email: string; demo: boolean };
export type Case = {
  id: string;
  title: string;
  reference: string;
  description: string;
  synthetic: boolean;
  status: string;
  created_at: string;
  speakers: Record<string, string>;
};
/** The bundled demo built from a published court record (reference ends "catatan publik"). */
export const publicRecord = (c: Pick<Case, "reference"> | null | undefined) =>
  !!c && /catatan publik|public record/i.test(c.reference);
export type Document = {
  id: string;
  case_id: string;
  name: string;
  mime: string;
  pages: number;
  created_at: string;
};
export type Segment = {
  id: string;
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
};
export type Status =
  | "supported"
  | "potential_inconsistency"
  | "context_needed"
  | "insufficient_evidence";
export type Citation = {
  chunk_id: string;
  quote: string;
  relation: "supports" | "conflicts" | "context";
};
export type LegalReference = {
  id: string;
  title: string;
  reference: string;
  status: string;
  status_uncertain: boolean;
  url: string;
  content: string;
  articles: { article: string; url: string }[];
  best_passage?: { article: string; url: string } | null;
};
export type Finding = {
  id: string;
  segment_id: string;
  status: Status;
  title: string;
  explanation: string;
  uncertainty: string;
  verification: string;
  question: string;
  citations: Citation[];
  review: {
    summary?: string;
    analyst_summary?: string;
    alternative_explanations?: string[];
    missing_context?: string[];
    retrieval?: string;
    legal_note?: string;
  };
  legal: LegalReference[];
  mode: string;
  elapsed_ms: number;
  reviewed: boolean;
  note: string;
  created_at: string;
};
export type Source = {
  id: string;
  document_id: string;
  document_name: string;
  page: number;
  section: string;
  text: string;
  score: number;
};
export type Hearing = {
  id: string;
  case_id: string;
  title: string;
  date: string;
  kind: string;
  status: string;
  source_document_id: string | null;
  created_at: string;
};
export type Recording = {
  id: string;
  hearing_id: string;
  mime: string;
  size: number;
  start_offset: number;
  duration: number;
  created_at: string;
};
export type CaseDetail = {
  recordings: Recording[];
  hearings: Hearing[];
  case: Case;
  documents: Document[];
  segments: Segment[];
  findings: Finding[];
};
export type Connection = { configured: boolean; note: string };
export type Capabilities = {
  demo_available: boolean;
  storage: string;
  analysis: Connection;
  speech: Connection;
  legal: Connection;
  embeddings: Connection;
};
export const statuses: Status[] = [
  "supported",
  "potential_inconsistency",
  "context_needed",
  "insufficient_evidence",
];
export function statusLabel(status: Status) {
  return t(`status.${status}`);
}
const relations = ["supports", "conflicts", "context", "related"] as const;
/** Evidence relation names (`supports`, `conflicts`, …) in the UI language. */
export function relationLabel(relation: string) {
  return (relations as readonly string[]).includes(relation)
    ? t(`relation.${relation as (typeof relations)[number]}`)
    : relation;
}
/**
 * Server `detail` strings stay English; the common ones are shown in the UI
 * language. Anything not listed here is displayed as the server sent it.
 */
const serverMessages: Record<string, MessageKey> = {
  "Email or password is incorrect.": "error.badCredentials",
  "An account already uses this email. Sign in instead.": "error.emailTaken",
  "Sign in to continue": "error.signIn",
  "Too many requests. Wait a minute and try again.": "error.rateLimited",
  "The request does not match the expected format.": "error.format",
  "Invalid JSON request.": "error.format",
  "Request is too large.": "error.tooLarge",
  "Not found": "error.notFound",
  "Case not found": "error.caseNotFound",
  "Hearing not found": "error.hearingNotFound",
  "Document not found": "error.documentNotFound",
  "Finding not found": "error.findingNotFound",
  "Source not found": "error.sourceNotFound",
  "Conversation not found": "error.conversationNotFound",
  "Upload PDF, DOCX, TXT, or Markdown files.": "error.uploadTypes",
  "Use a UTF-8 text file.": "error.utf8",
  "Cannot read this .jude archive.": "error.archive",
  "This operation is already running. Wait for it to finish and retry.":
    "error.busy",
  "A hearing is already running.": "error.hearingRunning",
  "This pair is already linked. Review its existing connection.":
    "error.alreadyLinked",
  "This transcript has more than 3,000 statements. Split it into smaller files and import each as its own hearing.":
    "error.tooManyTurns",
};
export function userFacingError(message: string) {
  const known = serverMessages[message.trim()];
  if (known) return t(known);
  if (
    !/OPENROUTER_|PASAL_API_KEY|OpenRouter|Bedrock|configured providers|deployment|backend|HTTP \d{3}|could not be completed/i.test(
      message,
    )
  )
    return message;
  const reference = message.match(/Reference: ([a-zA-Z0-9-]+)/)?.[1];
  return `${t("error.generic")}${reference ? ` ${t("error.reference", { reference })}` : ""}`;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      response.status,
      typeof data?.detail === "string"
        ? userFacingError(data.detail)
        : response.status === 422
          ? t("error.form")
          : t("error.server"),
    );
  return data as T;
}
/**
 * Display name: the user's label, else "Voice N" for recurring voices, else
 * "Speaker N" for a diarized key such as `74b164dd:spk_0`, else the key itself.
 */
export function speakerName(key: string, labels: Record<string, string>) {
  if (labels[key]) return labels[key];
  const voice = /^voice:voice-(\d+)$/.exec(key);
  if (voice) return t("speakers.voice", { n: voice[1] });
  const diarized = /(?:^|:)spk_(\d+)$/.exec(key);
  return diarized
    ? t("speakers.numbered", { n: Number(diarized[1]) + 1 })
    : key;
}
export function timestamp(value: number) {
  return new Date(value * 1000).toISOString().slice(11, 19);
}
