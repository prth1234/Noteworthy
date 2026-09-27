/** Canonical keyboard shortcuts (macOS conventions, ⌘-first). */
export interface Shortcut { id: string; label: string; keys: string; action: string }

export const SHORTCUTS: Shortcut[] = [
  { id: "new-note", label: "New note", keys: "⌘ N", action: "Create a new note" },
  { id: "settings", label: "Settings", keys: "⌘ ,", action: "Open settings" },
  { id: "search", label: "Search", keys: "⌘ K", action: "Open search / command palette" },
  { id: "sidebar", label: "Toggle sidebar", keys: "⌘ \\", action: "Show / hide sidebar" },
  { id: "slash", label: "Slash menu", keys: "/", action: "Insert any block" },
  { id: "select-all", label: "Select all", keys: "⌘ A ×2", action: "First the block, then the whole page" },
  { id: "h1", label: "Heading 1", keys: "⌘ ⌥ 1", action: "Turn block into H1" },
  { id: "h2", label: "Heading 2", keys: "⌘ ⌥ 2", action: "Turn block into H2" },
  { id: "h3", label: "Heading 3", keys: "⌘ ⌥ 3", action: "Turn block into H3" },
  { id: "h4", label: "Heading 4", keys: "⌘ ⌥ 4", action: "Turn block into H4" },
  { id: "bold", label: "Bold", keys: "⌘ B", action: "Wrap selection in **bold**" },
  { id: "italic", label: "Italic", keys: "⌘ I", action: "Wrap selection in *italic*" },
  { id: "inline-code", label: "Inline code", keys: "⌘ E", action: "Wrap selection in `code`" },
  { id: "code-block", label: "Code block", keys: "⌘ ⌥ C", action: "Turn block into code" },
  { id: "bullet", label: "Bulleted list", keys: "⌘ ⇧ 7", action: "Turn block into bullet" },
  { id: "numbered", label: "Numbered list", keys: "⌘ ⇧ 8", action: "Turn block into numbered list" },
  { id: "todo", label: "Todo", keys: "⌘ ⌥ T", action: "Turn block into todo" },
  { id: "quote", label: "Quote", keys: "⌘ ⌥ Q", action: "Turn block into quote" },
  { id: "link", label: "Link", keys: "⌘ ⇧ K", action: "Wrap selection as [text](url)" },
  { id: "delete-note", label: "Delete note", keys: "⌘ ⌫", action: "Delete the current note (outside text fields)" },
  { id: "quick-open", label: "Quick open (global)", keys: "⌘ H", action: "Open quick search from anywhere — configurable below" },
  { id: "next-tab", label: "Next tab", keys: "⌃ Tab", action: "Go to next open note" },
  { id: "prev-tab", label: "Previous tab", keys: "⌃ ⇧ Tab", action: "Go to previous open note" },
  { id: "close-tab", label: "Close tab", keys: "⌘ W", action: "Close current tab" },
];
