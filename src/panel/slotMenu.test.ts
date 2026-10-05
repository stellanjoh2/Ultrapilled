import { afterEach, describe, expect, it, vi } from "vitest";
import { demoState } from "../types";
import { closeSlotMenu, openSlotMenu, type SlotMenuHost } from "./slotMenu";

describe("layout layer order controls", () => {
  afterEach(() => {
    closeSlotMenu();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  function stubReducedMotion() {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        addEventListener() {},
        removeEventListener() {},
      }),
    );
  }

  function hostFor(layoutMode: boolean): SlotMenuHost {
    const state = demoState();
    state.physics.layoutMode = layoutMode;
    return {
      state,
      panel: document.createElement("div"),
      world: {
        setPicked() {},
        chipEl() {
          return document.createElement("div");
        },
      },
      remember() {},
      live() {},
      endGesture() {},
      renderPanel() {},
      liveChip() {},
      pickSlot() {},
      get gesture() {
        return null;
      },
      get tintPicker() {
        return null;
      },
      setTintPicker() {},
      bindSlotMenuDismiss() {},
      uploadedShape() {
        return false;
      },
      isRasterUpload() {
        return false;
      },
      iconCanGradient() {
        return false;
      },
      storeGradient() {},
      recallGradient() {},
      async pickImageFiles() {
        return [];
      },
      async assignImageFile() {},
      async assignVideoFile() {},
      isVideoFile() {
        return false;
      },
      editChipText() {},
      duplicateSlot() {},
      removeSlot() {},
      invertSlot() {},
      flipSlot() {},
      alignSlotStraight() {},
      copySlotStyle() {},
      pasteSlotStyle() {},
      canPasteSlotStyle() {
        return false;
      },
      canMoveSlotLayer() {
        return true;
      },
      moveSlotLayer() {
        return true;
      },
    };
  }

  it("adds hover tooltips on Layout layer-order icons", () => {
    stubReducedMotion();
    const host = hostFor(true);
    expect(host.state.slots.length).toBeGreaterThan(1);

    openSlotMenu(40, 40, host.state.slots[0].id, host);

    const buttons = [...document.querySelectorAll<HTMLButtonElement>(".slot-menu__layer")];
    expect(buttons.map((btn) => [btn.dataset.layer, btn.getAttribute("data-tip")])).toEqual([
      ["front", "Bring to front"],
      ["forward", "Bring forward"],
      ["backward", "Send backward"],
      ["back", "Send to back"],
    ]);
  });

  it("hides layer-order icons outside Layout mode", () => {
    stubReducedMotion();
    const host = hostFor(false);
    openSlotMenu(40, 40, host.state.slots[0].id, host);
    expect(document.querySelector(".slot-menu__layer")).toBeNull();
  });
});
