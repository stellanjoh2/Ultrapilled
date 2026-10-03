import { fillLuminance, type ColorTheme } from "./theme";

/** How many wordmark letterforms take a theme color at rest. */
const LIT_COUNT = 5;
/** Hover reassigns theme colors across the letterforms twice a second. */
const HOVER_MS = 500;
/**
 * Minimum Rec.709 luminance gap against the canvas fill.
 * Below this a letter is treated as the same colour as the background.
 */
export const LOGOTYPE_MIN_LUM_GAP = 0.3;

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

function lumGap(hex: string, backdrop: string): number {
  return Math.abs(fillLuminance(hex) - fillLuminance(backdrop));
}

function contrasts(hex: string, backdrop: string): boolean {
  return lumGap(hex, backdrop) >= LOGOTYPE_MIN_LUM_GAP;
}

/**
 * Ink for uncolored letters and the TM. White on a dark canvas, near-black on a
 * light one — whichever clears the luminance gap.
 */
export function logotypeInk(backdrop: string): string {
  const ink = fillLuminance(backdrop) > 0.55 ? "#111111" : "#ffffff";
  if (contrasts(ink, backdrop)) return ink;
  const other = ink === "#ffffff" ? "#111111" : "#ffffff";
  return contrasts(other, backdrop) ? other : ink;
}

/** Darken on a light canvas, lighten on a dark one, until the gap clears. */
function shiftUntil(hex: string, backdrop: string): string {
  if (contrasts(hex, backdrop)) return hex;
  const toward = fillLuminance(backdrop) >= 0.5 ? "#000000" : "#ffffff";
  for (let step = 1; step <= 12; step++) {
    const next = mixHex(hex, toward, step / 12);
    if (contrasts(next, backdrop)) return next;
  }
  return fillLuminance(backdrop) >= 0.5 ? "#111111" : "#ffffff";
}

/**
 * Keep a theme swatch when it clears the canvas. Otherwise another swatch that
 * does, or a luminance shift of the original. `used` avoids collapsing every
 * letter onto the same remaining swatch.
 */
function resolveSwatch(
  preferred: string,
  theme: readonly string[],
  backdrop: string,
  used?: Set<string>,
): string {
  if (contrasts(preferred, backdrop)) {
    used?.add(normHex(preferred));
    return preferred;
  }
  const alt = theme.find((swatch) => contrasts(swatch, backdrop) && !used?.has(normHex(swatch)));
  if (alt) {
    used?.add(normHex(alt));
    return alt;
  }
  const shifted = shiftUntil(preferred, backdrop);
  used?.add(normHex(shifted));
  return shifted;
}

function paletteFive(theme: readonly string[], backdrop: string): string[] {
  const src = theme.length ? theme : ["#ffffff"];
  const used = new Set<string>();
  return Array.from({ length: LIT_COUNT }, (_, i) => resolveSwatch(src[i % src.length]!, src, backdrop, used));
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

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Header wordmark letters only — not the intro or mode-select copies, not the TM. */
function letterPaths(root: HTMLElement): SVGPathElement[] {
  const layer = root.querySelector(".logotype-reveal__layer--white");
  if (!layer) return [];
  return [...layer.querySelectorAll<SVGPathElement>(".logotype__glyph, .logotype__pill")].filter(
    (path) => !path.classList.contains("logotype__tm"),
  );
}

function tmPaths(root: HTMLElement): SVGPathElement[] {
  const layer = root.querySelector(".logotype-reveal__layer--white");
  if (!layer) return [];
  return [...layer.querySelectorAll<SVGPathElement>(".logotype__tm")];
}

/**
 * Header wordmark. Five letterforms (Ultrapilled, including the pill, excluding TM)
 * take the active theme once on mount and again when the color theme changes.
 * Every fill is checked against the canvas backdrop: a swatch within
 * LOGOTYPE_MIN_LUM_GAP is replaced by another theme color or luminance-shifted.
 * Hover reassigns a random theme color on every letterform every 500ms, then
 * the resting five return. Reduced motion does not run the hover cycle.
 */
export function mountHeaderLogotype(root: HTMLElement, read: () => HeaderLogotypeSource): HeaderLogotype {
  const letters = letterPaths(root);
  const tms = tmPaths(root);
  if (!letters.length) return { refresh() {}, retarget() {}, stop() {} };

  let lit = pickIndices(letters.length, LIT_COUNT, []);
  let hovering = false;
  /** Raw theme index per letter during hover, re-resolved when the backdrop changes. */
  let hoverPicks: number[] = [];
  let timer = 0;

  const paintInk = (backdrop: string) => {
    const ink = logotypeInk(backdrop);
    for (const el of tms) el.style.fill = ink;
  };

  const applyRest = () => {
    const { theme, backdrop } = read();
    const colors = paletteFive(theme, backdrop);
    const ink = logotypeInk(backdrop);
    letters.forEach((el, index) => {
      const slot = lit.indexOf(index);
      el.style.fill = slot >= 0 ? colors[slot]! : ink;
    });
    paintInk(backdrop);
  };

  const applyHover = () => {
    const { theme, backdrop } = read();
    const src = theme.length ? theme : ["#ffffff"];
    letters.forEach((el, index) => {
      const preferred = src[(hoverPicks[index] ?? 0) % src.length]!;
      el.style.fill = resolveSwatch(preferred, src, backdrop);
    });
    paintInk(backdrop);
  };

  const rollHover = () => {
    const { theme } = read();
    const n = Math.max(1, theme.length);
    hoverPicks = letters.map(() => Math.floor(Math.random() * n));
    applyHover();
  };

  const paint = () => {
    if (hovering) applyHover();
    else applyRest();
  };

  const stopTimer = () => {
    if (!timer) return;
    window.clearInterval(timer);
    timer = 0;
  };

  const startTimer = () => {
    if (timer || reducedMotion()) return;
    timer = window.setInterval(() => {
      if (!hovering || reducedMotion()) return;
      rollHover();
    }, HOVER_MS);
  };

  const onEnter = () => {
    hovering = true;
    rollHover();
    startTimer();
  };
  const onLeave = () => {
    hovering = false;
    stopTimer();
    applyRest();
  };

  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onMq = () => {
    if (mq.matches) stopTimer();
    else if (hovering) startTimer();
  };

  root.addEventListener("pointerenter", onEnter);
  root.addEventListener("pointerleave", onLeave);
  mq.addEventListener("change", onMq);
  applyRest();

  return {
    refresh: paint,
    retarget() {
      lit = pickIndices(letters.length, LIT_COUNT, lit);
      if (!hovering) applyRest();
    },
    stop() {
      stopTimer();
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
      mq.removeEventListener("change", onMq);
      for (const el of [...letters, ...tms]) el.style.removeProperty("fill");
    },
  };
}
