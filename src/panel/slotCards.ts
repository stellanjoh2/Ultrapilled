import imageIcon from "@phosphor-icons/core/assets/regular/image.svg?raw";
import fileSvg from "@phosphor-icons/core/assets/regular/file-svg.svg?raw";
import pencilSimple from "@phosphor-icons/core/assets/regular/pencil-simple.svg?raw";
import pauseIcon from "@phosphor-icons/core/assets/regular/pause.svg?raw";
import playIcon from "@phosphor-icons/core/assets/regular/play.svg?raw";
import textB from "@phosphor-icons/core/assets/regular/text-b.svg?raw";
import textItalic from "@phosphor-icons/core/assets/regular/text-italic.svg?raw";
import textAlignLeft from "@phosphor-icons/core/assets/regular/text-align-left.svg?raw";
import textAlignCenter from "@phosphor-icons/core/assets/regular/text-align-center.svg?raw";
import textAlignRight from "@phosphor-icons/core/assets/regular/text-align-right.svg?raw";
import textT from "@phosphor-icons/core/assets/regular/text-t.svg?raw";
import { checkInput } from "../checkBox";
import { FEATURED_EMOJI, searchEmoji, type EmojiItem } from "../emojis";
import { ICON_PRESETS, IMAGE_COLLIDERS } from "../icons";
import { isColorMask, isSvgSource } from "../chipKinds";
import { pillPadOf, trackingOf } from "../measure";
import {
  gradientAngleOf,
  gradientScaleOf,
  gradientSpeedOf,
  gradientPeriodMs,
} from "../pillFill";
import { textAnimSpeedOf } from "../textAnim";
import { playCreate, playTransition } from "../uiSounds";
import {
  IMAGE_TEMPERATURE_MAX_K,
  IMAGE_TEMPERATURE_MIN_K,
  IMAGE_TEMPERATURE_STEP_K,
  imageContrastOf,
  imageExposureOf,
  imageHueOf,
  imageSaturationOf,
  imageTemperatureLabel,
  imageTemperatureOf,
  type AppState,
  type ImageSlot,
  type Slot,
  type TextSlot,
  isTextField,
  TEXT_FIELD_WORD_MAX,
  TEXT_FIELD_STARTER,
  bundledHasItalic,
  lineHeightSliderOf,
  textFieldLineHeight,
  textAlignOf,
} from "../types";
import { localHasItalic } from "../localFonts";
import { clampTextFieldWords, textFieldWordCount } from "../textField";
import { YOUTUBE_LOOP_MAX, YOUTUBE_LOOP_MIN } from "../youtube";
import { setRangeCaptionValue } from "../rangeCaption";

const DUPLICATE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="4" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="4" y="9" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>`;

const TIPS = {
  typeface: "Font family for this piece",
  weight: "How heavy the letters are",
  textScale: "Size of this text piece",
  textHeight: "How tall the letters sit in the holding shape",
  tracking: "Space between letters",
  lineHeight: "Space between lines in this text box",
  textColor: "Color of the letters",
  pillPad: "Space inside the holding shape",
  shape: "None = bare type, Pill = rounded, Box = rectangle",
  radius: "How round the corners are",
  stroked: "Draw an outline instead of a filled shape",
  stroke: "Thickness of the outline",
  strokeColor: "Color of the outline",
  gradient: "Blend two colors across the piece",
  color: "Fill color — click the selected swatch again to pick any color",
  endColor: "Second color of the gradient",
  gradAngle: "Direction of the color blend",
  gradScale: "How tightly the two colors blend",
  textAnim: "Cycle letters through theme colors",
  textAnimOff: "Turn off Animated Gradient to use Text animation",
  textAnimSpeed: "How fast the color cycle runs",
  gradAnim: "Sweep the gradient so it looks like it is moving",
  gradAnimOff: "Turn off Text animation to use Animated Gradient",
  gradSpeed: "How fast the gradient sweeps",
  shapeScale: "Size of this piece",
  amount: "How many copies drop into the frame",
  clipScale: "How much of the clip is cropped in the frame",
  loopSec: "How many seconds of the clip to loop",
  collider: "Physics hit shape — box or circle",
  recolor: "Tint this SVG with theme colors",
  emojiSearch: "Filter emoji by name",
  replaceImage: "Swap this file without losing other settings",
  replaceVideo: "Swap this video without losing other settings",
};

export type SlotCardHost = {
  state: AppState;
  panel: HTMLElement;
  openSlots: Set<string>;
  pickedSlotIds: Set<string>;
  remember(key?: string): void;
  live(opts?: { quiet?: boolean }): void;
  endGesture(): void;
  renderPanel(): void;
  openSlotMenu(x: number, y: number, id: string): void;
  get focusSlotId(): string | null;
  get pointerHeld(): boolean;
  get gesture(): string | null;
  get assetAnimsFrozen(): boolean;
  showPick(id: string): void;
  pickSlot(id: string, opts?: { additive?: boolean; force?: boolean }): void;
  releasePick(id: string): void;
  duplicateSlot(id: string): void;
  removeSlot(id: string): void;
  chipPreview(slot: TextSlot): string;
  uploadedShape(slot: ImageSlot): boolean;
  iconSrc(slot: ImageSlot): string;
  iconPreviewFill(slot: ImageSlot): string;
  shapeSwatch(src: string, color: string): HTMLElement;
  settingLabel(slot: Slot, name: string, key: string, value?: string): string;
  resetControl(name: string, key: string, dirty: boolean): string;
  fieldDirty(slot: Slot, key: string): boolean;
  textTintRow(slot: TextSlot): string;
  tintRow(slot: Slot, legend?: string): string;
  gradientTintRow(slot: Slot): string;
  blendField(slot: Slot): string;
  dropShadowField(slot: Slot): string;
  attractorField(slot: Slot): string;
  chosenWeight(family: string, weight: number): number;
  mountFontPick(
    hostEl: HTMLElement,
    family: string,
    onPick: (family: string) => void,
    clearLabel?: string,
  ): void;
  mountWeightPick(
    hostEl: HTMLElement,
    family: string,
    weight: number,
    onPick: (weight: number) => void,
    empty?: boolean,
  ): { setFamily(family: string): number; reflect(family: string, weight: number | null): void };
  reflectGlobalWeight(): void;
  paintFieldReset(root: ParentNode, slot: Slot, key: string): void;
  settleFont(family: string, weight: number): Promise<void>;
  liveChip(id: string, opts?: { quiet?: boolean }): void;
  bindSlotInputs(root: HTMLElement, slot: Slot): void;
  bindTint(root: HTMLElement, slot: Slot): void;
  bindFreezeAnims(root: HTMLElement): void;
  iconCanGradient(slot: ImageSlot): boolean;
  isRasterUpload(slot: ImageSlot): boolean;
  colliderOf(slot: ImageSlot): string;
  isImageFile(file: File): boolean;
  isMediaFile(file: File): boolean;
  isVideoFile(file: File): boolean;
  assignImageFile(slot: ImageSlot, file: File): Promise<void>;
  assignVideoFile(slot: ImageSlot, file: File): Promise<void>;
  slotScaleSliderMax(slot: Slot): number;
  escapeAttr(value: string): string;
  IMAGE_FILE_ACCEPT: string;
  AMOUNT_SOFT_CAP: number;
};

let H: SlotCardHost;

export function bindSlotCards(host: SlotCardHost) {
  H = host;
}

export function renderSlotCard(slot: Slot, host?: SlotCardHost): HTMLElement {
  if (host) H = host;
  const card = document.createElement("article");
  const open = H.openSlots.has(slot.id);
  card.className = `slot-card${open ? " is-open" : ""}${H.pickedSlotIds.has(slot.id) ? " is-picked" : ""}`;
  card.dataset.id = slot.id;
  card.addEventListener("contextmenu", (event) => {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("input, textarea, select, [contenteditable='true']")
    ) {
      return;
    }
    event.preventDefault();
    H.openSlotMenu(event.clientX, event.clientY, slot.id);
  });

  if (slot.kind === "text") {
    card.append(textFields(slot, open));
  } else if (slot.youtube || slot.video) {
    card.append(slot.youtube ? youtubeFields(slot, open) : videoFields(slot, open));
  } else if (H.uploadedShape(slot)) {
    card.append(photoFields(slot, open));
  } else {
    card.append(imageFields(slot, open));
  }

  return card;
}

function textColorChip(slot: TextSlot): HTMLElement {
  const mark = document.createElement("span");
  mark.className = "slot-mark";
  mark.setAttribute("aria-hidden", "true");
  if (isTextField(slot)) {
    mark.classList.add("slot-mark--image");
    mark.innerHTML = textT;
    return mark;
  }
  const chip = document.createElement("span");
  chip.className = "slot-chip";
  chip.style.background = H.chipPreview(slot);
  if (slot.gradient && slot.animatedGradient && !slot.stroked) {
    chip.classList.add("is-gradient-animated");
    chip.style.setProperty("--sweep-duration", `${gradientPeriodMs(slot.gradientSpeed) / 1000}s`);
    chip.style.setProperty("--grad-angle", String(gradientAngleOf(slot.gradientAngle)));
  }
  mark.append(chip);
  return mark;
}

function textFieldHeadline(slot: TextSlot): string {
  return slot.text.trim().split("\n")[0] || "Text field";
}

function paintTextHeadline(toggle: HTMLElement, slot: TextSlot, open: boolean, focus: boolean) {
  toggle.replaceChildren();
  const chip = textColorChip(slot);
  if (isTextField(slot) || !open) {
    const name = document.createElement("span");
    name.className = "slot-name";
    const title = document.createElement("span");
    title.className = "slot-title";
    const word = isTextField(slot) ? textFieldHeadline(slot) : slot.text.trim();
    title.textContent = word || (isTextField(slot) ? "Text field" : "Empty");
    if (!slot.text.trim()) title.classList.add("is-empty");
    if (!open) {
      const pen = document.createElement("span");
      pen.className = "slot-pen";
      pen.setAttribute("aria-hidden", "true");
      pen.innerHTML = pencilSimple;
      name.append(title, pen);
    } else {
      name.append(title);
    }
    toggle.append(chip, name);
    if (open && focus && isTextField(slot)) {
      queueMicrotask(() => {
        const area = toggle.closest(".slot-card")?.querySelector<HTMLTextAreaElement>("[data-text-field]");
        if (!area) return;
        area.focus();
        const end = area.value.length;
        area.setSelectionRange(end, end);
      });
    }
    return;
  }
  const input = document.createElement("input");
  input.type = "text";
  input.className = "slot-live";
  input.value = slot.text;
  input.setAttribute("aria-label", "Text");
  input.addEventListener("click", (event) => event.stopPropagation());
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setSlotOpen(toggle, slot, false, false);
    }
  });
  input.addEventListener("input", () => {
    H.remember(`text:${slot.id}`);
    slot.text = input.value;
    H.live();
  });
  input.addEventListener("blur", () => {
    if (H.pointerHeld) return;
    if (H.gesture === `text:${slot.id}`) H.endGesture();
  });
  toggle.append(chip, input);
  if (focus) {
    queueMicrotask(() => {
      input.focus();
      const end = input.value.length;
      input.setSelectionRange(end, end);
    });
  }
}

export function closeOtherSlots(id: string) {
  for (const otherId of [...H.openSlots]) {
    if (otherId === id) continue;
    const card = H.panel.querySelector<HTMLElement>(`[data-id="${otherId}"]`);
    card?.classList.remove("is-picked");
    const other = H.state.slots.find((item) => item.id === otherId);
    const toggle = card?.querySelector<HTMLElement>(".slot-toggle");
    if (other && toggle) setSlotOpen(toggle, other, false, false);
    else {
      H.openSlots.delete(otherId);
      H.releasePick(otherId);
    }
  }
}


export function setSlotOpen(toggle: HTMLElement, slot: Slot, open: boolean, focus: boolean) {
  if (open) {
    H.openSlots.add(slot.id);
    closeOtherSlots(slot.id);
  } else {
    H.openSlots.delete(slot.id);
    H.releasePick(slot.id);
  }
  const card = toggle.closest(".slot-card");
  card?.classList.toggle("is-open", open);
  const fold = toggle.parentElement?.parentElement?.querySelector<HTMLElement>(".slot-fold");
  if (fold) {
    fold.inert = !open;
    fold.setAttribute("aria-hidden", String(!open));
  }
  toggle.tabIndex = open ? -1 : 0;
  toggle.setAttribute("role", open ? "presentation" : "button");
  toggle.setAttribute("aria-expanded", String(open));
  if (slot.kind === "text") paintTextHeadline(toggle, slot, open, focus);
}

function slotHead(slot: Slot, open: boolean): HTMLElement {
  const head = document.createElement("div");
  head.className = "slot-head";
  const toggle = document.createElement("div");
  toggle.className = "slot-toggle";
  toggle.tabIndex = open ? -1 : 0;
  toggle.setAttribute("role", open ? "presentation" : "button");
  toggle.setAttribute("aria-expanded", String(open));

  if (slot.kind === "text") {
    paintTextHeadline(toggle, slot, open, H.focusSlotId === slot.id);
  } else {
    const mark = document.createElement("span");
    mark.className = "slot-mark";
    if (slot.youtube) {
      mark.classList.add("slot-mark--image");
      mark.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z"/></svg>`;
    } else if (slot.video) {
      mark.classList.add("slot-mark--image");
      mark.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 10.5V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3.5l4 4v-11l-4 4z"/></svg>`;
    } else if (slot.emoji) {
      mark.textContent = slot.emoji;
    } else if (H.uploadedShape(slot)) {
      mark.classList.add("slot-mark--image");
      mark.innerHTML = isSvgSource(slot) ? fileSvg : imageIcon;
    } else if (slot.src) {
      mark.append(H.shapeSwatch(H.iconSrc(slot), H.iconPreviewFill(slot)));
    }
    const title = document.createElement("span");
    title.className = "slot-title";
    const named = Boolean(slot.youtube || slot.video || slot.emoji || slot.src);
    title.textContent = named ? slot.name : "Empty";
    if (!named) title.classList.add("is-empty");
    else title.dataset.tip = slot.name;
    toggle.append(mark, title);
  }

  const toggleOpen = (focus: boolean) => {
    const open = !H.openSlots.has(slot.id);
    setSlotOpen(toggle, slot, open, focus);
    playTransition(open);
    if (open) H.showPick(slot.id);
  };
  toggle.addEventListener("click", (event) => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.shiftKey) {
      H.pickSlot(slot.id, { additive: true, force: true });
      return;
    }
    toggleOpen(true);
  });
  toggle.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleOpen(true);
  });

  const duplicate = document.createElement("button");
  duplicate.type = "button";
  duplicate.className = "ghost icon-btn icon-hover";
  duplicate.setAttribute("aria-label", "Duplicate");
  duplicate.dataset.tip = "Duplicate this piece — Shift+D";
  duplicate.innerHTML = DUPLICATE_ICON;
  duplicate.addEventListener("click", () => H.duplicateSlot(slot.id));

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "ghost icon-btn icon-hover";
  remove.dataset.remove = "";
  remove.setAttribute("aria-label", "Remove");
  remove.dataset.tip = "Remove this piece";
  remove.innerHTML = `<span aria-hidden="true">✕</span>`;
  remove.addEventListener("click", () => H.removeSlot(slot.id));
  head.append(toggle, duplicate, remove);
  return head;
}

function typefaceHasItalic(family: string): boolean {
  const bundled = bundledHasItalic(family);
  if (bundled !== undefined) return bundled;
  return localHasItalic(family) !== false;
}

function formatBtn(opts: {
  on: boolean;
  tip: string;
  attrs: string;
  icon: string;
  disabled?: boolean;
}): string {
  const tip = H.escapeAttr(opts.tip);
  return `<button type="button" class="icon-btn icon-hover text-format__btn${opts.on ? " is-on" : ""}"${opts.disabled ? " disabled" : ""} ${opts.attrs} aria-label="${tip}" aria-pressed="${opts.on}" data-tip="${tip}"><span aria-hidden="true">${opts.icon}</span></button>`;
}

function paintItalicBtn(btn: HTMLButtonElement, slot: TextSlot) {
  const ok = typefaceHasItalic(slot.fontFamily);
  if (!ok) slot.italic = undefined;
  const on = Boolean(slot.italic);
  const tip = ok ? "Italic" : "Italic isn't available in this typeface";
  btn.disabled = !ok;
  btn.classList.toggle("is-on", on);
  btn.setAttribute("aria-pressed", String(on));
  btn.setAttribute("aria-label", tip);
  btn.dataset.tip = tip;
}

function textFields(slot: TextSlot, open: boolean): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "slot-body";
  wrap.append(slotHead(slot, open));
  const editor = document.createElement("div");
  editor.className = "slot-editor";
  slot.fontWeight = H.chosenWeight(slot.fontFamily, slot.fontWeight);
  const field = isTextField(slot);
  const align = textAlignOf(slot);
  const bold = slot.fontWeight >= 600;
  const italicOk = typefaceHasItalic(slot.fontFamily);
  const words = textFieldWordCount(slot.text);
  const formatRow = field
    ? `<div class="text-compose">
        <textarea class="slot-live slot-live--field" data-text-field rows="5" aria-label="Text" placeholder="${H.escapeAttr(TEXT_FIELD_STARTER)}">${H.escapeAttr(slot.text)}</textarea>
        <p class="text-field-count">${words} / ${TEXT_FIELD_WORD_MAX} words</p>
        <div class="text-format" role="group" aria-label="Text formatting">
          ${formatBtn({ on: bold, tip: "Bold", attrs: "data-text-bold", icon: textB })}
          ${formatBtn({
            on: Boolean(slot.italic) && italicOk,
            tip: italicOk ? "Italic" : "Italic isn't available in this typeface",
            attrs: "data-text-italic",
            icon: textItalic,
            disabled: !italicOk,
          })}
          <span class="text-format__gap" aria-hidden="true"></span>
          ${formatBtn({ on: align === "left", tip: "Align left", attrs: 'data-text-align="left"', icon: textAlignLeft })}
          ${formatBtn({ on: align === "center", tip: "Align center", attrs: 'data-text-align="center"', icon: textAlignCenter })}
          ${formatBtn({ on: align === "right", tip: "Align right", attrs: 'data-text-align="right"', icon: textAlignRight })}
        </div>
      </div>`
    : "";
  const textHeightField = `<label class="field" data-tip="${TIPS.textHeight}">${H.settingLabel(slot, "Text height", "textHeight", String(slot.textHeight))}
        <input type="range" data-key="textHeight" min="0" max="100" step="1" value="${slot.textHeight}" />
      </label>`;
  editor.innerHTML = `
    <div class="slot-group">
      <p class="slot-label">Text</p>
      ${formatRow}
      <div class="row">
        <div class="field" data-tip="${TIPS.typeface}">${H.settingLabel(slot, "Typeface", "fontFamily")}
          <div class="font-pick" data-font-pick></div>
        </div>
        <div class="field" data-tip="${TIPS.weight}">${H.settingLabel(slot, "Weight", "fontWeight")}
          <div class="font-pick" data-weight-pick></div>
        </div>
      </div>
      <label class="field" data-tip="${TIPS.textScale}">${H.settingLabel(slot, "Text scale", "scale", slot.scale.toFixed(2))}
        <input type="range" data-key="scale" min="0.1" max="${H.slotScaleSliderMax(slot)}" step="0.05" value="${slot.scale}" />
      </label>
      ${field ? "" : textHeightField}
      <label class="field" data-tip="${TIPS.tracking}">${H.settingLabel(slot, "Letter spacing", "tracking", String(trackingOf(slot, H.state.textTracking)))}
        <input type="range" data-key="tracking" min="-400" max="500" step="1" value="${trackingOf(slot, H.state.textTracking)}" />
      </label>
      ${
        field
          ? `<label class="field" data-tip="${TIPS.lineHeight}">${H.settingLabel(slot, "Line height", "lineHeight", textFieldLineHeight(slot).toFixed(2))}
        <input type="range" data-key="lineHeight" min="0" max="100" step="1" value="${lineHeightSliderOf(slot)}" />
      </label>
      ${textHeightField}`
          : ""
      }
      ${
        slot.shape !== "none"
          ? `<div class="field" data-tip="${TIPS.textColor}">${H.settingLabel(slot, "Text color", "textColor")}
        ${H.textTintRow(slot)}
      </div>`
          : ""
      }
    </div>
    <div class="slot-group">
      <p class="slot-label">Shape</p>
      ${
        slot.shape !== "none"
          ? `<label class="field" data-tip="${TIPS.pillPad}">${H.settingLabel(slot, "Shape padding", "pillPad", String(pillPadOf(slot, H.state.pillPad)))}
        <input type="range" data-key="pillPad" min="0" max="100" step="1" value="${pillPadOf(slot, H.state.pillPad)}" />
      </label>`
          : ""
      }
      <div class="row">
        <label class="field" data-tip="${TIPS.shape}">${H.settingLabel(slot, "Holding shape", "shape")}
          <select data-key="shape">
            <option value="none" ${slot.shape === "none" ? "selected" : ""}>None</option>
            <option value="pill" ${slot.shape === "pill" ? "selected" : ""}${field ? " disabled" : ""}>Pill</option>
            <option value="box" ${slot.shape === "box" ? "selected" : ""}>Box</option>
          </select>
        </label>
        <label class="field${slot.shape !== "box" ? " is-muted" : ""}" data-tip="${TIPS.radius}">${H.settingLabel(slot, "Corner radius", "radius")}
          <input type="range" data-key="radius" min="0" max="40" value="${slot.radius}" ${slot.shape !== "box" ? "disabled" : ""} />
        </label>
      </div>
      ${
        slot.shape !== "none"
          ? `<div class="check-row" data-tip="${TIPS.stroked}">
        <label class="check">
          ${checkInput(`data-key="stroked" ${slot.stroked ? "checked" : ""}`)}
          Stroked
        </label>
        ${H.resetControl("Stroked", "stroked", H.fieldDirty(slot, "stroked"))}
      </div>
      ${slot.stroked ? `<label class="field" data-tip="${TIPS.stroke}">${H.settingLabel(slot, "Stroke", "stroke", String(slot.stroke))}
        <input type="range" data-key="stroke" min="1" max="16" step="1" value="${slot.stroke}" />
      </label>` : ""}`
          : ""
      }
      <div class="check-row" data-tip="${TIPS.gradient}">
        <label class="check">
          ${checkInput(`data-key="gradient" ${slot.gradient ? "checked" : ""}`)}
          Gradient
        </label>
        ${H.resetControl("Gradient", "gradient", H.fieldDirty(slot, "gradient"))}
      </div>
      <div class="field" data-tip="${TIPS.color}">${H.settingLabel(slot, slot.gradient ? "Start color" : slot.shape === "none" ? "Color" : "Shape color", "color")}
        ${H.tintRow(slot, slot.shape === "none" ? "Color" : "Shape color")}
      </div>
      ${
        slot.gradient
          ? `<div class="field" data-tip="${TIPS.endColor}">${H.settingLabel(slot, "End color", "gradientColor")}
        ${H.gradientTintRow(slot)}
      </div>
      <label class="field" data-tip="${TIPS.gradAngle}">${H.settingLabel(slot, "Gradient angle", "gradientAngle", String(gradientAngleOf(slot.gradientAngle)))}
        <input type="range" data-key="gradientAngle" min="0" max="360" step="1" value="${gradientAngleOf(slot.gradientAngle)}" />
      </label>
      <label class="field" data-tip="${TIPS.gradScale}">${H.settingLabel(slot, "Gradient scale", "gradientScale", String(gradientScaleOf(slot.gradientScale)))}
        <input type="range" data-key="gradientScale" min="1" max="100" step="1" value="${gradientScaleOf(slot.gradientScale)}" />
      </label>`
          : ""
      }
      ${H.blendField(slot)}
      ${H.dropShadowField(slot)}
    </div>
    ${
      field && !slot.gradient
        ? ""
        : `<div class="slot-group">
      <div class="slot-group-head">
        <p class="slot-label">Animation</p>
        <button type="button" class="section-reset icon-hover${H.assetAnimsFrozen ? " is-on" : ""}" data-freeze-anims aria-pressed="${H.assetAnimsFrozen}" aria-label="${H.assetAnimsFrozen ? "Resume animations" : "Pause animations"}" data-tip="${H.assetAnimsFrozen ? "Resume text and gradient animations" : "Freeze text and gradient animations on all assets"}">${H.assetAnimsFrozen ? playIcon : pauseIcon}</button>
      </div>
      ${
        field
          ? ""
          : `<div class="check-row">
        <label class="check" data-tip="${slot.animatedGradient ? TIPS.textAnimOff : TIPS.textAnim}">
          ${checkInput(`data-key="textAnim" ${slot.textAnim ? "checked" : ""} ${slot.animatedGradient ? "disabled" : ""}`)}
          Text animation
        </label>
        ${H.resetControl("Text animation", "textAnim", H.fieldDirty(slot, "textAnim"))}
      </div>
      ${
        slot.textAnim
          ? `<label class="field" data-tip="${TIPS.textAnimSpeed}">${H.settingLabel(slot, "Text anim speed", "textAnimSpeed", String(textAnimSpeedOf(slot.textAnimSpeed)))}
        <input type="range" data-key="textAnimSpeed" min="1" max="100" step="1" value="${textAnimSpeedOf(slot.textAnimSpeed)}" />
      </label>`
          : ""
      }`
      }
      ${
        slot.gradient
          ? `<div class="check-row">
        <label class="check" data-tip="${!field && slot.textAnim ? TIPS.gradAnimOff : TIPS.gradAnim}">
          ${checkInput(`data-key="animatedGradient" ${slot.animatedGradient ? "checked" : ""} ${!field && slot.textAnim ? "disabled" : ""}`)}
          Animated Gradient
        </label>
        ${H.resetControl("Animated Gradient", "animatedGradient", H.fieldDirty(slot, "animatedGradient"))}
      </div>
      ${
        slot.animatedGradient
          ? `<label class="field" data-tip="${TIPS.gradSpeed}">${H.settingLabel(slot, "Animation speed", "gradientSpeed", String(gradientSpeedOf(slot.gradientSpeed)))}
        <input type="range" data-key="gradientSpeed" min="1" max="100" step="1" value="${gradientSpeedOf(slot.gradientSpeed)}" />
      </label>`
          : ""
      }`
          : ""
      }
    </div>`
    }
    ${H.attractorField(slot)}
  `;
  placeFold(wrap, editor, open);

  const weightHost = editor.querySelector<HTMLElement>("[data-weight-pick]");
  const weightPick = weightHost
    ? H.mountWeightPick(weightHost, slot.fontFamily, slot.fontWeight, (weight) => {
        H.remember();
        slot.fontWeight = weight;
        H.reflectGlobalWeight();
        H.paintFieldReset(editor, slot, "fontWeight");
        void H.settleFont(slot.fontFamily, weight).then(() => H.liveChip(slot.id));
      })
    : null;

  const fontPick = editor.querySelector<HTMLElement>("[data-font-pick]");
  if (fontPick) {
    H.mountFontPick(fontPick, slot.fontFamily, (family) => {
      H.remember();
      slot.fontFamily = family;
      if (weightPick) slot.fontWeight = weightPick.setFamily(family);
      const italicBtn = editor.querySelector<HTMLButtonElement>("[data-text-italic]");
      if (italicBtn) paintItalicBtn(italicBtn, slot);
      H.reflectGlobalWeight();
      H.paintFieldReset(editor, slot, "fontFamily");
      H.paintFieldReset(editor, slot, "fontWeight");
      void H.settleFont(family, slot.fontWeight).then(() => H.liveChip(slot.id));
    });
  }
  H.bindSlotInputs(editor, slot);
  H.bindTint(editor, slot);
  H.bindFreezeAnims(editor);
  const fieldInput = editor.querySelector<HTMLTextAreaElement>("[data-text-field]");
  if (fieldInput) {
    fieldInput.addEventListener("input", () => {
      H.remember(`text:${slot.id}`);
      const next = clampTextFieldWords(fieldInput.value);
      if (next !== fieldInput.value) fieldInput.value = next;
      slot.text = next;
      const count = editor.querySelector(".text-field-count");
      if (count) count.textContent = `${textFieldWordCount(next)} / ${TEXT_FIELD_WORD_MAX} words`;
      const title = wrap.querySelector(".slot-title");
      if (title) {
        title.textContent = textFieldHeadline(slot);
        title.classList.toggle("is-empty", !next.trim());
      }
      H.live();
    });
    fieldInput.addEventListener("blur", () => {
      if (H.pointerHeld) return;
      if (H.gesture === `text:${slot.id}`) H.endGesture();
    });
  }
  editor.querySelector("[data-text-bold]")?.addEventListener("click", () => {
    H.remember();
    slot.fontWeight = slot.fontWeight >= 600 ? H.chosenWeight(slot.fontFamily, 400) : H.chosenWeight(slot.fontFamily, 700);
    H.reflectGlobalWeight();
    H.renderPanel();
    void H.settleFont(slot.fontFamily, slot.fontWeight).then(() => H.liveChip(slot.id));
  });
  editor.querySelector("[data-text-italic]")?.addEventListener("click", () => {
    H.remember();
    slot.italic = !slot.italic || undefined;
    H.liveChip(slot.id);
    H.renderPanel();
  });
  editor.querySelectorAll<HTMLButtonElement>("[data-text-align]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.dataset.textAlign;
      if (next !== "left" && next !== "center" && next !== "right") return;
      H.remember();
      slot.align = next;
      H.liveChip(slot.id);
      H.renderPanel();
    });
  });
  return wrap;
}

function imageFields(slot: ImageSlot, open: boolean): HTMLElement {
  return slot.emoji ? emojiFields(slot, open) : shapeFields(slot, open);
}

function shapeFields(slot: ImageSlot, open: boolean): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "slot-body";
  wrap.append(slotHead(slot, open));
  const editor = document.createElement("div");
  editor.className = "slot-editor";
  editor.innerHTML = `
    <div class="pick-now">${pickPreview(slot)}${H.resetControl("Shape", "icon", H.fieldDirty(slot, "icon"))}</div>
    <p class="slot-label">Shapes</p>
    <div class="icon-grid" data-presets></div>
    <div class="field" data-tip="${TIPS.color}">${H.settingLabel(slot, slot.gradient && H.iconCanGradient(slot) ? "Start color" : "Color", "color")}
      ${H.tintRow(slot)}
    </div>
    ${
      H.iconCanGradient(slot)
        ? `<div class="check-row" data-tip="${TIPS.gradient}">
      <label class="check">
        ${checkInput(`data-key="gradient" ${slot.gradient ? "checked" : ""}`)}
        Gradient
      </label>
      ${H.resetControl("Gradient", "gradient", H.fieldDirty(slot, "gradient"))}
    </div>
    ${
      slot.gradient
        ? `<div class="field" data-tip="${TIPS.endColor}">${H.settingLabel(slot, "End color", "gradientColor")}
      ${H.gradientTintRow(slot)}
    </div>
    <label class="field" data-tip="${TIPS.gradAngle}">${H.settingLabel(slot, "Gradient angle", "gradientAngle", String(gradientAngleOf(slot.gradientAngle)))}
      <input type="range" data-key="gradientAngle" min="0" max="360" step="1" value="${gradientAngleOf(slot.gradientAngle)}" />
    </label>
    <label class="field" data-tip="${TIPS.gradScale}">${H.settingLabel(slot, "Gradient scale", "gradientScale", String(gradientScaleOf(slot.gradientScale)))}
      <input type="range" data-key="gradientScale" min="1" max="100" step="1" value="${gradientScaleOf(slot.gradientScale)}" />
    </label>
    <div class="check-row" data-tip="${TIPS.gradAnim}">
      <label class="check">
        ${checkInput(`data-key="animatedGradient" ${slot.animatedGradient ? "checked" : ""}`)}
        Animated Gradient
      </label>
      ${H.resetControl("Animated Gradient", "animatedGradient", H.fieldDirty(slot, "animatedGradient"))}
    </div>
    ${
      slot.animatedGradient
        ? `<label class="field" data-tip="${TIPS.gradSpeed}">${H.settingLabel(slot, "Animation speed", "gradientSpeed", String(gradientSpeedOf(slot.gradientSpeed)))}
      <input type="range" data-key="gradientSpeed" min="1" max="100" step="1" value="${gradientSpeedOf(slot.gradientSpeed)}" />
    </label>`
        : ""
    }`
        : ""
    }`
        : ""
    }
    ${H.blendField(slot)}
    ${H.dropShadowField(slot)}
    <label class="field" data-tip="${TIPS.shapeScale}">${H.settingLabel(slot, "Shape scale", "scale", slot.scale.toFixed(2))}
      <input type="range" data-key="scale" min="0.1" max="${H.slotScaleSliderMax(slot)}" step="0.05" value="${slot.scale}" />
    </label>
    <label class="field" data-tip="${TIPS.amount}">${H.settingLabel(slot, "Amount", "amount", String(slot.amount))}
      <input type="range" data-key="amount" min="1" max="${H.AMOUNT_SOFT_CAP}" value="${slot.amount}" />
    </label>
    ${H.attractorField(slot)}
  `;
  placeFold(wrap, editor, open);

  const grid = editor.querySelector("[data-presets]")!;
  const swatchColor = H.iconPreviewFill(slot);
  for (const icon of ICON_PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.tip = icon.label;
    btn.className = slot.src === icon.src ? "is-on" : "";
    btn.setAttribute("aria-pressed", String(slot.src === icon.src));
    btn.append(H.shapeSwatch(icon.src, swatchColor));
    btn.addEventListener("click", () => {
      H.remember();
      slot.src = icon.src;
      slot.name = icon.label;
      slot.emoji = undefined;
      slot.collider = undefined;
      slot.radius = 0;
      H.renderPanel();
      H.live();
    });
    grid.append(btn);
  }

  H.bindTint(editor, slot);
  H.bindSlotInputs(editor, slot);
  return wrap;
}

function emojiFields(slot: ImageSlot, open: boolean): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "slot-body";
  wrap.append(slotHead(slot, open));
  const editor = document.createElement("div");
  editor.className = "slot-editor";
  editor.innerHTML = `
    <div class="pick-now">${pickPreview(slot)}${H.resetControl("Emoji", "icon", H.fieldDirty(slot, "icon"))}</div>
    <p class="slot-label">Emoji</p>
    <div class="emoji-grid" data-emoji-featured></div>
    <label class="field" data-tip="${TIPS.emojiSearch}">Search emoji
      <input type="search" data-emoji-search placeholder="heart, fire, cat…" />
    </label>
    <div class="emoji-grid" data-emoji-results></div>
    ${H.blendField(slot)}
    ${H.dropShadowField(slot)}
    <label class="field" data-tip="${TIPS.shapeScale}">${H.settingLabel(slot, "Shape scale", "scale", slot.scale.toFixed(2))}
      <input type="range" data-key="scale" min="0.1" max="${H.slotScaleSliderMax(slot)}" step="0.05" value="${slot.scale}" />
    </label>
    <label class="field" data-tip="${TIPS.amount}">${H.settingLabel(slot, "Amount", "amount", String(slot.amount))}
      <input type="range" data-key="amount" min="1" max="${H.AMOUNT_SOFT_CAP}" value="${slot.amount}" />
    </label>
    ${H.attractorField(slot)}
  `;
  placeFold(wrap, editor, open);

  const pickEmoji = (item: EmojiItem) => {
    H.remember();
    slot.emoji = item.char;
    slot.name = item.name;
    slot.src = "";
    slot.collider = undefined;
    slot.radius = 0;
    H.renderPanel();
    H.live();
  };

  const featured = wrap.querySelector("[data-emoji-featured]")!;
  for (const item of FEATURED_EMOJI) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.tip = item.name;
    btn.className = slot.emoji === item.char ? "is-on" : "";
    btn.setAttribute("aria-pressed", String(slot.emoji === item.char));
    const glyph = document.createElement("span");
    glyph.className = "emoji-glyph";
    glyph.textContent = item.char;
    btn.append(glyph);
    btn.addEventListener("click", () => pickEmoji(item));
    featured.append(btn);
  }

  const results = wrap.querySelector("[data-emoji-results]")!;
  const paintResults = (items: EmojiItem[]) => {
    results.replaceChildren();
    for (const item of items) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.tip = item.name;
      btn.className = slot.emoji === item.char ? "is-on" : "";
      btn.setAttribute("aria-pressed", String(slot.emoji === item.char));
      const glyph = document.createElement("span");
      glyph.className = "emoji-glyph";
      glyph.textContent = item.char;
      btn.append(glyph);
      btn.addEventListener("click", () => pickEmoji(item));
      results.append(btn);
    }
  };

  wrap.querySelector<HTMLInputElement>("[data-emoji-search]")?.addEventListener("input", (e) => {
    paintResults(searchEmoji((e.target as HTMLInputElement).value));
  });

  H.bindSlotInputs(editor, slot);
  return wrap;
}

function youtubeFields(slot: ImageSlot, open: boolean): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "slot-body";
  wrap.append(slotHead(slot, open));
  const editor = document.createElement("div");
  editor.className = "slot-editor";
  const loopSec = slot.youtube?.loopSec ?? 10;
  editor.innerHTML = `
    <label class="field" data-tip="${TIPS.loopSec}">${H.settingLabel(slot, "Loop length", "loopSec", `${loopSec}s`)}
      <input type="range" data-youtube-loop min="${YOUTUBE_LOOP_MIN}" max="${YOUTUBE_LOOP_MAX}" step="1" value="${loopSec}" />
    </label>
    <div class="check-row" data-tip="${TIPS.stroked}">
      <label class="check">
        ${checkInput(`data-key="stroked" ${slot.stroked ? "checked" : ""}`)}
        Stroked
      </label>
      ${H.resetControl("Stroked", "stroked", H.fieldDirty(slot, "stroked"))}
    </div>
    ${
      slot.stroked
        ? `<label class="field" data-tip="${TIPS.stroke}">${H.settingLabel(slot, "Stroke", "stroke", String(slot.stroke ?? 4))}
      <input type="range" data-key="stroke" min="1" max="16" step="1" value="${slot.stroke ?? 4}" />
    </label>
    <div class="field" data-tip="${TIPS.strokeColor}">${H.settingLabel(slot, "Stroke color", "color")}
      ${H.tintRow(slot, "Stroke color")}
    </div>`
        : ""
    }
    <label class="field" data-tip="${TIPS.radius}">${H.settingLabel(slot, "Corner radius", "radius", String(Math.round(slot.radius ?? 0)))}
      <input type="range" data-key="radius" min="0" max="40" step="1" value="${slot.radius ?? 0}" />
    </label>
    <label class="field" data-tip="${TIPS.clipScale}">${H.settingLabel(slot, "Clip scale", "scale", slot.scale.toFixed(2))}
      <input type="range" data-key="scale" min="0.1" max="${H.slotScaleSliderMax(slot)}" step="0.05" value="${slot.scale}" />
    </label>
    ${H.attractorField(slot)}
  `;
  placeFold(wrap, editor, open);

  const loopInput = editor.querySelector<HTMLInputElement>("[data-youtube-loop]");
  loopInput?.addEventListener("input", () => {
    if (!slot.youtube || !loopInput) return;
    H.remember(`slot:${slot.id}:loopSec`);
    const next = Math.max(YOUTUBE_LOOP_MIN, Math.min(YOUTUBE_LOOP_MAX, Math.round(Number(loopInput.value))));
    slot.youtube = { ...slot.youtube, loopSec: next };
    const min = Number(loopInput.min) || 0;
    const max = Number(loopInput.max) || 100;
    loopInput.style.setProperty("--pct", `${((next - min) / (max - min || 1)) * 100}%`);
    const caption = loopInput.closest("label")?.querySelector("[data-range-label]");
    if (caption) setRangeCaptionValue(caption, `${next}s`);
    H.live();
  });
  if (loopInput) {
    const min = Number(loopInput.min) || 0;
    const max = Number(loopInput.max) || 100;
    loopInput.style.setProperty("--pct", `${((Number(loopInput.value) - min) / (max - min || 1)) * 100}%`);
  }

  if (slot.stroked) H.bindTint(editor, slot);
  H.bindSlotInputs(editor, slot);
  return wrap;
}

function videoFields(slot: ImageSlot, open: boolean): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "slot-body";
  wrap.append(slotHead(slot, open));
  const editor = document.createElement("div");
  editor.className = "slot-editor";
  editor.innerHTML = `
    <div class="check-row" data-tip="${TIPS.stroked}">
      <label class="check">
        ${checkInput(`data-key="stroked" ${slot.stroked ? "checked" : ""}`)}
        Stroked
      </label>
      ${H.resetControl("Stroked", "stroked", H.fieldDirty(slot, "stroked"))}
    </div>
    ${
      slot.stroked
        ? `<label class="field" data-tip="${TIPS.stroke}">${H.settingLabel(slot, "Stroke", "stroke", String(slot.stroke ?? 4))}
      <input type="range" data-key="stroke" min="1" max="16" step="1" value="${slot.stroke ?? 4}" />
    </label>
    <div class="field" data-tip="${TIPS.strokeColor}">${H.settingLabel(slot, "Stroke color", "color")}
      ${H.tintRow(slot, "Stroke color")}
    </div>`
        : ""
    }
    <label class="field" data-tip="${TIPS.radius}">${H.settingLabel(slot, "Corner radius", "radius", String(Math.round(slot.radius ?? 0)))}
      <input type="range" data-key="radius" min="0" max="40" step="1" value="${slot.radius ?? 0}" />
    </label>
    <label class="field" data-tip="${TIPS.clipScale}">${H.settingLabel(slot, "Clip scale", "scale", slot.scale.toFixed(2))}
      <input type="range" data-key="scale" min="0.1" max="${H.slotScaleSliderMax(slot)}" step="0.05" value="${slot.scale}" />
    </label>
    ${videoReplaceControl(slot)}
    ${H.attractorField(slot)}
  `;
  placeFold(wrap, editor, open);

  if (slot.stroked) H.bindTint(editor, slot);
  editor.querySelector<HTMLInputElement>("[data-file]")?.addEventListener("change", (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !H.isMediaFile(file)) return;
    H.remember();
    playCreate();
    // Show loader on canvas while a heavy replacement buffers.
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
  H.bindSlotInputs(editor, slot);
  return wrap;
}

function photoFields(slot: ImageSlot, open: boolean): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "slot-body";
  wrap.append(slotHead(slot, open));
  const editor = document.createElement("div");
  editor.className = "slot-editor";
  const svgUpload = isSvgSource(slot);
  const canTint = H.iconCanGradient(slot);
  editor.innerHTML = `
    ${
      svgUpload
        ? `<div class="check-row" data-tip="${TIPS.recolor}">
      <label class="check">
        ${checkInput(`data-key="tint" ${slot.tint ? "checked" : ""}`)}
        Recolor
      </label>
      ${H.resetControl("Recolor", "tint", H.fieldDirty(slot, "tint"))}
    </div>`
        : ""
    }
    ${
      canTint
        ? `<div class="field" data-tip="${TIPS.color}">${H.settingLabel(slot, slot.gradient ? "Start color" : "Color", "color")}
      ${H.tintRow(slot)}
    </div>
    <div class="check-row" data-tip="${TIPS.gradient}">
      <label class="check">
        ${checkInput(`data-key="gradient" ${slot.gradient ? "checked" : ""}`)}
        Gradient
      </label>
      ${H.resetControl("Gradient", "gradient", H.fieldDirty(slot, "gradient"))}
    </div>
    ${
      slot.gradient
        ? `<div class="field" data-tip="${TIPS.endColor}">${H.settingLabel(slot, "End color", "gradientColor")}
      ${H.gradientTintRow(slot)}
    </div>
    <label class="field" data-tip="${TIPS.gradAngle}">${H.settingLabel(slot, "Gradient angle", "gradientAngle", String(gradientAngleOf(slot.gradientAngle)))}
      <input type="range" data-key="gradientAngle" min="0" max="360" step="1" value="${gradientAngleOf(slot.gradientAngle)}" />
    </label>
    <label class="field" data-tip="${TIPS.gradScale}">${H.settingLabel(slot, "Gradient scale", "gradientScale", String(gradientScaleOf(slot.gradientScale)))}
      <input type="range" data-key="gradientScale" min="1" max="100" step="1" value="${gradientScaleOf(slot.gradientScale)}" />
    </label>
    <div class="check-row" data-tip="${TIPS.gradAnim}">
      <label class="check">
        ${checkInput(`data-key="animatedGradient" ${slot.animatedGradient ? "checked" : ""}`)}
        Animated Gradient
      </label>
      ${H.resetControl("Animated Gradient", "animatedGradient", H.fieldDirty(slot, "animatedGradient"))}
    </div>
    ${
      slot.animatedGradient
        ? `<label class="field" data-tip="${TIPS.gradSpeed}">${H.settingLabel(slot, "Animation speed", "gradientSpeed", String(gradientSpeedOf(slot.gradientSpeed)))}
      <input type="range" data-key="gradientSpeed" min="1" max="100" step="1" value="${gradientSpeedOf(slot.gradientSpeed)}" />
    </label>`
        : ""
    }`
        : ""
    }`
        : ""
    }
    ${H.blendField(slot)}
    ${photoReplaceControl(slot)}
    <label class="field" data-tip="${TIPS.collider}">${H.settingLabel(slot, "Collision", "collider")}
      <select data-key="collider">
        ${IMAGE_COLLIDERS.map((icon) => `<option value="${icon.id}"${H.colliderOf(slot) === icon.id ? " selected" : ""}>${icon.label}</option>`).join("")}
      </select>
    </label>
    ${
      H.isRasterUpload(slot)
        ? `<div class="check-row" data-tip="${TIPS.stroked}">
      <label class="check">
        ${checkInput(`data-key="stroked" ${slot.stroked ? "checked" : ""}`)}
        Stroked
      </label>
      ${H.resetControl("Stroked", "stroked", H.fieldDirty(slot, "stroked"))}
    </div>
    ${
      slot.stroked
        ? `<label class="field" data-tip="${TIPS.stroke}">${H.settingLabel(slot, "Stroke", "stroke", String(slot.stroke ?? 4))}
      <input type="range" data-key="stroke" min="1" max="16" step="1" value="${slot.stroke ?? 4}" />
    </label>
    <div class="field" data-tip="${TIPS.strokeColor}">${H.settingLabel(slot, "Stroke color", "color")}
      ${H.tintRow(slot, "Stroke color")}
    </div>`
        : ""
    }
    ${H.dropShadowField(slot)}
    <label class="field" data-tip="${TIPS.radius}">${H.settingLabel(slot, "Corner radius", "radius", String(Math.round(slot.radius ?? 0)))}
      <input type="range" data-key="radius" min="0" max="40" step="1" value="${slot.radius ?? 0}" />
    </label>
    <label class="field" data-tip="${TIPS.shapeScale}">${H.settingLabel(slot, "Image scale", "scale", slot.scale.toFixed(2))}
      <input type="range" data-key="scale" min="0.1" max="${H.slotScaleSliderMax(slot)}" step="0.05" value="${slot.scale}" />
    </label>
    <label class="field" data-tip="${TIPS.amount}">${H.settingLabel(slot, "Amount", "amount", String(slot.amount))}
      <input type="range" data-key="amount" min="1" max="${H.AMOUNT_SOFT_CAP}" value="${slot.amount}" />
    </label>
    <div class="slot-group slot-group--ruled">
      <label class="field" data-tip="Brighten or darken this image">${H.settingLabel(slot, "Exposure", "exposure", String(imageExposureOf(slot.exposure)))}
        <input type="range" data-key="exposure" min="-100" max="100" step="1" value="${imageExposureOf(slot.exposure)}" />
      </label>
      <label class="field" data-tip="Boost or flatten tonal range">${H.settingLabel(slot, "Contrast", "contrast", String(imageContrastOf(slot.contrast)))}
        <input type="range" data-key="contrast" min="-100" max="100" step="1" value="${imageContrastOf(slot.contrast)}" />
      </label>
      <label class="field" data-tip="Color intensity for this image">${H.settingLabel(slot, "Saturation", "saturation", String(imageSaturationOf(slot.saturation)))}
        <input type="range" data-key="saturation" min="-100" max="100" step="1" value="${imageSaturationOf(slot.saturation)}" />
      </label>
      <label class="field field--temperature" data-tip="Warm or cool this image (Kelvin)">${H.settingLabel(slot, "Temperature", "temperature", imageTemperatureLabel(imageTemperatureOf(slot.temperature)))}
        <input type="range" data-key="temperature" min="${IMAGE_TEMPERATURE_MIN_K}" max="${IMAGE_TEMPERATURE_MAX_K}" step="${IMAGE_TEMPERATURE_STEP_K}" value="${imageTemperatureOf(slot.temperature)}" />
      </label>
      <label class="field" data-tip="Shift colors around the wheel">${H.settingLabel(slot, "Hue", "hue", `${imageHueOf(slot.hue)}°`)}
        <input type="range" data-key="hue" min="-180" max="180" step="1" value="${imageHueOf(slot.hue)}" />
      </label>
    </div>`
        : `${H.dropShadowField(slot)}
    <label class="field" data-tip="${TIPS.shapeScale}">${H.settingLabel(slot, "Image scale", "scale", slot.scale.toFixed(2))}
      <input type="range" data-key="scale" min="0.1" max="${H.slotScaleSliderMax(slot)}" step="0.05" value="${slot.scale}" />
    </label>
    <label class="field" data-tip="${TIPS.amount}">${H.settingLabel(slot, "Amount", "amount", String(slot.amount))}
      <input type="range" data-key="amount" min="1" max="${H.AMOUNT_SOFT_CAP}" value="${slot.amount}" />
    </label>`
    }
    ${H.attractorField(slot)}
  `;
  placeFold(wrap, editor, open);

  if (canTint || (H.isRasterUpload(slot) && slot.stroked)) H.bindTint(editor, slot);
  editor.querySelector<HTMLInputElement>("[data-file]")?.addEventListener("change", (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !H.isMediaFile(file)) return;
    H.remember();
    playCreate();
    const job = H.isVideoFile(file) ? H.assignVideoFile(slot, file) : H.assignImageFile(slot, file);
    void job.then(() => {
      H.renderPanel();
      H.live();
    });
  });
  H.bindSlotInputs(editor, slot);
  return wrap;
}

function placeFold(wrap: HTMLElement, editor: HTMLElement, open: boolean) {
  const fold = document.createElement("div");
  fold.className = "slot-fold";
  if (!open) {
    fold.inert = true;
    fold.setAttribute("aria-hidden", "true");
  }
  const clip = document.createElement("div");
  clip.className = "slot-fold-clip";
  clip.append(editor);
  fold.append(clip);
  wrap.append(fold);
}

function pickPreview(slot: ImageSlot): string {
  const label = (body: string) =>
    `<span class="pick-now__label" data-tip="${H.escapeAttr(slot.name)}">${body}</span>`;
  if (slot.emoji) {
    return `<span class="pick-glyph">${slot.emoji}</span>${label(`Selected <b>${H.escapeAttr(slot.name)}</b>`)}`;
  }
  if (slot.src && isColorMask(slot)) {
    const color = H.iconPreviewFill(slot);
    const src = H.iconSrc(slot);
    return `<span class="pick-glyph shape-swatch" style="background:${color};-webkit-mask-image:url(&quot;${src}&quot;);mask-image:url(&quot;${src}&quot;)"></span>${label(`Selected <b>${H.escapeAttr(slot.name)}</b>`)}`;
  }
  if (slot.src) {
    return `<img class="pick-glyph" src="${H.iconSrc(slot)}" alt="" />${label(`Selected <b>${H.escapeAttr(slot.name)}</b>`)}`;
  }
  return `<span class="pick-empty">Nothing selected</span>`;
}

function photoReplaceControl(slot: ImageSlot): string {
  const src = H.iconSrc(slot);
  return `<label class="field file-replace" data-tip="${TIPS.replaceImage}">
    <span class="field-label"><span>Replace image</span>${H.resetControl("Image", "icon", H.fieldDirty(slot, "icon"))}</span>
    <span class="file-replace__btn" style="background-image:url(&quot;${H.escapeAttr(src)}&quot;)" data-tip="${H.escapeAttr(slot.name)}">
      <span class="file-replace__text">Browse</span>
    </span>
    <input type="file" class="file-replace__input" accept="${H.IMAGE_FILE_ACCEPT}" data-file />
  </label>`;
}

function videoReplaceControl(slot: ImageSlot): string {
  const poster = slot.video?.poster;
  const thumb = poster
    ? ` style="background-image:url(&quot;${H.escapeAttr(poster)}&quot;)"`
    : "";
  return `<label class="field file-replace" data-tip="${TIPS.replaceVideo}">
    <span class="field-label"><span>Replace video</span></span>
    <span class="file-replace__btn${poster ? "" : " file-replace__btn--video"}"${thumb} data-tip="${H.escapeAttr(slot.name)}">
      <span class="file-replace__text">Browse</span>
    </span>
    <input type="file" class="file-replace__input" accept="${H.IMAGE_FILE_ACCEPT}" data-file />
  </label>`;
}
