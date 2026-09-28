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

export function pickTheme(theme: ColorTheme, index: number): string {
  return theme[index % theme.length];
}

export function inkOn(fill: string): string {
  const [r, g, b] = parseHex(fill);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.55 ? "#111111" : "#ffffff";
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
