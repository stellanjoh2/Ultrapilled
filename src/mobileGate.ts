import { compositionScale } from "./uiScale";

/**
 * Phones and phone-sized viewports. Coarse pointer covers landscape phones
 * (often >700px wide). Max-width covers DevTools / browsers that still report
 * a fine pointer from a desktop mouse.
 */
export const MOBILE_ACCESS_GATE_QUERY =
  "(max-width: 700px), (hover: none) and (pointer: coarse)";

/** Phone landing shrink for the physics pile (iPhone-tuned vs 1440p compositionScale). */
export const MODE_SELECT_MOBILE_ASSET_SCALE = 0.264;

export function isMobileAccessGate(match = globalThis.matchMedia): boolean {
  if (typeof match !== "function") return false;
  return match(MOBILE_ACCESS_GATE_QUERY).matches;
}

export function modeSelectAssetScale(masterScale: number, mobileGate: boolean, viewW?: number, viewH?: number): number {
  const view = mobileGate ? MODE_SELECT_MOBILE_ASSET_SCALE : compositionScale(1, viewW, viewH);
  return masterScale * view;
}
