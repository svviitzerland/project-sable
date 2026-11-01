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
