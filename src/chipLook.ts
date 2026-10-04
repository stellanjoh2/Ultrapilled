import { isColorMask, isSvgSource } from "./chipKinds";
import { fillBlooms } from "./theme";
import {
  IMAGE_TEMPERATURE_NEUTRAL_K,
  imageContrastOf,
  imageExposureOf,
  imageHueOf,
  imageSaturationOf,
  imageTemperatureNormalized,
  imageTemperatureOf,
  type ImageSlot,
  type Slot,
  type TextSlot,
} from "./types";

/** Shared text-chip look flags for live DOM and export canvas. */
export type TextLookFlags = {
  ring: boolean;
  bare: boolean;
  shapeGradient: boolean;
  /** Slot wants a text gradient; caller still needs an end color. */
  textGradient: boolean;
};

export function textLookFlags(slot: TextSlot): TextLookFlags {
  const ring = Boolean(slot.stroked) && slot.shape !== "none";
  const bare = slot.shape === "none";
  const shapeGradient = Boolean(slot.gradient) && !bare && !ring;
  const textGradient = Boolean(slot.gradient) && bare;
  return { ring, bare, shapeGradient, textGradient };
}

/**
 * Whether a chip may contribute to the post-process bloom silhouette.
 * Near-black / low-luminance fills stay hard-edged; bright neon keeps glowing.
 * Photo rasters still bloom as a whole (per-pixel extract not applied yet).
 * YouTube / video bloom stand-ins are near-black and are skipped.
 */
export function chipContributesBloom(slot: Slot, fill: string, ink: string, gradientTo = ""): boolean {
  if (slot.kind === "image") {
    if (slot.youtube || slot.video) return false;
    if (slot.emoji) return true;
    if (!isColorMask(slot)) return true;
    if (fillBlooms(fill)) return true;
    return Boolean(gradientTo) && fillBlooms(gradientTo);
  }
  const { bare } = textLookFlags(slot);
  if (bare) {
    if (slot.gradient && gradientTo) return fillBlooms(fill) || fillBlooms(gradientTo);
    return fillBlooms(ink);
  }
  if (fillBlooms(fill)) return true;
  return Boolean(gradientTo) && fillBlooms(gradientTo);
}


/** Raster upload inner stroke — SVGs skip the ring overlay. */
export function rasterRing(slot: ImageSlot): boolean {
  return Boolean(slot.stroked) && !isSvgSource(slot);
}

export type ImageAdjustSlot = Pick<
  ImageSlot,
  "inverted" | "exposure" | "contrast" | "saturation" | "hue" | "temperature"
>;

const WB_ROOT_ID = "ultrapilled-wb-filters";

export type WhiteBalanceGains = { r: number; b: number };

/** Orby Kelvin → per-channel gains. Null at 6000K. */
export function whiteBalanceGains(kelvin: number | undefined): WhiteBalanceGains | null {
  const k = imageTemperatureOf(kelvin);
  if (k === IMAGE_TEMPERATURE_NEUTRAL_K) return null;
  const offset = imageTemperatureNormalized(k) * 0.2;
  return {
    r: Number((1 + offset).toFixed(5)),
    b: Number((1 - offset).toFixed(5)),
  };
}

/** Pixel path for export — canvas `filter` ignores SVG `url(#id)`. */
export function applyWhiteBalance(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  gains: WhiteBalanceGains,
): void {
  const frame = ctx.getImageData(0, 0, width, height);
  const px = frame.data;
  for (let i = 0; i < px.length; i += 4) {
    px[i] = Math.min(255, px[i]! * gains.r);
    px[i + 2] = Math.min(255, px[i + 2]! * gains.b);
  }
  ctx.putImageData(frame, 0, 0);
}

/** Lazily register an Orby-style R/B white-balance feColorMatrix for live CSS url(#id). */
function ensureTemperatureFilter(kelvin: number): string | undefined {
  const gains = whiteBalanceGains(kelvin);
  if (!gains) return undefined;
  const k = imageTemperatureOf(kelvin);
  const id = `ultrapilled-wb-${k}`;
  if (typeof document !== "undefined") {
    let root = document.getElementById(WB_ROOT_ID) as SVGSVGElement | null;
    if (!root) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.id = WB_ROOT_ID;
      svg.setAttribute("aria-hidden", "true");
      svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
      document.body.appendChild(svg);
      root = svg;
    }
    if (!document.getElementById(id)) {
      const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
      filter.id = id;
      filter.setAttribute("color-interpolation-filters", "sRGB");
      const matrix = document.createElementNS("http://www.w3.org/2000/svg", "feColorMatrix");
      matrix.setAttribute("type", "matrix");
      matrix.setAttribute("values", `${gains.r} 0 0 0 0 0 1 0 0 0 0 0 ${gains.b} 0 0 0 0 0 1 0`);
      filter.appendChild(matrix);
      root.appendChild(filter);
    }
  }
  return `url(#${id})`;
}

export type ImageRasterFilterOptions = {
  skipInvert?: boolean;
  skipTemperature?: boolean;
};

/**
 * CSS / canvas filter for raster image chips.
 * Invert is always explicit so live paint can fade invert on/off.
 * Color adjusts are omitted at neutral so export can skip when unused.
 * Temperature uses Orby's Kelvin→R/B white-balance matrix via an SVG filter on DOM;
 * export applies the same gains in pixels (see applyWhiteBalance).
 * Compose order stays WB (Temperature) before exposure/contrast/sat/hue —
 * independent of CREATE panel slider order (Exposure→…→Temperature→Hue).
 */
export function imageRasterFilter(
  slot: ImageAdjustSlot,
  dropShadowCss?: string,
  options?: ImageRasterFilterOptions,
): string {
  const parts: string[] = [];
  if (!options?.skipInvert) parts.push(slot.inverted ? "invert(1)" : "invert(0)");
  if (!options?.skipTemperature) {
    const temperature = ensureTemperatureFilter(imageTemperatureOf(slot.temperature));
    if (temperature) parts.push(temperature);
  }
  const exposure = imageExposureOf(slot.exposure);
  if (exposure !== 0) parts.push(`brightness(${1 + exposure / 100})`);
  const contrast = imageContrastOf(slot.contrast);
  if (contrast !== 0) parts.push(`contrast(${1 + contrast / 100})`);
  const saturation = imageSaturationOf(slot.saturation);
  if (saturation !== 0) parts.push(`saturate(${1 + saturation / 100})`);
  const hue = imageHueOf(slot.hue);
  if (hue !== 0) parts.push(`hue-rotate(${hue}deg)`);
  if (dropShadowCss) parts.push(dropShadowCss);
  return parts.join(" ");
}

/** True when any per-image color adjust differs from neutral. */
export function imageAdjustActive(slot: ImageAdjustSlot): boolean {
  return (
    imageTemperatureOf(slot.temperature) !== IMAGE_TEMPERATURE_NEUTRAL_K ||
    imageExposureOf(slot.exposure) !== 0 ||
    imageContrastOf(slot.contrast) !== 0 ||
    imageSaturationOf(slot.saturation) !== 0 ||
    imageHueOf(slot.hue) !== 0
  );
}
