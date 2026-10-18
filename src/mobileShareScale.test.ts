import { describe, expect, it } from "vitest";
import {
  SHARE_FROM_16x9_FEEL,
  clampSharePinch,
  remapPosesToShareFrame,
  shareContainScale,
  shareViewerChipScale,
  shareViewerFeel,
  shareViewerMapScale,
  shareViewerTargetCanvas,
} from "./mobileShareScale";

describe("mobile share scale", () => {
  const from16 = { width: 1920, height: 1080 };
  const from916 = { width: 1080, height: 1920 };
  const phone = { width: 390, height: 693 };
  const landscape = { width: 1280, height: 720 };

  it("applies an extra −25% when a 16:9 source lands on a tall phone frame", () => {
    expect(shareViewerFeel("16:9", phone)).toBe(SHARE_FROM_16x9_FEEL);
    const plain = shareContainScale(from16, phone);
    expect(shareViewerMapScale(from16, phone, "16:9")).toBeCloseTo(plain * 0.75, 5);
    expect(shareViewerChipScale(from16, phone, "16:9")).toBeCloseTo(
      shareViewerChipScale(from16, phone, undefined) * 0.75,
      5,
    );
  });

  it("keeps 16:9 → 16:9 at 1:1 feel (no extra shrink)", () => {
    expect(shareViewerFeel("16:9", landscape)).toBe(1);
    expect(shareViewerMapScale(from16, landscape, "16:9")).toBeCloseTo(
      shareContainScale(from16, landscape),
      8,
    );
  });

  it("keeps 9:16 → phone 1:1 with contain (no extra feel)", () => {
    expect(shareViewerFeel("9:16", phone)).toBe(1);
    expect(shareViewerMapScale(from916, phone, "9:16")).toBeCloseTo(
      shareContainScale(from916, phone),
      8,
    );
    expect(shareContainScale(from916, phone)).toBeCloseTo(phone.height / from916.height, 5);
  });

  it("picks a matching canvas when the viewport aspect matches the source", () => {
    expect(shareViewerTargetCanvas("16:9", 1280, 720)).toBe("16:9");
    expect(shareViewerTargetCanvas("9:16", 390, 693)).toBe("9:16");
    expect(shareViewerTargetCanvas("16:9", 390, 693)).toBe("9:16");
  });

  it("contains and centers remapped poses", () => {
    const s = shareViewerMapScale(from16, phone, "16:9");
    const offsetX = (phone.width - from16.width * s) / 2;
    const offsetY = (phone.height - from16.height * s) / 2;
    const [out] = remapPosesToShareFrame(
      [{ slotId: "a", seqIndex: 0, sizeUnit: 0, x: 960, y: 540, angle: 0.2 }],
      from16,
      phone,
      "16:9",
    );
    expect(out!.x).toBeCloseTo(960 * s + offsetX, 5);
    expect(out!.y).toBeCloseTo(540 * s + offsetY, 5);
  });

  it("clamps pinch scale", () => {
    expect(clampSharePinch(0.1)).toBe(0.55);
    expect(clampSharePinch(3)).toBe(1.85);
    expect(clampSharePinch(1.2)).toBeCloseTo(1.2, 5);
  });
});
