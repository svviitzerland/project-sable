/**
 * Map a model quote to the exact source substring. Only whitespace and the typographic
 * form of quotation marks may differ: models type `Ma'ruf` for the court's `Ma’ruf`.
 */
export function exactSourceQuote(
  text: string,
  quote: string,
): string | undefined {
  if (!quote.trim()) return undefined;
  if (text.includes(quote)) return quote;
  // PDF/DOCX extraction may insert line breaks or nonbreaking spaces. Preserve all
  // words, numbers, case and other punctuation.
  const tokens = quote.trim().split(/\s+/u);
  const pattern = tokens
    .map((token) =>
      token
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/['‘’ʼ`]/gu, "['‘’ʼ`]")
        .replace(/["“”]/gu, '["“”]'),
    )
    .join("\\s+");
  return new RegExp(pattern, "u").exec(text)?.[0];
}
