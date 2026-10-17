import type { CanvasRatio } from "./canvas";
import type { ChipPose } from "./chipKinds";
import { compositionScale } from "./uiScale";

export type ShareFrame = { width: number; height: number };

/** Extra shrink when a landscape 16:9 board is shown on phone 9:16. */
export const SHARE_FROM_16x9_FEEL = 0.75;

/** Uniform scale that fits the whole source board inside the share frame (contain). */
export function shareContainScale(from: ShareFrame, to: ShareFrame): number {
  if (from.width < 2 || from.height < 2 || to.width < 2 || to.height < 2) return 1;
  return Math.min(to.width / from.width, to.height / from.height);
}

/**
 * 16:9 → phone gets contain × 0.75.
 * 9:16 → phone stays 1:1 with contain (same aspect, no extra shrink).
 * Other ratios → contain only.
 */
export function shareViewerFeel(sourceCanvas: CanvasRatio | undefined): number {
  if (sourceCanvas === "16:9") return SHARE_FROM_16x9_FEEL;
  return 1;
}

export function shareViewerMapScale(
  from: ShareFrame,
  to: ShareFrame,
  sourceCanvas?: CanvasRatio,
): number {
  return shareContainScale(from, to) * shareViewerFeel(sourceCanvas);
}

/**
 * Fit the source board into the phone 9:16 frame (uniform + centered).
 * Optional feel shrink for 16:9 sources.
 */
export function remapPosesToShareFrame(
  poses: ChipPose[],
  from: ShareFrame,
  to: ShareFrame,
  sourceCanvas?: CanvasRatio,
): ChipPose[] {
  if (!poses.length || from.width < 2 || from.height < 2 || to.width < 2 || to.height < 2) {
    return poses.map((pose) => ({ ...pose }));
  }
  const s = shareViewerMapScale(from, to, sourceCanvas);
  const offsetX = (to.width - from.width * s) / 2;
  const offsetY = (to.height - from.height * s) / 2;
  return poses.map((pose) => ({
    ...pose,
    x: pose.x * s + offsetX,
    y: pose.y * s + offsetY,
  }));
}

/** Chip spawn scale matched to the same map factor as poses. */
export function shareViewerChipScale(
  from: ShareFrame,
  to: ShareFrame,
  sourceCanvas?: CanvasRatio,
): number {
  if (from.width < 2 || from.height < 2) {
    return compositionScale(1, to.width, to.height) * shareViewerFeel(sourceCanvas);
  }
  const sourceScale = compositionScale(1, from.width, from.height);
  return Math.max(0.001, sourceScale * shareViewerMapScale(from, to, sourceCanvas));
}
