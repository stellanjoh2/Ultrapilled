import { describe, expect, it } from "vitest";
import { unsplashHotlinkUrl, type UnsplashPhoto } from "./unsplashApi";

function photo(partial: Partial<UnsplashPhoto> = {}): UnsplashPhoto {
  return {
    id: "abc",
    alt: "forest",
    thumb: "https://images.unsplash.com/photo-test?w=200",
    regular: "https://images.unsplash.com/photo-test?w=1080&fit=max",
    raw: "https://images.unsplash.com/photo-test?ixid=raw",
    downloadLocation: "https://api.unsplash.com/photos/abc/download",
    photographer: "Ada",
    profileUrl: "https://unsplash.com/@ada",
    pageUrl: "https://unsplash.com/photos/abc",
    width: 6000,
    height: 4000,
    ...partial,
  };
}

describe("unsplashHotlinkUrl", () => {
  it("requests a 3840-wide derivative instead of the 1080 regular crop", () => {
    const url = new URL(unsplashHotlinkUrl(photo()));
    expect(url.searchParams.get("w")).toBe("3840");
    expect(url.searchParams.get("h")).toBe("3840");
    expect(url.searchParams.get("fit")).toBe("max");
  });

  it("does not ask for more pixels than the original", () => {
    const url = new URL(unsplashHotlinkUrl(photo({ width: 1600, height: 900 })));
    expect(url.searchParams.get("w")).toBe("1600");
  });
});
