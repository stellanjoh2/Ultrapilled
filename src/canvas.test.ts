import { describe, expect, it } from "vitest";
import { keepSelectedCanvas } from "./canvas";
import { acidState, blankState } from "./templates";

describe("keepSelectedCanvas", () => {
  it("keeps a portrait frame when applying a 16:9 template", () => {
    const next = keepSelectedCanvas(acidState(), "9:16");
    expect(acidState().canvas).toBe("16:9");
    expect(next.canvas).toBe("9:16");
    expect(next.template).toBe("acid");
  });

  it("keeps the selected frame when switching to blank", () => {
    expect(keepSelectedCanvas(blankState(), "1:1").canvas).toBe("1:1");
  });
});
