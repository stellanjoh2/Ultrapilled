import type { ChipPose } from "./chipKinds";
import { compositionScale } from "./uiScale";

export type ShareFrame = { width: number; height: number };

/** Uniform scale that fits the whole source board inside the share frame (contain). */
export function shareContainScale(from: ShareFrame, to: ShareFrame): number {
  if (from.width < 2 || from.height < 2 || to.width < 2 || to.height < 2) return 1;
  return Math.min(to.width / from.width, to.height / from.height);
}

/**
 * Fit a 16:9 (or any) board into a 9:16 phone frame without cropping.
 * Uniform contain + center — keeps spacing/collisions consistent with chip scale.
 */
export function remapPosesToShareFrame(poses: ChipPose[], from: ShareFrame, to: ShareFrame): ChipPose[] {
  if (!poses.length || from.width < 2 || from.height < 2 || to.width < 2 || to.height < 2) {
    return poses.map((pose) => ({ ...pose }));
  }
  const s = shareContainScale(from, to);
  const offsetX = (to.width - from.width * s) / 2;
  const offsetY = (to.height - from.height * s) / 2;
  return poses.map((pose) => ({
    ...pose,
    x: pose.x * s + offsetX,
    y: pose.y * s + offsetY,
  }));
}

/**
 * Chip spawn scale matched to the same contain factor as poses,
 * so density (and collisions) stay coherent after the aspect change.
 */
export function shareViewerChipScale(from: ShareFrame, to: ShareFrame): number {
  if (from.width < 2 || from.height < 2) {
    return compositionScale(1, to.width, to.height);
  }
  const sourceScale = compositionScale(1, from.width, from.height);
  return Math.max(0.001, sourceScale * shareContainScale(from, to));
}
