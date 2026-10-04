/** Phones: coarse primary pointer, no hover, no mouse/trackpad/pencil. */
export const MOBILE_ACCESS_GATE_QUERY =
  "(hover: none) and (pointer: coarse) and (any-hover: none) and not (any-pointer: fine)";

export function isMobileAccessGate(match = globalThis.matchMedia): boolean {
  if (typeof match !== "function") return false;
  return match(MOBILE_ACCESS_GATE_QUERY).matches;
}
