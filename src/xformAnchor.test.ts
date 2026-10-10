import { describe, expect, it } from "vitest";
import {
  oppositeXformCorner,
  reanchorStartDist,
  scaleFromPivotRatio,
  scaleXformReleaseImpulse,
  xformCornerSigns,
  XFORM_RELEASE_IMPULSE,
  type XformCorner,
} from "./xformAnchor";

describe("oppositeXformCorner", () => {
  it("maps each handle to the diagonally opposite corner", () => {
    const pairs: [XformCorner, XformCorner][] = [
      ["se", "nw"],
      ["nw", "se"],
      ["ne", "sw"],
      ["sw", "ne"],
    ];
    for (const [from, to] of pairs) {
      expect(oppositeXformCorner(from)).toBe(to);
      expect(oppositeXformCorner(to)).toBe(from);
    }
  });
});

describe("xformCornerSigns", () => {
  it("keeps unflipped corner signs", () => {
    expect(xformCornerSigns("se")).toEqual({ sx: 1, sy: 1 });
    expect(xformCornerSigns("nw")).toEqual({ sx: -1, sy: -1 });
  });

  it("mirrors horizontal / vertical like CSS scale on the chip", () => {
    expect(xformCornerSigns("se", true, false)).toEqual({ sx: -1, sy: 1 });
    expect(xformCornerSigns("se", false, true)).toEqual({ sx: 1, sy: -1 });
    expect(xformCornerSigns("ne", true, true)).toEqual({ sx: -1, sy: 1 });
  });
});

describe("scaleFromPivotRatio", () => {
  it("scales by distance ratio from the pivot", () => {
    expect(scaleFromPivotRatio(2, 100, 150)).toBeCloseTo(3, 10);
    expect(scaleFromPivotRatio(1, 50, 25)).toBeCloseTo(0.5, 10);
  });

  it("floors tiny distances so scale never collapses to zero", () => {
    expect(scaleFromPivotRatio(1, 100, 0)).toBeCloseTo(0.01, 10);
  });
});

describe("reanchorStartDist", () => {
  it("keeps nextScale continuous across a pivot switch", () => {
    const startScale = 2;
    const lastScale = 3;
    const currentDist = 120;
    const startDist = reanchorStartDist(startScale, lastScale, currentDist);
    expect(scaleFromPivotRatio(startScale, startDist, currentDist)).toBeCloseTo(lastScale, 10);
  });

  it("respects the minimum start distance", () => {
    expect(reanchorStartDist(1, 1, 2, 8)).toBe(8);
  });
});

describe("scaleXformReleaseImpulse", () => {
  it("keeps 25% of the release impulse by default", () => {
    expect(XFORM_RELEASE_IMPULSE).toBe(0.25);
    expect(scaleXformReleaseImpulse(40)).toBeCloseTo(10, 10);
    expect(scaleXformReleaseImpulse(-8)).toBeCloseTo(-2, 10);
  });

  it("accepts an explicit keep-factor", () => {
    expect(scaleXformReleaseImpulse(40, 0.5)).toBeCloseTo(20, 10);
  });
});

