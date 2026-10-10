import { describe, expect, it } from "vitest";
import { isGifBloomSlot } from "./chipDomPaint";
import { isGifSrc } from "./trim";
import type { ImageSlot } from "./types";

function imageSlot(partial: Partial<ImageSlot> & Pick<ImageSlot, "src" | "name">): ImageSlot {
  return {
    id: "img-1",
    kind: "image",
    size: 120,
    amount: 1,
    colorIndex: 0,
    scale: 1,
    ...partial,
  };
}

describe("isGifSrc / isGifBloomSlot", () => {
  it("detects gif names and mime urls", () => {
    expect(isGifSrc("blob:http://localhost/x", "fish.gif")).toBe(true);
    expect(isGifSrc("data:image/gif;base64,R0lGOD", "clip")).toBe(true);
    expect(isGifSrc("https://media.giphy.com/media/abc/giphy.gif", "")).toBe(true);
    expect(isGifSrc("photo.png", "photo.png")).toBe(false);
  });

  it("only blooms live gif rasters (not emoji / video / mask)", () => {
    expect(isGifBloomSlot(imageSlot({ src: "a.gif", name: "a.gif" }))).toBe(true);
    expect(isGifBloomSlot(imageSlot({ src: "a.gif", name: "a.gif", emoji: "🐟" }))).toBe(false);
    expect(
      isGifBloomSlot(
        imageSlot({
          src: "a.gif",
          name: "a.gif",
          video: { src: "a.mp4", ready: true },
        }),
      ),
    ).toBe(false);
    expect(isGifBloomSlot(imageSlot({ src: "shot.png", name: "shot.png" }))).toBe(false);
  });
});
