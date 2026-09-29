import { describe, expect, it } from "vitest";
import { blankState } from "../templates";
import { defaultTextSlot } from "../types";
import { parsePillProject, serializePillProject, type PillProject } from "./pillFormat";

describe("pillFormat round-trip", () => {
  it("preserves slots, poses, and loop", () => {
    const slot = defaultTextSlot({ id: "slot-a", text: "ROUND" });
    const project: PillProject = {
      state: { ...blankState(), slots: [slot], template: "blank" },
      poses: [{ slotId: "slot-a", seqIndex: 0, sizeUnit: 0.2, x: 100, y: 80, angle: 0.1 }],
      frame: { width: 1280, height: 720 },
      images: [],
      loop: true,
    };
    const parsed = parsePillProject(serializePillProject(project));
    expect(parsed).not.toBeNull();
    expect(parsed!.loop).toBe(true);
    expect(parsed!.frame).toEqual({ width: 1280, height: 720 });
    expect(parsed!.poses).toEqual(project.poses);
    expect(parsed!.state.slots).toHaveLength(1);
    expect(parsed!.state.slots[0]).toMatchObject({ id: "slot-a", kind: "text", text: "ROUND" });
  });

  it("rejects garbage", () => {
    expect(parsePillProject("{}")).toBeNull();
    expect(parsePillProject("not-json")).toBeNull();
  });
});
