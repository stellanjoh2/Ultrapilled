import { afterEach, describe, expect, it } from "vitest";
import { putBackgroundImage } from "./background";
import { backgroundImageMeta, mountBackgroundPanel, type BackgroundController } from "./backgroundPanel";
import { demoState } from "./types";

function controller(): BackgroundController {
  const state = demoState();
  state.background.grid = true;
  return {
    state: () => state,
    remember() {},
    endGesture() {},
    apply() {},
    refresh() {},
    showing: () => true,
  };
}

describe("background panel tooltips", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("explains grid, density, and color controls", () => {
    const panel = document.createElement("div");
    document.body.append(panel);
    mountBackgroundPanel(panel, controller(), 0);

    expect(panel.querySelector('[data-grid="off"]')?.getAttribute("data-tip")).toBe("Hide the guide overlay");
    expect(panel.querySelector('[data-grid="on"]')?.getAttribute("data-tip")).toMatch(/shortcut G/);
    expect(panel.querySelector('[data-grid-density="base"]')?.getAttribute("data-tip")).toBe("Coarser guides");
    expect(panel.querySelector("#grid-color")?.getAttribute("data-tip")).toBe("Grid line color");
    expect(panel.querySelector("#logo-upload")?.getAttribute("data-tip")).toMatch(/SVG or PNG/);
  });
});

describe("background image controls", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("writes name and pixel size for the loaded photo", () => {
    expect(backgroundImageMeta({ name: "forest.jpg", width: 1920, height: 1080 })).toBe(
      "forest.jpg · 1920 × 1080",
    );
  });

  it("offers upload and Unsplash fetch before a photo is set", () => {
    const host = controller();
    host.state().background.kind = "image";
    const panel = document.createElement("div");
    document.body.append(panel);
    mountBackgroundPanel(panel, host, 0);

    expect(panel.querySelector("#bg-upload")?.textContent).toMatch(/Upload image/i);
    expect(panel.querySelector("#bg-unsplash")?.textContent).toMatch(/Unsplash/);
    expect(panel.querySelector(".file-replace")).toBeNull();
    expect(panel.querySelector("#bg-image-opacity")).toBeNull();
  });

  it("uses the replace-image control with name and size once a photo is loaded", () => {
    putBackgroundImage(
      "bg-test-photo",
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
      "forest.jpg",
      1920,
      1080,
    );
    const host = controller();
    host.state().background.kind = "image";
    host.state().background.imageId = "bg-test-photo";
    const panel = document.createElement("div");
    document.body.append(panel);
    mountBackgroundPanel(panel, host, 0);

    expect(panel.querySelector(".file-replace")).toBeTruthy();
    expect(panel.querySelector(".file-replace__text")?.textContent).toBe("Browse");
    expect(panel.querySelector("#bg-name")?.textContent).toBe("forest.jpg · 1920 × 1080");
    expect(panel.querySelector("#bg-upload")).toBeNull();
    expect(panel.querySelector("#bg-unsplash")?.textContent).toMatch(/Unsplash/);
    expect(panel.querySelector("#bg-clear")).toBeTruthy();
    expect(panel.querySelector("#bg-image-opacity")).toBeTruthy();
    expect(panel.querySelector("#bg-image-opacity-label")?.textContent).toMatch(/Opacity 100/);
  });
});
