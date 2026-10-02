import { describe, expect, it } from "vitest";
import {
  oppositeXformCorner,
  reanchorStartDist,
  scaleFromPivotRatio,
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
