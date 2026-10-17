import { afterEach, describe, expect, it, vi } from "vitest";
import { closeGiphy, isGiphyOpen, openGiphyImport } from "./giphyPanel";
import { closePhosphor, isPhosphorOpen, openPhosphorImport } from "./phosphorPanel";
import { closeUnsplash, isUnsplashOpen, openUnsplashImport } from "./unsplashPanel";
import { closeYouTube, isYouTubeOpen, openYouTubeImport } from "./youtubePanel";

describe("import modal close targets", () => {
  afterEach(() => {
    closeUnsplash();
    closePhosphor();
    closeGiphy();
    closeYouTube();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  function stubReducedMotion() {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        addEventListener() {},
        removeEventListener() {},
      }),
    );
  }

  function clickSvgClose(selector: string) {
    const path = document.querySelector(`${selector} svg path, ${selector} svg`);
    expect(path).toBeTruthy();
    expect(path instanceof HTMLElement).toBe(false);
    path!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }

  it("closes Unsplash when clicking the SVG inside the X", () => {
    stubReducedMotion();
    openUnsplashImport({});
    expect(isUnsplashOpen()).toBe(true);
    clickSvgClose(".unsplash-modal__x");
    expect(isUnsplashOpen()).toBe(false);
  });

  it("closes Phosphor when clicking the SVG inside the X", () => {
    stubReducedMotion();
    openPhosphorImport({ onPick() {} });
    expect(isPhosphorOpen()).toBe(true);
    clickSvgClose(".unsplash-modal__x");
    expect(isPhosphorOpen()).toBe(false);
  });

  it("closes Giphy when clicking the SVG inside the X", () => {
    stubReducedMotion();
    openGiphyImport({ onPick() {} });
    expect(isGiphyOpen()).toBe(true);
    clickSvgClose(".unsplash-modal__x");
    expect(isGiphyOpen()).toBe(false);
  });

  it("closes YouTube when clicking the SVG inside the X", () => {
    stubReducedMotion();
    openYouTubeImport({ onPick() {} });
    expect(isYouTubeOpen()).toBe(true);
    clickSvgClose(".unsplash-modal__x");
    expect(isYouTubeOpen()).toBe(false);
  });
});
