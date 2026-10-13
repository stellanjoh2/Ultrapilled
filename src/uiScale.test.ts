import { describe, expect, it } from "vitest";
import { chromeScale, compositionScale, UI_REF_H, UI_REF_W, viewportScale } from "./uiScale";

describe("viewportScale", () => {
  it("is 1 at the 2560×1440 authoring size", () => {
    expect(viewportScale(UI_REF_W, UI_REF_H)).toBe(1);
  });

  it("is 0.75 at 1080p and 1.5 at 4K", () => {
    expect(viewportScale(1920, 1080)).toBeCloseTo(0.75, 10);
    expect(viewportScale(3840, 2160)).toBeCloseTo(1.5, 10);
  });

  it("is height-limited on ultrawide 1440p", () => {
    expect(viewportScale(3440, 1440)).toBe(1);
  });

  it("falls back to 1 for a collapsed viewport", () => {
    expect(viewportScale(0, 1080)).toBe(1);
    expect(viewportScale(1920, 1)).toBe(1);
  });
});

describe("chromeScale", () => {
  it("matches viewport at and above the authoring size", () => {
    expect(chromeScale(UI_REF_W, UI_REF_H)).toBe(1);
    expect(chromeScale(3840, 2160)).toBeCloseTo(1.5, 10);
  });

  it("softens laptop shrink so 1710×1107 stays readable", () => {
    const view = viewportScale(1710, 1107);
    expect(view).toBeCloseTo(1710 / 2560, 10);
    expect(chromeScale(1710, 1107)).toBeCloseTo(Math.sqrt(view), 10);
    // ~327px panel / ~12.3px body vs ~267 / ~10 on linear scale
    expect(400 * chromeScale(1710, 1107)).toBeGreaterThan(320);
    expect(15 * chromeScale(1710, 1107)).toBeGreaterThan(12);
  });

  it("is gentler than linear at 1080p", () => {
    expect(chromeScale(1920, 1080)).toBeCloseTo(Math.sqrt(0.75), 10);
    expect(chromeScale(1920, 1080)).toBeGreaterThan(viewportScale(1920, 1080));
  });
});

describe("compositionScale", () => {
  it("keeps a chip the same fraction of a 16:9 stage", () => {
    const authored = 200;
    const views = [
      [1920, 1080],
      [2560, 1440],
      [3840, 2160],
    ] as const;
    const fracs = views.map(([w, h]) => (authored * compositionScale(1, w, h)) / w);
    expect(fracs[0]).toBeCloseTo(fracs[1], 10);
    expect(fracs[2]).toBeCloseTo(fracs[1], 10);
  });

  it("still applies the framed-canvas factor", () => {
    expect(compositionScale(0.5, 2560, 1440)).toBeCloseTo(0.5, 10);
    expect(compositionScale(0.5, 1920, 1080)).toBeCloseTo(0.375, 10);
  });

  it("stays on linear viewport fit, not the soft chrome curve", () => {
    expect(compositionScale(1, 1710, 1107)).toBeCloseTo(viewportScale(1710, 1107), 10);
    expect(compositionScale(1, 1710, 1107)).toBeLessThan(chromeScale(1710, 1107));
  });
});
