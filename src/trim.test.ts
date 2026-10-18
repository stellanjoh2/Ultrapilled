import { describe, expect, it } from "vitest";
import { gifLogicalScreen } from "./trim";

describe("gifLogicalScreen", () => {
  it("reads little-endian width/height from a GIF89a header", () => {
    // Minimal header: GIF89a + 500×210 screen (rest unused).
    const buf = new ArrayBuffer(10);
    const u8 = new Uint8Array(buf);
    u8.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 244, 1, 210, 0]);
    expect(gifLogicalScreen(buf)).toEqual({ w: 500, h: 210 });
  });

  it("rejects non-GIF buffers", () => {
    expect(gifLogicalScreen(new Uint8Array([0xff, 0xd8, 0xff]).buffer)).toBeNull();
    expect(gifLogicalScreen(new ArrayBuffer(4))).toBeNull();
  });
});
