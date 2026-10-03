import { describe, expect, it } from "vitest";
import { textSweepImage, textSweepShift } from "./pillFill";

describe("text gradient sweep", () => {
  it("repeats a from→to→from tile whose ends match", () => {
    const image = textSweepImage("#ff2d55", "#5ac8fa", 90, 160);
    expect(image.startsWith("repeating-linear-gradient(90deg, ")).toBe(true);
    const body = image.slice(image.indexOf(",") + 1);
    const stops = body.split(",").map((part) => part.trim().split(" ")[0]);
    expect(stops[0]).toBe(stops[stops.length - 1]);
    expect(stops.length).toBeGreaterThan(2);
  });

  it("shifts one period along the gradient axis", () => {
    expect(textSweepShift(90, 200)).toEqual({ x: 200, y: expect.closeTo(0, 6) });
    expect(textSweepShift(0, 200).x).toBeCloseTo(0, 6);
    expect(textSweepShift(0, 200).y).toBeCloseTo(-200, 6);
    expect(textSweepShift(180, 80).y).toBeCloseTo(80, 6);
  });
});
