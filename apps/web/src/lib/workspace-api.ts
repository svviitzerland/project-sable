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
export type CaseDetail = {
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
export const labels: Record<Status, string> = {
  supported: "Supported",
  potential_inconsistency: "Potential inconsistency",
  context_needed: "Context needed",
  insufficient_evidence: "Insufficient evidence",
};
export function userFacingError(message: string) {
  if (
    !/OPENROUTER_|PASAL_API_KEY|SPEECHMATICS_API_KEY|Configure OpenRouter|configured providers|deployment|backend|HTTP \d{3}/i.test(
      message,
    )
  )
    return message;
  const reference = message.match(/Reference: [a-zA-Z0-9-]+/)?.[0];
  return `This request could not be completed. Please try again later.${reference ? ` ${reference}` : ""}`;
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
          ? "Check the form fields and try again."
          : "The server could not complete this request. Please try again.",
    );
  return data as T;
}
/** Display name: the user's label, else "Voice N" for recurring voices, else the raw key. */
export function speakerName(key: string, labels: Record<string, string>) {
  if (labels[key]) return labels[key];
  const voice = /^voice:voice-(\d+)$/.exec(key);
  return voice ? `Voice ${voice[1]}` : key;
}
export function timestamp(value: number) {
  return new Date(value * 1000).toISOString().slice(11, 19);
}
