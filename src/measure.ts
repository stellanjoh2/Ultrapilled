import { measureEmojiBox } from "./emojis";
import { peekTrim } from "./trim";
import { wrapTextFieldLines } from "./textField";
import {
  isTextField,
  TEXT_FIELD_AUTO_LINE_EM,
  TEXT_FIELD_BOX_MIN,
  textFieldBoxH,
  textFieldBoxW,
  textFieldLineHeight,
  type ImageSlot,
  type Slot,
  type TextSlot,
} from "./types";

export type ChipSize = { width: number; height: number };

/** Ink AABB for bare type — physics box and paint origin. */
export type TextInk = ChipSize & {
  /** Distance from box left to the fillText origin (textAlign left). */
  originX: number;
  /** Distance from box top to the alphabetic baseline. */
  baseline: number;
  /** Layout advance width (contenteditable / CSS), may exceed ink width. */
  advance: number;
};

const measureCtx = document.createElement("canvas").getContext("2d");

export function trackingEm(slider: number): number {
  return (slider / 100) * 0.04;
}

/**
 * How far a glyph’s ink sticks past its advance box (CSS px, identity CTM).
 * Negative letter-spacing tightens layout width to advances; last/first stems still
 * paint outside that box — callers pad clip/layout so overflow:hidden won’t crop.
 */
export function textGlyphSideOverhangs(
  font: string,
  firstChar: string,
  lastChar: string = firstChar,
): { left: number; right: number } {
  if (!measureCtx) return { left: 0, right: 0 };
  measureCtx.font = font;
  measureCtx.letterSpacing = "0px";
  const first = !firstChar || firstChar === " " ? "\u00a0" : firstChar;
  const last = !lastChar || lastChar === " " ? "\u00a0" : lastChar;
  const fm = measureCtx.measureText(first);
  const lm = last === first ? fm : measureCtx.measureText(last);
  const left = Math.max(0, fm.actualBoundingBoxLeft ?? 0);
  const right = Math.max(0, (lm.actualBoundingBoxRight ?? 0) - (lm.width || 0));
  return { left, right };
}

/** A word's own pill padding, or the global slider while it still follows that. */
export function pillPadOf(slot: Slot, globalPad: number): number {
  return slot.kind === "text" && slot.pillPad != null ? slot.pillPad : globalPad;
}

/** A word's own tracking, or the global slider while it still follows that. */
export function trackingOf(slot: Slot, globalTracking: number): number {
  return slot.kind === "text" && slot.tracking != null ? slot.tracking : globalTracking;
}

/** Inset for wrapped copy inside a text field (shape padding when a holding shape is on). */
export function textFieldPad(
  slot: TextSlot,
  width: number,
  height: number,
  globalPad = 14,
): { x: number; y: number } {
  if (slot.shape === "none") {
    const p = Math.max(2, slot.fontSize * 0.12);
    return { x: p, y: p };
  }
  const pad = pillPadOf(slot, globalPad) / 50;
  const y = Math.max(4, Math.round(slot.fontSize * 0.45 * pad));
  let x = Math.max(y, Math.round(slot.fontSize * 0.85 * pad), 4);
  if (slot.shape === "pill") x = Math.max(x, Math.round(Math.min(width, height) * 0.22));
  return {
    x: Math.max(2, Math.min(x, width / 2 - 2)),
    y: Math.max(2, Math.min(y, height / 2 - 2)),
  };
}

/** 50 is optically centered. Higher lifts the glyphs. */
export function textShiftEm(slider: number): number {
  return ((50 - slider) / 50) * 0.35;
}

/**
 * Bleed outside actualBoundingBox* so antialiased glyph edges aren't clipped by
 * the ink canvas / physics box (visible on round bottoms and final stems).
 */
export const TEXT_INK_PAD = 2;

/** CSS em-box ascent (top → alphabetic baseline) for matching DOM to canvas paint. */
export function measureTextFontAscent(slot: TextSlot): number {
  if (!measureCtx) return slot.fontSize * 0.8;
  measureCtx.font = `${slot.fontWeight} ${slot.fontSize}px "${slot.fontFamily}", sans-serif`;
  measureCtx.letterSpacing = "0px";
  const metrics = measureCtx.measureText(slot.text || "M");
  return (
    metrics.fontBoundingBoxAscent ??
    metrics.actualBoundingBoxAscent ??
    slot.fontSize * 0.8
  );
}

/** Tight letterform bounds for free-standing type (no holding shape). */
export function measureTextInk(slot: TextSlot, tracking = 0.02): TextInk {
  const fallback = Math.max(8, Math.ceil(slot.fontSize) + TEXT_INK_PAD * 2);
  if (!measureCtx) {
    return {
      width: fallback,
      height: fallback,
      originX: TEXT_INK_PAD,
      baseline: fallback * 0.8,
      advance: fallback,
    };
  }

  measureCtx.font = `${slot.fontWeight} ${slot.fontSize}px "${slot.fontFamily}", sans-serif`;
  // Measure unspaced, then add tracking per gap. Canvas letterSpacing (when honored)
  // folds a trailing gap into width and would disagree with this ink box.
  measureCtx.letterSpacing = "0px";
  const text = slot.text || " ";
  const metrics = measureCtx.measureText(text);
  const left = metrics.actualBoundingBoxLeft ?? 0;
  const right = metrics.actualBoundingBoxRight ?? 0;
  // Use ?? so a real 0 (e.g. "HI" has no descenders) is kept — || would
  // fall through to fontBoundingBox* and inflate the collision box.
  const ascent =
    metrics.actualBoundingBoxAscent ??
    metrics.fontBoundingBoxAscent ??
    slot.fontSize * 0.8;
  const descent =
    metrics.actualBoundingBoxDescent ??
    metrics.fontBoundingBoxDescent ??
    slot.fontSize * 0.2;
  const gaps = Math.max(0, text.length - 1);
  const trackPx = slot.fontSize * tracking * gaps;
  const inkW = left + right + trackPx;
  const advance = (metrics.width || slot.fontSize) + trackPx;
  // Prefer ink for tight physics nesting; fall back to advance when ink is missing.
  const width = Math.max(1, Math.ceil((inkW > 0 ? inkW : advance) + TEXT_INK_PAD * 2));
  const height = Math.max(1, Math.ceil(ascent + descent + TEXT_INK_PAD * 2));

  return {
    width,
    height,
    originX: left + TEXT_INK_PAD,
    baseline: ascent + TEXT_INK_PAD,
    advance: Math.max(1, Math.ceil(advance)),
  };
}

/**
 * Contenteditable sizes to advance width, which can exceed the ink AABB.
 * Use while typing so glyphs / caret aren't clipped by the chip box.
 */
export function measureTextEditSize(slot: TextSlot, pad = 1, tracking = 0.02): ChipSize {
  if (isTextField(slot)) return measureTextSlot(slot, pad, tracking);
  const caret = Math.max(2, Math.ceil(slot.fontSize * 0.08));
  if (slot.shape !== "none") {
    const base = measureTextSlot(slot, pad, tracking);
    return { width: base.width + caret, height: base.height };
  }
  const ink = measureTextInk(slot, tracking);
  return {
    width: Math.max(ink.width, ink.advance) + caret,
    height: ink.height,
  };
}

/** Per-glyph pose for bare letter-cycle (y in CSS px, alpha 0..1). */
export type GlyphPose = { y: number; alpha: number };

/**
 * Horizontal caret starts for each glyph, matching fillText + letterSpacing + kerning.
 * Canvas measureText ignores letterSpacing, so gaps are added explicitly; pair kerning
 * is recovered from measureText(a+b) - measureText(a) - measureText(b).
 * Always measure on the shared untransformed probe — a live paint ctx may carry a DPR
 * setTransform, and measureText under that CTM skews advances after scale (tracking snapback).
 */
export function textInkGlyphStarts(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  tracking: number,
  originX: number,
): number[] {
  const chars = [...text];
  const spacing = fontSize * tracking;
  // Measure on the shared probe (identity CTM). Anim frames setTransform(dpr) on
  // the paint ctx; measureText under that matrix skews advances after scale so
  // glyphs sit too tight inside a correctly wide ink box (tracking "snapback").
  const probe = measureCtx ?? ctx;
  probe.font = ctx.font;
  probe.letterSpacing = "0px";
  const starts: number[] = [];
  let x = originX;
  for (let i = 0; i < chars.length; i++) {
    starts.push(x);
    const ch = chars[i] === " " ? "\u00a0" : chars[i]!;
    const w = probe.measureText(ch).width;
    if (i < chars.length - 1) {
      const next = chars[i + 1] === " " ? "\u00a0" : chars[i + 1]!;
      const pairW = probe.measureText(ch + next).width;
      const nextW = probe.measureText(next).width;
      const kern = pairW - w - nextW;
      x += w + kern + spacing;
    } else {
      x += w;
    }
  }
  return starts;
}

/** Paint glyphs into an ink-tight box. Origin matches measureTextInk. */
export function paintTextInk(
  ctx: CanvasRenderingContext2D,
  slot: TextSlot,
  tracking: number,
  color: string | CanvasGradient,
  shiftEm: number,
  ink: TextInk = measureTextInk(slot, tracking),
  /** Per-glyph y/alpha for bare letter-cycle. Omit (or all rest) for static ink. */
  poses?: GlyphPose[] | null,
) {
  const text = slot.text || "";
  const chars = [...text];
  const n = chars.length;
  if (n === 0) return;
  const fontSize = slot.fontSize;
  const baselineY = ink.baseline + shiftEm * fontSize;

  ctx.font = `${slot.fontWeight} ${fontSize}px "${slot.fontFamily}", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  // Always glyph-by-glyph with the same starts — static and Animate share layout
  // (pair kerning + tracking). Never clip a full-string draw (that shredded letters).
  const starts = textInkGlyphStarts(ctx, text, fontSize, tracking, ink.originX);
  ctx.letterSpacing = "0px";

  for (let i = 0; i < n; i++) {
    const pose = poses?.[i] ?? { y: 0, alpha: 1 };
    if (pose.alpha < 0.001) continue;
    const ch = chars[i] === " " ? "\u00a0" : chars[i]!;
    ctx.save();
    ctx.globalAlpha *= pose.alpha;
    ctx.fillText(ch, starts[i]!, baselineY + pose.y);
    ctx.restore();
  }
}

/**
 * Ink width of a shaped run once the last glyph no longer carries letter-spacing.
 *
 * Chrome adds letter-spacing after every inline box, including the last. That
 * shrinks the last box under negative tracking (its ink, which does not shrink,
 * is what overflow:hidden clips) and leaves an empty tail under positive tracking.
 * Gaps before the last glyph come from the previous glyph, so the width here is
 * (n-1) gaps plus each glyph's ink — not a trailing gap.
 *
 * `measureCtx.font` must already be set. Letter-spacing on the probe is restored to 0.
 */
export type GlyphAdvance = {
  advance: number;
  /** Ink past the origin to the left. Negative means the ink starts inset. */
  inkLeft: number;
  /** Ink past the origin to the right. */
  inkRight: number;
  /** Pair kerning added before the next glyph. Ignored on the last glyph. */
  kernAfter?: number;
};

/**
 * Width of a run laid out with `spacingPx` between glyphs and none after the last.
 * Includes ink that sticks past an advance. Does not include a trailing letter-spacing gap.
 */
export function trackedRunWidth(glyphs: readonly GlyphAdvance[], spacingPx: number): number {
  let x = 0;
  let minL = 0;
  let maxR = 0;
  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i]!;
    const inkLeft = Math.max(0, glyph.inkLeft);
    const inkRight = Math.max(0, glyph.inkRight);
    minL = Math.min(minL, x - inkLeft);
    maxR = Math.max(maxR, x + Math.max(glyph.advance, inkRight));
    if (i < glyphs.length - 1) x += glyph.advance + (glyph.kernAfter ?? 0) + spacingPx;
  }
  return Math.max(1, maxR - minL);
}

export function measureTrackedTextWidth(text: string, fontSize: number, tracking: number, font?: string): number {
  if (!measureCtx) return Math.max(1, fontSize);
  if (font) measureCtx.font = font;
  measureCtx.letterSpacing = "0px";
  const raw = text.length ? text : " ";
  const chars = [...raw];
  const spacing = fontSize * tracking;
  const glyphs: GlyphAdvance[] = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i] === " " ? "\u00a0" : chars[i]!;
    const metrics = measureCtx.measureText(ch);
    const advance = metrics.width || 0;
    let kernAfter = 0;
    if (i < chars.length - 1) {
      const next = chars[i + 1] === " " ? "\u00a0" : chars[i + 1]!;
      const nextW = measureCtx.measureText(next).width || 0;
      const pairW = measureCtx.measureText(ch + next).width || 0;
      kernAfter = pairW - advance - nextW;
    }
    glyphs.push({
      advance,
      inkLeft: metrics.actualBoundingBoxLeft ?? 0,
      inkRight: metrics.actualBoundingBoxRight ?? advance,
      kernAfter,
    });
  }
  return trackedRunWidth(glyphs, spacing);
}

function measureLineWidth(text: string, fontSize: number, tracking: number): number {
  return measureTrackedTextWidth(text, fontSize, tracking);
}

function lineAdvance(value: string, fontSize: number, tracking: number, font?: string): number {
  const measured = measureTrackedTextWidth(value, fontSize, tracking, font);
  const chars = [...(value.length ? value : " ")].length;
  if (measured >= fontSize * 0.12 * chars) return measured;
  return Math.max(measured, fontSize * (0.5 + tracking) * chars);
}

function textFieldAutoWrapAt(slot: TextSlot): number {
  return Math.max(TEXT_FIELD_BOX_MIN, slot.fontSize * TEXT_FIELD_AUTO_LINE_EM);
}

/** Ink + pad needed to show wrapped copy at `wrapAt` (box width). */
export function measureTextFieldContent(slot: TextSlot, tracking: number, wrapAt: number): ChipSize {
  const fontSize = slot.fontSize;
  const probeW = Math.max(TEXT_FIELD_BOX_MIN, Number.isFinite(wrapAt) ? wrapAt : fontSize * 12);
  const probeH = Math.max(TEXT_FIELD_BOX_MIN, slot.boxH ?? fontSize * 2);
  const sizeFromPad = (padX: number, padY: number): ChipSize => {
    const inner = Math.max(1, wrapAt - padX * 2);
    const italic = slot.italic ? "italic " : "";
    const font = `${italic}${slot.fontWeight} ${fontSize}px "${slot.fontFamily}", sans-serif`;
    const measure = (value: string) => lineAdvance(value, fontSize, tracking, font);
    const lines = wrapTextFieldLines(slot.text || " ", inner, measure);
    let maxLine = Math.max(4, Math.ceil(fontSize * 0.22));
    for (const line of lines) maxLine = Math.max(maxLine, measure(line || " "));
    if (slot.italic) maxLine += fontSize * 0.18;
    const lineH = fontSize * textFieldLineHeight(slot);
    return {
      width: Math.max(TEXT_FIELD_BOX_MIN, Math.ceil(maxLine + padX * 2 + 4)),
      height: Math.max(TEXT_FIELD_BOX_MIN, Math.ceil(lines.length * lineH + padY * 2 + 2)),
    };
  };
  const first = textFieldPad(slot, probeW, probeH);
  const sized = sizeFromPad(first.x, first.y);
  const next = textFieldPad(slot, sized.width, sized.height);
  if (next.x === first.x && next.y === first.y) return sized;
  return sizeFromPad(next.x, next.y);
}

/** Hug new fields; after a manual resize, only grow height so copy isn't clipped. */
export function fitTextFieldBox(slot: TextSlot, tracking: number) {
  if (!isTextField(slot)) return;
  const auto = slot.boxAuto === true;
  const wrapAt = auto ? textFieldAutoWrapAt(slot) : textFieldBoxW(slot);
  const size = measureTextFieldContent(slot, tracking, wrapAt);
  if (auto) {
    slot.boxW = size.width;
    slot.boxH = size.height;
    return;
  }
  slot.boxH = Math.max(textFieldBoxH(slot), size.height);
}

export function measureTextSlot(slot: TextSlot, pad = 1, tracking = 0.02): ChipSize {
  if (isTextField(slot)) {
    return {
      width: Math.ceil(textFieldBoxW(slot)),
      height: Math.ceil(textFieldBoxH(slot)),
    };
  }
  if (slot.shape === "none") {
    // Keep physics / selection on the ink AABB — letter travel clips in CSS, not by padding the chip.
    return measureTextInk(slot, tracking);
  }
  if (!measureCtx) return { width: 80, height: 40 };

  measureCtx.font = `${slot.fontWeight} ${slot.fontSize}px "${slot.fontFamily}", sans-serif`;
  measureCtx.letterSpacing = "0px";

  const textW = measureLineWidth(slot.text || " ", slot.fontSize, tracking);

  const padY = Math.max(1, Math.round(slot.fontSize * 0.45 * pad));
  const height = Math.ceil(slot.fontSize + padY * 2);

  const extraX = Math.max(0, Math.round(slot.fontSize * 0.85 * pad));
  const cap = slot.shape === "pill" ? height / 2 : 0;
  const padX = Math.max(extraX, cap, 4);

  return {
    width: Math.ceil(textW + padX * 2),
    height,
  };
}

export function measureImageSlot(slot: ImageSlot): ChipSize {
  const size = Math.max(24, slot.size);
  if (slot.youtube) {
    const width = size;
    const height = Math.max(8, Math.round((width * 9) / 16));
    return { width, height };
  }
  if (slot.video) {
    const vw = slot.video.width;
    const vh = slot.video.height;
    if (vw && vh) {
      const fit = size / Math.max(vw, vh);
      return {
        width: Math.max(8, Math.round(vw * fit)),
        height: Math.max(8, Math.round(vh * fit)),
      };
    }
    const width = size;
    const height = Math.max(8, Math.round((width * 9) / 16));
    return { width, height };
  }
  if (slot.emoji) return measureEmojiBox(slot.emoji, size);
  const trim = peekTrim(slot.src);
  if (!trim) return { width: size, height: size };
  const fit = size / Math.max(trim.ratioW, trim.ratioH);
  return {
    width: Math.max(8, Math.round(trim.ratioW * fit)),
    height: Math.max(8, Math.round(trim.ratioH * fit)),
  };
}

export function measureSlot(slot: Slot, pad = 1, tracking = 0.02): ChipSize {
  return slot.kind === "text" ? measureTextSlot(slot, pad, tracking) : measureImageSlot(slot);
}

export function scaleSlot(slot: Slot, scale: number): Slot {
  const factor = scale * slot.scale;
  if (slot.kind === "text") {
    const next: TextSlot = {
      ...slot,
      fontSize: slot.fontSize * factor,
      radius: slot.radius * factor,
      stroke: slot.stroke * factor,
    };
    if (isTextField(slot)) {
      next.boxW = textFieldBoxW(slot) * factor;
      next.boxH = textFieldBoxH(slot) * factor;
    }
    return next;
  }
  return {
    ...slot,
    size: slot.size * factor,
    radius: (slot.radius ?? 0) * factor,
    stroke: (slot.stroke ?? 4) * factor,
  };
}

export function cornerRadius(slot: Slot, size: ChipSize): number {
  if (slot.kind === "image") {
    const radius = slot.radius ?? 0;
    if (slot.emoji || radius <= 0) return 0;
    const max = Math.min(size.width, size.height) / 2;
    return Math.min(max, radius);
  }
  if (slot.shape === "none") return 0;
  if (slot.shape === "pill") return size.height / 2;
  const max = Math.min(size.width, size.height) / 2;
  return Math.min(max, Math.max(0, slot.radius));
}
