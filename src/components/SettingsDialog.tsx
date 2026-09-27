import { useEffect, useRef, useState } from "react";
import { Check, Download, Upload, Trash2, Info, Keyboard } from "lucide-react";
import { toast } from "sonner";
import type { Settings, SmartUrlMode } from "@/lib/types";
import { THEMES } from "@/lib/themes";
import { FONTS, ensureFontLoaded } from "@/lib/fonts";
import { NOTE_ICONS, FAV_ICONS, NoteIcon, FavIcon } from "@/lib/noteIcons";
import { SHORTCUTS } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";

interface Props {
  open: boolean;
  settings: Settings;
  onClose: () => void;
  onChange: (s: Partial<Settings>) => void;
  onExportMd: () => void;
  onExportJson: () => void;
  onImportJson: (text: string) => void;
  onReset: () => void;
  emptyCount: number;
  onDeleteEmptyNotes: () => void;
}

const TABS = ["Appearance", "Editor", "Keyboard", "Data", "About"] as const;

const formatAccel = (acc: string) =>
  acc.replace(/Cmd/g, "⌘").replace(/Control/g, "⌃").replace(/Alt/g, "⌥").replace(/Shift/g, "⇧");

async function pushShortcutToShell(accelerator: string): Promise<boolean> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("set_global_shortcut", { accelerator });
    return true;
  } catch (err) {
    toast.error(`Could not register ${accelerator || "empty shortcut"}: ${String(err)}`);
    return false;
  }
}

export function SettingsDialog(p: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Appearance");
  const [recording, setRecording] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const s = p.settings;

  const set = (patch: Partial<Settings>) => {
    if (patch.font) ensureFontLoaded(patch.font);
    p.onChange(patch);
  };

  const groupedFonts = (["System", "Sans", "Serif", "Mono", "Writing"] as const).map((c) => ({
    cat: c, fonts: FONTS.filter((f) => f.category === c),
  }));

  // Global-shortcut recorder: next non-modifier keypress becomes the accelerator.
  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") { setRecording(false); return; }
      if (["Meta", "Control", "Alt", "Shift"].includes(e.key)) return;
      const parts: string[] = [];
      if (e.metaKey) parts.push("Cmd");
      if (e.ctrlKey) parts.push("Control");
      if (e.altKey) parts.push("Alt");
      if (e.shiftKey) parts.push("Shift");
      let key = e.code;
      if (key.startsWith("Key")) key = key.slice(3);
      else if (key.startsWith("Digit")) key = key.slice(5);
      parts.push(key.length === 1 ? key.toUpperCase() : key);
      const acc = parts.join("+");
      p.onChange({ globalShortcut: acc, globalShortcutEnabled: true });
      setRecording(false);
      void pushShortcutToShell(acc).then((ok) => {
        if (ok) toast.success(`Global shortcut set to ${formatAccel(acc)}`);
      });
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [recording, p]);

  return (
    <Dialog open={p.open} onOpenChange={(v) => { if (!v) p.onClose(); }}>
      <DialogContent className="max-w-2xl gap-0 p-0 fade-enter" aria-label="Settings">
        <DialogHeader className="px-5 pb-3 pt-5">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Appearance, editor behavior, shortcuts, and local data.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1 overflow-x-auto border-b border-border px-4">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("cursor-pointer border-b-2 px-3 py-2 text-sm transition-colors",
                tab === t ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {t}
            </button>
          ))}
        </div>
        <div className="h-[440px] max-h-[52vh] overflow-y-auto px-5 py-4">
          {tab === "Appearance" && (
            <div className="space-y-5">
              <div>
                <h4 className="mb-2 text-sm font-semibold">Theme <Badge variant="secondary" className="ml-1">{THEMES.length}</Badge></h4>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {THEMES.map((t) => (
                    <button key={t.id} onClick={() => set({ theme: t.id })}
                      className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors",
                        s.theme === t.id ? "border-primary bg-accent" : "hover:bg-accent/50")}>
                      <span className="flex h-6 w-10 shrink-0 overflow-hidden rounded border" data-theme={t.id}>
                        <span className="h-full w-1/2" style={{ background: "hsl(var(--sidebar))" }} />
                        <span className="h-full w-1/2" style={{ background: "hsl(var(--editor))" }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{t.label}</span>
                        <span className="block text-[11px] text-muted-foreground">{t.kind}</span>
                      </span>
                      {s.theme === t.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Font <Badge variant="secondary" className="ml-1">{FONTS.length}</Badge></h4>
                  <Select value={s.font} onValueChange={(v) => set({ font: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {groupedFonts.map((g) => (
                        <div key={g.cat}>
                          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.cat}</div>
                          {g.fonts.map((f) => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">Default is Apple’s system font (SF Pro). Web fonts load on demand.</p>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Sidebar density</h4>
                  <Select value={s.sidebarDensity} onValueChange={(v) => set({ sidebarDensity: v as Settings["sidebarDensity"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="spacious">Spacious</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">Row height for notes in the sidebar.</p>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Editor width</h4>
                  <Select value={s.editorWidth} onValueChange={(v) => set({ editorWidth: v as Settings["editorWidth"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="narrow">Narrow · 620px</SelectItem>
                      <SelectItem value="comfortable">Comfortable · 760px</SelectItem>
                      <SelectItem value="wide">Wide · 900px</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="text-sm">Font size <span className="text-muted-foreground">· {s.fontSize}px</span>
                  <input type="range" min={12} max={20} value={s.fontSize} onChange={(e) => set({ fontSize: Number(e.target.value) })} className="mt-1 w-full" />
                </label>
                <label className="text-sm">Line height <span className="text-muted-foreground">· {s.lineHeight.toFixed(2)}</span>
                  <input type="range" min={1.4} max={2} step={0.05} value={s.lineHeight} onChange={(e) => set({ lineHeight: Number(e.target.value) })} className="mt-1 w-full" />
                </label>
                <label className="text-sm">Code font size <span className="text-muted-foreground">· {s.codeFontSize}px</span>
                  <input type="range" min={10} max={16} step={1} value={s.codeFontSize} onChange={(e) => set({ codeFontSize: Number(e.target.value) })} className="mt-1 w-full" />
                </label>
              </div>
              <Separator />
              <div>
                <h4 className="mb-2 text-sm font-semibold">Note icon <span className="font-normal text-muted-foreground">· used for every page across the app</span></h4>
                <div className="flex flex-wrap gap-1.5">
                  {NOTE_ICONS.map((o) => (
                    <button
                      key={o.id}
                      title={o.label}
                      onClick={() => set({ noteIcon: o.id })}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                        s.noteIcon === o.id ? "border-primary bg-accent" : "hover:bg-accent/50",
                      )}
                    >
                      <NoteIcon id={o.id} className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold">Favorite icon</h4>
                <div className="flex flex-wrap gap-1.5">
                  {FAV_ICONS.map((o) => (
                    <button
                      key={o.id}
                      title={o.label}
                      onClick={() => set({ favIcon: o.id })}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                        s.favIcon === o.id ? "border-primary bg-accent" : "hover:bg-accent/50",
                      )}
                    >
                      <FavIcon id={o.id} className={cn("h-4 w-4", s.favIcon === o.id && "fill-amber-400 text-amber-400")} />
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Per-note icons can still override this from the sidebar ··· menu.</p>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold">Note icons appear in</h4>
                <Select value={s.iconPlacement} onValueChange={(v) => set({ iconPlacement: v as Settings["iconPlacement"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tabs">Tabs only · dots in sidebar</SelectItem>
                    <SelectItem value="sidebar">Sidebar only</SelectItem>
                    <SelectItem value="both">Tabs and sidebar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {tab === "Editor" && (
            <div className="space-y-4">
              <div>
                <h4 className="mb-1 text-sm font-semibold">Smart URL handling</h4>
                <p className="mb-2 text-xs text-muted-foreground">What happens when you paste a bare URL on its own line.</p>
                <Select value={s.smartUrl} onValueChange={(v) => set({ smartUrl: v as SmartUrlMode })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ask">Ask every time (suggest bookmark)</SelectItem>
                    <SelectItem value="bookmark">Always convert to bookmark</SelectItem>
                    <SelectItem value="link">Keep as link</SelectItem>
                    <SelectItem value="plain">Keep as plain URL</SelectItem>
                    <SelectItem value="off">Off — never transform or suggest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <label className="flex items-center gap-2.5 text-sm">
                <Checkbox checked={s.showAddBlock} onCheckedChange={(c) => set({ showAddBlock: c === true })} /> Show “Add block” hint at page end
              </label>
              <label className="flex items-center gap-2.5 text-sm">
                <Checkbox checked={s.spellcheck} onCheckedChange={(c) => set({ spellcheck: c === true })} /> Spell checking
              </label>
              <label className="flex items-center gap-2.5 text-sm">
                <Checkbox checked={s.showLineNumbers} onCheckedChange={(c) => set({ showLineNumbers: c === true })} /> Line numbers in code blocks
              </label>
            </div>
          )}
          {tab === "Keyboard" && (
            <div>
              <div className="mb-4 rounded-lg border p-3">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    checked={s.globalShortcutEnabled}
                    onCheckedChange={(c) => {
                      const v = c === true;
                      p.onChange({ globalShortcutEnabled: v });
                      void pushShortcutToShell(v ? s.globalShortcut : "");
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                      <Keyboard className="h-3.5 w-3.5" /> Quick open everywhere
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      System-wide shortcut — opens search even when Noteworthy is hidden or another app is focused.
                    </p>
                  </div>
                  <kbd className="shrink-0 rounded bg-muted px-2 py-1 font-mono text-[11px]">
                    {s.globalShortcutEnabled ? formatAccel(s.globalShortcut) : "Off"}
                  </kbd>
                  <Button size="sm" variant="outline" onClick={() => setRecording((r) => !r)}>
                    {recording ? "Cancel" : "Change"}
                  </Button>
                </div>
                {recording && (
                  <p className="mt-2 animate-pulse text-xs font-medium text-primary">
                    Press the new shortcut… (Esc to cancel)
                  </p>
                )}
              </div>
              <h4 className="mb-2 text-sm font-semibold">Shortcuts</h4>
              <div className="divide-y divide-border rounded-lg border">
                {SHORTCUTS.map((k) => (
                  <div key={k.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="w-32 shrink-0 font-medium">{k.label}</span>
                    <kbd className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                      {k.id === "quick-open" && !s.globalShortcutEnabled
                        ? "Off"
                        : k.id === "quick-open"
                          ? formatAccel(s.globalShortcut)
                          : k.keys}
                    </kbd>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{k.action}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Markdown shortcuts also work inline: <kbd className="rounded bg-muted px-1 font-mono">#</kbd> <kbd className="rounded bg-muted px-1 font-mono">-</kbd> <kbd className="rounded bg-muted px-1 font-mono">1.</kbd> <kbd className="rounded bg-muted px-1 font-mono">&gt;</kbd> <kbd className="rounded bg-muted px-1 font-mono">[]</kbd> <kbd className="rounded bg-muted px-1 font-mono">```</kbd> <kbd className="rounded bg-muted px-1 font-mono">---</kbd></p>
            </div>
          )}
          {tab === "Data" && (
            <div className="space-y-4">
              <div>
                <h4 className="mb-1 text-sm font-semibold">Local database</h4>
                <p className="text-xs text-muted-foreground">Notes persist as Markdown in local SQLite (Tauri) with a browser fallback. Nothing leaves this Mac.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={p.onExportMd}><Download className="h-3.5 w-3.5" /> Export note (.md)</Button>
                <Button size="sm" variant="outline" onClick={p.onExportJson}><Download className="h-3.5 w-3.5" /> Backup (JSON)</Button>
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5" /> Import backup</Button>
                <input ref={fileRef} type="file" accept="application/json" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => p.onImportJson(String(r.result ?? ""));
                    r.readAsText(f);
                    e.target.value = "";
                  }} />
              </div>
              <Separator />
              <div>
                <h4 className="mb-1 text-sm font-semibold">Clean up</h4>
                <p className="mb-2 text-xs text-muted-foreground">
                  Delete notes with no title and no content. You can undo right after.
                </p>
                <Button size="sm" variant="outline" disabled={p.emptyCount === 0} onClick={p.onDeleteEmptyNotes}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete empty notes{p.emptyCount > 0 ? ` (${p.emptyCount})` : ""}
                </Button>
              </div>
              <Separator />
              <div>
                <h4 className="mb-1 text-sm font-semibold text-destructive">Danger zone</h4>
                <Button size="sm" variant="destructive" onClick={p.onReset}><Trash2 className="h-3.5 w-3.5" /> Reset all local data</Button>
              </div>
            </div>
          )}
          {tab === "About" && (
            <div className="space-y-2 text-sm">
              <h4 className="flex items-center gap-2 font-semibold"><Info className="h-4 w-4" /> Noteworthy 0.1.0</h4>
              <p className="text-muted-foreground">Lightweight local-first Markdown notes for macOS.<br />Markdown underneath. Beautiful blocks on top.</p>
              <p className="text-xs text-muted-foreground">Tauri 2 · React · shadcn/ui · SQLite (FTS5) · offline-first</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
