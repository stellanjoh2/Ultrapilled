import { describe, expect, it } from "vitest";
import {
  parseTypedRangeValue,
  rangeCaptionHtml,
  setRangeCaptionValue,
  snapRangeValue,
} from "./rangeCaption";

describe("parseTypedRangeValue", () => {
  it("parses plain integers and decimals", () => {
    expect(parseTypedRangeValue("42")).toBe(42);
    expect(parseTypedRangeValue("-12")).toBe(-12);
    expect(parseTypedRangeValue("1.25")).toBe(1.25);
  });

  it("strips units and decoration used by panel readouts", () => {
    expect(parseTypedRangeValue("6000K")).toBe(6000);
    expect(parseTypedRangeValue("45°")).toBe(45);
    expect(parseTypedRangeValue("1.20s")).toBe(1.2);
    expect(parseTypedRangeValue("2.0×")).toBe(2);
    expect(parseTypedRangeValue("+15%")).toBe(15);
    expect(parseTypedRangeValue("  -80  ")).toBe(-80);
  });

  it("returns null for empty or non-numeric text", () => {
    expect(parseTypedRangeValue("")).toBeNull();
    expect(parseTypedRangeValue("   ")).toBeNull();
    expect(parseTypedRangeValue("abc")).toBeNull();
  });
});

describe("snapRangeValue", () => {
  it("clamps to min/max", () => {
    expect(snapRangeValue(-200, -100, 100, 1)).toBe(-100);
    expect(snapRangeValue(999, -100, 100, 1)).toBe(100);
  });

  it("snaps to integer and decimal steps", () => {
    expect(snapRangeValue(43, -100, 100, 1)).toBe(43);
    expect(snapRangeValue(1.23, 0.1, 3, 0.05)).toBe(1.25);
    expect(snapRangeValue(6033, 2000, 10000, 50)).toBe(6050);
  });
});

describe("rangeCaptionHtml / setRangeCaptionValue", () => {
  it("builds a name + value caption", () => {
    const html = rangeCaptionHtml("exposure", "Exposure", "0");
    expect(html).toContain('data-range-label="exposure"');
    expect(html).toContain("field-caption-name");
    expect(html).toContain("field-caption-value");
    expect(html).toContain("Exposure");
    expect(html).toContain(">0<");
  });

  it("updates only the value node", () => {
    document.body.innerHTML = rangeCaptionHtml("hue", "Hue", "0°");
    const caption = document.body.firstElementChild!;
    setRangeCaptionValue(caption, "12°");
    expect(caption.querySelector(".field-caption-name")?.textContent).toBe("Hue");
    expect(caption.querySelector(".field-caption-value")?.textContent).toBe("12°");
  });
});
