import { measureEmojiBox } from "./emojis";
import { peekTrim } from "./trim";
import type { ImageSlot, Slot, TextSlot } from "./types";

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

/** A word's own pill padding, or the global slider while it still follows that. */
export function pillPadOf(slot: Slot, globalPad: number): number {
  return slot.kind === "text" && slot.pillPad != null ? slot.pillPad : globalPad;
}

/** A word's own tracking, or the global slider while it still follows that. */
export function trackingOf(slot: Slot, globalTracking: number): number {
  return slot.kind === "text" && slot.tracking != null ? slot.tracking : globalTracking;
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
  // Measure unspaced — Chromium's measureText ignores canvas letterSpacing for both
  // width and actualBoundingBox*. Apply tracking the same way as measureLineWidth.
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

function measureLineWidth(text: string, fontSize: number, tracking: number): number {
  if (!measureCtx) return fontSize;
  const metrics = measureCtx.measureText(text);
  const tracked = metrics.width + fontSize * tracking * Math.max(0, text.length - 1);
  const bounds =
    (metrics.actualBoundingBoxLeft ?? 0) + (metrics.actualBoundingBoxRight ?? 0);
  return Math.max(tracked, bounds);
}

export function measureTextSlot(slot: TextSlot, pad = 1, tracking = 0.02): ChipSize {
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
    return {
      ...slot,
      fontSize: slot.fontSize * factor,
      radius: slot.radius * factor,
      stroke: slot.stroke * factor,
    };
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
