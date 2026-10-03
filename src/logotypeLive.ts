import { fillLuminance, logotypePillColor, type ColorTheme } from "./theme";

/** How many wordmark letterforms take a theme color at once. */
const LIT_COUNT = 5;

export type HeaderLogotypeSource = {
  theme: ColorTheme;
  backdrop: string;
};

type HeaderLogotype = {
  /** Repaint the current letters from the active theme. Does not pick new ones. */
  refresh(): void;
  /** Pick a new set of letterforms. Used when the color theme changes. */
  retarget(): void;
  stop(): void;
};

function parseHex(hex: string): [number, number, number] {
  const raw = hex.replace("#", "").trim();
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw.slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hexByte(n: number): string {
  return Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");
}

/** Mix `from` toward `to` by `t` (0 = from, 1 = to). */
function mixHex(from: string, to: string, t: number): string {
  const [ar, ag, ab] = parseHex(from);
  const [br, bg, bb] = parseHex(to);
  const k = Math.min(1, Math.max(0, t));
  return `#${hexByte(ar + (br - ar) * k)}${hexByte(ag + (bg - ag) * k)}${hexByte(ab + (bb - ab) * k)}`;
}

function normHex(hex: string): string {
  const [r, g, b] = parseHex(hex);
  return `#${hexByte(r)}${hexByte(g)}${hexByte(b)}`;
}

function channelPeak(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return Math.max(r, g, b) / 255;
}

/** Still reads on the black canvas — bright enough, or a neon with a strong channel. */
function readableOnBlack(hex: string): boolean {
  const lum = fillLuminance(hex);
  if (lum >= 0.2) return true;
  return lum >= 0.08 && channelPeak(hex) >= 0.55;
}

/**
 * Second hover color: a mid/darker swatch from the same theme.
 * Falls back to a darker mix of the accent when the palette has no usable stop,
 * kept light enough to stay visible on black.
 */
export function logotypeShadeColor(theme: ColorTheme, accent: string): string {
  const accentKey = normHex(accent);
  const accentLum = fillLuminance(accent);
  const others = theme.filter((c) => normHex(c) !== accentKey);
  const visible = others.filter(readableOnBlack);
  const darker = visible.filter((c) => fillLuminance(c) < accentLum - 0.06);
  const pool = (darker.length ? darker : visible).filter((c) => fillLuminance(c) <= 0.82);
  if (pool.length) {
    return pool.slice().sort((a, b) => Math.abs(fillLuminance(a) - 0.34) - Math.abs(fillLuminance(b) - 0.34))[0]!;
  }
  let mixed = mixHex(accent, "#000000", accentLum > 0.45 ? 0.46 : 0.28);
  if (!readableOnBlack(mixed) || Math.abs(fillLuminance(mixed) - accentLum) < 0.08) {
    mixed = mixHex(accent, "#3a3a3a", accentLum < 0.3 ? 0.4 : 0.55);
  }
  if (normHex(mixed) === accentKey) mixed = mixHex(accent, "#000000", 0.35);
  return mixed;
}

/** First five swatches, repeating if the theme is shorter. */
function paletteFive(theme: readonly string[]): string[] {
  const src = theme.length ? theme : ["#ffffff"];
  return Array.from({ length: LIT_COUNT }, (_, i) => src[i % src.length]!);
}

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** `take` distinct indices, sorted. Avoids repeating the previous set when the theme changes. */
function pickIndices(count: number, take: number, avoid: readonly number[]): number[] {
  const n = Math.min(take, count);
  const bag = Array.from({ length: count }, (_, i) => i);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = bag[i]!;
    bag[i] = bag[j]!;
    bag[j] = tmp;
  }
  let next = bag.slice(0, n).sort((a, b) => a - b);
  if (avoid.length && sameSet(next, avoid) && count > n) {
    const replacement = bag[n];
    if (replacement !== undefined) {
      next = [...next.slice(1), replacement].sort((a, b) => a - b);
    }
  }
  return next;
}

/** Header wordmark letters only — not the intro or mode-select copies, not the TM. */
function letterPaths(root: HTMLElement): SVGPathElement[] {
  const layer = root.querySelector(".logotype-reveal__layer--white");
  if (!layer) return [];
  return [...layer.querySelectorAll<SVGPathElement>(".logotype__glyph, .logotype__pill")].filter(
    (path) => !path.classList.contains("logotype__tm"),
  );
}

/**
 * Header wordmark. Five letterforms (Ultrapilled, including the pill, excluding TM)
 * take the active theme's first five swatches. The set is chosen once, when the
 * mark mounts, and again only when the color theme changes — not on a timer.
 * Hover paints the unlit letters in the theme accent and the lit ones in a
 * mid/darker theme color. Reduced motion still shows the colors, with no shuffle.
 */
export function mountHeaderLogotype(root: HTMLElement, read: () => HeaderLogotypeSource): HeaderLogotype {
  const letters = letterPaths(root);
  if (!letters.length) return { refresh() {}, retarget() {}, stop() {} };

  let lit = pickIndices(letters.length, LIT_COUNT, []);
  let hovering = false;

  const applyRest = () => {
    const colors = paletteFive(read().theme);
    letters.forEach((el, index) => {
      const slot = lit.indexOf(index);
      el.style.fill = slot >= 0 ? colors[slot]! : "var(--logotype-ink)";
    });
  };

  const applyHover = () => {
    const { theme, backdrop } = read();
    const accent = logotypePillColor(theme, backdrop);
    const shade = logotypeShadeColor(theme, accent);
    const litSet = new Set(lit);
    letters.forEach((el, index) => {
      el.style.fill = litSet.has(index) ? shade : accent;
    });
  };

  const paint = () => {
    if (hovering) applyHover();
    else applyRest();
  };

  const onEnter = () => {
    hovering = true;
    applyHover();
  };
  const onLeave = () => {
    hovering = false;
    applyRest();
  };

  root.addEventListener("pointerenter", onEnter);
  root.addEventListener("pointerleave", onLeave);
  paint();

  return {
    refresh: paint,
    retarget() {
      lit = pickIndices(letters.length, LIT_COUNT, lit);
      paint();
    },
    stop() {
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
      for (const el of letters) el.style.removeProperty("fill");
    },
  };
}
