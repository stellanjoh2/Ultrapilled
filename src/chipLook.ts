import type { ImageSlot, TextSlot } from "./types";
import { isSvgSource } from "./chipKinds";

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
