import { describe, expect, it } from "vitest";
import { TEXT_INK_PAD, fitTextFieldBox, measureTextInk, textFieldPad, textGlyphSideOverhangs, trackedRunWidth, trackingEm } from "./measure";
import { defaultTextFieldSlot, defaultTypeSlot } from "./types";

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

describe("textGlyphSideOverhangs", () => {
  it("returns non-negative finite overhangs for typical glyphs", () => {
    const { left, right } = textGlyphSideOverhangs('700 69px "Inter", sans-serif', "L", "m");
    expect(Number.isFinite(left)).toBe(true);
    expect(Number.isFinite(right)).toBe(true);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeGreaterThanOrEqual(0);
  });

  it("treats empty chars as a measuring space", () => {
    const { left, right } = textGlyphSideOverhangs("700 28px sans-serif", "", "");
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeGreaterThanOrEqual(0);
  });
});

describe("trackedRunWidth", () => {
  // Inter Bold-ish advances. inkRight sits inside the advance (right side bearing).
  const lorem = [
    { advance: 60, inkLeft: -7, inkRight: 57 },
    { advance: 60, inkLeft: -3, inkRight: 56 },
    { advance: 38, inkLeft: -6, inkRight: 36 },
    { advance: 55, inkLeft: -2, inkRight: 52 },
    { advance: 87, inkLeft: -6, inkRight: 81 },
  ];

  it("shrinks with negative tracking and does not add a trailing gap when positive", () => {
    const zero = trackedRunWidth(lorem, 0);
    const neg = trackedRunWidth(lorem, 98 * trackingEm(-317));
    const gap = 80 * trackingEm(500);
    const pos = trackedRunWidth(lorem, gap);
    expect(neg).toBeLessThan(zero);
    expect(pos).toBeCloseTo(zero + gap * 4, 5);
    // A trailing letter-spacing (5th gap) would make the box this wide. We must not.
    expect(pos).toBeLessThan(zero + gap * 5);
  });

  it("covers the last glyph ink that would stick out of a trailing-shrunk box", () => {
    const spacing = 98 * trackingEm(-317);
    const width = trackedRunWidth(lorem, spacing);
    const last = lorem[lorem.length - 1]!;
    // Chrome's used width of the last inline-box is advance + letter-spacing.
    const shrunk = last.advance + spacing;
    const clip = Math.max(0, last.inkRight - shrunk);
    expect(clip).toBeGreaterThan(0);
    // Our run places that glyph after (n-1) gaps and extends through its advance,
    // which is wider than the shrunk box, so the ink fits.
    let x = 0;
    for (let i = 0; i < lorem.length - 1; i++) x += lorem[i]!.advance + spacing;
    expect(width).toBeGreaterThanOrEqual(x + last.inkRight);
  });
});

describe("textFieldPad", () => {
  it("insets wrapping copy inside a holding shape without growing the box", () => {
    const slot = defaultTextFieldSlot({ shape: "box", fontSize: 20, pillPad: 50 });
    const pad = textFieldPad(slot, 260, 140, 14);
    expect(pad.x).toBeGreaterThan(2);
    expect(pad.y).toBeGreaterThan(2);
    expect(pad.x * 2).toBeLessThan(260);
    expect(pad.y * 2).toBeLessThan(140);
  });

  it("uses a small inset when there is no holding shape", () => {
    const slot = defaultTextFieldSlot({ shape: "none", fontSize: 18 });
    const pad = textFieldPad(slot, 260, 140);
    expect(pad.x).toBe(Math.max(2, 18 * 0.12));
    expect(pad.y).toBe(pad.x);
  });
});

describe("fitTextFieldBox", () => {
  it("hugs starter copy instead of the default empty frame", () => {
    const slot = defaultTextFieldSlot();
    fitTextFieldBox(slot, 0);
    expect(slot.boxH).toBeLessThan(80);
    expect(slot.boxH).toBeGreaterThan(20);
    slot.text = "Hi";
    fitTextFieldBox(slot, 0);
    expect(slot.boxW).toBeLessThan(120);
  });

  it("grows with a longer sentence and with a new line", () => {
    const slot = defaultTextFieldSlot({ text: "Hi" });
    fitTextFieldBox(slot, 0);
    const short = { w: slot.boxW!, h: slot.boxH! };
    slot.text = "Hi there, this is a longer sentence";
    fitTextFieldBox(slot, 0);
    expect(slot.boxW).toBeGreaterThan(short.w);
    slot.text = "Hi there, this is a longer sentence\nand another line";
    fitTextFieldBox(slot, 0);
    expect(slot.boxH).toBeGreaterThan(short.h);
  });

  it("wraps a pasted paragraph instead of one long line", () => {
    const slot = defaultTextFieldSlot({
      text: "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty",
    });
    fitTextFieldBox(slot, 0);
    expect(slot.boxW).toBeLessThanOrEqual(18 * 22 + 24);
    expect(slot.boxH).toBeGreaterThan(40);
  });

  it("keeps a resized wrap width and only grows height", () => {
    const slot = defaultTextFieldSlot({
      text: "one two three four five six",
      boxAuto: false,
      boxW: 120,
      boxH: 40,
    });
    fitTextFieldBox(slot, 0);
    expect(slot.boxW).toBe(120);
    expect(slot.boxH).toBeGreaterThan(40);
  });
});

