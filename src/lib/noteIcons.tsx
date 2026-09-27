import type { ComponentType } from "react";
import {
  FileText, StickyNote, NotebookPen, BookOpen, Layers, Hash,
  Sparkles, Zap, Rocket, Ghost, Crown, Gem, Coffee, Palette, Leaf,
  Star, Heart, Bookmark, Flame, ThumbsUp,
} from "lucide-react";
import { RiAppsLine } from "react-icons/ri";
import { GoDot } from "react-icons/go";
import { HiOutlineSquares2X2 } from "react-icons/hi2";
import { cn } from "./utils";

export interface IconOption {
  id: string;
  label: string;
  Icon?: ComponentType<{ className?: string }>;
  emoji?: string;
}

/** Page/note mark, user-swappable in Settings → Appearance. */
export const NOTE_ICONS: IconOption[] = [
  { id: "apps", label: "Grid", Icon: RiAppsLine },
  { id: "squares", label: "Squares", Icon: HiOutlineSquares2X2 },
  { id: "dot", label: "Dot", Icon: GoDot },
  { id: "file", label: "Document", Icon: FileText },
  { id: "sticky", label: "Sticky", Icon: StickyNote },
  { id: "pen", label: "Pen", Icon: NotebookPen },
  { id: "book", label: "Book", Icon: BookOpen },
  { id: "layers", label: "Layers", Icon: Layers },
  { id: "hash", label: "Hash", Icon: Hash },
  { id: "sparkles", label: "Sparkles", Icon: Sparkles },
  { id: "zap", label: "Zap", Icon: Zap },
  { id: "rocket", label: "Rocket", Icon: Rocket },
  { id: "ghost", label: "Ghost", Icon: Ghost },
  { id: "crown", label: "Crown", Icon: Crown },
  { id: "gem", label: "Gem", Icon: Gem },
  { id: "coffee", label: "Coffee", Icon: Coffee },
  { id: "palette", label: "Palette", Icon: Palette },
  { id: "leaf", label: "Leaf", Icon: Leaf },
  { id: "memo", label: "Memo", emoji: "📝" },
  { id: "e-sparkles", label: "Sparkles", emoji: "✨" },
  { id: "fire", label: "Fire", emoji: "🔥" },
  { id: "bulb", label: "Idea", emoji: "💡" },
  { id: "pin", label: "Pin", emoji: "📌" },
  { id: "target", label: "Target", emoji: "🎯" },
  { id: "e-rocket", label: "Rocket", emoji: "🚀" },
  { id: "moon", label: "Moon", emoji: "🌙" },
  { id: "brain", label: "Brain", emoji: "🧠" },
  { id: "books", label: "Books", emoji: "📚" },
];

/** Favorite mark, user-swappable in Settings → Appearance. */
export const FAV_ICONS: IconOption[] = [
  { id: "heart", label: "Heart", Icon: Heart },
  { id: "star", label: "Star", Icon: Star },
  { id: "bookmark", label: "Bookmark", Icon: Bookmark },
  { id: "flame", label: "Flame", Icon: Flame },
  { id: "thumbs", label: "Thumbs up", Icon: ThumbsUp },
  { id: "sparkles", label: "Sparkles", Icon: Sparkles },
  { id: "e-heart", label: "Heart", emoji: "❤️" },
  { id: "e-star", label: "Star", emoji: "⭐" },
  { id: "e-fire", label: "Fire", emoji: "🔥" },
  { id: "e-purple", label: "Purple heart", emoji: "💜" },
];

function isKnown(id: string): boolean {
  return NOTE_ICONS.some((o) => o.id === id);
}

const EMOJI_RE = /\p{Extended_Pictographic}/u;

/** Custom user-supplied emoji (stored raw, not in the registry). */
export function isCustomEmoji(id: string): boolean {
  return !isKnown(id) && EMOJI_RE.test(id);
}

function Glyph({ opt, className }: { opt: IconOption; className?: string }) {
  if (opt.emoji) {
    return (
      <span className={cn("inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[13px] leading-none", className)}>
        {opt.emoji}
      </span>
    );
  }
  const C = opt.Icon!;
  return <C className={className} />;
}

export function NoteIcon({ id, className }: { id?: string | null; className?: string }) {
  if (id && isCustomEmoji(id)) {
    return (
      <span className={cn("inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[13px] leading-none", className)}>
        {id}
      </span>
    );
  }
  const opt = NOTE_ICONS.find((o) => o.id === id) ?? NOTE_ICONS[0];
  return <Glyph opt={opt} className={className} />;
}

export function FavIcon({ id, className }: { id?: string; className?: string }) {
  const opt = FAV_ICONS.find((o) => o.id === id) ?? FAV_ICONS[0];
  return <Glyph opt={opt} className={className} />;
}

/** Where custom note icons appear. Default: tabs only, dots in the sidebar. */
export type IconPlacement = "tabs" | "sidebar" | "both";

/** Effective icon for a note: per-note override, else the app default. */
export function resolveNoteIcon(noteIcon: string | null | undefined, appDefault: string): string {
  if (noteIcon && (NOTE_ICONS.some((o) => o.id === noteIcon) || isCustomEmoji(noteIcon))) return noteIcon;
  if (NOTE_ICONS.some((o) => o.id === appDefault) || (appDefault && isCustomEmoji(appDefault))) return appDefault;
  return "apps";
}

function validDefault(appDefault: string): string {
  if (NOTE_ICONS.some((o) => o.id === appDefault) || (appDefault && isCustomEmoji(appDefault))) return appDefault;
  return "apps";
}

/** Icon id for a tab: the custom icon when placement includes tabs. */
export function tabIconId(noteIcon: string | null | undefined, appDefault: string, placement: IconPlacement): string {
  if (placement === "tabs" || placement === "both") return resolveNoteIcon(noteIcon, appDefault);
  return validDefault(appDefault);
}

/** Icon id for a sidebar row, or null for the classic dot. */
export function sidebarIconId(noteIcon: string | null | undefined, appDefault: string, placement: IconPlacement): string | null {
  if (placement === "sidebar" || placement === "both") return resolveNoteIcon(noteIcon, appDefault);
  return null;
}
