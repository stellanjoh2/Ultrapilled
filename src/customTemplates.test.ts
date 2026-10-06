import { beforeEach, describe, expect, it, vi } from "vitest";
import { putBackgroundImage } from "./background";
import { embedSlotImages } from "./customTemplates";
import { blankState } from "./templates";
import { defaultImageSlot } from "./types";
import type { PillProject } from "./project/pillFormat";

describe("embedSlotImages", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("bakes blob: slot images into data URLs so drafts survive reload", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const blobUrl = "blob:http://localhost/asset-1";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Blob([bytes], { type: "image/png" }))),
    );

    const project: PillProject = {
      state: {
        ...blankState(),
        slots: [defaultImageSlot({ id: "img-a", src: blobUrl, name: "shot.png" })],
        template: "blank",
      },
      poses: [],
      frame: { width: 1280, height: 720 },
      images: [],
      loop: false,
      pages: [],
      pageIndex: 0,
    };

    const embedded = await embedSlotImages(project);
    const slot = embedded.state.slots[0];
    expect(slot?.kind).toBe("image");
    if (slot?.kind !== "image") return;
    expect(slot.src.startsWith("data:image/png")).toBe(true);
    expect(slot.src).not.toContain("blob:");
  });

  it("bakes blob: background images into the project images list", async () => {
    const blobUrl = "blob:http://localhost/bg-1";
    putBackgroundImage("bg-blob", blobUrl, "bg.png", 100, 80);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }))),
    );

    const project: PillProject = {
      state: {
        ...blankState(),
        template: "blank",
        background: {
          ...blankState().background,
          kind: "image",
          imageId: "bg-blob",
        },
      },
      poses: [],
      frame: { width: 1280, height: 720 },
      images: [],
      loop: false,
      pages: [],
      pageIndex: 0,
    };

    const embedded = await embedSlotImages(project);
    expect(embedded.images).toHaveLength(1);
    expect(embedded.images[0]?.id).toBe("bg-blob");
    expect(embedded.images[0]?.src.startsWith("data:")).toBe(true);
  });
});
