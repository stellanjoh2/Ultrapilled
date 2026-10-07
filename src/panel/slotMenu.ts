import arrowCounterClockwise from "@phosphor-icons/core/assets/regular/arrow-counter-clockwise.svg?raw";
import arrowsInLineHorizontal from "@phosphor-icons/core/assets/regular/arrows-in-line-horizontal.svg?raw";
import caretDown from "@phosphor-icons/core/assets/regular/caret-down.svg?raw";
import caretLineDown from "@phosphor-icons/core/assets/regular/caret-line-down.svg?raw";
import caretLineUp from "@phosphor-icons/core/assets/regular/caret-line-up.svg?raw";
import caretUp from "@phosphor-icons/core/assets/regular/caret-up.svg?raw";
import circleHalf from "@phosphor-icons/core/assets/regular/circle-half.svg?raw";
import copySimple from "@phosphor-icons/core/assets/regular/copy-simple.svg?raw";
import eyedropper from "@phosphor-icons/core/assets/regular/eyedropper.svg?raw";
import flipHorizontal from "@phosphor-icons/core/assets/regular/flip-horizontal.svg?raw";
import flipVertical from "@phosphor-icons/core/assets/regular/flip-vertical.svg?raw";
import imageIcon from "@phosphor-icons/core/assets/regular/image.svg?raw";
import linkSimple from "@phosphor-icons/core/assets/regular/link-simple.svg?raw";
import magnet from "@phosphor-icons/core/assets/regular/magnet.svg?raw";
import paintBrush from "@phosphor-icons/core/assets/regular/paint-brush.svg?raw";
import paintBucket from "@phosphor-icons/core/assets/regular/paint-bucket.svg?raw";
import pauseIcon from "@phosphor-icons/core/assets/regular/pause.svg?raw";
import pencilSimple from "@phosphor-icons/core/assets/regular/pencil-simple.svg?raw";
import sparkle from "@phosphor-icons/core/assets/regular/sparkle.svg?raw";
import trashSimple from "@phosphor-icons/core/assets/regular/trash-simple.svg?raw";
import videoCamera from "@phosphor-icons/core/assets/regular/video-camera.svg?raw";
import gsap from "gsap";
import { wrapCheckInput } from "../checkBox";
import { mountColorPicker } from "../colorPicker";
import { isSvgSource } from "../chipKinds";
import { gradientEndIndex } from "../pillFill";
import { playClick, playCreate, playSwitch, playTransition } from "../uiSounds";
import { placeZoomedFixed } from "../uiScale";
import type { AppState, ImageSlot, Slot, TextSlot } from "../types";
import { isTextField, sanitizeTextMotion } from "../types";
import { canRelinkSlot } from "../remoteImage";
import { ATTRACTOR_UI } from "../attractors";

export type LayerMove = "front" | "forward" | "backward" | "back";

const LAYER_ACTIONS: { label: string; where: LayerMove; icon: string }[] = [
  { label: "Bring to front", where: "front", icon: caretLineUp },
  { label: "Bring forward", where: "forward", icon: caretUp },
  { label: "Send backward", where: "backward", icon: caretDown },
  { label: "Send to back", where: "back", icon: caretLineDown },
];

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
  openSlots: Set<string>;
  pickSlot(id: string, opts?: { force?: boolean; additive?: boolean; quiet?: boolean }): void;
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
  editChipText(id: string, select: "all" | "end", at?: { x: number; y: number }): void;
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
  relinkSlotContent(id: string): Promise<boolean>;
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

function placeSlotMenu(root: HTMLElement, x: number, y: number) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.body.append(root);
  placeZoomedFixed(root, x, y, 8);
  const menu = root.querySelector(".slot-menu");
  if (!(menu instanceof HTMLElement)) return;
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
    btn.dataset.tip = "Click the selected color again to pick any color";
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

function menuCheckRow(label: string, checked: boolean, onToggle: (next: boolean) => void, tip?: string): HTMLElement {
  const row = document.createElement("label");
  row.className = "slot-menu__check";
  const hint =
    tip ??
    (label === "Stroked"
      ? "Draw an outline instead of a filled shape"
      : label === "Gradient"
        ? "Blend two colors across the object"
        : "");
  if (hint) row.dataset.tip = hint;
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
  // Quiet: menu plays the shelf-open transition instead of a pick click.
  H.pickSlot(id, { force: true, quiet: true });
  playTransition(true);
  const slot = H.state.slots.find((item) => item.id === id);
  const abort = new AbortController();
  const root = document.createElement("div");
  root.className = "slot-menu-host";
  const menu = document.createElement("div");
  menu.className = "slot-menu";
  menu.setAttribute("role", "menu");
  root.append(menu);
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

  // Selection stroke while the menu is open; clear only when the menu dismisses.
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
      holdScrollClose(() => H.liveChip(slot.id));
    };
    const paintShapeCustom = (index: number, hex: string) => {
      slot.colorIndex = index;
      slot.color = hex;
      holdScrollClose(() => H.liveChip(slot.id));
    };
    const paintGradColor = (index: number) => {
      H.remember();
      slot.gradientColorIndex = index;
      slot.gradientColor = undefined;
      holdScrollClose(() => H.liveChip(slot.id));
    };
    const paintGradCustom = (index: number, hex: string) => {
      slot.gradientColorIndex = index;
      slot.gradientColor = hex;
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
            holdScrollClose(() => H.liveChip(slot.id));
            mountImageInk();
            placeSlotMenu(root, x, y);
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
            holdScrollClose(() => H.liveChip(slot.id));
            mountImageInk();
            placeSlotMenu(root, x, y);
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
        holdScrollClose(() => H.liveChip(slot.id));
      };
      const paintCustom = (index: number, hex: string) => {
        slot.colorIndex = index;
        slot.color = hex;
        slot.textColorIndex = undefined;
        slot.textColor = undefined;
        holdScrollClose(() => H.liveChip(slot.id));
      };
      const paintGradColor = (index: number) => {
        H.remember();
        slot.gradientColorIndex = index;
        slot.gradientColor = undefined;
        holdScrollClose(() => H.liveChip(slot.id));
      };
      const paintGradCustom = (index: number, hex: string) => {
        slot.gradientColorIndex = index;
        slot.gradientColor = hex;
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
          holdScrollClose(() => H.liveChip(slot.id));
          mountBareInk();
          placeSlotMenu(root, x, y);
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
            holdScrollClose(() => H.liveChip(slot.id));
          },
          (index, hex) => {
            slot.textColorIndex = index;
            slot.textColor = hex;
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
              holdScrollClose(() => H.liveChip(slot.id));
            },
            (index, hex) => {
              slot.colorIndex = index;
              slot.color = hex;
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
              holdScrollClose(() => H.liveChip(slot.id));
            },
            (index, hex) => {
              slot.gradientColorIndex = index;
              slot.gradientColor = hex;
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
              holdScrollClose(() => H.liveChip(slot.id));
            },
            (index, hex) => {
              slot.colorIndex = index;
              slot.color = hex;
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
          holdScrollClose(() => H.liveChip(slot.id));
          mountTextInk();
          placeSlotMenu(root, x, y);
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
          holdScrollClose(() => H.liveChip(slot.id));
          mountTextInk();
          placeSlotMenu(root, x, y);
        }),
      );
      insertMenuInk(menu, nodes);
    };
    mountTextInk();
  }

  const actions: {
    id: string;
    label: string;
    icon: string;
    run: () => void;
    stay?: boolean;
    disabled?: () => boolean;
  }[] = [];
  if (slot?.kind === "image" && canRelinkSlot(slot, H.world.chipEl(slot.id))) {
    actions.push({
      id: "relink-content",
      label: "Re-link content",
      icon: linkSimple,
      run: () => {
        void H.relinkSlotContent(slot.id);
      },
    });
  }
  if (slot?.kind === "image" && H.uploadedShape(slot)) {
    actions.push({
      id: "replace-image",
      label: "Replace image",
      icon: imageIcon,
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
      id: "replace-video",
      label: "Replace video",
      icon: videoCamera,
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
      id: "recolor",
      label: "Recolor",
      icon: paintBucket,
      stay: true,
      run: () => {
        H.remember();
        slot.tint = true;
        playSwitch(true);
        panelNeedsSync = true;
        revealImageInk?.();
        holdScrollClose(() => H.liveChip(id));
        placeSlotMenu(root, x, y);
      },
    });
  }
  if (slot?.kind === "image" && H.uploadedShape(slot) && isSvgSource(slot) && slot.tint) {
    actions.push({
      id: "original-color",
      label: "Original Color",
      icon: arrowCounterClockwise,
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
    actions.push({
      id: "edit-text",
      label: "Edit text",
      icon: pencilSimple,
      run: () => H.editChipText(id, "all"),
    });
  }
  // Invert: text/SVG/presets flip ink; rasters toggle pixel invert. Recolor is SVG-only.
  actions.push({
    id: "duplicate",
    label: "Duplicate",
    icon: copySimple,
    run: () => H.duplicateSlot(id),
  });
  if (ATTRACTOR_UI && slot && !H.state.physics.layoutMode) {
    const magnetOn = Boolean(slot.attractor);
    actions.push({
      id: magnetOn ? "remove-attractor" : "make-attractor",
      label: magnetOn ? "Remove Attractor" : "Make Attractor",
      icon: magnet,
      run: () => {
        H.remember();
        for (const item of H.state.slots) {
          if (item.id === id) item.attractor = magnetOn ? undefined : true;
          else item.attractor = undefined;
        }
        playSwitch(!magnetOn);
        if (!magnetOn) H.openSlots.add(id);
        H.live();
        H.renderPanel();
      },
    });
  }
  if (slot) {
    actions.push({
      id: "copy-style",
      label: "Copy style",
      icon: eyedropper,
      stay: true,
      run: () => {
        H.copySlotStyle(slot);
        menu.querySelectorAll<HTMLButtonElement>(".slot-menu__item").forEach((btn) => {
          if (btn.dataset.action === "paste-style") btn.disabled = !H.canPasteSlotStyle(slot);
        });
      },
    });
    actions.push({
      id: "paste-style",
      label: "Paste style",
      icon: paintBrush,
      disabled: () => !H.canPasteSlotStyle(slot),
      run: () => H.pasteSlotStyle(id),
    });
  }
  if (slot?.kind === "text" && !isTextField(slot)) {
    // Authoritative slot flag only — a stale is-text-anim-host after Stop used to
    // keep the menu stuck on "Stop Animation" even though textAnim was cleared.
    const animating = Boolean(slot.textAnim);
    actions.push({
      id: animating ? "stop-animation" : "animate",
      label: animating ? "Stop Animation" : "Animate",
      icon: animating ? pauseIcon : sparkle,
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
  if (H.state.physics.layoutMode) {
    actions.push({
      id: "align-straight",
      label: "Align straight",
      icon: arrowsInLineHorizontal,
      stay: true,
      run: () => {
        holdScrollClose(() => H.alignSlotStraight(id));
      },
    });
  }
  actions.push(
    {
      id: "flip-horizontal",
      label: "Flip horizontal",
      icon: flipHorizontal,
      stay: true,
      run: () => {
        holdScrollClose(() => H.flipSlot(id, "x"));
      },
    },
    {
      id: "flip-vertical",
      label: "Flip vertical",
      icon: flipVertical,
      stay: true,
      run: () => {
        holdScrollClose(() => H.flipSlot(id, "y"));
      },
    },
    {
      id: "invert",
      label: "Invert",
      icon: circleHalf,
      stay: true,
      disabled: () => Boolean(slot?.kind === "image" && slot.emoji),
      run: () => {
        const enableTint =
          slot?.kind === "image" && H.uploadedShape(slot) && isSvgSource(slot) && !slot.tint;
        holdScrollClose(() => H.invertSlot(id));
        if (enableTint) {
          panelNeedsSync = true;
          revealImageInk?.();
          menu.querySelectorAll<HTMLElement>(".slot-menu__item").forEach((item) => {
            if (item.dataset.action === "recolor") item.remove();
          });
          placeSlotMenu(root, x, y);
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
    {
      id: "remove",
      label: "Remove",
      icon: trashSimple,
      run: () => H.removeSlot(id),
    },
  );
  for (const action of actions) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot-menu__item";
    btn.dataset.action = action.id;
    btn.setAttribute("role", "menuitem");
    btn.innerHTML = `<span class="slot-menu__item-icon" aria-hidden="true">${action.icon}</span><span class="slot-menu__item-label">${action.label}</span>`;
    if (action.disabled) btn.disabled = action.disabled();
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      if (!action.stay) closeSlotMenu();
      action.run();
      if (action.id === "recolor") {
        btn.remove();
        placeSlotMenu(root, x, y);
      }
    });
    menu.append(btn);
  }

  const layerBtns: HTMLButtonElement[] = [];
  if (H.state.physics.layoutMode && H.state.slots.length > 1) {
    const layers = document.createElement("div");
    layers.className = "slot-menu__layers";
    layers.setAttribute("role", "group");
    layers.setAttribute("aria-label", "Layer order");
    const refreshLayers = () => {
      layers.querySelectorAll<HTMLButtonElement>(".slot-menu__layer").forEach((btn) => {
        const where = btn.dataset.layer as LayerMove | undefined;
        if (!where) return;
        btn.disabled = !H.canMoveSlotLayer(id, where);
      });
    };
    for (const item of LAYER_ACTIONS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slot-menu__layer";
      btn.dataset.layer = item.where;
      btn.setAttribute("aria-label", item.label);
      btn.setAttribute("data-tip", item.label);
      btn.innerHTML = `<span class="slot-menu__layer-icon" aria-hidden="true">${item.icon}</span>`;
      btn.disabled = !H.canMoveSlotLayer(id, item.where);
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        H.moveSlotLayer(id, item.where);
        refreshLayers();
      });
      layers.append(btn);
      layerBtns.push(btn);
    }
    root.append(layers);
  }

  placeSlotMenu(root, x, y);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (layerBtns.length && !reduceMotion) {
    gsap.fromTo(
      layerBtns,
      { autoAlpha: 0, y: -10 },
      { autoAlpha: 1, y: 0, duration: 0.11, stagger: 0.025, ease: "power2.out" },
    );
  }

  let closed = false;
  let closing = false;
  const finishClose = () => {
    if (closed) return;
    closed = true;
    gsap.killTweensOf([root, ...layerBtns]);
    if (getCloseSlotMenu() === closeCurrent) setCloseSlotMenu(() => {});
    if (H.tintPicker && menu.contains(H.tintPicker.anchor)) H.tintPicker.close();
    clearMenuStroke();
    root.remove();
    if (panelNeedsSync) {
      panelNeedsSync = false;
      H.renderPanel();
    }
  };

  /** Instant for actions / reopen; `{ animate: true }` for dismiss with fade + close sound. */
  const closeCurrent = (opts?: { animate?: boolean }) => {
    const animate = Boolean(opts?.animate);
    if (closing) {
      if (!animate) finishClose();
      return;
    }
    closing = true;
    abort.abort();

    if (animate) {
      playTransition(false);
      if (!reduceMotion) {
        gsap.killTweensOf(layerBtns);
        gsap.to(root, {
          autoAlpha: 0,
          duration: 0.12,
          ease: "power2.in",
          onComplete: finishClose,
        });
        return;
      }
    }
    finishClose();
  };
  setCloseSlotMenu(closeCurrent);
  H.bindSlotMenuDismiss(root, abort, () => closeCurrent({ animate: true }), {
    keepOnScroll: () => ignoreScroll > 0,
  });
}
