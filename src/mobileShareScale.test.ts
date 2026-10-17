import { describe, expect, it } from "vitest";
import { remapPosesToShareFrame, shareContainScale, shareViewerChipScale } from "./mobileShareScale";

describe("mobile share scale", () => {
  it("contains the full 16:9 board in 9:16 and centers it", () => {
    const from = { width: 1920, height: 1080 };
    const to = { width: 390, height: 693 };
    const s = shareContainScale(from, to);
    expect(s).toBeCloseTo(to.width / from.width, 5);
    const offsetX = (to.width - from.width * s) / 2;
    const offsetY = (to.height - from.height * s) / 2;
    const [out] = remapPosesToShareFrame(
      [{ slotId: "a", seqIndex: 0, sizeUnit: 0, x: 960, y: 540, angle: 0.2 }],
      from,
      to,
    );
    expect(out!.x).toBeCloseTo(960 * s + offsetX, 5);
    expect(out!.y).toBeCloseTo(540 * s + offsetY, 5);
    // Corners stay inside the destination frame.
    const [tl] = remapPosesToShareFrame(
      [{ slotId: "a", seqIndex: 0, sizeUnit: 0, x: 0, y: 0, angle: 0 }],
      from,
      to,
    );
    const [br] = remapPosesToShareFrame(
      [{ slotId: "a", seqIndex: 0, sizeUnit: 0, x: 1920, y: 1080, angle: 0 }],
      from,
      to,
    );
    expect(tl!.x).toBeGreaterThanOrEqual(0);
    expect(tl!.y).toBeGreaterThanOrEqual(0);
    expect(br!.x).toBeLessThanOrEqual(to.width + 0.001);
    expect(br!.y).toBeLessThanOrEqual(to.height + 0.001);
  });

  it("scales chips with the same contain factor as poses", () => {
    const from = { width: 1920, height: 1080 };
    const to = { width: 390, height: 693 };
    const scale = shareViewerChipScale(from, to);
    // Smaller than height-cover (~0.48), larger than broken phone frame.scale (~0.05).
    expect(scale).toBeGreaterThan(0.08);
    expect(scale).toBeLessThan(0.25);
    expect(scale).toBeCloseTo(shareViewerChipScale(from, to), 8);
  });
});
