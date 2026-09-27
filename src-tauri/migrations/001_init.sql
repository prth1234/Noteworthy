-- Noto initial schema (migration 001).
-- Markdown stays the canonical body format: body_md is plain Markdown,
-- so notes remain portable even outside the app.

CREATE TABLE IF NOT EXISTS folders(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes(
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled',
  body_md TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  favorite INTEGER NOT NULL DEFAULT 0,
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- FTS5 index for instant title/body/tag search (⌘K palette).
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  title, body_md, tags, content='notes', content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, title, body_md, tags)
  VALUES (new.rowid, new.title, new.body_md, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, body_md, tags)
  VALUES ('delete', old.rowid, old.title, old.body_md, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, body_md, tags)
  VALUES ('delete', old.rowid, old.title, old.body_md, old.tags);
  INSERT INTO notes_fts(rowid, title, body_md, tags)
  VALUES (new.rowid, new.title, new.body_md, new.tags);
END;

CREATE TABLE IF NOT EXISTS app_state(
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
