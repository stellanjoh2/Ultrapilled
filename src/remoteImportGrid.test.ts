import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeGiphy, isGiphyOpen, openGiphyImport } from "./giphyPanel";
import { closeUnsplash, isUnsplashOpen, openUnsplashImport } from "./unsplashPanel";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "style.css"), "utf8");

function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThan(-1);
  const end = css.indexOf("}", start);
  return css.slice(start, end);
}

describe("remote import grid scroll", () => {
  beforeEach(() => {
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

  it("scrolls a wrapper around the grid so extra pages lengthen the list", () => {
    expect(rule(".unsplash-grid-scroll")).toMatch(/overflow:\s*auto/);
    expect(rule(".unsplash-grid-scroll")).toMatch(/flex:\s*1/);
    expect(rule(".unsplash-grid")).not.toMatch(/overflow:/);
    expect(rule(".unsplash-grid")).not.toMatch(/flex:\s*1/);
  });

  it("wraps Giphy and Unsplash thumbnails in that scroller", () => {
    openGiphyImport({ onPick() {} });
    expect(isGiphyOpen()).toBe(true);
    expect(document.querySelector(".unsplash-grid-scroll [data-giphy-grid]")).toBeTruthy();
    closeGiphy();

    openUnsplashImport({ onPick() {} });
    expect(isUnsplashOpen()).toBe(true);
    expect(document.querySelector(".unsplash-grid-scroll [data-unsplash-grid]")).toBeTruthy();
  });
});
