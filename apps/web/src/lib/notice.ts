import { translate, type Lang } from "./i18n/core";

/**
 * Conversation notices are stored in English so exports stay readable.
 * The interface shows them in the selected language by recognising the fixed
 * sentences the server writes. Anything unrecognised is shown unchanged.
 */
const patterns: [RegExp, (m: RegExpMatchArray, lang: Lang) => string][] = [
  [
    /Based on (\d+) source excerpts?\. Check the original context[.;] [Tt]his is not a review of the entire case\./,
    (m, lang) => translate(lang, "notice.sources", { count: m[1] }),
  ],
  [
    /Legal results are discovery metadata[.;] [Vv]erify the original legal text\./,
    (_, lang) => translate(lang, "notice.legal"),
  ],
  [
    /Legal search is unavailable[.;] [Nn]o legal text was retrieved\./,
    (_, lang) => translate(lang, "notice.legalOff"),
  ],
  [
    /Hypothetical rehearsal[,;.] [Nn]ot testimony or a prediction of a real court\./,
    (_, lang) => translate(lang, "notice.rehearsal"),
  ],
  [
    /Hypothetical rehearsal, separate from testimony and findings\./,
    (_, lang) => translate(lang, "notice.scene"),
  ],
];

export function localizeNotice(text: string, lang: Lang): string {
  let rest = text;
  const parts: string[] = [];
  for (const [re, render] of patterns) {
    const m = rest.match(re);
    if (!m) continue;
    parts.push(render(m, lang));
    rest = rest.replace(m[0], " ");
  }
  rest = rest.replace(/\s+/g, " ").trim();
  if (rest) parts.push(rest);
  return parts.join(" ");
}
