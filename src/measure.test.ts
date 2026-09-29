import { describe, expect, it } from "vitest";
import { TEXT_INK_PAD, measureTextInk } from "./measure";
import { defaultTypeSlot } from "./types";

describe("measureTextInk", () => {
  it("keeps a bleed pad so AA glyph edges aren't clipped", () => {
    expect(TEXT_INK_PAD).toBeGreaterThanOrEqual(1);
    const ink = measureTextInk(defaultTypeSlot({ text: "Lorem", fontSize: 80, fontWeight: 700 }));
    // Origin sits inside the box by the pad on every side.
    expect(ink.originX).toBeGreaterThanOrEqual(TEXT_INK_PAD);
    expect(ink.baseline).toBeGreaterThanOrEqual(TEXT_INK_PAD);
    expect(ink.width).toBeGreaterThan(ink.originX);
    expect(ink.height).toBeGreaterThan(ink.baseline);
    // Box is at least pad*2 larger than a zero-bleed ceil of the font size fallback.
    expect(ink.width).toBeGreaterThanOrEqual(TEXT_INK_PAD * 2);
    expect(ink.height).toBeGreaterThanOrEqual(TEXT_INK_PAD * 2);
  });
});
