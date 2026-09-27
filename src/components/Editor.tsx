import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check, Code2, Copy, GripVertical, Image as ImageIcon, Link2,
  Globe, Plus, Trash2, ArrowUp, ArrowDown, CopyPlus, Bookmark,
  Type, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  List, ListOrdered, ListTodo, TextQuote, Info, Minus, FileCode,
  ExternalLink, Pencil, EyeOff, WrapText, MoreHorizontal, RotateCcw,
  Table as TableIcon,
  type LucideIcon,
} from "lucide-react";
import type { Block, BlockType, Note, Settings } from "@/lib/types";
import { blocksToMarkdown, detectFencedCode, detectTable, emptyBlock, markdownShortcut, renderInline, toggleWrap } from "@/lib/blocks";
import { SLASH_ITEMS, filterSlash, type SlashItem } from "@/lib/slash";
import { decorateUrlPaste, domainOf } from "@/lib/urls";
import { cn, openExternal, uid } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";

export const LANGUAGES = [
  "text", "typescript", "javascript", "tsx", "python", "bash", "json",
  "yaml", "sql", "html", "css", "go", "rust", "java", "swift", "markdown",
];

const PLACEHOLDER: Partial<Record<BlockType, string>> = {
  paragraph: "Type / for blocks, or Markdown…",
  h1: "Heading 1", h2: "Heading 2", h3: "Heading 3",
  h4: "Heading 4", h5: "Heading 5", h6: "Heading 6",
  bullet: "List item", numbered: "List item", todo: "Todo",
  quote: "Quote", callout: "Callout", code: "// code",
  html: "<div>…</div>",
};

const HEADING_CLS: Partial<Record<BlockType, string>> = {
  h1: "text-[1.7rem] font-bold tracking-tight",
  h2: "text-[1.35rem] font-semibold tracking-tight",
  h3: "text-[1.15rem] font-semibold",
  h4: "text-[1rem] font-semibold",
  h5: "text-[0.9rem] font-semibold uppercase tracking-wide",
  h6: "text-[0.85rem] font-semibold uppercase tracking-wide text-muted-foreground",
};

const GROUP_ORDER = ["Suggested", "Basic blocks", "Lists", "Code", "Content", "Productivity"];

/* ------------------------------------------------------------------ */
/* Auto-growing textarea used by every text-ish block                  */
/* ------------------------------------------------------------------ */
function AutoText({
  value, onChange, onKeyDown, onPaste, className, placeholder,
  mono = false, noWrap = false, style, spellcheck = true, blockRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  className?: string;
  placeholder?: string;
  mono?: boolean;
  /** Horizontal-scroll instead of soft-wrap (code blocks default to this). */
  noWrap?: boolean;
  style?: React.CSSProperties;
  spellcheck?: boolean;
  blockRef?: (el: HTMLTextAreaElement | null) => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={(el) => { ref.current = el; blockRef?.(el); }}
      value={value}
      rows={1}
      spellCheck={spellcheck}
      wrap={noWrap ? "off" : "soft"}
      placeholder={placeholder}
      style={style}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      className={cn(
        "w-full resize-none bg-transparent outline-none placeholder:text-muted-foreground/50",
        mono && "font-mono text-[0.85rem] leading-relaxed",
        noWrap && "whitespace-pre overflow-x-auto",
        className,
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Slash menu                                                          */
/* ------------------------------------------------------------------ */
function SlashMenu({ query, onPick, onClose }: { query: string; onPick: (i: SlashItem) => void; onClose: () => void }) {
  const items = useMemo(() => filterSlash(query), [query]);
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [query]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, items.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); items[index] && onPick(items[index]); }
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [items, index, onPick, onClose]);

  const groups = useMemo(() => {
    const m = new Map<string, SlashItem[]>();
    for (const i of items) {
      if (!m.has(i.group)) m.set(i.group, []);
      m.get(i.group)!.push(i);
    }
    return GROUP_ORDER.flatMap((g) => (m.has(g) ? [{ group: g, items: m.get(g)! }] : []));
  }, [items]);

  let flat = -1;
  return (
    <div className="slash-menu max-h-[320px] overflow-y-auto" onMouseDown={(e) => e.preventDefault()}>
      {groups.map((g) => (
        <div key={g.group}>
          <div className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{g.group}</div>
          {g.items.map((item) => {
            flat++;
            const active = flat === index;
            return (
              <button
                key={item.id}
                onMouseEnter={() => setIndex(flat)}
                onClick={() => onPick(item)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm",
                  active ? "bg-accent text-accent-foreground" : "text-foreground",
                )}
              >
                <BlockGlyph type={item.make().type} />
                <span className="flex-1">{item.title}</span>
                {item.hint && <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{item.hint}</kbd>}
              </button>
            );
          })}
        </div>
      ))}
      {items.length === 0 && <div className="px-3 py-6 text-center text-sm text-muted-foreground">No blocks match “{query}”</div>}
      <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>Type to search</span><kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">esc</kbd>
      </div>
    </div>
  );
}

const GLYPH: Record<BlockType, LucideIcon> = {
  paragraph: Type, h1: Heading1, h2: Heading2, h3: Heading3,
  h4: Heading4, h5: Heading5, h6: Heading6, bullet: List,
  numbered: ListOrdered, todo: ListTodo, quote: TextQuote,
  callout: Info, divider: Minus, code: Code2, html: FileCode,
  table: TableIcon, bookmark: Bookmark, image: ImageIcon,
};

function BlockGlyph({ type }: { type: BlockType }) {
  const Icon = GLYPH[type] ?? Type;
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Code block — custom component (justified: no shadcn code primitive; */
/* needs language select + copy + line numbers as one unit)            */
/* ------------------------------------------------------------------ */
function CodeBlock({ block, showNumbers, defaultSize, onPatch }: {
  block: Block; showNumbers: boolean; defaultSize: number; onPatch: (p: Partial<Block>) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapped = !!block.wrap;
  const size = Math.min(18, Math.max(10, block.codeSize ?? defaultSize));
  const bump = (d: number) => onPatch({ codeSize: Math.min(18, Math.max(10, size + d)) });
  const copy = async () => {
    try { await navigator.clipboard.writeText(block.text); } catch { /* clipboard unavailable */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  const iconBtn = "flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
  return (
    <div className="code-surface group/code relative overflow-hidden rounded-lg border">
      {/* Floating toolbar — hover only, compact: language · copy · wrap · more */}
      <div
        className={cn(
          "absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-md border bg-popover/95 p-0.5 shadow-sm transition-opacity",
          menuOpen ? "opacity-100" : "opacity-0 group-hover/code:opacity-100 focus-within:opacity-100",
        )}
      >
        <Select value={block.language ?? "text"} onValueChange={(v) => onPatch({ language: v })}>
          <SelectTrigger className="h-6 w-[104px] border-0 bg-transparent text-[11px] shadow-none"><SelectValue /></SelectTrigger>
          <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <button className={iconBtn} title="Copy" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button
          className={cn(iconBtn, wrapped && "text-primary hover:text-primary")}
          title={wrapped ? "Stop wrapping code" : "Wrap code"}
          onClick={() => onPatch({ wrap: !wrapped })}
        >
          <WrapText className="h-3.5 w-3.5" />
        </button>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button className={iconBtn} title="More actions">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" collisionPadding={8} className="w-52">
            <DropdownMenuItem onSelect={() => { void copy(); }}>
              <Copy className="h-4 w-4" /> Copy
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onPatch({ wrap: !wrapped })}>
              <WrapText className="h-4 w-4" /> {wrapped ? "Stop wrapping code" : "Wrap code"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Live stepper: plain buttons don't dismiss the menu, so the
                user can tap −/+ until the size looks right. */}
            <div className="flex items-center gap-1 px-2 py-1.5">
              <span className="flex-1 text-sm">Text size</span>
              <button
                title="Smaller"
                disabled={size <= 10}
                onClick={() => bump(-1)}
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-12 rounded bg-muted px-1 py-0.5 text-center font-mono text-[11px] tabular-nums">
                {size}px
              </span>
              <button
                title="Larger"
                disabled={size >= 18}
                onClick={() => bump(1)}
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {block.codeSize !== undefined && (
              <DropdownMenuItem onSelect={() => onPatch({ codeSize: undefined })}>
                <RotateCcw className="h-4 w-4" /> Reset size ({defaultSize}px)
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex px-0 py-2.5">
        {showNumbers && (
          <div
            className="select-none pr-3 text-right font-mono text-muted-foreground/60"
            style={{ fontSize: size, lineHeight: 1.7 }}
            aria-hidden
          >
            {block.text.split("\n").map((_: string, i: number) => <div key={i} className="w-8">{i + 1}</div>)}
          </div>
        )}
        <AutoText value={block.text} mono spellcheck={false} noWrap={!wrapped} style={{ fontSize: size, lineHeight: 1.7 }} onChange={(v) => onPatch({ text: v })}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              // Code blocks keep Tab as indentation instead of focus escape.
              e.preventDefault();
              const el = e.currentTarget;
              const s = el.selectionStart, en = el.selectionEnd;
              onPatch({ text: block.text.slice(0, s) + "  " + block.text.slice(en) });
              requestAnimationFrame(() => { try { el.setSelectionRange(s + 2, s + 2); } catch { /* noop */ } });
            }
          }}
          className="flex-1 px-3 leading-6" placeholder="// code" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Table block — custom component (justified: spreadsheet-like grid    */
/* editing with add/del row/col has no shadcn equivalent; shadcn       */
/* Table is display-only)                                              */
/* ------------------------------------------------------------------ */
function TableBlock({ block, onPatch }: { block: Block; onPatch: (p: Partial<Block>) => void }) {
  const t = block.table ?? { headers: ["Name", "Value"], rows: [["", ""]] };
  const set = (headers: string[], rows: string[][]) => onPatch({ table: { headers, rows } });
  const setCell = (r: number, c: number, v: string) => {
    const rows = t.rows.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? v : cell)));
    set(t.headers, rows);
  };
  const setHeader = (c: number, v: string) => set(t.headers.map((h, i) => (i === c ? v : h)), t.rows);
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/60">
            {t.headers.map((h, c) => (
              <th key={c} className="border-b border-r border-border p-0 last:border-r-0">
                <input value={h} onChange={(e) => setHeader(c, e.target.value)}
                  className="w-full bg-transparent px-2.5 py-1.5 text-left font-semibold outline-none placeholder:text-muted-foreground/50" placeholder={`Col ${c + 1}`} />
              </th>
            ))}
            <th className="w-8 border-b border-border">
              <button className="px-1.5 text-muted-foreground hover:text-foreground" title="Add column"
                onClick={() => set([...t.headers, `Col ${t.headers.length + 1}`], t.rows.map((r) => [...r, ""]))}>+</button>
            </th>
          </tr>
        </thead>
        <tbody>
          {t.rows.map((row, r) => (
            <tr key={r} className="border-b border-border last:border-b-0 hover:bg-accent/30">
              {row.map((cell, c) => (
                <td key={c} className="border-r border-border p-0 last:border-r-0">
                  <input value={cell} onChange={(e) => setCell(r, c, e.target.value)}
                    className="w-full bg-transparent px-2.5 py-1.5 outline-none placeholder:text-muted-foreground/40" />
                </td>
              ))}
              <td className="w-8 text-center">
                <button className="text-muted-foreground hover:text-destructive" title="Delete row"
                  onClick={() => set(t.headers, t.rows.filter((_, i) => i !== r))}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-1 border-t border-border bg-muted/40 px-2 py-1">
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => set(t.headers, [...t.rows, t.headers.map(() => "")])}>+ Row</Button>
        <Button variant="ghost" size="sm" className="h-6 text-xs"
          onClick={() => t.headers.length > 1 && set(t.headers.slice(0, -1), t.rows.map((r) => r.slice(0, -1)))}>− Column</Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */
export function Editor({ note, settings, onChange, onToggleAddBlock }: {
  note: Note; settings: Settings;
  onChange: (title: string, body: string) => void;
  onToggleAddBlock: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [blocks, setBlocks] = useState<Block[]>(note.blocks);
  const [slash, setSlash] = useState<{ blockId: string; query: string } | null>(null);
  const [suggestUrl, setSuggestUrl] = useState<{ blockId: string; url: string } | null>(null);
  const [editingBookmark, setEditingBookmark] = useState<string | null>(null);
  // Layered ⌘A: first press selects the block, second selects the whole page.
  const [selectAll, setSelectAll] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLTextAreaElement>());
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Consumes the keystroke already in flight when a / pick is confirmed,
  // so it can't ALSO trigger block creation via a stale handler closure.
  const slashGuard = useRef(false);
  // Dead-zone click tracking: only a clean click (no drag) appends a block.
  const deadDown = useRef<{ x: number; y: number; hadSelection: boolean } | null>(null);

  // Reset local state when switching notes.
  useEffect(() => {
    setTitle(note.title);
    setBlocks(note.blocks.length ? note.blocks : [emptyBlock()]);
    setSlash(null);
    setSuggestUrl(null);
    setSelectAll(false);
    setEditingBookmark(null);
    refs.current.clear();
  }, [note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const push = useCallback((t: string, b: Block[]) => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    // includeTitle=false: the title has its own column; embedding it would
    // duplicate an H1 on every reload.
    pushTimer.current = setTimeout(() => onChange(t, blocksToMarkdown(t, b, false)), 250);
  }, [onChange]);

  const commit = useCallback((t: string, b: Block[]) => {
    setTitle(t); setBlocks(b); push(t, b);
  }, [push]);

  const patchBlock = useCallback((id: string, p: Partial<Block>) => {
    setBlocks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, ...p } : b));
      push(title, next);
      return next;
    });
  }, [push, title]);

  const focusBlock = useCallback((id: string, caret: "start" | "end" = "end") => {
    requestAnimationFrame(() => {
      const el = refs.current.get(id);
      if (!el) return;
      el.focus();
      const pos = caret === "end" ? el.value.length : 0;
      try { el.setSelectionRange(pos, pos); } catch { /* noop */ }
    });
  }, []);

  const insertAfter = useCallback((afterId: string, make: () => Block) => {
    const nb = make();
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === afterId);
      const next = [...prev.slice(0, i + 1), nb, ...prev.slice(i + 1)];
      push(title, next);
      return next;
    });
    focusBlock(nb.id, "start");
    return nb.id;
  }, [focusBlock, push, title]);

  const moveFocus = useCallback((id: string, dir: 1 | -1) => {
    const i = blocks.findIndex((b) => b.id === id);
    const n = blocks[i + dir];
    if (n) { focusBlock(n.id); return true; }
    return false;
  }, [blocks, focusBlock]);

  // Single shared morph used by BOTH the / slash menu and the gutter
  // "turn into" dropdown, so both entry points behave identically.
  const morphBlock = useCallback((id: string, type: BlockType, opts?: {
    clearText?: boolean; seed?: Partial<Block>; focus?: "start" | "end";
  }) => {
    const seed = opts?.seed ?? {};
    const fallbackTable = { headers: ["Name", "Value"], rows: [["", ""]] };
    setBlocks((prev) => {
      const next = prev.map((b) => {
        if (b.id !== id) return b;
        const nb: Block = {
          ...b, ...seed, id: b.id, type,
          text: opts?.clearText ? (seed.text ?? "") : (seed.text ?? b.text),
          language: type === "code" ? (seed.language ?? b.language ?? "typescript") : b.language,
          checked: type === "todo" ? (seed.checked ?? b.checked ?? false) : b.checked,
          table: type === "table" ? (seed.table ?? b.table ?? fallbackTable) : b.table,
          url: seed.url ?? b.url,
        };
        return nb;
      });
      push(title, next);
      return next;
    });
    setSlash(null);
    focusBlock(id, opts?.focus ?? "end");
  }, [focusBlock, push, title]);

  const applySlash = useCallback((blockId: string, item: SlashItem) => {
    slashGuard.current = true;
    // Auto-clears: only the in-flight confirmation keystroke is consumed.
    setTimeout(() => { slashGuard.current = false; }, 0);
    const made = item.make();
    morphBlock(blockId, made.type, { clearText: true, seed: made, focus: "start" });
  }, [morphBlock]);

  const turnInto = useCallback((id: string, type: BlockType) => {
    morphBlock(id, type);
  }, [morphBlock]);

  /**
   * Notion-style: clicking the empty area below the last block starts
   * writing there. Reuses the focused empty block if the page already ends
   * in one (no duplicate empties); otherwise appends a fresh paragraph.
   * Type-bearing blocks (table/bookmark/image/divider) can't take a caret,
   * so a new paragraph is always appended after those.
   */
  const appendAtEnd = useCallback(() => {
    setSlash(null);
    setSuggestUrl(null);
    const last = blocks[blocks.length - 1];
    if (!last) {
      const nb = emptyBlock();
      commit(title, [nb]);
      focusBlock(nb.id, "start");
      return;
    }
    if (
      last.text === "" &&
      last.type !== "table" && last.type !== "bookmark" &&
      last.type !== "image" && last.type !== "divider"
    ) {
      focusBlock(last.id, "start");
      return;
    }
    insertAfter(last.id, () => emptyBlock());
  }, [blocks, commit, focusBlock, insertAfter, title]);

  const wrapSelection = useCallback((id: string, before: string, after: string = before) => {
    const el = refs.current.get(id);
    if (!el) return;
    const r = toggleWrap(el.value, el.selectionStart, el.selectionEnd, before, after);
    patchBlock(id, { text: r.text });
    setSlash(null);
    requestAnimationFrame(() => {
      const target = refs.current.get(id);
      if (target) {
        target.focus();
        try { target.setSelectionRange(r.start, r.end); } catch { /* noop */ }
      }
    });
  }, [patchBlock]);

  const linkWrap = useCallback((id: string) => {
    const el = refs.current.get(id);
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const sel = el.value.slice(s, e) || "text";
    const ins = `[${sel}]()`;
    patchBlock(id, { text: el.value.slice(0, s) + ins + el.value.slice(e) });
    setSlash(null);
    const caret = s + ins.length - 1; // inside the parens, ready for the URL
    requestAnimationFrame(() => {
      const target = refs.current.get(id);
      if (target) {
        target.focus();
        try { target.setSelectionRange(caret, caret); } catch { /* noop */ }
      }
    });
  }, [patchBlock]);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      if (prev.length <= 1) {
        const nb = [emptyBlock()];
        push(title, nb);
        return nb;
      }
      const i = prev.findIndex((b) => b.id === id);
      const next = prev.filter((b) => b.id !== id);
      push(title, next);
      const target = next[Math.max(0, i - 1)];
      if (target) focusBlock(target.id);
      return next;
    });
  }, [focusBlock, push, title]);

  const handleTextChange = useCallback((id: string, v: string) => {
    if (selectAll) return; // page-level selection consumes typing via keydown
    // Slash trigger
    if (v.startsWith("/") && !v.includes(" ") && v.length <= 24) {
      setSlash({ blockId: id, query: v });
    } else if (slash?.blockId === id) {
      setSlash(null);
    }
    // Markdown shortcut: "# " → heading etc. (fires once, at the space)
    if (/(^|\n)(#{1,6}|```\w*|>\s|-\s\[\s\]\s|-\s|\*\s|\d+\.\s|---+)\s?$/.test(v) || markdownShortcut(v)) {
      const sc = markdownShortcut(v);
      if (sc && v.trim() !== "" && !v.startsWith("/")) {
        setBlocks((prev) => {
          const next = prev.map((b) => (b.id === id ? { ...b, type: sc.type, text: sc.rest, ...sc.extra } : b));
          push(title, next);
          return next;
        });
        return;
      }
    }
    patchBlock(id, { text: v });
  }, [patchBlock, push, selectAll, slash, title]);

  const handleKey = useCallback((id: string, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    const el = e.currentTarget;
    const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
    const atEnd = el.selectionStart === el.value.length && el.selectionEnd === el.value.length;

    if (slashGuard.current) {
      slashGuard.current = false;
      e.preventDefault();
      return;
    }
    if (slash?.blockId === id && ["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
      // Let the slash menu (capture listener) handle these.
      if (e.key !== "Escape") e.preventDefault();
      return;
    }
    // Rich-text formatting (same markers the Markdown renderer understands).
    // NOTE: macOS Option combos produce special chars in e.key, so match e.code.
    const mod = e.metaKey || e.ctrlKey;
    // Layered select-all: first ⌘A selects the block (native), second selects the page.
    if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "a") {
      if (selectAll) { e.preventDefault(); return; }
      const el = e.currentTarget;
      if (el.selectionStart === 0 && el.selectionEnd === el.value.length) {
        e.preventDefault();
        setSelectAll(true);
      }
      return;
    }
    // Whole page selected: typing replaces it, Enter clears it, erase wipes it.
    if (selectAll) {
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        commit(title, [emptyBlock()]);
        setSelectAll(false);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const nb = emptyBlock();
        commit(title, [nb]);
        setSelectAll(false);
        focusBlock(nb.id, "start");
        return;
      }
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const nb = { ...emptyBlock("paragraph"), text: e.key };
        commit(title, [nb]);
        setSelectAll(false);
        focusBlock(nb.id);
        return;
      }
    }
    if (mod && !e.altKey && e.key.toLowerCase() === "b") { e.preventDefault(); wrapSelection(id, "**"); return; }
    if (mod && !e.altKey && e.key.toLowerCase() === "i") { e.preventDefault(); wrapSelection(id, "*"); return; }
    if (mod && !e.altKey && e.key.toLowerCase() === "e") { e.preventDefault(); wrapSelection(id, "`"); return; }
    if (mod && e.shiftKey && e.code === "KeyK") { e.preventDefault(); linkWrap(id); return; }
    if (mod && e.altKey && ["Digit1", "Digit2", "Digit3", "Digit4"].includes(e.code)) {
      e.preventDefault();
      turnInto(id, (["h1", "h2", "h3", "h4"] as BlockType[])[Number(e.code.slice(5)) - 1]);
      return;
    }
    if (mod && e.altKey && e.code === "KeyC") { e.preventDefault(); turnInto(id, "code"); return; }
    if (mod && e.altKey && e.code === "KeyT") { e.preventDefault(); turnInto(id, "todo"); return; }
    if (mod && e.altKey && e.code === "KeyQ") { e.preventDefault(); turnInto(id, "quote"); return; }
    if (mod && e.shiftKey && e.code === "Digit7") { e.preventDefault(); turnInto(id, "bullet"); return; }
    if (mod && e.shiftKey && e.code === "Digit8") { e.preventDefault(); turnInto(id, "numbered"); return; }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Empty todo/heading/list + Enter → back to paragraph (Notion-like exit).
      if (block.text === "" && block.type !== "paragraph" && block.type !== "code") {
        turnInto(id, "paragraph");
        return;
      }
      insertAfter(id, () => emptyBlock(block.type === "numbered" || block.type === "bullet" || block.type === "todo" ? block.type : "paragraph"));
    } else if (e.key === "Backspace" && block.text === "" && blocks.length > 1) {
      e.preventDefault();
      deleteBlock(id);
    } else if (e.key === "Backspace" && atStart && block.type !== "paragraph") {
      e.preventDefault();
      turnInto(id, "paragraph");
    } else if (e.key === "ArrowDown" && atEnd) {
      if (moveFocus(id, 1)) e.preventDefault();
    } else if (e.key === "ArrowUp" && atStart) {
      if (moveFocus(id, -1)) e.preventDefault();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const lvl = Math.min(4, Math.max(0, (block.level ?? 0) + (e.shiftKey ? -1 : 1)));
      patchBlock(id, { level: lvl });
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && block.type === "todo") {
      e.preventDefault();
      patchBlock(id, { checked: !block.checked });
    }
  }, [blocks, slash, selectAll, commit, focusBlock, insertAfter, deleteBlock, turnInto, moveFocus, patchBlock, wrapSelection, linkWrap]);

  const handlePaste = useCallback((id: string, e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const raw = e.clipboardData.getData("text/plain");
    if (!raw) return;
    const text = raw.replace(/\r\n?/g, "\n");
    const block = blocks.find((b) => b.id === id);
    const isList = !!block && (block.type === "bullet" || block.type === "numbered" || block.type === "todo");

    // Structured paste: a full fenced code block becomes a code block.
    const fence = detectFencedCode(text);
    if (fence) {
      e.preventDefault();
      morphBlock(id, "code", { seed: { language: fence.language, text: fence.code }, focus: "start" });
      return;
    }
    // Structured paste: Markdown table rows become a real table block.
    const table = detectTable(text);
    if (table) {
      e.preventDefault();
      morphBlock(id, "table", { seed: { text: "", table }, focus: "start" });
      return;
    }
    // Bare URL: convert to bookmark — but NEVER destroy a list item.
    // Lists keep their marker and hold the URL as link text instead.
    const { bookmark, suggest } = decorateUrlPaste(text, settings.smartUrl);
    const url = text.trim();
    if (bookmark && !isList) {
      e.preventDefault();
      morphBlock(id, "bookmark", { seed: { text: domainOf(url), url }, focus: "start" });
    } else if (bookmark && isList) {
      e.preventDefault();
      patchBlock(id, { text: url });
      if (settings.smartUrl === "ask") setSuggestUrl({ blockId: id, url });
    } else if (suggest) {
      setSuggestUrl({ blockId: id, url });
    }
  }, [blocks, morphBlock, patchBlock, settings.smartUrl]);

  const widthCls = settings.editorWidth === "narrow" ? "max-w-[620px]" : settings.editorWidth === "wide" ? "max-w-[900px]" : "max-w-[760px]";

  return (
    <div
      className={cn("mx-auto w-full px-8 pb-32 pt-10", widthCls)}
      style={{ fontSize: settings.fontSize, lineHeight: settings.lineHeight }}
      onMouseDown={() => { if (selectAll) setSelectAll(false); }}
    >
      <input
        value={title}
        spellCheck={settings.spellcheck}
        onChange={(e) => commit(e.target.value, blocks)}
        placeholder="Untitled"
        className="mb-4 w-full bg-transparent text-[2rem] font-bold tracking-tight outline-none placeholder:text-muted-foreground/40"
      />
      {blocks.map((b, idx) => (
        <div
          key={b.id}
          className={cn("group relative", selectAll && "rounded-md bg-primary/[0.07] ring-1 ring-inset ring-primary/20")}
          onMouseEnter={() => setHover(b.id)}
          onMouseLeave={() => setHover((h) => (h === b.id ? null : h))}
        >
          {/* Gutter controls */}
          <div className={cn("absolute -left-12 top-1 flex items-center gap-0.5 transition-opacity", hover === b.id ? "opacity-100" : "opacity-0")}>
            <button
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Add block below"
              onClick={() => insertAfter(b.id, () => emptyBlock())}
            ><Plus className="h-3.5 w-3.5" /></button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground" title="Block menu">
                  <GripVertical className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" collisionPadding={8} className="w-52 max-h-[min(22rem,calc(100vh-4rem))] overflow-y-auto">
                <DropdownMenuLabel>Turn into</DropdownMenuLabel>
                {(["paragraph", "h1", "h2", "h3", "bullet", "numbered", "todo", "quote", "callout", "code", "divider", "table"] as BlockType[]).map((t) => (
                  <DropdownMenuItem key={t} onSelect={() => turnInto(b.id, t)}>
                    <BlockGlyph type={t} /> <span className="capitalize">{t === "paragraph" ? "Text" : t}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => insertAfter(b.id, () => ({ ...emptyBlock(b.type), text: b.text, table: b.table }))}>
                  <CopyPlus className="h-4 w-4" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => {
                  const i = blocks.findIndex((x) => x.id === b.id);
                  if (i > 0) {
                    const next = [...blocks];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    commit(title, next);
                  }
                }}><ArrowUp className="h-4 w-4" /> Move up</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => {
                  const i = blocks.findIndex((x) => x.id === b.id);
                  if (i < blocks.length - 1) {
                    const next = [...blocks];
                    [next[i + 1], next[i]] = [next[i], next[i + 1]];
                    commit(title, next);
                  }
                }}><ArrowDown className="h-4 w-4" /> Move down</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => deleteBlock(b.id)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Block body */}
          <div className="py-[3px]" style={b.level ? { paddingLeft: b.level * 24 } : undefined}>
            {(b.type === "paragraph" || b.type === "h1" || b.type === "h2" || b.type === "h3" ||
              b.type === "h4" || b.type === "h5" || b.type === "h6") && (
              <AutoText
                value={b.text} placeholder={PLACEHOLDER[b.type]}
                spellcheck={settings.spellcheck}
                blockRef={(el) => { if (el) refs.current.set(b.id, el); else refs.current.delete(b.id); }}
                onChange={(v) => handleTextChange(b.id, v)}
                onKeyDown={(e) => handleKey(b.id, e)}
                onPaste={(e) => handlePaste(b.id, e)}
                className={HEADING_CLS[b.type]}
              />
            )}
            {(b.type === "bullet" || b.type === "numbered") && (
              <div className="flex gap-2">
                <span className="mt-[1px] w-5 shrink-0 select-none text-right text-muted-foreground">
                  {b.type === "bullet" ? "•" : `${idx + 1}.`}
                </span>
                <AutoText value={b.text} placeholder={PLACEHOLDER[b.type]} spellcheck={settings.spellcheck}
                  blockRef={(el) => { if (el) refs.current.set(b.id, el); else refs.current.delete(b.id); }}
                  onChange={(v) => handleTextChange(b.id, v)} onKeyDown={(e) => handleKey(b.id, e)} onPaste={(e) => handlePaste(b.id, e)} />
              </div>
            )}
            {b.type === "todo" && (
              <div className="flex items-start gap-2.5">
                <Checkbox checked={!!b.checked} onCheckedChange={(c) => patchBlock(b.id, { checked: c === true })}
                  className="mt-[3px]" />
                <AutoText value={b.text} placeholder="Todo" spellcheck={settings.spellcheck}
                  blockRef={(el) => { if (el) refs.current.set(b.id, el); else refs.current.delete(b.id); }}
                  onChange={(v) => handleTextChange(b.id, v)} onKeyDown={(e) => handleKey(b.id, e)} onPaste={(e) => handlePaste(b.id, e)}
                  className={cn(b.checked && "text-muted-foreground line-through")} />
              </div>
            )}
            {b.type === "quote" && (
              <div className="border-l-[3px] border-primary/50 pl-3.5">
                <AutoText value={b.text} placeholder="Quote" spellcheck={settings.spellcheck}
                  blockRef={(el) => { if (el) refs.current.set(b.id, el); else refs.current.delete(b.id); }}
                  onChange={(v) => handleTextChange(b.id, v)} onKeyDown={(e) => handleKey(b.id, e)} onPaste={(e) => handlePaste(b.id, e)}
                  className="italic text-foreground/90" />
              </div>
            )}
            {b.type === "callout" && (
              <div className="rounded-lg border bg-muted/50 px-3.5 py-2.5">
                <AutoText value={b.text} placeholder="Callout…" spellcheck={settings.spellcheck}
                  blockRef={(el) => { if (el) refs.current.set(b.id, el); else refs.current.delete(b.id); }}
                  onChange={(v) => handleTextChange(b.id, v)} onKeyDown={(e) => handleKey(b.id, e)} onPaste={(e) => handlePaste(b.id, e)} />
              </div>
            )}
            {b.type === "divider" && (
              <div className="flex items-center gap-2 py-2">
                <div className="h-px flex-1 bg-border" />
                <button className="rounded p-1 text-muted-foreground opacity-0 hover:bg-accent group-hover:opacity-100"
                  onClick={() => turnInto(b.id, "paragraph")} title="Turn into text"><Plus className="h-3 w-3" /></button>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            {b.type === "code" && (
              <CodeBlock block={b} showNumbers={settings.showLineNumbers} defaultSize={settings.codeFontSize} onPatch={(p) => patchBlock(b.id, p)} />
            )}
            {b.type === "html" && (
              <div className="overflow-hidden rounded-lg border">
                <div className="border-b border-border/60 bg-muted/50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">HTML · sandboxed preview</div>
                <AutoText value={b.text} mono spellcheck={false} onChange={(v) => patchBlock(b.id, { text: v })}
                  onKeyDown={(e) => handleKey(b.id, e)} className="px-3 py-2" />
                <iframe title="html-preview" sandbox="" srcDoc={b.text}
                  className="min-h-[80px] w-full border-t border-border/60 bg-background" />
              </div>
            )}
            {b.type === "table" && <TableBlock block={b} onPatch={(p) => patchBlock(b.id, p)} />}
            {b.type === "bookmark" && (
              <div className="group/bm flex items-center gap-1.5">
                {editingBookmark === b.id ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-ring px-2.5 py-1">
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <input
                      autoFocus
                      value={b.url ?? ""}
                      onChange={(e) => patchBlock(b.id, { url: e.target.value })}
                      onBlur={() => setEditingBookmark(null)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur();
                      }}
                      placeholder="https://…"
                      className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => b.url && void openExternal(b.url)}
                    title={b.url}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-[5px] text-left text-[13px] transition-colors hover:bg-accent/70"
                  >
                    <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{b.text || domainOf(b.url ?? "")}</span>
                      <span className="text-muted-foreground"> · {domainOf(b.url ?? "")}</span>
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                )}
                <button
                  onClick={() => setEditingBookmark(editingBookmark === b.id ? null : b.id)}
                  title="Edit link"
                  className="rounded p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover/bm:opacity-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {b.type === "image" && (
              <div className="overflow-hidden rounded-lg border">
                <input value={b.url ?? ""} onChange={(e) => patchBlock(b.id, { url: e.target.value })}
                  placeholder="Paste image URL…"
                  className="w-full border-b border-border bg-muted/40 px-3 py-1.5 text-xs outline-none" />
                {b.url ? <img src={b.url} alt={b.text} className="max-h-[480px] w-full object-contain bg-muted/30" /> : (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <ImageIcon className="h-4 w-4" /> Add an image URL above
                  </div>
                )}
              </div>
            )}
            {/* Read-only inline preview for links inside plain text is handled at export; editing stays Markdown. */}
            {(b.type === "paragraph") && b.text.includes("](") && (
              <div className="prose-sm mt-0.5 text-[0.85em] text-muted-foreground" dangerouslySetInnerHTML={{ __html: renderInline(b.text) }} />
            )}
          </div>

          {/* Slash popup — opens upward when the block sits near the viewport bottom */}
          {slash?.blockId === b.id && (() => {
            const rect = refs.current.get(b.id)?.getBoundingClientRect();
            const openUp = rect ? window.innerHeight - rect.bottom < 380 : false;
            return (
              <div className={cn("absolute left-0 z-30", openUp ? "bottom-full mb-1" : "top-full mt-1")}>
                <SlashMenu query={slash.query} onPick={(i) => applySlash(b.id, i)} onClose={() => setSlash(null)} />
              </div>
            );
          })()}
          {/* Smart-URL suggestion */}
          {suggestUrl?.blockId === b.id && (
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-xs">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 truncate">Convert to bookmark for <strong>{domainOf(suggestUrl.url)}</strong>?</span>
              <Button size="sm" variant="secondary" className="h-6 text-xs"
                onClick={() => { patchBlock(b.id, { type: "bookmark", text: domainOf(suggestUrl.url), url: suggestUrl.url }); setSuggestUrl(null); }}>
                Bookmark
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setSuggestUrl(null)}>Keep plain</Button>
            </div>
          )}
        </div>
      ))}
      {settings.showAddBlock && (
        <div className="group/add mt-3 flex items-center gap-1">
          <button
            onClick={() => insertAfter(blocks[blocks.length - 1]?.id ?? "", () => emptyBlock())}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          ><Plus className="h-4 w-4" /> Add block <kbd className="rounded bg-muted px-1 font-mono text-[10px]">/</kbd></button>
          <button
            onClick={onToggleAddBlock}
            title="Hide this hint (re-enable in Settings → Editor)"
            className="rounded p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover/add:opacity-100"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {/*
       * Trailing dead zone: the remaining page height is clickable writing
       * space. Guards: left button only, no modifiers (selection/shortcut
       * clicks pass through), drags (text-selection gestures) are ignored via
       * the movement threshold, and a first click while the whole page is
       * selected only clears the selection instead of appending.
       */}
      <div
        className="min-h-[38vh] cursor-text"
        onMouseDown={(e) => {
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
          deadDown.current = { x: e.clientX, y: e.clientY, hadSelection: selectAll };
        }}
        onClick={(e) => {
          const d = deadDown.current;
          deadDown.current = null;
          if (!d || d.hadSelection) return;
          if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return;
          appendAtEnd();
        }}
      />
    </div>
  );
}

export { SLASH_ITEMS };
