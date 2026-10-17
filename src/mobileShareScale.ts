import type { ChipPose } from "./chipKinds";
import { compositionScale } from "./uiScale";

export type ShareFrame = { width: number; height: number };

/**
 * Fit a landscape (or any) board into a taller 9:16 phone frame with uniform scale.
 * Height-matched so objects keep the same visual size relative to frame height as on 16:9.
 */
export function remapPosesToShareFrame(poses: ChipPose[], from: ShareFrame, to: ShareFrame): ChipPose[] {
  if (!poses.length || from.width < 2 || from.height < 2 || to.width < 2 || to.height < 2) {
    return poses.map((pose) => ({ ...pose }));
  }
  const s = to.height / from.height;
  const offsetX = (to.width - from.width * s) / 2;
  return poses.map((pose) => ({
    ...pose,
    x: pose.x * s + offsetX,
    y: pose.y * s,
  }));
}

/**
 * Chip spawn scale for the remapped board: same density vs height as the source
 * canvas would have had at its native size.
 */
export function shareViewerChipScale(from: ShareFrame, to: ShareFrame): number {
  if (from.height < 2 || to.height < 2) {
    return compositionScale(1, to.width, to.height);
  }
  const sourceScale = compositionScale(1, from.width, from.height);
  return Math.max(0.001, sourceScale * (to.height / from.height));
}
