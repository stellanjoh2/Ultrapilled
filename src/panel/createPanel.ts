import atomIcon from "@phosphor-icons/core/assets/regular/atom.svg?raw";
import floppyDisk from "@phosphor-icons/core/assets/regular/floppy-disk.svg?raw";
import gridFourIcon from "@phosphor-icons/core/assets/regular/grid-four.svg?raw";
import plus from "@phosphor-icons/core/assets/regular/plus.svg?raw";
import { isCanvasRatio } from "../canvas";
import { openAbout } from "../aboutPanel";
import { bindSlotDrag } from "../slotDrag";
import {
  BLEND_MODES,
  blendMode,
  DEFAULT_AUDIO_REACT,
  DEFAULT_PHYSICS,
  PHYSICS_COMPLEXITY,
  physicsComplexity,
  type AppState,
} from "../types";
import { blankState, TEMPLATES } from "../templates";
import { listCustomTemplates } from "../customTemplates";
import { playClick, playSwitch, playTransition } from "../uiSounds";
import { bindSlotCards, renderSlotCard, type SlotCardHost } from "./slotCards";

export const RESET_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M3 3v5h5"/></svg>';

export type InsertMotion = {
  id: string;
  scroll: number;
  anchorId: string | null;
  anchorTop: number;
};

export type CreatePanelHost = SlotCardHost & {
  openSections: Set<string>;
  shapeAmountRange(): { min: number; max: number };
  activeTemplateLabel(id: string | undefined): string | undefined;
  escapeAttr(value: string): string;
  get machineFont(): string;
  setMachineFont(value: string): void;
  get localFamilies(): string[];
  SHAPE_PERF_WARN: number;
  selectCanvas(next: import("../canvas").CanvasRatio): void;
  openCanvasStagePicker(btn: HTMLButtonElement): void;
  loadTemplate(next: AppState): void;
  saveCurrentAsTemplate(): void;
  closeFontMenu(): void;
  removeCustomTemplate(id: string): void;
  openChoiceMenu: <T>(
    trigger: HTMLButtonElement,
    choices: { value: T; label: string; onRemove?: () => void }[],
    selected: T,
    onPick: (value: T) => void,
  ) => void;
  loadSavedTemplate(id: string): void;
  applySlotOrder(visualIds: string[]): void;
  addPillSlot(): void;
  addTypeSlot(): void;
  addShapeSlot(): void;
  addEmojiSlot(): void;
  pickImageFiles(multiple?: boolean): Promise<File[]>;
  addImagesFromFiles(files: File[]): void;
  bindRange(
    id: string,
    label: string,
    onChange: (value: number) => void,
    format?: (value: number) => string,
  ): void;
  paintPerfHints(): void;
  syncInheritedPillPads(): void;
  scaleFallingAmounts(amount: number): void;
  paintRange(input: HTMLInputElement): void;
  mountFontPick(
    hostEl: HTMLElement,
    family: string,
    onPick: (family: string) => void,
    clearLabel?: string,
  ): void;
  getAppliedFont(): string;
  setAppliedFont(value: string): void;
  applyFontEverywhere(family: string): Promise<void> | void;
  sharedFamily(): string | null;
  sharedWeight(): number | null;
  mountWeightPick(
    hostEl: HTMLElement,
    family: string,
    weight: number,
    onPick: (weight: number) => void,
    mixed?: boolean,
  ): { setFamily(family: string): number; reflect(family: string, weight: number | null): void };
  setGlobalWeightPick(pick: { reflect(family: string, weight: number | null): void } | null): void;
  applyWeightEverywhere(weight: number): Promise<void> | void;
  loadLocalFonts(): void;
  setLayoutMode(layout: boolean): void | Promise<void>;
  setAudioReactEnabled(on: boolean): Promise<void>;
  openThemes(): void;
  openThemeSwatch(swatch: HTMLButtonElement): void;
  consumeRevealTheme(): boolean;
  consumeRevealSlotId(): string | null;
  scrollPanelTo(card: HTMLElement): void;
  growInsertedSlot(motion: InsertMotion): void;
  setFocusSlotId(id: string | null): void;
  paintMicTextAnim(): void;
  pinPageScroll(): void;
  applyPost(): void;
  demoState(): AppState;
};

function sectionMarkupImpl(
  openSections: Set<string>,
  id: string,
  title: string,
  tip: string,
  body: string,
  options?: { resetId?: string; resetLabel?: string; resetTip?: string; sectionId?: string },
): string {
  const open = openSections.has(id);
  const reset =
    options?.resetId && options.resetLabel && options.resetTip
      ? `<button type="button" class="section-reset" id="${options.resetId}" aria-label="${options.resetLabel}" data-tip="${options.resetTip}">${RESET_ICON}</button>`
      : "";
  const domId = options?.sectionId ? ` id="${options.sectionId}"` : "";
  return `
    <section class="section${open ? " is-open" : ""}" data-section="${id}"${domId}>
      <div class="section-head">
        <button type="button" class="section-toggle" aria-expanded="${open}">
          <span class="section-toggle__label" data-tip="${tip}">${title}</span>
        </button>
        ${reset}
        <span class="section-chevron" aria-hidden="true"></span>
      </div>
      <div class="section-fold"${open ? "" : " inert"} aria-hidden="${open ? "false" : "true"}">
        <div class="section-fold-clip">
          ${body}
        </div>
      </div>
    </section>
  `;
}

export function setSectionOpen(panel: HTMLElement, openSections: Set<string>, id: string, open: boolean) {
  if (open) openSections.add(id);
  else openSections.delete(id);
  const section = panel.querySelector<HTMLElement>(`[data-section="${id}"]`);
  if (!section) return;
  section.classList.toggle("is-open", open);
  section.querySelector(".section-toggle")?.setAttribute("aria-expanded", String(open));
  const fold = section.querySelector<HTMLElement>(".section-fold");
  if (fold) {
    fold.inert = !open;
    fold.setAttribute("aria-hidden", String(!open));
  }
}

function bindSectionFolds(panel: HTMLElement, openSections: Set<string>, root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("[data-section]").forEach((section) => {
    const id = section.dataset.section;
    if (!id) return;
    section.querySelector(".section-head")?.addEventListener("click", (event) => {
      if ((event.target as Element).closest(".section-reset")) return;
      const open = !openSections.has(id);
      setSectionOpen(panel, openSections, id, open);
      playTransition(open);
    });
  });
}

let H: CreatePanelHost;

export function mountCreatePanel(
  panel: HTMLElement,
  host: CreatePanelHost,
  scroll: number,
  inserted: InsertMotion | null,
) {
  H = host;
  bindSlotCards(host);
  const openSections = host.openSections;
  const sectionMarkup = (
    id: string,
    title: string,
    tip: string,
    bodyHtml: string,
    options?: { resetId?: string; resetLabel?: string; resetTip?: string; sectionId?: string },
  ) => sectionMarkupImpl(openSections, id, title, tip, bodyHtml, options);
  const revealSlotId = host.consumeRevealSlotId();
const shapes = H.shapeAmountRange();
panel.innerHTML = `
  <section class="section">
    <h2 data-tip="Widescreen or vertical frame">Canvas</h2>
    <div class="canvas-controls">
      <div class="segment is-4" role="group" aria-label="Canvas">
        <button type="button" class="pill${H.state.canvas === "16:9" ? " is-on" : ""}" data-canvas="16:9" aria-pressed="${H.state.canvas === "16:9"}" data-tip="Landscape frame">16:9</button>
        <button type="button" class="pill${H.state.canvas === "1:1" ? " is-on" : ""}" data-canvas="1:1" aria-pressed="${H.state.canvas === "1:1"}" data-tip="Square frame">1:1</button>
        <button type="button" class="pill${H.state.canvas === "3:4" ? " is-on" : ""}" data-canvas="3:4" aria-pressed="${H.state.canvas === "3:4"}" data-tip="Photo portrait frame">3:4</button>
        <button type="button" class="pill${H.state.canvas === "9:16" ? " is-on" : ""}" data-canvas="9:16" aria-pressed="${H.state.canvas === "9:16"}" data-tip="Tall portrait frame">9:16</button>
      </div>
      <button type="button" class="canvas-stage" id="canvas-stage" style="background:${H.state.stageColor}" aria-label="Stage color" data-tip="Canvas background color"></button>
    </div>
  </section>
  <section class="section">
    <div class="templates-head">
      <h2 data-tip="Start empty or from a ready-made scene">Templates</h2>
      <button type="button" class="section-reset" id="save-template" aria-label="Save theme" data-tip="Save the current scene as a custom template">${floppyDisk}</button>
    </div>
    <div class="segment" role="group" aria-label="Templates">
      <button type="button" class="pill${H.state.template === "blank" ? " is-on" : ""}" id="template-blank" aria-pressed="${H.state.template === "blank"}" data-tip="Start from an empty canvas">Blank</button>
      <button type="button" class="pill template-pick${H.activeTemplateLabel(H.state.template) ? " is-on" : ""}" id="template-pick" aria-haspopup="listbox" aria-expanded="false" data-tip="Load a ready-made scene">
        <span class="font-pick-value">${H.activeTemplateLabel(H.state.template) ?? "Template"}</span>
        <span class="font-pick-chevron" aria-hidden="true"></span>
      </button>
    </div>
  </section>
  ${sectionMarkup(
    "composition",
    "Composition",
    "Overall size and spacing of pieces",
    `<label class="field" data-tip="Overall size of every piece"><span data-range-label="masterScale">Scale ${(H.state.masterScale * 10).toFixed(0)}</span>
      <input type="range" id="masterScale" min="4" max="100" step="1" value="${H.state.masterScale * 10}" />
    </label>
    <label class="field" data-tip="How much piece sizes vary"><span data-range-label="sizeRandom">Size random ${H.state.sizeRandom}</span>
      <input type="range" id="sizeRandom" min="0" max="100" step="1" value="${H.state.sizeRandom}" />
    </label>
    <label class="field" data-tip="Space inside text holding shapes"><span data-range-label="pillPad">Shape padding ${H.state.pillPad}</span>
      <input type="range" id="pillPad" min="0" max="100" step="1" value="${H.state.pillPad}" />
    </label>
    <label class="field" data-tip="How many pieces drop into the frame"><span data-range-label="shapeAmount">Amount of shapes ${H.state.shapeAmount}</span>
      <input type="range" id="shapeAmount" min="${shapes.min}" max="${shapes.max}" step="1" value="${H.state.shapeAmount}" />
    </label>
    <p class="hint" id="amount-perf-hint"${H.state.shapeAmount >= H.SHAPE_PERF_WARN ? "" : " hidden"}>Many shapes can drop below 60 fps.</p>`,
    { resetId: "reset-master", resetLabel: "Reset composition", resetTip: "Reset composition sliders" },
  )}
  ${sectionMarkup(
    "color",
    "Color theme",
    "Colors used by pills and shapes",
    `<div class="theme-row" style="--theme-count:${H.state.theme.length}">
      ${H.state.theme
        .map(
          (color, i) =>
            `<button type="button" class="theme-swatch" data-theme="${i}" style="background:${color}; --i:${i}" aria-label="Theme color ${i + 1}" data-tip="Edit theme color ${i + 1}"></button>`,
        )
        .join("")}
    </div>
    <button type="button" class="pill theme-launch" id="view-themes" data-tip="Browse ready-made color palettes">View Themes</button>`,
  )}
  ${sectionMarkup(
    "typeface",
    "Typeface",
    "Fonts for all text pills",
    `<div class="field" data-tip="Apply one font to every text piece">All text
      <div class="font-pick" id="global-font"></div>
    </div>
    <div class="field" data-tip="Default weight for all text">Weight
      <div class="font-pick" id="global-weight"></div>
    </div>
    <div class="row">
      <div class="field" data-tip="Type a font name installed on this computer">Font from this computer
        <input type="text" id="machine-font" list="local-font-list" placeholder="e.g. Helvetica Neue" value="${H.escapeAttr(H.machineFont)}" />
      </div>
    </div>
    <datalist id="local-font-list">
      ${H.localFamilies.map((name) => `<option value="${H.escapeAttr(name)}"></option>`).join("")}
    </datalist>
    <button type="button" class="pill" id="load-local-fonts" data-tip="Let the browser list fonts installed on this computer">Load local fonts</button>`,
  )}
  ${sectionMarkup(
    "what-falls",
    "What falls down",
    "The pieces that drop into the frame. In Layout mode, list order is layer order — top sits in front",
    `<div class="slot-stack" id="slots"></div>
    <div class="slot-adds">
      <button type="button" class="pill slot-add" id="add-text" data-tip="Add a text label inside a rounded pill">
        <span class="slot-add__icon" aria-hidden="true">${plus}</span>
        Add pill
      </button>
      <button type="button" class="pill slot-add" id="add-type" data-tip="Add bare text without a pill shape">
        <span class="slot-add__icon" aria-hidden="true">${plus}</span>
        Add text
      </button>
      <button type="button" class="pill slot-add" id="add-shape" data-tip="Add a built-in shape from the library">
        <span class="slot-add__icon" aria-hidden="true">${plus}</span>
        Add shape
      </button>
      <button type="button" class="pill slot-add" id="add-emoji" data-tip="Add an emoji">
        <span class="slot-add__icon" aria-hidden="true">${plus}</span>
        Add emoji
      </button>
      <button type="button" class="pill slot-add" id="add-photo" data-tip="Add an SVG, PNG, JPG, GIF, or MP4">
        <span class="slot-add__icon" aria-hidden="true">${plus}</span>
        Upload image
      </button>
    </div>`,
    { sectionId: "shape-create" },
  )}
  ${sectionMarkup(
    "physics",
    "Physics",
    "How pieces fall, bounce, and settle — or place them freely",
    `<div class="segment" role="group" aria-label="Placement mode">
      <button type="button" class="pill${!H.state.physics.layoutMode ? " is-on" : ""}" data-layout-mode="physics" aria-pressed="${!H.state.physics.layoutMode}" data-tip="Pieces fall, bounce, and stack"><span class="theme-chrome__icon" aria-hidden="true">${atomIcon}</span>Physics</button>
      <button type="button" class="pill${H.state.physics.layoutMode ? " is-on" : ""}" data-layout-mode="layout" aria-pressed="${H.state.physics.layoutMode}" data-tip="Place freely like Figma — no physics, no throws, pieces can overlap"><span class="theme-chrome__icon" aria-hidden="true">${gridFourIcon}</span>Layout</button>
    </div>
    <div class="physics-dynamics"${H.state.physics.layoutMode ? " inert" : ""}>
    <label class="field" data-tip="Simple = boxes, Normal = circle/box, Ultra = traced icon shapes. Higher is heavier on the CPU.">Physics complexity
      <select id="physics-complexity"${H.state.physics.layoutMode ? " disabled" : ""}>
        ${PHYSICS_COMPLEXITY.map((tier) => `<option value="${tier.id}"${H.state.physics.complexity === tier.id ? " selected" : ""}>${tier.label}</option>`).join("")}
      </select>
    </label>
    <div class="row">
      <label class="field" data-tip="How hard pieces pull downward"><span data-range-label="gravity">Gravity ${H.state.physics.gravity.toFixed(2)}</span>
        <input type="range" id="gravity" min="0" max="3" step="0.05" value="${H.state.physics.gravity}"${H.state.physics.layoutMode ? " disabled" : ""} />
      </label>
    </div>
    <div class="row">
      <label class="field" data-tip="How fast the simulation runs"><span data-range-label="speed">Speed ${H.state.physics.speed.toFixed(2)}</span>
        <input type="range" id="speed" min="0.2" max="2" step="0.05" value="${H.state.physics.speed}"${H.state.physics.layoutMode ? " disabled" : ""} />
      </label>
    </div>
    <div class="row">
      <label class="field" data-tip="How springy collisions are (above 1 = super-bouncy)"><span data-range-label="bounce">Bounciness ${H.state.physics.bounce.toFixed(2)}</span>
        <input type="range" id="bounce" min="0" max="2" step="0.05" value="${H.state.physics.bounce}"${H.state.physics.layoutMode ? " disabled" : ""} />
      </label>
    </div>
    <div class="row">
      <label class="field" data-tip="Slide resistance when pieces touch"><span data-range-label="friction">Friction ${H.state.physics.friction.toFixed(2)}</span>
        <input type="range" id="friction" min="0" max="1" step="0.05" value="${H.state.physics.friction}"${H.state.physics.layoutMode ? " disabled" : ""} />
      </label>
    </div>
    <div class="row">
      <label class="field" data-tip="How much pieces stick while sliding"><span data-range-label="grip">Grip ${H.state.physics.grip.toFixed(2)}</span>
        <input type="range" id="grip" min="0" max="1" step="0.05" value="${H.state.physics.grip}"${H.state.physics.layoutMode ? " disabled" : ""} />
      </label>
    </div>
    <div class="row">
      <label class="field" data-tip="How quickly spinning slows down"><span data-range-label="spin">Spin drag ${H.state.physics.spin.toFixed(2)}</span>
        <input type="range" id="spin" min="0" max="0.12" step="0.01" value="${H.state.physics.spin}"${H.state.physics.layoutMode ? " disabled" : ""} />
      </label>
    </div>
    <label class="field" data-tip="How long the floor stays closed before opening"><span data-range-label="hold">Floor pause ${H.state.physics.hold.toFixed(2)}s</span>
      <input type="range" id="hold" min="0.2" max="4" step="0.05" value="${H.state.physics.hold}"${H.state.physics.layoutMode ? " disabled" : ""} />
    </label>
    </div>`,
    { resetId: "reset-physics", resetLabel: "Reset physics", resetTip: "Reset physics sliders" },
  )}
  ${sectionMarkup(
    "look",
    "Look",
    "Post-process color and glow on the whole frame",
    `<label class="field" data-tip="Shift all colors around the wheel"><span data-range-label="hue">Hue ${H.state.post.hue}°</span>
      <input type="range" id="hue" min="0" max="360" step="1" value="${H.state.post.hue}" />
    </label>
    <label class="field" data-tip="Soft glow around bright areas"><span data-range-label="bloom">Bloom ${H.state.post.bloom}</span>
      <input type="range" id="bloom" min="0" max="100" step="1" value="${H.state.post.bloom}" />
    </label>
    <label class="field" data-tip="Strength of the glow"><span data-range-label="bloomOpacity">Bloom opacity ${H.state.post.bloomOpacity}</span>
      <input type="range" id="bloomOpacity" min="0" max="100" step="1" value="${H.state.post.bloomOpacity}" />
    </label>
    <label class="field" data-tip="Film-grain texture over the frame"><span data-range-label="grain">Grain ${H.state.post.grain}</span>
      <input type="range" id="grain" min="0" max="200" step="1" value="${H.state.post.grain}" />
    </label>
    <label class="field" data-tip="Darken the edges of the frame"><span data-range-label="vignette">Vignette ${H.state.post.vignette}</span>
      <input type="range" id="vignette" min="0" max="100" step="1" value="${H.state.post.vignette}" />
    </label>
    <label class="field" data-tip="Color intensity"><span data-range-label="saturate">Saturate ${H.state.post.saturate}</span>
      <input type="range" id="saturate" min="40" max="180" step="1" value="${H.state.post.saturate}" />
    </label>
    <label class="field" data-tip="How overlapping pieces mix colors">Blending mode
      <select id="blend">
        ${BLEND_MODES.map((mode) => `<option value="${mode.id}"${H.state.post.blend === mode.id ? " selected" : ""}>${mode.label}</option>`).join("")}
      </select>
    </label>`,
  )}
  ${sectionMarkup(
    "audio-react",
    "Audio react",
    "Bass hops everything and swells pills; sharp hits make icons hop",
    `<button type="button" class="pill smash-btn${H.state.audioReact.enabled ? " is-on" : ""}" id="audio-mic" aria-pressed="${H.state.audioReact.enabled}" data-tip="Ask for mic access and drive scale from live audio">
      <span class="smash-btn__label">
        <svg class="smash-btn__icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3z"></path>
        </svg>
        <span class="smash-btn__text">${H.state.audioReact.enabled ? "Listening" : "Microphone"}</span>
      </span>
    </button>
    <label class="field" data-tip="How easily quiet sounds trigger a reaction"><span data-range-label="audioSensitivity">Sensitivity ${Math.round(H.state.audioReact.sensitivity)}</span>
      <input type="range" id="audioSensitivity" min="0" max="100" step="1" value="${H.state.audioReact.sensitivity}" />
    </label>
    <label class="field" data-tip="How hard pieces hop on a hit"><span data-range-label="audioBounce">Bounce intensity ${H.state.audioReact.bounce.toFixed(1)}×</span>
      <input type="range" id="audioBounce" min="1" max="4" step="0.1" value="${H.state.audioReact.bounce}" />
    </label>
    <label class="field" data-tip="How much text pills swell on bass hits"><span data-range-label="audioBassBoost">Bass boost +${Math.round(H.state.audioReact.bassBoost)}%</span>
      <input type="range" id="audioBassBoost" min="5" max="20" step="1" value="${H.state.audioReact.bassBoost}" />
    </label>
    <label class="field" data-tip="Small color-wheel kick on sharp hits that snaps back"><span data-range-label="audioHueNudge">Hue nudge ${Math.round(H.state.audioReact.hueNudge)}°</span>
      <input type="range" id="audioHueNudge" min="0" max="30" step="1" value="${H.state.audioReact.hueNudge}" />
    </label>`,
    { resetId: "reset-audio-react", resetLabel: "Reset audio react", resetTip: "Reset audio react" },
  )}
  <footer class="panel-credit">
    <span class="panel-credit__s" aria-hidden="true"></span>
    <p>
      Ultrapilled™ is created by<br />
      <button type="button" class="panel-credit__author" id="open-about">Stellan Johansson</button>
    </p>
    <p class="panel-credit__social">
      <a href="https://x.com/johstell" target="_blank" rel="noopener noreferrer" aria-label="X">
        <span class="panel-credit__icon panel-credit__icon--x" aria-hidden="true"></span>
      </a>
      <a href="https://github.com/stellanjoh2/Ultrapilled" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
        <svg viewBox="0 0 98 96" aria-hidden="true">
          <path fill="currentColor" d="M41.4395 69.3848C28.8066 67.8535 19.9062 58.7617 19.9062 46.9902C19.9062 42.2051 21.6289 37.0371 24.5 33.5918C23.2559 30.4336 23.4473 23.7344 24.8828 20.959C28.7109 20.4805 33.8789 22.4902 36.9414 25.2656C40.5781 24.1172 44.4062 23.543 49.0957 23.543C53.7852 23.543 57.6133 24.1172 61.0586 25.1699C64.0254 22.4902 69.2891 20.4805 73.1172 20.959C74.457 23.543 74.6484 30.2422 73.4043 33.4961C76.4668 37.1328 78.0937 42.0137 78.0937 46.9902C78.0937 58.7617 69.1934 67.6621 56.3691 69.2891C59.623 71.3945 61.8242 75.9883 61.8242 81.252L61.8242 91.2051C61.8242 94.0762 64.2168 95.7031 67.0879 94.5547C84.4102 87.9512 98 70.6289 98 49.1914C98 22.1074 75.9883 6.69539e-07 48.9043 4.309e-07C21.8203 1.92261e-07 -1.9479e-07 22.1074 -4.3343e-07 49.1914C-6.20631e-07 70.4375 13.4941 88.0469 31.6777 94.6504C34.2617 95.6074 36.75 93.8848 36.75 91.3008L36.75 83.6445C35.4102 84.2188 33.6875 84.6016 32.1562 84.6016C25.8398 84.6016 22.1074 81.1563 19.4277 74.7441C18.375 72.1602 17.2266 70.6289 15.0254 70.3418C13.877 70.2461 13.4941 69.7676 13.4941 69.1934C13.4941 68.0449 15.4082 67.1836 17.3223 67.1836C20.0977 67.1836 22.4902 68.9063 24.9785 72.4473C26.8926 75.2227 28.9023 76.4668 31.2949 76.4668C33.6875 76.4668 35.2187 75.6055 37.4199 73.4043C39.0469 71.7773 40.291 70.3418 41.4395 69.3848Z" />
        </svg>
      </a>
    </p>
  </footer>
`;

bindSectionFolds(panel, openSections, panel);

panel.querySelector("#open-about")?.addEventListener("click", () => {
  openAbout();
});

panel.querySelectorAll<HTMLButtonElement>("[data-canvas]").forEach((button) => {
  button.addEventListener("click", () => {
    const next = button.dataset.canvas;
    if (isCanvasRatio(next)) H.selectCanvas(next);
  });
});

panel.querySelector<HTMLButtonElement>("#canvas-stage")?.addEventListener("click", (event) => {
  H.openCanvasStagePicker(event.currentTarget as HTMLButtonElement);
});

panel.querySelector("#template-blank")?.addEventListener("click", () => {
  H.loadTemplate(blankState());
});
panel.querySelector("#save-template")?.addEventListener("click", () => {
  void H.saveCurrentAsTemplate();
});
const templatePick = panel.querySelector<HTMLButtonElement>("#template-pick");
templatePick?.addEventListener("click", () => {
  if (templatePick.getAttribute("aria-expanded") === "true") {
    H.closeFontMenu();
    return;
  }
  const choices: { value: string; label: string; onRemove?: () => void }[] = [
    ...TEMPLATES.map((template) => ({ value: template.id as string, label: template.label })),
    ...listCustomTemplates().map((template) => ({
      value: template.id,
      label: template.label,
      onRemove: () => {
        void H.removeCustomTemplate(template.id);
      },
    })),
  ];
  H.openChoiceMenu(templatePick, choices, H.state.template ?? "", (id) => {
    const builtIn = TEMPLATES.find((item) => item.id === id);
    if (builtIn) {
      H.loadTemplate(builtIn.build());
      return;
    }
    void H.loadSavedTemplate(id);
  });
});

const slotStack = panel.querySelector<HTMLElement>("#slots")!;
// Front of the pile at the top of the list (last slot in state = front on canvas).
for (const slot of H.state.slots.slice().reverse()) slotStack.append(renderSlotCard(slot, H));
bindSlotDrag(slotStack, panel, H.applySlotOrder);

panel.querySelector("#add-text")?.addEventListener("click", () => H.addPillSlot());
panel.querySelector("#add-type")?.addEventListener("click", () => H.addTypeSlot());
panel.querySelector("#add-shape")?.addEventListener("click", () => H.addShapeSlot());
panel.querySelector("#add-emoji")?.addEventListener("click", () => H.addEmojiSlot());
panel.querySelector("#add-photo")?.addEventListener("click", () => {
  void H.pickImageFiles(true).then((files) => {
    if (!files.length) return;
    H.addImagesFromFiles(files);
  });
});

H.bindRange("masterScale", "Scale", (v) => {
  H.state.masterScale = v / 10;
  H.paintPerfHints();
  H.live();
}, (v) => `${v.toFixed(0)}`);
H.bindRange("sizeRandom", "Size random", (v) => {
  H.state.sizeRandom = Math.round(v);
  H.live();
}, (v) => `${Math.round(v)}`);
H.bindRange("pillPad", "Shape padding", (v) => {
  H.state.pillPad = Math.round(v);
  H.syncInheritedPillPads();
  H.live();
}, (v) => `${Math.round(v)}`);
H.bindRange("shapeAmount", "Amount of shapes", (v) => {
  H.scaleFallingAmounts(Math.round(v));
  const input = panel.querySelector<HTMLInputElement>("#shapeAmount");
  if (input && Number(input.value) !== H.state.shapeAmount) {
    input.value = String(H.state.shapeAmount);
    H.paintRange(input);
  }
  H.paintPerfHints();
  H.live();
}, () => `${H.state.shapeAmount}`);
panel.querySelector("#reset-master")?.addEventListener("click", () => {
  H.remember();
  const next = H.demoState();
  H.state.masterScale = next.masterScale;
  H.state.sizeRandom = next.sizeRandom;
  H.state.pillPad = next.pillPad;
  H.state.textTracking = next.textTracking;
  H.scaleFallingAmounts(next.shapeAmount);
  H.live();
  H.renderPanel();
});

const globalFont = panel.querySelector<HTMLElement>("#global-font");
if (globalFont) {
  H.mountFontPick(globalFont, H.getAppliedFont(), (family) => {
    if (family) void H.applyFontEverywhere(family);
    else H.setAppliedFont("");
  }, "Keep per-slot fonts");
}
const globalWeight = panel.querySelector<HTMLElement>("#global-weight");
const family = H.sharedFamily() ?? "";
const weight = H.sharedWeight();
H.setGlobalWeightPick(globalWeight
  ? H.mountWeightPick(
      globalWeight,
      family,
      weight ?? 700,
      (next) => {
        void H.applyWeightEverywhere(next);
      },
      !family || weight == null,
    )
  : null);
panel.querySelector<HTMLInputElement>("#machine-font")?.addEventListener("change", (e) => {
  const family = (e.target as HTMLInputElement).value.trim();
  if (!family) {
    H.setMachineFont("");
    return;
  }
  void H.applyFontEverywhere(family);
});
panel.querySelector("#load-local-fonts")?.addEventListener("click", () => {
  void H.loadLocalFonts();
});
H.bindRange("gravity", "Gravity", (v) => {
  H.state.physics.gravity = v;
  H.live();
});
H.bindRange("speed", "Speed", (v) => {
  H.state.physics.speed = v;
  H.live();
});
H.bindRange("bounce", "Bounciness", (v) => {
  H.state.physics.bounce = v;
  H.live();
});
H.bindRange("friction", "Friction", (v) => {
  H.state.physics.friction = v;
  H.live();
});
H.bindRange("grip", "Grip", (v) => {
  H.state.physics.grip = v;
  H.live();
});
H.bindRange("spin", "Spin drag", (v) => {
  H.state.physics.spin = v;
  H.live();
});
H.bindRange("hold", "Floor pause", (v) => {
  H.state.physics.hold = v;
}, (v) => `${v.toFixed(2)}s`);
panel.querySelector("#reset-physics")?.addEventListener("click", () => {
  H.remember();
  H.state.physics = { ...DEFAULT_PHYSICS };
  H.live();
  H.renderPanel();
});
panel.querySelectorAll<HTMLButtonElement>("[data-layout-mode]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const next = btn.dataset.layoutMode === "layout";
    if (next === H.state.physics.layoutMode) return;
    void H.setLayoutMode(next);
  });
});
panel.querySelector<HTMLSelectElement>("#physics-complexity")?.addEventListener("change", (e) => {
  H.remember();
  H.state.physics.complexity = physicsComplexity((e.target as HTMLSelectElement).value);
  playClick();
  H.live();
});
panel.querySelector<HTMLButtonElement>("#audio-mic")?.addEventListener("click", () => {
  const on = !H.state.audioReact.enabled;
  H.remember();
  playSwitch(on);
  // Defer mute so the toggle click above can flush first.
  if (on) queueMicrotask(() => { void H.setAudioReactEnabled(true); });
  else void H.setAudioReactEnabled(false);
});
H.bindRange("audioSensitivity", "Sensitivity", (v) => {
  H.state.audioReact.sensitivity = Math.round(v);
}, (v) => `${Math.round(v)}`);
H.bindRange("audioBounce", "Bounce intensity", (v) => {
  H.state.audioReact.bounce = Math.round(v * 10) / 10;
}, (v) => `${(Math.round(v * 10) / 10).toFixed(1)}×`);
H.bindRange("audioBassBoost", "Bass boost", (v) => {
  H.state.audioReact.bassBoost = Math.round(v);
}, (v) => `+${Math.round(v)}%`);
H.bindRange("audioHueNudge", "Hue nudge", (v) => {
  H.state.audioReact.hueNudge = Math.round(v);
}, (v) => `${Math.round(v)}°`);
panel.querySelector("#reset-audio-react")?.addEventListener("click", () => {
  H.remember();
  void H.setAudioReactEnabled(false).then(() => {
    H.state.audioReact = { ...DEFAULT_AUDIO_REACT };
    H.renderPanel();
  });
});
H.bindRange("bloom", "Bloom", (v) => {
  H.state.post.bloom = Math.round(v);
  H.applyPost();
}, (v) => `${Math.round(v)}`);
H.bindRange("bloomOpacity", "Bloom opacity", (v) => {
  H.state.post.bloomOpacity = Math.round(v);
  H.applyPost();
}, (v) => `${Math.round(v)}`);
panel.querySelector<HTMLSelectElement>("#blend")?.addEventListener("change", (e) => {
  H.remember();
  H.state.post.blend = blendMode((e.target as HTMLSelectElement).value);
  playClick();
  H.applyPost();
});
H.bindRange("grain", "Grain", (v) => {
  H.state.post.grain = Math.round(v);
  H.applyPost();
}, (v) => `${Math.round(v)}`);
H.bindRange("vignette", "Vignette", (v) => {
  H.state.post.vignette = Math.round(v);
  H.applyPost();
}, (v) => `${Math.round(v)}`);
H.bindRange("saturate", "Saturate", (v) => {
  H.state.post.saturate = Math.round(v);
  H.applyPost();
}, (v) => `${Math.round(v)}`);
H.bindRange("hue", "Hue", (v) => {
  H.state.post.hue = Math.round(v);
  H.applyPost();
}, (v) => `${Math.round(v)}°`);

panel.querySelector<HTMLButtonElement>("#view-themes")?.addEventListener("click", () => H.openThemes());
panel.querySelectorAll<HTMLButtonElement>("[data-theme]").forEach((swatch) => {
  swatch.addEventListener("click", () => H.openThemeSwatch(swatch));
});
if (H.consumeRevealTheme()) {
  const row = panel.querySelector<HTMLElement>(".theme-row");
  const swatches = [...panel.querySelectorAll<HTMLButtonElement>("[data-theme]")];
  if (row && swatches.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const total = 0.5;
    const dur = swatches.length === 1 ? total : total * 0.64;
    const stagger = swatches.length > 1 ? (total - dur) / (swatches.length - 1) : 0;
    row.style.setProperty("--reveal-dur", `${dur}s`);
    row.style.setProperty("--reveal-stagger", `${stagger}s`);
    swatches.forEach((swatch) => swatch.classList.add("is-reveal"));
    const last = swatches[swatches.length - 1]!;
    const clear = (event: AnimationEvent) => {
      if (event.animationName !== "theme-swatch-reveal") return;
      swatches.forEach((swatch) => swatch.classList.remove("is-reveal"));
      row.style.removeProperty("--reveal-dur");
      row.style.removeProperty("--reveal-stagger");
      last.removeEventListener("animationend", clear);
    };
    last.addEventListener("animationend", clear);
  }
}
panel.scrollTop = scroll;
if (revealSlotId) {
  const card = panel.querySelector<HTMLElement>(`[data-id="${revealSlotId}"]`);
  if (!inserted && card) {
    // scrollIntoView can shift the whole document (looks like the screen slid off).
    // Keep the scroll inside #panel — especially after Listening / Audio was scrolled into view.
    H.scrollPanelTo(card);
  }
  if (card && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    card.classList.add("is-new");
    const clearNew = (event: AnimationEvent) => {
      if (event.animationName !== "slot-born") return;
      card.classList.remove("is-new");
      card.removeEventListener("animationend", clearNew);
    };
    card.addEventListener("animationend", clearNew);
  }
  // revealSlotId already consumed
}
if (inserted) H.growInsertedSlot(inserted);
H.setFocusSlotId(null);
H.paintMicTextAnim();
H.pinPageScroll();
}
