import { useEffect, useMemo, useState } from "react";
import { FilePlus, Star } from "lucide-react";
import { NoteIcon, tabIconId, type IconPlacement } from "@/lib/noteIcons";
import type { Note } from "@/lib/types";
import { fuzzyMatch } from "@/lib/utils";
import { Dialog, DialogContent } from "./ui/dialog";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";

interface Props {
  open: boolean;
  notes: Note[];
  noteIconDefault: string;
  iconPlacement: IconPlacement;
  onClose: () => void;
  onOpen: (id: string) => void;
  onNew: (title: string) => void;
}

export function SearchPalette({ open, notes, noteIconDefault, iconPlacement, onClose, onOpen, onNew }: Props) {
  const [q, setQ] = useState("");
  useEffect(() => { if (open) setQ(""); }, [open ]);

  // ⌘N anywhere in the palette creates the page instantly.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        e.stopPropagation();
        onNew(q);
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, q, onNew, onClose]);

  const results = useMemo(() => {
    const query = q.trim();
    if (!query) return notes.slice(0, 8).map((n) => ({ note: n, score: 0, snippet: "" }));
    const out: { note: Note; score: number; snippet: string }[] = [];
    for (const n of notes) {
      const titleHit = fuzzyMatch(n.title, query);
      const tagHit = n.tags.some((t) => fuzzyMatch(t, query));
      const body = n.blocks.map((b) => b.text).join(" ");
      const li = body.toLowerCase().indexOf(query.toLowerCase());
      if (titleHit || tagHit || li >= 0) {
        const snippet = li >= 0 ? body.slice(Math.max(0, li - 40), li + 90).trim() : "";
        out.push({ note: n, score: (n.title.toLowerCase().startsWith(query.toLowerCase()) ? 0 : titleHit ? 1 : 2), snippet });
      }
      if (out.length >= 30) break;
    }
    return out.sort((a, b) => a.score - b.score);
  }, [notes, q]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="top-[20%] max-w-xl translate-x-[-50%] translate-y-0 gap-0 overflow-hidden p-0 fade-enter" aria-label="Search notes">
        <Command label="Search notes" shouldFilter={false}>
          <CommandInput value={q} onValueChange={setQ} placeholder="Search titles, content, tags…" />
          <CommandList className="min-h-[220px]">
            <CommandGroup heading="Create">
              <CommandItem
                value="__new-page"
                onSelect={() => { onNew(q); onClose(); }}
                className="gap-2.5 px-3 py-2"
              >
                <FilePlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="font-medium">
                  {q.trim() ? <>New page <span className="font-normal text-muted-foreground">“{q.trim()}”</span></> : "New page"}
                </span>
                <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">↵</kbd>
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading={q ? `Results (${results.length})` : "Recent"}>
              {results.map(({ note, snippet }) => (
                <CommandItem key={note.id} value={note.id}
                  onSelect={() => { onOpen(note.id); onClose(); }}
                  className="gap-2.5 px-3 py-2"
                >
                  <NoteIcon id={tabIconId(note.icon, noteIconDefault, iconPlacement)} className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{note.title || "Untitled"}</span>
                      {note.favorite && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
                    </span>
                    {snippet && <span className="block truncate text-xs text-muted-foreground">{snippet}</span>}
                  </span>
                  {note.tags.slice(0, 2).map((t) => (
                    <span key={t} className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">#{t}</span>
                  ))}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="flex items-center gap-3 border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
            <span><kbd className="rounded bg-muted px-1 font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="rounded bg-muted px-1 font-mono">↵</kbd> open</span>
            <span><kbd className="rounded bg-muted px-1 font-mono">⌘N</kbd> new page</span>
            <span><kbd className="rounded bg-muted px-1 font-mono">esc</kbd> close</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
