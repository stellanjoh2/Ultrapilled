import type { CanvasRatio } from "./canvas";
import type { ChipPose } from "./chipKinds";
import { compositionScale } from "./uiScale";

export type ShareFrame = { width: number; height: number };

/** Extra shrink when a landscape 16:9 board is remapped onto a tall phone frame. */
export const SHARE_FROM_16x9_FEEL = 0.75;

const ASPECT: Record<CanvasRatio, number> = {
  "16:9": 16 / 9,
  "1:1": 1,
  "3:4": 3 / 4,
  "9:16": 9 / 16,
};

/**
 * Pick the share-viewer canvas so a 16:9 scene on a 16:9 screen stays 1:1.
 * Portrait phones still get a 9:16 board for landscape sources.
 */
export function shareViewerTargetCanvas(
  source: CanvasRatio,
  stageWidth: number,
  stageHeight: number,
): CanvasRatio {
  if (stageWidth < 2 || stageHeight < 2) return source === "9:16" ? "9:16" : "16:9";
  const view = stageWidth / stageHeight;
  const src = ASPECT[source];
  if (Math.abs(view - src) <= src * 0.12) return source;
  if (view < 0.9) return "9:16";
  return source;
}

/** Uniform scale that fits the whole source board inside the share frame (contain). */
export function shareContainScale(from: ShareFrame, to: ShareFrame): number {
  if (from.width < 2 || from.height < 2 || to.width < 2 || to.height < 2) return 1;
  return Math.min(to.width / from.width, to.height / from.height);
}

/**
 * 16:9 → tall phone: contain × 0.75.
 * 16:9 → landscape / same-aspect: 1 (true 1:1 with contain).
 * 9:16 and others: no extra feel.
 */
export function shareViewerFeel(sourceCanvas?: CanvasRatio, to?: ShareFrame): number {
  if (sourceCanvas !== "16:9") return 1;
  if (to && to.width > 2 && to.height > 2 && to.width / to.height >= 1) return 1;
  return SHARE_FROM_16x9_FEEL;
}

export function shareViewerMapScale(
  from: ShareFrame,
  to: ShareFrame,
  sourceCanvas?: CanvasRatio,
): number {
  return shareContainScale(from, to) * shareViewerFeel(sourceCanvas, to);
}

/**
 * Fit the source board into the share frame (uniform + centered).
 * Optional feel shrink only when a 16:9 source lands on a tall frame.
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
    return compositionScale(1, to.width, to.height) * shareViewerFeel(sourceCanvas, to);
  }
  const sourceScale = compositionScale(1, from.width, from.height);
  return Math.max(0.001, sourceScale * shareViewerMapScale(from, to, sourceCanvas));
}

/** Pinch / manual scale bounds for the mobile share viewer. */
export const SHARE_PINCH_MIN = 0.55;
export const SHARE_PINCH_MAX = 1.85;

export function clampSharePinch(scale: number): number {
  if (!Number.isFinite(scale)) return 1;
  return Math.min(SHARE_PINCH_MAX, Math.max(SHARE_PINCH_MIN, scale));
}
