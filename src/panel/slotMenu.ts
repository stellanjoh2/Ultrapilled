import { wrapCheckInput } from "../checkBox";
import { mountColorPicker } from "../colorPicker";
import { isSvgSource } from "../chipKinds";
import { gradientEndIndex } from "../pillFill";
import { playClick, playCreate, playSwitch } from "../uiSounds";
import { placeZoomedFixed } from "../uiScale";
import type { AppState, ImageSlot, Slot, TextSlot } from "../types";
import { sanitizeTextMotion } from "../types";

export type LayerMove = "front" | "forward" | "backward" | "back";

export type SlotMenuHost = {
  state: AppState;
  panel: HTMLElement;
  world: {
    setPicked(id: string | null): void;
    chipEl(id: string): HTMLElement | null | undefined;
  };
  remember(key?: string): void;
  live(): void;
  endGesture(): void;
  renderPanel(): void;
  liveChip(id: string, opts?: { quiet?: boolean }): void;
  pickSlot(id: string, opts?: { force?: boolean; additive?: boolean }): void;
  get gesture(): string | null;
  get tintPicker(): { anchor: HTMLElement; close: () => void } | null;
  setTintPicker(value: { anchor: HTMLElement; close: () => void } | null): void;
  bindSlotMenuDismiss(
    menu: HTMLElement,
    abort: AbortController,
    onClose: () => void,
    opts?: { keepOnScroll?: () => boolean },
  ): void;
  uploadedShape(slot: ImageSlot): boolean;
  isRasterUpload(slot: ImageSlot): boolean;
  iconCanGradient(slot: ImageSlot): boolean;
  storeGradient(slot: TextSlot): void;
  recallGradient(slot: TextSlot): void;
  pickImageFiles(multiple?: boolean): Promise<File[]>;
  assignImageFile(slot: ImageSlot, file: File): Promise<void>;
  assignVideoFile(slot: ImageSlot, file: File): Promise<void>;
  isVideoFile(file: File): boolean;
  editChipText(id: string, wipe: boolean): void;
  duplicateSlot(id: string): void;
  removeSlot(id: string): void;
  invertSlot(id: string): void;
  flipSlot(id: string, axis: "x" | "y"): void;
  alignSlotStraight(id: string): void;
  copySlotStyle(slot: Slot): void;
  pasteSlotStyle(id: string): void;
  canPasteSlotStyle(slot: Slot): boolean;
  canMoveSlotLayer(id: string, where: LayerMove): boolean;
  moveSlotLayer(id: string, where: LayerMove): boolean;
};

let H: SlotMenuHost;
let closeFn: () => void = () => {};

export function closeSlotMenu() {
  closeFn();
}

function getCloseSlotMenu() {
  return closeFn;
}

function setCloseSlotMenu(fn: () => void) {
  closeFn = fn;
}

/** Used by canvas context menu which shares the same dismiss closer. */
export function assignCloseSlotMenu(fn: () => void) {
  setCloseSlotMenu(fn);
}

export function peekCloseSlotMenu(): () => void {
  return closeFn;
}

export function bindSlotMenu(host: SlotMenuHost) {
  H = host;
}

function placeSlotMenu(menu: HTMLElement, x: number, y: number) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.body.append(menu);
  placeZoomedFixed(menu, x, y, 8);
  if (reduceMotion) menu.classList.add("is-in");
  else requestAnimationFrame(() => menu.classList.add("is-in"));
}

function openMenuDotPicker(btn: HTMLButtonElement, value: string, onChange: (hex: string) => void) {
  if (H.tintPicker?.anchor === btn) return;
  H.tintPicker?.close();
  const gestureKey = "menu-dot";
  const picker = mountColorPicker({
    anchor: btn,
    value,
    onChange(hex) {
      H.remember(gestureKey);
      onChange(hex);
      btn.style.background = hex;
    },
    onClose() {
      if (H.gesture === gestureKey) H.endGesture();
      if (H.tintPicker?.anchor === btn) H.setTintPicker(null);
    },
  });
  H.setTintPicker({ anchor: btn, close: picker.close });
}

function menuColorRow(
  label: string,
  selectedIndex: number | null,
  onPick: (index: number) => void,
  onCustom?: (index: number, hex: string) => void,
  custom?: string,
): HTMLElement {
  const row = document.createElement("div");
  row.className = "slot-menu__colors";
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", label);

  const title = document.createElement("p");
  title.className = "slot-menu__label";
  title.textContent = label;
  row.append(title);

  const dots = document.createElement("div");
  dots.className = "slot-menu__dots";
  let onBtn: HTMLButtonElement | null = null;
  H.state.theme.forEach((color, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot-menu__dot";
    const selected = selectedIndex === index;
    btn.style.background = selected && custom ? custom : color;
    btn.setAttribute("aria-label", `${label} ${index + 1}`);
    btn.setAttribute("aria-pressed", String(selected));
    if (selected) {
      btn.classList.add("is-on");
      onBtn = btn;
    }
    btn.addEventListener("click", () => {
      playClick();
      if (onBtn === btn && onCustom) {
        openMenuDotPicker(btn, custom ?? color, (hex) => {
          custom = hex;
          onCustom(index, hex);
        });
        return;
      }
      onPick(index);
      custom = undefined;
      if (onBtn && onBtn !== btn) {
        const prev = H.state.theme[Number(onBtn.dataset.themeIndex)];
        if (prev) onBtn.style.background = prev;
        onBtn.classList.remove("is-on");
        onBtn.setAttribute("aria-pressed", "false");
      }
      btn.style.background = color;
      btn.classList.add("is-on");
      btn.setAttribute("aria-pressed", "true");
      onBtn = btn;
    });
    btn.dataset.themeIndex = String(index);
    dots.append(btn);
  });
  row.append(dots);
  return row;
}

function menuCheckRow(label: string, checked: boolean, onToggle: (next: boolean) => void): HTMLElement {
  const row = document.createElement("label");
  row.className = "slot-menu__check";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => {
    playSwitch(input.checked);
    onToggle(input.checked);
  });
  row.append(input, document.createTextNode(label));
  wrapCheckInput(input);
  return row;
}

/** Mark menu chrome so gradient/color blocks can be rebuilt in place. */
function markMenuInk(el: HTMLElement): HTMLElement {
  el.dataset.menuInk = "";
  return el;
}

function clearMenuInk(menu: HTMLElement) {
  menu.querySelectorAll("[data-menu-ink]").forEach((el) => el.remove());
}

function insertMenuInk(menu: HTMLElement, nodes: HTMLElement[]) {
  const frag = document.createDocumentFragment();
  for (const node of nodes) frag.append(markMenuInk(node));
  const anchor = menu.querySelector(".slot-menu__item");
  if (anchor) menu.insertBefore(frag, anchor);
  else menu.append(frag);
}

export function openSlotMenu(x: number, y: number, id: string, host?: SlotMenuHost) {
  if (host) H = host;
  closeSlotMenu();
  // Select first (panel jump) before the menu listens for scroll-to-close.
  H.pickSlot(id, { force: true });
  const slot = H.state.slots.find((item) => item.id === id);
  const abort = new AbortController();
  const menu = document.createElement("div");
  menu.className = "slot-menu";
  menu.setAttribute("role", "menu");
  // Panel scroll closes the menu; ignore scrolls caused by in-menu updates.
  let ignoreScroll = 0;
  const holdScrollClose = (fn: () => void) => {
    ignoreScroll += 1;
    try {
      fn();
    } finally {
      requestAnimationFrame(() => {
        ignoreScroll -= 1;
      });
    }
  };

  // Solid select stroke while the menu is open; clear chip outline on option/close.
  let menuStroke = true;
  const paintMenuStroke = () => {
    if (!menuStroke) return;
    H.world.setPicked(id);
    H.world.chipEl(id)?.classList.add("is-menu-picked");
  };
  const clearMenuStroke = () => {
    if (!menuStroke) return;
    menuStroke = false;
    H.world.chipEl(id)?.classList.remove("is-menu-picked");
    H.world.setPicked(null);
  };
  paintMenuStroke();

  let revealImageInk: (() => void) | null = null;
  /** Panel refresh deferred until the menu closes — H.renderPanel() would orphan dismiss listeners. */
  let panelNeedsSync = false;

  if (slot?.kind === "image") {
    const paintShapeColor = (index: number) => {
      H.remember();
      slot.colorIndex = index;
      slot.color = undefined;
      clearMenuStroke();
      holdScrollClose(() => H.liveChip(slot.id));
    };
    const paintShapeCustom = (index: number, hex: string) => {
      slot.colorIndex = index;
      slot.color = hex;
      clearMenuStroke();
      holdScrollClose(() => H.liveChip(slot.id));
    };
    const paintGradColor = (index: number) => {
      H.remember();
      slot.gradientColorIndex = index;
      slot.gradientColor = undefined;
      clearMenuStroke();
      holdScrollClose(() => H.liveChip(slot.id));
    };
    const paintGradCustom = (index: number, hex: string) => {
      slot.gradientColorIndex = index;
      slot.gradientColor = hex;
      clearMenuStroke();
      holdScrollClose(() => H.liveChip(slot.id));
    };
    const mountImageInk = () => {
      clearMenuInk(menu);
      const nodes: HTMLElement[] = [];
      if (H.isRasterUpload(slot) || slot.youtube || slot.video) {
        if (slot.stroked) {
          nodes.push(
            menuColorRow("Stroke Color:", slot.colorIndex ?? 0, paintShapeColor, paintShapeCustom, slot.color),
          );
        }
        nodes.push(
          menuCheckRow("Stroked", Boolean(slot.stroked), (next) => {
            H.remember();
            slot.stroked = next;
            if (next && slot.stroke == null) slot.stroke = 4;
            panelNeedsSync = true;
            clearMenuStroke();
            holdScrollClose(() => H.liveChip(slot.id));
            mountImageInk();
            placeSlotMenu(menu, x, y);
          }),
        );
      } else if (H.iconCanGradient(slot)) {
        if (slot.gradient) {
          nodes.push(
            menuColorRow("Start color:", slot.colorIndex ?? 0, paintShapeColor, paintShapeCustom, slot.color),
            menuColorRow(
              "End color:",
              gradientEndIndex(H.state.theme, slot),
              paintGradColor,
              paintGradCustom,
              slot.gradientColor,
            ),
          );
        } else {
          nodes.push(
            menuColorRow("Color:", slot.colorIndex ?? 0, paintShapeColor, paintShapeCustom, slot.color),
          );
        }
        nodes.push(
          menuCheckRow("Gradient", Boolean(slot.gradient), (next) => {
            H.remember();
            slot.gradient = next || undefined;
            if (!next) slot.animatedGradient = undefined;
            else if (slot.gradientColorIndex == null && !slot.gradientColor) {
              slot.gradientColorIndex = gradientEndIndex(H.state.theme, slot);
            }
            panelNeedsSync = true;
            clearMenuStroke();
            holdScrollClose(() => H.liveChip(slot.id));
            mountImageInk();
            placeSlotMenu(menu, x, y);
          }),
        );
      }
      if (nodes.length) insertMenuInk(menu, nodes);
    };
    revealImageInk = mountImageInk;
    if (H.iconCanGradient(slot) || H.isRasterUpload(slot) || slot.youtube || slot.video) mountImageInk();
  } else if (slot?.kind === "text" && slot.shape === "none") {
    const mountBareInk = () => {
      clearMenuInk(menu);
      const paintColor = (index: number) => {
        H.remember();
        slot.colorIndex = index;
        slot.color = undefined;
        slot.textColorIndex = undefined;
        slot.textColor = undefined;
        clearMenuStroke();
        holdScrollClose(() => H.liveChip(slot.id));
      };
      const paintCustom = (index: number, hex: string) => {
        slot.colorIndex = index;
        slot.color = hex;
        slot.textColorIndex = undefined;
        slot.textColor = undefined;
        clearMenuStroke();
        holdScrollClose(() => H.liveChip(slot.id));
      };
      const paintGradColor = (index: number) => {
        H.remember();
        slot.gradientColorIndex = index;
        slot.gradientColor = undefined;
        clearMenuStroke();
        holdScrollClose(() => H.liveChip(slot.id));
      };
      const paintGradCustom = (index: number, hex: string) => {
        slot.gradientColorIndex = index;
        slot.gradientColor = hex;
        clearMenuStroke();
        holdScrollClose(() => H.liveChip(slot.id));
      };
      const nodes: HTMLElement[] = [];
      if (slot.gradient) {
        nodes.push(
          menuColorRow("Start color:", slot.colorIndex ?? 0, paintColor, paintCustom, slot.color),
          menuColorRow(
            "End color:",
            gradientEndIndex(H.state.theme, slot),
            paintGradColor,
            paintGradCustom,
            slot.gradientColor,
          ),
        );
      } else {
        nodes.push(menuColorRow("Color:", slot.colorIndex ?? 0, paintColor, paintCustom, slot.color));
      }
      nodes.push(
        menuCheckRow("Gradient", Boolean(slot.gradient), (next) => {
          H.remember();
          if (next) {
            H.recallGradient(slot);
            slot.gradient = true;
            if (slot.gradientColorIndex == null && !slot.gradientColor) {
              slot.gradientColorIndex = gradientEndIndex(H.state.theme, slot);
            }
          } else {
            H.storeGradient(slot);
            slot.gradient = false;
            slot.animatedGradient = undefined;
          }
          panelNeedsSync = true;
          clearMenuStroke();
          holdScrollClose(() => H.liveChip(slot.id));
          mountBareInk();
          placeSlotMenu(menu, x, y);
        }),
      );
      insertMenuInk(menu, nodes);
    };
    mountBareInk();
  } else if (slot?.kind === "text") {
    const mountTextInk = () => {
      clearMenuInk(menu);
      const textSelected =
        slot.textColorIndex == null || slot.textColorIndex >= H.state.theme.length
          ? null
          : slot.textColorIndex;
      const shapeSelected = slot.colorIndex ?? 0;
      const nodes: HTMLElement[] = [
        menuColorRow(
          "Text Color:",
          textSelected,
          (index) => {
            H.remember();
            slot.textColorIndex = index;
            slot.textColor = undefined;
            clearMenuStroke();
            holdScrollClose(() => H.liveChip(slot.id));
          },
          (index, hex) => {
            slot.textColorIndex = index;
            slot.textColor = hex;
            clearMenuStroke();
            holdScrollClose(() => H.liveChip(slot.id));
          },
          slot.textColor,
        ),
      ];
      if (slot.gradient && !slot.stroked) {
        nodes.push(
          menuColorRow(
            "Start color:",
            shapeSelected,
            (index) => {
              H.remember();
              slot.colorIndex = index;
              slot.color = undefined;
              clearMenuStroke();
              holdScrollClose(() => H.liveChip(slot.id));
            },
            (index, hex) => {
              slot.colorIndex = index;
              slot.color = hex;
              clearMenuStroke();
              holdScrollClose(() => H.liveChip(slot.id));
            },
            slot.color,
          ),
          menuColorRow(
            "End color:",
            gradientEndIndex(H.state.theme, slot),
            (index) => {
              H.remember();
              slot.gradientColorIndex = index;
              slot.gradientColor = undefined;
              clearMenuStroke();
              holdScrollClose(() => H.liveChip(slot.id));
            },
            (index, hex) => {
              slot.gradientColorIndex = index;
              slot.gradientColor = hex;
              clearMenuStroke();
              holdScrollClose(() => H.liveChip(slot.id));
            },
            slot.gradientColor,
          ),
        );
      } else {
        nodes.push(
          menuColorRow(
            slot.stroked ? "Stroke Color:" : "Shape Color:",
            shapeSelected,
            (index) => {
              H.remember();
              slot.colorIndex = index;
              slot.color = undefined;
              clearMenuStroke();
              holdScrollClose(() => H.liveChip(slot.id));
            },
            (index, hex) => {
              slot.colorIndex = index;
              slot.color = hex;
              clearMenuStroke();
              holdScrollClose(() => H.liveChip(slot.id));
            },
            slot.color,
          ),
        );
      }
      nodes.push(
        menuCheckRow("Stroked", slot.stroked, (next) => {
          H.remember();
          slot.stroked = next;
          if (next && slot.gradient) {
            H.storeGradient(slot);
            slot.gradient = false;
          }
          panelNeedsSync = true;
          clearMenuStroke();
          holdScrollClose(() => H.liveChip(slot.id));
          mountTextInk();
          placeSlotMenu(menu, x, y);
        }),
        menuCheckRow("Gradient", Boolean(slot.gradient) && !slot.stroked, (next) => {
          H.remember();
          if (next) {
            slot.stroked = false;
            H.recallGradient(slot);
            slot.gradient = true;
            if (slot.gradientColorIndex == null && !slot.gradientColor) {
              slot.gradientColorIndex = gradientEndIndex(H.state.theme, slot);
            }
          } else {
            H.storeGradient(slot);
            slot.gradient = false;
            slot.animatedGradient = undefined;
          }
          panelNeedsSync = true;
          clearMenuStroke();
          holdScrollClose(() => H.liveChip(slot.id));
          mountTextInk();
          placeSlotMenu(menu, x, y);
        }),
      );
      insertMenuInk(menu, nodes);
    };
    mountTextInk();
  }

  const actions: {
    label: string;
    run: () => void;
    stay?: boolean;
    layer?: LayerMove;
    disabled?: () => boolean;
  }[] = [];
  if (slot?.kind === "image" && H.uploadedShape(slot)) {
    actions.push({
      label: "Replace image",
      run: () => {
        void H.pickImageFiles(false).then((files) => {
          const file = files[0];
          if (!file) return;
          H.remember();
          playCreate();
          const job = H.isVideoFile(file) ? H.assignVideoFile(slot, file) : H.assignImageFile(slot, file);
          void job.then(() => {
            H.renderPanel();
            H.live();
          });
        });
      },
    });
  }
  if (slot?.kind === "image" && slot.video) {
    actions.push({
      label: "Replace video",
      run: () => {
        void H.pickImageFiles(false).then((files) => {
          const file = files[0];
          if (!file) return;
          H.remember();
          playCreate();
          if (H.isVideoFile(file) && slot.video) {
            slot.video = { ...slot.video, ready: false };
            H.live();
          }
          const job = H.isVideoFile(file) ? H.assignVideoFile(slot, file) : H.assignImageFile(slot, file);
          void job.then(() => {
            H.renderPanel();
            H.live();
          });
        });
      },
    });
  }
  if (slot?.kind === "image" && H.uploadedShape(slot) && isSvgSource(slot) && !slot.tint) {
    actions.push({
      label: "Recolor",
      stay: true,
      run: () => {
        H.remember();
        slot.tint = true;
        playSwitch(true);
        panelNeedsSync = true;
        revealImageInk?.();
        clearMenuStroke();
        holdScrollClose(() => H.liveChip(id));
        placeSlotMenu(menu, x, y);
      },
    });
  }
  if (slot?.kind === "image" && H.uploadedShape(slot) && isSvgSource(slot) && slot.tint) {
    actions.push({
      label: "Original Color",
      run: () => {
        H.remember();
        slot.tint = undefined;
        slot.gradient = undefined;
        slot.animatedGradient = undefined;
        playSwitch(false);
        H.liveChip(id);
        H.renderPanel();
      },
    });
  }
  if (slot?.kind === "text") {
    actions.push({ label: "Edit text", run: () => H.editChipText(id, false) });
  }
  // Invert: text/SVG/presets flip ink; rasters toggle pixel invert. Recolor is SVG-only.
  actions.push({ label: "Duplicate", run: () => H.duplicateSlot(id) });
  if (slot) {
    actions.push({
      label: "Copy style",
      stay: true,
      run: () => {
        H.copySlotStyle(slot);
        menu.querySelectorAll<HTMLButtonElement>(".slot-menu__item").forEach((btn) => {
          if (btn.textContent === "Paste style") btn.disabled = !H.canPasteSlotStyle(slot);
        });
      },
    });
    actions.push({
      label: "Paste style",
      disabled: () => !H.canPasteSlotStyle(slot),
      run: () => H.pasteSlotStyle(id),
    });
  }
  if (slot?.kind === "text") {
    // Prefer the live flag; also treat an on-stage letter cycle as animating
    // so the menu never offers "Animate" while letters are still moving.
    const chipAnimating = Boolean(H.world.chipEl(id)?.classList.contains("is-text-anim-host"));
    const animating = Boolean(slot.textAnim) || chipAnimating;
    actions.push({
      label: animating ? "Stop Animation" : "Animate",
      run: () => {
        H.remember();
        const current = H.state.slots.find((item) => item.id === id);
        if (!current || current.kind !== "text") return;
        current.textAnim = animating ? undefined : true;
        if (current.textAnim) current.animatedGradient = undefined;
        sanitizeTextMotion(current);
        H.liveChip(current.id);
        H.renderPanel();
      },
    });
  }
  if (H.state.physics.layoutMode && H.state.slots.length > 1) {
    const layers: { label: string; where: LayerMove; stay?: boolean }[] = [
      { label: "Bring to front", where: "front" },
      { label: "Bring forward", where: "forward", stay: true },
      { label: "Send backward", where: "backward", stay: true },
      { label: "Send to back", where: "back" },
    ];
    for (const item of layers) {
      actions.push({
        label: item.label,
        stay: item.stay,
        layer: item.where,
        disabled: () => !H.canMoveSlotLayer(id, item.where),
        run: () => {
          H.moveSlotLayer(id, item.where);
        },
      });
    }
  }
  if (H.state.physics.layoutMode) {
    actions.push({
      label: "Align straight",
      stay: true,
      run: () => {
        holdScrollClose(() => H.alignSlotStraight(id));
      },
    });
  }
  actions.push(
    {
      label: "Flip horizontal",
      stay: true,
      run: () => {
        holdScrollClose(() => H.flipSlot(id, "x"));
      },
    },
    {
      label: "Flip vertical",
      stay: true,
      run: () => {
        holdScrollClose(() => H.flipSlot(id, "y"));
      },
    },
    {
      label: "Invert",
      stay: true,
      disabled: () => Boolean(slot?.kind === "image" && slot.emoji),
      run: () => {
        const enableTint =
          slot?.kind === "image" && H.uploadedShape(slot) && isSvgSource(slot) && !slot.tint;
        holdScrollClose(() => H.invertSlot(id));
        if (enableTint) {
          panelNeedsSync = true;
          revealImageInk?.();
          menu.querySelectorAll(".slot-menu__item").forEach((item) => {
            if (item.textContent === "Recolor") item.remove();
          });
          placeSlotMenu(menu, x, y);
        }
        menu.querySelectorAll<HTMLElement>(".slot-menu__colors").forEach((row) => {
          const name = row.getAttribute("aria-label") || "";
          if (/^Text /i.test(name)) return;
          row.querySelectorAll(".slot-menu__dot.is-on").forEach((dot) => {
            dot.classList.remove("is-on");
            dot.setAttribute("aria-pressed", "false");
          });
        });
      },
    },
    { label: "Remove", run: () => H.removeSlot(id) },
  );
  const refreshDisabled = () => {
    menu.querySelectorAll<HTMLButtonElement>(".slot-menu__item[data-layer]").forEach((btn) => {
      const where = btn.dataset.layer as LayerMove | undefined;
      if (!where) return;
      btn.disabled = !H.canMoveSlotLayer(id, where);
    });
  };
  for (const action of actions) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot-menu__item";
    btn.setAttribute("role", "menuitem");
    btn.textContent = action.label;
    if (action.layer) btn.dataset.layer = action.layer;
    if (action.disabled) btn.disabled = action.disabled();
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      clearMenuStroke();
      if (!action.stay) closeSlotMenu();
      action.run();
      if (action.layer && action.stay) refreshDisabled();
      if (action.label === "Recolor") {
        btn.remove();
        placeSlotMenu(menu, x, y);
      }
    });
    menu.append(btn);
  }

  placeSlotMenu(menu, x, y);

  const closeCurrent = () => {
    abort.abort();
    if (getCloseSlotMenu() === closeCurrent) setCloseSlotMenu(() => {});
    if (H.tintPicker && menu.contains(H.tintPicker.anchor)) H.tintPicker.close();
    clearMenuStroke();
    menu.remove();
    if (panelNeedsSync) {
      panelNeedsSync = false;
      H.renderPanel();
    }
  };
  setCloseSlotMenu(closeCurrent);
  H.bindSlotMenuDismiss(menu, abort, closeCurrent, { keepOnScroll: () => ignoreScroll > 0 });
}
