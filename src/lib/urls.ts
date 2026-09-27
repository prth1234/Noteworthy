import type { SmartUrlMode } from "./types";

export const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;

export function findUrls(text: string): string[] {
  return text.match(URL_RE) ?? [];
}

export function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

/**
 * Smart-paste policy for URLs, fully user-controlled:
 * - "plain": keep raw URL text
 * - "link": keep as inline link (rendered, still Markdown underneath)
 * - "bookmark": convert the block into a rich bookmark card
 * - "ask": insert as text but surface a one-click convert affordance
 * - "off": identical to plain, never even suggest conversion
 */
export function decorateUrlPaste(text: string, mode: SmartUrlMode): { bookmark: boolean; suggest: boolean } {
  const isBareUrl = /^https?:\/\/\S+$/.test(text.trim());
  if (!isBareUrl) return { bookmark: false, suggest: false };
  if (mode === "bookmark") return { bookmark: true, suggest: false };
  if (mode === "ask") return { bookmark: false, suggest: true };
  return { bookmark: false, suggest: false };
}
