import type { Block, BlockType, Note } from "./types";
import { uid } from "./utils";

export function emptyBlock(type: BlockType = "paragraph"): Block {
  const base: Block = { id: uid(), type, text: "" };
  if (type === "code") base.language = "text";
  if (type === "todo") base.checked = false;
  if (type === "table")
    base.table = { headers: ["Name", "Value"], rows: [["", ""]] };
  return base;
}

export function welcomeNote(): Note {
  const now = Date.now();
  return {
    id: uid(),
    title: "Welcome to Noteworthy",
    tags: ["getting-started"],
    favorite: true,
    icon: null,
    folderId: null,
    createdAt: now,
    updatedAt: now,
    blocks: [
      { id: uid(), type: "h1", text: "Markdown underneath. Beautiful blocks on top." },
      { id: uid(), type: "paragraph", text: "This is Noto — a fast, local-first notes app. Press / in any empty block to open the slash menu, or type Markdown like # , - , [] , > , ``` directly." },
      { id: uid(), type: "h2", text: "Try the essentials" },
      { id: uid(), type: "todo", text: "Press / and insert a Todo — tick it off with click or Cmd+Enter", checked: false },
      { id: uid(), type: "bullet", text: "Bulleted lists nest with Tab and outdent with Shift+Tab" },
      { id: uid(), type: "numbered", text: "Numbered lists renumber automatically" },
      { id: uid(), type: "quote", text: "Quotes are for the lines worth keeping." },
      { id: uid(), type: "code", text: 'echo "fast, local, markdown-first"\nnoto open welcome.md', language: "bash" },
      { id: uid(), type: "divider", text: "" },
      { id: uid(), type: "h2", text: "Modular tables" },
      { id: uid(), type: "table", text: "", table: { headers: ["Environment", "Base URL"], rows: [["Dev", "https://api.local/dev"], ["Prod (US)", "https://api.example.com/us"]] } },
      { id: uid(), type: "paragraph", text: "Paste a URL like https://example.com and Noto can keep it plain, make it a link, or save it as a bookmark — your call in Settings." },
    ],
  };
}

/** Convert a line of text typed at block start into a block type (Markdown shortcuts). */
export function markdownShortcut(text: string): { type: BlockType; rest: string; extra?: Partial<Block> } | null {
  if (/^#{1,6}\s/.test(text)) {
    const level = text.match(/^#+/)![0].length;
    const map = ["h1", "h2", "h3", "h4", "h5", "h6"] as BlockType[];
    return { type: map[level - 1], rest: text.replace(/^#{1,6}\s/, "") };
  }
  if (/^```(\w*)\s?$/.test(text)) {
    const lang = text.replace(/```/g, "").trim() || "text";
    return { type: "code", rest: "", extra: { language: lang } };
  }
  if (/^>\s/.test(text)) return { type: "quote", rest: text.replace(/^>\s/, "") };
  if (/^-\s?\[[ xX]\]\s/.test(text)) {
    const checked = /\[x\]/i.test(text.slice(0, 6));
    return { type: "todo", rest: text.replace(/^-\s?\[[ xX]\]\s/, ""), extra: { checked } };
  }
  if (/^-\s/.test(text) || /^\*\s/.test(text)) return { type: "bullet", rest: text.replace(/^[-*]\s/, "") };
  if (/^\d+\.\s/.test(text)) return { type: "numbered", rest: text.replace(/^\d+\.\s/, "") };
  if (/^---+\s?$/.test(text)) return { type: "divider", rest: "" };
  if (/^\|\s?.*\|\s?$/.test(text) && text.includes("|")) return null;
  return null;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Junk-note predicate for the cleanup job: no real title and no real content.
 * A titled note with an empty body is a draft, not junk — it is kept.
 */
export function isJunkNote(title: string, bodyMd: string): boolean {
  return (title === "" || title === "Untitled") && isEffectivelyEmpty(bodyMd);
}
/**
 * Detect a full fenced-code paste (```lang … ```) → { language, code }.
 * Only fires when the WHOLE paste is one fence, so inline backticks are safe.
 */
export function detectFencedCode(text: string): { language: string; code: string } | null {
  const m = text.match(/^```(\w*)[ \t]*\r?\n([\s\S]*?)\r?\n?```[ \t]*$/);
  if (!m) return null;
  return { language: m[1] || "text", code: m[2].replace(/\n$/, "") };
}

/**
 * Detect a pasted Markdown table (header + delimiter + rows) → TableData.
 * Requires ≥2 pipe-lines and a delimiter row, so prose with pipes is safe.
 */
export function detectTable(text: string): { headers: string[]; rows: string[][] } | null {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2 || !lines.every((l) => /^\|.*\|$/.test(l))) return null;
  if (!lines[1].includes("-") || !/^\|?[\s:|\-.]+\|?$/.test(lines[1])) return null;
  const cells = (l: string) => l.replace(/^\||\|$/g, "").split("|").map((s) => s.trim());
  const headers = cells(lines[0]);
  if (headers.length < 2) return null;
  const width = headers.length;
  const rows = lines.slice(2).map((l) => {
    const r = cells(l);
    while (r.length < width) r.push("");
    return r.slice(0, width);
  });
  if (rows.length === 0) return null;
  return { headers, rows };
}
/**
 * True when a stored Markdown body carries no real content — only blank
 * lines, empty list markers, empty code fences, or empty table scaffolding.
 * Used to recognise never-titled notes for the Untitled migration.
 */
export function isEffectivelyEmpty(md: string): boolean {
  const stripped = md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*`~\-+|[\]()!]/g, "")
    .replace(/\d+\./g, "")
    .replace(/\s+/g, "");
  return stripped.length === 0;
}

/**
 * Pure wrap/unwrap helper behind ⌘B / ⌘I / ⌘E.
 * Wraps the [start,end) range in before/after markers; unwraps if already
 * wrapped; with an empty range inserts an empty pair and parks the caret
 * between the markers so typing continues inside the formatting.
 */
export function toggleWrap(text: string, start: number, end: number, before: string, after: string = before) {
  const sel = text.slice(start, end);
  if (sel.length >= before.length + after.length && sel.startsWith(before) && sel.endsWith(after)) {
    const inner = sel.slice(before.length, sel.length - after.length);
    return { text: text.slice(0, start) + inner + text.slice(end), start, end: end - before.length - after.length };
  }
  if (start === end) {
    return { text: text.slice(0, start) + before + after + text.slice(end), start: start + before.length, end: start + before.length };
  }
  return {
    text: text.slice(0, start) + before + sel + after + text.slice(end),
    start: start + before.length,
    end: end + before.length,
  };
}

/** Inline markdown: `code`, **bold**, *italic*, [links](url), bare URLs. */
export function renderInline(text: string): string {
  let out = esc(text);
  out = out.replace(/`([^`]+)`/g, "<code class=\"rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]\">$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;!?]|$)/g, "$1<em>$2</em>");
  out = out.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, `<a href="$2" class="underline decoration-primary/40 underline-offset-2">$1</a>`);
  out = out.replace(/(^|\s)(https?:\/\/[^\s<]+)(?![^<]*>)/g, `$1<a href="$2" class="underline decoration-primary/40 underline-offset-2">$2</a>`);
  return out;
}

export function blocksToMarkdown(title: string, blocks: Block[], includeTitle = true): string {
  const lines: string[] = includeTitle ? [`# ${title}`, ""] : [];
  let num = 0;
  for (const b of blocks) {
    switch (b.type) {
      case "h1": lines.push(`# ${b.text}`); break;
      case "h2": lines.push(`## ${b.text}`); break;
      case "h3": lines.push(`### ${b.text}`); break;
      case "h4": lines.push(`#### ${b.text}`); break;
      case "h5": lines.push(`##### ${b.text}`); break;
      case "h6": lines.push(`###### ${b.text}`); break;
      case "bullet": lines.push(`- ${b.text}`); break;
      case "numbered": num++; lines.push(`${num}. ${b.text}`); break;
      case "todo": lines.push(`- [${b.checked ? "x" : " "}] ${b.text}`); break;
      case "quote": lines.push(`> ${b.text}`); break;
      case "callout": lines.push(`> [!NOTE] ${b.text}`); break;
      case "divider": lines.push("---"); break;
      case "code": lines.push(`\`\`\`${b.language ?? "text"}`, b.text, "```"); break;
      case "html": lines.push("```html", b.text, "```"); break;
      case "table":
        if (b.table) {
          lines.push(`| ${b.table.headers.join(" | ")} |`, `| ${b.table.headers.map(() => "---").join(" | ")} |`);
          for (const r of b.table.rows) lines.push(`| ${r.join(" | ")} |`);
        }
        break;
      case "bookmark": lines.push(`[${b.text || b.url}](${b.url})`); break;
      case "image": lines.push(`![${b.text}](${b.url})`); break;
      default: lines.push(b.text);
    }
    if (b.type !== "numbered") num = 0;
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

export function markdownToBlocks(md: string, stripTitle?: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.split("\n");
  let i = 0;
  // The title lives in its own column/input; a leading "# <title>" line is
  // the serialized title — drop it so save→reload never duplicates it.
  if (stripTitle && lines[0]?.trim() === `# ${stripTitle}`) i = 1;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim() || "text";
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      blocks.push({ id: uid(), type: "code", text: buf.join("\n"), language: lang });
      continue;
    }
    if (/^\|.+\|$/.test(line.trim()) && /^\|?[\s:|-]+\|?[\s:|.-]*$/.test((lines[i + 1] ?? "").trim())) {
      const headers = line.split("|").map((s) => s.trim()).filter(Boolean);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].split("|").map((s) => s.trim()).filter(Boolean));
        i++;
      }
      blocks.push({ id: uid(), type: "table", text: "", table: { headers, rows } });
      continue;
    }
    const sc = markdownShortcut(line);
    if (sc && line.trim() !== "") {
      blocks.push({ id: uid(), type: sc.type, text: sc.rest, ...(sc.extra ?? {}) });
    } else if (/^---+$/.test(line.trim())) {
      blocks.push({ id: uid(), type: "divider", text: "" });
    } else if (line.trim() === "") {
      // Blank separator lines carry no content — never materialize a block.
    } else {
      blocks.push({ id: uid(), type: "paragraph", text: line });
    }
    i++;
  }
  return blocks.length ? blocks : [emptyBlock()];
}
