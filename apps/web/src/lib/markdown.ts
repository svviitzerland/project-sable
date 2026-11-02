/**
 * A small Markdown subset for AI replies: headings, paragraphs, bullet and numbered
 * lists (one nesting level), bold, italic and inline code. It returns plain data that
 * components render as elements, so model text can never inject HTML.
 */
export type Inline =
  | { type: "text"; text: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "code"; text: string };

export type ListItem = { content: Inline[]; children: ListItem[] };

export type Block =
  | { type: "heading"; level: 3 | 4; content: Inline[] }
  | { type: "paragraph"; content: Inline[] }
  | { type: "list"; ordered: boolean; start: number; items: ListItem[] };

export function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer) out.push({ type: "text", text: buffer });
    buffer = "";
  };
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    if (rest.startsWith("`")) {
      const end = source.indexOf("`", i + 1);
      if (end > i + 1) {
        flush();
        out.push({ type: "code", text: source.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    const marker = rest.startsWith("**")
      ? "**"
      : rest.startsWith("__")
        ? "__"
        : "";
    if (marker) {
      const end = source.indexOf(marker, i + 2);
      if (end > i + 2) {
        flush();
        out.push({
          type: "strong",
          children: parseInline(source.slice(i + 2, end)),
        });
        i = end + 2;
        continue;
      }
    }
    const ch = source[i];
    if ((ch === "*" || ch === "_") && source[i + 1] !== " ") {
      // Italic needs a closing marker not preceded by a space; underscores inside
      // words (snake_case, file names) stay literal.
      const prev = source[i - 1];
      const wordInside = ch === "_" && prev && /\w/.test(prev);
      const end = source.indexOf(ch, i + 1);
      if (!wordInside && end > i + 1 && source[end - 1] !== " ") {
        flush();
        out.push({
          type: "em",
          children: parseInline(source.slice(i + 1, end)),
        });
        i = end + 1;
        continue;
      }
    }
    buffer += ch;
    i++;
  }
  flush();
  return out;
}

const bullet = /^(\s*)[-*•]\s+(.*)$/;
const numbered = /^(\s*)(\d+)[.)]\s+(.*)$/;

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: Extract<Block, { type: "list" }> | null = null;
  let baseIndent = 0;

  const endParagraph = () => {
    if (paragraph.length)
      blocks.push({
        type: "paragraph",
        content: parseInline(paragraph.join(" ")),
      });
    paragraph = [];
  };
  const endList = () => {
    if (list) blocks.push(list);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      endParagraph();
      endList();
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line.trim());
    if (heading) {
      endParagraph();
      endList();
      blocks.push({
        type: "heading",
        level: heading[1].length <= 2 ? 3 : 4,
        content: parseInline(heading[2]),
      });
      continue;
    }
    const b = bullet.exec(line);
    const n = b ? null : numbered.exec(line);
    if (b || n) {
      endParagraph();
      const indent = (b ? b[1] : n![1]).length;
      const text = b ? b[2] : n![3];
      const ordered = !b;
      const current = list as Extract<Block, { type: "list" }> | null;
      if (current && indent > baseIndent && current.items.length) {
        // One nested level under the previous item.
        current.items[current.items.length - 1].children.push({
          content: parseInline(text),
          children: [],
        });
        continue;
      }
      if (!current || current.ordered !== ordered) {
        endList();
        list = {
          type: "list",
          ordered,
          start: ordered ? Number(n![2]) : 1,
          items: [],
        };
        baseIndent = indent;
      }
      list!.items.push({ content: parseInline(text), children: [] });
      continue;
    }
    // A continuation line of a list item stays inside that item.
    const open = list as Extract<Block, { type: "list" }> | null;
    if (open && /^\s+/.test(raw) && open.items.length) {
      const last = open.items[open.items.length - 1];
      last.content = [
        ...last.content,
        { type: "text", text: " " },
        ...parseInline(line.trim()),
      ];
      continue;
    }
    endList();
    paragraph.push(line.trim());
  }
  endParagraph();
  endList();
  return blocks;
}
