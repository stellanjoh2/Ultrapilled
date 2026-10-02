import { isSvgSource } from "./chipKinds";
import {
  imageContrastOf,
  imageExposureOf,
  imageHueOf,
  imageSaturationOf,
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

export type ImageAdjustSlot = Pick<ImageSlot, "inverted" | "exposure" | "contrast" | "saturation" | "hue">;

/**
 * CSS / canvas filter for raster image chips.
 * Invert is always explicit so live paint can fade invert on/off.
 * Color adjusts are omitted at neutral so export can skip when unused.
 */
export function imageRasterFilter(slot: ImageAdjustSlot, dropShadowCss?: string): string {
  const parts: string[] = [slot.inverted ? "invert(1)" : "invert(0)"];
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
    imageExposureOf(slot.exposure) !== 0 ||
    imageContrastOf(slot.contrast) !== 0 ||
    imageSaturationOf(slot.saturation) !== 0 ||
    imageHueOf(slot.hue) !== 0
  );
}
