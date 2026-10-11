import { describe, expect, it } from "vitest";
import { shouldArmAppendInsert } from "./slotReveal";

describe("shouldArmAppendInsert", () => {
  it("skips grow-pin for the first object", () => {
    expect(shouldArmAppendInsert(1)).toBe(false);
  });

  it("uses grow-pin when appending onto an existing list", () => {
    expect(shouldArmAppendInsert(2)).toBe(true);
    expect(shouldArmAppendInsert(5, 1)).toBe(true);
  });

  it("skips grow-pin for multi-add batches", () => {
    expect(shouldArmAppendInsert(3, 3)).toBe(false);
    expect(shouldArmAppendInsert(4, 2)).toBe(false);
  });
});
