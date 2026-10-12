import { describe, expect, it } from "vitest";
import { defaultImageSlot } from "./types";
import { canRelinkSlot, imageRemoteOf, parseRemoteFromName, srcNeedsRelink } from "./remoteImage";

describe("remoteImage", () => {
  it("parses Unsplash, Giphy, and Phosphor filenames", () => {
    expect(parseRemoteFromName("unsplash-Jane_Doe-nR5r4U8aYY.jpg")).toEqual({
      kind: "unsplash",
      id: "nR5r4U8aYY",
    });
    expect(parseRemoteFromName("giphy-PBS-w-3o7aCTPPm4OHfRLSH6.gif")).toEqual({
      kind: "giphy",
      id: "3o7aCTPPm4OHfRLSH6",
    });
    expect(parseRemoteFromName("phosphor-fill-heart.svg")).toEqual({
      kind: "phosphor",
      id: "fill:heart",
    });
    expect(parseRemoteFromName("phosphor-regular-rocket.svg")).toEqual({
      kind: "phosphor",
      id: "regular:rocket",
    });
    expect(parseRemoteFromName("phosphor-heart.svg")).toEqual({
      kind: "phosphor",
      id: "fill:heart",
    });
    expect(parseRemoteFromName("photo.png")).toBeNull();
  });

  it("prefers stored remote over the filename", () => {
    expect(
      imageRemoteOf(
        defaultImageSlot({
          name: "giphy-old-aaaa.gif",
          remote: { kind: "unsplash", id: "kept-id" },
        }),
      ),
    ).toEqual({ kind: "unsplash", id: "kept-id" });
  });

  it("treats blob URLs as dead after reconnect", () => {
    expect(srcNeedsRelink("blob:http://localhost/abc")).toBe(true);
    expect(srcNeedsRelink("")).toBe(true);
    expect(srcNeedsRelink("data:image/gif;base64,xx")).toBe(false);
    expect(srcNeedsRelink("https://images.unsplash.com/photo")).toBe(false);
  });

  it("offers relink only when a remote image is actually missing", () => {
    const missing = defaultImageSlot({
      name: "giphy-x-abc.gif",
      src: "",
      remote: { kind: "giphy", id: "abc" },
    });
    expect(canRelinkSlot(missing)).toBe(true);

    const live = defaultImageSlot({
      name: "giphy-x-abc.gif",
      src: "data:image/gif;base64,xx",
      remote: { kind: "giphy", id: "abc" },
    });
    expect(canRelinkSlot(live)).toBe(false);

    const local = defaultImageSlot({ name: "photo.png", src: "" });
    expect(canRelinkSlot(local)).toBe(false);
  });
});
