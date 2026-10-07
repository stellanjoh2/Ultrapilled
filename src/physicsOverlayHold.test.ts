import { afterEach, describe, expect, it, vi } from "vitest";
import {
  holdPhysicsForOverlay,
  isPhysicsHeldByOverlay,
  registerPhysicsWorld,
  releasePhysicsForOverlay,
  resetPhysicsOverlayHoldForTests,
} from "./physicsOverlayHold";
import { setTextAnimsPaused } from "./textAnim";

vi.mock("./textAnim", () => ({
  setTextAnimsPaused: vi.fn(),
}));

describe("physicsOverlayHold", () => {
  afterEach(() => {
    resetPhysicsOverlayHoldForTests();
    document.documentElement.classList.remove("is-asset-anims-frozen");
    vi.mocked(setTextAnimsPaused).mockClear();
  });

  it("stops registered worlds on first hold and ignores nested holds", () => {
    const setRunning = vi.fn();
    registerPhysicsWorld({ setRunning });

    holdPhysicsForOverlay();
    holdPhysicsForOverlay();
    expect(isPhysicsHeldByOverlay()).toBe(true);
    expect(setRunning).toHaveBeenCalledTimes(1);
    expect(setRunning).toHaveBeenCalledWith(false);

    releasePhysicsForOverlay();
    expect(isPhysicsHeldByOverlay()).toBe(true);
    releasePhysicsForOverlay();
    expect(isPhysicsHeldByOverlay()).toBe(false);
  });

  it("freezes text/gradient anims while held and restores user freeze preference", () => {
    holdPhysicsForOverlay();
    expect(document.documentElement.classList.contains("is-overlay-anims-frozen")).toBe(true);
    expect(setTextAnimsPaused).toHaveBeenCalledWith(true);

    releasePhysicsForOverlay();
    expect(document.documentElement.classList.contains("is-overlay-anims-frozen")).toBe(false);
    expect(setTextAnimsPaused).toHaveBeenLastCalledWith(false);

    document.documentElement.classList.add("is-asset-anims-frozen");
    holdPhysicsForOverlay();
    releasePhysicsForOverlay();
    expect(setTextAnimsPaused).toHaveBeenLastCalledWith(true);
  });
});
