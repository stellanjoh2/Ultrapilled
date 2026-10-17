import { describe, expect, it } from "vitest";
import {
  SHARE_FROM_16x9_FEEL,
  remapPosesToShareFrame,
  shareContainScale,
  shareViewerChipScale,
  shareViewerFeel,
  shareViewerMapScale,
} from "./mobileShareScale";

describe("mobile share scale", () => {
  const from16 = { width: 1920, height: 1080 };
  const from916 = { width: 1080, height: 1920 };
  const to = { width: 390, height: 693 };

  it("applies an extra −25% when the source canvas is 16:9", () => {
    expect(shareViewerFeel("16:9")).toBe(SHARE_FROM_16x9_FEEL);
    const plain = shareContainScale(from16, to);
    expect(shareViewerMapScale(from16, to, "16:9")).toBeCloseTo(plain * 0.75, 5);
    expect(shareViewerChipScale(from16, to, "16:9")).toBeCloseTo(
      shareViewerChipScale(from16, to, undefined) * 0.75,
      5,
    );
  });

  it("keeps 9:16 → phone 1:1 with contain (no extra feel)", () => {
    expect(shareViewerFeel("9:16")).toBe(1);
    expect(shareViewerMapScale(from916, to, "9:16")).toBeCloseTo(shareContainScale(from916, to), 8);
    // Same-aspect contain matches height (and width) ratio.
    expect(shareContainScale(from916, to)).toBeCloseTo(to.height / from916.height, 5);
  });

  it("contains and centers remapped poses", () => {
    const s = shareViewerMapScale(from16, to, "16:9");
    const offsetX = (to.width - from16.width * s) / 2;
    const offsetY = (to.height - from16.height * s) / 2;
    const [out] = remapPosesToShareFrame(
      [{ slotId: "a", seqIndex: 0, sizeUnit: 0, x: 960, y: 540, angle: 0.2 }],
      from16,
      to,
      "16:9",
    );
    expect(out!.x).toBeCloseTo(960 * s + offsetX, 5);
    expect(out!.y).toBeCloseTo(540 * s + offsetY, 5);
  });
});
