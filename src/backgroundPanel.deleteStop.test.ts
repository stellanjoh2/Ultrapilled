import { afterEach, describe, expect, it } from "vitest";
import { handleBackgroundStopDelete, mountBackgroundPanel, type BackgroundController } from "./backgroundPanel";
import { demoState } from "./types";

function controller(showing = true): BackgroundController {
  const state = demoState();
  state.background.kind = "gradient";
  state.background.stops = [
    { id: "a", color: "#ff00ff", at: 0 },
    { id: "b", color: "#ffff00", at: 50 },
    { id: "c", color: "#000000", at: 100 },
  ];
  return {
    state: () => state,
    remember() {},
    endGesture() {},
    apply() {},
    refresh() {},
    showing: () => showing,
  };
}

describe("handleBackgroundStopDelete", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("removes the selected stop instead of no-oping when three stops exist", () => {
    const host = controller();
    const panel = document.createElement("div");
    document.body.append(panel);
    mountBackgroundPanel(panel, host, 0);

    const middle = panel.querySelector<HTMLElement>('[data-stop="b"]');
    expect(middle).toBeTruthy();
    middle!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, clientX: 0, clientY: 0 }));

    expect(handleBackgroundStopDelete(host)).toBe(true);
    expect(host.state().background.stops.map((stop) => stop.id)).toEqual(["a", "c"]);
  });

  it("consumes Delete at the two-stop minimum without removing either", () => {
    const host = controller();
    host.state().background.stops = [
      { id: "a", color: "#ff00ff", at: 0 },
      { id: "c", color: "#000000", at: 100 },
    ];
    const panel = document.createElement("div");
    document.body.append(panel);
    mountBackgroundPanel(panel, host, 0);

    expect(handleBackgroundStopDelete(host)).toBe(true);
    expect(host.state().background.stops).toHaveLength(2);
  });

  it("ignores Delete when the background panel is not showing", () => {
    const host = controller(false);
    expect(handleBackgroundStopDelete(host)).toBe(false);
  });
});
