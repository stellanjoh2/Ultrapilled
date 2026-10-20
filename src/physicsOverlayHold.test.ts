import { afterEach, describe, expect, it, vi } from "vitest";
import {
  holdPhysicsForOverlay,
  isPhysicsHeldByOverlay,
  registerPhysicsWorld,
  releasePhysicsForOverlay,
  resetPhysicsOverlayHoldForTests,
} from "./physicsOverlayHold";
import { setGifBloomPaused } from "./chipDomPaint";
import { setTextAnimsPaused } from "./textAnim";
import { pauseAllYouTubeLoops, resumeAllYouTubeLoops } from "./youtube";

vi.mock("./textAnim", () => ({
  setTextAnimsPaused: vi.fn(),
}));

vi.mock("./chipDomPaint", () => ({
  setGifBloomPaused: vi.fn(),
}));

vi.mock("./youtube", () => ({
  pauseAllYouTubeLoops: vi.fn(),
  resumeAllYouTubeLoops: vi.fn(),
}));

describe("physicsOverlayHold", () => {
  afterEach(() => {
    resetPhysicsOverlayHoldForTests();
    document.documentElement.classList.remove("is-asset-anims-frozen");
    vi.mocked(setTextAnimsPaused).mockClear();
    vi.mocked(setGifBloomPaused).mockClear();
    vi.mocked(pauseAllYouTubeLoops).mockClear();
    vi.mocked(resumeAllYouTubeLoops).mockClear();
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

  it("freezes text/gradient/media anims while held and restores user freeze preference", () => {
    holdPhysicsForOverlay();
    expect(document.documentElement.classList.contains("is-overlay-anims-frozen")).toBe(true);
    expect(setTextAnimsPaused).toHaveBeenCalledWith(true);
    expect(setGifBloomPaused).toHaveBeenCalledWith(true);
    expect(pauseAllYouTubeLoops).toHaveBeenCalledTimes(1);

    releasePhysicsForOverlay();
    expect(document.documentElement.classList.contains("is-overlay-anims-frozen")).toBe(false);
    expect(setTextAnimsPaused).toHaveBeenLastCalledWith(false);
    expect(setGifBloomPaused).toHaveBeenLastCalledWith(false);
    expect(resumeAllYouTubeLoops).toHaveBeenCalledTimes(1);

    document.documentElement.classList.add("is-asset-anims-frozen");
    holdPhysicsForOverlay();
    releasePhysicsForOverlay();
    expect(setTextAnimsPaused).toHaveBeenLastCalledWith(true);
  });
});
