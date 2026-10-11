import { describe, expect, it } from "vitest";
import { gifFrameAt, type GifTrack } from "./gifFrames";

function fakeBitmap(id: number): ImageBitmap {
  return { width: id, height: 1 } as unknown as ImageBitmap;
}

describe("gifFrameAt", () => {
  const track: GifTrack = {
    frames: [fakeBitmap(0), fakeBitmap(1), fakeBitmap(2)],
    durations: [100, 50, 150],
    duration: 300,
  };

  it("picks frames by loop time", () => {
    expect(gifFrameAt(track, 0).width).toBe(0);
    expect(gifFrameAt(track, 99).width).toBe(0);
    expect(gifFrameAt(track, 100).width).toBe(1);
    expect(gifFrameAt(track, 149).width).toBe(1);
    expect(gifFrameAt(track, 150).width).toBe(2);
    expect(gifFrameAt(track, 299).width).toBe(2);
  });

  it("wraps past one loop", () => {
    expect(gifFrameAt(track, 300).width).toBe(0);
    expect(gifFrameAt(track, 450).width).toBe(2);
  });

  it("handles negative time", () => {
    expect(gifFrameAt(track, -1).width).toBe(2);
  });

  it("returns the only frame for single-frame tracks", () => {
    const one: GifTrack = {
      frames: [fakeBitmap(7)],
      durations: [40],
      duration: 40,
    };
    expect(gifFrameAt(one, 999).width).toBe(7);
  });

  it("throws on an empty track", () => {
    const empty: GifTrack = { frames: [], durations: [], duration: 0 };
    expect(() => gifFrameAt(empty, 0)).toThrow();
  });
});
