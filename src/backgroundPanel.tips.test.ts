import { afterEach, describe, expect, it } from "vitest";
import { mountBackgroundPanel, type BackgroundController } from "./backgroundPanel";
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
