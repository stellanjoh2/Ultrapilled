export type ColorTheme = string[];

/** Orby White, Lime, Purple, Blue, and Pink. https://orby.studio/brand/ */
export const DEFAULT_THEME: ColorTheme = ["#ffffff", "#c4ff00", "#3b00ff", "#00c4ff", "#ff00c4"];

/** Orby Black. */
export const DEFAULT_STAGE = "#080808";

function parseHex(hex: string): [number, number, number] {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Same weighted luminance as inkOn — 0 dark, 1 bright. */
export function fillLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Post bloom ignores near-black fills so dark shapes stay hard-edged.
 * Rec.709 luma floor; peak-channel escape so deep neon blues/purples still glow.
 */
export const BLOOM_MIN_LUMINANCE = 0.18;
export const BLOOM_MIN_PEAK = 0.5;

/** True when a solid fill is bright enough to contribute to bloom. */
export function fillBlooms(hex: string): boolean {
  const [r, g, b] = parseHex(hex);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (lum >= BLOOM_MIN_LUMINANCE) return true;
  return Math.max(r, g, b) / 255 >= BLOOM_MIN_PEAK;
}

export function pickTheme(theme: ColorTheme, index: number): string {
  return theme[index % theme.length];
}

export function inkOn(fill: string): string {
  return fillLuminance(fill) > 0.55 ? "#111111" : "#ffffff";
}

/**
 * Logotype pill accent. Prefers theme[1] (primary), then other swatches —
 * skips fills too close to the backdrop so the mark stays visible on bright stages.
 */
export function logotypePillColor(theme: ColorTheme, backdrop: string): string {
  const backLum = fillLuminance(backdrop);
  const readable = (hex: string) => Math.abs(fillLuminance(hex) - backLum) >= 0.22;
  for (const index of [1, 2, 3, 4, 0]) {
    const hex = theme[index];
    if (hex && readable(hex)) return hex;
  }
  return theme[1] ?? theme[0] ?? "#ffffff";
}

/** Auto-contrast ink when no text colour is chosen. Not theme swatches — pick via the colour picker. */
export const TEXT_BLACK = "#000000";
export const TEXT_WHITE = "#ffffff";

/** Chosen text colour, or readable auto ink on filled shapes. */
export function resolveTextColor(
  theme: ColorTheme,
  shapeFill: string,
  solid: boolean,
  textColorIndex: number | undefined,
  textColor: string | undefined,
): string {
  if (textColor) return textColor;
  if (textColorIndex != null && theme[textColorIndex]) return theme[textColorIndex];
  if (!solid) return shapeFill;
  return inkOn(shapeFill) === "#ffffff" ? TEXT_WHITE : TEXT_BLACK;
}

/**
 * Theme chip to highlight in the text-colour row.
 * Returns -1 when auto-contrast ink is used (not a theme colour).
 */
export function resolveTextSwatchIndex(
  _theme: ColorTheme,
  _shapeFill: string,
  solid: boolean,
  shapeIndex: number,
  textColorIndex: number | undefined,
): number {
  if (textColorIndex != null) return textColorIndex;
  if (!solid) return shapeIndex;
  return -1;
}
