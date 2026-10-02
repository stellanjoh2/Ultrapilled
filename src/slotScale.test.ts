import { describe, expect, it } from "vitest";
import {
  SCALE_FREE_BASE,
  SCALE_FREE_CEILING,
  SCALE_FREE_REF_MASTER,
  SCALE_MIN,
  SCALE_SLIDER_MAX,
  SCALE_UPLOAD_SLIDER_MAX,
  clampScaleContinuous,
  clampScaleForFreeTransform,
  clampScaleForSlider,
  freeTransformScaleMax,
  slotScaleSliderMax,
} from "./slotScale";

describe("slotScaleSliderMax", () => {
  it("keeps the soft panel ceiling for normal values", () => {
    expect(slotScaleSliderMax(1, false)).toBe(SCALE_SLIDER_MAX);
    expect(slotScaleSliderMax(1, true)).toBe(SCALE_UPLOAD_SLIDER_MAX);
  });

  it("expands when free-transform already set a higher value", () => {
    expect(slotScaleSliderMax(12, false)).toBe(12);
    expect(slotScaleSliderMax(9, true)).toBe(9);
  });
});

describe("freeTransformScaleMax", () => {
  it("is at least the base ceiling at default composition scale", () => {
    expect(freeTransformScaleMax(SCALE_FREE_REF_MASTER)).toBe(SCALE_FREE_BASE);
    expect(freeTransformScaleMax(10)).toBe(SCALE_FREE_BASE);
  });

  it("rises after heavy composition scale-down so tiny chips can recover", () => {
    const low = freeTransformScaleMax(0.4);
    expect(low).toBeGreaterThan(SCALE_FREE_BASE);
    expect(low).toBeLessThanOrEqual(SCALE_FREE_CEILING);
    // ≈ 100 * 3.5 / 0.4 = 875 → ceiling 500
    expect(low).toBe(SCALE_FREE_CEILING);
  });
});

describe("clampScaleContinuous", () => {
  it("clamps without centi rounding (live free-transform preview)", () => {
    expect(clampScaleContinuous(1.23456, 100)).toBe(1.23456);
    expect(clampScaleContinuous(0.01, 100)).toBe(SCALE_MIN);
    expect(clampScaleContinuous(999, 50)).toBe(50);
  });
});

describe("clampScaleForFreeTransform", () => {
  it("allows growing far past the panel slider soft max", () => {
    expect(clampScaleForFreeTransform(50, 3.5)).toBe(50);
    expect(clampScaleForFreeTransform(3.05, 3.5)).toBe(3.05);
  });

  it("floors at SCALE_MIN and caps at the free-transform max", () => {
    expect(clampScaleForFreeTransform(0.01, 3.5)).toBe(SCALE_MIN);
    expect(clampScaleForFreeTransform(999, 3.5)).toBe(SCALE_FREE_BASE);
    expect(clampScaleForFreeTransform(999, 0.4)).toBe(SCALE_FREE_CEILING);
  });
});

describe("clampScaleForSlider", () => {
  it("shares the free-transform hard ceiling (HTML soft-max is separate)", () => {
    expect(clampScaleForSlider(2.5, 3.5)).toBe(2.5);
    expect(clampScaleForSlider(80, 3.5)).toBe(80);
  });
});
