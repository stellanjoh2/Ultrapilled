import { describe, expect, it } from "vitest";
import { isMobileAccessGate, MOBILE_ACCESS_GATE_QUERY } from "./mobileGate";

describe("isMobileAccessGate", () => {
  it("matches phone-sized viewports and coarse touch pointers", () => {
    expect(MOBILE_ACCESS_GATE_QUERY).toContain("(hover: none) and (pointer: coarse)");
    expect(MOBILE_ACCESS_GATE_QUERY).toContain("(max-width: 700px)");
    expect(isMobileAccessGate(() => ({ matches: true }) as MediaQueryList)).toBe(true);
    expect(isMobileAccessGate(() => ({ matches: false }) as MediaQueryList)).toBe(false);
  });
});
