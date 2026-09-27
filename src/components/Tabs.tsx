import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { NoteIcon } from "@/lib/noteIcons";
import { cn } from "@/lib/utils";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from "./ui/context-menu";

interface Props {
  tabs: { id: string; title: string; icon: string }[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onCloseOthers: (id: string) => void;
  onCloseRight: (id: string) => void;
  onCloseAll: () => void;
  onNew: () => void;
}

/**
 * Notion-style tab strip: borderless, compact (h-7), lives in the overlay
 * titlebar next to the traffic lights. The + button lives in the titlebar
 * itself (App), not here — but the prop stays for context-menu actions.
 */
export function Tabs(p: Props) {
  const activeRef = useRef<HTMLDivElement | null>(null);
  // Keep the active tab in view as tabs overflow; block:"nearest" avoids
  // ever scrolling the page itself.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [p.activeId, p.tabs.length]);
  return (
    <div
      data-tauri-drag-region
      className="no-scrollbar flex h-full min-w-0 flex-1 items-center gap-0.5 overflow-x-auto"
      role="tablist"
      aria-label="Open notes"
    >
      {p.tabs.map((t) => {
        const active = t.id === p.activeId;
        return (
          <ContextMenu key={t.id}>
            <ContextMenuTrigger asChild>
              <div
                role="tab"
                aria-selected={active}
                ref={active ? activeRef : undefined}
                onClick={() => p.onSelect(t.id)}
                onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); p.onClose(t.id); } }}
                className={cn(
                  "group flex h-6 max-w-[180px] min-w-[100px] shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs transition-colors",
                  active
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <NoteIcon id={t.icon} className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{t.title || "Untitled"}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); p.onClose(t.id); }}
                  className={cn("rounded p-0.5 hover:bg-accent", active ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover:opacity-70")}
                  title="Close tab (⌘ W)" aria-label={`Close ${t.title}`}
                ><X className="h-3.5 w-3.5" /></button>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
              <ContextMenuItem onSelect={() => p.onClose(t.id)}>Close</ContextMenuItem>
              <ContextMenuItem onSelect={() => p.onCloseOthers(t.id)}>Close others</ContextMenuItem>
              <ContextMenuItem onSelect={() => p.onCloseRight(t.id)}>Close to the right</ContextMenuItem>
              <ContextMenuItem onSelect={p.onCloseAll}>Close all</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={p.onNew}>New note</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
}
