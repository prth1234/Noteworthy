export interface ThemeMeta { id: string; label: string; kind: "Light" | "Dark" }

export const THEMES: ThemeMeta[] = [
  { id: "light-graphite", label: "Light Graphite", kind: "Light" },
  { id: "pure-light", label: "Pure Light", kind: "Light" },
  { id: "sepia", label: "Sepia", kind: "Light" },
  { id: "warm-paper", label: "Warm Paper", kind: "Light" },
  { id: "slate", label: "Slate", kind: "Light" },
  { id: "nord", label: "Nord Light", kind: "Light" },
  { id: "solarized-light", label: "Solarized Light", kind: "Light" },
  { id: "forest", label: "Forest", kind: "Light" },
  { id: "ocean", label: "Ocean", kind: "Light" },
  { id: "rose", label: "Rosé", kind: "Light" },
  { id: "monochrome", label: "Monochrome", kind: "Light" },
  { id: "dark-graphite", label: "Dark Graphite", kind: "Dark" },
  { id: "pure-dark", label: "Pure Dark", kind: "Dark" },
  { id: "midnight", label: "Midnight", kind: "Dark" },
  { id: "nord-dark", label: "Nord Dark", kind: "Dark" },
  { id: "solarized-dark", label: "Solarized Dark", kind: "Dark" },
];
