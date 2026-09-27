#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/*
 * Noteworthy macOS shell (Tauri 2).
 *
 * Local-first SQLite schema — the single source of truth on this Mac.
 * The frontend mirrors it (see src/lib/store.ts `BOOTSTRAP_SQL` + mirrorToSqlite).
 * Full-text search uses FTS5 so ⌘K stays instant with thousands of notes.
 *
 * Global quick-open (Notion-style ⌘H): a system-wide hotkey registered via
 * tauri-plugin-global-shortcut. It works even when another app is focused or
 * Noto has no visible window (closing hides instead of quitting). The
 * accelerator is user-configurable in Settings → Keyboard and applied live
 * through the `set_global_shortcut` command.
 *
 * Phase 6 (multi-Mac sync) builds on this exact schema by adding:
 *   notes.rev (lamport clock), notes.updated_by (device id),
 *   notes.deleted (tombstone), and an outbox table for the offline op-log.
 * See README "Sync roadmap". No schema rewrite needed — additive columns.
 */

use std::sync::Mutex;
use tauri::{Emitter, Manager, WindowEvent};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

struct CurrentShortcut(Mutex<Option<Shortcut>>);

/// (Re)register the system-wide quick-open hotkey. Empty string = disabled.
#[tauri::command]
fn set_global_shortcut(app: tauri::AppHandle, accelerator: String) -> Result<(), String> {
    let state = app.state::<CurrentShortcut>();
    let mut current = state.0.lock().map_err(|e| e.to_string())?;
    let shortcuts = app.global_shortcut();
    if let Some(prev) = current.take() {
        let _ = shortcuts.unregister(prev);
    }
    let trimmed = accelerator.trim();
    if trimmed.is_empty() {
        return Ok(());
    }
    let shortcut: Shortcut = trimmed
        .parse()
        .map_err(|e| format!("invalid shortcut “{trimmed}”: {e}"))?;
    shortcuts.register(shortcut.clone()).map_err(|e| e.to_string())?;
    *current = Some(shortcut);
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(CurrentShortcut(Mutex::new(None)))
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(
                    "sqlite:noto.db",
                    vec![tauri_plugin_sql::Migration {
                        version: 1,
                        description: "noto initial schema",
                        sql: include_str!("../migrations/001_init.sql"),
                        kind: tauri_plugin_sql::MigrationKind::Up,
                    }],
                )
                .build(),
        )
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                        let _ = app.emit("noto:quick-open", ());
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|window, event| {
            // Stay alive with zero windows: hide instead of closing so the
            // global shortcut can always bring Noto back.
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![set_global_shortcut])
        .run(tauri::generate_context!())
        .expect("error while running Noteworthy");
}
