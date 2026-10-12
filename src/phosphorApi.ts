import { icons, type IconEntry } from "@phosphor-icons/core";

export const PHOSPHOR_PER_PAGE = 24;
export const PHOSPHOR_HOME = "https://phosphoricons.com/";

/** Solid = fill weight; Outlined = regular weight. */
export type PhosphorStyle = "fill" | "regular";

export const PHOSPHOR_STYLES: { id: PhosphorStyle; label: string }[] = [
  { id: "fill", label: "Solid" },
  { id: "regular", label: "Outlined" },
];

/** Curated empty-state picks that read well on the canvas. */
export const FEATURED_PHOSPHOR = [
  "heart",
  "star",
  "lightning",
  "fire",
  "sparkle",
  "smiley",
  "rocket",
  "planet",
  "cat",
  "dog",
  "coffee",
  "music-notes",
  "crown",
  "ghost",
  "moon",
  "sun",
  "cloud",
  "flower",
  "game-controller",
  "camera",
  "airplane-tilt",
  "bicycle",
  "pizza",
  "ice-cream",
] as const;

export type PhosphorIcon = {
  /** Remote id: `fill:heart` / `regular:heart` (legacy bare name = fill). */
  id: string;
  name: string;
  style: PhosphorStyle;
  label: string;
  tags: string[];
  categories: string[];
  thumb: string;
};

export type PhosphorSearchPage = {
  icons: PhosphorIcon[];
  total: number;
  totalPages: number;
  page: number;
};

const fillUrls = import.meta.glob("../node_modules/@phosphor-icons/core/assets/fill/*.svg", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

const regularUrls = import.meta.glob("../node_modules/@phosphor-icons/core/assets/regular/*.svg", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

const urlByStyleName = {
  fill: new Map<string, string>(),
  regular: new Map<string, string>(),
} as const;

for (const [path, url] of Object.entries(fillUrls)) {
  const match = /\/([^/]+)-fill\.svg$/i.exec(path);
  if (match?.[1]) urlByStyleName.fill.set(match[1], url);
}
for (const [path, url] of Object.entries(regularUrls)) {
  const match = /\/([^/]+)\.svg$/i.exec(path);
  if (match?.[1]) urlByStyleName.regular.set(match[1], url);
}

const byName = new Map<string, IconEntry>();
for (const entry of icons as readonly IconEntry[]) {
  byName.set(entry.name, entry);
  if (entry.alias?.name) byName.set(entry.alias.name, entry);
}

function labelOf(entry: IconEntry): string {
  return entry.pascal_name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

export function phosphorRemoteId(style: PhosphorStyle, name: string): string {
  return `${style}:${name}`;
}

export function parsePhosphorRemoteId(id: string): { style: PhosphorStyle; name: string } | null {
  const styled = /^(fill|regular):([a-z0-9-]+)$/i.exec(id.trim());
  if (styled?.[1] && styled[2]) {
    return { style: styled[1].toLowerCase() as PhosphorStyle, name: styled[2].toLowerCase() };
  }
  // Legacy bare name from the first ship = solid fill.
  if (/^[a-z0-9-]+$/i.test(id.trim())) {
    return { style: "fill", name: id.trim().toLowerCase() };
  }
  return null;
}

function mapEntry(entry: IconEntry, style: PhosphorStyle): PhosphorIcon | null {
  const thumb = urlByStyleName[style].get(entry.name);
  if (!thumb) return null;
  return {
    id: phosphorRemoteId(style, entry.name),
    name: entry.name,
    style,
    label: labelOf(entry),
    tags: [...entry.tags],
    categories: [...entry.categories],
    thumb,
  };
}

function scoreEntry(entry: IconEntry, q: string): number {
  const name = entry.name.toLowerCase();
  const label = labelOf(entry).toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (label.startsWith(q)) return 70;
  if (name.includes(q)) return 50;
  if (label.includes(q)) return 40;
  if (entry.tags.some((tag) => tag.toLowerCase().includes(q))) return 30;
  if (entry.categories.some((cat) => cat.toLowerCase().includes(q))) return 20;
  if (entry.alias?.name.toLowerCase().includes(q)) return 15;
  return 0;
}

/** Always available — icons ship with the app. */
export function phosphorConfigured(): boolean {
  return urlByStyleName.fill.size > 0 && urlByStyleName.regular.size > 0;
}

export function searchPhosphor(
  query: string,
  page = 1,
  style: PhosphorStyle = "fill",
): PhosphorSearchPage {
  const q = query.trim().toLowerCase();
  const safePage = Math.max(1, Math.floor(page));

  let matched: IconEntry[];
  if (!q) {
    matched = FEATURED_PHOSPHOR.map((name) => byName.get(name)).filter(
      (entry): entry is IconEntry => Boolean(entry),
    );
  } else {
    matched = (icons as readonly IconEntry[])
      .map((entry) => ({ entry, score: scoreEntry(entry, q) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
      .map((row) => row.entry);
  }

  const total = matched.length;
  const totalPages = Math.max(1, Math.ceil(total / PHOSPHOR_PER_PAGE));
  const start = (safePage - 1) * PHOSPHOR_PER_PAGE;
  const slice = matched.slice(start, start + PHOSPHOR_PER_PAGE);
  return {
    icons: slice.map((entry) => mapEntry(entry, style)).filter((icon): icon is PhosphorIcon => Boolean(icon)),
    total,
    totalPages,
    page: Math.min(safePage, totalPages),
  };
}

/** Solid black fill so `<img>` / mask recolor work (Phosphor ships `currentColor`). */
export function phosphorSvgMarkup(raw: string): string {
  return raw.replaceAll('fill="currentColor"', 'fill="#000000"');
}

export async function phosphorIconFile(icon: PhosphorIcon): Promise<File> {
  const url = urlByStyleName[icon.style].get(icon.name);
  if (!url) throw new Error(`Missing Phosphor icon: ${icon.style}/${icon.name}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn’t load ${icon.name}`);
  const raw = await res.text();
  const blob = new Blob([phosphorSvgMarkup(raw)], { type: "image/svg+xml" });
  return new File([blob], `phosphor-${icon.style}-${icon.name}.svg`, { type: "image/svg+xml" });
}

export async function getPhosphorIcon(id: string): Promise<PhosphorIcon> {
  const parsed = parsePhosphorRemoteId(id);
  if (!parsed) throw new Error(`Unknown Phosphor icon: ${id}`);
  const entry = byName.get(parsed.name);
  const mapped = entry ? mapEntry(entry, parsed.style) : null;
  if (!mapped) throw new Error(`Unknown Phosphor icon: ${id}`);
  return mapped;
}
