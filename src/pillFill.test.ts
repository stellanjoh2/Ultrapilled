import { describe, expect, it } from "vitest";
import { pillGradient, pillSweepBand, pillSweepGradient, pillSweepStops, textSweepImage } from "./pillFill";

function cssColors(image: string): string[] {
  return image.match(/#[0-9a-f]{6}/gi) ?? [];
}

describe("text gradient sweep", () => {
  it("repeats a from→to→from tile whose ends match", () => {
    const image = textSweepImage("#ff2d55", "#5ac8fa", 90, 160);
    expect(image.startsWith("repeating-linear-gradient(90deg, ")).toBe(true);
    expect(image).not.toContain("in hsl");
    expect(image).toContain("var(--sweep-t, 0)");
    const stops = cssColors(image);
    expect(stops[0]).toBe("#ff2d55");
    expect(stops[stops.length - 1]).toBe("#ff2d55");
    expect(stops.length).toBeGreaterThan(3);
    expect(stops).toContain("#5ac8fa");
  });

  it("offsets stops by one period at --sweep-t 1", () => {
    const image = textSweepImage("#ff2d55", "#5ac8fa", 90, 160);
    expect(image).toContain("* 160.00px)");
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
    const css = pillSweepBand("#ff00c4", "#3b00ff", 120);
    expect(css).not.toContain("in hsl");
    expect(css.startsWith("repeating-linear-gradient(90deg, ")).toBe(true);
    expect(css).toContain("var(--sweep-t, 0)");
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

  it("wraps canvas sweep phase so 0 and 1 match", () => {
    const a = pillSweepStops("#ff00c4", "#3b00ff", 0, 50);
    const b = pillSweepStops("#ff00c4", "#3b00ff", 1, 50);
    expect(a.map((stop) => stop.color)).toEqual(b.map((stop) => stop.color));
    const loop = pillSweepStops("#ff00c4", "#3b00ff", 0, 25);
    expect(loop[0]?.color).toBe(loop[loop.length - 1]?.color);
  });
});
