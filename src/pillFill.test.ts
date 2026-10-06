import { describe, expect, it } from "vitest";
import { pillGradient, pillSweepBand, pillSweepGradient, textSweepImage, textSweepShift } from "./pillFill";

function cssColors(image: string): string[] {
  const body = image.slice(image.indexOf(",") + 1);
  return body.split(",").map((part) => part.trim().split(" ")[0]);
}

describe("text gradient sweep", () => {
  it("repeats a from→to→from tile whose ends match", () => {
    const image = textSweepImage("#ff2d55", "#5ac8fa", 90, 160);
    expect(image.startsWith("repeating-linear-gradient(90deg, ")).toBe(true);
    expect(image).not.toContain("in hsl");
    const stops = cssColors(image);
    expect(stops[0]).toBe("#ff2d55");
    expect(stops[stops.length - 1]).toBe("#ff2d55");
    expect(stops.length).toBeGreaterThan(3);
    expect(stops).toContain("#5ac8fa");
  });

  it("shifts one period along the gradient axis", () => {
    expect(textSweepShift(90, 200)).toEqual({ x: 200, y: expect.closeTo(0, 6) });
    expect(textSweepShift(0, 200).x).toBeCloseTo(0, 6);
    expect(textSweepShift(0, 200).y).toBeCloseTo(-200, 6);
    expect(textSweepShift(180, 80).y).toBeCloseTo(80, 6);
  });
});

describe("pill gradient seams", () => {
  it("blends A→B in hue at mid scale with no wrap join", () => {
    const css = pillGradient("#ff00c4", "#3b00ff", 90, 50);
    expect(css).toContain("in hsl shorter hue");
    expect(cssColors(css)).toEqual(["#ff00c4", "#3b00ff"]);
  });

  it("closes a from→to→from loop at scale 25", () => {
    const colors = cssColors(pillGradient("#ff00c4", "#3b00ff", 90, 25));
    expect(colors[0]).toBe("#ff00c4");
    expect(colors).toContain("#3b00ff");
    expect(colors[colors.length - 1]).toBe("#ff00c4");
  });

  it("tiles a sweep band with matching ends", () => {
    const css = pillSweepBand("#ff00c4", "#3b00ff");
    expect(css).not.toContain("in hsl");
    const colors = cssColors(css);
    expect(colors[0]).toBe(colors[colors.length - 1]);
    expect(colors[0]).toBe("#ff00c4");
    expect(colors).toContain("#3b00ff");
  });

  it("does not join two A→B halves at the preview midpoint", () => {
    const colors = cssColors(pillSweepGradient("#ff00c4", "#3b00ff", 90, 50));
    expect(colors[0]).toBe("#ff00c4");
    expect(colors[colors.length - 1]).toBe("#ff00c4");
    expect(colors).toContain("#3b00ff");
  });
});
