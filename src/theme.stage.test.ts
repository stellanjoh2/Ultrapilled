import { describe, expect, it } from "vitest";
import {
  ensureStageDistinct,
  fillLuminance,
  pickGridColor,
  resolveThemeStage,
  stageClashesWithTheme,
} from "./theme";
import { PALETTE_PRESETS } from "./palettePresets";

describe("theme stage pairing", () => {
  it("rejects an exact match between stage and a theme swatch", () => {
    expect(stageClashesWithTheme("#020802", "#020802")).toBe(true);
  });

  it("lifts a pitch-black stage away from pitch-black theme colours", () => {
    const colors = ["#050505", "#141414", "#282828", "#404040", "#FF1133"];
    const stage = ensureStageDistinct("#050505", colors);
    expect(colors.some((color) => stageClashesWithTheme(stage, color))).toBe(false);
  });

  it("keeps authored tint while clearing clashes with theme swatches", () => {
    const colors = ["#020802", "#0A1A0A", "#1B4D1B", "#39FF14", "#A0FFA0"];
    const stage = resolveThemeStage("#020802", colors);
    expect(stage.toLowerCase()).not.toBe("#020802");
    expect(colors.some((color) => stageClashesWithTheme(stage, color))).toBe(false);
  });

  it("lets themes keep different stage depths instead of one gray floor", () => {
    const lums = PALETTE_PRESETS.map((preset) => fillLuminance(preset.stage));
    const spread = Math.max(...lums) - Math.min(...lums);
    expect(spread).toBeGreaterThan(0.04);
    // Stages stay dark overall; a few gray-heavy palettes sit a touch higher.
    expect(Math.max(...lums)).toBeLessThan(0.28);
  });

  it("picks a grid colour that reads on the stage", () => {
    expect(pickGridColor(["#ff3ea5", "#1fe3e3", "#ffe07a", "#7b3cff", "#ff6b2c"], "#393939")).toBe(
      "#ff3ea5",
    );
    expect(pickGridColor(["#050505", "#141414", "#282828", "#404040", "#FF1133"], "#565656")).toBe(
      "#FF1133",
    );
  });

  it("keeps every palette preset stage distinct from its swatches", () => {
    for (const preset of PALETTE_PRESETS) {
      for (const color of preset.colors) {
        expect(
          stageClashesWithTheme(preset.stage, color),
          `${preset.id} stage ${preset.stage} clashes with ${color}`,
        ).toBe(false);
      }
    }
  });
});
