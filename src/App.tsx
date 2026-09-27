import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Plus, Search, Settings as SettingsIcon } from "lucide-react";
import { HiSquares2X2 } from "react-icons/hi2";
import { Toaster, toast } from "sonner";
import { useStore } from "@/lib/store";
import { blocksToMarkdown, isJunkNote } from "@/lib/blocks";
import { tabIconId } from "@/lib/noteIcons";
import { isTauri, openExternal } from "@/lib/utils";
import { FONTS, ensureFontLoaded } from "@/lib/fonts";
import { Editor } from "@/components/Editor";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/Sidebar";
import { Tabs } from "@/components/Tabs";
import { SearchPalette } from "@/components/SearchPalette";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Button } from "@/components/ui/button";

export default function App() {
  const store = useStore();
  const { activeNote, settings } = store;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(264);
  const [palette, setPalette] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Apply theme + font globally.
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);
  useEffect(() => {
    ensureFontLoaded(settings.font);
    const f = FONTS.find((x) => x.name === settings.font);
    if (f) document.body.style.fontFamily = f.stack;
  }, [settings.font]);

  // Open rendered links (bookmark pills, inline previews) in the browser.
  // Target=_blank alone won't leave the Tauri webview, so intercept centrally.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      e.preventDefault();
      void openExternal(href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Global quick-open: (re)register the system-wide shortcut in the shell.
  useEffect(() => {
    if (!isTauri()) return;
    (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("set_global_shortcut", {
          accelerator: settings.globalShortcutEnabled ? settings.globalShortcut : "",
        });
      } catch { /* browser dev: no shell */ }
    })();
  }, [settings.globalShortcut, settings.globalShortcutEnabled]);

  // The shell emits this when the global shortcut fires (even from another app).
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen("noto:quick-open", () => setPalette(true));
      } catch { /* noop */ }
    })();
    return () => unlisten?.();
  }, []);

  // Titlebar drag: empty areas move the window via the Tauri API.
  // (Attribute-based drag regions don't survive the tab strip's scroll
  // container in WebKit; the API call always works.) Tabs/buttons are
  // excluded so they stay fully interactive.
  const onTitlebarMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || !isTauri()) return;
    const t = e.target as HTMLElement | null;
    if (t?.closest?.('button, [role="tab"], input, [role="menu"], [role="menuitem"]')) return;
    void (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().startDragging();
      } catch { /* browser dev */ }
    })();
  }, []);

  const openNote = useCallback((id: string) => {
    store.patch((p) => ({
      ...p,
      openTabs: p.openTabs.includes(id) ? p.openTabs : [...p.openTabs, id],
      activeId: id,
    }));
  }, [store]);

  const closeTab = useCallback((id: string) => {
    store.patch((p) => {
      const openTabs = p.openTabs.filter((t) => t !== id);
      return { ...p, openTabs, activeId: p.activeId === id ? (openTabs[openTabs.length - 1] ?? null) : p.activeId };
    });
  }, [store]);

  const newNote = useCallback(() => {
    const id = store.createNote();
    return id;
  }, [store]);

  const deleteNote = useCallback((id: string) => {
    const note = store.notes.find((n) => n.id === id);
    store.removeNote(id);
    toast(`Deleted “${note?.title || "Untitled"}”`, {
      action: { label: "Undo", onClick: () => {
        // Best-effort undo: re-insert from the toast closure snapshot.
        if (note) store.patch((p) => ({
          ...p,
          notes: [{ ...note, blocks: undefined as never, body: blocksToMarkdown(note.title, note.blocks, false) }, ...p.notes],
          openTabs: [...p.openTabs, note.id],
          activeId: note.id,
        }));
      } },
    });
  }, [store]);

  // Global macOS shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k" && !e.shiftKey) { e.preventDefault(); setPalette((v) => !v); }
      else if (mod && e.key.toLowerCase() === "n") { e.preventDefault(); newNote(); }
      else if (mod && e.key === "\\") { e.preventDefault(); setSidebarOpen((v) => !v); }
      else if (mod && e.key === ",") { e.preventDefault(); setSettingsOpen(true); }
      else if (mod && e.key === "Backspace" && !e.shiftKey) {
        // Delete note — but never while editing text (word-delete lives there).
        const t = e.target as HTMLElement | null;
        const editing = !!t?.closest?.("input, textarea, select, [contenteditable='true']");
        if (!editing && store.activeId) {
          e.preventDefault();
          deleteNote(store.activeId);
        }
      }
      else if (mod && e.key.toLowerCase() === "w") {
        if (store.activeId) { e.preventDefault(); closeTab(store.activeId); }
      } else if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        const tabs = store.openTabs;
        const i = tabs.indexOf(store.activeId ?? "");
        const next = tabs[(i + (e.shiftKey ? -1 : 1) + tabs.length) % tabs.length];
        if (next) openNote(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newNote, deleteNote, closeTab, openNote, store.activeId, store.openTabs]);

  const tabs = useMemo(
    () => store.openTabs
      .map((id) => store.notes.find((n) => n.id === id))
      .filter((n): n is NonNullable<typeof n> => !!n)
      .map((n) => ({ id: n.id, title: n.title, icon: tabIconId(n.icon, settings.noteIcon, settings.iconPlacement) })),
    [store.openTabs, store.notes, settings.noteIcon, settings.iconPlacement],
  );

  const exportMd = useCallback(() => {
    if (!activeNote) return;
    const md = blocksToMarkdown(activeNote.title || "Untitled", activeNote.blocks);
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${activeNote.title || "untitled"}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Exported as Markdown");
  }, [activeNote]);

  const exportJson = useCallback(() => {
    const raw = localStorage.getItem("noto.v1") ?? "{}";
    const blob = new Blob([raw], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "noto-backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Backup downloaded");
  }, []);

  const importJson = useCallback((text: string) => {
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data.notes)) throw new Error("bad backup");
      localStorage.setItem("noto.v1", text);
      window.location.reload();
    } catch {
      toast.error("That file is not a valid Noto backup");
    }
  }, []);

  const resetAll = useCallback(() => {
    if (window.confirm("Delete ALL local notes and settings? This cannot be undone.")) {
      localStorage.removeItem("noto.v1");
      window.location.reload();
    }
  }, []);

  // Cleanup job: notes with no real title and no real content.
  const emptyNotes = useMemo(
    () => store.notes.filter((n) => isJunkNote(n.title, blocksToMarkdown(n.title, n.blocks, false))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.notes],
  );

  const deleteEmptyNotes = useCallback(() => {
    if (emptyNotes.length === 0) {
      toast.info("No empty notes found");
      return;
    }
    const ids = new Set(emptyNotes.map((n) => n.id));
    const snapshot = emptyNotes.map((n) => ({
      id: n.id, title: n.title, body: blocksToMarkdown(n.title, n.blocks, false),
      tags: n.tags, favorite: n.favorite, icon: n.icon, folderId: n.folderId,
      createdAt: n.createdAt, updatedAt: n.updatedAt,
    }));
    store.patch((p) => {
      const notes = p.notes.filter((n) => !ids.has(n.id));
      const openTabs = p.openTabs.filter((t) => !ids.has(t));
      return {
        ...p, notes, openTabs,
        activeId: p.activeId && ids.has(p.activeId) ? (openTabs[openTabs.length - 1] ?? null) : p.activeId,
      };
    });
    const count = snapshot.length;
    toast(`Deleted ${count} empty note${count === 1 ? "" : "s"}`, {
      action: {
        label: "Undo",
        onClick: () => store.patch((p) => {
          const have = new Set(p.notes.map((n) => n.id));
          const restored = snapshot.filter((s) => !have.has(s.id));
          return {
            ...p,
            notes: [...restored, ...p.notes],
            openTabs: [...p.openTabs, ...restored.map((s) => s.id)],
            activeId: restored[0]?.id ?? p.activeId,
          };
        }),
      },
    });
  }, [emptyNotes, store]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
      {/* Unified titlebar: traffic lights + tabs + new-note, Notion-style */}
      <header
        id="titlebar"
        data-tauri-drag-region
        onMouseDown={onTitlebarMouseDown}
        className="flex h-9 shrink-0 select-none items-center gap-0 border-b border-border bg-background/70 pr-2"
      >
        {/* Brand zone mirrors the live sidebar width, so tabs always start at the content edge */}
        <div
          data-tauri-drag-region
          className="flex shrink-0 select-none items-center"
          style={{ width: sidebarOpen ? sidebarWidth : 48 }}
          aria-hidden
        >
          <span data-tauri-drag-region className="w-20 shrink-0" />
          {sidebarOpen && (
            <span className="truncate text-[13px] font-semibold tracking-tight text-foreground/90">
              Noteworthy
            </span>
          )}
        </div>
        {/* sidebar partition continued to the top */}
        <div data-tauri-drag-region className="h-5 w-px shrink-0 bg-border" aria-hidden />
        <Tabs
          tabs={tabs}
          activeId={store.activeId}
          onSelect={openNote}
          onClose={closeTab}
          onCloseOthers={(id) => store.patch((p) => ({ ...p, openTabs: p.openTabs.includes(id) ? [id] : p.openTabs, activeId: id }))}
          onCloseRight={(id) => store.patch((p) => {
            const i = p.openTabs.indexOf(id);
            const openTabs = i >= 0 ? p.openTabs.slice(0, i + 1) : p.openTabs;
            return { ...p, openTabs, activeId: id };
          })}
          onCloseAll={() => store.patch((p) => ({ ...p, openTabs: [], activeId: null }))}
          onNew={newNote}
        />
        {/* Unified add: opens search with "New page" first (Notion-style).
            ⌘N still creates instantly; ⌘K opens the same palette. */}
        <Tooltip><TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="ml-1 h-6 w-6 shrink-0" onClick={() => setPalette(true)} aria-label="Add note">
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger><TooltipContent side="bottom">New / open note (⌘ K)</TooltipContent></Tooltip>
      </header>
      <div className="flex min-h-0 flex-1">
      {sidebarOpen && (
        <Sidebar
          notes={store.notes}
          activeId={store.activeId}
          collapsed={false}
          onToggle={() => setSidebarOpen(false)}
          onOpen={openNote}
          onNew={newNote}
          onDelete={deleteNote}
          onFavorite={store.toggleFavorite}
          onSearch={() => setPalette(true)}
          onSettings={() => setSettingsOpen(true)}
          width={sidebarWidth}
          onWidth={setSidebarWidth}
          density={settings.sidebarDensity}
          noteIconDefault={settings.noteIcon}
          iconPlacement={settings.iconPlacement}
          favIconId={settings.favIcon}
          onSetIcon={store.setNoteIcon}
          onSetDefaultIcon={(icon) => store.setSettings({ noteIcon: icon })}
        />
      )}
      {!sidebarOpen && (
        <Sidebar
          notes={store.notes} activeId={store.activeId} collapsed
          onToggle={() => setSidebarOpen(true)}
          onOpen={openNote} onNew={newNote} onDelete={deleteNote}
          onFavorite={store.toggleFavorite} onSearch={() => setPalette(true)}
          onSettings={() => setSettingsOpen(true)}
          width={sidebarWidth} onWidth={setSidebarWidth}
          density={settings.sidebarDensity}
          noteIconDefault={settings.noteIcon}
          iconPlacement={settings.iconPlacement}
          favIconId={settings.favIcon}
          onSetIcon={store.setNoteIcon}
          onSetDefaultIcon={(icon) => store.setSettings({ noteIcon: icon })}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="app-editor min-h-0 flex-1 overflow-y-auto">
          {activeNote ? (
            <Editor
              key={activeNote.id}
              note={activeNote}
              settings={settings}
              onChange={(title, body) => store.updateBlocks(activeNote.id, title, body)}
              onToggleAddBlock={() => store.setSettings({ showAddBlock: !settings.showAddBlock })}
            />
          ) : (
            <div className="flex min-h-full flex-1 items-center justify-center px-8 py-16 pop-fade">
              <div className="flex flex-col items-center text-center">
                <span className="mb-7 flex h-28 w-28 items-center justify-center rounded-[32px] border bg-muted/40">
                  <HiSquares2X2 className="h-14 w-14 text-muted-foreground" />
                </span>
                <div className="flex items-center justify-center gap-2">
                  <Tooltip><TooltipTrigger asChild>
                    <Button size="icon" className="h-9 w-9" onClick={newNote} aria-label="New note">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger><TooltipContent side="bottom">New note (⌘ N)</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild>
                    <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setPalette(true)} aria-label="Search notes">
                      <Search className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger><TooltipContent side="bottom">Search notes (⌘ K)</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild>
                    <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setSettingsOpen(true)} aria-label="Settings">
                      <SettingsIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger><TooltipContent side="bottom">Settings (⌘ ,)</TooltipContent></Tooltip>
                </div>
              </div>
            </div>
          )}
        </div>
        <footer className="flex items-center gap-3 border-t border-border px-4 py-1 text-[11px] text-muted-foreground">
          <span>{store.notes.length} notes</span>
          <span aria-hidden>·</span>
          <span>SQLite · local-first · offline</span>
          <span className="ml-auto capitalize">{settings.theme.replace(/-/g, " ")}</span>
        </footer>
      </main>

      <SearchPalette
        open={palette}
        notes={store.notes}
        noteIconDefault={settings.noteIcon}
        iconPlacement={settings.iconPlacement}
        onClose={() => setPalette(false)}
        onOpen={openNote}
        onNew={(title) => {
          const id = store.createNote();
          if (title.trim()) {
            const n = store.notes.find((x) => x.id === id);
            if (n) store.updateBlocks(id, title.trim(), blocksToMarkdown(title.trim(), n.blocks, false));
          }
        }}
      />
      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onChange={store.setSettings}
        onExportMd={exportMd}
        onExportJson={exportJson}
        onImportJson={importJson}
        onReset={resetAll}
        emptyCount={emptyNotes.length}
        onDeleteEmptyNotes={deleteEmptyNotes}
      />
      <Toaster position="bottom-right" richColors closeButton />
      </div>
    </div>
  );
}
