import { describe, expect, it } from "vitest";
import { clampTextFieldWords, textFieldWordCount, wrapTextFieldLines } from "./textField";
import { textFieldLineHeight } from "./types";

describe("textFieldWordCount", () => {
  it("counts whitespace-separated words", () => {
    expect(textFieldWordCount("")).toBe(0);
    expect(textFieldWordCount("  hello  ")).toBe(1);
    expect(textFieldWordCount("one two\nthree")).toBe(3);
  });
});

describe("clampTextFieldWords", () => {
  it("keeps text at or under the limit", () => {
    expect(clampTextFieldWords("a b c", 3)).toBe("a b c");
    expect(clampTextFieldWords("a b c d", 3)).toBe("a b c");
  });

  it("preserves newlines before the cut", () => {
    expect(clampTextFieldWords("one\ntwo three four", 3)).toBe("one\ntwo three");
  });
});

describe("wrapTextFieldLines", () => {
  it("breaks when the next token would overflow", () => {
    const lines = wrapTextFieldLines("aa bb cc", 4, (value) => value.length);
    expect(lines).toEqual(["aa", "bb", "cc"]);
  });

  it("keeps explicit blank lines", () => {
    expect(wrapTextFieldLines("a\n\nb", 100, (value) => value.length)).toEqual(["a", "", "b"]);
  });
});

describe("textFieldLineHeight", () => {
  it("keeps 1.3 at the default slider", () => {
    expect(textFieldLineHeight({})).toBeCloseTo(1.3);
    expect(textFieldLineHeight({ lineHeight: 50 })).toBeCloseTo(1.3);
  });

  it("moves with the slider", () => {
    expect(textFieldLineHeight({ lineHeight: 0 })).toBeCloseTo(0.8);
    expect(textFieldLineHeight({ lineHeight: 100 })).toBeCloseTo(1.8);
  });
});
