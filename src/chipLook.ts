import { isSvgSource } from "./chipKinds";
import {
  IMAGE_TEMPERATURE_NEUTRAL_K,
  imageContrastOf,
  imageExposureOf,
  imageHueOf,
  imageSaturationOf,
  imageTemperatureNormalized,
  imageTemperatureOf,
  type ImageSlot,
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

/** Raster upload inner stroke — SVGs skip the ring overlay. */
export function rasterRing(slot: ImageSlot): boolean {
  return Boolean(slot.stroked) && !isSvgSource(slot);
}

export type ImageAdjustSlot = Pick<
  ImageSlot,
  "inverted" | "exposure" | "contrast" | "saturation" | "hue" | "temperature"
>;

const WB_ROOT_ID = "ultrapilled-wb-filters";

/** Lazily register an Orby-style R/B white-balance feColorMatrix for canvas + CSS url(#id). */
function ensureTemperatureFilter(kelvin: number): string | undefined {
  const k = imageTemperatureOf(kelvin);
  if (k === IMAGE_TEMPERATURE_NEUTRAL_K) return undefined;
  const id = `ultrapilled-wb-${k}`;
  const normalized = imageTemperatureNormalized(k);
  const offset = normalized * 0.2;
  const r = Number((1 + offset).toFixed(5));
  const b = Number((1 - offset).toFixed(5));
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
      matrix.setAttribute("values", `${r} 0 0 0 0 0 1 0 0 0 0 0 ${b} 0 0 0 0 0 1 0`);
      filter.appendChild(matrix);
      root.appendChild(filter);
    }
  }
  return `url(#${id})`;
}

/**
 * CSS / canvas filter for raster image chips.
 * Invert is always explicit so live paint can fade invert on/off.
 * Color adjusts are omitted at neutral so export can skip when unused.
 * Temperature uses Orby's Kelvin→R/B white-balance matrix via an SVG filter.
 */
export function imageRasterFilter(slot: ImageAdjustSlot, dropShadowCss?: string): string {
  const parts: string[] = [slot.inverted ? "invert(1)" : "invert(0)"];
  const temperature = ensureTemperatureFilter(imageTemperatureOf(slot.temperature));
  if (temperature) parts.push(temperature);
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
