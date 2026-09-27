export interface FontMeta {
  name: string;
  stack: string;
  category: "System" | "Sans" | "Serif" | "Mono" | "Writing";
  google?: string;
}

const S = (name: string, stack: string, category: FontMeta["category"], google?: string): FontMeta => ({
  name, stack, category, google,
});

export const FONTS: FontMeta[] = [
  S("System (SF Pro)", `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif`, "System"),
  S("SF Mono", `ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace`, "System"),
  S("New York", `"New York", ui-serif, Georgia, serif`, "System"),
  S("Inter", `"Inter", system-ui, sans-serif`, "Sans", "Inter:wght@400;500;600;700"),
  S("Geist", `"Geist", "Inter", system-ui, sans-serif`, "Sans", "Geist:wght@400;500;600"),
  S("IBM Plex Sans", `"IBM Plex Sans", system-ui, sans-serif`, "Sans", "IBM+Plex+Sans:wght@400;500;600"),
  S("Source Sans 3", `"Source Sans 3", system-ui, sans-serif`, "Sans", "Source+Sans+3:wght@400;600"),
  S("Roboto", `"Roboto", system-ui, sans-serif`, "Sans", "Roboto:wght@400;500;700"),
  S("Open Sans", `"Open Sans", system-ui, sans-serif`, "Sans", "Open+Sans:wght@400;600"),
  S("Lato", `"Lato", system-ui, sans-serif`, "Sans", "Lato:wght@400;700"),
  S("Ubuntu", `"Ubuntu", system-ui, sans-serif`, "Sans", "Ubuntu:wght@400;500;700"),
  S("Space Grotesk", `"Space Grotesk", system-ui, sans-serif`, "Sans", "Space+Grotesk:wght@400;500;700"),
  S("DM Sans", `"DM Sans", system-ui, sans-serif`, "Sans", "DM+Sans:wght@400;500;700"),
  S("Work Sans", `"Work Sans", system-ui, sans-serif`, "Sans", "Work+Sans:wght@400;500;600"),
  S("Manrope", `"Manrope", system-ui, sans-serif`, "Sans", "Manrope:wght@400;500;600;700"),
  S("Plus Jakarta Sans", `"Plus Jakarta Sans", system-ui, sans-serif`, "Sans", "Plus+Jakarta+Sans:wght@400;500;600;700"),
  S("Noto Sans", `"Noto Sans", system-ui, sans-serif`, "Sans", "Noto+Sans:wght@400;500;600"),
  S("Merriweather", `"Merriweather", Georgia, serif`, "Serif", "Merriweather:wght@400;700"),
  S("Noto Serif", `"Noto Serif", Georgia, serif`, "Serif", "Noto+Serif:wght@400;600"),
  S("Source Serif 4", `"Source Serif 4", Georgia, serif`, "Serif", "Source+Serif+4:wght@400;600"),
  S("Libre Baskerville", `"Libre Baskerville", Georgia, serif`, "Serif", "Libre+Baskerville:wght@400;700"),
  S("Lora", `"Lora", Georgia, serif`, "Serif", "Lora:wght@400;500;600"),
  S("IBM Plex Serif", `"IBM Plex Serif", Georgia, serif`, "Serif", "IBM+Plex+Serif:wght@400;500;600"),
  S("JetBrains Mono", `"JetBrains Mono", ui-monospace, monospace`, "Mono", "JetBrains+Mono:wght@400;500"),
  S("Fira Code", `"Fira Code", ui-monospace, monospace`, "Mono", "Fira+Code:wght@400;500"),
  S("Source Code Pro", `"Source Code Pro", ui-monospace, monospace`, "Mono", "Source+Code+Pro:wght@400;500"),
  S("IBM Plex Mono", `"IBM Plex Mono", ui-monospace, monospace`, "Mono", "IBM+Plex+Mono:wght@400;500"),
  S("Geist Mono", `"Geist Mono", ui-monospace, monospace`, "Mono", "Geist+Mono:wght@400;500"),
  S("Caveat", `"Caveat", cursive`, "Writing", "Caveat:wght@400;600"),
  S("Shantell Sans", `"Shantell Sans", cursive`, "Writing", "Shantell+Sans:wght@400;500"),
  S("Newsreader", `"Newsreader", Georgia, serif`, "Writing", "Newsreader:wght@400;500"),
];

const loaded = new Set<string>();

export function ensureFontLoaded(name: string) {
  const f = FONTS.find((x) => x.name === name);
  if (!f?.google || loaded.has(name)) return;
  loaded.add(name);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`;
  document.head.appendChild(link);
}
