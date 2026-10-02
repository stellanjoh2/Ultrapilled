import { describe, expect, it } from "vitest";
import { isColorMask, isSvgSource } from "./chipKinds";
import { imageAdjustActive, imageRasterFilter, rasterRing, textLookFlags } from "./chipLook";
import { ICON_PRESETS } from "./icons";
import { defaultImageSlot, defaultTextSlot, defaultTypeSlot } from "./types";

describe("isSvgSource", () => {
  it("detects svg by name and data url", () => {
    expect(isSvgSource(defaultImageSlot({ name: "star.svg", src: "blob:x" }))).toBe(true);
    expect(isSvgSource(defaultImageSlot({ name: "photo.png", src: "data:image/svg+xml;base64,abc" }))).toBe(true);
    expect(isSvgSource(defaultImageSlot({ name: "photo.png", src: "https://cdn.example/a.svg" }))).toBe(true);
    expect(isSvgSource(defaultImageSlot({ name: "photo.png", src: "https://cdn.example/a.png" }))).toBe(false);
  });
});

describe("isColorMask", () => {
  it("masks preset silhouettes and tinted uploaded svgs", () => {
    const preset = ICON_PRESETS[0]!;
    expect(isColorMask(defaultImageSlot({ src: preset.src, name: preset.id, tint: false }))).toBe(true);
    expect(isColorMask(defaultImageSlot({ name: "pic.png", src: "data:image/png;base64,xx", tint: true }))).toBe(false);
    expect(isColorMask(defaultImageSlot({ name: "custom.svg", src: "data:image/svg+xml,x", tint: false }))).toBe(false);
    expect(isColorMask(defaultImageSlot({ name: "custom.svg", src: "data:image/svg+xml,x", tint: true }))).toBe(true);
  });
});

describe("textLookFlags", () => {
  it("classifies bare, ring, and shape gradient", () => {
    expect(textLookFlags(defaultTypeSlot({ gradient: true }))).toEqual({
      ring: false,
      bare: true,
      shapeGradient: false,
      textGradient: true,
    });
    expect(textLookFlags(defaultTextSlot({ stroked: true, gradient: true }))).toEqual({
      ring: true,
      bare: false,
      shapeGradient: false,
      textGradient: false,
    });
    expect(textLookFlags(defaultTextSlot({ gradient: true }))).toEqual({
      ring: false,
      bare: false,
      shapeGradient: true,
      textGradient: false,
    });
  });
});

describe("rasterRing", () => {
  it("only rings stroked non-svg uploads", () => {
    expect(rasterRing(defaultImageSlot({ name: "a.png", stroked: true }))).toBe(true);
    expect(rasterRing(defaultImageSlot({ name: "a.svg", stroked: true }))).toBe(false);
    expect(rasterRing(defaultImageSlot({ name: "a.png", stroked: false }))).toBe(false);
  });
});

describe("imageRasterFilter", () => {
  it("keeps invert explicit and omits neutral adjusts", () => {
    expect(imageRasterFilter(defaultImageSlot())).toBe("invert(0)");
    expect(imageRasterFilter(defaultImageSlot({ inverted: true }))).toBe("invert(1)");
  });

  it("maps Figma-style ranges onto CSS filter functions", () => {
    expect(
      imageRasterFilter(
        defaultImageSlot({ exposure: 50, contrast: -25, saturation: 100, hue: -90 }),
      ),
    ).toBe("invert(0) brightness(1.5) contrast(0.75) saturate(2) hue-rotate(-90deg)");
  });

  it("composes drop-shadow after color adjusts", () => {
    expect(
      imageRasterFilter(defaultImageSlot({ inverted: true, exposure: -50 }), "drop-shadow(0 8px 16px rgba(0,0,0,0.4))"),
    ).toBe("invert(1) brightness(0.5) drop-shadow(0 8px 16px rgba(0,0,0,0.4))");
  });

  it("reports active adjusts", () => {
    expect(imageAdjustActive(defaultImageSlot())).toBe(false);
    expect(imageAdjustActive(defaultImageSlot({ saturation: 1 }))).toBe(true);
    expect(imageAdjustActive(defaultImageSlot({ hue: 0, exposure: 0 }))).toBe(false);
  });
});
