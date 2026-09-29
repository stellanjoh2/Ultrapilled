import { presetIdForSrc } from "./iconMesh";
import type { ImageSlot, Slot } from "./types";

/** Snapshot of a chip for canvas export (pose + resolved look). */
export type ChipDraw = {
  x: number;
  y: number;
  angle: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  flipX?: boolean;
  flipY?: boolean;
  slot: Slot;
  radius: number;
  fill: string;
  ink: string;
  tracking: number;
  shiftEm: number;
};

/** Saved body pose for .pill / draft restore. */
export type ChipPose = {
  slotId: string;
  seqIndex: number;
  sizeUnit: number;
  /** Extra size from solo canvas scale (1 = default). */
  scaleMul?: number;
  flipX?: boolean;
  flipY?: boolean;
  x: number;
  y: number;
  angle: number;
};

/** Built-in shapes are silhouettes. Uploaded SVGs keep their ink until tint is on. */
export function isSvgSource(slot: ImageSlot): boolean {
  if (/\.svg$/i.test(slot.name)) return true;
  return (
    slot.src.startsWith("data:image/svg") ||
    slot.src.includes("image/svg+xml") ||
    /\.svg(\?|$)/i.test(slot.src)
  );
}

export function isColorMask(slot: ImageSlot): boolean {
  if (presetIdForSrc(slot.src)) return true;
  if (!isSvgSource(slot)) return false;
  return Boolean(slot.tint);
}
