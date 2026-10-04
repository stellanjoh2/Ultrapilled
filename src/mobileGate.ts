/**
 * Phones and phone-sized viewports. Coarse pointer covers landscape phones
 * (often >700px wide). Max-width covers DevTools / browsers that still report
 * a fine pointer from a desktop mouse.
 */
export const MOBILE_ACCESS_GATE_QUERY =
  "(max-width: 700px), (hover: none) and (pointer: coarse)";

export function isMobileAccessGate(match = globalThis.matchMedia): boolean {
  if (typeof match !== "function") return false;
  return match(MOBILE_ACCESS_GATE_QUERY).matches;
}
