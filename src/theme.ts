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

function formatHex(rgb: [number, number, number]): string {
  return `#${rgb
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Mix `hex` toward white by `amount` (0–1). */
export function mixTowardWhite(hex: string, amount: number): string {
  const t = Math.max(0, Math.min(1, amount));
  const [r, g, b] = parseHex(hex);
  return formatHex([r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t]);
}

/** Brighten while keeping channel ratios (hue/chroma), unlike a wash toward white. */
export function liftKeepingHue(hex: string, amount: number): string {
  const scale = 1 + Math.max(0, amount);
  const [r, g, b] = parseHex(hex);
  return formatHex([Math.min(255, r * scale), Math.min(255, g * scale), Math.min(255, b * scale)]);
}

/** Same weighted luminance as inkOn — 0 dark, 1 bright. */
export function fillLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** True when stage and a theme swatch are the same (or both too dark to separate). */
export function stageClashesWithTheme(stage: string, color: string): boolean {
  if (stage.toLowerCase() === color.toLowerCase()) return true;
  const [sr, sg, sb] = parseHex(stage);
  const [cr, cg, cb] = parseHex(color);
  // Near-identical RGB only — different dark tints can sit close in luma.
  if (Math.hypot(sr - cr, sg - cg, sb - cb) < 14) return true;
  const stageLum = fillLuminance(stage);
  const colorLum = fillLuminance(color);
  // Pitch-black type on a pitch-black stage — objects disappear.
  if (stageLum < 0.1 && colorLum < 0.1 && Math.abs(stageLum - colorLum) < 0.03) return true;
  return false;
}

/**
 * Keep the stage distinct from every theme swatch so dark objects stay visible.
 * Prefers a chroma-preserving lift; only washes toward white to escape near-black traps.
 */
export function ensureStageDistinct(stage: string, colors: readonly string[]): string {
  let next = stage;
  for (let pass = 0; pass < 12; pass++) {
    const conflict = colors.find((color) => stageClashesWithTheme(next, color));
    if (!conflict) return next;
    if (fillLuminance(next) < 0.14 && fillLuminance(conflict) < 0.14) {
      next = mixTowardWhite(next, 0.1);
    } else {
      next = liftKeepingHue(next, 0.14);
    }
  }
  return next;
}

/**
 * Palette stage from an authored dark pairing (not one of the five object colours).
 * Light touch only — themes keep their own depth and tint.
 */
export function resolveThemeStage(base: string, colors: readonly string[]): string {
  return ensureStageDistinct(liftKeepingHue(base, 0.08), colors);
}

/**
 * Grid line colour for a theme — first swatch that reads on the stage,
 * else black/white auto ink.
 */
export function pickGridColor(theme: ColorTheme, stage: string): string {
  const backLum = fillLuminance(stage);
  for (const hex of theme) {
    if (!hex) continue;
    const [r, g, b] = parseHex(hex);
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const peak = Math.max(r, g, b) / 255;
    const span = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    // Brighter than stage, vivid neon accents, or dark lines on light stages.
    if (lum >= backLum + 0.18) return hex;
    if (peak >= 0.75 && span >= 0.25 && Math.abs(lum - backLum) >= 0.05) return hex;
    if (backLum >= 0.55 && lum <= backLum - 0.22) return hex;
  }
  return backLum > 0.55 ? "#111111" : "#ffffff";
}

/**
 * Post bloom only on bright fills so mid/dark grays stay hard-edged.
 * Rec.709 luma floor (aligned with inkOn bright bar); peak-channel escape
 * so deep neon blues/purples/pinks still glow without letting mid-gray sneak through.
 */
export const BLOOM_MIN_LUMINANCE = 0.55;
export const BLOOM_MIN_PEAK = 0.75;

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
