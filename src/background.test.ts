import { describe, expect, it } from "vitest";
import { backgroundPaint, imageFrame, paintUnsplashCredit, putBackgroundImage } from "./background";
import { defaultBackground, normalizeBackground } from "./types";

describe("imageFrame", () => {
  it("covers the stage so photos fill without letterboxing", () => {
    expect(imageFrame()).toEqual({ size: "cover", position: "center center" });
  });
});

describe("Unsplash background credit", () => {
  it("keeps photographer attribution on normalize", () => {
    const next = normalizeBackground({
      imageCredit: { photographer: "Ada Lovelace", profileUrl: "https://unsplash.com/@ada" },
    });
    expect(next.imageCredit).toEqual({
      photographer: "Ada Lovelace",
      profileUrl: "https://unsplash.com/@ada",
    });
  });

  it("drops non-https attribution links", () => {
    expect(
      normalizeBackground({
        imageCredit: { photographer: "Ada", profileUrl: "javascript:alert(1)" },
      }).imageCredit,
    ).toBeNull();
  });

  it("paints attribution on export-sized frames", () => {
    const ctx = {
      save() {},
      restore() {},
      fillText() {},
      font: "",
      textAlign: "start",
      textBaseline: "alphabetic",
      fillStyle: "",
      shadowColor: "",
      shadowBlur: 0,
      shadowOffsetY: 0,
    };
    expect(() =>
      paintUnsplashCredit(ctx as unknown as CanvasRenderingContext2D, 1280, 720, {
        photographer: "Ada Lovelace",
        profileUrl: "https://unsplash.com/@ada",
      }),
    ).not.toThrow();
  });
});

describe("background image opacity", () => {
  it("defaults to full strength and clamps", () => {
    expect(normalizeBackground({}).imageOpacity).toBe(100);
    expect(normalizeBackground({ imageOpacity: 40 }).imageOpacity).toBe(40);
    expect(normalizeBackground({ imageOpacity: 140 }).imageOpacity).toBe(100);
  });

  it("veils the photo over black so lower opacity darkens the stage", () => {
    putBackgroundImage("bg-op", "https://images.unsplash.com/photo-test", "forest", 1920, 1080);
    const background = {
      ...defaultBackground(),
      kind: "image" as const,
      imageId: "bg-op",
      imageOpacity: 40,
    };
    const paint = backgroundPaint(background, "16:9", "#ff00ff");
    expect(paint.color).toBe("#000");
    expect(paint.image).toContain("rgb(0 0 0 / 0.6)");
    expect(paint.image).toContain("url(\"https://images.unsplash.com/photo-test\")");
  });
});
