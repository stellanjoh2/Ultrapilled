import { describe, expect, it } from "vitest";
import { DEFAULT_TEXT_ANIM_SPEED, textAnimCharPose, textAnimTravel } from "./textAnim";

describe("textAnimTravel", () => {
  it("clears half the chip plus a font inset", () => {
    expect(textAnimTravel(100, 40)).toBe(Math.ceil(50 + 6));
    expect(textAnimTravel(0, 40)).toBe(Math.ceil(48));
  });
});

describe("textAnimCharPose", () => {
  const travel = 40;
  const n = 4;
  const speed = DEFAULT_TEXT_ANIM_SPEED;
  // Default pace: letter 0.4, stagger 0.045, pause 0.85
  const letter = 0.4;
  const stagger = 0.045;
  const pause = 0.85;
  const wave = letter + (n - 1) * stagger;
  const cycleMs = (2 * wave + pause) * 1000;

  it("starts below and invisible before its enter", () => {
    expect(textAnimCharPose(0, speed, 2, n, travel)).toEqual({ y: travel, alpha: 0 });
  });

  it("sits at rest after enter and before exit", () => {
    const midHoldMs = (wave + pause / 2) * 1000;
    expect(textAnimCharPose(midHoldMs, speed, 0, n, travel)).toEqual({ y: 0, alpha: 1 });
  });

  it("leaves upward after exit", () => {
    const afterExitMs = (wave + pause + letter + 0.01) * 1000;
    const pose = textAnimCharPose(afterExitMs, speed, 0, n, travel);
    expect(pose.y).toBeLessThan(0);
    expect(pose.alpha).toBeLessThan(1);
  });

  it("loops the cycle", () => {
    const a = textAnimCharPose(100, speed, 1, n, travel);
    const b = textAnimCharPose(100 + cycleMs, speed, 1, n, travel);
    expect(b.y).toBeCloseTo(a.y, 5);
    expect(b.alpha).toBeCloseTo(a.alpha, 5);
  });
});
