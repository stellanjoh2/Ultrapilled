import { describe, expect, it } from "vitest";
import { circleProxyRadius } from "./icons";

describe("circleProxyRadius", () => {
  it("matches half the side on a square AABB", () => {
    expect(circleProxyRadius(100, 100)).toBe(50);
  });

  it("uses the longer side so tall meshes are fully covered", () => {
    // Hydrant-like portrait: old min/2 = 40; average = 70; circumscribed = 100.
    expect(circleProxyRadius(80, 200)).toBe(100);
    expect(circleProxyRadius(80, 200)).toBe(Math.max(80, 200) / 2);
  });

  it("uses the longer side for wide meshes too", () => {
    expect(circleProxyRadius(240, 90)).toBe(120);
  });

  it("floors tiny sizes to 1", () => {
    expect(circleProxyRadius(0, 0)).toBe(1);
  });
});
