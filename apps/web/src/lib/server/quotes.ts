import { ProviderError } from "./errors";
import type { Citation, ContextSource } from "./contracts";

/** Map a model quote to the exact source substring; only whitespace may differ. */
export function exactSourceQuote(
  text: string,
  quote: string,
): string | undefined {
  if (!quote.trim()) return undefined;
  if (text.includes(quote)) return quote;
  // PDF/DOCX extraction may insert line breaks or nonbreaking spaces. Only
  // whitespace may differ: preserve all words, numbers, case and punctuation.
  const tokens = quote.trim().split(/\s+/u);
  const pattern = tokens
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  return new RegExp(pattern, "u").exec(text)?.[0];
}

export class ReplyCitationError extends ProviderError {
  constructor(
    public reason: "missing_citations" | "unknown_source" | "quote_mismatch",
  ) {
    super(
      reason === "missing_citations"
        ? "The reply made case claims without source quotations. Try again. Nothing was added to the conversation."
        : "A reply citation did not match this case's supplied text. Try again. Nothing was added to the conversation.",
    );
  }
}

/** Check every citation against the supplied sources and return the exact source substring. */
export function verifyReply(
  citations: Citation[],
  sources: ContextSource[],
  usesFacts: boolean,
) {
  if (usesFacts && !citations.length)
    throw new ReplyCitationError("missing_citations");
  return citations.map((c) => {
    const source = sources.find((s) => s.chunk_id === c.chunk_id);
    if (!source) throw new ReplyCitationError("unknown_source");
    const quote = exactSourceQuote(source.text, c.quote);
    if (!quote) throw new ReplyCitationError("quote_mismatch");
    return { ...c, quote, source };
  });
}
