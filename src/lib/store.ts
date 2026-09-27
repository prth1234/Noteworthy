import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Folder, Note, Settings } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { welcomeNote } from "./blocks";
import { isTauri, uid } from "./utils";

/*
 * Persistence architecture (offline-first, local-first):
 *
 *  - Inside Tauri (macOS .app): SQLite via @tauri-apps/plugin-sql.
 *    Schema: notes(id, title, body_md, tags, favorite, folder_id,
 *    created_at, updated_at) + FTS5 virtual table for instant search,
 *    plus folders / settings / tabs tables. See src-tauri/src/db.rs
 *    and the SQL bootstrap in `bootstrapSqlite()`.
 *  - In the browser (dev / fallback): the SAME shape is mirrored to
 *    localStorage so the app is fully usable without the Rust shell.
 *
 * Blocks are serialized to Markdown for storage (no proprietary lock-in:
 * every note exports cleanly to .md). This keeps the "Markdown
 * underneath, blocks on top" guarantee.
 */
import { blocksToMarkdown, isEffectivelyEmpty, markdownToBlocks } from "./blocks";

const LS_KEY = "noto.v1";

interface Persisted {
  notes: (Omit<Note, "blocks"> & { body: string })[];
  folders: Folder[];
  openTabs: string[];
  activeId: string | null;
  settings: Settings;
}

function seed(): Persisted {
  const w = welcomeNote();
  const { blocks: _omit, ...rest } = w;
  void _omit;
  return {
    notes: [{ ...rest, body: blocksToMarkdown(w.title, w.blocks, false) }],
    folders: [{ id: "quick", name: "Quick notes" }],
    openTabs: [w.id],
    activeId: w.id,
    settings: DEFAULT_SETTINGS,
  };
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(LS_KEY, JSON.stringify(s));
      return s;
    }
    const p = JSON.parse(raw) as Persisted;
    if (!p.settings) p.settings = DEFAULT_SETTINGS;
    // One-time migration: notes auto-titled "Untitled" by older builds that
    // were never actually written in revert to empty titles (placeholder-only),
    // so the user never has to select-delete placeholder text again.
    let migrated = false;
    p.notes = (p.notes ?? []).map((n) => {
      if (n.title === "Untitled" && isEffectivelyEmpty(n.body ?? "")) {
        migrated = true;
        return { ...n, title: "" };
      }
      return n;
    });
    const out = { ...seed(), ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings } };
    // Default note icon moved to the first registry entry ("apps");
    // early installs stored the interim "squares" default — carry them over.
    if (out.settings.noteIcon === "squares") out.settings.noteIcon = "apps";
    if (migrated) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(out)); } catch { /* quota */ }
    }
    return out;
  } catch {
    return seed();
  }
}

export function useStore() {
  const [persisted, setPersisted] = useState<Persisted>(() => load());
  const [query, setQuery] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(persisted)); } catch { /* quota */ }
      // When running inside Tauri, mirror to SQLite (fire-and-forget).
      void mirrorToSqlite(persisted);
    }, 200);
  }, [persisted]);

  const notes: Note[] = useMemo(
    () =>
      persisted.notes.map((n) => ({
        id: n.id, title: n.title, tags: n.tags ?? [], favorite: !!n.favorite,
        icon: n.icon ?? null,
        folderId: n.folderId ?? null, createdAt: n.createdAt, updatedAt: n.updatedAt,
        blocks: markdownToBlocks(n.body ?? "", n.title),
      })),
    [persisted.notes],
  );

  const patch = useCallback((fn: (p: Persisted) => Persisted) => setPersisted((p) => fn(p)), []);

  const activeNote = notes.find((n) => n.id === persisted.activeId) ?? null;

  const createNote = useCallback((folderId: string | null = null) => {
    const id = uid();
    const now = Date.now();
    const body = "";
    // Title stays empty: "Untitled" is display-only (placeholder/fallbacks).
    patch((p) => ({
      ...p,
      notes: [{ id, title: "", body, tags: [], favorite: false, icon: null, folderId, createdAt: now, updatedAt: now }, ...p.notes],
      openTabs: p.openTabs.includes(id) ? p.openTabs : [...p.openTabs, id],
      activeId: id,
    }));
    return id;
  }, [patch]);

  const updateBlocks = useCallback((id: string, title: string, body: string) => {
    patch((p) => ({
      ...p,
      notes: p.notes.map((n) => (n.id === id ? { ...n, title, body, updatedAt: Date.now() } : n)),
    }));
  }, [patch]);

  const removeNote = useCallback((id: string) => {
    patch((p) => {
      const notes = p.notes.filter((n) => n.id !== id);
      const openTabs = p.openTabs.filter((t) => t !== id);
      return { ...p, notes, openTabs, activeId: p.activeId === id ? (openTabs[openTabs.length - 1] ?? null) : p.activeId };
    });
  }, [patch]);

  const toggleFavorite = useCallback((id: string) => {
    patch((p) => ({ ...p, notes: p.notes.map((n) => (n.id === id ? { ...n, favorite: !n.favorite } : n)) }));
  }, [patch]);

  const setNoteIcon = useCallback((id: string, icon: string | null) => {
    patch((p) => ({ ...p, notes: p.notes.map((n) => (n.id === id ? { ...n, icon, updatedAt: Date.now() } : n)) }));
  }, [patch]);

  const setSettings = useCallback((s: Partial<Settings>) => {
    patch((p) => ({ ...p, settings: { ...p.settings, ...s } }));
  }, [patch]);

  return {
    notes, folders: persisted.folders, openTabs: persisted.openTabs,
    activeId: persisted.activeId, activeNote, settings: persisted.settings,
    query, setQuery, patch, setPersisted,
    createNote, updateBlocks, removeNote, toggleFavorite, setNoteIcon, setSettings,
  };
}

export type Store = ReturnType<typeof useStore>;

export const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS notes(id TEXT PRIMARY KEY, title TEXT, body_md TEXT, tags TEXT, favorite INTEGER, folder_id TEXT, created_at INTEGER, updated_at INTEGER);
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(title, body_md, tags, content='notes', content_rowid='rowid');
CREATE TABLE IF NOT EXISTS folders(id TEXT PRIMARY KEY, name TEXT);
CREATE TABLE IF NOT EXISTS app_state(key TEXT PRIMARY KEY, value TEXT);
`;

async function mirrorToSqlite(p: Persisted) {
  if (!isTauri()) return;
  try {
    const { default: Database } = await import("@tauri-apps/plugin-sql");
    const db = await Database.load("sqlite:noto.db");
    await db.execute(BOOTSTRAP_SQL);
    for (const n of p.notes) {
      await db.execute(
        "INSERT INTO notes(id,title,body_md,tags,favorite,folder_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, body_md=excluded.body_md, tags=excluded.tags, favorite=excluded.favorite, updated_at=excluded.updated_at",
        [n.id, n.title, n.body, JSON.stringify(n.tags), n.favorite ? 1 : 0, n.folderId, n.createdAt, n.updatedAt],
      );
    }
    await db.execute("INSERT INTO app_state(key,value) VALUES('tabs',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [JSON.stringify({ openTabs: p.openTabs, activeId: p.activeId })]);
    await db.execute("INSERT INTO app_state(key,value) VALUES('settings',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [JSON.stringify(p.settings)]);
  } catch {
    // SQLite unavailable (e.g. plugin not wired yet) — localStorage remains source of truth.
  }
}
