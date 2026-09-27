# Noteworthy — local-first Markdown notes for macOS

> **Markdown underneath. Beautiful blocks on top.**
> Notion-style `/` blocks, Markdown shortcuts, modular tables, code blocks with copy —
> without the heaviness. Tauri 2 + React + shadcn/ui + SQLite. Offline-first.

## Run

```bash
npm install
npm run dev        # web preview of the exact desktop UI
```

## macOS app (Tauri)

Requires Rust (Apple Silicon + Intel supported via universal build):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run tauri:dev    # dev .app
npm run tauri:build  # → Noto.app / Noto.dmg (universal)
```

Install the same `.app`/`.dmg` on every Mac — one build, all machines.

## Architecture

```
macOS .app (Tauri 2)
├── React + TypeScript + Tailwind + shadcn/ui   (this repo: src/)
│   ├── Sidebar · Tabs · Block editor · ⌘K search · Settings
│   ├── lib/blocks  — block model ⇄ Markdown serializer
│   ├── lib/slash    — / command catalog
│   ├── lib/store    — persistence (SQLite in Tauri, localStorage fallback)
│   └── lib/themes/fonts/shortcuts/urls
└── Rust shell (src-tauri/) — SQLite + FTS5, filesystem, macOS APIs
```

Custom components (everything else is shadcn): `CodeBlock` (language + copy +
line numbers as one unit — no shadcn code primitive), `TableBlock`
(spreadsheet-style editing — shadcn Table is display-only), block gutter
controls (Notion-style hover affordance — no equivalent primitive).

## Sync roadmap — Phase 6 (multi-Mac, noted requirements)

Goal: same build on all Macs, one centralized note library, local-first.

- Each Mac keeps its local SQLite copy (already the source of truth here).
- Additive schema change only: `notes.rev` (lamport clock), `notes.updated_by`
  (device id), `notes.deleted` (tombstone), plus an `outbox` op-log table.
- Sync layer: `Local SQLite → Sync Layer → Central DB → other Macs`.
- Offline edits queue in `outbox`, flush on reconnect (last-writer-wins per
  field with tombstones; simultaneous edits never silently drop data —
  conflicts surface side-by-side in the editor for manual merge).
- Notes stay Markdown-portable throughout; sync transports Markdown + metadata.
