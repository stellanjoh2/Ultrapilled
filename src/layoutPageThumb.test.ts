import { describe, expect, it } from "vitest";
import { PAGE_THUMB_MAX_H, PAGE_THUMB_MAX_W, pageThumbSize } from "./layoutPageThumb";

describe("pageThumbSize", () => {
  it("fits landscape into the max box", () => {
    const size = pageThumbSize({ width: 1920, height: 1080 });
    expect(size.width).toBeLessThanOrEqual(PAGE_THUMB_MAX_W);
    expect(size.height).toBeLessThanOrEqual(PAGE_THUMB_MAX_H);
    expect(size.width / size.height).toBeCloseTo(16 / 9, 2);
  });

  it("fits portrait into the max box", () => {
    const size = pageThumbSize({ width: 1080, height: 1920 });
    expect(size.width).toBeLessThanOrEqual(PAGE_THUMB_MAX_W);
    expect(size.height).toBe(PAGE_THUMB_MAX_H);
  });
});
