import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms = 250) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function fuzzyMatch(haystack: string, needle: string): boolean {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase().trim();
  if (!n) return true;
  let j = 0;
  for (let i = 0; i < h.length && j < n.length; i++) {
    if (h[i] === n[j]) j++;
  }
  return j === n.length;
}

/**
 * Open a URL in the user's browser. Inside Tauri this goes through the
 * opener plugin (target=_blank alone doesn't leave the webview);
 * in the browser it falls back to window.open.
 */
export async function openExternal(url: string) {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return;
  try {
    if (isTauri()) {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(trimmed);
      return;
    }
  } catch { /* fall through to window.open */ }
  window.open(trimmed, "_blank", "noopener,noreferrer");
}
