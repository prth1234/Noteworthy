import { useMemo, useState } from "react";
import {
  ChevronsLeft, Heart, Plus, Search, Settings as SettingsIcon,
  Trash2, MoreHorizontal, RotateCcw, Check,
} from "lucide-react";
import { NOTE_ICONS, NoteIcon, FavIcon, sidebarIconId } from "@/lib/noteIcons";
import { RiAppsLine } from "react-icons/ri";
import { GoDot } from "react-icons/go";
import type { Note, Settings } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Separator } from "./ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from "./ui/context-menu";

interface Props {
  notes: Note[];
  activeId: string | null;
  collapsed: boolean;
  onToggle: () => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onFavorite: (id: string) => void;
  onSearch: () => void;
  onSettings: () => void;
  width: number;
  onWidth: (w: number) => void;
  density: Settings["sidebarDensity"];
  noteIconDefault: string;
  iconPlacement: Settings["iconPlacement"];
  favIconId: string;
  onSetIcon: (id: string, icon: string | null) => void;
  onSetDefaultIcon: (icon: string) => void;
}

const DENSITY_ROW: Record<Settings["sidebarDensity"], string> = {
  compact: "px-2 py-1 text-[12.5px]",
  comfortable: "px-2 py-[7px] text-[13px]",
  spacious: "px-2 py-2.5 text-sm",
};

export function Sidebar(p: Props) {
  const [section, setSection] = useState<"all" | "favs" | "recent">("all");
  const [customFor, setCustomFor] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  // Which row's ··· menu is open — its trigger stays visible while open.
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const list = useMemo(() => {
    // Chronological: oldest first — brand-new notes land at the bottom.
    let ns = [...p.notes].sort((a, b) => a.updatedAt - b.updatedAt);
    if (section === "favs") ns = ns.filter((n) => n.favorite);
    if (section === "recent") ns = [...ns].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12);
    return ns;
  }, [p.notes, section]);

  if (p.collapsed) {
    return (
      <div className="app-sidebar flex h-full w-12 flex-col items-center gap-1 border-r border-border py-2">
        <TooltipProvider>
          <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={p.onToggle}><RiAppsLine className="h-4 w-4" /></Button>
          </TooltipTrigger><TooltipContent side="right">Show sidebar (⌘ \)</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={p.onNew}><Plus className="h-4 w-4" /></Button>
          </TooltipTrigger><TooltipContent side="right">New note (⌘ N)</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={p.onSearch}><Search className="h-4 w-4" /></Button>
          </TooltipTrigger><TooltipContent side="right">Search (⌘ K)</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 mt-auto" onClick={p.onSettings}><SettingsIcon className="h-4 w-4" /></Button>
          </TooltipTrigger><TooltipContent side="right">Settings</TooltipContent></Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="app-sidebar relative flex h-full shrink-0 flex-col border-r border-border" style={{ width: p.width }}>
      <div className="p-2 pb-1.5">
        <Button variant="outline" size="sm" className="h-7 w-full justify-start bg-transparent text-xs font-normal text-muted-foreground shadow-none" onClick={p.onSearch}>
          Search or ask… <kbd className="ml-auto rounded bg-muted px-1 font-mono text-[10px]">⌘K</kbd>
        </Button>
      </div>
      <div className="flex items-center gap-1 px-2 pb-1.5">
        <Tooltip><TooltipTrigger asChild>
          <Button variant={section === "all" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setSection("all")} aria-label="All notes">
            <RiAppsLine className="h-4 w-4" />
          </Button>
        </TooltipTrigger><TooltipContent side="bottom">All notes</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild>
          <Button variant={section === "favs" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setSection("favs")} aria-label="Favorites">
            <FavIcon id={p.favIconId} className="h-4 w-4" />
          </Button>
        </TooltipTrigger><TooltipContent side="bottom">Favorites</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={p.onSearch} aria-label="Add note">
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger><TooltipContent side="bottom">New / open note (⌘ K)</TooltipContent></Tooltip>
        <div className="flex-1" />
        <Tooltip><TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={p.onToggle} aria-label="Hide sidebar">
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        </TooltipTrigger><TooltipContent side="bottom">Hide sidebar (⌘ \)</TooltipContent></Tooltip>
      </div>
      <Separator />
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {list.length === 0 ? (
          <div className="flex flex-col items-center px-3 py-10 text-center">
            <NoteIcon id={p.noteIconDefault} className="mb-3 h-7 w-7 text-muted-foreground/50" />
            <Button size="sm" onClick={p.onNew}><Plus className="h-3.5 w-3.5" /> New note</Button>
          </div>
        ) : (
          list.map((n) => (
            <ContextMenu key={n.id}>
              <ContextMenuTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => p.onOpen(n.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") p.onOpen(n.id); }}
                  className={cn(
                    "group flex w-full cursor-pointer items-center gap-2 rounded-md text-left transition-colors",
                    DENSITY_ROW[p.density],
                    p.activeId === n.id ? "bg-accent font-medium text-accent-foreground" : "text-foreground/85 hover:bg-accent/50",
                  )}
                >
                  {(() => {
                    const iconId = sidebarIconId(n.icon, p.noteIconDefault, p.iconPlacement);
                    return iconId ? (
                      <NoteIcon id={iconId} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <GoDot className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    );
                  })()}
                  <span className="min-w-0 flex-1 truncate">{n.title || "Untitled"}</span>
                  {/*
                   * Per-button visibility, shared reserved space (no height shift):
                   * fav star is always on for favorites; ··· is hover-only
                   * (or while its menu is open). Non-favs reveal both on hover.
                   */}
                  <span
                    className="ml-auto flex shrink-0 items-center gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => p.onFavorite(n.id)}
                      title={n.favorite ? "Remove from favorites" : "Add to favorites"}
                      className={cn(
                        "flex h-[22px] w-[22px] items-center justify-center rounded transition-colors hover:bg-accent",
                        !n.favorite && "invisible group-hover:visible",
                      )}
                    >
                      <FavIcon
                        id={p.favIconId}
                        className={cn("h-3.5 w-3.5", n.favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground")}
                      />
                    </button>
                    <DropdownMenu open={menuFor === n.id} onOpenChange={(v) => setMenuFor(v ? n.id : null)}>
                      <DropdownMenuTrigger asChild>
                        <button
                          title="Note options"
                          className={cn(
                            "flex h-[22px] w-[22px] items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                            menuFor !== n.id && "invisible group-hover:visible",
                          )}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="bottom" align="end" collisionPadding={8} sideOffset={4} className="w-[248px] p-2">
                        <DropdownMenuLabel>Note icon</DropdownMenuLabel>
                        <div className="grid grid-cols-7 gap-1">
                          {NOTE_ICONS.map((o) => (
                            <button
                              key={o.id}
                              title={o.label}
                              onClick={() => p.onSetIcon(n.id, o.id)}
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                                n.icon === o.id ? "border-primary bg-accent" : "border-transparent hover:bg-accent",
                              )}
                            >
                              <NoteIcon id={o.id} className="h-4 w-4 text-foreground" />
                            </button>
                          ))}
                        </div>
                        <div
                          className="flex items-center gap-1.5 px-1.5 py-1.5"
                          onKeyDown={(e) => { if (e.key !== "Escape" && e.key !== "Tab") e.stopPropagation(); }}
                        >
                          <input
                            value={customFor === n.id ? customText : ""}
                            onChange={(e) => { setCustomFor(n.id); setCustomText(e.target.value); }}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter" && customText.trim()) {
                                p.onSetIcon(n.id, customText.trim());
                                setCustomText("");
                              }
                            }}
                            placeholder="Or paste any emoji…"
                            maxLength={8}
                            aria-label="Custom emoji"
                            className="h-7 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-[13px] outline-none placeholder:text-muted-foreground/60"
                          />
                          <Button
                            size="sm"
                            className="h-7 shrink-0"
                            disabled={!customText.trim()}
                            onClick={() => { p.onSetIcon(n.id, customText.trim()); setCustomText(""); }}
                          >
                            Use
                          </Button>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => p.onSetIcon(n.id, null)}>
                          <RotateCcw className="h-4 w-4" /> Use app default
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => n.icon && p.onSetDefaultIcon(n.icon)} disabled={!n.icon}>
                          <Check className="h-4 w-4" /> Set current as app default
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          onSelect={() => p.onDelete(n.id)}
                        >
                          <Trash2 className="h-4 w-4" /> Delete note
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48">
                <ContextMenuItem onSelect={() => p.onOpen(n.id)}>Open</ContextMenuItem>
                <ContextMenuItem onSelect={() => p.onFavorite(n.id)}>
                  {n.favorite ? "Remove from favorites" : "Add to favorites"}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => p.onDelete(n.id)}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))
        )}
      </div>
      <Separator />
      <div className="flex items-center gap-1 p-2">
        <Tooltip><TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={p.onSettings} aria-label="Settings">
            <SettingsIcon className="h-4 w-4" />
          </Button>
        </TooltipTrigger><TooltipContent side="top">Settings (⌘ ,)</TooltipContent></Tooltip>
        {p.width < 232 ? (
          <span
            title={`${p.notes.length} notes · local`}
            className="ml-auto shrink-0 rounded-md bg-muted px-1.5 py-1 font-mono text-[10px] text-muted-foreground"
          >
            {p.notes.length}
          </span>
        ) : (
          <span className="ml-auto whitespace-nowrap px-1 text-[10px] text-muted-foreground">{p.notes.length} notes · local</span>
        )}      </div>
      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/30"
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX, startW = p.width;
          const move = (ev: MouseEvent) => p.onWidth(Math.min(360, Math.max(180, startW + ev.clientX - startX)));
          const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", up);
        }}
      />
    </div>
  );
}
