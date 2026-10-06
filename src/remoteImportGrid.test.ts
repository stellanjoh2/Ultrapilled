import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeGiphy, isGiphyOpen, openGiphyImport } from "./giphyPanel";
import { closeUnsplash, isUnsplashOpen, openUnsplashImport } from "./unsplashPanel";

describe("remote import grid scroll", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "" }));
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        addEventListener() {},
        removeEventListener() {},
      }),
    );
  });

  afterEach(() => {
    closeGiphy();
    closeUnsplash();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("wraps Giphy and Unsplash thumbnails in a scroller", () => {
    openGiphyImport({ onPick() {} });
    expect(isGiphyOpen()).toBe(true);
    expect(document.querySelector(".unsplash-grid-scroll [data-giphy-grid]")).toBeTruthy();
    closeGiphy();

    openUnsplashImport({ onPick() {} });
    expect(isUnsplashOpen()).toBe(true);
    expect(document.querySelector(".unsplash-grid-scroll [data-unsplash-grid]")).toBeTruthy();
  });
});
