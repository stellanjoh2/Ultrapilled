import { describe, expect, it } from "vitest";
import { SHARE_OG_MAX_EDGE, shareOgSize } from "./sharePreview";

describe("share preview", () => {
  it("fits the canvas into the OG max edge", () => {
    const size = shareOgSize({ width: 1920, height: 1080 });
    expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(SHARE_OG_MAX_EDGE);
    expect(size.width / size.height).toBeCloseTo(16 / 9, 2);
  });

  it("keeps small frames at native size", () => {
    expect(shareOgSize({ width: 400, height: 300 })).toEqual({ width: 400, height: 300 });
  });
});
