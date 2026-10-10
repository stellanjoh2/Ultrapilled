import { describe, expect, it } from "vitest";
import { blankState } from "../templates";
import { defaultImageSlot, defaultTextSlot } from "../types";
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
      pages: [],
      pageIndex: 0,
    };
    const parsed = parsePillProject(serializePillProject(project));
    expect(parsed).not.toBeNull();
    expect(parsed!.loop).toBe(true);
    expect(parsed!.frame).toEqual({ width: 1280, height: 720 });
    expect(parsed!.poses).toEqual(project.poses);
    expect(parsed!.state.slots).toHaveLength(1);
    expect(parsed!.state.slots[0]).toMatchObject({ id: "slot-a", kind: "text", text: "ROUND" });
    expect(parsed!.pages).toHaveLength(1);
    expect(parsed!.pageIndex).toBe(0);
  });

  it("round-trips extra layout pages", () => {
    const a = defaultTextSlot({ id: "slot-a", text: "A" });
    const b = defaultTextSlot({ id: "slot-b", text: "B" });
    const state = { ...blankState(), slots: [b], template: "blank" };
    const project: PillProject = {
      state,
      poses: [{ slotId: "slot-b", seqIndex: 0, sizeUnit: 0.2, x: 40, y: 50, angle: 0 }],
      frame: { width: 800, height: 450 },
      images: [],
      loop: false,
      pageIndex: 1,
      pages: [
        {
          id: "p1",
          slots: [a],
          poses: [{ slotId: "slot-a", seqIndex: 0, sizeUnit: 0.3, x: 10, y: 12, angle: 0.2 }],
          background: state.background,
          frame: { width: 800, height: 450 },
        },
        {
          id: "p2",
          slots: [b],
          poses: [{ slotId: "slot-b", seqIndex: 0, sizeUnit: 0.2, x: 40, y: 50, angle: 0 }],
          background: state.background,
          frame: { width: 800, height: 450 },
        },
      ],
    };
    const parsed = parsePillProject(serializePillProject(project));
    expect(parsed).not.toBeNull();
    expect(parsed!.pages).toHaveLength(2);
    expect(parsed!.pageIndex).toBe(1);
    expect(parsed!.state.slots[0]).toMatchObject({ id: "slot-b", text: "B" });
    expect(parsed!.pages[0]!.slots[0]).toMatchObject({ id: "slot-a", text: "A" });
    expect(parsed!.poses).toEqual(project.pages[1]!.poses);
  });

  it("rejects garbage", () => {
    expect(parsePillProject("{}")).toBeNull();
    expect(parsePillProject("not-json")).toBeNull();
  });

  it("round-trips layout lock on a slot", () => {
    const slot = defaultImageSlot({
      id: "img-a",
      name: "locked.png",
      src: "data:image/png;base64,aa",
      locked: true,
    });
    const project: PillProject = {
      state: {
        ...blankState(),
        slots: [slot],
        template: "blank",
        physics: { ...blankState().physics, layoutMode: true },
      },
      poses: [],
      frame: { width: 1280, height: 720 },
      images: [],
      loop: false,
      pages: [],
      pageIndex: 0,
    };
    const parsed = parsePillProject(serializePillProject(project));
    expect(parsed!.state.slots[0]).toMatchObject({ id: "img-a", locked: true });
    expect(parsed!.state.physics.layoutMode).toBe(true);
  });

  it("round-trips Unsplash / Giphy remote ids", () => {
    const slot = defaultImageSlot({
      id: "gif-a",
      name: "giphy-PBS-w-abc123.gif",
      src: "blob:http://localhost/dead",
      remote: { kind: "giphy", id: "abc123" },
    });
    const project: PillProject = {
      state: { ...blankState(), slots: [slot], template: "blank" },
      poses: [],
      frame: { width: 1280, height: 720 },
      images: [],
      loop: false,
      pages: [],
      pageIndex: 0,
    };
    const parsed = parsePillProject(serializePillProject(project));
    expect(parsed!.state.slots[0]).toMatchObject({
      id: "gif-a",
      remote: { kind: "giphy", id: "abc123" },
    });
  });

  it("round-trips an Unsplash background hotlink and credit", () => {
    const state = {
      ...blankState(),
      template: "blank",
      background: {
        ...blankState().background,
        kind: "image" as const,
        imageId: "bg-unsplash",
        imageCredit: {
          photographer: "Ada Lovelace",
          profileUrl: "https://unsplash.com/@ada?utm_source=ultrapilled&utm_medium=referral",
        },
      },
    };
    const project: PillProject = {
      state,
      poses: [],
      frame: { width: 1280, height: 720 },
      images: [
        {
          id: "bg-unsplash",
          src: "https://images.unsplash.com/photo-test?w=1080",
          name: "Ada Lovelace",
          width: 4032,
          height: 3024,
        },
      ],
      loop: false,
      pages: [],
      pageIndex: 0,
    };
    const parsed = parsePillProject(serializePillProject(project));
    expect(parsed!.state.background.imageCredit).toEqual(state.background.imageCredit);
    expect(parsed!.images).toEqual(project.images);
  });
});
