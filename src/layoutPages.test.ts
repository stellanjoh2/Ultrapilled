import { describe, expect, it } from "vitest";
import { defaultBackground, defaultTextSlot } from "./types";
import { clampPageIndex, duplicatePage, pageFromLive } from "./layoutPages";

describe("layoutPages", () => {
  it("duplicates with new page and slot ids, remapping poses", () => {
    const slot = defaultTextSlot({ id: "slot-a", text: "ONE" });
    const page = pageFromLive({
      id: "page-a",
      slots: [slot],
      poses: [{ slotId: "slot-a", seqIndex: 0, sizeUnit: 0.2, x: 10, y: 20, angle: 0.5 }],
      background: defaultBackground(),
      frame: { width: 100, height: 50 },
    });
    const copy = duplicatePage(page);
    expect(copy.id).not.toBe(page.id);
    expect(copy.slots).toHaveLength(1);
    expect(copy.slots[0]!.id).not.toBe("slot-a");
    expect(copy.slots[0]).toMatchObject({ kind: "text", text: "ONE" });
    expect(copy.poses[0]!.slotId).toBe(copy.slots[0]!.id);
    expect(copy.poses[0]).toMatchObject({ x: 10, y: 20, angle: 0.5 });
    expect(copy.background.kind).toBe(page.background.kind);
  });

  it("clamps page index", () => {
    expect(clampPageIndex(0, 0)).toBe(0);
    expect(clampPageIndex(3, 2)).toBe(1);
    expect(clampPageIndex(-1, 2)).toBe(0);
  });
});
