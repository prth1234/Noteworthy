export type BlockType =
  | "paragraph"
  | "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  | "bullet" | "numbered" | "todo"
  | "quote" | "callout" | "divider"
  | "code" | "html" | "table" | "bookmark" | "image";

export interface TableCell { value: string }
export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface Block {
  id: string;
  type: BlockType;
  text: string;
  language?: string;
  checked?: boolean;
  level?: number;
  /** Code blocks: soft-wrap long lines (default false = horizontal scroll). */
  wrap?: boolean;
  /** Code blocks: per-block font-size override (falls back to settings). */
  codeSize?: number;
  table?: TableData;
  url?: string;
}

export interface Note {
  id: string;
  title: string;
  blocks: Block[];
  tags: string[];
  favorite: boolean;
  /** Per-note icon override (registry id or emoji id); null = app default. */
  icon: string | null;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Folder { id: string; name: string }

export type SmartUrlMode = "ask" | "plain" | "link" | "bookmark" | "off";

export interface Settings {
  theme: string;
  font: string;
  fontSize: number;
  lineHeight: number;
  editorWidth: "narrow" | "comfortable" | "wide";
  smartUrl: SmartUrlMode;
  spellcheck: boolean;
  showLineNumbers: boolean;
  codeFontSize: number;
  sidebarDensity: "compact" | "comfortable" | "spacious";
  showAddBlock: boolean;
  noteIcon: string;
  favIcon: string;
  iconPlacement: "tabs" | "sidebar" | "both";
  globalShortcut: string;
  globalShortcutEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "light-graphite",
  font: "System (SF Pro)",
  fontSize: 15,
  lineHeight: 1.65,
  editorWidth: "comfortable",
  smartUrl: "ask",
  spellcheck: true,
  showLineNumbers: false,
  codeFontSize: 12,
  sidebarDensity: "compact",
  showAddBlock: true,
  noteIcon: "apps",
  favIcon: "heart",
  iconPlacement: "tabs",
  globalShortcut: "Cmd+H",
  globalShortcutEnabled: true,
};
