import { describe, expect, it } from "vitest";
import { remapPosesToShareFrame, shareViewerChipScale } from "./mobileShareScale";

describe("mobile share scale", () => {
  it("remaps poses with uniform height scale and centers horizontally", () => {
    const from = { width: 1920, height: 1080 };
    const to = { width: 390, height: 693 };
    const s = to.height / from.height;
    const offsetX = (to.width - from.width * s) / 2;
    const [out] = remapPosesToShareFrame(
      [{ slotId: "a", seqIndex: 0, sizeUnit: 0, x: 960, y: 540, angle: 0.2 }],
      from,
      to,
    );
    expect(out!.x).toBeCloseTo(960 * s + offsetX, 5);
    expect(out!.y).toBeCloseTo(540 * s, 5);
    expect(out!.angle).toBe(0.2);
  });

  it("keeps chip scale proportional to frame height", () => {
    const from = { width: 1920, height: 1080 };
    const to = { width: 390, height: 693 };
    const scale = shareViewerChipScale(from, to);
    // Far larger than naive compositionScale(frame.scale) on a phone (~0.05).
    expect(scale).toBeGreaterThan(0.15);
    expect(scale).toBeLessThan(1);
  });
});
