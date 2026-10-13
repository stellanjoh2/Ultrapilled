import { describe, expect, it } from "vitest";
import { colliderKindFromInk, colliderKindFromMask, simpleColliderKind } from "./iconMesh";

function filledSquare(u: number, v: number): boolean {
  return u >= 0.15 && u <= 0.85 && v >= 0.15 && v <= 0.85;
}

function filledCircle(u: number, v: number): boolean {
  return Math.hypot(u - 0.5, v - 0.5) <= 0.4;
}

function plusSign(u: number, v: number): boolean {
  const bar = 0.14;
  return (Math.abs(u - 0.5) <= bar && v >= 0.12 && v <= 0.88) || (Math.abs(v - 0.5) <= bar && u >= 0.12 && u <= 0.88);
}

function maskFromInk(size: number, ink: (u: number, v: number) => boolean): Uint8Array {
  const mask = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (ink((x + 0.5) / size, (y + 0.5) / size)) mask[y * size + x] = 1;
    }
  }
  return mask;
}

describe("colliderKindFromInk", () => {
  it("picks box for a solid square", () => {
    expect(colliderKindFromInk(filledSquare)).toBe("box");
  });

  it("picks circle for a solid disc", () => {
    expect(colliderKindFromInk(filledCircle)).toBe("circle");
  });

  it("picks box for elongated ink even if tips are round", () => {
    expect(
      colliderKindFromInk((u, v) => u >= 0.1 && u <= 0.9 && Math.hypot(u - 0.5, (v - 0.5) / 0.35) <= 1),
    ).toBe("box");
  });
});

describe("colliderKindFromMask", () => {
  it("picks box for solid squares and sparse glyphs, circle for solid discs", () => {
    expect(colliderKindFromMask(maskFromInk(64, filledSquare), 64)).toBe("box");
    expect(colliderKindFromMask(maskFromInk(64, filledCircle), 64)).toBe("circle");
    // Sparse Phosphor-like marks stay boxed even when tips look radial.
    expect(colliderKindFromMask(maskFromInk(64, plusSign), 64)).toBe("box");
  });
});

describe("simpleColliderKind", () => {
  it("keeps primitive shortcuts", () => {
    expect(simpleColliderKind("sphere")).toBe("circle");
    expect(simpleColliderKind("ring")).toBe("circle");
    expect(simpleColliderKind("block")).toBe("box");
    expect(simpleColliderKind("triangle")).toBe("box");
  });
});
