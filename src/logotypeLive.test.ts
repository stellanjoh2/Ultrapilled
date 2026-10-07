import { describe, expect, it } from "vitest";
import { LOGOTYPE_MIN_LUM_GAP, logotypeHoverFill, paletteLit } from "./logotypeLive";
import { fillLuminance } from "./theme";

/** Orby White, Lime, Purple, Blue, Pink. */
const ORBY = ["#ffffff", "#c4ff00", "#3b00ff", "#00c4ff", "#ff00c4"] as const;
const STAGE = "#080808";

function gap(hex: string, backdrop: string): number {
  return Math.abs(fillLuminance(hex) - fillLuminance(backdrop));
}

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

describe("logotype hover palette", () => {
  it("cycles every Orby swatch on the dark stage, including pink and purple", () => {
    const fills = ORBY.map((swatch) => logotypeHoverFill(swatch, STAGE));
    for (const fill of fills) {
      expect(gap(fill, STAGE)).toBeGreaterThanOrEqual(LOGOTYPE_MIN_LUM_GAP - 1e-9);
    }
    // Lime, cyan, and white already clear the gap and stay themselves.
    expect(fills[0]).toBe("#ffffff");
    expect(fills[1]).toBe("#c4ff00");
    expect(fills[3]).toBe("#00c4ff");

    const [pr, pg, pb] = rgb(fills[2]!);
    const [kr, kg, kb] = rgb(fills[4]!);
    // Purple stays violet (blue channel leads), not white/lime/cyan.
    expect(pb).toBeGreaterThan(pr);
    expect(pb).toBeGreaterThan(pg);
    expect(fills[2]!.toLowerCase()).not.toBe("#ffffff");
    // Pink stays magenta (red leads, blue above green), not lime or cyan.
    expect(kr).toBeGreaterThan(200);
    expect(kb).toBeGreaterThan(kg + 40);
    expect(kg).toBeLessThan(80);
    expect(fills[4]!.toLowerCase()).not.toBe("#c4ff00");
    expect(fills[4]!.toLowerCase()).not.toBe("#00c4ff");
    // Distinct hues — the old borrow path painted both as white.
    expect(new Set(fills.map((fill) => fill.toLowerCase())).size).toBe(ORBY.length);
  });

  it("keeps white off a white canvas and black off black", () => {
    const onWhite = logotypeHoverFill("#ffffff", "#ffffff");
    expect(gap(onWhite, "#ffffff")).toBeGreaterThanOrEqual(LOGOTYPE_MIN_LUM_GAP - 1e-9);
    expect(fillLuminance(onWhite)).toBeLessThan(0.75);

    const onBlack = logotypeHoverFill("#000000", "#000000");
    expect(gap(onBlack, "#000000")).toBeGreaterThanOrEqual(LOGOTYPE_MIN_LUM_GAP - 1e-9);
    expect(fillLuminance(onBlack)).toBeGreaterThan(0.2);
    expect(onBlack.toLowerCase()).not.toBe("#ffffff");
  });
});

describe("logotype resting palette", () => {
  it("keeps Orby lime among resting accents on the dark stage", () => {
    const fills = paletteLit([...ORBY], STAGE);
    expect(fills.map((f) => f.toLowerCase())).toContain("#c4ff00");
    // Theme white matches ink and must not crowd out real accents.
    expect(fills.every((f) => f.toLowerCase() !== "#ffffff")).toBe(true);
  });
});
