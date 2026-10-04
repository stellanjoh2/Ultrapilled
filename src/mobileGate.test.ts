import { describe, expect, it } from "vitest";
import { isMobileAccessGate, MOBILE_ACCESS_GATE_QUERY } from "./mobileGate";

describe("isMobileAccessGate", () => {
  it("requires no fine pointer so touch laptops keep the editor", () => {
    expect(MOBILE_ACCESS_GATE_QUERY).toContain("not (any-pointer: fine)");
    expect(isMobileAccessGate(() => ({ matches: true }) as MediaQueryList)).toBe(true);
    expect(isMobileAccessGate(() => ({ matches: false }) as MediaQueryList)).toBe(false);
  });
});
