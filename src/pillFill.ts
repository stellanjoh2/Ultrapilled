import { pickTheme, type ColorTheme } from "./theme";
import type { TextSlot } from "./types";

type GradientSlot = Pick<TextSlot, "color" | "colorIndex" | "shape" | "stroked" | "gradient" | "gradientColor" | "gradientColorIndex">;

const GRADIENT_STOPS = 16;

function parseHex(hex: string): [number, number, number] {
  const raw = hex.replace("#", "").trim();
  const full = raw.length === 3 ? raw.split("").map((channel) => channel + channel).join("") : raw;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value) || full.length < 6) return [0, 0, 0];
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function hexOf(r: number, g: number, b: number): string {
  const channel = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const light = (max + min) / 2;
  if (max === min) return [0, 0, light];
  const delta = max - min;
  const sat = light > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;
  if (max === rn) hue = (gn - bn) / delta + (gn < bn ? 6 : 0);
  else if (max === gn) hue = (bn - rn) / delta + 2;
  else hue = (rn - gn) / delta + 4;
  return [hue / 6, sat, light];
}

function hslToRgb(hue: number, sat: number, light: number): [number, number, number] {
  if (sat === 0) {
    const gray = light * 255;
    return [gray, gray, gray];
  }
  const channel = (p: number, q: number, t: number) => {
    let k = t;
    if (k < 0) k += 1;
    if (k > 1) k -= 1;
    if (k < 1 / 6) return p + (q - p) * 6 * k;
    if (k < 1 / 2) return q;
    if (k < 2 / 3) return p + (q - p) * (2 / 3 - k) * 6;
    return p;
  };
  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;
  return [channel(p, q, hue + 1 / 3) * 255, channel(p, q, hue) * 255, channel(p, q, hue - 1 / 3) * 255];
}

/** Hue blend, so pink runs through coral into orange instead of through gray. */
export function mixHue(from: string, to: string, t: number): string {
  const amount = Math.min(1, Math.max(0, t));
  const a = rgbToHsl(...parseHex(from));
  const b = rgbToHsl(...parseHex(to));
  let dh = b[0] - a[0];
  if (dh > 0.5) dh -= 1;
  if (dh < -0.5) dh += 1;
  const [r, g, bl] = hslToRgb((a[0] + dh * amount + 1) % 1, a[1] + (b[1] - a[1]) * amount, a[2] + (b[2] - a[2]) * amount);
  return hexOf(r, g, bl);
}

type GradientEnd = {
  colorIndex?: number;
  gradientColor?: string;
  gradientColorIndex?: number;
};

export function gradientEndIndex(theme: ColorTheme, slot: GradientEnd): number {
  const count = Math.max(1, theme.length);
  const index = slot.gradientColorIndex ?? (slot.colorIndex ?? 0) + 1;
  return ((index % count) + count) % count;
}

export function gradientEnd(theme: ColorTheme, slot: GradientEnd): string {
  if (slot.gradientColor) return slot.gradientColor;
  return pickTheme(theme, gradientEndIndex(theme, slot));
}

/** Color used to pick automatic text ink. Gradients sample the middle of the blend. */
export function fillSample(theme: ColorTheme, slot: GradientSlot): string {
  const fill = slot.color ?? pickTheme(theme, slot.colorIndex ?? 0);
  if (!slot.gradient || slot.stroked) return fill;
  // Bare type: the gradient is the ink itself — mid blend for any contrast pickers.
  return mixHue(fill, gradientEnd(theme, slot), 0.5);
}

/** CSS hue interpolation — RGB-sampled hex stops used to facet and tile with a hard join. */
const HUE_SPACE = "in hsl shorter hue";

function loopUnit(t: number): number {
  return ((t % 1) + 1) % 1;
}

/**
 * Closed-loop blend: any start/end pair becomes from→to→from so a repeating
 * sweep has no seam (phase 0 and phase 1 are identical).
 */
function loopBlend(from: string, to: string, t: number): string {
  const u = loopUnit(t);
  if (u < 1e-12 || 1 - u < 1e-12) return from;
  if (Math.abs(u - 0.5) < 1e-12) return to;
  const blend = u <= 0.5 ? u * 2 : 2 - u * 2;
  return mixHue(from, to, blend);
}

/** Exact `from` / `to` at loop extrema, plus box ends — CSS `in hsl` fills the spans. */
function loopAnchors(from: string, to: string, scale?: number, phase = 0): { at: number; color: string }[] {
  const span = 2 * gradientScaleFactor(scale);
  const shift = loopUnit(phase);
  const tAt = (at: number) => at / span + shift;
  const stops: { at: number; color: string }[] = [{ at: 0, color: loopBlend(from, to, tAt(0)) }];
  const maxT = tAt(1);
  const n0 = Math.floor(tAt(0) * 2) + 1;
  for (let n = n0; ; n++) {
    const t = n / 2;
    if (t >= maxT - 1e-12) break;
    const at = span * (t - shift);
    if (at <= 1e-12 || at >= 1 - 1e-12) continue;
    stops.push({ at, color: n % 2 === 0 ? from : to });
  }
  stops.push({ at: 1, color: loopBlend(from, to, maxT) });
  return stops;
}

/** Even hue samples so canvas RGB interpolation stays colorful and has no hard bands. */
export function pillGradientStops(from: string, to: string, scale?: number): { at: number; color: string }[] {
  return sampleLoop(from, to, scale, 0);
}

function sampleLoop(from: string, to: string, scale: number | undefined, phase: number): { at: number; color: string }[] {
  const span = 2 * gradientScaleFactor(scale);
  const shift = loopUnit(phase);
  let count = Math.min(64, Math.max(GRADIENT_STOPS, Math.ceil(GRADIENT_STOPS / gradientScaleFactor(scale))));
  if (count % 2 === 0) count = Math.min(64, count + 1);
  const stops: { at: number; color: string }[] = [];
  for (let i = 0; i < count; i++) {
    const at = i / (count - 1);
    stops.push({ at, color: loopBlend(from, to, at / span + shift) });
  }
  return stops;
}

/** 90 runs left to right, matching a CSS linear-gradient. */
export const DEFAULT_GRADIENT_ANGLE = 90;

/** Mid speed ≈ 3s per loop. */
export const DEFAULT_GRADIENT_SPEED = 50;

/** Mid scale = current default tile (static A→B across the pill). */
export const DEFAULT_GRADIENT_SCALE = 50;

export function gradientAngleOf(angle: number | undefined): number {
  const value = angle ?? DEFAULT_GRADIENT_ANGLE;
  if (!Number.isFinite(value)) return DEFAULT_GRADIENT_ANGLE;
  return ((value % 360) + 360) % 360;
}

export function gradientSpeedOf(speed: number | undefined): number {
  const value = speed ?? DEFAULT_GRADIENT_SPEED;
  if (!Number.isFinite(value)) return DEFAULT_GRADIENT_SPEED;
  return Math.max(1, Math.min(100, Math.round(value)));
}

export function gradientScaleOf(scale: number | undefined): number {
  const value = scale ?? DEFAULT_GRADIENT_SCALE;
  if (!Number.isFinite(value)) return DEFAULT_GRADIENT_SCALE;
  return Math.max(1, Math.min(100, Math.round(value)));
}

/** 50 → 1×, 100 → 2×, 25 → 0.5×. */
export function gradientScaleFactor(scale?: number): number {
  return gradientScaleOf(scale) / DEFAULT_GRADIENT_SCALE;
}

/** Loop period in ms. Speed 50 → 3s, 100 → 1.5s, 25 → 6s. */
export function gradientPeriodMs(speed?: number): number {
  return 150_000 / gradientSpeedOf(speed);
}

export function gradientPhase(speed: number | undefined, timeMs: number): number {
  const period = gradientPeriodMs(speed);
  if (period <= 0) return 0;
  const t = timeMs / period;
  return t - Math.floor(t);
}

function stopList(stops: { at: number; color: string }[]): string {
  return stops.map((stop) => `${stop.color} ${(stop.at * 100).toFixed(2)}%`).join(", ");
}

/** One from→to→from period as mixHue samples. sRGB between samples has no hue-wrap seam. */
function loopTileStops(from: string, to: string): { at: number; color: string }[] {
  return sampleLoop(from, to, DEFAULT_GRADIENT_SCALE / 2, 0);
}

/**
 * Pixel stops for one period, slid by `--sweep-t` (0–1). Animating that number
 * keeps the gradient box covering the element — shifting background-position on
 * a finite tile exposed a from|to edge.
 */
function sweepStopList(from: string, to: string, periodPx: number): string {
  const period = Math.max(2, periodPx);
  return loopTileStops(from, to)
    .map((stop) => `${stop.color} calc(${(stop.at * period).toFixed(2)}px + (var(--sweep-t, 0) * ${period.toFixed(2)}px))`)
    .join(", ");
}

export function pillGradient(from: string, to: string, angle?: number, scale?: number): string {
  return `linear-gradient(${gradientAngleOf(angle)}deg ${HUE_SPACE}, ${stopList(loopAnchors(from, to, scale))})`;
}

/** Seamless from→to→from cycle for a looping sweep. phase shifts 0–1 along the axis. */
export function pillSweepStops(from: string, to: string, phase = 0, scale?: number): { at: number; color: string }[] {
  return sampleLoop(from, to, scale, phase);
}

/**
 * Horizontal repeating tile for a rotated sweep band. `--sweep-t` slides the
 * stops; the band stays fully covering so nothing from|to joins at a box edge.
 */
export function pillSweepBand(from: string, to: string, periodPx = 200): string {
  return `repeating-linear-gradient(90deg, ${sweepStopList(from, to, periodPx)})`;
}

/**
 * One from→to→from period for clipped text. `--sweep-t` (0–1) offsets every stop
 * by one period; the gradient box stays 100% so glyphs never see a tile edge.
 */
export function textSweepImage(from: string, to: string, angle?: number, periodPx = 200): string {
  return `repeating-linear-gradient(${gradientAngleOf(angle)}deg, ${sweepStopList(from, to, periodPx)})`;
}

/** Angled repeating fill for small UI previews (same `--sweep-t` as live chips). */
export function pillSweepGradient(from: string, to: string, angle?: number, scale?: number): string {
  const period = Math.max(8, 48 * gradientScaleFactor(scale));
  return `repeating-linear-gradient(${gradientAngleOf(angle)}deg, ${sweepStopList(from, to, period)})`;
}

/**
 * Cover square + tile length: rotated band fills the pill; one tile = one
 * from→to→from cycle (static A→B spans half a tile at scale 50).
 */
export function sweepBandMetrics(
  width: number,
  height: number,
  angle?: number,
  scale?: number,
): { coverPx: number; tilePx: number } {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const rad = (gradientAngleOf(angle) * Math.PI) / 180;
  const line = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
  return {
    coverPx: Math.ceil(Math.hypot(w, h) + 2),
    tilePx: Math.max(1, Math.ceil(line * 2 * gradientScaleFactor(scale))),
  };
}

/** CSS angle: 0 points up, 90 points right. Ends sit on the box edges. */
export function gradientLine(width: number, height: number, angle?: number): { x0: number; y0: number; x1: number; y1: number } {
  const rad = (gradientAngleOf(angle) * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const half = Math.abs((width / 2) * dx) + Math.abs((height / 2) * dy);
  const cx = width / 2;
  const cy = height / 2;
  return {
    x0: cx - dx * half,
    y0: cy - dy * half,
    x1: cx + dx * half,
    y1: cy + dy * half,
  };
}

/** Canvas fill for gradient text ink (bare type or export). */
export function textGradientFill(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  from: string,
  to: string,
  angle?: number,
  scale?: number,
  phase?: number,
): CanvasGradient {
  const line = gradientLine(width, height, angle);
  const gradient = ctx.createLinearGradient(line.x0, line.y0, line.x1, line.y1);
  const stops = phase == null ? pillGradientStops(from, to, scale) : pillSweepStops(from, to, phase, scale);
  for (const stop of stops) gradient.addColorStop(stop.at, stop.color);
  return gradient;
}
