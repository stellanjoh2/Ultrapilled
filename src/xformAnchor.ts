/**
 * Free-transform scale pivots (Photoshop-style).
 *
 * Default / Shift: opposite corner stays fixed.
 * Alt / Shift+Alt: center-anchored uniform scale.
 */

export type XformCorner = "se" | "ne" | "nw" | "sw";

const OPPOSITE: Record<XformCorner, XformCorner> = {
  se: "nw",
  nw: "se",
  ne: "sw",
  sw: "ne",
};

/** Corner opposite the grabbed handle — the fixed anchor in default scale. */
export function oppositeXformCorner(corner: XformCorner): XformCorner {
  return OPPOSITE[corner];
}

/**
 * Re-base `startDist` when the pivot switches mid-gesture so
 * `startScale * (currentDist / startDist) === lastScale` (no jump).
 */
export function reanchorStartDist(
  startScale: number,
  lastScale: number,
  currentDist: number,
  minDist = 8,
): number {
  const safeLast = Math.max(1e-6, lastScale);
  return Math.max(minDist, (currentDist * startScale) / safeLast);
}

/** Polar scale from a pivot: `startScale * (dist / startDist)`, continuous. */
export function scaleFromPivotRatio(
  startScale: number,
  startDist: number,
  dist: number,
): number {
  const safeStart = Math.max(1e-6, startDist);
  return startScale * (Math.max(1, dist) / safeStart);
}

/** Keep this fraction of free-transform release fling (Matter positionPrev lag). */
export const XFORM_RELEASE_IMPULSE = 0.25;

/** Scale a release linear/angular velocity by the keep-factor (default 25%). */
export function scaleXformReleaseImpulse(
  value: number,
  factor = XFORM_RELEASE_IMPULSE,
): number {
  return value * factor;
}
