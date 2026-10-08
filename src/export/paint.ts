import { backgroundImage, isSvgLogo, paintBackdrop, paintGrid, paintLogo, paintUnsplashCredit } from "../background";
import { gradientEnd, gradientLine, gradientPhase, pillGradientStops, pillSweepStops, textGradientFill } from "../pillFill";
import type { CanvasRatio } from "../canvas";
import { EMOJI_FONT } from "../emojis";
import { measureTextInk, measureTrackedTextWidth, paintTextInk, textFieldPad, textInkGlyphStarts } from "../measure";
import { peekTrim } from "../trim";
import { isColorMask, type ChipDraw } from "../chipKinds";
import { chipContributesBloom, applyWhiteBalance, imageAdjustActive, imageRasterFilter, rasterRing, textLookFlags, whiteBalanceGains } from "../chipLook";
import { textAnimCharPose, textAnimTravel } from "../textAnim";
import { blendMode, canvasBlend, dropShadowCssColor, dropShadowDistanceOf, dropShadowRadiusOf, grainArithmeticAmount, isTextField, sanitizeTextMotion, textAlignOf, textFieldLineHeight, type BackgroundSettings, type ImageSlot, type PostSettings, type TextSlot } from "../types";
import { wrapTextFieldLines } from "../textField";

/** Grayscale stitched fractal — same generator as the live SVG grain filter. */
const GRAIN_URL =
  "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n' color-interpolation-filters='sRGB'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch' result='t'/%3E%3CfeColorMatrix type='matrix' values='0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1' in='t'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

const images = new Map<string, Promise<HTMLImageElement | null>>();
const maskCanvas = document.createElement("canvas");
const chipBuffer = document.createElement("canvas");
const bloomBuffer = document.createElement("canvas");
const grainTile = document.createElement("canvas");
const grainNoise = document.createElement("canvas");
const wbCanvas = document.createElement("canvas");

export type PaintScene = {
  width: number;
  height: number;
  stageWidth: number;
  stageHeight: number;
  stageColor: string;
  background: BackgroundSettings;
  canvas: CanvasRatio;
  theme: string[];
  post: PostSettings;
  transparent: boolean;
  /** Soft per-layer shadows only when layout mode is on. */
  layoutMode: boolean;
  pillPad?: number;
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  let pending = images.get(src);
  if (!pending) {
    pending = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      if (/^https?:/i.test(src)) img.crossOrigin = "anonymous";
      img.src = src;
    });
    images.set(src, pending);
  }
  return pending;
}

function imageSrc(slot: ImageSlot): string {
  return peekTrim(slot.src)?.displaySrc ?? slot.src;
}

async function preload(draws: ChipDraw[], post: PostSettings): Promise<Map<string, HTMLImageElement>> {
  const ready = new Map<string, HTMLImageElement>();
  const srcs = new Set<string>();
  for (const chip of draws) {
    if (
      chip.slot.kind === "image" &&
      !chip.slot.emoji &&
      !chip.slot.youtube &&
      !chip.slot.video &&
      chip.slot.src
    ) {
      srcs.add(imageSrc(chip.slot));
    }
  }
  await Promise.all(
    [...srcs].map(async (src) => {
      const img = await loadImage(src);
      if (img) ready.set(src, img);
    }),
  );
  if (post.grain > 0) await loadImage(GRAIN_URL);
  return ready;
}

function scratchContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  return canvas.getContext("2d", { willReadFrequently: true });
}

function buffer(canvas: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = scratchContext(canvas);
  if (!ctx) throw new Error("Export failed");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

function withChip(ctx: CanvasRenderingContext2D, chip: ChipDraw, scale: number, draw: () => void) {
  const originX = (chip.width / 2 - chip.anchorX) * scale;
  const originY = (chip.height / 2 - chip.anchorY) * scale;
  const sx = chip.flipX ? -1 : 1;
  const sy = chip.flipY ? -1 : 1;
  ctx.save();
  ctx.translate(chip.x * scale, chip.y * scale);
  ctx.rotate(chip.angle);
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
  ctx.translate(-originX, -originY);
  draw();
  ctx.restore();
}

function withDropShadow(
  ctx: CanvasRenderingContext2D,
  chip: ChipDraw,
  scale: number,
  layoutMode: boolean,
  bloom: boolean,
  draw: () => void,
) {
  const slot = chip.slot;
  if (bloom || !layoutMode || !slot.dropShadow) {
    draw();
    return;
  }
  const blur = dropShadowRadiusOf(slot.dropShadowRadius) * scale;
  const y = dropShadowDistanceOf(slot.dropShadowDistance) * scale;
  ctx.save();
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = y;
  ctx.shadowBlur = blur;
  ctx.shadowColor = dropShadowCssColor(slot.dropShadowColor, slot.dropShadowOpacity);
  draw();
  ctx.restore();
}

function round(ctx: CanvasRenderingContext2D, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, Math.max(0, Math.min(radius, width / 2, height / 2)));
}

function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, width: number, height: number) {
  const ratio = img.width / img.height;
  if (!Number.isFinite(ratio) || ratio <= 0) return;
  const box = width / height;
  const dw = ratio > box ? width : height * ratio;
  const dh = ratio > box ? width / ratio : height;
  ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
}

function drawMask(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  fill: string,
  width: number,
  height: number,
  to = "",
  angle?: number,
  phase?: number,
  gradientScale?: number,
) {
  const sw = Math.max(1, Math.round(width));
  const sh = Math.max(1, Math.round(height));
  maskCanvas.width = sw;
  maskCanvas.height = sh;
  const scratch = maskCanvas.getContext("2d");
  if (!scratch) return;
  if (to) {
    const line = gradientLine(sw, sh, angle);
    const gradient = scratch.createLinearGradient(line.x0, line.y0, line.x1, line.y1);
    const stops = phase == null ? pillGradientStops(fill, to, gradientScale) : pillSweepStops(fill, to, phase, gradientScale);
    for (const stop of stops) gradient.addColorStop(stop.at, stop.color);
    scratch.fillStyle = gradient;
  } else {
    scratch.fillStyle = fill;
  }
  scratch.fillRect(0, 0, sw, sh);
  scratch.globalCompositeOperation = "destination-in";
  drawContain(scratch, img, sw, sh);
  ctx.drawImage(maskCanvas, 0, 0, width, height);
}

function drawGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  radius: number,
  from: string,
  to: string,
  angle?: number,
  phase?: number,
  gradientScale?: number,
) {
  ctx.save();
  round(ctx, width, height, radius);
  ctx.clip();
  const line = gradientLine(width, height, angle);
  const gradient = ctx.createLinearGradient(line.x0, line.y0, line.x1, line.y1);
  const stops = phase == null ? pillGradientStops(from, to, gradientScale) : pillSweepStops(from, to, phase, gradientScale);
  for (const stop of stops) gradient.addColorStop(stop.at, stop.color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** Per-letter rolling text — same cycle as live GSAP, clipped like overflow:hidden. */
function paintRollingText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  fontWeight: number,
  fontFamily: string,
  tracking: number,
  fill: string | CanvasGradient,
  originX: number,
  baselineY: number,
  travel: number,
  timeMs: number,
  speed: number | undefined,
  align: "left" | "center",
  baseline: CanvasTextBaseline,
) {
  if (!text) return;
  ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
  ctx.letterSpacing = "0px";
  ctx.textAlign = "left";
  ctx.textBaseline = baseline;
  ctx.fillStyle = fill;

  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch === " " ? "\u00a0" : ch).width);
  const total = widths.reduce((sum, w) => sum + w, 0) + fontSize * tracking * Math.max(0, chars.length - 1);
  let x = align === "center" ? originX - total / 2 : originX;
  const n = chars.length;
  for (let i = 0; i < n; i++) {
    const pose = textAnimCharPose(timeMs, speed, i, n, travel);
    if (pose.alpha > 0.001) {
      ctx.save();
      ctx.globalAlpha *= pose.alpha;
      ctx.fillText(chars[i] === " " ? "\u00a0" : chars[i]!, x, baselineY + pose.y);
      ctx.restore();
    }
    x += widths[i]! + fontSize * tracking;
  }
}

function drawTextField(
  ctx: CanvasRenderingContext2D,
  chip: ChipDraw,
  slot: TextSlot,
  width: number,
  height: number,
  scale: number,
  bloom: boolean,
  theme: string[],
  timeMs = 0,
  globalPad = 14,
) {
  const { ring, bare, shapeGradient, textGradient } = textLookFlags(slot);
  const radius = chip.radius * scale;
  if (shapeGradient) {
    const phase = slot.animatedGradient ? gradientPhase(slot.gradientSpeed, timeMs) : undefined;
    drawGradient(
      ctx,
      width,
      height,
      radius,
      chip.fill,
      gradientEnd(theme, slot),
      slot.gradientAngle,
      phase,
      slot.gradientScale,
    );
  } else if (!bare && !ring) {
    round(ctx, width, height, radius);
    ctx.fillStyle = chip.fill;
    ctx.fill();
  }
  if (ring) {
    ctx.save();
    round(ctx, width, height, radius);
    ctx.clip();
    round(ctx, width, height, radius);
    ctx.lineWidth = Math.max(1, slot.stroke) * scale * 2;
    ctx.strokeStyle = chip.fill;
    ctx.stroke();
    ctx.restore();
  }
  if (bloom && !bare) return;

  const fontSize = slot.fontSize * scale;
  const italic = slot.italic ? "italic " : "";
  const font = `${italic}${slot.fontWeight} ${fontSize}px "${slot.fontFamily}", sans-serif`;
  ctx.font = font;
  ctx.letterSpacing = "0px";
  ctx.textBaseline = "alphabetic";
  const pad = textFieldPad(
    { ...slot, fontSize },
    width,
    height,
    globalPad,
  );
  const inner = Math.max(1, width - pad.x * 2);
  const lineHeight = fontSize * textFieldLineHeight(slot);
  const align = textAlignOf(slot);
  ctx.textAlign = align;
  const x = align === "left" ? pad.x : align === "right" ? width - pad.x : width / 2;
  const fill = textGradient
    ? textGradientFill(
        ctx,
        width,
        height,
        chip.fill,
        gradientEnd(theme, slot),
        slot.gradientAngle,
        slot.gradientScale,
      )
    : chip.ink;
  ctx.fillStyle = fill;
  const lines = wrapTextFieldLines(slot.text || "", inner, (value) =>
    measureTrackedTextWidth(value, fontSize, chip.tracking, font),
  );
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  let y = pad.y + fontSize * 0.92 + chip.shiftEm * fontSize;
  for (const line of lines) {
    if (line) ctx.fillText(line, x, y);
    y += lineHeight;
    if (y > height + fontSize) break;
  }
  ctx.restore();
}

function drawText(
  ctx: CanvasRenderingContext2D,
  chip: ChipDraw,
  slot: TextSlot,
  width: number,
  height: number,
  scale: number,
  bloom: boolean,
  theme: string[],
  timeMs = 0,
  globalPad = 14,
) {
  sanitizeTextMotion(slot);
  if (isTextField(slot)) {
    drawTextField(ctx, chip, slot, width, height, scale, bloom, theme, timeMs, globalPad);
    return;
  }
  const radius = chip.radius * scale;
  const { ring, bare, shapeGradient: gradient } = textLookFlags(slot);
  if (gradient) {
    const phase = slot.animatedGradient ? gradientPhase(slot.gradientSpeed, timeMs) : undefined;
    drawGradient(ctx, width, height, radius, chip.fill, gradientEnd(theme, slot), slot.gradientAngle, phase, slot.gradientScale);
  } else if (!bare && !ring) {
    round(ctx, width, height, radius);
    ctx.fillStyle = chip.fill;
    ctx.fill();
  }
  if (ring) {
    ctx.save();
    round(ctx, width, height, radius);
    ctx.clip();
    round(ctx, width, height, radius);
    ctx.lineWidth = Math.max(1, slot.stroke) * scale * 2;
    ctx.strokeStyle = chip.fill;
    ctx.stroke();
    ctx.restore();
  }
  if (bloom && !bare) return;

  const fontSize = slot.fontSize * scale;
  const rolling = Boolean(slot.textAnim);
  const travel = rolling ? textAnimTravel(height, fontSize) : 0;

  if (bare) {
    const drawSlot = scale === 1 ? slot : { ...slot, fontSize };
    const ink = measureTextInk(drawSlot, chip.tracking);
    const fill =
      slot.gradient && !slot.stroked
        ? textGradientFill(
            ctx,
            width,
            height,
            chip.fill,
            gradientEnd(theme, slot),
            slot.gradientAngle,
            slot.gradientScale,
            // Letter-cycle used to bake a static from→to (hard stop). Sweep with the letters.
            rolling || slot.animatedGradient ? gradientPhase(slot.gradientSpeed, timeMs) : undefined,
          )
        : chip.ink;
    if (rolling) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.clip();
      paintRollingText(
        ctx,
        slot.text || "",
        fontSize,
        slot.fontWeight,
        slot.fontFamily,
        chip.tracking,
        fill,
        ink.originX,
        ink.baseline + chip.shiftEm * fontSize,
        travel,
        timeMs,
        slot.textAnimSpeed,
        "left",
        "alphabetic",
      );
      ctx.restore();
      return;
    }
    paintTextInk(ctx, drawSlot, chip.tracking, fill, chip.shiftEm, ink);
    return;
  }

  if (rolling) {
    ctx.save();
    round(ctx, width, height, radius);
    ctx.clip();
    paintRollingText(
      ctx,
      slot.text || "",
      fontSize,
      slot.fontWeight,
      slot.fontFamily,
      chip.tracking,
      chip.ink,
      width / 2,
      height / 2 + chip.shiftEm * fontSize,
      travel,
      timeMs,
      slot.textAnimSpeed,
      "center",
      "middle",
    );
    ctx.restore();
    return;
  }

  const font = `${slot.fontWeight} ${fontSize}px "${slot.fontFamily}", sans-serif`;
  ctx.font = font;
  ctx.fillStyle = chip.ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  // Same rule as the live pill: no trailing letter-spacing, or the last glyph
  // is clipped when tracking is negative and a phantom gap appears when it is positive.
  ctx.letterSpacing = "0px";
  const text = slot.text || "";
  const lineW = measureTrackedTextWidth(text, fontSize, chip.tracking, font);
  const starts = textInkGlyphStarts(ctx, text, fontSize, chip.tracking, (width - lineW) / 2);
  const chars = [...text];
  const baseline = height / 2 + chip.shiftEm * fontSize;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i] === " " ? "\u00a0" : chars[i]!, starts[i] ?? 0, baseline);
  }
}

function drawChip(
  ctx: CanvasRenderingContext2D,
  chip: ChipDraw,
  scale: number,
  bloom: boolean,
  ready: Map<string, HTMLImageElement>,
  theme: string[],
  timeMs = 0,
  layoutMode = false,
  pillPad = 14,
) {
  const width = chip.width * scale;
  const height = chip.height * scale;
  if (width < 1 || height < 1) return;
  if (bloom) {
    const slot = chip.slot;
    const gradientTo =
      slot.kind === "text" && slot.gradient && !slot.stroked
        ? gradientEnd(theme, slot)
        : slot.kind === "image" && slot.gradient && !slot.emoji && isColorMask(slot)
          ? gradientEnd(theme, slot)
          : "";
    if (!chipContributesBloom(slot, chip.fill, chip.ink, gradientTo)) return;
  }
  withChip(ctx, chip, scale, () => {
    withDropShadow(ctx, chip, scale, layoutMode, bloom, () => {
      const slot = chip.slot;
      if (slot.kind === "text") {
        drawText(ctx, chip, slot, width, height, scale, bloom, theme, timeMs, pillPad);
        return;
      }
      if (slot.youtube || slot.video) {
        // YouTube iframe can't be captured; local video uses the same stand-in for now.
        const radius = chip.radius * scale;
        const ring = rasterRing(slot);
        ctx.save();
        if (radius > 0 || ring) {
          round(ctx, width, height, radius);
          ctx.clip();
        }
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        const cx = width / 2;
        const cy = height / 2;
        const s = Math.min(width, height) * 0.18;
        ctx.moveTo(cx - s * 0.55, cy - s);
        ctx.lineTo(cx - s * 0.55, cy + s);
        ctx.lineTo(cx + s * 0.85, cy);
        ctx.closePath();
        ctx.fill();
        if (ring) {
          round(ctx, width, height, radius);
          ctx.lineWidth = Math.max(1, slot.stroke ?? 4) * scale * 2;
          ctx.strokeStyle = chip.fill;
          ctx.stroke();
        }
        ctx.restore();
        return;
      }
      if (slot.emoji) {
        ctx.font = `${slot.size * scale}px ${EMOJI_FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(slot.emoji, width / 2, height / 2);
        return;
      }
      const img = ready.get(imageSrc(slot));
      if (!img) return;
      if (isColorMask(slot)) {
        const phase = slot.gradient && slot.animatedGradient ? gradientPhase(slot.gradientSpeed, timeMs) : undefined;
        drawMask(ctx, img, chip.fill, width, height, slot.gradient ? gradientEnd(theme, slot) : "", slot.gradientAngle, phase, slot.gradientScale);
      } else {
        const radius = chip.radius * scale;
        const ring = rasterRing(slot);
        const paint = () => paintRasterPhoto(ctx, img, slot, width, height);
        if (radius > 0 || ring) {
          ctx.save();
          round(ctx, width, height, radius);
          ctx.clip();
          paint();
          if (ring) {
            round(ctx, width, height, radius);
            ctx.lineWidth = Math.max(1, slot.stroke ?? 4) * scale * 2;
            ctx.strokeStyle = chip.fill;
            ctx.stroke();
          }
          ctx.restore();
        } else {
          paint();
        }
      }
    });
  });
}

function wbLayer(width: number, height: number): CanvasRenderingContext2D {
  if (wbCanvas.width !== width || wbCanvas.height !== height) {
    wbCanvas.width = width;
    wbCanvas.height = height;
  }
  const ctx = wbCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Export failed");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

function paintRasterPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  slot: ImageSlot,
  width: number,
  height: number,
) {
  const wb = whiteBalanceGains(slot.temperature);
  if (wb) {
    const layer = wbLayer(width, height);
    layer.filter = slot.inverted ? "invert(1)" : "none";
    drawContain(layer, img, width, height);
    layer.filter = "none";
    applyWhiteBalance(layer, width, height, wb);
    const rest = imageRasterFilter(slot, undefined, { skipInvert: true, skipTemperature: true });
    if (rest) {
      ctx.save();
      ctx.filter = rest;
      ctx.drawImage(wbCanvas, 0, 0, width, height);
      ctx.restore();
    } else {
      ctx.drawImage(wbCanvas, 0, 0, width, height);
    }
    return;
  }
  const filter = slot.inverted || imageAdjustActive(slot) ? imageRasterFilter(slot) : "";
  if (filter) {
    ctx.save();
    ctx.filter = filter;
    drawContain(ctx, img, width, height);
    ctx.restore();
    return;
  }
  drawContain(ctx, img, width, height);
}

async function grainImage(): Promise<HTMLImageElement | null> {
  return loadImage(GRAIN_URL);
}

/** Match live SVG arithmetic grain: src + a×(noise−0.5). */
function paintGrainArithmetic(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number,
  noise: CanvasImageSource,
  tile: number,
) {
  if (amount <= 0 || tile <= 0) return;
  grainTile.width = tile;
  grainTile.height = tile;
  const tileCtx = scratchContext(grainTile);
  if (!tileCtx) return;
  tileCtx.clearRect(0, 0, tile, tile);
  tileCtx.drawImage(noise, 0, 0, tile, tile);

  const frame = ctx.getImageData(0, 0, width, height);
  if (grainNoise.width !== width || grainNoise.height !== height) {
    grainNoise.width = width;
    grainNoise.height = height;
  }
  const noiseCtx = scratchContext(grainNoise);
  if (!noiseCtx) return;
  const pattern = noiseCtx.createPattern(grainTile, "repeat");
  if (!pattern) return;
  noiseCtx.fillStyle = pattern;
  noiseCtx.fillRect(0, 0, width, height);
  const noiseData = noiseCtx.getImageData(0, 0, width, height).data;
  const px = frame.data;
  for (let i = 0; i < px.length; i += 4) {
    const delta = amount * (noiseData[i]! / 255 - 0.5) * 255;
    px[i] = Math.min(255, Math.max(0, px[i]! + delta));
    px[i + 1] = Math.min(255, Math.max(0, px[i + 1]! + delta));
    px[i + 2] = Math.min(255, Math.max(0, px[i + 2]! + delta));
  }
  ctx.putImageData(frame, 0, 0);
}

function paintVignette(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const alpha = amount / 140;
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(width / 2, height / 2);
  const corner = Math.SQRT2;
  const gradient = ctx.createRadialGradient(0, 0, corner * 0.42, 0, 0, corner);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, `rgba(0, 0, 0, ${alpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

export async function paintFrame(canvas: HTMLCanvasElement, draws: ChipDraw[], scene: PaintScene, timeMs = 0): Promise<void> {
  const ready = await preload(draws, scene.post);
  if (canvas.width !== scene.width || canvas.height !== scene.height) {
    canvas.width = scene.width;
    canvas.height = scene.height;
  }
  const ctx = canvas.getContext("2d", { alpha: true, willReadFrequently: true });
  if (!ctx) throw new Error("Export failed");
  const scaleX = scene.stageWidth > 0 ? scene.width / scene.stageWidth : 1;
  const scaleY = scene.stageHeight > 0 ? scene.height / scene.stageHeight : 1;
  const scale = Math.min(scaleX, scaleY);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
  ctx.clearRect(0, 0, scene.width, scene.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (!scene.transparent) {
    const file = scene.background.kind === "image" ? backgroundImage(scene.background.imageId) : null;
    const backdrop = file ? await loadImage(file.src) : null;
    paintBackdrop(ctx, scene.width, scene.height, scene.stageColor, scene.background, scene.canvas, backdrop);
    paintGrid(ctx, scene.width, scene.height, scene.background, scene.canvas);
  }
  // Logo is stage chrome — keep it off clear-background exports.
  const logoFile = scene.transparent ? null : backgroundImage(scene.background.logoId);
  const logo = logoFile ? await loadImage(logoFile.src) : null;
  const blend = canvasBlend(scene.post.blend);
  const logoBlend = canvasBlend(
    blendMode(scene.background.logoBlend === "normal" ? scene.post.blend : scene.background.logoBlend),
  );
  const logoFront = Boolean(scene.background.logoFront);
  const paintStageLogo = (target: CanvasRenderingContext2D) => {
    if (!logo) return;
    target.save();
    target.globalCompositeOperation = logoBlend;
    paintLogo(target, scene.width, scene.height, scene.background, scene.theme, logo);
    target.restore();
  };
  if (logo && !logoFront) paintStageLogo(ctx);

  const isolate = blend !== "source-over";
  const pile = isolate ? buffer(chipBuffer, scene.width, scene.height) : ctx;

  const paintPile = (ctx: CanvasRenderingContext2D, bloomPass: boolean) => {
    for (const chip of draws) {
      ctx.save();
      // Bloom is a silhouette pass — keep source-over so blur stays clean.
      // Per-object mix only in layout mode (same as live .chip mix-blend-mode).
      if (!bloomPass) {
        const mix = scene.layoutMode ? blendMode(chip.slot.blend) : "normal";
        ctx.globalCompositeOperation = canvasBlend(mix);
      }
      drawChip(ctx, chip, scale, bloomPass, ready, scene.theme, timeMs, scene.layoutMode, scene.pillPad ?? 14);
      ctx.restore();
    }
  };

  const saturate = scene.post.saturate / 100;
  if (saturate !== 1) {
    const layer = buffer(bloomBuffer, scene.width, scene.height);
    paintPile(layer, false);
    pile.save();
    pile.filter = `saturate(${saturate})`;
    pile.drawImage(bloomBuffer, 0, 0);
    pile.restore();
  } else {
    paintPile(pile, false);
  }

  const bloom = scene.post.bloom / 100;
  const bloomOpacity = (scene.post.bloomOpacity / 100) * bloom;
  if (bloom > 0 && bloomOpacity > 0) {
    const layer = buffer(bloomBuffer, scene.width, scene.height);
    paintPile(layer, true);
    pile.save();
    pile.filter = `blur(${bloom * 48 * scale}px)`;
    pile.globalAlpha = bloomOpacity;
    pile.globalCompositeOperation = "lighter";
    pile.drawImage(bloomBuffer, 0, 0);
    pile.restore();
  }

  if (isolate) {
    ctx.save();
    ctx.globalCompositeOperation = blend;
    ctx.drawImage(chipBuffer, 0, 0);
    ctx.restore();
  }

  if (logo && logoFront) paintStageLogo(ctx);

  // Logo bloom after the pile's mix blend — same as live .logo-bloom-layer (plus-lighter).
  if (bloom > 0 && bloomOpacity > 0 && logo && logoFile && isSvgLogo(logoFile.name, logoFile.src)) {
    const layer = buffer(bloomBuffer, scene.width, scene.height);
    paintLogo(layer, scene.width, scene.height, scene.background, scene.theme, logo);
    ctx.save();
    ctx.filter = `blur(${bloom * 48 * scale}px)`;
    ctx.globalAlpha = bloomOpacity;
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(bloomBuffer, 0, 0);
    ctx.restore();
  }

  if (!scene.transparent && scene.post.grain > 0) {
    const grain = await grainImage();
    if (grain) {
      const tile = Math.max(1, Math.round(220 * scale));
      paintGrainArithmetic(ctx, scene.width, scene.height, grainArithmeticAmount(scene.post.grain), grain, tile);
    }
  }

  if (!scene.transparent) paintVignette(ctx, scene.width, scene.height, scene.post.vignette);

  const hue = Math.round(scene.post.hue ?? 0);
  if (hue % 360 !== 0) {
    const layer = buffer(bloomBuffer, scene.width, scene.height);
    layer.drawImage(canvas, 0, 0);
    ctx.save();
    ctx.filter = `hue-rotate(${hue}deg)`;
    ctx.globalCompositeOperation = "copy";
    ctx.drawImage(bloomBuffer, 0, 0);
    ctx.restore();
  }

  if (!scene.transparent && scene.background.kind === "image") {
    paintUnsplashCredit(ctx, scene.width, scene.height, scene.background.imageCredit);
  }
}
