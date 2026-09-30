import imageIcon from "@phosphor-icons/core/assets/regular/image.svg?raw";
import pencilSimple from "@phosphor-icons/core/assets/regular/pencil-simple.svg?raw";
import pauseIcon from "@phosphor-icons/core/assets/regular/pause.svg?raw";
import playIcon from "@phosphor-icons/core/assets/regular/play.svg?raw";
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
import type { AppState, ImageSlot, Slot, TextSlot } from "../types";
import { YOUTUBE_LOOP_MAX, YOUTUBE_LOOP_MIN } from "../youtube";

const DUPLICATE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="4" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="4" y="9" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>`;

export type SlotCardHost = {
  state: AppState;
  panel: HTMLElement;
  openSlots: Set<string>;
  pickedSlotIds: Set<string>;
  remember(key?: string): void;
  live(): void;
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

function paintTextHeadline(toggle: HTMLElement, slot: TextSlot, open: boolean, focus: boolean) {
  toggle.replaceChildren();
  const chip = textColorChip(slot);
  if (!open) {
    const name = document.createElement("span");
    name.className = "slot-name";
    const title = document.createElement("span");
    title.className = "slot-title";
    const word = slot.text.trim();
    title.textContent = word || "Empty";
    if (!word) title.classList.add("is-empty");
    const pen = document.createElement("span");
    pen.className = "slot-pen";
    pen.setAttribute("aria-hidden", "true");
    pen.innerHTML = pencilSimple;
    name.append(title, pen);
    toggle.append(chip, name);
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
      mark.innerHTML = imageIcon;
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
  duplicate.className = "ghost icon-btn";
  duplicate.setAttribute("aria-label", "Duplicate");
  duplicate.dataset.tip = "Duplicate this piece";
  duplicate.innerHTML = DUPLICATE_ICON;
  duplicate.addEventListener("click", () => H.duplicateSlot(slot.id));

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "ghost icon-btn";
  remove.dataset.remove = "";
  remove.setAttribute("aria-label", "Remove");
  remove.dataset.tip = "Remove this piece";
  remove.textContent = "✕";
  remove.addEventListener("click", () => H.removeSlot(slot.id));
  head.append(toggle, duplicate, remove);
  return head;
}

function textFields(slot: TextSlot, open: boolean): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "slot-body";
  wrap.append(slotHead(slot, open));
  const editor = document.createElement("div");
  editor.className = "slot-editor";
  slot.fontWeight = H.chosenWeight(slot.fontFamily, slot.fontWeight);
  editor.innerHTML = `
    <div class="slot-group">
      <p class="slot-label">Text</p>
      <div class="row">
        <div class="field">${H.settingLabel(slot, "Typeface", "fontFamily")}
          <div class="font-pick" data-font-pick></div>
        </div>
        <div class="field">${H.settingLabel(slot, "Weight", "fontWeight")}
          <div class="font-pick" data-weight-pick></div>
        </div>
      </div>
      <label class="field">${H.settingLabel(slot, "Text scale", "scale", slot.scale.toFixed(2))}
        <input type="range" data-key="scale" min="0.25" max="${H.slotScaleSliderMax(slot)}" step="0.05" value="${slot.scale}" />
      </label>
      <label class="field">${H.settingLabel(slot, "Text height", "textHeight", String(slot.textHeight))}
        <input type="range" data-key="textHeight" min="0" max="100" step="1" value="${slot.textHeight}" />
      </label>
      <label class="field">${H.settingLabel(slot, "Tracking", "tracking", String(trackingOf(slot, H.state.textTracking)))}
        <input type="range" data-key="tracking" min="-400" max="500" step="1" value="${trackingOf(slot, H.state.textTracking)}" />
      </label>
      ${
        slot.shape !== "none"
          ? `<div class="field">${H.settingLabel(slot, "Text color", "textColor")}
        ${H.textTintRow(slot)}
      </div>`
          : ""
      }
    </div>
    <div class="slot-group">
      <p class="slot-label">Shape</p>
      ${
        slot.shape !== "none"
          ? `<label class="field">${H.settingLabel(slot, "Shape padding", "pillPad", String(pillPadOf(slot, H.state.pillPad)))}
        <input type="range" data-key="pillPad" min="0" max="100" step="1" value="${pillPadOf(slot, H.state.pillPad)}" />
      </label>`
          : ""
      }
      <div class="row">
        <label class="field">${H.settingLabel(slot, "Holding shape", "shape")}
          <select data-key="shape">
            <option value="none" ${slot.shape === "none" ? "selected" : ""}>None</option>
            <option value="pill" ${slot.shape === "pill" ? "selected" : ""}>Pill</option>
            <option value="box" ${slot.shape === "box" ? "selected" : ""}>Box</option>
          </select>
        </label>
        <label class="field${slot.shape !== "box" ? " is-muted" : ""}">${H.settingLabel(slot, "Corner radius", "radius")}
          <input type="range" data-key="radius" min="0" max="40" value="${slot.radius}" ${slot.shape !== "box" ? "disabled" : ""} />
        </label>
      </div>
      ${
        slot.shape !== "none"
          ? `<div class="check-row">
        <label class="check">
          ${checkInput(`data-key="stroked" ${slot.stroked ? "checked" : ""}`)}
          Stroked
        </label>
        ${H.resetControl("Stroked", "stroked", H.fieldDirty(slot, "stroked"))}
      </div>
      ${slot.stroked ? `<label class="field">${H.settingLabel(slot, "Stroke", "stroke", String(slot.stroke))}
        <input type="range" data-key="stroke" min="1" max="16" step="1" value="${slot.stroke}" />
      </label>` : ""}`
          : ""
      }
      <div class="check-row">
        <label class="check">
          ${checkInput(`data-key="gradient" ${slot.gradient ? "checked" : ""}`)}
          Gradient
        </label>
        ${H.resetControl("Gradient", "gradient", H.fieldDirty(slot, "gradient"))}
      </div>
      <div class="field">${H.settingLabel(slot, slot.gradient ? "Start color" : slot.shape === "none" ? "Color" : "Shape color", "color")}
        ${H.tintRow(slot, slot.shape === "none" ? "Color" : "Shape color")}
      </div>
      ${
        slot.gradient
          ? `<div class="field">${H.settingLabel(slot, "End color", "gradientColor")}
        ${H.gradientTintRow(slot)}
      </div>
      <label class="field">${H.settingLabel(slot, "Gradient angle", "gradientAngle", String(gradientAngleOf(slot.gradientAngle)))}
        <input type="range" data-key="gradientAngle" min="0" max="360" step="1" value="${gradientAngleOf(slot.gradientAngle)}" />
      </label>
      <label class="field">${H.settingLabel(slot, "Gradient scale", "gradientScale", String(gradientScaleOf(slot.gradientScale)))}
        <input type="range" data-key="gradientScale" min="1" max="100" step="1" value="${gradientScaleOf(slot.gradientScale)}" />
      </label>`
          : ""
      }
      ${H.blendField(slot)}
      ${H.dropShadowField(slot)}
    </div>
    <div class="slot-group">
      <div class="slot-group-head">
        <p class="slot-label">Animation</p>
        <button type="button" class="section-reset${H.assetAnimsFrozen ? " is-on" : ""}" data-freeze-anims aria-pressed="${H.assetAnimsFrozen}" aria-label="${H.assetAnimsFrozen ? "Resume animations" : "Pause animations"}" data-tip="${H.assetAnimsFrozen ? "Resume text and gradient animations" : "Freeze text and gradient animations on all assets"}">${H.assetAnimsFrozen ? playIcon : pauseIcon}</button>
      </div>
      <div class="check-row">
        <label class="check">
          ${checkInput(`data-key="textAnim" ${slot.textAnim ? "checked" : ""}`)}
          Text animation
        </label>
        ${H.resetControl("Text animation", "textAnim", H.fieldDirty(slot, "textAnim"))}
      </div>
      ${
        slot.textAnim
          ? `<label class="field">${H.settingLabel(slot, "Text anim speed", "textAnimSpeed", String(textAnimSpeedOf(slot.textAnimSpeed)))}
        <input type="range" data-key="textAnimSpeed" min="1" max="100" step="1" value="${textAnimSpeedOf(slot.textAnimSpeed)}" />
      </label>`
          : ""
      }
      ${
        slot.gradient
          ? `<div class="check-row">
        <label class="check">
          ${checkInput(`data-key="animatedGradient" ${slot.animatedGradient ? "checked" : ""}`)}
          Animated Gradient
        </label>
        ${H.resetControl("Animated Gradient", "animatedGradient", H.fieldDirty(slot, "animatedGradient"))}
      </div>
      ${
        slot.animatedGradient
          ? `<label class="field">${H.settingLabel(slot, "Animation speed", "gradientSpeed", String(gradientSpeedOf(slot.gradientSpeed)))}
        <input type="range" data-key="gradientSpeed" min="1" max="100" step="1" value="${gradientSpeedOf(slot.gradientSpeed)}" />
      </label>`
          : ""
      }`
          : ""
      }
    </div>
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
      H.reflectGlobalWeight();
      H.paintFieldReset(editor, slot, "fontFamily");
      H.paintFieldReset(editor, slot, "fontWeight");
      void H.settleFont(family, slot.fontWeight).then(() => H.liveChip(slot.id));
    });
  }
  H.bindSlotInputs(editor, slot);
  H.bindTint(editor, slot);
  H.bindFreezeAnims(editor);
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
    <div class="field">${H.settingLabel(slot, slot.gradient && H.iconCanGradient(slot) ? "Start color" : "Color", "color")}
      ${H.tintRow(slot)}
    </div>
    ${
      H.iconCanGradient(slot)
        ? `<div class="check-row">
      <label class="check">
        ${checkInput(`data-key="gradient" ${slot.gradient ? "checked" : ""}`)}
        Gradient
      </label>
      ${H.resetControl("Gradient", "gradient", H.fieldDirty(slot, "gradient"))}
    </div>
    ${
      slot.gradient
        ? `<div class="field">${H.settingLabel(slot, "End color", "gradientColor")}
      ${H.gradientTintRow(slot)}
    </div>
    <label class="field">${H.settingLabel(slot, "Gradient angle", "gradientAngle", String(gradientAngleOf(slot.gradientAngle)))}
      <input type="range" data-key="gradientAngle" min="0" max="360" step="1" value="${gradientAngleOf(slot.gradientAngle)}" />
    </label>
    <label class="field">${H.settingLabel(slot, "Gradient scale", "gradientScale", String(gradientScaleOf(slot.gradientScale)))}
      <input type="range" data-key="gradientScale" min="1" max="100" step="1" value="${gradientScaleOf(slot.gradientScale)}" />
    </label>
    <div class="check-row">
      <label class="check">
        ${checkInput(`data-key="animatedGradient" ${slot.animatedGradient ? "checked" : ""}`)}
        Animated Gradient
      </label>
      ${H.resetControl("Animated Gradient", "animatedGradient", H.fieldDirty(slot, "animatedGradient"))}
    </div>
    ${
      slot.animatedGradient
        ? `<label class="field">${H.settingLabel(slot, "Animation speed", "gradientSpeed", String(gradientSpeedOf(slot.gradientSpeed)))}
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
    <p class="slot-label">Shapes</p>
    <div class="icon-grid" data-presets></div>
    <label class="field">${H.settingLabel(slot, "Shape scale", "scale", slot.scale.toFixed(2))}
      <input type="range" data-key="scale" min="0.25" max="${H.slotScaleSliderMax(slot)}" step="0.05" value="${slot.scale}" />
    </label>
    <label class="field">${H.settingLabel(slot, "Amount", "amount", String(slot.amount))}
      <input type="range" data-key="amount" min="1" max="${H.AMOUNT_SOFT_CAP}" value="${slot.amount}" />
    </label>
  `;
  placeFold(wrap, editor, open);

  const grid = editor.querySelector("[data-presets]")!;
  const swatchColor = H.iconPreviewFill(slot);
  for (const icon of ICON_PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = icon.label;
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
    ${H.blendField(slot)}
    ${H.dropShadowField(slot)}
    <p class="slot-label">Emoji</p>
    <div class="emoji-grid" data-emoji-featured></div>
    <label class="field">Search emoji
      <input type="search" data-emoji-search placeholder="heart, fire, cat…" />
    </label>
    <div class="emoji-grid" data-emoji-results></div>
    <label class="field">${H.settingLabel(slot, "Shape scale", "scale", slot.scale.toFixed(2))}
      <input type="range" data-key="scale" min="0.25" max="${H.slotScaleSliderMax(slot)}" step="0.05" value="${slot.scale}" />
    </label>
    <label class="field">${H.settingLabel(slot, "Amount", "amount", String(slot.amount))}
      <input type="range" data-key="amount" min="1" max="${H.AMOUNT_SOFT_CAP}" value="${slot.amount}" />
    </label>
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
    btn.title = item.name;
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
      btn.title = item.name;
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
    <label class="field">${H.settingLabel(slot, "Loop length", "loopSec", `${loopSec}s`)}
      <input type="range" data-youtube-loop min="${YOUTUBE_LOOP_MIN}" max="${YOUTUBE_LOOP_MAX}" step="1" value="${loopSec}" />
    </label>
    <div class="check-row">
      <label class="check">
        ${checkInput(`data-key="stroked" ${slot.stroked ? "checked" : ""}`)}
        Stroked
      </label>
      ${H.resetControl("Stroked", "stroked", H.fieldDirty(slot, "stroked"))}
    </div>
    ${
      slot.stroked
        ? `<label class="field">${H.settingLabel(slot, "Stroke", "stroke", String(slot.stroke ?? 4))}
      <input type="range" data-key="stroke" min="1" max="16" step="1" value="${slot.stroke ?? 4}" />
    </label>
    <div class="field">${H.settingLabel(slot, "Stroke color", "color")}
      ${H.tintRow(slot, "Stroke color")}
    </div>`
        : ""
    }
    <label class="field">${H.settingLabel(slot, "Corner radius", "radius", String(Math.round(slot.radius ?? 0)))}
      <input type="range" data-key="radius" min="0" max="40" step="1" value="${slot.radius ?? 0}" />
    </label>
    <label class="field">${H.settingLabel(slot, "Clip scale", "scale", slot.scale.toFixed(2))}
      <input type="range" data-key="scale" min="0.25" max="${H.slotScaleSliderMax(slot)}" step="0.05" value="${slot.scale}" />
    </label>
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
    if (caption) caption.textContent = `Loop length ${next}s`;
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
    <div class="check-row">
      <label class="check">
        ${checkInput(`data-key="stroked" ${slot.stroked ? "checked" : ""}`)}
        Stroked
      </label>
      ${H.resetControl("Stroked", "stroked", H.fieldDirty(slot, "stroked"))}
    </div>
    ${
      slot.stroked
        ? `<label class="field">${H.settingLabel(slot, "Stroke", "stroke", String(slot.stroke ?? 4))}
      <input type="range" data-key="stroke" min="1" max="16" step="1" value="${slot.stroke ?? 4}" />
    </label>
    <div class="field">${H.settingLabel(slot, "Stroke color", "color")}
      ${H.tintRow(slot, "Stroke color")}
    </div>`
        : ""
    }
    <label class="field">${H.settingLabel(slot, "Corner radius", "radius", String(Math.round(slot.radius ?? 0)))}
      <input type="range" data-key="radius" min="0" max="40" step="1" value="${slot.radius ?? 0}" />
    </label>
    <label class="field">${H.settingLabel(slot, "Clip scale", "scale", slot.scale.toFixed(2))}
      <input type="range" data-key="scale" min="0.25" max="${H.slotScaleSliderMax(slot)}" step="0.05" value="${slot.scale}" />
    </label>
    ${videoReplaceControl(slot)}
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
        ? `<div class="check-row">
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
        ? `<div class="field">${H.settingLabel(slot, slot.gradient ? "Start color" : "Color", "color")}
      ${H.tintRow(slot)}
    </div>
    <div class="check-row">
      <label class="check">
        ${checkInput(`data-key="gradient" ${slot.gradient ? "checked" : ""}`)}
        Gradient
      </label>
      ${H.resetControl("Gradient", "gradient", H.fieldDirty(slot, "gradient"))}
    </div>
    ${
      slot.gradient
        ? `<div class="field">${H.settingLabel(slot, "End color", "gradientColor")}
      ${H.gradientTintRow(slot)}
    </div>
    <label class="field">${H.settingLabel(slot, "Gradient angle", "gradientAngle", String(gradientAngleOf(slot.gradientAngle)))}
      <input type="range" data-key="gradientAngle" min="0" max="360" step="1" value="${gradientAngleOf(slot.gradientAngle)}" />
    </label>
    <label class="field">${H.settingLabel(slot, "Gradient scale", "gradientScale", String(gradientScaleOf(slot.gradientScale)))}
      <input type="range" data-key="gradientScale" min="1" max="100" step="1" value="${gradientScaleOf(slot.gradientScale)}" />
    </label>
    <div class="check-row">
      <label class="check">
        ${checkInput(`data-key="animatedGradient" ${slot.animatedGradient ? "checked" : ""}`)}
        Animated Gradient
      </label>
      ${H.resetControl("Animated Gradient", "animatedGradient", H.fieldDirty(slot, "animatedGradient"))}
    </div>
    ${
      slot.animatedGradient
        ? `<label class="field">${H.settingLabel(slot, "Animation speed", "gradientSpeed", String(gradientSpeedOf(slot.gradientSpeed)))}
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
    <label class="field">${H.settingLabel(slot, "Collision", "collider")}
      <select data-key="collider">
        ${IMAGE_COLLIDERS.map((icon) => `<option value="${icon.id}"${H.colliderOf(slot) === icon.id ? " selected" : ""}>${icon.label}</option>`).join("")}
      </select>
    </label>
    ${
      H.isRasterUpload(slot)
        ? `<div class="check-row">
      <label class="check">
        ${checkInput(`data-key="stroked" ${slot.stroked ? "checked" : ""}`)}
        Stroked
      </label>
      ${H.resetControl("Stroked", "stroked", H.fieldDirty(slot, "stroked"))}
    </div>
    ${
      slot.stroked
        ? `<label class="field">${H.settingLabel(slot, "Stroke", "stroke", String(slot.stroke ?? 4))}
      <input type="range" data-key="stroke" min="1" max="16" step="1" value="${slot.stroke ?? 4}" />
    </label>
    <div class="field">${H.settingLabel(slot, "Stroke color", "color")}
      ${H.tintRow(slot, "Stroke color")}
    </div>`
        : ""
    }
    ${H.dropShadowField(slot)}
    <label class="field">${H.settingLabel(slot, "Corner radius", "radius", String(Math.round(slot.radius ?? 0)))}
      <input type="range" data-key="radius" min="0" max="40" step="1" value="${slot.radius ?? 0}" />
    </label>`
        : `${H.dropShadowField(slot)}`
    }
    <label class="field">${H.settingLabel(slot, "Image scale", "scale", slot.scale.toFixed(2))}
      <input type="range" data-key="scale" min="0.25" max="${H.slotScaleSliderMax(slot)}" step="0.05" value="${slot.scale}" />
    </label>
    <label class="field">${H.settingLabel(slot, "Amount", "amount", String(slot.amount))}
      <input type="range" data-key="amount" min="1" max="${H.AMOUNT_SOFT_CAP}" value="${slot.amount}" />
    </label>
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
  return `<label class="field file-replace">
    <span class="field-label"><span>Replace image</span>${H.resetControl("Image", "icon", H.fieldDirty(slot, "icon"))}</span>
    <span class="file-replace__btn" style="background-image:url(&quot;${H.escapeAttr(src)}&quot;)" data-tip="${H.escapeAttr(slot.name)}">
      <span class="file-replace__text">Replace</span>
    </span>
    <input type="file" class="file-replace__input" accept="${H.IMAGE_FILE_ACCEPT}" data-file />
  </label>`;
}

function videoReplaceControl(slot: ImageSlot): string {
  const poster = slot.video?.poster;
  const thumb = poster
    ? ` style="background-image:url(&quot;${H.escapeAttr(poster)}&quot;)"`
    : "";
  return `<label class="field file-replace">
    <span class="field-label"><span>Replace video</span></span>
    <span class="file-replace__btn${poster ? "" : " file-replace__btn--video"}"${thumb} data-tip="${H.escapeAttr(slot.name)}">
      <span class="file-replace__text">Replace</span>
    </span>
    <input type="file" class="file-replace__input" accept="${H.IMAGE_FILE_ACCEPT}" data-file />
  </label>`;
}
