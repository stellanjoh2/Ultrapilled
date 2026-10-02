import { describe, expect, it } from "vitest";
import { chipContributesBloom } from "./chipLook";
import { BLOOM_MIN_LUMINANCE, BLOOM_MIN_PEAK, fillBlooms, fillLuminance } from "./theme";
import { defaultImageSlot, defaultTextSlot, defaultTypeSlot } from "./types";

describe("fillBlooms / bloom luminance gate", () => {
  it("exports a near-black luminance floor and neon peak escape", () => {
    expect(BLOOM_MIN_LUMINANCE).toBe(0.18);
    expect(BLOOM_MIN_PEAK).toBe(0.5);
  });

  it("keeps pure black and stage black from blooming", () => {
    expect(fillLuminance("#000000")).toBe(0);
    expect(fillBlooms("#000000")).toBe(false);
    expect(fillBlooms("#080808")).toBe(false);
    expect(fillBlooms("#111111")).toBe(false);
    expect(fillBlooms("#2a2a2a")).toBe(false);
  });

  it("lets neon yellow, lime, pink, cyan, and Orby purple bloom", () => {
    expect(fillBlooms("#c4ff00")).toBe(true);
    expect(fillBlooms("#ffff00")).toBe(true);
    expect(fillBlooms("#ff00c4")).toBe(true);
    expect(fillBlooms("#00c4ff")).toBe(true);
    // Deep neon purple sits under the luma floor but clears the peak escape.
    expect(fillLuminance("#3b00ff")).toBeLessThan(BLOOM_MIN_LUMINANCE);
    expect(fillBlooms("#3b00ff")).toBe(true);
    expect(fillBlooms("#ffffff")).toBe(true);
  });
});

describe("chipContributesBloom", () => {
  it("skips dark pill fills and dark tinted SVG shapes", () => {
    const pill = defaultTextSlot({ color: "#000000" });
    expect(chipContributesBloom(pill, "#000000", "#ffffff")).toBe(false);

    const flower = defaultImageSlot({
      name: "flower.svg",
      src: "data:image/svg+xml,x",
      tint: true,
    });
    expect(chipContributesBloom(flower, "#000000", "#ffffff")).toBe(false);
    expect(chipContributesBloom(flower, "#c4ff00", "#111111")).toBe(true);
  });

  it("skips YouTube / video bloom stand-ins", () => {
    const yt = defaultImageSlot({
      youtube: { videoId: "dQw4w9WgXcQ", startSec: 0, loopSec: 10 },
    });
    expect(chipContributesBloom(yt, "#ffffff", "#ffffff")).toBe(false);

    const video = defaultImageSlot({
      video: { src: "blob:x", ready: true, width: 100, height: 100 },
    });
    expect(chipContributesBloom(video, "#ffffff", "#ffffff")).toBe(false);
  });

  it("keeps emoji and photo rasters blooming", () => {
    const emoji = defaultImageSlot({ emoji: "🔥", size: 64 });
    expect(chipContributesBloom(emoji, "#000000", "#000000")).toBe(true);

    const photo = defaultImageSlot({ name: "shot.jpg", src: "https://example.com/a.jpg" });
    expect(chipContributesBloom(photo, "#000000", "#000000")).toBe(true);
  });

  it("gates bare text on ink brightness", () => {
    const bare = defaultTypeSlot({ color: "#c4ff00" });
    expect(chipContributesBloom(bare, "#c4ff00", "#000000")).toBe(false);
    expect(chipContributesBloom(bare, "#c4ff00", "#ffff00")).toBe(true);
  });

  it("blooms a dark→bright gradient shape when either stop is bright", () => {
    const pill = defaultTextSlot({ gradient: true });
    expect(chipContributesBloom(pill, "#000000", "#ffffff", "#c4ff00")).toBe(true);
    expect(chipContributesBloom(pill, "#000000", "#ffffff", "#111111")).toBe(false);
  });
});
