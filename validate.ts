/* Headless validation: block model, markdown round-trip, slash filter, URLs. */
import { markdownShortcut, blocksToMarkdown, markdownToBlocks, renderInline, toggleWrap, isEffectivelyEmpty, detectFencedCode, detectTable } from "./src/lib/blocks";
import { filterSlash } from "./src/lib/slash";
import { decorateUrlPaste, domainOf, findUrls } from "./src/lib/urls";
import { THEMES } from "./src/lib/themes";
import { FONTS } from "./src/lib/fonts";
import { SHORTCUTS } from "./src/lib/shortcuts";
import type { Block } from "./src/lib/types";

let pass = 0, fail = 0;
function eq(name: string, a: unknown, b: unknown) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) pass++; else { fail++; console.error(`FAIL ${name}: got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); }
}

// 1. Markdown shortcuts
eq("h1", markdownShortcut("# Hello")?.type, "h1");
eq("h4", markdownShortcut("#### Deep")?.type, "h4");
eq("h4-rest", markdownShortcut("#### Deep")?.rest, "Deep");
eq("bullet-dash", markdownShortcut("- item")?.type, "bullet");
eq("bullet-star", markdownShortcut("* item")?.type, "bullet");
eq("numbered", markdownShortcut("1. first")?.type, "numbered");
eq("todo", markdownShortcut("- [ ] task")?.type, "todo");
eq("quote", markdownShortcut("> wise")?.type, "quote");
eq("code-lang", markdownShortcut("```python")?.extra?.language, "python");
eq("divider", markdownShortcut("---")?.type, "divider");
eq("plain-null", markdownShortcut("just text"), null);

// 2. Round-trip: blocks -> markdown -> blocks preserves meaning
const blocks: Block[] = [
  { id: "1", type: "h1", text: "Title" },
  { id: "2", type: "paragraph", text: "Hello **bold** and `code`" },
  { id: "3", type: "todo", text: "Buy milk", checked: false },
  { id: "4", type: "todo", text: "Done", checked: true },
  { id: "5", type: "bullet", text: "a" },
  { id: "6", type: "numbered", text: "one" },
  { id: "7", type: "quote", text: "wise words" },
  { id: "8", type: "code", text: "print(1)", language: "python" },
  { id: "9", type: "divider", text: "" },
  { id: "10", type: "table", text: "", table: { headers: ["A", "B"], rows: [["1", "2"]] } },
];
const md = blocksToMarkdown("Doc", blocks);
eq("export-has-title", md.startsWith("# Doc\n"), true);
const stored = blocksToMarkdown("Doc", blocks, false);
const back = markdownToBlocks(stored, "Doc");
eq("rt-length", back.length, blocks.length);
eq("rt-h1", [back[0].type, back[0].text], ["h1", "Title"]);
eq("rt-todo-unchecked", [back[2].type, back[2].checked], ["todo", false]);
eq("rt-todo-checked", [back[3].type, back[3].checked], ["todo", true]);
eq("rt-code", [back[7].type, back[7].language, back[7].text], ["code", "python", "print(1)"]);
eq("rt-table", [back[9].type, back[9].table?.headers, back[9].table?.rows], ["table", ["A", "B"], [["1", "2"]]]);
eq("rt-divider", back[8].type, "divider");

// Legacy body that still embeds the title must not duplicate it on load.
const legacy = markdownToBlocks("# Doc\n\n# Title", "Doc");
eq("legacy-strip", [legacy.length, legacy[0].type, legacy[0].text], [1, "h1", "Title"]);
const kept = markdownToBlocks("# Other\n\ntext", "Doc");
eq("title-kept-if-different", [kept.length, kept[0].text], [2, "Other"]);

// 3. Inline render escapes HTML but formats md
eq("inline-escape", renderInline("<script>").includes("&lt;script&gt;"), true);
eq("inline-bold", renderInline("a **b** c").includes("<strong>b</strong>"), true);
eq("inline-code", renderInline("a `b` c").includes("<code"), true);

// 4. Slash catalog
eq("slash-all", filterSlash("").length >= 20, true);
eq("slash-h1", filterSlash("/h1").some((i) => i.title === "Heading 1"), true);
eq("slash-h2", filterSlash("/H2").some((i) => i.title === "Heading 2"), true);
eq("slash-code", filterSlash("/code").length >= 3, true);
eq("slash-todo", filterSlash("/todo").some((i) => i.title === "Todo"), true);
eq("slash-table", filterSlash("/table").some((i) => i.title === "Table"), true);
eq("slash-html", filterSlash("/html").some((i) => i.title === "HTML"), true);

// 5. URLs
eq("find-urls", findUrls("see https://example.com/a and http://x.io"), ["https://example.com/a", "http://x.io"]);
eq("domain", domainOf("https://www.example.com/p?q=1"), "example.com");
eq("paste-ask", decorateUrlPaste("https://example.com", "ask"), { bookmark: false, suggest: true });
eq("paste-bookmark", decorateUrlPaste("https://example.com", "bookmark"), { bookmark: true, suggest: false });
eq("paste-off", decorateUrlPaste("https://example.com", "off"), { bookmark: false, suggest: false });
eq("paste-plain", decorateUrlPaste("https://example.com", "plain"), { bookmark: false, suggest: false });
eq("paste-nonurl", decorateUrlPaste("hello world", "ask"), { bookmark: false, suggest: false });

// 7. Wrap/unwrap formatting (powers ⌘B / ⌘I / ⌘E)
eq("wrap-sel", toggleWrap("hello world", 6, 11, "**"), { text: "hello **world**", start: 8, end: 13 });
eq("unwrap-sel", toggleWrap("hello **world**", 6, 15, "**"), { text: "hello world", start: 6, end: 11 });
eq("wrap-caret", toggleWrap("hi", 2, 2, "**"), { text: "hi****", start: 4, end: 4 });
eq("wrap-italic", toggleWrap("a b", 0, 1, "*"), { text: "*a* b", start: 1, end: 2 });
eq("wrap-code", toggleWrap("x = 1", 0, 5, "`"), { text: "`x = 1`", start: 1, end: 6 });

// 8. Settings defaults (incl. global quick-open)
import { DEFAULT_SETTINGS } from "./src/lib/types";
eq("global-default", DEFAULT_SETTINGS.globalShortcut, "Cmd+H");
eq("global-enabled", DEFAULT_SETTINGS.globalShortcutEnabled, true);
eq("density-default", DEFAULT_SETTINGS.sidebarDensity, "compact");
eq("code-size-default", DEFAULT_SETTINGS.codeFontSize, 12);

// 9. Untitled migration: empty bodies count as empty, content does not
eq("empty-blank", isEffectivelyEmpty(""), true);
eq("empty-markers", isEffectivelyEmpty("# \n\n- [ ] \n---\n"), true);
eq("empty-fence", isEffectivelyEmpty("```\n```"), true);
eq("nonempty-text", isEffectivelyEmpty("hello"), false);
eq("nonempty-todo", isEffectivelyEmpty("- [ ] buy milk"), false);

// 11. Junk-note predicate (cleanup job)
import { isJunkNote } from "./src/lib/blocks";
eq("junk-empty", isJunkNote("", ""), true);
eq("junk-untitled-markers", isJunkNote("Untitled", "# \n- [ ] \n"), true);
eq("junk-keeps-draft", isJunkNote("Ideas", ""), false);
eq("junk-keeps-content", isJunkNote("", "hello"), false);

// 12. Icon system (global defaults + per-note resolution)
import { NOTE_ICONS, FAV_ICONS, resolveNoteIcon, tabIconId, sidebarIconId } from "./src/lib/noteIcons";
eq("note-icons-count", NOTE_ICONS.length >= 20, true);
eq("fav-icons-count", FAV_ICONS.length >= 8, true);
eq("icon-default", DEFAULT_SETTINGS.noteIcon, "apps");
eq("fav-default", DEFAULT_SETTINGS.favIcon, "heart");
eq("resolve-override", resolveNoteIcon("fire", "squares"), "fire");
eq("resolve-default", resolveNoteIcon(null, "dot"), "dot");
eq("resolve-bad-fallback", resolveNoteIcon("nope", "alsono"), "apps");
eq("placement-default", DEFAULT_SETTINGS.iconPlacement, "tabs");
eq("place-tabs", tabIconId("fire", "dot", "tabs"), "fire");
eq("place-tabs-dot", sidebarIconId("fire", "dot", "tabs"), null);
eq("place-both", [tabIconId("fire", "dot", "both"), sidebarIconId("fire", "dot", "both")], ["fire", "fire"]);
eq("place-side-tabs", tabIconId("fire", "dot", "sidebar"), "dot");

// 10. Paste detectors (tables / fenced code)
eq("fence", detectFencedCode("```python\nprint(1)\n```"), { language: "python", code: "print(1)" });
eq("fence-notext", detectFencedCode("```\ncode\n```"), { language: "text", code: "code" });
eq("fence-crlf", detectFencedCode("```js\r\nlet x = 1;\r\n```"), { language: "js", code: "let x = 1;" });
eq("fence-inline-no", detectFencedCode("use `x` here"), null);
eq("fence-prose-no", detectFencedCode("hello\nworld"), null);
eq("table", detectTable("| A | B |\n| --- | --- |\n| 1 | 2 |"), { headers: ["A", "B"], rows: [["1", "2"]] });
eq("table-multi", detectTable("| A | B |\n|:---|---:|\n| 1 | 2 |\n| 3 | 4 |")?.rows.length, 2);
eq("table-prose-no", detectTable("a | b"), null);
eq("table-single-col-no", detectTable("| A |\n| --- |\n| 1 |"), null);

// 6. Content requirements (original suite)
eq("themes>=15", THEMES.length >= 15, true);
eq("fonts>=30", FONTS.length >= 30, true);
eq("default-theme", THEMES[0].id, "light-graphite");
eq("default-font", FONTS[0].name, "System (SF Pro)");
eq("shortcuts-h1", SHORTCUTS.some((s) => s.id === "h1"), true);
eq("shortcuts-all", SHORTCUTS.length >= 15, true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
