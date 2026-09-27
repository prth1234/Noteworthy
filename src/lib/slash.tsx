import { useEffect, useMemo, useState } from "react";
import type { Block } from "./types";

/** Slash-menu catalog — mirrors the Notion-style grouping from the spec. */
export interface SlashItem {
  id: string;
  title: string;
  hint: string;
  keywords: string;
  group: "Suggested" | "Basic blocks" | "Lists" | "Code" | "Content" | "Productivity";
  make: () => Partial<Block> & { type: Block["type"] };
}

export const SLASH_ITEMS: SlashItem[] = [
  { id: "html", title: "HTML", hint: "Embeds", keywords: "html embed iframe", group: "Suggested", make: () => ({ type: "html", text: "<div>\n  \n</div>" }) },
  { id: "code", title: "Code", hint: "```", keywords: "code block snippet pre", group: "Suggested", make: () => ({ type: "code", text: "", language: "typescript" }) },
  { id: "h2", title: "Heading 2", hint: "##", keywords: "h2 heading title subtitle", group: "Suggested", make: () => ({ type: "h2", text: "" }) },
  { id: "text", title: "Text", hint: "", keywords: "text paragraph plain", group: "Basic blocks", make: () => ({ type: "paragraph", text: "" }) },
  { id: "h1", title: "Heading 1", hint: "#", keywords: "h1 heading title", group: "Basic blocks", make: () => ({ type: "h1", text: "" }) },
  { id: "h2b", title: "Heading 2", hint: "##", keywords: "h2 heading", group: "Basic blocks", make: () => ({ type: "h2", text: "" }) },
  { id: "h3", title: "Heading 3", hint: "###", keywords: "h3 heading", group: "Basic blocks", make: () => ({ type: "h3", text: "" }) },
  { id: "h4", title: "Heading 4", hint: "####", keywords: "h4 heading", group: "Basic blocks", make: () => ({ type: "h4", text: "" }) },
  { id: "h5", title: "Heading 5", hint: "#####", keywords: "h5 heading", group: "Basic blocks", make: () => ({ type: "h5", text: "" }) },
  { id: "h6", title: "Heading 6", hint: "######", keywords: "h6 heading", group: "Basic blocks", make: () => ({ type: "h6", text: "" }) },
  { id: "quote", title: "Quote", hint: ">", keywords: "quote cite", group: "Basic blocks", make: () => ({ type: "quote", text: "" }) },
  { id: "callout", title: "Callout", hint: "", keywords: "callout note info warning", group: "Basic blocks", make: () => ({ type: "callout", text: "" }) },
  { id: "divider", title: "Divider", hint: "---", keywords: "divider separator hr", group: "Basic blocks", make: () => ({ type: "divider", text: "" }) },
  { id: "bullet", title: "Bulleted list", hint: "-", keywords: "bullet ul list", group: "Lists", make: () => ({ type: "bullet", text: "" }) },
  { id: "numbered", title: "Numbered list", hint: "1.", keywords: "numbered ol list ordered", group: "Lists", make: () => ({ type: "numbered", text: "" }) },
  { id: "todo", title: "Todo", hint: "[]", keywords: "todo task checkbox checklist", group: "Lists", make: () => ({ type: "todo", text: "", checked: false }) },
  { id: "code-ts", title: "Code · TypeScript", hint: "", keywords: "typescript ts code", group: "Code", make: () => ({ type: "code", text: "", language: "typescript" }) },
  { id: "code-py", title: "Code · Python", hint: "", keywords: "python py code", group: "Code", make: () => ({ type: "code", text: "", language: "python" }) },
  { id: "code-sh", title: "Code · Shell", hint: "", keywords: "shell bash terminal sh code", group: "Code", make: () => ({ type: "code", text: "", language: "bash" }) },
  { id: "code-sql", title: "Code · SQL", hint: "", keywords: "sql database code", group: "Code", make: () => ({ type: "code", text: "", language: "sql" }) },
  { id: "code-json", title: "Code · JSON", hint: "", keywords: "json code", group: "Code", make: () => ({ type: "code", text: "{\n  \n}", language: "json" }) },
  { id: "inline-code", title: "Inline code", hint: "`", keywords: "inline code", group: "Code", make: () => ({ type: "paragraph", text: "`code`" }) },
  { id: "table", title: "Table", hint: "", keywords: "table grid spreadsheet", group: "Content", make: () => ({ type: "table", text: "", table: { headers: ["Name", "Value"], rows: [["", ""]] } }) },
  { id: "bookmark", title: "Bookmark", hint: "", keywords: "bookmark link url web", group: "Content", make: () => ({ type: "bookmark", text: "", url: "https://" }) },
  { id: "image", title: "Image", hint: "", keywords: "image picture photo", group: "Content", make: () => ({ type: "image", text: "", url: "https://" }) },
  { id: "date", title: "Date", hint: "", keywords: "date today time", group: "Productivity", make: () => ({ type: "paragraph", text: new Date().toLocaleDateString() }) },
  { id: "tag", title: "Tag", hint: "#tag", keywords: "tag label", group: "Productivity", make: () => ({ type: "paragraph", text: "#tag " }) },
];

export function filterSlash(q: string): SlashItem[] {
  const query = q.replace(/^\//, "").toLowerCase();
  if (!query) return SLASH_ITEMS;
  // h1/h2 shorthand should match even though keywords use "h1 heading"
  return SLASH_ITEMS.filter((i) =>
    `${i.title} ${i.keywords} ${i.hint}`.toLowerCase().includes(query),
  );
}

export function useFilteredSlash(query: string) {
  return useMemo(() => filterSlash(query), [query]);
}

/** Tiny reusable hook: close on Escape / click-outside for slash + palette. */
export function useDismiss(onClose: () => void) {
  const [ref, setRef] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onClick = (e: MouseEvent) => {
      if (ref && !ref.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [onClose, ref]);
  return setRef;
}
