/**
 * Reads speaker turns from transcripts as they are published, instead of requiring one
 * fixed layout: official risalah (MK, DPR), court-style "HAKIM KETUA: ..." records,
 * "[00:01:02] Saksi: ..." notes and plain "Speaker: text" lines. Text stays verbatim.
 *
 * The parser picks the dominant turn marker in the document. When at least three turns
 * carry timestamps, only timestamped labels start turns (so attendance lists and notes
 * such as "Pihak yang Hadir:" are skipped). Otherwise a label must recur to count as a
 * speaker. Lines before the first turn are front matter; later lines continue the turn.
 */
export type ParsedTurn = { speaker: string; text: string; start: number };

const TIME = String.raw`\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?`;
const START = new RegExp(
  String.raw`^(?:\d{1,4}[.)]\s+)?(?:[\[(](${TIME})[\])]\s*)?([^:\[\]]{1,80}?)\s*:\s*(.*)$`,
);
const TRAILING_TIME = new RegExp(String.raw`\s*[\[(](${TIME})[\])]\s*$`);
const NOISE =
  /^(?:\d{1,4}|[ivxlc]{1,6}|-{3,}|_{3,}|(?:ketuk palu|sidang (?:dibuka|di ?tutup|diskors|dibuka kembali|dilanjutkan)|skors)\b.*)$/i;

function seconds(value: string) {
  return value
    .replace(",", ".")
    .split(":")
    .reverse()
    .reduce((sum, part, i) => sum + Number(part) * 60 ** i, 0);
}

const isCaps = (value: string) =>
  /\p{Lu}/u.test(value) && value === value.toLocaleUpperCase("id");

function titleCase(value: string) {
  return isCaps(value)
    ? value
        .toLocaleLowerCase("id")
        .replace(
          /(^|[\s(./-])(\p{L})/gu,
          (_, p, c) => p + c.toLocaleUpperCase("id"),
        )
    : value;
}

type Candidate = {
  line: number;
  label: string;
  name: string;
  text: string;
  time: string | null;
};

function candidate(line: string, index: number): Candidate | null {
  const match = START.exec(line);
  if (!match) return null;
  const [, leading, rawLabel, rest] = match;
  const label = rawLabel.trim();
  const words = label.split(/\s+/).length;
  // Speaker labels are short names or roles, not sentences or URLs.
  if (!label || words > 7 || /[.?!,;]$|https?$|\d{3,}/i.test(label))
    return null;
  const trailing = TRAILING_TIME.exec(rest);
  let text = trailing ? rest.slice(0, trailing.index) : rest;
  let name = "";
  // "KETUA: ARSUL SANI [00:00]" puts the name after the role and speech on later lines.
  if (trailing && isCaps(text.trim()) && text.trim().split(/\s+/).length <= 6) {
    name = text.trim();
    text = "";
  }
  return {
    line: index,
    label,
    name,
    text: text.trim(),
    time: leading ?? trailing?.[1] ?? null,
  };
}

export function parseSpeakerTurns(raw: string): ParsedTurn[] {
  const lines = raw
    .replaceAll("\r\n", "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t\u00a0]+/g, " ").trim());
  const found = lines
    .map((line, i) => (line ? candidate(line, i) : null))
    .filter((c): c is Candidate => !!c);
  const timed = found.filter((c) => c.time);
  let starts: Candidate[];
  const nonEmpty = lines.filter(Boolean).length;
  if (timed.length >= 3) starts = timed;
  else if (found.length === nonEmpty && found.every((c) => c.text))
    starts = found; // every line is "Speaker: text"
  else {
    const counts = new Map<string, number>();
    for (const c of found)
      counts.set(
        c.label.toLowerCase(),
        (counts.get(c.label.toLowerCase()) || 0) + 1,
      );
    starts = found.filter(
      (c) =>
        (counts.get(c.label.toLowerCase()) || 0) >= 2 &&
        (c.text || isCaps(c.label)),
    );
  }
  if (!starts.length) return [];
  const byLine = new Map(starts.map((c) => [c.line, c]));
  const turns: ParsedTurn[] = [];
  let current: ParsedTurn | null = null;
  for (let i = starts[0].line; i < lines.length; i++) {
    const start = byLine.get(i);
    if (start) {
      const label = titleCase(start.label);
      current = {
        speaker: (start.name
          ? `${label} (${titleCase(start.name)})`
          : label
        ).slice(0, 80),
        text: start.text,
        start: start.time ? seconds(start.time) : 0,
      };
      turns.push(current);
    } else if (current && lines[i] && !NOISE.test(lines[i]))
      current.text = current.text ? `${current.text} ${lines[i]}` : lines[i];
  }
  return turns.filter((turn) => turn.text);
}
