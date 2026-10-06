import { canvasFrame, keepSelectedCanvas, parseCanvasRatio, type CanvasFrame, type CanvasRatio } from "./canvas";
import { FEATURED_EMOJI } from "./emojis";
import { ICON_PRESETS, imageColliderId } from "./icons";
import { matchCollider, presetIdForSrc, simpleColliderKind } from "./iconMesh";
import {
  bundledWeights,
  BLEND_MODES,
  blendMode,
  DEFAULT_AUDIO_REACT,
  DEFAULT_PHYSICS,
  dropShadowOpacityOf,
  dropShadowRadiusOf,
  dropShadowDistanceOf,
  dropShadowColorOf,
  imageContrastOf,
  imageExposureOf,
  imageHueOf,
  imageSaturationOf,
  imageTemperatureLabel,
  imageTemperatureOf,
  physicsComplexity,
  normalizeBackground,
  defaultImageSlot,
  defaultTextSlot,
  defaultTypeSlot,
  defaultTextFieldSlot,
  demoState,
  isTextField,
  lineHeightSliderOf,
  textFieldLineHeight,
  textFieldBoxH,
  textFieldBoxW,
  TEXT_FIELD_BOX_MIN,
  shapeHasFill,
  uid,
  FALLBACK_WEIGHTS,
  FONTS,
  grainArithmeticAmount,
  type AppState,
  type ImageRemote,
  type ImageSlot,
  type Slot,
  type TextSlot,
  sanitizeTextMotion,
  weightName,
} from "./types";
import { clampTextFieldWords } from "./textField";
import { isMicActive, sampleOnset, startMic, stopMic } from "./audioReact";
import { activateFamily, listedFamilies, localWeights, maybeQueryLocalCatalog, queryLocalCatalog } from "./localFonts";
import { closeBackgroundUi, mountBackgroundPanel } from "./backgroundPanel";
import { backgroundImage, backgroundPaint, gridDivisions, logoBackdropColor, logoFill, logoSize, isSvgLogo } from "./background";
import { mountColorPicker } from "./colorPicker";
import { fillSample, gradientAngleOf, gradientEnd, gradientEndIndex, gradientPeriodMs, gradientScaleOf, gradientSpeedOf, pillGradient, pillSweepGradient } from "./pillFill";
import { applyRollingText, setTextAnimsPaused, stopTextAnim, textAnimSpeedOf } from "./textAnim";
import { logotypePillColor, pickTheme, resolveTextColor, resolveTextSwatchIndex } from "./theme";
import {
  LOGOTYPE_REVEAL_EASE,
  LOGOTYPE_REVEAL_MASK_S,
  LOGOTYPE_REVEAL_STAGGER_S,
  logotypeRevealMarkup,
  playLogotypeReveal,
  settleLogotypeReveal,
} from "./logotypeReveal";
import { logotypeInk, mountHeaderLogotype } from "./logotypeLive";
import { hintMediaExportOnce, mountProTip, releaseProTips, setProTipsEnabled } from "./proTip";
import { mountTooltips, setTooltipsEnabled } from "./tooltip";
import { createThemeShelf } from "./themeShelf";
import { blankPrefabText, blankState, preloadUltrapilledLogo, ultrapilledLogoAsset, templateLabel } from "./templates";
import {
  customTemplateLabel,
  deleteCustomTemplate,
  embedSlotImages,
  loadCustomTemplate,
  saveCustomTemplate,
} from "./customTemplates";
import pauseIcon from "@phosphor-icons/core/assets/regular/pause.svg?raw";
import playIcon from "@phosphor-icons/core/assets/regular/play.svg?raw";
import pillIcon from "@phosphor-icons/core/assets/regular/pill.svg?raw";
import textT from "@phosphor-icons/core/assets/regular/text-t.svg?raw";
import textAa from "@phosphor-icons/core/assets/regular/text-aa.svg?raw";
import shapesIcon from "@phosphor-icons/core/assets/regular/shapes.svg?raw";
import smileyIcon from "@phosphor-icons/core/assets/regular/smiley.svg?raw";
import uploadSimple from "@phosphor-icons/core/assets/regular/upload-simple.svg?raw";
import imagesIcon from "@phosphor-icons/core/assets/regular/images.svg?raw";
import gifIcon from "@phosphor-icons/core/assets/regular/gif.svg?raw";
import youtubeLogo from "@phosphor-icons/core/assets/regular/youtube-logo.svg?raw";
import eyeIcon from "@phosphor-icons/core/assets/regular/eye.svg?raw";
import eyeSlash from "@phosphor-icons/core/assets/regular/eye-slash.svg?raw";
import trashSimple from "@phosphor-icons/core/assets/regular/trash-simple.svg?raw";
import { mountExportPanel } from "./export/exportPanel";
import { isAboutOpen } from "./aboutPanel";
import { isBugReportOpen } from "./bugReport";
import { openSettings, isSettingsOpen } from "./settingsPanel";
import { openUnsplashImport, isUnsplashOpen } from "./unsplashPanel";
import { withUnsplashUtm } from "./unsplashApi";
import { openGiphyImport, isGiphyOpen } from "./giphyPanel";
import { openYouTubeImport, isYouTubeOpen } from "./youtubePanel";
import {
  DEFAULT_YOUTUBE_SIZE,
  type YouTubeClip,
} from "./youtube";
import { checkInput } from "./checkBox";
import { lsGet, lsSet } from "./legacyStorage";
import { getPrefs, setPrefs } from "./prefs";
import { askReconnect } from "./reconnectDialog";
import { askModeSelect, handoffModeSelectPreview, preloadModeSelectMedia, stopModeSelectPreview, warmModeSelectPreview, type AppMode, type ModeSelectChoice } from "./modeSelect";
import { askConfirm, askNotice, askPrompt } from "./confirmDialog";
import { clearDraft, readDraftJson, writeDraftJson } from "./project/draftStore";
import {
  defaultPillFileName,
  downloadPillJson,
  hydratePillImages,
  parsePillProject,
  readPillFile,
  serializePillProject,
  type PillProject,
} from "./project/pillFormat";
import { relinkProjectImages, relinkSlotImage } from "./remoteImage";
import { ensureTrim, ensureTrims, peekTrim } from "./trim";
import { isColorMask, isSvgSource, type ChipPose } from "./chipKinds";
import {
  attractorReachOf,
  attractorStrengthOf,
  ATTRACTOR_UI,
  DEFAULT_ATTRACTOR_REACH,
  DEFAULT_ATTRACTOR_STRENGTH,
} from "./attractors";
import {
  clampScaleForFreeTransform,
  freeTransformScaleMax,
  slotScaleSliderMax as softSlotScaleSliderMax,
} from "./slotScale";
import { fitTextFieldBox, trackingEm, trackingOf } from "./measure";
import { createWorld } from "./world";
import { cancelSlotDrag } from "./slotDrag";
import { bindUiClickSounds, bindUiTypeSounds, playButton, playClick, playCreate, playInvert, playNotify, playRemove, playSwipe, playSwitch, playTransition, setUiSoundsMuted } from "./uiSounds";
import gsap from "gsap";
import "./style.css";
import { compositionScale, placeZoomedFixed, syncUiScale, uiScale } from "./uiScale";
import { beginScrub, endScrub } from "./scrub";
import {
  bindRangeValueEdit,
  rangeCaptionHtml,
  setRangeCaptionValue,
  wireRangeCaptions,
} from "./rangeCaption";
import { mountCreatePanel, paintSectionResets, RESET_ICON, setSectionOpen, type CreatePanelHost, type InsertMotion } from "./panel/createPanel";
import { closeOtherSlots, setSlotOpen } from "./panel/slotCards";
import {
  assignCloseSlotMenu,
  closeSlotMenu,
  openSlotMenu,
  peekCloseSlotMenu,
  type LayerMove,
  type SlotMenuHost,
} from "./panel/slotMenu";
import { createPlaySession, type PlaySession } from "./playSession";
import {
  clampPageIndex,
  duplicatePage,
  LAYOUT_PAGE_MAX,
  pageFromLive,
  type LayoutPage,
} from "./layoutPages";
import { mountLayoutPageStrip, paintLayoutPageStrip } from "./layoutPageStrip";
import { paintPageThumb, paintPageThumbFromPage } from "./layoutPageThumb";

syncUiScale();
preloadModeSelectMedia();
preloadUltrapilledLogo();

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) throw new Error("#app missing");
const app: HTMLDivElement = appRoot;

const state = blankState();
let panelTab: "physics" | "background" | "export" = "physics";
const openSlots = new Set<string>();
/** Create-tab sections open by default: composition, color, typeface, what falls. */
const openSections = new Set(["composition", "color", "typeface", "what-falls"]);
/** Freeze all live text / gradient animations without clearing per-asset settings. */
let assetAnimsFrozen = false;
let pickedSlotId: string | null = null;
const pickedSlotIds = new Set<string>();
let focusSlotId: string | null = null;
let revealSlotId: string | null = null;
let revealTheme = false;
/** Keep restored chip poses on canvas; Trigger Physics lifts & re-falls them (no respawn). */
let posePinned = false;
/** Layout-mode slides. Live slots/background are always pages[pageIndex]. */
let pages: LayoutPage[] = [];
let pageIndex = 0;
let presenting = false;
const pageThumbs = new Map<string, string>();
let pageThumbTimer = 0;
/** Play/physics session; assigned once helpers below exist. */
let session!: PlaySession;
let draftTimer = 0;
let lastDraftJson = "";
let draftReady = false;

let insertMotion: InsertMotion | null = null;

let tintPicker: { anchor: HTMLElement; close: () => void } | null = null;

const world = createWorld();

app.innerHTML = `
  <div class="app ui-hidden">
    <div class="app-intro" id="app-intro" aria-hidden="true">
      <img class="app-intro__gif" alt="" width="300" height="300" />
      <div class="app-intro__logo" aria-hidden="true">
        ${logotypeRevealMarkup()}
      </div>
    </div>
    <div class="stage" id="stage">
      <div class="stage-veil" id="stage-veil" hidden>
        <div data-side="top"></div>
        <div data-side="right"></div>
        <div data-side="bottom"></div>
        <div data-side="left"></div>
      </div>
        <div class="playfield" id="playfield">
        <div class="grid-layer" id="grid-layer" hidden aria-hidden="true"></div>
        <div class="logo-layer" id="logo-layer" hidden></div>
        <!-- Outside .pile so Create mix (e.g. Difference) can't invert the glow. -->
        <div class="logo-bloom-layer" aria-hidden="true">
          <div class="logo-bloom-blur">
            <div class="logo-bloom-host" id="logo-bloom" hidden></div>
          </div>
        </div>
        <div class="pile">
          <div class="chip-layer"></div>
          <div class="bloom-layer" aria-hidden="true">
            <div class="bloom-blur">
              <div class="bloom-inner"></div>
            </div>
          </div>
          <div class="chip-chrome-layer" aria-hidden="true"></div>
        </div>
        <svg class="post-grain-defs" width="0" height="0" aria-hidden="true" focusable="false">
          <filter id="ultrapilled-grain" color-interpolation-filters="sRGB" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" result="noise" />
            <feColorMatrix in="noise" type="matrix" result="mono" values="0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1" />
            <feComposite id="ultrapilled-grain-composite" in="SourceGraphic" in2="mono" operator="arithmetic" k1="0" k2="1" k3="0" k4="0" />
          </filter>
        </svg>
        <!-- Backdrop filter (not a playfield filter) so Difference still sees the grid. -->
        <div class="post-grain" aria-hidden="true"></div>
        <div class="post-vignette" aria-hidden="true"></div>
        <canvas class="phys-debug" id="phys-debug" aria-hidden="true" hidden></canvas>
        <p class="canvas-welcome" id="canvas-welcome" hidden></p>
        <div class="canvas-nudge" id="canvas-nudge" hidden aria-live="polite"></div>
        <p class="bg-credit" id="bg-credit" hidden>
          Photo by <a data-credit-by target="_blank" rel="noopener noreferrer"></a>
          on <a data-credit-home target="_blank" rel="noopener noreferrer">Unsplash</a>
        </p>
      </div>
    </div>
    <nav class="page-strip" id="page-strip" hidden aria-label="Pages"></nav>
    <header class="topbar">
      <button type="button" class="logotype" aria-label="Ultrapilled — start over" data-tip="Start over">
        <span class="logotype__label">Ultrapilled</span>
        ${logotypeRevealMarkup()}
      </button>
    </header>
    <aside class="dev-panel" id="dev-panel" hidden>
      <h2 class="dev-panel__title">Dev</h2>
      <p class="dev-panel__hint">Chrome corner radii. Physics outlines on.</p>
      <label class="field"><span data-dev-radius-label="panel">Panel 44px</span>
        <input type="range" data-dev-radius="panel" min="0" max="48" step="1" value="44" />
      </label>
      <label class="field"><span data-dev-radius-label="settings">Settings 44px</span>
        <input type="range" data-dev-radius="settings" min="0" max="48" step="1" value="44" />
      </label>
      <label class="field"><span data-dev-radius-label="reconnect">Reconnect 16px</span>
        <input type="range" data-dev-radius="reconnect" min="0" max="48" step="1" value="16" />
      </label>
      <label class="field"><span data-dev-radius-label="menu">Slot menu 20px</span>
        <input type="range" data-dev-radius="menu" min="0" max="48" step="1" value="20" />
      </label>
      <label class="field"><span data-dev-radius-label="tip">Pro tip 20px</span>
        <input type="range" data-dev-radius="tip" min="0" max="48" step="1" value="20" />
      </label>
      <label class="field"><span data-dev-radius-label="pop">Popovers 12px</span>
        <input type="range" data-dev-radius="pop" min="0" max="48" step="1" value="12" />
      </label>
      <label class="field"><span data-dev-radius-label="topbar">Topbar 8px</span>
        <input type="range" data-dev-radius="topbar" min="0" max="48" step="1" value="8" />
      </label>
      <label class="field"><span data-dev-radius-label="tooltip">Tooltip 10px</span>
        <input type="range" data-dev-radius="tooltip" min="0" max="48" step="1" value="10" />
      </label>
    </aside>
    <aside class="panel">
      <div class="panel-actions">
        <button type="button" class="pill play-btn" id="play" data-tip="Run the fall — press again to restart — shortcut P">
          <span class="play-btn__label">
            <svg class="play-btn__bolt" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            <span class="play-btn__text">Trigger Physics</span>
          </span>
        </button>
        <div class="panel-actions__bar">
          <button type="button" class="pill panel-util" id="loop" aria-pressed="false" data-tip="Keep the floor opening so the fall never ends">
            <span class="loop-chip__text">Loop</span>
          </button>
          <button type="button" class="pill panel-util" id="reset-defaults" data-tip="Restore default sliders and options">Reset</button>
          <button type="button" class="pill panel-util" id="open-settings" data-tip="Sound, theme, and preferences">Settings</button>
        </div>
        <button type="button" class="pill" id="copy-settings" hidden data-tip="Copy the current settings as text">Copy settings</button>
      </div>
      <div class="panel-tabs" role="tablist" aria-label="Panel">
        <button type="button" class="panel-tabs__tab is-active" id="tab-physics" role="tab" aria-selected="true" data-tip="Build what falls and how it moves">Create</button>
        <button type="button" class="panel-tabs__tab" id="tab-background" role="tab" aria-selected="false" data-tip="Stage color, grid, and logo">Background</button>
        <button type="button" class="panel-tabs__tab" id="tab-export" role="tab" aria-selected="false" data-tip="Save stills, sequences, or video">Export</button>
        <span class="panel-tabs__line" id="tab-line" data-tab="physics" aria-hidden="true"></span>
      </div>
      <div class="panel-scroll" id="panel"></div>
    </aside>
  </div>
`;

bindUiClickSounds(app);
bindUiTypeSounds(app);

const stage = app.querySelector<HTMLElement>("#stage")!;
const playfield = app.querySelector<HTMLElement>("#playfield")!;
const stageVeil = app.querySelector<HTMLElement>("#stage-veil")!;
const physDebugCanvas = app.querySelector<HTMLCanvasElement>("#phys-debug")!;
const canvasWelcome = app.querySelector<HTMLElement>("#canvas-welcome")!;
const canvasNudge = app.querySelector<HTMLElement>("#canvas-nudge")!;
const bgCredit = playfield.querySelector<HTMLElement>("#bg-credit")!;
bgCredit.addEventListener("pointerdown", (event) => event.stopPropagation());
bgCredit.addEventListener("click", (event) => event.stopPropagation());
let physDebugOn = false;
let nudgeFadeTimer = 0;
let shapeBlinkTimer = 0;

const WELCOME_KEY = "welcomeDismissed";
let welcomeDismissed = false;
try {
  welcomeDismissed = lsGet(WELCOME_KEY) === "1";
} catch {
  /* private mode */
}

function paintWelcome() {
  // First-shape nudge owns the empty canvas until Create / Templates adds something.
  if (state.slots.length > 0 || world.chipCount() > 0) clearCanvasNudge();
  canvasWelcome.textContent = state.physics.layoutMode
    ? "Add pieces from Create, then place them on the canvas"
    : "Press spacebar to trigger physics";
  const nudgeUp = !canvasNudge.hidden;
  const show = !welcomeDismissed && !running && !posePinned && world.chipCount() === 0 && !nudgeUp;
  gsap.killTweensOf(canvasWelcome);
  if (show) {
    canvasWelcome.hidden = false;
    gsap.set(canvasWelcome, { autoAlpha: 1 });
    return;
  }
  if (canvasWelcome.hidden) return;
  if (reducedMotion()) {
    canvasWelcome.hidden = true;
    gsap.set(canvasWelcome, { clearProps: "opacity,visibility" });
    return;
  }
  gsap.to(canvasWelcome, {
    autoAlpha: 0,
    duration: 0.35,
    ease: "power1.in",
    onComplete: () => {
      canvasWelcome.hidden = true;
      gsap.set(canvasWelcome, { clearProps: "opacity,visibility" });
    },
  });
}

function dismissWelcome() {
  clearCanvasNudge();
  if (welcomeDismissed) {
    paintWelcome();
    return;
  }
  welcomeDismissed = true;
  try {
    lsSet(WELCOME_KEY, "1");
  } catch {
    /* private mode */
  }
  paintWelcome();
}
const panel = app.querySelector<HTMLElement>("#panel")!;
const panelShell = app.querySelector<HTMLElement>(".panel")!;
const themeShelf = createThemeShelf({
  panel: panelShell,
  getColors: () => state.theme,
  onApply(colors, stage) {
    remember();
    state.theme = [...colors];
    headerLogotype.retarget();
    if (stage) {
      state.stageColor = stage;
      state.background.kind = "solid";
      applyBackground();
    }
    for (const slot of state.slots) {
      slot.color = undefined;
      slot.gradientColor = undefined;
      if (slot.kind !== "text") continue;
      slot.gradientFrom = undefined;
      slot.textColor = undefined;
      slot.textColorIndex = undefined;
    }
    syncLogotypeAccent();
    applyLogo();
    live();
    revealTheme = true;
    renderPanel();
  },
});

let localFamilies: string[] = [];
let machineFont = "";
let appliedFont = "";
let globalWeightPick: { reflect(family: string, weight: number | null): void } | null = null;

function fontChoices(): { id: string; label: string; group: "bundled" | "local" }[] {
  const bundled = FONTS.map((font) => ({
    id: font.id,
    label: font.label,
    group: "bundled" as const,
  }));
  const taken = new Set(bundled.map((font) => font.id.toLowerCase()));
  const local = localFamilies
    .filter((name) => !taken.has(name.toLowerCase()))
    .map((name) => ({ id: name, label: name, group: "local" as const }));
  return [...bundled, ...local];
}

type FontMenuItem = { id: string; label: string; group: "keep" | "bundled" | "local" | "extra" };

function fontMenuItems(selected: string, emptyLabel?: string): FontMenuItem[] {
  const fonts = fontChoices();
  const known = new Set(fonts.map((font) => font.id));
  const items: FontMenuItem[] = fonts.map((font) => ({
    id: font.id,
    label: font.label,
    group: font.group,
  }));
  if (selected && !known.has(selected)) {
    const bundledCount = fonts.filter((font) => font.group === "bundled").length;
    items.splice(bundledCount, 0, { id: selected, label: selected, group: "extra" });
  }
  if (emptyLabel) items.unshift({ id: "", label: emptyLabel, group: "keep" });
  return items;
}

function weightsFor(family: string): number[] {
  const bundled = bundledWeights(family);
  if (bundled) return [...bundled];
  const local = localWeights(family);
  if (local.length) return local;
  return [...FALLBACK_WEIGHTS];
}

function nearestWeight(family: string, weight: number): number {
  const weights = weightsFor(family);
  return weights.reduce((best, next) => (Math.abs(next - weight) < Math.abs(best - weight) ? next : best));
}

function chosenWeight(family: string, weight: number): number {
  const weights = weightsFor(family);
  return weights.includes(weight) ? weight : nearestWeight(family, weight);
}

function allTextSlots(): TextSlot[] {
  return state.slots.filter((slot): slot is TextSlot => slot.kind === "text");
}

function sharedFamily(): string | null {
  const slots = allTextSlots();
  if (!slots.length) return null;
  const family = slots[0].fontFamily;
  return slots.every((slot) => slot.fontFamily === family) ? family : null;
}

function sharedWeight(): number | null {
  const slots = allTextSlots();
  if (!slots.length || !sharedFamily()) return null;
  const weight = slots[0].fontWeight;
  return slots.every((slot) => slot.fontWeight === weight) ? weight : null;
}

async function settleFont(family: string, weight: number) {
  await activateFamily(family);
  await document.fonts.load(`${weight} 28px "${family}"`).catch(() => undefined);
}

const bundledFamilies = new Set<string>(FONTS.map((font) => font.id));

/** Canvas measureText uses fallback metrics until the face is loaded. */
async function ensureTextFonts(slots: Slot[]): Promise<void> {
  const textSlots = slots.filter((slot): slot is TextSlot => slot.kind === "text");
  const families = [...new Set(textSlots.map((slot) => slot.fontFamily).filter(Boolean))];
  await Promise.all(
    families.filter((family) => !bundledFamilies.has(family)).map((family) => activateFamily(family)),
  );
  const groups = new Map<string, { weight: number; family: string; sample: string }>();
  for (const slot of textSlots) {
    const key = `${slot.fontWeight}\0${slot.fontFamily}`;
    const group = groups.get(key) ?? { weight: slot.fontWeight, family: slot.fontFamily, sample: "" };
    group.sample += `${slot.text || " "} `;
    groups.set(key, group);
  }
  await Promise.all(
    [...groups.values()].map((group) =>
      document.fonts.load(`${group.weight} 28px "${group.family}"`, group.sample).catch(() => undefined),
    ),
  );
}

function fontTriggerLabel(selected: string, emptyLabel?: string): string {
  if (!selected) return emptyLabel ?? "";
  return fontChoices().find((font) => font.id === selected)?.label ?? selected;
}

let closeFontMenu: (restoreFocus?: boolean) => void = () => {};

function mountFontPick(
  host: HTMLElement,
  selected: string,
  onPick: (id: string) => void,
  emptyLabel?: string,
) {
  let current = selected;
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "font-pick-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  const value = document.createElement("span");
  value.className = "font-pick-value";
  const chevron = document.createElement("span");
  chevron.className = "font-pick-chevron";
  chevron.setAttribute("aria-hidden", "true");
  trigger.append(value, chevron);
  const syncLabel = () => {
    value.textContent = fontTriggerLabel(current, emptyLabel);
    value.style.fontFamily = current ? `"${current}", sans-serif` : "";
    value.style.fontWeight = current ? "400" : "";
  };
  syncLabel();
  host.replaceChildren(trigger);
  trigger.addEventListener("click", () => {
    if (trigger.getAttribute("aria-expanded") === "true") {
      closeFontMenu();
      return;
    }
    openFontMenu(trigger, () => current, emptyLabel, (id) => {
      current = id;
      syncLabel();
      onPick(id);
    });
  });
}

function openFontMenu(
  trigger: HTMLButtonElement,
  getValue: () => string,
  emptyLabel: string | undefined,
  onPick: (id: string) => void,
) {
  closeFontMenu();
  const abort = new AbortController();
  const { signal } = abort;
  const menu = document.createElement("div");
  menu.className = "font-menu font-menu--fonts";
  menu.setAttribute("role", "dialog");
  menu.setAttribute("aria-label", "Fonts");
  const head = document.createElement("div");
  head.className = "font-menu-head";
  const title = document.createElement("p");
  title.className = "font-menu-title";
  title.textContent = "Fonts";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "font-menu-close icon-hover";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.dataset.tip = "Close";
  closeBtn.innerHTML = `<span aria-hidden="true">✕</span>`;
  head.append(title, closeBtn);
  const search = document.createElement("input");
  search.type = "search";
  search.className = "font-menu-search";
  search.placeholder = "Search fonts...";
  search.setAttribute("aria-label", "Search fonts");
  search.autocomplete = "off";
  search.spellcheck = false;
  const list = document.createElement("div");
  list.className = "font-menu-list";
  list.id = "font-menu-list";
  list.setAttribute("role", "listbox");
  menu.append(head, search, list);
  document.body.append(menu);
  trigger.setAttribute("aria-expanded", "true");
  trigger.setAttribute("aria-controls", list.id);

  const base = fontMenuItems(getValue(), emptyLabel);
  let shown = base;
  let active = Math.max(0, shown.findIndex((item) => item.id === getValue()));

  const scrollActiveIntoView = () => {
    const btn = list.querySelectorAll<HTMLElement>(".font-menu-item")[active];
    if (!btn) return;
    const listRect = list.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    if (btnRect.top < listRect.top) list.scrollTop -= listRect.top - btnRect.top;
    else if (btnRect.bottom > listRect.bottom) list.scrollTop += btnRect.bottom - listRect.bottom;
  };

  const paint = () => {
    list.replaceChildren();
    if (!shown.length) {
      const empty = document.createElement("p");
      empty.className = "font-menu-empty";
      empty.textContent = "No fonts match";
      list.append(empty);
      return;
    }
    let seenLocal = false;
    shown.forEach((item, index) => {
      if (item.group === "local" && !seenLocal) {
        seenLocal = true;
        const heading = document.createElement("div");
        heading.className = "font-menu-group";
        heading.textContent = "This computer";
        list.append(heading);
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "font-menu-item";
      btn.tabIndex = -1;
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", String(item.id === getValue()));
      if (item.id === getValue()) btn.classList.add("is-on");
      if (index === active) btn.classList.add("is-active");
      if (item.id) {
        btn.style.fontFamily = `"${item.id}", sans-serif`;
        if (item.group === "local" || item.group === "extra") void activateFamily(item.id);
      } else {
        btn.classList.add("font-menu-item--plain");
      }
      btn.textContent = item.label;
      btn.addEventListener("click", () => choose(item.id));
      list.append(btn);
    });
    scrollActiveIntoView();
  };

  const markActive = () => {
    list.querySelectorAll(".font-menu-item").forEach((btn, index) => {
      btn.classList.toggle("is-active", index === active);
    });
    scrollActiveIntoView();
  };

  const choose = (id: string) => {
    const pick = onPick;
    closeFontMenu();
    pick(id);
  };

  search.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();
    shown = query
      ? base.filter(
          (item) =>
            item.label.toLowerCase().includes(query) || item.id.toLowerCase().includes(query),
        )
      : base;
    active = 0;
    paint();
  }, { signal });

  search.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!shown.length) return;
      active = Math.min(shown.length - 1, active + 1);
      markActive();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!shown.length) return;
      active = Math.max(0, active - 1);
      markActive();
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = shown[active];
      if (item) choose(item.id);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeFontMenu(true);
    }
  }, { signal });

  list.addEventListener("mousedown", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest(".font-menu-item")) event.preventDefault();
  });

  const place = () => {
    if (!trigger.isConnected) {
      closeFontMenu();
      return;
    }
    const panelRect = panel.getBoundingClientRect();
    const rect = trigger.getBoundingClientRect();
    if (rect.bottom < panelRect.top || rect.top > panelRect.bottom) {
      closeFontMenu();
      return;
    }
    const shellRect = panelShell.getBoundingClientRect();
    const s = uiScale();
    const gap = Math.max(16, 24 * s);
    const preferred = Math.max(320, 400 * s);
    const minWidth = 280;
    const maxLeft = shellRect.left - gap;
    const available = maxLeft - 8;
    const width = available >= preferred ? preferred : Math.max(minWidth, available);
    menu.style.width = `${width}px`;
    menu.style.maxHeight = "none";
    menu.style.height = `${shellRect.height}px`;
    menu.style.left = `${Math.max(8, maxLeft - width)}px`;
    menu.style.bottom = "auto";
    menu.style.top = `${shellRect.top}px`;
  };

  let leaving = false;
  const closeCurrent = (restoreFocus = false) => {
    abort.abort();
    if (trigger.isConnected) {
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus();
    }
    const finish = () => {
      gsap.killTweensOf(menu);
      menu.remove();
      if (closeFontMenu === closeCurrent) closeFontMenu = () => {};
    };
    if (leaving || reducedMotion()) {
      finish();
      return;
    }
    leaving = true;
    menu.style.pointerEvents = "none";
    gsap.to(menu, { autoAlpha: 0, duration: 0.22, ease: "power2.in", onComplete: finish });
  };
  closeFontMenu = closeCurrent;

  closeBtn.addEventListener("click", () => closeFontMenu(true), { signal });

  document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (menu.contains(target) || trigger.contains(target)) return;
    closeFontMenu();
  }, { signal, capture: true });
  panel.addEventListener("scroll", place, { signal, passive: true });
  window.addEventListener("resize", place, { signal });

  place();
  paint();

  const focusSearch = () => {
    if (!search.isConnected) return;
    search.focus({ preventScroll: true });
  };
  gsap.set(menu, { autoAlpha: 0 });
  if (reducedMotion()) {
    gsap.set(menu, { clearProps: "visibility,opacity", autoAlpha: 1 });
    focusSearch();
  } else {
    gsap.to(menu, {
      autoAlpha: 1,
      duration: 0.28,
      ease: "power3.out",
      onStart: focusSearch,
    });
  }
}

function mountWeightPick(
  host: HTMLElement,
  family: string,
  weight: number,
  onPick: (weight: number) => void,
  mixed = false,
) {
  let currentFamily = family;
  let current = family ? chosenWeight(family, weight) : weight;
  let showMixed = mixed || !family;
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "font-pick-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-label", "Weight");
  const value = document.createElement("span");
  value.className = "font-pick-value";
  const chevron = document.createElement("span");
  chevron.className = "font-pick-chevron";
  chevron.setAttribute("aria-hidden", "true");
  trigger.append(value, chevron);

  const sync = () => {
    const weights = currentFamily ? weightsFor(currentFamily) : [];
    const locked = weights.length < 2;
    trigger.disabled = locked;
    value.textContent = !currentFamily || showMixed ? "Mixed" : weightName(current);
    if (locked) trigger.setAttribute("aria-expanded", "false");
  };
  sync();
  host.replaceChildren(trigger);
  trigger.addEventListener("click", () => {
    if (trigger.disabled) return;
    if (trigger.getAttribute("aria-expanded") === "true") {
      closeFontMenu();
      return;
    }
    openWeightMenu(trigger, currentFamily, () => (showMixed ? -1 : current), (next) => {
      showMixed = false;
      current = next;
      sync();
      onPick(next);
    });
  });

  return {
    setFamily(next: string) {
      currentFamily = next;
      showMixed = false;
      current = chosenWeight(next, current);
      sync();
      return current;
    },
    reflect(nextFamily: string, nextWeight: number | null) {
      currentFamily = nextFamily;
      showMixed = !nextFamily || nextWeight == null;
      if (nextFamily && nextWeight != null) current = chosenWeight(nextFamily, nextWeight);
      sync();
    },
  };
}

function openWeightMenu(
  trigger: HTMLButtonElement,
  family: string,
  getValue: () => number,
  onPick: (weight: number) => void,
) {
  const choices = weightsFor(family).map((weight) => ({
    value: weight,
    label: weightName(weight),
    style: { fontFamily: `"${family}", sans-serif`, fontWeight: String(weight) },
  }));
  openChoiceMenu(trigger, choices, getValue(), onPick);
}

type Choice<T> = {
  value: T;
  label: string;
  style?: Partial<CSSStyleDeclaration>;
  onRemove?: () => void;
};

function openChoiceMenu<T>(
  trigger: HTMLButtonElement,
  choices: Choice<T>[],
  selected: T,
  onPick: (value: T) => void,
) {
  closeFontMenu();
  const abort = new AbortController();
  const { signal } = abort;
  const menu = document.createElement("div");
  menu.className = "font-menu";
  const list = document.createElement("div");
  list.className = "font-menu-list";
  list.tabIndex = -1;
  list.setAttribute("role", "listbox");
  menu.append(list);
  document.body.append(menu);
  trigger.setAttribute("aria-expanded", "true");
  trigger.setAttribute("aria-controls", "choice-menu-list");
  list.id = "choice-menu-list";

  let active = Math.max(0, choices.findIndex((choice) => choice.value === selected));
  const buttons: HTMLButtonElement[] = [];

  const markActive = () => {
    buttons.forEach((btn, index) => btn.classList.toggle("is-active", index === active));
    buttons[active]?.scrollIntoView({ block: "nearest" });
  };

  choices.forEach((choice, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "font-menu-item";
    btn.tabIndex = -1;
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", String(choice.value === selected));
    if (choice.value === selected) btn.classList.add("is-on");
    if (index === active) btn.classList.add("is-active");
    const label = document.createElement("span");
    label.className = "font-menu-item__label";
    label.textContent = choice.label;
    btn.append(label);
    if (choice.onRemove) {
      const remove = document.createElement("span");
      remove.className = "font-menu-item__remove";
      remove.setAttribute("role", "button");
      remove.setAttribute("aria-label", `Delete ${choice.label}`);
      remove.dataset.tip = `Delete ${choice.label}`;
      remove.textContent = "×";
      remove.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeFontMenu();
        choice.onRemove?.();
      });
      btn.append(remove);
    }
    if (choice.style) Object.assign(btn.style, choice.style);
    btn.addEventListener("click", () => {
      const pick = onPick;
      closeFontMenu();
      pick(choice.value);
    });
    list.append(btn);
    buttons.push(btn);
  });

  list.addEventListener("mousedown", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest(".font-menu-item")) event.preventDefault();
  }, { signal });

  list.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      active = Math.min(choices.length - 1, active + 1);
      markActive();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      active = Math.max(0, active - 1);
      markActive();
    } else if (event.key === "Enter") {
      event.preventDefault();
      buttons[active]?.click();
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeFontMenu(true);
    }
  }, { signal });

  const place = () => {
    if (!trigger.isConnected) {
      closeFontMenu();
      return;
    }
    const panelRect = panel.getBoundingClientRect();
    const rect = trigger.getBoundingClientRect();
    if (rect.bottom < panelRect.top || rect.top > panelRect.bottom) {
      closeFontMenu();
      return;
    }
    const gap = 4;
    const s = uiScale();
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const openUp = spaceBelow < 160 * s && spaceAbove > spaceBelow;
    menu.style.width = `${rect.width}px`;
    menu.style.maxHeight = `${Math.max(120 * s, Math.min(280 * s, openUp ? spaceAbove : spaceBelow))}px`;
    menu.style.left = `${Math.max(8, rect.left)}px`;
    if (openUp) {
      menu.style.top = "auto";
      menu.style.bottom = `${window.innerHeight - rect.top + gap}px`;
    } else {
      menu.style.bottom = "auto";
      menu.style.top = `${rect.bottom + gap}px`;
    }
  };

  const closeCurrent = (restoreFocus = false) => {
    abort.abort();
    menu.remove();
    if (trigger.isConnected) {
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus();
    }
    if (closeFontMenu === closeCurrent) closeFontMenu = () => {};
  };
  closeFontMenu = closeCurrent;

  document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (menu.contains(target) || trigger.contains(target)) return;
    closeFontMenu();
  }, { signal, capture: true });
  panel.addEventListener("scroll", place, { signal, passive: true });
  window.addEventListener("resize", place, { signal });

  place();
  buttons[active]?.scrollIntoView({ block: "nearest" });
  list.focus();
}

function applyBackground() {
  const paint = backgroundPaint(state.background, state.canvas, state.stageColor);
  stage.style.background = state.stageColor;
  playfield.style.backgroundColor = paint.color;
  playfield.style.backgroundImage = paint.image;
  playfield.style.backgroundSize = paint.size;
  playfield.style.backgroundPosition = paint.position;
  playfield.style.backgroundRepeat = paint.repeat;
  applyGrid();
  applyLogo();
  applyUnsplashCredit();
  syncLogotypeAccent();
}

function applyUnsplashCredit() {
  const by = bgCredit.querySelector<HTMLAnchorElement>("[data-credit-by]");
  const home = bgCredit.querySelector<HTMLAnchorElement>("[data-credit-home]");
  const credit = state.background.kind === "image" ? state.background.imageCredit : null;
  if (!credit || !by || !home) {
    bgCredit.hidden = true;
    return;
  }
  try {
    if (new URL(credit.profileUrl).protocol !== "https:") {
      bgCredit.hidden = true;
      return;
    }
  } catch {
    bgCredit.hidden = true;
    return;
  }
  by.textContent = credit.photographer;
  by.href = credit.profileUrl;
  home.href = withUnsplashUtm("https://unsplash.com");
  bgCredit.hidden = false;
}

/** Hold grid invisible until Mode Select preview finishes dumping. */
let gridHoldForHandoff = false;

function applyGrid() {
  const layer = playfield.querySelector<HTMLElement>("#grid-layer");
  if (!layer) return;
  const { background, canvas } = state;
  const on = background.grid;
  const { cols, rows } = gridDivisions(canvas, background.gridDensity);
  layer.style.setProperty("--grid-color", background.gridColor || "#ffffff");
  layer.style.setProperty("--grid-opacity", `${(background.gridOpacity ?? 0) / 100}`);
  layer.style.setProperty("--grid-cols", String(cols));
  layer.style.setProperty("--grid-rows", String(rows));

  // Under Mode Select / dump: keep paint ready but invisible so it doesn't pop in.
  if (shell.classList.contains("ui-hidden") || gridHoldForHandoff) {
    layer.classList.remove("is-boot-reveal");
    layer.hidden = !on;
    layer.style.setProperty("--grid-reveal", "0");
    if (on) layer.removeAttribute("aria-hidden");
    else layer.setAttribute("aria-hidden", "true");
    return;
  }

  layer.classList.remove("is-boot-reveal");
  if (on) {
    layer.hidden = false;
    layer.removeAttribute("aria-hidden");
    // Start from 0 if we were off so the swift fade runs.
    if (layer.style.getPropertyValue("--grid-reveal").trim() !== "1") {
      layer.style.setProperty("--grid-reveal", "0");
      // Force a style flush so the 0→1 transition has a from-value.
      void layer.offsetWidth;
      layer.style.setProperty("--grid-reveal", "1");
    } else {
      layer.style.setProperty("--grid-reveal", "1");
    }
    return;
  }

  layer.setAttribute("aria-hidden", "true");
  layer.style.setProperty("--grid-reveal", "0");
  const hide = () => {
    if (state.background.grid) return;
    layer.hidden = true;
  };
  layer.addEventListener("transitionend", hide, { once: true });
  window.setTimeout(hide, 220);
}

/** Fade grid in over 1s once the Mode Select preview is gone. */
function bootRevealGrid() {
  const layer = playfield.querySelector<HTMLElement>("#grid-layer");
  gridHoldForHandoff = false;
  if (!layer || !state.background.grid) {
    applyGrid();
    if (state.background.logoId) applyLogo();
    releaseProTips();
    return;
  }
  const { background, canvas } = state;
  const { cols, rows } = gridDivisions(canvas, background.gridDensity);
  const strength = (background.gridOpacity ?? 0) / 100;
  layer.style.setProperty("--grid-color", background.gridColor || "#ffffff");
  layer.style.setProperty("--grid-opacity", `${strength}`);
  layer.style.setProperty("--grid-cols", String(cols));
  layer.style.setProperty("--grid-rows", String(rows));
  layer.hidden = false;
  layer.removeAttribute("aria-hidden");
  layer.classList.remove("is-boot-reveal");
  // Drive opacity directly — more reliable than transitioning a CSS variable under a dump cut.
  layer.style.setProperty("--grid-reveal", "1");
  gsap.fromTo(
    layer,
    { opacity: 0 },
    {
      opacity: strength,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1,
      ease: "power1.out",
      onComplete: () => {
        gsap.set(layer, { clearProps: "opacity" });
        layer.style.setProperty("--grid-reveal", "1");
        releaseProTips();
      },
    },
  );
  if (state.background.logoId) applyLogo();
}

const logoImages = new Map<string, HTMLImageElement>();
/** Decode warm by src so the Ultrapilled mark is ready before first mask paint. */
const logoSrcReady = new Map<string, Promise<HTMLImageElement | null>>();
let logoNode: HTMLElement | null = null;
let logoGlow: HTMLElement | null = null;
const LOGO_REVEAL_S = 0.5;
const LOGO_REVEAL_EASE = "circ.out";
/** logoId last revealed — skip replay on resize/tint. */
let logoRevealKey = "";

function warmLogoSrc(src: string): Promise<HTMLImageElement | null> {
  const hit = logoSrcReady.get(src);
  if (hit) return hit;
  const pending = new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
    void image.decode?.().catch(() => {});
  });
  logoSrcReady.set(src, pending);
  return pending;
}

// Same cache applyLogo waits on — bake + decode during boot/intro.
void warmLogoSrc(ultrapilledLogoAsset().dataUrl);

function logoRevealNodes(): HTMLElement[] {
  return [logoNode, logoGlow].filter((node): node is HTMLElement => Boolean(node));
}

function logoWantsReveal(): boolean {
  return state.template === "ultrapilled" && Boolean(state.background.logoId);
}

function holdLogoReveal(): boolean {
  // Boot / Mode Select handoff only — `h` also toggles ui-hidden, but the stage logo is artwork.
  return !logotypeLive || gridHoldForHandoff;
}

function playLogoReveal(nodes: HTMLElement[], key: string) {
  logoRevealKey = key;
  gsap.killTweensOf(nodes);
  if (reducedMotion()) {
    gsap.set(nodes, { scale: 1 });
    return;
  }
  gsap.fromTo(nodes, { scale: 0 }, { scale: 1, duration: LOGO_REVEAL_S, ease: LOGO_REVEAL_EASE });
}

function syncLogoReveal() {
  const nodes = logoRevealNodes();
  if (!nodes.length) return;
  if (!logoWantsReveal()) {
    gsap.killTweensOf(nodes);
    gsap.set(nodes, { scale: 1 });
    logoRevealKey = "";
    return;
  }
  if (holdLogoReveal()) {
    gsap.killTweensOf(nodes);
    gsap.set(nodes, { scale: 0 });
    logoRevealKey = "";
    return;
  }
  const key = state.background.logoId;
  if (logoRevealKey === key) return;
  playLogoReveal(nodes, key);
}

function applyLogo() {
  const layer = playfield.querySelector<HTMLElement>("#logo-layer");
  const glowHost = playfield.querySelector<HTMLElement>("#logo-bloom");
  const glowLayer = playfield.querySelector<HTMLElement>(".logo-bloom-layer");
  if (!layer) return;
  const background = state.background;
  const file = backgroundImage(background.logoId ?? "");
  const clearGlow = () => {
    if (logoGlow) gsap.killTweensOf(logoGlow);
    if (!glowHost) return;
    glowHost.hidden = true;
    glowHost.replaceChildren();
    logoGlow = null;
  };
  // Default "normal" follows Create mix so a white mark punches the grid like falling assets.
  const logoMix = background.logoBlend === "normal" ? state.post.blend : background.logoBlend;
  stage.style.setProperty("--logo-blend", blendMode(logoMix));
  const front = Boolean(background.logoFront);
  layer.classList.toggle("is-front", front);
  glowLayer?.classList.toggle("is-front", front);
  if (!file) {
    gsap.killTweensOf(logoRevealNodes());
    logoRevealKey = "";
    layer.hidden = true;
    layer.replaceChildren();
    logoNode = null;
    clearGlow();
    return;
  }
  const draw = (image: HTMLImageElement | null) => {
    if (background.logoId !== state.background.logoId) return;
    const imgW = file.width || image?.naturalWidth || image?.width || 1;
    const imgH = file.height || image?.naturalHeight || image?.height || 1;
    const size = logoSize(playfield.clientWidth, playfield.clientHeight, imgW, imgH, background.logoScale || 1);
    const svg = isSvgLogo(file.name, file.src);
    const fill = svg ? logoFill(state.background, state.theme) : null;
    const mode = fill ? "mask" : "image";
    const place = (host: HTMLElement, node: HTMLElement | null) => {
      host.hidden = false;
      if (!node || node.dataset.mode !== mode || node.dataset.id !== background.logoId) {
        if (node) gsap.killTweensOf(node);
        const next = document.createElement(fill ? "div" : "img");
        next.className = "logo-mark";
        next.dataset.mode = mode;
        next.dataset.id = background.logoId;
        if (next instanceof HTMLImageElement) {
          next.src = file.src;
          next.alt = "";
          next.draggable = false;
        }
        node = next;
        host.replaceChildren(next);
      }
      node.style.width = `${size.width}px`;
      node.style.height = `${size.height}px`;
      if (fill) {
        node.style.background = fill;
        const mask = `url("${file.src}")`;
        node.style.maskImage = mask;
        node.style.webkitMaskImage = mask;
      }
      return node;
    };
    logoNode = place(layer, logoNode);
    // Bloom copy stays outside .pile so post blend (e.g. difference) can't invert it.
    if (svg && glowHost) logoGlow = place(glowHost, logoGlow);
    else clearGlow();
    syncLogoReveal();
  };
  // Wait for SVG decode before reveal — first mask paint otherwise pops mid-scale.
  if (file.width > 0 && file.height > 0 && isSvgLogo(file.name, file.src) && logoFill(state.background, state.theme)) {
    const logoId = background.logoId;
    void warmLogoSrc(file.src).then((image) => {
      if (logoId !== state.background.logoId) return;
      if (image) logoImages.set(logoId, image);
      draw(image);
    });
    return;
  }
  const cached = logoImages.get(background.logoId);
  if (cached?.complete) {
    draw(cached);
    return;
  }
  const logoId = background.logoId;
  void warmLogoSrc(file.src).then((image) => {
    if (logoId !== state.background.logoId) return;
    if (image) logoImages.set(logoId, image);
    if (image || (file.width > 0 && file.height > 0)) draw(image);
  });
}

function applyPost() {
  const amount = state.post.bloom / 100;
  const perf = getPrefs().performance;
  const bloomScale = perf ? 0.33 : 1;
  const bloom = amount * 48 * bloomScale;
  const bloomOpacity = `${(state.post.bloomOpacity / 100) * amount}`;
  document.documentElement.style.setProperty("--bloom", `${bloom}px`);
  document.documentElement.style.setProperty("--bloom-opacity", bloomOpacity);
  stage.style.setProperty("--bloom", `${bloom}px`);
  stage.style.setProperty("--bloom-opacity", bloomOpacity);
  stage.style.setProperty("--post-blend", state.post.blend);
  const logoMix = state.background.logoBlend === "normal" ? state.post.blend : state.background.logoBlend;
  stage.style.setProperty("--logo-blend", blendMode(logoMix));
  const grainA = grainArithmeticAmount(state.post.grain);
  const grainComp = playfield.querySelector("#ultrapilled-grain-composite");
  if (grainComp) {
    grainComp.setAttribute("k3", String(grainA));
    grainComp.setAttribute("k4", String(-grainA / 2));
  }
  playfield.classList.toggle("has-grain", state.post.grain > 0);
  stage.style.setProperty("--post-vig", `${state.post.vignette / 140}`);
  stage.style.setProperty("--post-sat", `${state.post.saturate / 100}`);
  const hueDeg = Math.round(state.post.hue + audioHueOffset);
  const hue = `${((hueDeg % 360) + 360) % 360}deg`;
  document.documentElement.style.setProperty("--post-hue", hue);
  stage.style.setProperty("--post-hue", hue);
  stage.classList.toggle("has-bloom", state.post.bloom > 0 && state.post.bloomOpacity > 0);
  stage.classList.toggle("perf-bloom", perf);
  stage.classList.toggle("has-sat", state.post.saturate !== 100);
  stage.classList.toggle("has-hue", hueDeg % 360 !== 0);
}

const exportController = {
  prepare: async () => {
    await Promise.all([ensureTrims(state.slots), ensureTextFonts(state.slots)]);
  },
  stageSize: () => {
    const frame = currentFrame();
    return { width: frame.width, height: frame.height, scale: layoutScale(frame) };
  },
  draws: () => world.draws(),
  poses: () => world.fallStartPoses() ?? (world.chipCount() > 0 ? world.poses() : []),
  replayFall: () => world.fallStartPoses() != null,
  state: () => state,
  async saveProject() {
    const json = serializePillProject(await embedSlotImages(currentPillProject()));
    downloadPillJson(json, defaultPillFileName());
    lastDraftJson = json;
    void clearDraft().catch(() => {});
  },
  async loadProject(file: File) {
    const project = await readPillFile(file);
    remember();
    await applyPillProject(project);
    lastDraftJson = serializePillProject(project);
    void clearDraft().catch(() => {});
  },
};

function currentPillProject(): PillProject {
  snapshotActivePage();
  const frame = currentFrame();
  const current = pages[pageIndex];
  return {
    state: structuredClone(state),
    poses: current?.poses ?? (world.chipCount() > 0 ? world.poses() : []),
    frame: { width: frame.width, height: frame.height },
    images: [],
    loop: repeat,
    pages: pages.map((page) => structuredClone(page)),
    pageIndex,
  };
}

function scheduleDraft() {
  if (!draftReady || !getPrefs().rememberLast) return;
  window.clearTimeout(draftTimer);
  draftTimer = window.setTimeout(() => {
    void writeDraftNow();
  }, 800);
}

let draftSaveWarned = false;

async function writeDraftNow() {
  if (!getPrefs().rememberLast) return;
  try {
    // Bake blob: uploads into data URLs — otherwise reconnect restores poses but
    // photos are dead forever, and Trigger Physics looks like the stock template.
    const json = serializePillProject(await embedSlotImages(currentPillProject()));
    if (json === lastDraftJson) return;
    await writeDraftJson(json);
    lastDraftJson = json;
    draftSaveWarned = false;
  } catch {
    if (draftSaveWarned) return;
    draftSaveWarned = true;
    void askNotice({
      title: "Draft not saved",
      body: "This browser wouldn’t keep the unsaved session. Download a .pill file if you want a copy.",
    });
  }
}

function liveFrameSize() {
  const frame = currentFrame();
  return { width: Math.max(1, frame.width), height: Math.max(1, frame.height) };
}

function snapshotActivePage() {
  const cur = pages[pageIndex];
  const poses =
    state.slots.length === 0 ? [] : world.chipCount() > 0 ? world.poses() : (cur?.poses ?? []);
  const page = pageFromLive({
    id: cur?.id,
    slots: state.slots,
    poses,
    background: state.background,
    frame: liveFrameSize(),
  });
  if (!pages.length) {
    pages = [page];
    pageIndex = 0;
    return;
  }
  pages[pageIndex] = page;
}

function captureLiveThumb(): Promise<string | null> {
  if (!state.physics.layoutMode) return Promise.resolve(null);
  const page = pages[pageIndex];
  if (!page) return Promise.resolve(null);
  const id = page.id;
  const draws = world.draws();
  const background = structuredClone(state.background);
  const frame = liveFrameSize();
  return paintPageThumb({
    draws,
    state,
    background,
    stageWidth: frame.width,
    stageHeight: frame.height,
  })
    .then((url) => {
      pageThumbs.set(id, url);
      return url;
    })
    .catch(() => null);
}

function scheduleLiveThumb() {
  if (!state.physics.layoutMode) return;
  window.clearTimeout(pageThumbTimer);
  pageThumbTimer = window.setTimeout(() => captureLiveThumb(), 400);
}

function peekPageThumb(index: number): string | null {
  const id = pages[index]?.id;
  return id ? (pageThumbs.get(id) ?? null) : null;
}

async function loadPageThumb(index: number): Promise<string | null> {
  const page = pages[index];
  if (!page) return null;
  const cached = pageThumbs.get(page.id);
  if (cached) return cached;
  if (index === pageIndex) return captureLiveThumb();
  try {
    const url = await paintPageThumbFromPage(page, state);
    pageThumbs.set(page.id, url);
    return url;
  } catch {
    return null;
  }
}

function resetPages() {
  pageThumbs.clear();
  pages = [
    pageFromLive({
      slots: state.slots,
      poses: world.chipCount() > 0 ? world.poses() : [],
      background: state.background,
      frame: liveFrameSize(),
    }),
  ];
  pageIndex = 0;
  void captureLiveThumb();
  paintPages();
}

function pinRestoredPoses(poses: ChipPose[], frame: { width: number; height: number }) {
  if (!poses.length) return false;
  dismissWelcome();
  posePinned = true;
  running = true;
  paused = false;
  session.phase = "holding";
  session.holdStarted = performance.now();
  session.droppedAt = performance.now();
  session.settledSince = 0;
  world.restore(
    state.slots,
    state.physics,
    stage,
    fitScale(),
    state.theme,
    state.pillPad,
    state.textTracking,
    state.sizeRandom,
    poses,
    frame,
  );
  world.freezePile();
  world.sync();
  world.setRunning(true);
  paintTransport();
  return true;
}

function clearPickQuiet() {
  endChipEdit(false);
  closeSlotMenu();
  pickedSlotId = null;
  pickedSlotIds.clear();
  world.setPicked(null);
}

async function applyActivePage() {
  const page = pages[pageIndex];
  if (!page) return;
  clearPickQuiet();
  openSlots.clear();
  state.slots = structuredClone(page.slots);
  state.background = normalizeBackground(page.background);
  for (const slot of state.slots) {
    if (slot.kind === "text") sanitizeTextMotion(slot);
    captureBaseline(slot);
  }
  applyBackground();
  await Promise.all([ensureTrims(state.slots), ensureTextFonts(state.slots)]);
  if (!pinRestoredPoses(page.poses, page.frame)) {
    world.clear();
    live();
  } else {
    live({ quiet: true });
  }
  renderPanel();
  paintWelcome();
  paintPages();
  scheduleDraft();
}

function selectLayoutPage(index: number) {
  if (!state.physics.layoutMode) return;
  const next = clampPageIndex(index, pages.length);
  if (!pages.length || next === pageIndex) return;
  if (!presenting) remember();
  snapshotActivePage();
  void captureLiveThumb();
  pageIndex = next;
  playSwipe();
  void applyActivePage();
}

function stepPresent(dir: number) {
  if (!presenting || pages.length < 2) return;
  selectLayoutPage((pageIndex + dir + pages.length) % pages.length);
}

function setPresenting(on: boolean) {
  if (on && !state.physics.layoutMode) return;
  if (on === presenting) return;
  presenting = on;
  if (on) {
    shell.classList.remove("ui-hidden");
    clearPickQuiet();
    closeSlotMenu();
    closeFontMenu();
  }
  shell.classList.toggle("is-presenting", on);
  playTransition(!on);
  resize();
  paintPages();
}

function addLayoutPage() {
  if (!state.physics.layoutMode || presenting) return;
  snapshotActivePage();
  if (pages.length >= LAYOUT_PAGE_MAX) return;
  remember();
  void captureLiveThumb();
  const source = pages[pageIndex]!;
  const copy = duplicatePage(source);
  const thumb = pageThumbs.get(source.id);
  if (thumb) pageThumbs.set(copy.id, thumb);
  pages.splice(pageIndex + 1, 0, copy);
  pageIndex += 1;
  playCreate();
  void applyActivePage();
}

function removeLayoutPage() {
  if (!state.physics.layoutMode || presenting || pages.length < 2) return;
  remember();
  const gone = pages[pageIndex];
  if (gone) pageThumbs.delete(gone.id);
  pages.splice(pageIndex, 1);
  pageIndex = clampPageIndex(pageIndex, pages.length);
  playRemove();
  void applyActivePage();
}

function paintPages() {
  const root = app.querySelector<HTMLElement>("#page-strip");
  if (!root) return;
  paintLayoutPageStrip(root, pageStripHost);
}

const pageStripHost = {
  layoutMode: () => state.physics.layoutMode,
  presenting: () => presenting,
  soundMuted: () => {
    const prefs = getPrefs();
    return !prefs.soundOn || !prefs.uiSounds;
  },
  count: () => Math.max(1, pages.length),
  index: () => pageIndex,
  select: selectLayoutPage,
  add: addLayoutPage,
  remove: removeLayoutPage,
  present() {
    setPresenting(!presenting);
  },
  toggleSound() {
    const prefs = getPrefs();
    const muted = !prefs.soundOn || !prefs.uiSounds;
    if (muted) setPrefs({ soundOn: true, uiSounds: true });
    else setPrefs({ uiSounds: false });
    paintPages();
  },
  peekThumb: peekPageThumb,
  loadThumb: loadPageThumb,
};

function projectFontFamilies(project: PillProject): string[] {
  const names: string[] = [];
  const take = (slots: Slot[]) => {
    for (const slot of slots) {
      if (slot.kind === "text") names.push(slot.fontFamily);
    }
  };
  take(project.state.slots);
  for (const page of project.pages) take(page.slots);
  return names;
}

async function offerLocalFontsForProject(project: PillProject) {
  await maybeQueryLocalCatalog({
    families: projectFontFamilies(project),
    bundled: bundledFamilies,
    askAllow: () =>
      askConfirm({
        title: "Allow local fonts",
        body: "This project uses fonts installed on this computer. Allow access so they match the original file.",
        confirmLabel: "Allow",
        cancelLabel: "Not now",
      }),
  });
  localFamilies = listedFamilies();
}

async function applyPillProject(project: PillProject, opts?: { pinPoses?: boolean }) {
  setPresenting(false);
  await offerLocalFontsForProject(project);
  await relinkProjectImages(project);
  hydratePillImages(project.images);
  adoptState(project.state);
  pages = project.pages.length ? project.pages.map((page) => structuredClone(page)) : [];
  pageIndex = clampPageIndex(project.pageIndex, pages.length);
  pageThumbs.clear();
  snapshotActivePage();
  repeat = project.loop;
  paintTransport();
  applyBackground();
  applyPost();
  syncCanvas(false);
  const fontSlots = [...state.slots, ...pages.flatMap((page) => page.slots)];
  await Promise.all([ensureTrims(state.slots), ensureTextFonts(fontSlots)]);

  const hasPoses = Boolean(opts?.pinPoses !== false && project.poses.length);
  if (hasPoses) pinRestoredPoses(project.poses, project.frame);
  else {
    posePinned = false;
    session.setRunning(false);
  }
  renderPanel();
  // Quiet: a noisy live() remesh would unpin the restored pile and start a
  // fall/hold/(dump) cycle — Trigger Physics then respawns from slots and the
  // arranged scene is gone.
  live(hasPoses ? { quiet: true } : undefined);
  paintPages();
  scheduleDraft();
}

const settingsController = {
  prefsChanged() {
    const prefs = getPrefs();
    setProTipsEnabled(prefs.tipsOn);
    setTooltipsEnabled(prefs.tooltipsOn);
    applyPost();
    paintPages();
    if (!prefs.rememberLast) {
      window.clearTimeout(draftTimer);
      lastDraftJson = "";
      void clearDraft().catch(() => {});
    } else {
      scheduleDraft();
    }
  },
  layoutMode() {
    return state.physics.layoutMode;
  },
  setLayoutMode(next: boolean) {
    return setLayoutMode(next);
  },
};

function paintPanelTabs() {
  const tabs = [
    ["physics", document.querySelector("#tab-physics")],
    ["background", document.querySelector("#tab-background")],
    ["export", document.querySelector("#tab-export")],
  ] as const;
  for (const [id, tab] of tabs) {
    tab?.classList.toggle("is-active", panelTab === id);
    tab?.setAttribute("aria-selected", String(panelTab === id));
  }
  document.querySelector("#tab-line")?.setAttribute("data-tab", panelTab);
}

function fallingImages(): ImageSlot[] {
  return state.slots.filter((slot): slot is ImageSlot => slot.kind === "image" && Boolean(slot.src || slot.emoji));
}

function clampImageAmounts() {
  for (const slot of fallingImages()) {
    slot.amount = Math.max(1, Math.min(AMOUNT_SOFT_CAP, Math.round(slot.amount)));
  }
}

function recountShapes() {
  clampImageAmounts();
  state.shapeAmount = fallingImages().reduce((sum, slot) => sum + Math.max(1, Math.round(slot.amount)), 0);
}

/** Soft limits keep live play near 60 fps; export still uses the same amounts. */
const AMOUNT_SOFT_CAP = 8;
const SHAPE_TOTAL_SOFT_CAP = 36;
const SHAPE_PERF_WARN = 20;

function shapeAmountRange() {
  const count = fallingImages().length;
  const per = AMOUNT_SOFT_CAP;
  return { min: count, max: Math.max(12, Math.min(count * per, SHAPE_TOTAL_SOFT_CAP)) };
}

/** Split `total` whole items across weights. The returned counts add up to `total`. */
function shareTotal(weights: number[], total: number): number[] {
  const count = weights.length;
  if (count === 0 || total <= 0) return weights.map(() => 0);
  const safe = weights.map((weight) => Math.max(0, weight));
  const sum = safe.reduce((acc, weight) => acc + weight, 0);
  const exact = sum > 0 ? safe.map((weight) => (total * weight) / sum) : safe.map(() => total / count);
  const counts = exact.map((value) => Math.floor(value));
  let left = total - counts.reduce((acc, value) => acc + value, 0);
  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index);
  let cursor = 0;
  while (left > 0) {
    counts[order[cursor % count].index] += 1;
    left -= 1;
    cursor += 1;
  }
  return counts;
}

/** Scale per-shape amounts so they sum to `total`, keeping at least 1 and at most the soft cap. */
function scaleShapeAmounts(weights: number[], total: number): number[] {
  const count = weights.length;
  const cap = AMOUNT_SOFT_CAP;
  if (count === 0) return [];
  const goal = Math.max(count, Math.min(count * cap, Math.round(total)));
  const counts = shareTotal(weights.map((weight) => Math.max(1, weight)), goal - count).map((extra) => extra + 1);
  for (let pass = 0; pass < count + 1; pass++) {
    let overflow = 0;
    for (let i = 0; i < count; i++) {
      if (counts[i] > cap) {
        overflow += counts[i] - cap;
        counts[i] = cap;
      }
    }
    if (overflow === 0) return counts;
    const room = counts.map((amount, index) => (amount < cap ? index : -1)).filter((index) => index >= 0);
    if (room.length === 0) return counts;
    const give = shareTotal(
      room.map((index) => Math.max(1, cap - counts[index])),
      overflow,
    );
    room.forEach((index, slot) => {
      counts[index] += give[slot];
    });
  }
  return counts.map((amount) => Math.max(1, Math.min(cap, amount)));
}

function paintImageAmounts() {
  for (const slot of fallingImages()) {
    const card = panel.querySelector<HTMLElement>(`.slot-card[data-id="${slot.id}"]`);
    if (!card) continue;
    const input = card.querySelector<HTMLInputElement>('[data-key="amount"]');
    if (input) {
      input.value = String(slot.amount);
      paintRange(input);
    }
    const caption = card.querySelector("[data-range-label='amount']");
    if (caption) setRangeCaptionValue(caption, String(slot.amount));
    paintFieldReset(card, slot, "amount");
  }
}

function paintPerfHints() {
  const amountHint = panel.querySelector<HTMLElement>("#amount-perf-hint");
  if (amountHint) amountHint.hidden = state.shapeAmount < SHAPE_PERF_WARN;
}

function scaleFallingAmounts(total: number) {
  const images = fallingImages();
  if (!images.length) {
    state.shapeAmount = 0;
    return;
  }
  const counts = scaleShapeAmounts(images.map((slot) => slot.amount), total);
  images.forEach((slot, index) => {
    slot.amount = counts[index];
  });
  recountShapes();
  paintImageAmounts();
}

function slotMenuHost(): SlotMenuHost {
  return {
    state,
    panel,
    world,
    remember,
    live,
    endGesture,
    renderPanel,
    liveChip,
    pickSlot,
    openSlots,
    get gesture() {
      return gesture;
    },
    get tintPicker() {
      return tintPicker;
    },
    setTintPicker(value) {
      tintPicker = value;
    },
    bindSlotMenuDismiss,
    uploadedShape,
    isRasterUpload,
    iconCanGradient,
    storeGradient,
    recallGradient,
    pickImageFiles,
    assignImageFile,
    assignVideoFile,
    isVideoFile,
    editChipText,
    duplicateSlot,
    removeSlot,
    invertSlot,
    flipSlot,
    alignSlotStraight,
    copySlotStyle,
    pasteSlotStyle,
    canPasteSlotStyle,
    canMoveSlotLayer,
    moveSlotLayer,
    relinkSlotContent,
  };
}

function createPanelHost(): CreatePanelHost {
  return {
    state,
    panel,
    openSlots,
    pickedSlotIds,
    openSections,
    remember,
    live,
    endGesture,
    renderPanel,
    openSlotMenu(x, y, id) {
      openSlotMenu(x, y, id, slotMenuHost());
    },
    get focusSlotId() {
      return focusSlotId;
    },
    get pointerHeld() {
      return pointerHeld;
    },
    get gesture() {
      return gesture;
    },
    get assetAnimsFrozen() {
      return assetAnimsFrozen;
    },
    showPick,
    pickSlot,
    releasePick,
    duplicateSlot,
    removeSlot,
    chipPreview,
    uploadedShape,
    iconSrc,
    iconPreviewFill,
    shapeSwatch,
    settingLabel,
    resetControl,
    fieldDirty,
    textTintRow,
    tintRow,
    gradientTintRow,
    blendField,
    dropShadowField,
    attractorField,
    chosenWeight,
    mountFontPick,
    mountWeightPick,
    reflectGlobalWeight,
    paintFieldReset,
    settleFont,
    liveChip,
    bindSlotInputs,
    bindTint,
    bindFreezeAnims,
    iconCanGradient,
    isRasterUpload,
    colliderOf,
    isImageFile,
    isMediaFile,
    isVideoFile,
    assignImageFile,
    assignVideoFile,
    slotScaleSliderMax,
    escapeAttr,
    IMAGE_FILE_ACCEPT: MEDIA_FILE_ACCEPT,
    AMOUNT_SOFT_CAP,
    shapeAmountRange,
    activeTemplateLabel,
    get machineFont() {
      return machineFont;
    },
    setMachineFont(value) {
      machineFont = value;
    },
    get localFamilies() {
      return localFamilies;
    },
    SHAPE_PERF_WARN,
    selectCanvas,
    openCanvasStagePicker,
    loadTemplate,
    saveCurrentAsTemplate,
    closeFontMenu,
    removeCustomTemplate,
    openChoiceMenu,
    loadSavedTemplate,
    applySlotOrder,
    addPillSlot,
    addTypeSlot,
    addTextFieldSlot,
    addShapeSlot,
    addEmojiSlot,
    pickImageFiles,
    addImagesFromFiles,
    bindRange,
    paintPerfHints,
    syncInheritedPillPads,
    scaleFallingAmounts,
    paintRange,
    getAppliedFont() {
      return appliedFont;
    },
    setAppliedFont(value) {
      appliedFont = value;
    },
    applyFontEverywhere,
    sharedFamily,
    sharedWeight,
    setGlobalWeightPick(pick) {
      globalWeightPick = pick;
    },
    applyWeightEverywhere,
    loadLocalFonts,
    setLayoutMode,
    setAudioReactEnabled,
    openThemes() {
      themeShelf.open();
    },
    openThemeSwatch,
    consumeRevealTheme() {
      if (!revealTheme) return false;
      revealTheme = false;
      return true;
    },
    consumeRevealSlotId() {
      const id = revealSlotId;
      revealSlotId = null;
      return id;
    },
    scrollPanelTo,
    growInsertedSlot,
    setFocusSlotId(id) {
      focusSlotId = id;
    },
    paintMicTextAnim,
    pinPageScroll,
    applyPost,
    demoState,
  };
}

function renderPanel() {
  const inserted = insertMotion;
  insertMotion = null;
  cancelSlotDrag();
  const scroll = panel.scrollTop;
  closeFontMenu();
  closeSlotMenu();
  closeBackgroundUi();
  tintPicker?.close();
  paintPanelTabs();
  recountShapes();
  if (panelTab === "export") {
    mountExportPanel(panel, exportController, scroll);
    return;
  }
  if (panelTab === "background") {
    mountBackgroundPanel(panel, {
      state: () => state,
      remember,
      endGesture,
      apply: applyBackground,
      refresh: renderPanel,
      showing: () => panelTab === "background",
    }, scroll);
    return;
  }
  mountCreatePanel(panel, createPanelHost(), scroll, inserted);
}

function syncInheritedPillPads() {
  panel.querySelectorAll<HTMLInputElement>('[data-key="pillPad"]').forEach((input) => {
    const id = input.closest<HTMLElement>("[data-id]")?.dataset.id;
    const slot = state.slots.find((item) => item.id === id);
    if (!slot || slot.kind !== "text" || slot.pillPad != null) return;
    input.value = String(state.pillPad);
    paintRange(input);
    const caption = input.closest("label")?.querySelector("[data-range-label]");
    if (caption) setRangeCaptionValue(caption, String(state.pillPad));
  });
}

function paintRange(input: HTMLInputElement) {
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 100;
  const pct = ((Number(input.value) - min) / (max - min || 1)) * 100;
  input.style.setProperty("--pct", `${pct}%`);
}

function bindRange(
  id: string,
  _label: string,
  onChange: (value: number) => void,
  format: (value: number) => string = (value) => value.toFixed(2),
) {
  const input = panel.querySelector<HTMLInputElement>(`#${id}`);
  const caption = panel.querySelector(`[data-range-label="${id}"]`);
  if (input) paintRange(input);
  let scrubbing = false;
  const startScrub = () => {
    if (scrubbing) return;
    scrubbing = true;
    beginScrub();
  };
  const stopScrub = () => {
    if (!scrubbing) return;
    scrubbing = false;
    endScrub();
  };
  input?.addEventListener("pointerdown", startScrub);
  input?.addEventListener("pointerup", stopScrub);
  input?.addEventListener("pointercancel", stopScrub);
  if (caption && input) bindRangeValueEdit(caption, input);
  input?.addEventListener("input", () => {
    startScrub();
    remember(`range:${id}`);
    const value = Number(input.value);
    paintRange(input);
    onChange(value);
    if (caption) setRangeCaptionValue(caption, format(value));
    paintSectionResets(panel, state);
  });
  const finish = () => {
    stopScrub();
    if (pointerHeld || gesture !== `range:${id}`) return;
    endGesture();
  };
  input?.addEventListener("change", finish);
  input?.addEventListener("blur", () => {
    stopScrub();
    if (pointerHeld) return;
    finish();
  });
}

function openOnly(id: string) {
  openSlots.clear();
  openSlots.add(id);
  pickedSlotId = id;
  pickedSlotIds.clear();
  pickedSlotIds.add(id);
  world.setPicked(id);
}

function isSvgFile(file: File): boolean {
  if (file.type === "image/svg+xml") return true;
  return /\.svg$/i.test(file.name);
}

function isGifFile(file: File): boolean {
  if (/^image\/gif$/i.test(file.type)) return true;
  return /\.gif$/i.test(file.name);
}

function isRasterFile(file: File): boolean {
  if (/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) return true;
  return /\.(png|jpe?g|webp|gif)$/i.test(file.name);
}

function isImageFile(file: File): boolean {
  return isSvgFile(file) || isRasterFile(file);
}

function isVideoFile(file: File): boolean {
  if (/^video\/(mp4|quicktime)$/i.test(file.type)) return true;
  return /\.(mp4|m4v)$/i.test(file.name);
}

function isMediaFile(file: File): boolean {
  return isImageFile(file) || isVideoFile(file);
}

const IMAGE_FILE_ACCEPT =
  ".svg,.png,.jpg,.jpeg,.webp,.gif,image/svg+xml,image/png,image/jpeg,image/webp,image/gif";

const MEDIA_FILE_ACCEPT =
  `${IMAGE_FILE_ACCEPT},.mp4,.m4v,video/mp4,video/quicktime`;

/** Open the OS file picker for image / gif / mp4 files. Resolves [] if cancelled. */
function pickImageFiles(multiple = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = MEDIA_FILE_ACCEPT;
    input.multiple = multiple;
    input.hidden = true;
    const finish = (files: File[]) => {
      input.remove();
      // Native file dialogs can collapse the stage for a frame; restore before import.
      resize();
      resolve(files);
    };
    input.addEventListener("change", () => {
      finish([...(input.files ?? [])].filter(isMediaFile));
    });
    input.addEventListener("cancel", () => finish([]));
    document.body.append(input);
    input.click();
  });
}

const IMPORT_MAX_PX = 400;
const IMPORT_SVG_MIN_WIDTH_PX = 250;

/** On-canvas long edge from native res. SVGs floor to a findable width; rasters never upscale. */
function importSlotSize(nativeW: number, nativeH: number, opts?: { minWidth?: number }): number {
  const long = Math.max(nativeW, nativeH, 1);
  let displayLong = Math.min(IMPORT_MAX_PX, long);
  if (opts?.minWidth) {
    const widthFrac = Math.max(nativeW, 1) / long;
    displayLong = Math.max(displayLong, opts.minWidth / widthFrac);
  }
  // Author in framed-canvas units; viewport scale is applied later via fitScale().
  const scale = Math.max(0.001, state.masterScale * currentFrame().scale);
  return Math.max(8, displayLong / scale);
}

/** Set slot image from a local file; awaits trim (and SVG collider match) so aspect updates before remesh. */
function assignImageFile(slot: ImageSlot, file: File, remote?: ImageRemote): Promise<void> {
  const url = URL.createObjectURL(file);
  const svg = isSvgFile(file);
  slot.src = url;
  slot.name = file.name || "image";
  slot.emoji = undefined;
  slot.youtube = undefined;
  slot.video = undefined;
  slot.remote = remote;
  slot.collider = undefined;
  slot.tint = undefined;
  slot.inverted = undefined;
  slot.exposure = undefined;
  slot.contrast = undefined;
  slot.saturation = undefined;
  slot.hue = undefined;
  slot.temperature = undefined;
  if (svg) {
    slot.radius = 0;
    slot.stroked = undefined;
  }
  if (isGifFile(file)) hintMediaExportOnce();
  return ensureTrim(url, file.name)
    .then((trim) => {
      if (slot.src !== url) return null;
      if (trim) {
        slot.size = importSlotSize(trim.nativeW, trim.nativeH, svg ? { minWidth: IMPORT_SVG_MIN_WIDTH_PX } : undefined);
      }
      if (!svg) return null;
      return matchCollider(peekTrim(url)?.displaySrc ?? url);
    })
    .then((id: string | null) => {
      if (slot.src !== url) return;
      // Uploads only offer box/sphere; map round silhouette matches to sphere.
      if (id === "sphere" || (id && simpleColliderKind(id) === "circle")) {
        slot.collider = "sphere";
      }
    })
    .catch(() => {
      /* keep block collider */
    });
}

/** Grab a compact JPEG still from a loaded video element (for panel thumbs). */
function captureVideoPoster(video: HTMLVideoElement): string | undefined {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return undefined;
  const max = 480;
  const scale = Math.min(1, max / Math.max(vw, vh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(vw * scale));
  canvas.height = Math.max(1, Math.round(vh * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  try {
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return undefined;
  }
}

/** Buffer an mp4 into a muted looping video chip. Shows the canvas loader until canplay. */
function assignVideoFile(slot: ImageSlot, file: File): Promise<void> {
  const url = URL.createObjectURL(file);
  slot.src = "";
  slot.name = file.name || "video";
  slot.emoji = undefined;
  slot.youtube = undefined;
  slot.remote = undefined;
  slot.tint = undefined;
  slot.inverted = undefined;
  slot.exposure = undefined;
  slot.contrast = undefined;
  slot.saturation = undefined;
  slot.hue = undefined;
  slot.temperature = undefined;
  slot.collider = undefined;
  if (slot.radius == null) slot.radius = 12;
  slot.size = DEFAULT_YOUTUBE_SIZE;
  slot.video = { src: url, ready: false };

  return new Promise<void>((resolve) => {
    const probe = document.createElement("video");
    probe.preload = "auto";
    probe.muted = true;
    probe.playsInline = true;
    probe.src = url;

    let settled = false;
    const finish = (width?: number, height?: number, poster?: string) => {
      if (settled) return;
      settled = true;
      probe.removeAttribute("src");
      probe.load();
      if (slot.video?.src !== url) {
        resolve();
        return;
      }
      const w = Math.max(1, width ?? 16);
      const h = Math.max(1, height ?? 9);
      slot.size = importSlotSize(w, h);
      slot.video = {
        src: url,
        ready: true,
        width: w,
        height: h,
        poster: poster || undefined,
      };
      resolve();
    };

    const captureThenFinish = () => {
      const poster = captureVideoPoster(probe);
      finish(probe.videoWidth, probe.videoHeight, poster);
    };

    probe.addEventListener(
      "canplay",
      () => {
        // Skip the often-black first frame; land a little into the clip.
        const target = Math.min(0.35, Math.max(0, (Number.isFinite(probe.duration) ? probe.duration : 1) * 0.08));
        if (target <= 0.02 || Math.abs(probe.currentTime - target) < 0.04) {
          captureThenFinish();
          return;
        }
        const onSeeked = () => {
          probe.removeEventListener("seeked", onSeeked);
          captureThenFinish();
        };
        probe.addEventListener("seeked", onSeeked);
        try {
          probe.currentTime = target;
        } catch {
          captureThenFinish();
        }
      },
      { once: true },
    );
    probe.addEventListener(
      "error",
      () => {
        if (slot.video?.src === url) slot.video = { src: url, ready: true, width: 16, height: 9 };
        finish(16, 9);
      },
      { once: true },
    );
  });
}

function addImagesFromFiles(
  files: Iterable<File>,
  at?: { clientX: number; clientY: number },
  remote?: ImageRemote,
) {
  const media = [...files].filter(isMediaFile);
  if (!media.length) return;
  remember();
  dismissWelcome();
  const slots: ImageSlot[] = [];
  const jobs: Promise<void>[] = [];
  for (const file of media) {
    const slot = defaultImageSlot({
      colorIndex: state.slots.length % state.theme.length,
      name: isVideoFile(file) ? "video" : "image",
      amount: 1,
      radius: isVideoFile(file) ? 12 : 0,
    });
    captureBaseline(slot);
    state.slots.push(slot);
    slots.push(slot);
    jobs.push(
      isVideoFile(file) ? assignVideoFile(slot, file) : assignImageFile(slot, file, remote),
    );
  }
  const last = slots[slots.length - 1]!;
  openOnly(last.id);
  revealSlotId = last.id;
  if (slots.length === 1) armAppendInsert(last.id);
  playCreate();
  // Paint loading chips immediately so heavy mp4s show the loader on canvas.
  renderPanel();
  if (at) {
    const { x, y } = playfieldPoint(at.clientX, at.clientY);
    world.armPlaceAt(
      slots.map((slot) => slot.id),
      x,
      y,
    );
  }
  live();

  const ids = slots.map((slot) => slot.id);
  void Promise.all(jobs).then(() => {
    resize();
    renderPanel();
    if (at) {
      const { x, y } = playfieldPoint(at.clientX, at.clientY);
      world.placeSlotsAt(ids, x, y);
    }
    live();
  });
}

function playfieldPoint(clientX: number, clientY: number) {
  const rect = playfield.getBoundingClientRect();
  const w = Math.max(0, rect.width);
  const h = Math.max(0, rect.height);
  return {
    x: Math.min(Math.max(clientX - rect.left, 0), w),
    y: Math.min(Math.max(clientY - rect.top, 0), h),
  };
}

type PlaceAt = { clientX: number; clientY: number };

/** Grow-in + hold the add-row steady (same motion as duplicate). */
function armAppendInsert(id: string) {
  const anchor = panel.querySelector<HTMLElement>(".slot-adds");
  insertMotion = {
    id,
    scroll: panel.scrollTop,
    anchorId: null,
    anchorTop: anchor?.getBoundingClientRect().top ?? 0,
  };
}

function armSlotPlace(id: string, at?: PlaceAt) {
  if (!at) return;
  const { x, y } = playfieldPoint(at.clientX, at.clientY);
  world.armPlaceAt([id], x, y);
}

function addPillSlot(at?: PlaceAt) {
  remember();
  dismissWelcome();
  const font: Partial<TextSlot> = {};
  if (appliedFont) {
    font.fontFamily = appliedFont;
    const weight = sharedFamily() === appliedFont ? sharedWeight() : null;
    font.fontWeight = chosenWeight(appliedFont, weight ?? 700);
  }
  const prefab = state.template === "blank" ? { text: blankPrefabText(allTextSlots().length) } : {};
  const slot = defaultTextSlot({ colorIndex: state.slots.length % state.theme.length, ...font, ...prefab });
  captureBaseline(slot);
  state.slots.push(slot);
  openOnly(slot.id);
  focusSlotId = slot.id;
  revealSlotId = slot.id;
  armAppendInsert(slot.id);
  armSlotPlace(slot.id, at);
  playCreate();
  renderPanel();
  live();
}

function addTypeSlot(at?: PlaceAt) {
  remember();
  dismissWelcome();
  const font: Partial<TextSlot> = {};
  if (appliedFont) {
    font.fontFamily = appliedFont;
    const weight = sharedFamily() === appliedFont ? sharedWeight() : null;
    font.fontWeight = chosenWeight(appliedFont, weight ?? 700);
  }
  const prefab = state.template === "blank" ? { text: blankPrefabText(allTextSlots().length) } : {};
  const slot = defaultTypeSlot({ colorIndex: state.slots.length % state.theme.length, ...font, ...prefab });
  captureBaseline(slot);
  state.slots.push(slot);
  openOnly(slot.id);
  focusSlotId = slot.id;
  revealSlotId = slot.id;
  armAppendInsert(slot.id);
  armSlotPlace(slot.id, at);
  playCreate();
  renderPanel();
  live();
}

function addTextFieldSlot(at?: PlaceAt) {
  remember();
  dismissWelcome();
  const font: Partial<TextSlot> = {};
  if (appliedFont) {
    font.fontFamily = appliedFont;
    const weight = sharedFamily() === appliedFont ? sharedWeight() : null;
    font.fontWeight = chosenWeight(appliedFont, weight ?? 400);
  }
  const slot = defaultTextFieldSlot({ colorIndex: state.slots.length % state.theme.length, ...font });
  captureBaseline(slot);
  state.slots.push(slot);
  openOnly(slot.id);
  focusSlotId = slot.id;
  revealSlotId = slot.id;
  armAppendInsert(slot.id);
  armSlotPlace(slot.id, at);
  playCreate();
  renderPanel();
  live();
  // Edit pins the body as static. Keep that for layout; physics should fall.
  if (state.physics.layoutMode) {
    showPick(slot.id);
    editChipText(slot.id, "end");
  }
}

function addShapeSlot(at?: PlaceAt) {
  remember();
  dismissWelcome();
  const preset = ICON_PRESETS[0]!;
  const slot = defaultImageSlot({
    colorIndex: state.slots.length % state.theme.length,
    src: preset.src,
    name: preset.label,
  });
  captureBaseline(slot);
  state.slots.push(slot);
  openOnly(slot.id);
  revealSlotId = slot.id;
  armAppendInsert(slot.id);
  armSlotPlace(slot.id, at);
  playCreate();
  renderPanel();
  live();
}

function addEmojiSlot(at?: PlaceAt) {
  remember();
  dismissWelcome();
  const item = FEATURED_EMOJI[0]!;
  const slot = defaultImageSlot({
    colorIndex: state.slots.length % state.theme.length,
    src: "",
    name: item.name,
    emoji: item.char,
    size: 56,
  });
  captureBaseline(slot);
  state.slots.push(slot);
  openOnly(slot.id);
  revealSlotId = slot.id;
  armAppendInsert(slot.id);
  armSlotPlace(slot.id, at);
  playCreate();
  renderPanel();
  live();
}

function addYouTubeSlot(clip: YouTubeClip, at?: PlaceAt) {
  remember();
  dismissWelcome();
  const slot = defaultImageSlot({
    colorIndex: state.slots.length % state.theme.length,
    src: "",
    name: "YouTube",
    size: DEFAULT_YOUTUBE_SIZE,
    amount: 1,
    radius: 12,
    youtube: clip,
  });
  captureBaseline(slot);
  state.slots.push(slot);
  openOnly(slot.id);
  revealSlotId = slot.id;
  armAppendInsert(slot.id);
  armSlotPlace(slot.id, at);
  playCreate();
  renderPanel();
  live();
  hintMediaExportOnce();
}

function slotColor(slot: Slot): string {
  return slot.color ?? pickTheme(state.theme, slot.colorIndex ?? 0);
}

function iconSrc(slot: ImageSlot): string {
  return peekTrim(slot.src)?.displaySrc ?? slot.src;
}

function uploadedShape(slot: ImageSlot): boolean {
  return Boolean(slot.src) && !slot.emoji && !slot.youtube && !slot.video && !presetIdForSrc(slot.src);
}


/** Canvas / programmatic scale — free-transform hard max (masterScale-aware). */
function clampSlotScale(_slot: Slot, scale: number): number {
  return clampScaleForFreeTransform(scale, state.masterScale);
}

/** Soft slider range; expands if the current value was set higher via canvas drag. */
function slotScaleSliderMax(slot: Slot): number {
  return softSlotScaleSliderMax(slot.scale, isRasterUploadSlot(slot));
}

function isRasterUploadSlot(slot: Slot): boolean {
  return slot.kind === "image" && isRasterUpload(slot);
}

function syncFreeScaleMax() {
  world.setFreeScaleMax(freeTransformScaleMax(state.masterScale));
}

function isRasterUpload(slot: ImageSlot): boolean {
  return uploadedShape(slot) && !isSvgSource(slot);
}

function colliderOf(slot: ImageSlot): string {
  return imageColliderId(slot.collider);
}

function iconCanGradient(slot: ImageSlot): boolean {
  return !slot.emoji && isColorMask(slot);
}

function iconPreviewFill(slot: ImageSlot): string {
  const fill = slotColor(slot);
  if (!slot.gradient || !iconCanGradient(slot)) return fill;
  if (slot.animatedGradient) return pillSweepGradient(fill, gradientEnd(state.theme, slot), slot.gradientAngle, slot.gradientScale);
  return pillGradient(fill, gradientEnd(state.theme, slot), slot.gradientAngle, slot.gradientScale);
}

function paintIconSwatches(root: HTMLElement, slot: ImageSlot) {
  const fill = iconPreviewFill(slot);
  const sweep = Boolean(slot.gradient && slot.animatedGradient && iconCanGradient(slot));
  const duration = `${gradientPeriodMs(slot.gradientSpeed) / 1000}s`;
  root.closest(".slot-card")?.querySelectorAll<HTMLElement>(".shape-swatch").forEach((swatch) => {
    swatch.style.background = fill;
    swatch.classList.toggle("is-gradient-animated", sweep);
    if (sweep) {
      swatch.style.setProperty("--sweep-duration", duration);
      swatch.style.setProperty("--grad-angle", String(gradientAngleOf(slot.gradientAngle)));
    } else {
      swatch.style.removeProperty("--sweep-duration");
      swatch.style.removeProperty("--grad-angle");
    }
  });
}

function chipPreview(slot: TextSlot): string {
  if (!slot.gradient || slot.stroked) return slotColor(slot);
  if (slot.animatedGradient) return pillSweepGradient(slotColor(slot), gradientEnd(state.theme, slot), slot.gradientAngle, slot.gradientScale);
  return pillGradient(slotColor(slot), gradientEnd(state.theme, slot), slot.gradientAngle, slot.gradientScale);
}

function shapeSwatch(src: string, color: string): HTMLElement {
  const glyph = document.createElement("span");
  glyph.className = "shape-swatch";
  glyph.style.background = color;
  const mask = `url("${src}")`;
  glyph.style.maskImage = mask;
  glyph.style.webkitMaskImage = mask;
  return glyph;
}

function tintRow(slot: Slot, legend = "Color"): string {
  return swatchRow(state.theme, slot.colorIndex ?? 0, slot.color, "tint", legend);
}

function textTintRow(slot: TextSlot): string {
  const filled = shapeHasFill(slot);
  const index = resolveTextSwatchIndex(state.theme, fillSample(state.theme, slot), filled, slot.colorIndex ?? 0, slot.textColorIndex);
  const custom =
    slot.textColor ??
    (slot.textColorIndex == null && !filled && slot.color ? slot.color : undefined);
  return swatchRow(state.theme, index, custom, "text-tint", "Text color");
}

function gradientTintRow(slot: Slot): string {
  return swatchRow(state.theme, gradientEndIndex(state.theme, slot), slot.gradientColor, "grad-tint", "End color");
}

function swatchRow(
  colors: string[],
  selectedIndex: number,
  custom: string | undefined,
  dataName: string,
  legend: string,
): string {
  return `<div class="tint-row" style="--theme-count:${colors.length}">${colors
    .map((color, index) => {
      const selected = selectedIndex === index;
      const fill = selected && custom ? custom : color;
      return `<button type="button" class="tint${selected ? " is-on" : ""}" data-${dataName}="${index}" style="background:${fill}" aria-pressed="${selected}" aria-label="${legend} ${index + 1}" data-tip="Click the selected color again to pick any color"></button>`;
    })
    .join("")}</div>`;
}

function bindTint(root: HTMLElement, slot: Slot) {
  root.querySelectorAll<HTMLButtonElement>("[data-tint]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.tint);
      if ((slot.colorIndex ?? 0) === index) {
        openTintPicker(root, btn, slot, index, "shape");
        return;
      }
      remember();
      slot.colorIndex = index;
      slot.color = undefined;
      renderPanel();
      liveChip(slot.id);
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-grad-tint]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.gradTint);
      if (gradientEndIndex(state.theme, slot) === index) {
        openTintPicker(root, btn, slot, index, "gradient");
        return;
      }
      remember();
      slot.gradientColorIndex = index;
      slot.gradientColor = undefined;
      renderPanel();
      liveChip(slot.id);
    });
  });
  if (slot.kind !== "text") return;
  const text = slot;
  root.querySelectorAll<HTMLButtonElement>("[data-text-tint]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.textTint);
      const solid = text.shape !== "none" && !text.stroked;
      const current = resolveTextSwatchIndex(state.theme, slotColor(text), solid, text.colorIndex ?? 0, text.textColorIndex);
      if (current === index) {
        openTintPicker(root, btn, text, index, "text");
        return;
      }
      remember();
      text.textColorIndex = index;
      text.textColor = undefined;
      renderPanel();
      liveChip(slot.id);
    });
  });
}

function openCanvasStagePicker(btn: HTMLButtonElement) {
  if (tintPicker?.anchor === btn) {
    tintPicker.close();
    return;
  }
  tintPicker?.close();
  const picker = mountColorPicker({
    anchor: btn,
    value: state.stageColor,
    onChange(hex) {
      remember("canvas-stage");
      state.stageColor = hex;
      state.background.kind = "solid";
      btn.style.background = hex;
      applyBackground();
    },
    onClose() {
      if (gesture === "canvas-stage") endGesture();
      if (tintPicker?.anchor === btn) tintPicker = null;
    },
  });
  tintPicker = { anchor: btn, close: picker.close };
}

function openDropShadowColorPicker(btn: HTMLButtonElement, slot: Slot) {
  if (tintPicker?.anchor === btn) {
    tintPicker.close();
    return;
  }
  tintPicker?.close();
  const gestureKey = `slot:${slot.id}:dropShadowColor`;
  const picker = mountColorPicker({
    anchor: btn,
    value: dropShadowColorOf(slot.dropShadowColor),
    onChange(hex) {
      remember(gestureKey);
      slot.dropShadowColor = dropShadowColorOf(hex);
      btn.style.background = slot.dropShadowColor;
      paintFieldReset(btn.closest(".field") ?? btn.parentElement ?? btn, slot, "dropShadowColor");
      liveChip(slot.id);
    },
    onClose() {
      if (gesture === gestureKey) endGesture();
      if (tintPicker?.anchor === btn) tintPicker = null;
    },
  });
  tintPicker = { anchor: btn, close: picker.close };
}

function openThemeSwatch(btn: HTMLButtonElement) {
  const index = Number(btn.dataset.theme);
  if (tintPicker?.anchor === btn) {
    tintPicker.close();
    return;
  }
  tintPicker?.close();
  const picker = mountColorPicker({
    anchor: btn,
    value: state.theme[index] ?? "#000000",
    onChange(hex) {
      remember(`theme:${index}`);
      state.theme[index] = hex;
      btn.style.background = hex;
      for (const slot of state.slots) {
        const start = !slot.color && (slot.colorIndex ?? 0) === index;
        const end = Boolean(slot.gradient) && !slot.gradientColor && gradientEndIndex(state.theme, slot) === index;
        if (!start && !end) continue;
        if (slot.kind === "text") {
          const chip = panel.querySelector<HTMLElement>(`[data-id="${slot.id}"] .slot-chip`);
          if (chip) chip.style.background = chipPreview(slot);
        } else if (iconCanGradient(slot)) {
          const card = panel.querySelector<HTMLElement>(`[data-id="${slot.id}"]`);
          if (card) paintIconSwatches(card, slot);
        }
      }
      themeShelf.refresh();
      syncLogotypeAccent();
      applyLogo();
      live();
    },
    onClose() {
      if (gesture === `theme:${index}`) endGesture();
      if (tintPicker?.anchor === btn) tintPicker = null;
    },
  });
  tintPicker = { anchor: btn, close: picker.close };
}

function openTintPicker(root: HTMLElement, btn: HTMLButtonElement, slot: Slot, index: number, target: "shape" | "text" | "gradient") {
  if (tintPicker?.anchor === btn) {
    tintPicker.close();
    return;
  }
  tintPicker?.close();
  const textSlot = slot.kind === "text" ? slot : null;
  const gestureKey = target === "text" ? `ink:${slot.id}` : target === "gradient" ? `grad:${slot.id}` : `tint:${slot.id}`;
  const picker = mountColorPicker({
    anchor: btn,
    value:
      target === "text" && textSlot
        ? resolveTextColor(state.theme, fillSample(state.theme, textSlot), shapeHasFill(textSlot), textSlot.textColorIndex, textSlot.textColor)
        : target === "gradient"
          ? gradientEnd(state.theme, slot)
          : (slot.color ?? pickTheme(state.theme, index)),
    onChange(hex) {
      remember(gestureKey);
      if (target === "text" && textSlot) {
        textSlot.textColorIndex = index;
        textSlot.textColor = hex;
        btn.style.background = hex;
        paintFieldReset(root, textSlot, "textColor");
        liveChip(slot.id);
        return;
      }
      if (target === "gradient") {
        slot.gradientColorIndex = index;
        slot.gradientColor = hex;
        btn.style.background = hex;
        if (textSlot) {
          const chip = root.closest(".slot-card")?.querySelector<HTMLElement>(".slot-chip");
          if (chip) chip.style.background = chipPreview(textSlot);
          syncImplicitTextRow(root, textSlot, slotColor(textSlot));
        } else if (slot.kind === "image") {
          paintIconSwatches(root, slot);
        }
        paintFieldReset(root, slot, "gradientColor");
        liveChip(slot.id);
        return;
      }
      slot.color = hex;
      btn.style.background = hex;
      if (textSlot) {
        const chip = root.closest(".slot-card")?.querySelector<HTMLElement>(".slot-chip");
        if (chip) chip.style.background = chipPreview(textSlot);
      } else if (slot.kind === "image") {
        paintIconSwatches(root, slot);
      }
      syncImplicitTextRow(root, slot, hex);
      paintFieldReset(root, slot, "color");
      liveChip(slot.id);
    },
    onClose() {
      if (gesture === gestureKey) endGesture();
      if (tintPicker?.anchor === btn) tintPicker = null;
    },
  });
  tintPicker = { anchor: btn, close: picker.close };
}

function syncImplicitTextRow(root: HTMLElement, slot: Slot, shapeHex: string) {
  if (slot.kind !== "text" || slot.textColor || slot.textColorIndex != null) return;
  const filled = shapeHasFill(slot);
  if (!filled) {
    const btn = root.querySelector<HTMLElement>(`[data-text-tint="${slot.colorIndex ?? 0}"]`);
    if (btn) btn.style.background = shapeHex;
    return;
  }
  const index = resolveTextSwatchIndex(state.theme, fillSample(state.theme, slot), true, slot.colorIndex ?? 0, undefined);
  root.querySelectorAll<HTMLButtonElement>("[data-text-tint]").forEach((btn) => {
    const chip = Number(btn.dataset.textTint);
    const on = chip === index;
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", String(on));
    btn.style.background = state.theme[chip] ?? "";
  });
}

type TextBaseline = Pick<
  TextSlot,
  | "fontFamily"
  | "fontWeight"
  | "fontSize"
  | "textHeight"
  | "lineHeight"
  | "shape"
  | "radius"
  | "stroked"
  | "stroke"
  | "colorIndex"
  | "color"
  | "gradient"
  | "gradientColorIndex"
  | "gradientColor"
  | "gradientAngle"
  | "gradientScale"
  | "animatedGradient"
  | "gradientSpeed"
  | "textAnim"
  | "textAnimSpeed"
  | "textColorIndex"
  | "textColor"
  | "blend"
  | "dropShadow"
  | "dropShadowRadius"
  | "dropShadowDistance"
  | "dropShadowOpacity"
  | "dropShadowColor"
  | "scale"
>;

type ImageBaseline = Pick<
  ImageSlot,
  | "src"
  | "name"
  | "emoji"
  | "scale"
  | "amount"
  | "colorIndex"
  | "color"
  | "gradient"
  | "gradientColorIndex"
  | "gradientColor"
  | "gradientAngle"
  | "gradientScale"
  | "animatedGradient"
  | "gradientSpeed"
  | "radius"
  | "stroked"
  | "stroke"
  | "exposure"
  | "contrast"
  | "saturation"
  | "hue"
  | "temperature"
  | "tint"
  | "collider"
  | "blend"
  | "dropShadow"
  | "dropShadowRadius"
  | "dropShadowDistance"
  | "dropShadowOpacity"
  | "dropShadowColor"
>;

const textBaselines = new Map<string, TextBaseline>();
const imageBaselines = new Map<string, ImageBaseline>();

function copyBaseline(source: Slot, copy: Slot) {
  if (source.kind === "text" && copy.kind === "text") {
    textBaselines.set(copy.id, { ...textBaseline(source) });
    return;
  }
  if (source.kind === "image" && copy.kind === "image") {
    imageBaselines.set(copy.id, { ...imageBaseline(source) });
  }
}

function captureBaseline(slot: Slot) {
  if (slot.kind === "text") {
    if (textBaselines.has(slot.id)) return;
    textBaselines.set(slot.id, {
      fontFamily: slot.fontFamily,
      fontWeight: slot.fontWeight,
      fontSize: slot.fontSize,
      textHeight: slot.textHeight,
      lineHeight: slot.lineHeight,
      shape: slot.shape,
      radius: slot.radius,
      stroked: slot.stroked,
      stroke: slot.stroke,
      colorIndex: slot.colorIndex,
      color: slot.color,
      gradient: slot.gradient,
      gradientColorIndex: slot.gradientColorIndex,
      gradientColor: slot.gradientColor,
      gradientAngle: slot.gradientAngle,
      gradientScale: slot.gradientScale,
      animatedGradient: slot.animatedGradient,
      gradientSpeed: slot.gradientSpeed,
      textAnim: slot.textAnim,
      textAnimSpeed: slot.textAnimSpeed,
      textColorIndex: slot.textColorIndex,
      textColor: slot.textColor,
      blend: slot.blend,
      dropShadow: slot.dropShadow,
      dropShadowRadius: slot.dropShadowRadius,
      dropShadowDistance: slot.dropShadowDistance,
      dropShadowOpacity: slot.dropShadowOpacity,
      dropShadowColor: slot.dropShadowColor,
      scale: slot.scale,
    });
    return;
  }
  if (imageBaselines.has(slot.id)) return;
  imageBaselines.set(slot.id, {
    src: slot.src,
    name: slot.name,
    emoji: slot.emoji,
    scale: slot.scale,
    amount: slot.amount,
    colorIndex: slot.colorIndex,
    color: slot.color,
    gradient: slot.gradient,
    gradientColorIndex: slot.gradientColorIndex,
    gradientColor: slot.gradientColor,
    gradientAngle: slot.gradientAngle,
    gradientScale: slot.gradientScale,
    animatedGradient: slot.animatedGradient,
    gradientSpeed: slot.gradientSpeed,
    radius: slot.radius ?? 0,
    stroked: Boolean(slot.stroked),
    stroke: slot.stroke ?? 4,
    exposure: slot.exposure,
    contrast: slot.contrast,
    saturation: slot.saturation,
    hue: slot.hue,
    temperature: slot.temperature,
    tint: slot.tint,
    collider: slot.collider,
    blend: slot.blend,
    dropShadow: slot.dropShadow,
    dropShadowRadius: slot.dropShadowRadius,
    dropShadowDistance: slot.dropShadowDistance,
    dropShadowOpacity: slot.dropShadowOpacity,
    dropShadowColor: slot.dropShadowColor,
  });
}

for (const slot of state.slots) captureBaseline(slot);

function textBaseline(slot: TextSlot): TextBaseline {
  const saved = textBaselines.get(slot.id);
  if (saved) return saved;
  const seed = defaultTextSlot();
  const base: TextBaseline = {
    fontFamily: seed.fontFamily,
    fontWeight: seed.fontWeight,
    fontSize: seed.fontSize,
    textHeight: seed.textHeight,
    lineHeight: seed.lineHeight,
    shape: seed.shape,
    radius: seed.radius,
    stroked: seed.stroked,
    stroke: seed.stroke,
    colorIndex: seed.colorIndex,
    color: seed.color,
    gradient: seed.gradient,
    gradientColorIndex: seed.gradientColorIndex,
    gradientColor: seed.gradientColor,
    gradientAngle: seed.gradientAngle,
    gradientScale: seed.gradientScale,
    animatedGradient: seed.animatedGradient,
    gradientSpeed: seed.gradientSpeed,
    textAnim: seed.textAnim,
    textAnimSpeed: seed.textAnimSpeed,
    textColorIndex: seed.textColorIndex,
    textColor: seed.textColor,
    blend: seed.blend,
    dropShadow: seed.dropShadow,
    dropShadowRadius: seed.dropShadowRadius,
    dropShadowDistance: seed.dropShadowDistance,
    dropShadowOpacity: seed.dropShadowOpacity,
    dropShadowColor: seed.dropShadowColor,
    scale: seed.scale,
  };
  textBaselines.set(slot.id, base);
  return base;
}

function imageBaseline(slot: ImageSlot): ImageBaseline {
  const saved = imageBaselines.get(slot.id);
  if (saved) return saved;
  const seed = defaultImageSlot();
  const base: ImageBaseline = {
    src: seed.src,
    name: seed.name,
    emoji: seed.emoji,
    scale: seed.scale,
    amount: seed.amount,
    colorIndex: seed.colorIndex,
    color: seed.color,
    gradient: seed.gradient,
    gradientColorIndex: seed.gradientColorIndex,
    gradientColor: seed.gradientColor,
    gradientAngle: seed.gradientAngle,
    gradientScale: seed.gradientScale,
    animatedGradient: seed.animatedGradient,
    gradientSpeed: seed.gradientSpeed,
    radius: seed.radius ?? 0,
    stroked: Boolean(seed.stroked),
    stroke: seed.stroke ?? 4,
    exposure: seed.exposure,
    contrast: seed.contrast,
    saturation: seed.saturation,
    hue: seed.hue,
    temperature: seed.temperature,
    tint: seed.tint,
    collider: seed.collider,
    blend: seed.blend,
    dropShadow: seed.dropShadow,
    dropShadowRadius: seed.dropShadowRadius,
    dropShadowDistance: seed.dropShadowDistance,
    dropShadowOpacity: seed.dropShadowOpacity,
    dropShadowColor: seed.dropShadowColor,
  };
  imageBaselines.set(slot.id, base);
  return base;
}

function colorsDiffer(
  index: number,
  color: string | undefined,
  baseIndex: number,
  baseColor: string | undefined,
): boolean {
  return index !== baseIndex || (color ?? "") !== (baseColor ?? "");
}

function fieldDirty(slot: Slot, key: string): boolean {
  if (key === "attractorStrength") {
    return attractorStrengthOf(slot.attractorStrength) !== DEFAULT_ATTRACTOR_STRENGTH;
  }
  if (key === "attractorReach") {
    return attractorReachOf(slot.attractorReach) !== DEFAULT_ATTRACTOR_REACH;
  }
  if (key === "attractorIdle") return Boolean(slot.attractorIdle);
  if (slot.kind === "text") {
    const base = textBaseline(slot);
    switch (key) {
      case "fontFamily":
        return slot.fontFamily !== base.fontFamily;
      case "fontWeight":
        return slot.fontWeight !== base.fontWeight;
      case "fontSize":
        return slot.fontSize !== base.fontSize;
      case "textHeight":
        return slot.textHeight !== base.textHeight;
      case "lineHeight":
        return lineHeightSliderOf(slot) !== lineHeightSliderOf(base);
      case "pillPad":
        return slot.pillPad != null;
      case "tracking":
        return slot.tracking != null;
      case "shape":
        return slot.shape !== base.shape;
      case "radius":
        return slot.radius !== base.radius;
      case "stroked":
        return slot.stroked !== base.stroked;
      case "stroke":
        return slot.stroke !== base.stroke;
      case "scale":
        return Math.abs(slot.scale - base.scale) >= 0.001;
      case "color":
        return colorsDiffer(slot.colorIndex, slot.color, base.colorIndex, base.color);
      case "gradient":
        return Boolean(slot.gradient) !== Boolean(base.gradient);
      case "gradientColor":
        return (slot.gradientColorIndex ?? null) !== (base.gradientColorIndex ?? null) || (slot.gradientColor ?? "") !== (base.gradientColor ?? "");
      case "gradientAngle":
        return gradientAngleOf(slot.gradientAngle) !== gradientAngleOf(base.gradientAngle);
      case "gradientScale":
        return gradientScaleOf(slot.gradientScale) !== gradientScaleOf(base.gradientScale);
      case "animatedGradient":
        return Boolean(slot.animatedGradient) !== Boolean(base.animatedGradient);
      case "gradientSpeed":
        return gradientSpeedOf(slot.gradientSpeed) !== gradientSpeedOf(base.gradientSpeed);
      case "textAnim":
        return Boolean(slot.textAnim) !== Boolean(base.textAnim);
      case "textAnimSpeed":
        return textAnimSpeedOf(slot.textAnimSpeed) !== textAnimSpeedOf(base.textAnimSpeed);
      case "textColor":
        return slot.textColorIndex !== base.textColorIndex || (slot.textColor ?? "") !== (base.textColor ?? "");
      case "blend":
        return blendMode(slot.blend) !== blendMode(base.blend);
      case "dropShadow":
        return Boolean(slot.dropShadow) !== Boolean(base.dropShadow);
      case "dropShadowRadius":
        return dropShadowRadiusOf(slot.dropShadowRadius) !== dropShadowRadiusOf(base.dropShadowRadius);
      case "dropShadowDistance":
        return dropShadowDistanceOf(slot.dropShadowDistance) !== dropShadowDistanceOf(base.dropShadowDistance);
      case "dropShadowOpacity":
        return dropShadowOpacityOf(slot.dropShadowOpacity) !== dropShadowOpacityOf(base.dropShadowOpacity);
      case "dropShadowColor":
        return dropShadowColorOf(slot.dropShadowColor) !== dropShadowColorOf(base.dropShadowColor);
      default:
        return false;
    }
  }
  const base = imageBaseline(slot);
  switch (key) {
    case "icon":
      return slot.src !== base.src || slot.name !== base.name || (slot.emoji ?? "") !== (base.emoji ?? "");
    case "scale":
      return Math.abs(slot.scale - base.scale) >= 0.001;
    case "amount":
      return slot.amount !== base.amount;
    case "radius":
      return (slot.radius ?? 0) !== (base.radius ?? 0);
    case "stroked":
      return Boolean(slot.stroked) !== Boolean(base.stroked);
    case "stroke":
      return (slot.stroke ?? 4) !== (base.stroke ?? 4);
    case "exposure":
      return imageExposureOf(slot.exposure) !== imageExposureOf(base.exposure);
    case "contrast":
      return imageContrastOf(slot.contrast) !== imageContrastOf(base.contrast);
    case "saturation":
      return imageSaturationOf(slot.saturation) !== imageSaturationOf(base.saturation);
    case "hue":
      return imageHueOf(slot.hue) !== imageHueOf(base.hue);
    case "temperature":
      return imageTemperatureOf(slot.temperature) !== imageTemperatureOf(base.temperature);
    case "tint":
      return Boolean(slot.tint) !== Boolean(base.tint);
    case "color":
      return colorsDiffer(slot.colorIndex, slot.color, base.colorIndex, base.color);
    case "gradient":
      return Boolean(slot.gradient) !== Boolean(base.gradient);
    case "gradientColor":
      return (slot.gradientColorIndex ?? null) !== (base.gradientColorIndex ?? null) || (slot.gradientColor ?? "") !== (base.gradientColor ?? "");
    case "gradientAngle":
      return gradientAngleOf(slot.gradientAngle) !== gradientAngleOf(base.gradientAngle);
    case "gradientScale":
      return gradientScaleOf(slot.gradientScale) !== gradientScaleOf(base.gradientScale);
    case "animatedGradient":
      return Boolean(slot.animatedGradient) !== Boolean(base.animatedGradient);
    case "gradientSpeed":
      return gradientSpeedOf(slot.gradientSpeed) !== gradientSpeedOf(base.gradientSpeed);
    case "collider":
      return colliderOf(slot) !== imageColliderId(base.collider);
    case "blend":
      return blendMode(slot.blend) !== blendMode(base.blend);
    case "dropShadow":
      return Boolean(slot.dropShadow) !== Boolean(base.dropShadow);
    case "dropShadowRadius":
      return dropShadowRadiusOf(slot.dropShadowRadius) !== dropShadowRadiusOf(base.dropShadowRadius);
    case "dropShadowDistance":
      return dropShadowDistanceOf(slot.dropShadowDistance) !== dropShadowDistanceOf(base.dropShadowDistance);
    case "dropShadowOpacity":
      return dropShadowOpacityOf(slot.dropShadowOpacity) !== dropShadowOpacityOf(base.dropShadowOpacity);
    case "dropShadowColor":
      return dropShadowColorOf(slot.dropShadowColor) !== dropShadowColorOf(base.dropShadowColor);
    default:
      return false;
  }
}

function paintFieldReset(root: ParentNode, slot: Slot, key: string) {
  const btn = root.querySelector<HTMLButtonElement>(`[data-reset="${key}"]`);
  if (btn) btn.hidden = !fieldDirty(slot, key);
}

function resetControl(name: string, key: string, dirty: boolean): string {
  return `<button type="button" class="field-reset icon-hover" data-reset="${key}" aria-label="Reset ${escapeAttr(name.toLowerCase())}" data-tip="Reset this setting to the default"${dirty ? "" : " hidden"}>${RESET_ICON}</button>`;
}

function settingLabel(slot: Slot, name: string, key: string, value?: string): string {
  const reset = resetControl(name, key, fieldDirty(slot, key));
  if (value == null) {
    return `<span class="field-label"><span>${name}</span>${reset}</span>`;
  }
  return `<span class="field-label">${rangeCaptionHtml(key, name, value)}${reset}</span>`;
}

/** Layer blend — only useful when pieces can overlap (layout mode). */
function blendField(slot: Slot): string {
  if (!state.physics.layoutMode) return "";
  const current = blendMode(slot.blend);
  return `<label class="field" data-tip="How this layer mixes with layers behind it">${settingLabel(slot, "Blend mode", "blend")}
    <select data-key="blend">
      ${BLEND_MODES.map((mode) => `<option value="${mode.id}"${current === mode.id ? " selected" : ""}>${mode.label}</option>`).join("")}
    </select>
  </label>`;
}

/** Soft shadow — layout mode only so physics tumbles stay cheap. */
function dropShadowField(slot: Slot): string {
  if (!state.physics.layoutMode) return "";
  const on = Boolean(slot.dropShadow);
  const radius = dropShadowRadiusOf(slot.dropShadowRadius);
  const distance = dropShadowDistanceOf(slot.dropShadowDistance);
  const opacity = dropShadowOpacityOf(slot.dropShadowOpacity);
  const color = dropShadowColorOf(slot.dropShadowColor);
  return `<div class="check-row" data-tip="Soft shadow under this layer (layout mode only)">
    <label class="check">
      ${checkInput(`data-key="dropShadow" ${on ? "checked" : ""}`)}
      Drop shadow
    </label>
    ${resetControl("Drop shadow", "dropShadow", fieldDirty(slot, "dropShadow"))}
  </div>
  ${
    on
      ? `<label class="field" data-tip="How far the shadow sits from the piece">${settingLabel(slot, "Shadow distance", "dropShadowDistance", String(distance))}
    <input type="range" data-key="dropShadowDistance" min="0" max="64" step="1" value="${distance}" />
  </label>
  <label class="field" data-tip="How soft the shadow edge is">${settingLabel(slot, "Shadow radius", "dropShadowRadius", String(radius))}
    <input type="range" data-key="dropShadowRadius" min="0" max="64" step="1" value="${radius}" />
  </label>
  <label class="field" data-tip="How strong the shadow is">${settingLabel(slot, "Shadow opacity", "dropShadowOpacity", String(opacity))}
    <input type="range" data-key="dropShadowOpacity" min="0" max="100" step="1" value="${opacity}" />
  </label>
  <div class="field" data-tip="Color of the drop shadow"><span class="field-label"><span>Shadow color</span>
    <span class="field-label-end">
      ${resetControl("Shadow color", "dropShadowColor", fieldDirty(slot, "dropShadowColor"))}
      <button type="button" class="shadow-swatch" data-shadow-color style="background:${color}" aria-label="Shadow color" data-tip="Color of the drop shadow"></button>
    </span>
  </span></div>`
      : ""
  }`;
}

/** Strength / reach / idle pull — only after right-click Make Attractor. */
function attractorField(slot: Slot): string {
  if (!ATTRACTOR_UI || !slot.attractor) return "";
  const strength = attractorStrengthOf(slot.attractorStrength);
  const reach = attractorReachOf(slot.attractorReach);
  const idle = Boolean(slot.attractorIdle);
  return `<div class="slot-group" data-attractor-settings>
    <p class="slot-label">Attractor Settings</p>
    <label class="field" data-tip="How hard other assets chase this one">${settingLabel(slot, "Strength", "attractorStrength", String(strength))}
      <input type="range" data-key="attractorStrength" min="1" max="100" step="1" value="${strength}" />
    </label>
    <label class="field" data-tip="How far the pull reaches. 100 covers the whole canvas">${settingLabel(slot, "Reach", "attractorReach", String(reach))}
      <input type="range" data-key="attractorReach" min="1" max="100" step="1" value="${reach}" />
    </label>
    <div class="check-row" data-tip="Keep pulling even when this asset is sitting still">
      <label class="check">
        ${checkInput(`data-key="attractorIdle" ${idle ? "checked" : ""}`)}
        Always pull
      </label>
      ${resetControl("Always pull", "attractorIdle", fieldDirty(slot, "attractorIdle"))}
    </div>
  </div>`;
}

function applyFieldReset(slot: Slot, key: string) {
  remember();
  if (slot.kind === "text") {
    const base = textBaseline(slot);
    if (key === "fontFamily") {
      slot.fontFamily = base.fontFamily;
      slot.fontWeight = chosenWeight(base.fontFamily, slot.fontWeight);
    } else if (key === "fontWeight") slot.fontWeight = chosenWeight(slot.fontFamily, base.fontWeight);
    else if (key === "fontSize") slot.fontSize = base.fontSize;
    else if (key === "textHeight") slot.textHeight = base.textHeight;
    else if (key === "lineHeight") slot.lineHeight = base.lineHeight;
    else if (key === "pillPad") slot.pillPad = undefined;
    else if (key === "tracking") slot.tracking = undefined;
    else if (key === "shape") slot.shape = base.shape;
    else if (key === "radius") slot.radius = base.radius;
    else if (key === "stroked") slot.stroked = base.stroked;
    else if (key === "stroke") slot.stroke = base.stroke;
    else if (key === "scale") slot.scale = base.scale;
    else if (key === "color") {
      slot.colorIndex = base.colorIndex;
      slot.color = base.color;
    } else if (key === "gradient") slot.gradient = base.gradient;
    else if (key === "gradientColor") {
      slot.gradientColorIndex = base.gradientColorIndex;
      slot.gradientColor = base.gradientColor;
    } else if (key === "gradientAngle") slot.gradientAngle = base.gradientAngle;
    else if (key === "gradientScale") slot.gradientScale = base.gradientScale;
    else if (key === "animatedGradient") slot.animatedGradient = base.animatedGradient;
    else if (key === "gradientSpeed") slot.gradientSpeed = base.gradientSpeed;
    else if (key === "textAnim") slot.textAnim = base.textAnim;
    else if (key === "textAnimSpeed") slot.textAnimSpeed = base.textAnimSpeed;
    else if (key === "textColor") {
      slot.textColorIndex = base.textColorIndex;
      slot.textColor = base.textColor;
    } else if (key === "blend") slot.blend = base.blend;
    else if (key === "dropShadow") slot.dropShadow = base.dropShadow;
    else if (key === "dropShadowRadius") slot.dropShadowRadius = base.dropShadowRadius;
    else if (key === "dropShadowDistance") slot.dropShadowDistance = base.dropShadowDistance;
    else if (key === "dropShadowOpacity") slot.dropShadowOpacity = base.dropShadowOpacity;
    else if (key === "dropShadowColor") slot.dropShadowColor = base.dropShadowColor;
    if (key === "fontFamily" || key === "fontWeight") {
      reflectGlobalWeight();
      void settleFont(slot.fontFamily, slot.fontWeight).then(() => liveChip(slot.id));
      renderPanel();
      return;
    }
  } else {
    const base = imageBaseline(slot);
    if (key === "icon") {
      slot.src = base.src;
      slot.name = base.name;
      slot.emoji = base.emoji;
    } else if (key === "scale") slot.scale = base.scale;
    else if (key === "amount") slot.amount = base.amount;
    else if (key === "radius") slot.radius = base.radius ?? 0;
    else if (key === "stroked") slot.stroked = base.stroked;
    else if (key === "stroke") slot.stroke = base.stroke ?? 4;
    else if (key === "exposure") slot.exposure = base.exposure;
    else if (key === "contrast") slot.contrast = base.contrast;
    else if (key === "saturation") slot.saturation = base.saturation;
    else if (key === "hue") slot.hue = base.hue;
    else if (key === "temperature") slot.temperature = base.temperature;
    else if (key === "tint") {
      slot.tint = base.tint;
      if (!slot.tint) {
        slot.gradient = undefined;
        slot.animatedGradient = undefined;
      }
    } else if (key === "color") {
      slot.colorIndex = base.colorIndex;
      slot.color = base.color;
    } else if (key === "gradient") slot.gradient = base.gradient;
    else if (key === "gradientColor") {
      slot.gradientColorIndex = base.gradientColorIndex;
      slot.gradientColor = base.gradientColor;
    } else if (key === "gradientAngle") slot.gradientAngle = base.gradientAngle;
    else if (key === "gradientScale") slot.gradientScale = base.gradientScale;
    else if (key === "animatedGradient") slot.animatedGradient = base.animatedGradient;
    else if (key === "gradientSpeed") slot.gradientSpeed = base.gradientSpeed;
    else if (key === "collider") slot.collider = base.collider;
    else if (key === "blend") slot.blend = base.blend;
    else if (key === "dropShadow") slot.dropShadow = base.dropShadow;
    else if (key === "dropShadowRadius") slot.dropShadowRadius = base.dropShadowRadius;
    else if (key === "dropShadowDistance") slot.dropShadowDistance = base.dropShadowDistance;
    else if (key === "dropShadowOpacity") slot.dropShadowOpacity = base.dropShadowOpacity;
    else if (key === "dropShadowColor") slot.dropShadowColor = base.dropShadowColor;
  }
  if (key === "attractorStrength") slot.attractorStrength = undefined;
  else if (key === "attractorReach") slot.attractorReach = undefined;
  else if (key === "attractorIdle") slot.attractorIdle = undefined;
  if (slot.kind === "image" && key === "amount") live();
  else liveChip(slot.id);
  renderPanel();
}

function storeGradient(slot: TextSlot) {
  slot.gradientFromIndex = slot.colorIndex;
  slot.gradientFrom = slot.color;
  if (slot.gradientColorIndex == null) slot.gradientColorIndex = gradientEndIndex(state.theme, slot);
}

function recallGradient(slot: TextSlot) {
  if (slot.gradientFromIndex == null && !slot.gradientFrom) return;
  if (slot.gradientFromIndex != null) slot.colorIndex = slot.gradientFromIndex;
  slot.color = slot.gradientFrom;
}

function paintFreezeAnimsButton(button: HTMLButtonElement) {
  button.classList.toggle("is-on", assetAnimsFrozen);
  button.setAttribute("aria-pressed", String(assetAnimsFrozen));
  button.setAttribute("aria-label", assetAnimsFrozen ? "Resume animations" : "Pause animations");
  button.dataset.tip = assetAnimsFrozen
    ? "Resume text and gradient animations"
    : "Freeze text and gradient animations on all assets";
  button.innerHTML = assetAnimsFrozen ? playIcon : pauseIcon;
}

function applyAssetAnimsFreeze() {
  document.documentElement.classList.toggle("is-asset-anims-frozen", assetAnimsFrozen);
  setTextAnimsPaused(assetAnimsFrozen);
  panel.querySelectorAll<HTMLButtonElement>("[data-freeze-anims]").forEach(paintFreezeAnimsButton);
}

function bindFreezeAnims(root: HTMLElement) {
  root.querySelectorAll<HTMLButtonElement>("[data-freeze-anims]").forEach((button) => {
    paintFreezeAnimsButton(button);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      assetAnimsFrozen = !assetAnimsFrozen;
      applyAssetAnimsFreeze();
      playSwitch(!assetAnimsFrozen);
    });
  });
}

function bindSlotInputs(root: HTMLElement, slot: Slot) {
  root.querySelectorAll<HTMLButtonElement>("[data-reset]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const key = btn.dataset.reset;
      if (!key) return;
      applyFieldReset(slot, key);
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-shadow-color]").forEach((btn) => {
    btn.addEventListener("click", () => openDropShadowColorPicker(btn, slot));
  });
  root.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-key]").forEach((input) => {
    const key = input.dataset.key;
    if (!key) return;
    if (input instanceof HTMLInputElement && input.type === "range") paintRange(input);
    const gestureKey = `slot:${slot.id}:${key}`;
    const continuous = input instanceof HTMLInputElement && (input.type === "range" || input.type === "number");
    let scrubbing = false;
    const startScrub = () => {
      if (!continuous || scrubbing) return;
      scrubbing = true;
      beginScrub();
    };
    const stopScrub = () => {
      if (!scrubbing) return;
      scrubbing = false;
      endScrub();
    };
    if (continuous) {
      input.addEventListener("pointerdown", startScrub);
      input.addEventListener("pointerup", stopScrub);
      input.addEventListener("pointercancel", stopScrub);
    }
    input.addEventListener("input", () => {
      startScrub();
      if (continuous) remember(gestureKey);
      else remember();
      if (input instanceof HTMLInputElement && input.type === "range") paintRange(input);
      const value =
        input.type === "checkbox"
          ? (input as HTMLInputElement).checked
          : input.type === "number" || input.type === "range"
            ? Number(input.value)
            : input.value;
      if (input instanceof HTMLInputElement && input.type === "checkbox") playSwitch(Boolean(value));
      else if (input instanceof HTMLSelectElement) playClick();
      (slot as Record<string, unknown>)[key] = value;
      if (slot.kind === "text" && key === "textAnim" && value) slot.animatedGradient = undefined;
      if (slot.kind === "text" && key === "animatedGradient" && value) slot.textAnim = undefined;
      if (key === "blend") {
        const mode = blendMode(String(value));
        slot.blend = mode === "normal" ? undefined : mode;
      }
      if (key === "dropShadow") {
        slot.dropShadow = Boolean(value) || undefined;
        if (!slot.dropShadow) {
          slot.dropShadowRadius = undefined;
          slot.dropShadowDistance = undefined;
          slot.dropShadowOpacity = undefined;
          slot.dropShadowColor = undefined;
        }
      }
      if (key === "dropShadowRadius") slot.dropShadowRadius = dropShadowRadiusOf(Number(value));
      if (key === "dropShadowDistance") slot.dropShadowDistance = dropShadowDistanceOf(Number(value));
      if (key === "dropShadowOpacity") slot.dropShadowOpacity = dropShadowOpacityOf(Number(value));
      if (key === "attractorStrength") slot.attractorStrength = attractorStrengthOf(Number(value));
      if (key === "attractorReach") slot.attractorReach = attractorReachOf(Number(value));
      if (key === "attractorIdle") slot.attractorIdle = Boolean(value) || undefined;
      if (slot.kind === "image" && key === "exposure") slot.exposure = imageExposureOf(Number(value));
      if (slot.kind === "image" && key === "contrast") slot.contrast = imageContrastOf(Number(value));
      if (slot.kind === "image" && key === "saturation") slot.saturation = imageSaturationOf(Number(value));
      if (slot.kind === "image" && key === "hue") slot.hue = imageHueOf(Number(value));
      if (slot.kind === "image" && key === "temperature") slot.temperature = imageTemperatureOf(Number(value));
      if (slot.kind === "image" && key === "amount") {
        slot.amount = Math.max(1, Math.min(AMOUNT_SOFT_CAP, Math.round(Number(value))));
        recountShapes();
      }
      if (slot.kind === "image" && key === "tint" && !slot.tint) {
        slot.gradient = undefined;
        slot.animatedGradient = undefined;
      }
      if (slot.kind === "text" && key === "gradient") {
        if (slot.gradient) {
          slot.stroked = false;
          recallGradient(slot);
        } else storeGradient(slot);
      }
      if (slot.kind === "text" && key === "stroked" && slot.stroked && slot.gradient) {
        storeGradient(slot);
        slot.gradient = false;
      }
      if (key === "gradientAngle" || key === "gradientScale") {
        const caption = input.closest("label")?.querySelector("[data-range-label]");
        if (caption) {
          setRangeCaptionValue(
            caption,
            String(Math.round(Number(input.value))),
          );
        }
        const card = input.closest(".slot-card");
        if (card instanceof HTMLElement) {
          if (slot.kind === "text") {
            const chip = card.querySelector<HTMLElement>(".slot-chip");
            if (chip) {
              chip.style.background = chipPreview(slot);
              const sweep = Boolean(slot.gradient && slot.animatedGradient && !slot.stroked);
              chip.classList.toggle("is-gradient-animated", sweep);
              if (sweep) {
                chip.style.setProperty("--sweep-duration", `${gradientPeriodMs(slot.gradientSpeed) / 1000}s`);
                chip.style.setProperty("--grad-angle", String(gradientAngleOf(slot.gradientAngle)));
              } else {
                chip.style.removeProperty("--sweep-duration");
                chip.style.removeProperty("--grad-angle");
              }
            }
          } else {
            paintIconSwatches(card, slot);
          }
        }
      }
      if (key === "gradientSpeed") {
        const caption = input.closest("label")?.querySelector("[data-range-label]");
        if (caption) setRangeCaptionValue(caption, String(Math.round(Number(input.value))));
        const card = input.closest(".slot-card");
        if (card instanceof HTMLElement) {
          const duration = `${gradientPeriodMs(slot.gradientSpeed) / 1000}s`;
          card.querySelectorAll<HTMLElement>(".slot-chip.is-gradient-animated, .shape-swatch.is-gradient-animated").forEach((el) => {
            el.style.setProperty("--sweep-duration", duration);
          });
        }
      }
      if (key === "textAnimSpeed") {
        const caption = input.closest("label")?.querySelector("[data-range-label]");
        if (caption) setRangeCaptionValue(caption, String(Math.round(Number(input.value))));
      }
      if (key === "textHeight" || key === "stroke" || key === "amount" || key === "pillPad" || key === "tracking" || key === "radius" || key === "dropShadowRadius" || key === "dropShadowDistance" || key === "dropShadowOpacity" || key === "exposure" || key === "contrast" || key === "saturation" || key === "hue" || key === "temperature" || key === "attractorStrength" || key === "attractorReach") {
        const caption = input.closest("label")?.querySelector("[data-range-label]");
        if (caption) {
          if (key === "temperature") {
            setRangeCaptionValue(caption, imageTemperatureLabel(Number(input.value)));
          } else {
            const suffix = key === "hue" ? "°" : "";
            setRangeCaptionValue(caption, `${Math.round(Number(input.value))}${suffix}`);
          }
        }
      }
      if (key === "scale" && input instanceof HTMLInputElement) {
        slot.scale = clampSlotScale(slot, Number(value));
        input.max = String(slotScaleSliderMax(slot));
        const caption = input.closest("label")?.querySelector("[data-range-label]");
        if (caption) {
          setRangeCaptionValue(caption, slot.scale.toFixed(2));
        }
      }
      if (key === "lineHeight" && input instanceof HTMLInputElement && slot.kind === "text") {
        slot.lineHeight = lineHeightSliderOf(slot);
        const caption = input.closest("label")?.querySelector("[data-range-label]");
        if (caption) setRangeCaptionValue(caption, textFieldLineHeight(slot).toFixed(2));
      }
      paintFieldReset(input.closest(".field, .check-row") ?? root, slot, key);
      if (
        key === "shape" ||
        key === "amount" ||
        key === "stroked" ||
        key === "tint" ||
        key === "gradient" ||
        key === "animatedGradient" ||
        key === "textAnim" ||
        key === "dropShadow"
      ) {
        renderPanel();
      }
      if (key === "fontFamily") {
        void activateFamily(String(value)).then(() => liveChip(slot.id));
        return;
      }
      // Amount adds/removes chip copies — needs a full refresh. Everything else is
      // slot-local so other pills can keep their gradient / text animations rolling.
      // Shape padding remeshes the collider into neighbors — keep that calm (no rocket).
      if (slot.kind === "image" && key === "amount") live();
      else if (key === "pillPad") liveChip(slot.id, { quiet: true });
      else liveChip(slot.id);
    });
    if (continuous) {
      const finish = () => {
        stopScrub();
        if (pointerHeld || gesture !== gestureKey) return;
        endGesture();
      };
      input.addEventListener("change", finish);
      input.addEventListener("blur", finish);
    }
  });
  wireRangeCaptions(root);
}

function applySlotOrder(visualIds: string[]) {
  // List UI is front→back (top→bottom); state stays back→front for spawn order.
  const ids = visualIds.slice().reverse();
  if (ids.length !== state.slots.length) return;
  if (ids.every((id, index) => id === state.slots[index]?.id)) return;
  const byId = new Map(state.slots.map((slot) => [slot.id, slot]));
  const ordered: Slot[] = [];
  for (const id of ids) {
    const slot = byId.get(id);
    if (!slot) return;
    ordered.push(slot);
  }
  remember();
  state.slots = ordered;
  if (state.physics.layoutMode) world.syncLayerOrder(ids);
  playClick();
}

function canMoveSlotLayer(id: string, where: LayerMove): boolean {
  const index = state.slots.findIndex((slot) => slot.id === id);
  if (index < 0 || state.slots.length < 2) return false;
  const last = state.slots.length - 1;
  if (where === "front" || where === "forward") return index < last;
  return index > 0;
}

/** Reorder one slot in the pile. State is back→front; list UI shows the reverse. */
function moveSlotLayer(id: string, where: LayerMove): boolean {
  if (!canMoveSlotLayer(id, where)) return false;
  const index = state.slots.findIndex((slot) => slot.id === id);
  const last = state.slots.length - 1;
  const next =
    where === "front" ? last : where === "forward" ? index + 1 : where === "backward" ? index - 1 : 0;
  remember();
  const [slot] = state.slots.splice(index, 1);
  state.slots.splice(next, 0, slot!);
  if (state.physics.layoutMode) {
    world.syncLayerOrder(state.slots.map((item) => item.id));
  }
  syncSlotCardOrder();
  playClick();
  return true;
}

/** Keep slot cards in front→back list order without remounting (preserves open cards / menu). */
function syncSlotCardOrder() {
  const stack = panel.querySelector<HTMLElement>("#slots");
  if (!stack) return;
  for (const slot of state.slots.slice().reverse()) {
    const card = stack.querySelector<HTMLElement>(`:scope > .slot-card[data-id="${slot.id}"]`);
    if (card) stack.append(card);
  }
}

let chipEditAbort: AbortController | null = null;

function bindSlotMenuDismiss(
  menu: HTMLElement,
  abort: AbortController,
  onClose: () => void,
  opts?: { keepOnScroll?: () => boolean },
) {
  const { signal } = abort;
  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target;
      if (!(target instanceof Node) || menu.contains(target)) return;
      if (target instanceof Element && target.closest(".color-pop")) return;
      onClose();
    },
    { signal, capture: true },
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") onClose();
    },
    { signal },
  );
  window.addEventListener("resize", onClose, { signal });
  panel.addEventListener(
    "scroll",
    () => {
      if (panelScrollFrame) return;
      if (opts?.keepOnScroll?.()) return;
      onClose();
    },
    { signal, passive: true },
  );
}

function clearCanvas() {
  if (world.editingId()) endChipEdit(false);
  remember();
  openSlots.clear();
  pickedSlotId = null;
  pickedSlotIds.clear();
  world.setPicked(null);

  // Wipe prefabs; keep the active template label and color theme.
  state.slots = [];
  playRemove();
  renderPanel();
  scheduleDraft();

  if (world.chipCount() > 0 && !state.physics.layoutMode) {
    session.clearingDump = true;
    posePinned = false;
    session.dropTicket++;
    world.setFloorOpen(true);
    running = true;
    paused = false;
    world.setRunning(true);
    session.phase = "dumping";
    paintTransport();
    return;
  }

  // Layout mode: same scale-down discard as right-click Remove.
  if (running) {
    running = false;
    paused = false;
    posePinned = false;
    session.dropTicket++;
    session.phase = "idle";
    world.setRunning(false);
    world.setFloorOpen(false);
    paintTransport();
  }
  session.clearingDump = false;
  world.discardAll();
  paintWelcome();
}

function openCanvasMenu(x: number, y: number) {
  closeSlotMenu();
  const abort = new AbortController();
  const menu = document.createElement("div");
  menu.className = "canvas-add-menu";
  menu.setAttribute("role", "menu");

  const at: PlaceAt = { clientX: x, clientY: y };
  const uiHidden = shell.classList.contains("ui-hidden");
  const entries: { label: string; icon: string; run: () => void; clear?: boolean; tip: string }[] = [
    { label: "Pill", icon: pillIcon, tip: "Add a text label inside a rounded pill", run: () => addPillSlot(at) },
    { label: "Words", icon: textAa, tip: "One-line type sized to the letters — a few words, not a wrapping box", run: () => addTypeSlot(at) },
    { label: "Longer text", icon: textT, tip: "A wrapping box you can resize and paste into — sentences and paragraphs", run: () => addTextFieldSlot(at) },
    { label: "Shape", icon: shapesIcon, tip: "Add a built-in shape from the library", run: () => addShapeSlot(at) },
    { label: "Emoji", icon: smileyIcon, tip: "Add an emoji", run: () => addEmojiSlot(at) },
    {
      label: "Image",
      icon: uploadSimple,
      tip: "Add an SVG, PNG, JPG, GIF, or MP4",
      run: () => {
        void pickImageFiles(true).then((files) => {
          if (!files.length) return;
          addImagesFromFiles(files, at);
        });
      },
    },
    {
      label: "Unsplash",
      icon: imagesIcon,
      tip: "Search photos from Unsplash",
      run: () => {
        openUnsplashImport({
          onPick: (file, remote) => addImagesFromFiles([file], at, remote),
        });
      },
    },
    {
      label: "Giphy",
      icon: gifIcon,
      tip: "Search GIFs from Giphy",
      run: () => {
        openGiphyImport({
          onPick: (file, remote) => addImagesFromFiles([file], at, remote),
        });
      },
    },
    {
      label: "YouTube",
      icon: youtubeLogo,
      tip: "Embed a muted looping YouTube clip",
      run: () => {
        openYouTubeImport({
          onPick: (clip) => addYouTubeSlot(clip, at),
        });
      },
    },
    {
      label: uiHidden ? "Show UI" : "Hide UI",
      icon: uiHidden ? eyeIcon : eyeSlash,
      tip: uiHidden ? "Show the editor chrome — shortcut H" : "Hide the editor chrome — shortcut H",
      run: () => {
        const hidden = shell.classList.toggle("ui-hidden");
        playTransition(!hidden);
        if (hidden) closeFontMenu();
        resize();
      },
    },
    { label: "Clear canvas", icon: trashSimple, clear: true, tip: "Remove every piece from the stage", run: () => clearCanvas() },
  ];

  const buttons: HTMLButtonElement[] = [];
  for (const entry of entries) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = entry.clear ? "pill slot-add is-clear" : "pill slot-add";
    btn.setAttribute("role", "menuitem");
    btn.dataset.tip = entry.tip;
    btn.innerHTML = `<span class="slot-add__icon" aria-hidden="true">${entry.icon}</span>${entry.label}`;
    btn.addEventListener("click", () => {
      closeSlotMenu();
      entry.run();
    });
    menu.append(btn);
    buttons.push(btn);
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.body.append(menu);
  placeZoomedFixed(menu, x, y, 8);

  if (!reduceMotion) {
    gsap.fromTo(
      buttons,
      { autoAlpha: 0, y: -10 },
      { autoAlpha: 1, y: 0, duration: 0.11, stagger: 0.025, ease: "power2.out" },
    );
  }

  const closeCurrent = () => {
    abort.abort();
    gsap.killTweensOf(buttons);
    if (peekCloseSlotMenu() === closeCurrent) assignCloseSlotMenu(() => {});
    menu.remove();
  };
  assignCloseSlotMenu(closeCurrent);
  bindSlotMenuDismiss(menu, abort, closeCurrent);
}

function endChipEdit(commit = true) {
  const id = world.editingId();
  if (!id) return;
  chipEditAbort?.abort();
  chipEditAbort = null;
  if (gesture === `canvas-text:${id}`) endGesture();
  world.setEditing(null);
  if (commit) {
    live();
    renderPanel();
  }
}

/** Empty contenteditable often hides the caret — keep a ZWSP placeholder while editing. */
const EDIT_ZWSP = "\u200B";

function readChipEditText(edit: HTMLElement, multiline = false): string {
  const raw = (edit instanceof HTMLTextAreaElement ? edit.value : (edit.innerText ?? edit.textContent ?? ""))
    .replaceAll(EDIT_ZWSP, "");
  return multiline ? raw.replace(/\r\n/g, "\n") : raw.replace(/\n/g, "");
}

function writeChipEditText(edit: HTMLElement, text: string) {
  edit.textContent = text || EDIT_ZWSP;
}

function syncTextFieldBox(slot: Slot) {
  if (!isTextField(slot)) return;
  fitTextFieldBox(slot, trackingEm(trackingOf(slot, state.textTracking)));
}

function liveChip(id: string, opts?: { quiet?: boolean; skipFit?: boolean }) {
  const slot = state.slots.find((item) => item.id === id);
  if (slot && !opts?.skipFit) syncTextFieldBox(slot);
  world.refreshSlot(
    id,
    state.slots,
    state.physics,
    fitScale(),
    state.theme,
    state.pillPad,
    state.textTracking,
    state.sizeRandom,
    opts,
  );
}

function syncSlotScaleUi(slot: Slot) {
  const card = panel.querySelector(`[data-id="${slot.id}"]`);
  if (!card) return;
  const input = card.querySelector<HTMLInputElement>('input[data-key="scale"]');
  if (input) {
    input.max = String(slotScaleSliderMax(slot));
    input.value = String(slot.scale);
    paintRange(input);
  }
  const caption = card.querySelector('[data-range-label="scale"]');
  if (caption) {
    setRangeCaptionValue(caption, slot.scale.toFixed(2));
  }
  paintFieldReset(card, slot, "scale");
}

function syncSlotGradientWheelUi(slot: Slot) {
  const card = panel.querySelector(`[data-id="${slot.id}"]`);
  if (!(card instanceof HTMLElement)) return;
  const angle = gradientAngleOf(slot.gradientAngle);
  const scale = gradientScaleOf(slot.gradientScale);
  const angleInput = card.querySelector<HTMLInputElement>('input[data-key="gradientAngle"]');
  if (angleInput) {
    angleInput.value = String(Math.round(angle));
    paintRange(angleInput);
  }
  const angleCaption = card.querySelector('[data-range-label="gradientAngle"]');
  if (angleCaption) setRangeCaptionValue(angleCaption, String(Math.round(angle)));
  paintFieldReset(card, slot, "gradientAngle");
  const scaleInput = card.querySelector<HTMLInputElement>('input[data-key="gradientScale"]');
  if (scaleInput) {
    scaleInput.value = String(scale);
    paintRange(scaleInput);
  }
  const scaleCaption = card.querySelector('[data-range-label="gradientScale"]');
  if (scaleCaption) setRangeCaptionValue(scaleCaption, String(scale));
  paintFieldReset(card, slot, "gradientScale");
  if (slot.kind === "text") {
    const chip = card.querySelector<HTMLElement>(".slot-chip");
    if (chip) {
      chip.style.background = chipPreview(slot);
      const sweep = Boolean(slot.gradient && slot.animatedGradient && !slot.stroked);
      chip.classList.toggle("is-gradient-animated", sweep);
      if (sweep) {
        chip.style.setProperty("--sweep-duration", `${gradientPeriodMs(slot.gradientSpeed) / 1000}s`);
        chip.style.setProperty("--grad-angle", String(angle));
      } else {
        chip.style.removeProperty("--sweep-duration");
        chip.style.removeProperty("--grad-angle");
      }
    }
  } else if (slot.kind === "image") {
    paintIconSwatches(card, slot);
  }
}

function gradientWheelOf(id: string): { from: string; to: string; angle: number; scale: number } | null {
  const slot = state.slots.find((item) => item.id === id);
  if (!slot || !slot.gradient) return null;
  if (slot.kind === "text") {
    if (slot.stroked) return null;
    return {
      from: slotColor(slot),
      to: gradientEnd(state.theme, slot),
      angle: gradientAngleOf(slot.gradientAngle),
      scale: gradientScaleOf(slot.gradientScale),
    };
  }
  if (!iconCanGradient(slot)) return null;
  return {
    from: slotColor(slot),
    to: gradientEnd(state.theme, slot),
    angle: gradientAngleOf(slot.gradientAngle),
    scale: gradientScaleOf(slot.gradientScale),
  };
}

const textFieldBoxStart = new Map<string, { w: number; h: number }>();

function resizeTextFieldBox(id: string, sx: number, sy: number, phase: "start" | "move" | "end") {
  const slot = state.slots.find((item) => item.id === id);
  if (!slot || !isTextField(slot)) return;
  if (phase === "start") {
    remember(`canvas-box:${id}`);
    textFieldBoxStart.set(id, { w: textFieldBoxW(slot), h: textFieldBoxH(slot) });
    return;
  }
  const start = textFieldBoxStart.get(id) ?? { w: textFieldBoxW(slot), h: textFieldBoxH(slot) };
  slot.boxAuto = false;
  slot.boxW = Math.max(TEXT_FIELD_BOX_MIN, start.w * sx);
  slot.boxH = Math.max(TEXT_FIELD_BOX_MIN, start.h * sy);
  liveChip(id, { quiet: true, skipFit: true });
  if (phase === "end") {
    textFieldBoxStart.delete(id);
    endGesture();
    scheduleDraft();
  }
}

function scaleChip(id: string, scale: number, phase: "start" | "move" | "end") {
  const slot = state.slots.find((item) => item.id === id);
  if (!slot) return;
  if (phase === "start") {
    remember(`canvas-scale:${id}`);
    return;
  }
  const next = clampSlotScale(slot, scale);
  if (slot.scale !== next) {
    slot.scale = next;
    syncSlotScaleUi(slot);
  }
  // World grows the collider live while dragging; remesh once on release so the
  // mesh/mass match the final size (Body.scale is the tactile preview).
  if (phase === "end") {
    liveChip(id, { quiet: true });
    endGesture();
  }
}

function rotateChip(id: string, _angle: number, phase: "start" | "move" | "end") {
  if (phase === "start") {
    remember(`canvas-rotate:${id}`);
    return;
  }
  if (phase === "end") {
    endGesture();
    scheduleDraft();
  }
}

function gradientWheelChip(
  id: string,
  value: { angle: number; scale: number },
  phase: "start" | "move" | "end",
) {
  const slot = state.slots.find((item) => item.id === id);
  if (!slot) return;
  if (phase === "start") {
    remember(`canvas-grad-wheel:${id}`);
    return;
  }
  const nextAngle = gradientAngleOf(value.angle);
  const nextScale = gradientScaleOf(value.scale);
  let changed = false;
  if (gradientAngleOf(slot.gradientAngle) !== nextAngle) {
    slot.gradientAngle = nextAngle;
    changed = true;
  }
  if (gradientScaleOf(slot.gradientScale) !== nextScale) {
    slot.gradientScale = nextScale;
    changed = true;
  }
  if (changed) syncSlotGradientWheelUi(slot);
  if (phase === "end") {
    endGesture();
    scheduleDraft();
  }
}

function openGradWheelStop(id: string, stop: "from" | "to", anchor: HTMLElement) {
  const slot = state.slots.find((item) => item.id === id);
  if (!slot || !slot.gradient) return;
  if (tintPicker?.anchor === anchor) {
    tintPicker.close();
    return;
  }
  tintPicker?.close();
  const end = stop === "to";
  const index = end ? gradientEndIndex(state.theme, slot) : (slot.colorIndex ?? 0);
  const gestureKey = end ? `grad:${slot.id}` : `tint:${slot.id}`;
  const picker = mountColorPicker({
    anchor,
    value: end ? gradientEnd(state.theme, slot) : slotColor(slot),
    onChange(hex) {
      remember(gestureKey);
      if (end) {
        slot.gradientColorIndex = index;
        slot.gradientColor = hex;
      } else {
        slot.colorIndex = index;
        slot.color = hex;
      }
      anchor.style.background = hex;
      const card = panel.querySelector<HTMLElement>(`[data-id="${slot.id}"]`);
      if (card) {
        if (slot.kind === "text") {
          const chip = card.querySelector<HTMLElement>(".slot-chip");
          if (chip) chip.style.background = chipPreview(slot);
          syncImplicitTextRow(card, slot, slotColor(slot));
          paintFieldReset(card, slot, end ? "gradientColor" : "color");
        } else if (slot.kind === "image") {
          paintIconSwatches(card, slot);
          paintFieldReset(card, slot, end ? "gradientColor" : "color");
        }
      }
      liveChip(slot.id);
    },
    onClose() {
      if (gesture === gestureKey) endGesture();
      if (tintPicker?.anchor === anchor) tintPicker = null;
    },
  });
  tintPicker = { anchor, close: picker.close };
}

function editChipText(id: string, select: "all" | "end", at?: { x: number; y: number }) {
  const slot = state.slots.find((item) => item.id === id);
  if (!slot || slot.kind !== "text") return;
  closeSlotMenu();
  if (world.editingId() === id) {
    const edit = world.chipEl(id)?.querySelector<HTMLElement>(":scope > .chip-edit");
    edit?.focus();
    selectChipEdit(edit, select, at);
    return;
  }
  endChipEdit();
  world.setEditing(id);
  // Text fields keep the selection box so you can size while the caret is in.
  if (!isTextField(slot)) {
    world.setPicked(null);
    pickedSlotId = null;
    pickedSlotIds.clear();
    panel.querySelectorAll(".slot-card.is-picked").forEach((el) => el.classList.remove("is-picked"));
  }
  liveChip(id);

  const edit = world.chipEl(id)?.querySelector<HTMLElement>(":scope > .chip-edit");
  if (!edit) {
    world.setEditing(null);
    // No chip on stage yet — fall back to the panel text field.
    focusSlotId = id;
    openSlots.add(id);
    panelTab = "physics";
    renderPanel();
    const card = panel.querySelector<HTMLElement>(`[data-id="${id}"]`);
    const toggle = card?.querySelector<HTMLElement>(".slot-toggle");
    if (slot && toggle) setSlotOpen(toggle, slot, true, true);
    return;
  }
  writeChipEditText(edit, slot.text);
  const abort = new AbortController();
  chipEditAbort = abort;
  const { signal } = abort;
  const panelInput = panel.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-id="${id}"] .slot-live`);
  const field = isTextField(slot);
  // Ignore blur from the double-click / focus handoff that started this edit.
  let armBlur = false;
  window.setTimeout(() => {
    armBlur = true;
  }, 50);

  edit.addEventListener(
    "input",
    () => {
      remember(`canvas-text:${id}`);
      let next = readChipEditText(edit, field);
      if (field) {
        next = clampTextFieldWords(next);
        if (next !== readChipEditText(edit, true)) writeChipEditText(edit, next);
      }
      slot.text = next;
      // Keep a ZWSP so an emptied field still shows a caret.
      if (!slot.text && !field && edit.textContent !== EDIT_ZWSP) {
        writeChipEditText(edit, "");
        selectChipEdit(edit, "start");
      }
      if (panelInput) panelInput.value = slot.text;
      liveChip(id);
    },
    { signal },
  );
  edit.addEventListener(
    "paste",
    (event) => {
      if (!field) return;
      event.preventDefault();
      const clip = event.clipboardData?.getData("text/plain") ?? "";
      document.execCommand("insertText", false, clip);
    },
    { signal },
  );
  edit.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" || (!field && event.key === "Enter")) {
        event.preventDefault();
        endChipEdit();
      }
    },
    { signal },
  );
  edit.addEventListener(
    "blur",
    () => {
      queueMicrotask(() => {
        if (!armBlur) return;
        if (world.editingId() !== id) return;
        if (document.activeElement?.closest?.(".chip-edit, .slot-menu, .slot-menu-host")) return;
        endChipEdit();
      });
    },
    { signal },
  );

  // Focus after the dblclick event finishes so preventDefault/focus fights settle.
  window.setTimeout(() => {
    if (world.editingId() !== id) return;
    edit.focus();
    selectChipEdit(edit, select, at);
  }, 0);
}

function chipEditOffsetAfterWord(edit: HTMLElement, at: { x: number; y: number }): number {
  const text = readChipEditText(edit);
  let offset = text.length;
  const pos = document.caretPositionFromPoint?.(at.x, at.y);
  if (pos && edit.contains(pos.offsetNode)) {
    const span = document.createRange();
    span.selectNodeContents(edit);
    span.setEnd(pos.offsetNode, pos.offset);
    offset = span.toString().replaceAll(EDIT_ZWSP, "").length;
  } else {
    const hit = document.caretRangeFromPoint?.(at.x, at.y);
    if (hit && edit.contains(hit.startContainer)) {
      const span = document.createRange();
      span.selectNodeContents(edit);
      span.setEnd(hit.startContainer, hit.startOffset);
      offset = span.toString().replaceAll(EDIT_ZWSP, "").length;
    }
  }
  while (offset < text.length && !/\s/.test(text[offset]!)) offset += 1;
  return offset;
}

function selectChipEdit(
  edit: HTMLElement | null | undefined,
  mode: "all" | "start" | "end",
  at?: { x: number; y: number },
) {
  if (!edit) return;
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  if (mode === "end" && at) {
    const node = edit.firstChild;
    const offset = chipEditOffsetAfterWord(edit, at);
    if (node?.nodeType === Node.TEXT_NODE) {
      range.setStart(node, Math.max(0, Math.min(offset, node.textContent?.length ?? 0)));
      range.collapse(true);
    } else {
      range.selectNodeContents(edit);
      range.collapse(false);
    }
  } else {
    range.selectNodeContents(edit);
    if (mode === "start") range.collapse(true);
    else if (mode === "end") range.collapse(false);
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

function invertHex(hex: string): string {
  const raw = hex.replace("#", "").trim();
  const full = raw.length === 3 ? raw.split("").map((channel) => channel + channel).join("") : raw;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value) || full.length < 6) return "#000000";
  const channel = (byte: number) => (255 - byte).toString(16).padStart(2, "0");
  return `#${channel((value >> 16) & 255)}${channel((value >> 8) & 255)}${channel(value & 255)}`;
}

function invertSlot(id: string) {
  const slot = state.slots.find((item) => item.id === id);
  if (!slot) return;
  remember();
  // Rasters aren't color-masked — invert pixels instead of theme ink.
  if (slot.kind === "image" && isRasterUpload(slot)) {
    slot.inverted = !slot.inverted;
    playInvert();
    liveChip(id);
    return;
  }
  if (slot.kind === "image" && uploadedShape(slot) && isSvgSource(slot) && !slot.tint) {
    slot.tint = true;
  }
  slot.color = invertHex(slotColor(slot));
  if (slot.gradient) {
    slot.gradientColor = invertHex(gradientEnd(state.theme, slot));
  }
  playInvert();
  // Color-only: refresh this slot's chips. Avoid renderPanel/live — they remount or
  // repaint enough to make the open context menu flicker.
  liveChip(id);
}

function flipSlot(id: string, axis: "x" | "y") {
  remember();
  world.flipChips(id, axis);
  playSwitch(true);
}

function alignSlotStraight(id: string) {
  remember();
  world.alignChipsStraight(id);
  playSwitch(true);
}

async function relinkSlotContent(id: string): Promise<boolean> {
  const slot = state.slots.find((item) => item.id === id);
  if (!slot || slot.kind !== "image") return false;
  const ok = await relinkSlotImage(slot);
  if (!ok) {
    void askNotice({
      title: "Couldn’t re-link",
      body: "That Unsplash or Giphy file couldn’t be fetched. Check the API key and try again.",
    });
    return false;
  }
  await ensureTrim(slot.src, slot.name).catch(() => {});
  renderPanel();
  live();
  return true;
}

function duplicateSlot(id: string) {
  const index = state.slots.findIndex((slot) => slot.id === id);
  const source = state.slots[index];
  if (!source) return;
  const next = panel.querySelector<HTMLElement>(`[data-id="${id}"]`)?.nextElementSibling;
  const anchor = next instanceof HTMLElement ? next : panel.querySelector<HTMLElement>(".slot-adds");
  const anchorId = anchor?.classList.contains("slot-card") ? anchor.dataset.id ?? null : null;
  remember();
  const copy = structuredClone(source);
  copy.id = uid();
  copy.attractor = undefined;
  if (copy.kind === "text") sanitizeTextMotion(copy);
  copyBaseline(source, copy);
  state.slots.splice(index + 1, 0, copy);
  revealSlotId = copy.id;
  insertMotion = {
    id: copy.id,
    scroll: panel.scrollTop,
    anchorId,
    anchorTop: anchor?.getBoundingClientRect().top ?? 0,
  };
  playCreate();
  renderPanel();
  live();
}

/** Full asset clipboard for ⌘/Ctrl+C/V (separate from look-only styleClipboard). */
let slotClipboard: Slot[] | null = null;

function copyPickedSlots(): boolean {
  if (pickedSlotIds.size === 0) return false;
  const selected = pickedSlotIds;
  const slots = state.slots.filter((slot) => selected.has(slot.id));
  if (!slots.length) return false;
  slotClipboard = structuredClone(slots);
  playClick();
  return true;
}

function pasteClipboardSlots(): boolean {
  if (!slotClipboard?.length) return false;
  remember();
  const copies: Slot[] = [];
  for (const source of slotClipboard) {
    const copy = structuredClone(source);
    copy.id = uid();
    copy.attractor = undefined;
    if (copy.kind === "text") sanitizeTextMotion(copy);
    captureBaseline(copy);
    copies.push(copy);
  }
  let insertAt = state.slots.length;
  if (pickedSlotId) {
    const idx = state.slots.findIndex((slot) => slot.id === pickedSlotId);
    if (idx >= 0) insertAt = idx + 1;
  }
  state.slots.splice(insertAt, 0, ...copies);

  const last = copies[copies.length - 1]!;
  revealSlotId = last.id;
  if (copies.length === 1) {
    const next = panel.querySelector<HTMLElement>(`[data-id="${pickedSlotId}"]`)?.nextElementSibling;
    const anchor = next instanceof HTMLElement ? next : panel.querySelector<HTMLElement>(".slot-adds");
    insertMotion = {
      id: last.id,
      scroll: panel.scrollTop,
      anchorId: anchor?.classList.contains("slot-card") ? anchor.dataset.id ?? null : null,
      anchorTop: anchor?.getBoundingClientRect().top ?? 0,
    };
  }

  pickedSlotIds.clear();
  for (const copy of copies) pickedSlotIds.add(copy.id);
  pickedSlotId = last.id;

  playCreate();
  renderPanel();
  live();
  applyWorldPick();
  syncPanelPicks();
  return true;
}

/** Look-only clipboard — never includes text / image contents. */
type TextStyleClip = Omit<TextSlot, "id" | "kind" | "text">;
type ImageStyleClip = Omit<ImageSlot, "id" | "kind" | "src" | "name" | "size" | "amount" | "emoji" | "collider">;
type SlotStyleClipboard =
  | { kind: "text"; style: TextStyleClip }
  | { kind: "image"; style: ImageStyleClip };

let styleClipboard: SlotStyleClipboard | null = null;

function copySlotStyle(slot: Slot) {
  if (slot.kind === "text") {
    styleClipboard = {
      kind: "text",
      style: {
        fontFamily: slot.fontFamily,
        fontWeight: slot.fontWeight,
        fontSize: slot.fontSize,
        textHeight: slot.textHeight,
        lineHeight: slot.lineHeight,
        pillPad: slot.pillPad,
        tracking: slot.tracking,
        shape: slot.shape,
        radius: slot.radius,
        stroked: slot.stroked,
        stroke: slot.stroke,
        colorIndex: slot.colorIndex,
        color: slot.color,
        gradient: slot.gradient,
        gradientFromIndex: slot.gradientFromIndex,
        gradientFrom: slot.gradientFrom,
        gradientColorIndex: slot.gradientColorIndex,
        gradientColor: slot.gradientColor,
        gradientAngle: slot.gradientAngle,
        gradientScale: slot.gradientScale,
        animatedGradient: slot.animatedGradient,
        gradientSpeed: slot.gradientSpeed,
        textAnim: slot.textAnim,
        textAnimSpeed: slot.textAnimSpeed,
        textColorIndex: slot.textColorIndex,
        textColor: slot.textColor,
        blend: slot.blend,
        dropShadow: slot.dropShadow,
        dropShadowRadius: slot.dropShadowRadius,
        dropShadowDistance: slot.dropShadowDistance,
        dropShadowOpacity: slot.dropShadowOpacity,
        dropShadowColor: slot.dropShadowColor,
        scale: slot.scale,
        textField: slot.textField,
        boxW: slot.boxW,
        boxH: slot.boxH,
        boxAuto: slot.boxAuto,
        align: slot.align,
        italic: slot.italic,
      },
    };
  } else {
    styleClipboard = {
      kind: "image",
      style: {
        colorIndex: slot.colorIndex,
        color: slot.color,
        gradient: slot.gradient,
        gradientColorIndex: slot.gradientColorIndex,
        gradientColor: slot.gradientColor,
        gradientAngle: slot.gradientAngle,
        gradientScale: slot.gradientScale,
        animatedGradient: slot.animatedGradient,
        gradientSpeed: slot.gradientSpeed,
        scale: slot.scale,
        radius: slot.radius,
        stroked: slot.stroked,
        stroke: slot.stroke,
        inverted: slot.inverted,
        exposure: slot.exposure,
        contrast: slot.contrast,
        saturation: slot.saturation,
        hue: slot.hue,
        temperature: slot.temperature,
        tint: slot.tint,
        blend: slot.blend,
        dropShadow: slot.dropShadow,
        dropShadowRadius: slot.dropShadowRadius,
        dropShadowDistance: slot.dropShadowDistance,
        dropShadowOpacity: slot.dropShadowOpacity,
        dropShadowColor: slot.dropShadowColor,
      },
    };
  }
  playClick();
}

function canPasteSlotStyle(slot: Slot): boolean {
  return styleClipboard != null && styleClipboard.kind === slot.kind;
}

function pasteSlotStyle(id: string) {
  const slot = state.slots.find((item) => item.id === id);
  if (!slot || !canPasteSlotStyle(slot) || !styleClipboard) return;
  remember();
  if (slot.kind === "text" && styleClipboard.kind === "text") {
    const style = styleClipboard.style;
    slot.fontFamily = style.fontFamily;
    slot.fontWeight = style.fontWeight;
    slot.fontSize = style.fontSize;
    slot.textHeight = style.textHeight;
    slot.pillPad = style.pillPad;
    slot.tracking = style.tracking;
    slot.shape = style.shape;
    slot.radius = style.radius;
    slot.stroked = style.stroked;
    slot.stroke = style.stroke;
    slot.colorIndex = style.colorIndex;
    slot.color = style.color;
    slot.gradient = style.gradient;
    slot.gradientFromIndex = style.gradientFromIndex;
    slot.gradientFrom = style.gradientFrom;
    slot.gradientColorIndex = style.gradientColorIndex;
    slot.gradientColor = style.gradientColor;
    slot.gradientAngle = style.gradientAngle;
    slot.gradientScale = style.gradientScale;
    slot.animatedGradient = style.animatedGradient;
    slot.gradientSpeed = style.gradientSpeed;
    slot.textAnim = style.textAnim;
    slot.textAnimSpeed = style.textAnimSpeed;
    sanitizeTextMotion(slot);
    slot.textColorIndex = style.textColorIndex;
    slot.textColor = style.textColor;
    slot.blend = style.blend;
    slot.dropShadow = style.dropShadow;
    slot.dropShadowRadius = style.dropShadowRadius;
    slot.dropShadowDistance = style.dropShadowDistance;
    slot.dropShadowOpacity = style.dropShadowOpacity;
    slot.dropShadowColor = style.dropShadowColor;
    slot.scale = style.scale;
    if (isTextField(slot)) {
      slot.textField = true;
      slot.textAnim = undefined;
      slot.align = style.align;
      slot.italic = style.italic;
      slot.lineHeight = style.lineHeight;
      if (style.boxW != null) slot.boxW = style.boxW;
      if (style.boxH != null) slot.boxH = style.boxH;
      slot.boxAuto = style.boxAuto;
    } else {
      slot.textField = undefined;
      slot.boxW = undefined;
      slot.boxH = undefined;
      slot.boxAuto = undefined;
      slot.lineHeight = undefined;
    }
    playClick();
    void settleFont(slot.fontFamily, slot.fontWeight).then(() => {
      renderPanel();
      live();
    });
    return;
  }
  if (slot.kind === "image" && styleClipboard.kind === "image") {
    const style = styleClipboard.style;
    slot.colorIndex = style.colorIndex;
    slot.color = style.color;
    slot.gradient = style.gradient;
    slot.gradientColorIndex = style.gradientColorIndex;
    slot.gradientColor = style.gradientColor;
    slot.gradientAngle = style.gradientAngle;
    slot.gradientScale = style.gradientScale;
    slot.animatedGradient = style.animatedGradient;
    slot.gradientSpeed = style.gradientSpeed;
    slot.scale = style.scale;
    slot.radius = style.radius;
    slot.stroked = style.stroked;
    slot.stroke = style.stroke;
    slot.inverted = style.inverted;
    slot.exposure = style.exposure;
    slot.contrast = style.contrast;
    slot.saturation = style.saturation;
    slot.hue = style.hue;
    slot.temperature = style.temperature;
    slot.tint = style.tint;
    slot.blend = style.blend;
    slot.dropShadow = style.dropShadow;
    slot.dropShadowRadius = style.dropShadowRadius;
    slot.dropShadowDistance = style.dropShadowDistance;
    slot.dropShadowOpacity = style.dropShadowOpacity;
    slot.dropShadowColor = style.dropShadowColor;
    playClick();
    renderPanel();
    live();
  }
}

const INSERT_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const INSERT_MS = 280;

function growInsertedSlot(motion: InsertMotion) {
  const card = panel.querySelector<HTMLElement>(`[data-id="${motion.id}"]`);
  if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const gap = parseFloat(getComputedStyle(card.parentElement ?? card).rowGap) || 0;
  const box = getComputedStyle(card);
  const full = card.getBoundingClientRect().height;
  const padTop = box.paddingTop;
  const padBottom = box.paddingBottom;
  card.style.overflow = "hidden";
  card.style.minHeight = "0px";
  card.style.height = "0px";
  card.style.paddingTop = "0px";
  card.style.paddingBottom = "0px";
  card.style.marginBottom = `${-gap}px`;

  const anchor = motion.anchorId
    ? panel.querySelector<HTMLElement>(`[data-id="${motion.anchorId}"]`)
    : panel.querySelector<HTMLElement>(".slot-adds");
  if (anchor) {
    const scrollDelta = panel.scrollTop - motion.scroll;
    const error = anchor.getBoundingClientRect().top - (motion.anchorTop - scrollDelta);
    if (Math.abs(error) > 0.5) card.style.marginBottom = `${-gap - error}px`;
  }

  const anim = card.animate(
    [
      {
        height: "0px",
        paddingTop: "0px",
        paddingBottom: "0px",
        marginBottom: card.style.marginBottom,
      },
      {
        height: `${full}px`,
        paddingTop: padTop,
        paddingBottom: padBottom,
        marginBottom: "0px",
      },
    ],
    { duration: INSERT_MS, easing: INSERT_EASE, fill: "forwards" },
  );
  anim.finished
    .then(() => {
      card.style.height = "";
      card.style.minHeight = "";
      card.style.paddingTop = "";
      card.style.paddingBottom = "";
      card.style.marginBottom = "";
      card.style.overflow = "";
      anim.cancel();
      scrollPanelTo(card);
      pinPageScroll();
    })
    .catch(() => {});
}

function removeSlot(id: string) {
  if (world.editingId() === id) endChipEdit(false);
  remember();
  openSlots.delete(id);
  releasePick(id);
  state.slots = state.slots.filter((slot) => slot.id !== id);
  playRemove();
  renderPanel();
  live();
}

/** Delete every selected piece in one undo step. */
function removePickedSlots() {
  const ids = [...pickedSlotIds];
  if (ids.length === 0) return;
  const editing = world.editingId();
  if (editing && ids.includes(editing)) endChipEdit(false);
  closeSlotMenu();
  remember();
  for (const id of ids) openSlots.delete(id);
  pickedSlotId = null;
  pickedSlotIds.clear();
  world.setPicked(null);
  const drop = new Set(ids);
  state.slots = state.slots.filter((slot) => !drop.has(slot.id));
  playRemove();
  renderPanel();
  live();
}

function reflectGlobalWeight() {
  globalWeightPick?.reflect(sharedFamily() ?? "", sharedWeight());
}

async function applyWeightEverywhere(weight: number) {
  const family = sharedFamily();
  if (!family) return;
  remember();
  const chosen = chosenWeight(family, weight);
  for (const slot of allTextSlots()) slot.fontWeight = chosen;
  await settleFont(family, chosen);
  renderPanel();
  live();
}

async function applyFontEverywhere(family: string) {
  remember();
  appliedFont = family;
  const listedLocal = localFamilies.some((name) => name.toLowerCase() === family.toLowerCase());
  if (listedLocal || machineFont.toLowerCase() === family.toLowerCase()) machineFont = family;
  else machineFont = "";
  await activateFamily(family);
  const weights = new Set<number>();
  for (const slot of state.slots) {
    if (slot.kind !== "text") continue;
    slot.fontFamily = family;
    slot.fontWeight = nearestWeight(family, slot.fontWeight);
    weights.add(slot.fontWeight);
  }
  await Promise.all(
    [...weights].map((weight) => document.fonts.load(`${weight} 28px "${family}"`).catch(() => undefined)),
  );
  renderPanel();
  live();
}

async function loadLocalFonts() {
  try {
    localFamilies = await queryLocalCatalog();
    renderPanel();
  } catch (error) {
    if (error instanceof Error && error.message === "unsupported") {
      window.alert("This browser can’t list local fonts. Type a font name instead.");
      return;
    }
    window.alert("Local font access was blocked. Type a font name instead.");
  }
}

/** Pills swell on bass; all chips hop on bass; icons shrink (−20%) + hop on sharp. */
const AUDIO_SHARP_SCALE = 0.8;
const AUDIO_ICON_JUMP = 13;
/** Bass hop for every chip — was pill-only at ICON/3 and missed big type / photos. */
const AUDIO_BASS_JUMP = 11;
const AUDIO_PEAK_COOLDOWN_MS = 160;
const AUDIO_JUMP_COOLDOWN_MS = 340;
const AUDIO_HOLD_MS = 220;
const AUDIO_ANIM_MS = 100;
const AUDIO_HUE_UP_MS = 70;
const AUDIO_HUE_DOWN_MS = 220;
let audioTargetMul = new Map<string, number>();
let audioFromMul = new Map<string, number>();
let audioDisplayMul = new Map<string, number>();
let audioAnimAt = 0;
let audioBassAt = 0;
let audioSharpAt = 0;
let audioIconJumpAt = 0;
let audioTextJumpAt = 0;
let audioClearAt = 0;
let audioReturning = false;
let audioHueOffset = 0;
let audioHueFrom = 0;
let audioHueTarget = 0;
let audioHueAnimAt = 0;
let audioHuePhase: "idle" | "up" | "down" = "idle";

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function isIconSlot(slot: Slot) {
  return slot.kind === "image";
}

/** Bass swell is for holding pills only — not bare type, boxes, or icons. */
function isBassBoostSlot(slot: Slot) {
  return slot.kind === "text" && slot.shape === "pill";
}

/** Pulse one group; leave the other group's in-flight targets alone. */
function pushAudioGroup(group: "text" | "icon", mul: number) {
  const next = new Map(audioTargetMul);
  audioFromMul = new Map(audioDisplayMul);

  for (const slot of state.slots) {
    const current = audioDisplayMul.get(slot.id) ?? 1;
    if (!audioFromMul.has(slot.id)) audioFromMul.set(slot.id, current);

    const match = group === "icon" ? isIconSlot(slot) : isBassBoostSlot(slot);
    if (match) next.set(slot.id, mul);
    else if (!next.has(slot.id)) next.set(slot.id, current);
  }

  audioTargetMul = next;
  audioReturning = false;
  audioAnimAt = performance.now();
  audioClearAt = performance.now() + AUDIO_HOLD_MS;

  if (session.phase === "holding") {
    posePinned = false;
    session.phase = "falling";
    session.settledSince = 0;
    session.holdStarted = 0;
  }
  session.lastInteractAt = performance.now();

  const bounce = state.audioReact.bounce;
  if (group === "icon") {
    const ids = state.slots.filter(isIconSlot).map((slot) => slot.id);
    const now = performance.now();
    if (now - audioIconJumpAt >= AUDIO_JUMP_COOLDOWN_MS) {
      audioIconJumpAt = now;
      world.impulseAudioJump(ids, AUDIO_ICON_JUMP * bounce);
    }
  } else {
    // Swell stays pill-only above; hop every chip so heavy type / photos thump on kicks.
    const ids = state.slots.map((slot) => slot.id);
    const now = performance.now();
    if (now - audioTextJumpAt >= AUDIO_JUMP_COOLDOWN_MS) {
      audioTextJumpAt = now;
      world.impulseAudioJump(ids, AUDIO_BASS_JUMP * bounce);
    }
  }
}

function returnAudioTargets() {
  if (audioTargetMul.size === 0) return;
  let anyOff = false;
  for (const mul of audioTargetMul.values()) {
    if (mul !== 1) {
      anyOff = true;
      break;
    }
  }
  if (!anyOff && audioDisplayMul.size === 0) return;
  audioFromMul = new Map(audioDisplayMul);
  audioTargetMul = new Map();
  for (const slot of state.slots) {
    if (!audioFromMul.has(slot.id)) audioFromMul.set(slot.id, 1);
    audioTargetMul.set(slot.id, 1);
  }
  audioReturning = true;
  audioAnimAt = performance.now();
  session.lastInteractAt = performance.now();
}

function clearAudioScale() {
  audioTargetMul = new Map();
  audioFromMul = new Map();
  audioDisplayMul = new Map();
  audioReturning = false;
  world.setAudioScales(null);
  clearAudioHue();
}

function pushAudioHue(now: number) {
  const peak = state.audioReact.hueNudge;
  if (peak <= 0) return;
  audioHueFrom = audioHueOffset;
  audioHueTarget = peak;
  audioHueAnimAt = now;
  audioHuePhase = "up";
}

function clearAudioHue() {
  if (audioHuePhase === "idle" && audioHueOffset === 0) return;
  audioHueOffset = 0;
  audioHueFrom = 0;
  audioHueTarget = 0;
  audioHuePhase = "idle";
  applyPost();
}

function paintAudioHue(now: number) {
  if (audioHuePhase === "idle") return;

  const duration = audioHuePhase === "up" ? AUDIO_HUE_UP_MS : AUDIO_HUE_DOWN_MS;
  const t = Math.min(1, (now - audioHueAnimAt) / duration);
  const e = easeOutCubic(t);
  audioHueOffset = audioHueFrom + (audioHueTarget - audioHueFrom) * e;
  applyPost();

  if (t < 1) return;
  if (audioHuePhase === "up") {
    audioHueFrom = audioHueOffset;
    audioHueTarget = 0;
    audioHueAnimAt = now;
    audioHuePhase = "down";
    return;
  }
  audioHueOffset = 0;
  audioHuePhase = "idle";
  applyPost();
}

function paintAudioScales(now: number) {
  paintAudioHue(now);
  if (audioTargetMul.size === 0 && audioDisplayMul.size === 0) return;

  const t = Math.min(1, (now - audioAnimAt) / AUDIO_ANIM_MS);
  const e = easeOutCubic(t);
  const next = new Map<string, number>();
  let anyActive = false;

  for (const [id, target] of audioTargetMul) {
    const from = audioFromMul.get(id) ?? 1;
    const value = from + (target - from) * e;
    if (Math.abs(value - 1) > 0.001) {
      next.set(id, value);
      anyActive = true;
    }
  }

  audioDisplayMul = next;
  world.setAudioScales(anyActive ? next : null);

  if (t >= 1 && audioReturning) {
    clearAudioScale();
  }
}

function audioReactShouldListen(): boolean {
  return state.audioReact.enabled && !state.physics.layoutMode;
}

function pauseAudioReactMic() {
  setUiSoundsMuted(false);
  stopMic();
  clearAudioScale();
}

async function setAudioReactEnabled(on: boolean) {
  if (on && state.physics.layoutMode) return;
  state.audioReact.enabled = on;
  setUiSoundsMuted(on);
  if (!on) {
    stopMic();
    clearAudioScale();
    renderPanel();
    return;
  }
  renderPanel();
  const ok = await startMic();
  if (!ok) {
    state.audioReact.enabled = false;
    setUiSoundsMuted(false);
    window.alert("Microphone access was blocked or unavailable.");
    renderPanel();
    return;
  }
  renderPanel();
}

function tickAudioReact(now: number) {
  if (!audioReactShouldListen()) {
    paintAudioScales(now);
    return;
  }
  if (!isMicActive()) {
    paintAudioScales(now);
    return;
  }

  const bands = sampleOnset(state.audioReact.sensitivity);
  const onsetThresh = 0.055 - (state.audioReact.sensitivity / 100) * 0.035;
  const bassHit = bands.bassFlux >= onsetThresh && now - audioBassAt >= AUDIO_PEAK_COOLDOWN_MS;
  const sharpHit = bands.sharpFlux >= onsetThresh && now - audioSharpAt >= AUDIO_PEAK_COOLDOWN_MS;

  if (bassHit) {
    audioBassAt = now;
    pushAudioGroup("text", 1 + state.audioReact.bassBoost / 100);
  }
  if (sharpHit) {
    audioSharpAt = now;
    pushAudioGroup("icon", AUDIO_SHARP_SCALE);
    pushAudioHue(now);
  }
  if (!bassHit && !sharpHit && !audioReturning && audioTargetMul.size > 0 && now >= audioClearAt) {
    returnAudioTargets();
  }

  paintAudioScales(now);
}

function relayout(opts?: { quiet?: boolean }) {
  return world.refresh(
    state.slots,
    state.physics,
    fitScale(),
    state.theme,
    state.pillPad,
    state.textTracking,
    state.sizeRandom,
    opts,
  );
}

function refreshUploadPreviews() {
  for (const slot of state.slots) {
    if (slot.kind !== "image" || !slot.src || slot.emoji || presetIdForSrc(slot.src)) continue;
    const src = peekTrim(slot.src)?.displaySrc;
    if (!src) continue;
    const card = panel.querySelector<HTMLElement>(`[data-id="${slot.id}"]`);
    if (!card) continue;
    const mask = `url("${src}")`;
    card.querySelectorAll<HTMLElement>(".slot-mark .shape-swatch, .pick-glyph.shape-swatch").forEach((swatch) => {
      swatch.style.webkitMaskImage = mask;
      swatch.style.maskImage = mask;
    });
    card.querySelectorAll<HTMLImageElement>(".slot-mark img, img.pick-glyph").forEach((img) => {
      if (img.getAttribute("src") !== src) img.src = src;
    });
  }
}

function live(opts?: { quiet?: boolean; skipFit?: boolean }) {
  for (const slot of state.slots) {
    const next = clampSlotScale(slot, slot.scale);
    if (next !== slot.scale) slot.scale = next;
    if (!opts?.skipFit) syncTextFieldBox(slot);
  }
  const bump = () => {
    refreshUploadPreviews();
    const before = world.chipCount();
    const disturbed = relayout(opts);
    // Add/remove or remesh (Composition Scale etc.) should wake a held pile.
    // Quiet pad remesh still marks interact time but skips the theatrical fall kick.
    if (disturbed || world.chipCount() !== before) {
      session.lastInteractAt = performance.now();
      if (opts?.quiet) {
        /* calm mesh update — neighbors already depenetrated without rockets */
      } else if (session.phase === "holding" && !state.physics.layoutMode) {
        posePinned = false;
        session.phase = "falling";
        session.settledSince = 0;
        session.holdStarted = 0;
      } else if (state.physics.layoutMode && world.chipCount() > 0) {
        world.freezePile();
        world.sync();
        posePinned = true;
        if (running) session.phase = "holding";
      }
      paintWelcome();
    }
    if (state.physics.layoutMode) {
      world.syncLayerOrder(state.slots.map((slot) => slot.id));
    }
    paintSectionResets(panel, state);
  };
  bump();
  void Promise.all([ensureTrims(state.slots), ensureTextFonts(state.slots)]).then(bump);
  if (state.physics.layoutMode) scheduleLiveThumb();
}

function escapeAttr(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

const shell = app.querySelector(".app")!;
const playBtn = app.querySelector<HTMLButtonElement>("#play")!;
const loopBtn = app.querySelector<HTMLButtonElement>("#loop")!;
const copyBtn = app.querySelector<HTMLButtonElement>("#copy-settings")!;
const devPanel = app.querySelector<HTMLElement>("#dev-panel")!;

/** One playthrough of public/images/intropill.gif (40 frames × 5cs), shortened 0.25s. */
const INTRO_MS = 2000;
const INTRO_PILL_SCALE_S = 1.75;
const INTRO_PILL_SCALE_FROM = 1;
const INTRO_PILL_SCALE_TO = 0.5;
const INTRO_PILL_SCALE_EASE = "circ.out";
const INTRO_SRC = "/images/intropill.gif";
/** Left→right wipe timings live in logotypeReveal.ts — hold is intro-only. */
const INTRO_LOGO_HOLD_S = 1;
const INTRO_LOGO_SCALE_FROM = 1.5;
const INTRO_LOGO_SCALE_TO = 1;
const INTRO_LOGO_SCALE_EASE = "expo.inOut";
let introActive = true;
/** Flips true when boot finishes and the main UI is revealed — logo stays white until then. */
let logotypeLive = false;
/** Header wordmark colors. No-op until the topbar mark is mounted. */
let headerLogotype: { refresh(): void; retarget(): void } = { refresh() {}, retarget() {} };

/**
 * Pill → readable theme accent once live (skips fills that match the backdrop).
 * Glyphs → white/black against the canvas fill (luminance gap, never the same colour).
 * Load sequence keeps everything white.
 */
function syncLogotypeAccent() {
  const backdrop = logoBackdropColor(state.background, state.stageColor);
  const pill = logotypeLive ? logotypePillColor(state.theme, backdrop) : "#ffffff";
  const ink = logotypeLive ? logotypeInk(backdrop) : "#ffffff";
  document.documentElement.style.setProperty("--logotype-pill", pill);
  document.documentElement.style.setProperty("--logotype-ink", ink);
  headerLogotype.refresh();
}

/** Resolves when the intro animation has finished (overlay may still cover). */
let resolveIntroAnim: (() => void) | null = null;
const introAnimDone = new Promise<void>((resolve) => {
  resolveIntroAnim = resolve;
});
/** Hold UI reveal until draft/reconnect boot finishes. */
let resolveBootHold: (() => void) | null = null;
const bootHold = new Promise<void>((resolve) => {
  resolveBootHold = resolve;
});

/** Fresh Mode Select → fade the falling preview out after chrome lands (not reconnect). */
let modeSelectContinuity = false;

function finishIntro() {
  if (!introActive) return;
  introActive = false;
  resolveIntroAnim?.();
  resolveIntroAnim = null;
  void bootHold.then(() => {
    const intro = app.querySelector<HTMLElement>("#app-intro");
    const dismissIntro = () => {
      if (!intro) return;
      intro.classList.add("is-done");
      const remove = () => intro.remove();
      intro.addEventListener("transitionend", remove, { once: true });
      window.setTimeout(remove, 500);
    };

    if (modeSelectContinuity) {
      // Fade finished under the dumping preview before — wait until it's gone, then 1s in.
      gridHoldForHandoff = true;
      handoffModeSelectPreview(() => bootRevealGrid());
    } else {
      stopModeSelectPreview();
    }
    logotypeLive = true;
    syncLogotypeAccent();
    shell.classList.remove("ui-hidden");
    applyGrid(); // held at --grid-reveal 0 while gridHoldForHandoff
    if (!modeSelectContinuity) {
      if (state.background.logoId) applyLogo();
      releaseProTips();
    }
    resize();
    dismissIntro();
  });
}

async function preloadIntroGif(): Promise<void> {
  const warm = new Image();
  warm.src = INTRO_SRC;
  if (warm.decode) await warm.decode();
  else if (!warm.complete) {
    await new Promise<void>((resolve, reject) => {
      warm.onload = () => resolve();
      warm.onerror = () => reject();
    });
  }
}

/** Mask the wordmark in (purple → lime → white), hold, mask out (white → lime → purple). */
async function playIntroLogotype(intro: HTMLElement): Promise<void> {
  const logo = intro.querySelector<HTMLElement>(".app-intro__logo");
  if (!logo) return;
  gsap.set(logo, { autoAlpha: 1 });
  await playLogotypeReveal(logo, {
    maskOut: true,
    holdS: INTRO_LOGO_HOLD_S,
    scaleFrom: INTRO_LOGO_SCALE_FROM,
    scaleTo: INTRO_LOGO_SCALE_TO,
    scaleEase: INTRO_LOGO_SCALE_EASE,
  });
  gsap.set(logo, { autoAlpha: 0 });
}

async function startIntro() {
  // Mode Select thumbs — start while the intro gif still has the screen.
  preloadModeSelectMedia();

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const intro = app.querySelector<HTMLElement>("#app-intro");
  if (reduceMotion || !intro) {
    intro?.remove();
    // Defer so `resize` (declared later) exists before finishIntro runs.
    window.setTimeout(finishIntro, 0);
    return;
  }

  // Shapes fall behind the gif; desktop mode select later fades on top of the same scene.
  warmModeSelectPreview();

  const img = intro.querySelector<HTMLImageElement>(".app-intro__gif");
  try {
    await preloadIntroGif();
  } catch {
    /* still show intro; image may load in place */
  }
  if (img) {
    img.src = INTRO_SRC;
    try {
      if (img.decode) await img.decode();
    } catch {
      /* ignore decode failures */
    }
  }
  intro.classList.add("is-ready");
  if (img) {
    gsap.fromTo(
      img,
      { scale: INTRO_PILL_SCALE_FROM },
      { scale: INTRO_PILL_SCALE_TO, duration: INTRO_PILL_SCALE_S, ease: INTRO_PILL_SCALE_EASE },
    );
  }
  // Full wordmark out-span, 25% faster so a single wipe doesn't feel sluggish.
  const wipeS = (LOGOTYPE_REVEAL_STAGGER_S * 2 + LOGOTYPE_REVEAL_MASK_S) * 0.75;
  // Start the wipe before the single-play gif freezes on its last frame.
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, Math.max(0, INTRO_MS - wipeS * 1000));
  });
  if (img) {
    await gsap.fromTo(
      img,
      { clipPath: "inset(0% 0% 0% 0%)" },
      { clipPath: "inset(0% 0% 0% 100%)", duration: wipeS, ease: LOGOTYPE_REVEAL_EASE },
    );
    img.remove();
  }
  await playIntroLogotype(intro);
  finishIntro();
}

void startIntro();

const DEV_RADIUS: Record<string, { css: string; label: string; value: number }> = {
  panel: { css: "--radius-panel", label: "Panel", value: 44 },
  settings: { css: "--radius-settings", label: "Settings", value: 44 },
  reconnect: { css: "--radius-reconnect", label: "Reconnect", value: 16 },
  menu: { css: "--radius-menu", label: "Slot menu", value: 20 },
  tip: { css: "--radius-tip", label: "Pro tip", value: 20 },
  pop: { css: "--radius-pop", label: "Popovers", value: 12 },
  topbar: { css: "--radius-topbar", label: "Topbar", value: 8 },
  tooltip: { css: "--radius-tooltip", label: "Tooltip", value: 10 },
};

function applyDevRadius(key: string, px: number) {
  const entry = DEV_RADIUS[key];
  if (!entry) return;
  entry.value = px;
  document.documentElement.style.setProperty(entry.css, `${px}px`);
  const label = devPanel.querySelector(`[data-dev-radius-label="${key}"]`);
  if (label) label.textContent = `${entry.label} ${px}px`;
}

for (const input of devPanel.querySelectorAll<HTMLInputElement>("[data-dev-radius]")) {
  const key = input.dataset.devRadius;
  if (!key || !DEV_RADIUS[key]) continue;
  input.addEventListener("input", () => applyDevRadius(key, Number(input.value)));
}

let running = false;
let paused = false;
let repeat = false;

let shownScale = 1;
let frameKey = "";
/** Ignore transient collapsed sizes (file dialogs / focus glitches). */
const MIN_FRAME_PX = 64;

function workBox() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const full = { x: 0, y: 0, width, height };
  if (shell.classList.contains("ui-hidden") || presenting) return full;
  const stageRect = stage.getBoundingClientRect();
  let limitRight = width;
  let limitBottom = height;
  const blockers = [panelShell, shell.querySelector(".theme-shelf.is-open")].filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  );
  for (const el of blockers) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 2) continue;
    const left = rect.left - stageRect.left;
    const top = rect.top - stageRect.top;
    if (left > width * 0.3 && top < height * 0.5) limitRight = Math.min(limitRight, left);
    else if (top > height * 0.3) limitBottom = Math.min(limitBottom, top);
  }
  return {
    x: 0,
    y: 0,
    width: Math.max(120, limitRight),
    height: Math.max(120, limitBottom),
  };
}

function currentFrame() {
  return canvasFrame(stage.clientWidth, stage.clientHeight, state.canvas, workBox());
}

function layoutScale(frame: CanvasFrame): number {
  return compositionScale(frame.scale);
}

function fitScale() {
  const scale = layoutScale(currentFrame());
  // shownScale is owned by syncCanvas — mutating it here desyncs refits after import.
  world.setSimulationScale(scale);
  syncFreeScaleMax();
  return state.masterScale * scale;
}

function placeFrame(frame: ReturnType<typeof currentFrame>) {
  playfield.style.left = `${frame.x}px`;
  playfield.style.top = `${frame.y}px`;
  playfield.style.width = `${frame.width}px`;
  playfield.style.height = `${frame.height}px`;
  applyBackground();
  const framed = state.canvas !== "16:9";
  stage.classList.toggle("is-portrait", framed);
  stageVeil.hidden = !framed;
  if (!framed) return;
  const right = frame.x + frame.width;
  const bottom = frame.y + frame.height;
  const side = (name: string) => stageVeil.querySelector<HTMLElement>(`[data-side="${name}"]`);
  const top = side("top");
  const rightEl = side("right");
  const bottomEl = side("bottom");
  const left = side("left");
  if (top) top.style.cssText = `left:${frame.x}px;top:0;width:${frame.width}px;height:${frame.y}px`;
  if (rightEl) rightEl.style.cssText = `left:${right}px;top:0;right:0;bottom:0`;
  if (bottomEl) bottomEl.style.cssText = `left:${frame.x}px;top:${bottom}px;width:${frame.width}px;bottom:0`;
  if (left) left.style.cssText = `left:0;top:0;width:${frame.x}px;bottom:0`;
}

function syncCanvas(refitChips: boolean) {
  const frame = currentFrame();
  // Don't lock in a collapsed playfield from a transient layout read.
  if (frame.width < MIN_FRAME_PX || frame.height < MIN_FRAME_PX) return false;
  const scale = layoutScale(frame);
  const key = `${state.canvas}:${frame.x},${frame.y},${frame.width},${frame.height}`;
  if (key === frameKey) return false;
  const factor = shownScale > 0 ? scale / shownScale : 1;
  placeFrame(frame);
  const moveChips = refitChips && world.chipCount() > 0 && (state.canvas !== "16:9" || Math.abs(factor - 1) > 0.0001);
  if (moveChips) world.refit(frame.width, frame.height, factor);
  else world.resize(frame.width, frame.height);
  shownScale = scale;
  world.setSimulationScale(scale);
  frameKey = key;
  return true;
}

function selectCanvas(next: CanvasRatio) {
  if (state.canvas === next) return;
  remember();
  state.canvas = next;
  if (running) {
    world.clear();
    syncCanvas(false);
    void session.drop();
  } else if (syncCanvas(world.chipCount() > 0) && world.chipCount() > 0) {
    relayout();
  }
  renderPanel();
}

function paintTransport() {
  loopBtn.classList.toggle("is-on", repeat);
  loopBtn.setAttribute("aria-pressed", String(repeat));
  const label = loopBtn.querySelector<HTMLElement>(".loop-chip__text");
  if (!label) return;
  if (repeat) applyRollingText(label, "Looping", { asPhrase: true });
  else {
    stopTextAnim(label);
    label.textContent = "Loop";
  }
}

function paintMicTextAnim() {
  const label = panel.querySelector<HTMLElement>("#audio-mic .smash-btn__text");
  if (!label) return;
  if (state.audioReact.enabled) applyRollingText(label, "Listening", { asPhrase: true });
  else {
    stopTextAnim(label);
    label.textContent = "Microphone";
  }
}

function paintPhysDebug() {
  if (!physDebugOn) return;
  const width = playfield.clientWidth;
  const height = playfield.clientHeight;
  if (width < 2 || height < 2) return;
  if (physDebugCanvas.width !== width || physDebugCanvas.height !== height) {
    physDebugCanvas.width = width;
    physDebugCanvas.height = height;
  }
  const ctx = physDebugCanvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#39ff14";
  ctx.fillStyle = "rgb(57 255 20 / 0.08)";
  for (const poly of world.wireframes()) {
    if (poly.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function setPhysDebug(on: boolean) {
  physDebugOn = on;
  physDebugCanvas.hidden = !on;
  copyBtn.hidden = !on;
  devPanel.hidden = !on;
  if (on) paintPhysDebug();
  else {
    const ctx = physDebugCanvas.getContext("2d");
    ctx?.clearRect(0, 0, physDebugCanvas.width, physDebugCanvas.height);
  }
}

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clearCanvasNudge() {
  window.clearTimeout(nudgeFadeTimer);
  gsap.killTweensOf(canvasNudge);
  gsap.killTweensOf(canvasNudge.querySelectorAll(".canvas-nudge__word, .canvas-nudge__hint"));
  canvasNudge.hidden = true;
  canvasNudge.replaceChildren();
  gsap.set(canvasNudge, { clearProps: "all" });
}

function nudgeAccent(label: string): HTMLElement {
  const el = document.createElement("span");
  el.className = "canvas-nudge__accent";
  el.textContent = label;
  return el;
}

function showAddShapeNudge() {
  clearCanvasNudge();
  canvasWelcome.hidden = true;

  const title = document.createElement("div");
  title.className = "canvas-nudge__title";
  const words = "Please add your first asset!".split(/\s+/);
  for (const word of words) {
    const span = document.createElement("span");
    span.className = "canvas-nudge__word";
    span.textContent = word;
    title.append(span);
  }

  const hint = document.createElement("p");
  hint.className = "canvas-nudge__hint";
  hint.append(
    "Use ",
    nudgeAccent("Create"),
    " on the right, try ",
    nudgeAccent("Templates"),
    " to quickly fill",
    document.createElement("br"),
    "the canvas, or ",
    nudgeAccent("right-click"),
    " the workspace.",
  );

  canvasNudge.append(title, hint);
  canvasNudge.hidden = false;

  const wordEls = title.querySelectorAll<HTMLElement>(".canvas-nudge__word");
  if (reducedMotion()) {
    gsap.set([wordEls, hint], { autoAlpha: 1, y: 0 });
  } else {
    gsap.fromTo(
      wordEls,
      { y: 22, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.75, stagger: 0.075, ease: "power2.out" },
    );
    gsap.fromTo(
      hint,
      { y: 10, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.55, delay: 0.35, ease: "power2.out" },
    );
  }
}

function blinkShapeCreate(section: HTMLElement) {
  window.clearTimeout(shapeBlinkTimer);
  section.classList.remove("is-blink");
  // Retrigger CSS animation
  void section.offsetWidth;
  section.classList.add("is-blink");
  shapeBlinkTimer = window.setTimeout(() => {
    section.classList.remove("is-blink");
    shapeBlinkTimer = 0;
  }, 1400);
}

function nudgeEmptyScene() {
  if (shell.classList.contains("ui-hidden")) {
    shell.classList.remove("ui-hidden");
    playTransition(true);
    resize();
  }

  if (panelTab !== "physics") {
    panelTab = "physics";
    panel.scrollTop = 0;
    renderPanel();
  }

  showAddShapeNudge();

  setSectionOpen(panel, openSections, "what-falls", true);
  const section = panel.querySelector<HTMLElement>("#shape-create");
  if (!section) return;
  scrollPanelTo(section);
  blinkShapeCreate(section);
}

session = createPlaySession({
  world,
  getState: () => state,
  stage,
  playfield,
  fitScale,
  syncCanvas,
  ensureAssets: () => Promise.all([ensureTrims(state.slots), ensureTextFonts(state.slots)]),
  scheduleDraft,
  dismissWelcome,
  paintWelcome,
  paintTransport,
  paintPhysDebug,
  tickAudioReact,
  nudgeEmptyScene,
  notifyLayoutModeBlocksPhysics: async () => {
    const overlapping = world.chipCount() > 0 && world.chipsOverlap();
    const ok = await askConfirm({
      title: "Can't trigger physics",
      body: overlapping
        ? "Layout mode is on. Activate Physics to tumble — overlapping pieces will push apart and your layout will change."
        : "Layout mode is on. Turn on Physics first.",
      confirmLabel: "Activate Physics",
      cancelLabel: "Got it",
    });
    if (!ok) return false;
    // Already confirmed above — skip setLayoutMode's overlap dialog.
    await setLayoutMode(false, { skipConfirm: true });
    return !state.physics.layoutMode;
  },
  playButton,
  getRunning: () => running,
  setRunningFlag: (on) => {
    running = on;
  },
  getPaused: () => paused,
  setPaused: (on) => {
    paused = on;
  },
  getRepeat: () => repeat,
  getPosePinned: () => posePinned,
  setPosePinned: (on) => {
    posePinned = on;
  },
});

async function setLayoutMode(next: boolean, opts?: { skipConfirm?: boolean }) {
  if (next === state.physics.layoutMode) return;
  if (!next) setPresenting(false);

  if (!opts?.skipConfirm && !next && world.chipCount() > 0 && world.chipsOverlap()) {
    const ok = await askConfirm({
      title: "Turn physics back on?",
      body: "Overlapping pieces will push apart and your layout will change. Continue?",
      confirmLabel: "Turn on physics",
      cancelLabel: "Keep layout",
    });
    if (!ok) {
      renderPanel();
      return;
    }
  }

  remember();
  playClick();
  state.physics.layoutMode = next;
  if (state.audioReact.enabled) {
    if (next) pauseAudioReactMic();
    else {
      setUiSoundsMuted(true);
      void startMic();
    }
  }
  if (next) {
    if (world.chipCount() > 0) {
      live();
      world.freezePile();
      world.sync();
      posePinned = true;
      if (running) {
        session.phase = "holding";
        session.holdStarted = performance.now();
        session.settledSince = 0;
      }
    } else {
      live();
    }
  } else {
    posePinned = false;
    live();
    if (running && world.chipCount() > 0) {
      session.phase = "falling";
      session.settledSince = 0;
      session.holdStarted = 0;
      session.lastInteractAt = performance.now();
    }
  }
  renderPanel();
  paintWelcome();
  snapshotActivePage();
  paintPages();
  scheduleDraft();
}

function toggleRepeat() {
  repeat = !repeat;
  paintTransport();
}

function typingInField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable], .font-pick, .font-menu, .slot-menu, .slot-menu-host, .color-pop, .theme-shelf, .dev-panel"));
}

function editingText(target: EventTarget | null): boolean {
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLInputElement) {
    const type = target.type;
    return type === "text" || type === "search" || type === "url" || type === "email";
  }
  return target instanceof HTMLElement && target.isContentEditable;
}

function adoptState(next: typeof state) {
  state.slots = next.slots;
  for (const slot of state.slots) {
    if (slot.kind === "text") sanitizeTextMotion(slot);
  }
  state.physics = {
    ...DEFAULT_PHYSICS,
    ...next.physics,
    complexity: physicsComplexity(next.physics?.complexity),
    layoutMode: Boolean(next.physics?.layoutMode),
  };
  state.audioReact = {
    ...DEFAULT_AUDIO_REACT,
    ...next.audioReact,
    enabled: Boolean(next.audioReact?.enabled),
    sensitivity:
      typeof next.audioReact?.sensitivity === "number"
        ? Math.min(100, Math.max(0, next.audioReact.sensitivity))
        : DEFAULT_AUDIO_REACT.sensitivity,
    bounce:
      typeof next.audioReact?.bounce === "number"
        ? Math.min(4, Math.max(1, next.audioReact.bounce))
        : DEFAULT_AUDIO_REACT.bounce,
    bassBoost:
      typeof next.audioReact?.bassBoost === "number"
        ? Math.min(20, Math.max(5, next.audioReact.bassBoost))
        : DEFAULT_AUDIO_REACT.bassBoost,
    hueNudge:
      typeof next.audioReact?.hueNudge === "number"
        ? Math.min(30, Math.max(0, next.audioReact.hueNudge))
        : DEFAULT_AUDIO_REACT.hueNudge,
  };
  state.stageColor = next.stageColor;
  state.background = normalizeBackground(next.background);
  state.canvas = parseCanvasRatio(next.canvas);
  state.masterScale = next.masterScale;
  state.sizeRandom = next.sizeRandom;
  state.pillPad = next.pillPad;
  state.textTracking = next.textTracking;
  state.shapeAmount = next.shapeAmount;
  state.theme = next.theme;
  state.template = next.template;
  state.post = {
    ...next.post,
    bloomOpacity: next.post.bloomOpacity ?? 80,
    hue: next.post.hue ?? 0,
    blend: blendMode(next.post.blend),
  };
  recountShapes();
  syncLogotypeAccent();
  if (audioReactShouldListen()) {
    setUiSoundsMuted(true);
    void startMic();
  } else {
    pauseAudioReactMic();
  }
}

const UNDO_LIMIT = 50;

type Snapshot = {
  doc: AppState;
  pages: LayoutPage[];
  pageIndex: number;
  appliedFont: string;
  machineFont: string;
};

const past: Snapshot[] = [];
const future: Snapshot[] = [];
let gesture: string | null = null;
let pointerHeld = false;

function takeSnapshot(): Snapshot {
  snapshotActivePage();
  return {
    doc: structuredClone(state),
    pages: structuredClone(pages),
    pageIndex,
    appliedFont,
    machineFont,
  };
}

function remember(key?: string) {
  if (key && key === gesture) return;
  gesture = key ?? null;
  past.push(takeSnapshot());
  if (past.length > UNDO_LIMIT) past.shift();
  future.length = 0;
  scheduleDraft();
}

function endGesture() {
  gesture = null;
}

function restore(snap: Snapshot) {
  tintPicker?.close();
  pages = structuredClone(snap.pages);
  pageIndex = clampPageIndex(snap.pageIndex, pages.length);
  adoptState(snap.doc);
  appliedFont = snap.appliedFont;
  machineFont = snap.machineFont;
  applyBackground();
  applyPost();
  syncCanvas(world.chipCount() > 0);
  const page = pages[pageIndex];
  const pinned = Boolean(page?.poses.length) && pinRestoredPoses(page.poses, page.frame);
  renderPanel();
  live(pinned ? { quiet: true } : undefined);
  paintPages();
}

function undo() {
  const snap = past.pop();
  if (!snap) return;
  endGesture();
  future.push(takeSnapshot());
  if (future.length > UNDO_LIMIT) future.shift();
  restore(snap);
  playClick();
}

function redo() {
  const snap = future.pop();
  if (!snap) return;
  endGesture();
  past.push(takeSnapshot());
  if (past.length > UNDO_LIMIT) past.shift();
  restore(snap);
  playClick();
}
window.addEventListener("pointerdown", () => {
  pointerHeld = true;
}, true);
window.addEventListener("pointerup", () => {
  pointerHeld = false;
  endGesture();
}, true);
window.addEventListener("pointercancel", () => {
  pointerHeld = false;
  endGesture();
}, true);
// Kill the native browser menu everywhere except editable fields.
// Capture so it still wins when right-clicking fast / mid-gesture.
window.addEventListener(
  "contextmenu",
  (event) => {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("input, textarea, select, [contenteditable='true']")
    ) {
      return;
    }
    event.preventDefault();
  },
  true,
);

playBtn.addEventListener("click", () => {
  void session.triggerPhysics();
});
loopBtn.addEventListener("click", toggleRepeat);
for (const id of ["physics", "background", "export"] as const) {
  app.querySelector(`#tab-${id}`)?.addEventListener("click", () => {
    if (panelTab === id) return;
    panelTab = id;
    panel.scrollTop = 0;
    playSwipe();
    renderPanel();
  });
}
app.querySelector("#open-settings")?.addEventListener("click", () => {
  openSettings(settingsController);
});
paintTransport();
paintWelcome();
app.querySelector("#reset-defaults")?.addEventListener("click", () => {
  remember();
  session.setRunning(false);
  machineFont = "";
  appliedFont = "";
  pickedSlotId = null;
  pickedSlotIds.clear();
  world.setPicked(null);
  adoptState(blankState());
  for (const slot of state.slots) captureBaseline(slot);
  applyBackground();
  applyPost();
  syncCanvas(false);
  renderPanel();
});

function activeTemplateLabel(id: string | undefined): string | undefined {
  return templateLabel(id) ?? customTemplateLabel(id);
}

async function saveCurrentAsTemplate() {
  const name = await askPrompt({
    title: "Theme name",
    placeholder: "My theme",
    confirmLabel: "Save",
    cancelLabel: "Cancel",
  });
  if (!name) return;
  try {
    const project = await embedSlotImages(currentPillProject());
    const saved = saveCustomTemplate(name, project);
    state.template = saved.id;
    renderPanel();
  } catch {
    await askNotice({
      title: "Couldn’t save",
      body: "This browser wouldn’t store the template. Try a shorter scene or fewer photos.",
    });
  }
}

async function loadSavedTemplate(id: string) {
  const project = loadCustomTemplate(id);
  if (!project) {
    await askNotice({
      title: "Missing template",
      body: "That custom template is no longer available.",
    });
    return;
  }
  hydratePillImages(project.images);
  if (project.pages.length > 1) {
    remember();
    await applyPillProject(project);
    return;
  }
  loadTemplate(project.state);
}

async function removeCustomTemplate(id: string) {
  const ok = await askConfirm({
    title: "Delete your custom template?",
    confirmLabel: "Yes",
    cancelLabel: "No",
  });
  if (!ok) return;
  try {
    deleteCustomTemplate(id);
  } catch {
    await askNotice({
      title: "Couldn’t delete",
      body: "This browser wouldn’t update saved themes.",
    });
    return;
  }
  if (state.template === id) {
    state.template = undefined;
    renderPanel();
  }
}

function loadTemplate(next: AppState) {
  setPresenting(false);
  clearCanvasNudge();
  closeFontMenu();
  remember();
  session.setRunning(false);
  machineFont = "";
  appliedFont = "";
  pickedSlotId = null;
  pickedSlotIds.clear();
  world.setPicked(null);
  openSlots.clear();
  adoptState(keepSelectedCanvas(next, state.canvas));
  for (const slot of state.slots) captureBaseline(slot);
  resetPages();
  applyBackground();
  applyPost();
  syncCanvas(false);
  renderPanel();
  if (state.slots.length) void session.triggerPhysics();
}

copyBtn.addEventListener("click", async () => {
  const payload = {
    stageColor: state.stageColor,
    background: {
      ...state.background,
      image: backgroundImage(state.background.imageId),
      logo: backgroundImage(state.background.logoId),
    },
    canvas: state.canvas,
    masterScale: state.masterScale,
    sizeRandom: state.sizeRandom,
    pillPad: state.pillPad,
    textTracking: state.textTracking,
    shapeAmount: state.shapeAmount,
    theme: [...state.theme],
    physics: { ...state.physics },
    audioReact: { ...state.audioReact },
    post: { ...state.post },
    slots: state.slots,
  };
  await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  playNotify();
  copyBtn.textContent = "Copied";
  window.setTimeout(() => {
    copyBtn.textContent = "Copy settings";
  }, 1500);
});

window.addEventListener("keydown", (event) => {
  if (document.body.classList.contains("is-exporting")) return;
  const meta = event.metaKey || event.ctrlKey;
  if (meta && !event.altKey && !editingText(event.target)) {
    if (presenting) return;
    const key = event.key.toLowerCase();
    if (key === "z") {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if (key === "y") {
      event.preventDefault();
      redo();
      return;
    }
    if (key === "d") {
      if (!pickedSlotId) return;
      event.preventDefault();
      if (event.repeat) return;
      duplicateSlot(pickedSlotId);
      return;
    }
    if (key === "c") {
      if (event.shiftKey || event.repeat) return;
      if (!copyPickedSlots()) return;
      event.preventDefault();
      return;
    }
    if (key === "v") {
      if (event.shiftKey || event.repeat) return;
      if (!pasteClipboardSlots()) return;
      event.preventDefault();
      return;
    }
  }
  if (typingInField(event.target)) return;
  if (document.body.classList.contains("is-exporting")) return;
  if (isSettingsOpen() || isAboutOpen() || isBugReportOpen() || isUnsplashOpen() || isGiphyOpen() || isYouTubeOpen()) return;
  if (document.querySelector(".reconnect[aria-modal='true']")) return;
  if (presenting) {
    if (event.code === "Space" || event.key === "ArrowRight" || event.key === "PageDown") {
      event.preventDefault();
      if (!event.repeat) stepPresent(1);
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      if (!event.repeat) stepPresent(-1);
      return;
    }
    if (event.key === "Escape" || event.key === "h" || event.key === "H") {
      event.preventDefault();
      setPresenting(false);
      return;
    }
    event.preventDefault();
    return;
  }
  if (event.code === "Space") {
    event.preventDefault();
    if (event.repeat) return;
    playClick();
    session.togglePause();
    return;
  }
  if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && state.physics.layoutMode) {
    if (meta || event.altKey || event.repeat) return;
    if (pages.length < 2) return;
    event.preventDefault();
    const dir = event.key === "ArrowRight" ? 1 : -1;
    selectLayoutPage((pageIndex + dir + pages.length) % pages.length);
    return;
  }
  if (event.key === "p" || event.key === "P") {
    if (meta || event.altKey || event.repeat) return;
    event.preventDefault();
    void session.triggerPhysics();
    return;
  }
  if (event.key === "Escape") {
    if (pickedSlotIds.size === 0 && !world.editingId()) return;
    event.preventDefault();
    dismissPick();
    return;
  }
  if (event.key === "Enter") {
    if (event.repeat || !pickedSlotId) return;
    const slot = state.slots.find((item) => item.id === pickedSlotId);
    if (!slot || slot.kind !== "text") return;
    event.preventDefault();
    editChipText(pickedSlotId, "all");
    return;
  }
  if (event.key === "Backspace" || event.key === "Delete") {
    if (pickedSlotIds.size === 0) return;
    event.preventDefault();
    if (event.repeat) return;
    removePickedSlots();
    return;
  }
  if (event.key === "h" || event.key === "H") {
    if (introActive) return;
    const hidden = shell.classList.toggle("ui-hidden");
    playTransition(!hidden);
    if (hidden) closeFontMenu();
    resize();
    return;
  }
  if (event.key === "d" || event.key === "D") {
    if (meta || event.altKey || event.repeat || !event.shiftKey || !pickedSlotId) return;
    event.preventDefault();
    duplicateSlot(pickedSlotId);
    return;
  }
  if (event.key === "k" || event.key === "K") {
    if (meta || event.altKey || event.shiftKey || event.repeat) return;
    event.preventDefault();
    setPhysDebug(!physDebugOn);
    return;
  }
  if (event.key === "g" || event.key === "G") {
    if (event.repeat) return;
    remember();
    state.background.grid = !state.background.grid;
    applyBackground();
    if (panelTab === "background") renderPanel();
    playClick();
    return;
  }
  if (event.key === "l" || event.key === "L") {
    if (event.repeat) return;
    void setLayoutMode(!state.physics.layoutMode);
    return;
  }
  if (event.key === "i" || event.key === "I") {
    if (event.repeat || !pickedSlotId) return;
    invertSlot(pickedSlotId);
  }
});

let panelScrollFrame = 0;

/** scrollIntoView can still move documentElement even with overflow:hidden on html/body. */
function pinPageScroll() {
  if (document.documentElement.scrollTop) document.documentElement.scrollTop = 0;
  if (document.body.scrollTop) document.body.scrollTop = 0;
  if (window.scrollY) window.scrollTo(0, 0);
}

function stopPanelScroll() {
  if (!panelScrollFrame) return;
  cancelAnimationFrame(panelScrollFrame);
  panelScrollFrame = 0;
  panel.style.overflowAnchor = "";
}

function scrollPanelTo(card: HTMLElement, shrinkAbove = 0) {
  const pad = 12;
  const panelRect = panel.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const clip = card.querySelector<HTMLElement>(".slot-fold-clip");
  const fold = card.querySelector<HTMLElement>(".slot-fold");
  const growth = clip && fold ? Math.max(0, clip.scrollHeight - fold.getBoundingClientRect().height) : 0;
  const max = Math.max(0, panel.scrollHeight + growth - shrinkAbove - panel.clientHeight);
  const dest = Math.min(max, Math.max(0, panel.scrollTop + cardRect.top - panelRect.top - pad - shrinkAbove));
  const from = panel.scrollTop;
  const delta = dest - from;
  stopPanelScroll();
  pinPageScroll();
  if (Math.abs(delta) < 1) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    panel.scrollTop = dest;
    return;
  }
  const duration = Math.min(720, Math.max(280, Math.abs(delta) * 0.85));
  const start = performance.now();
  panel.style.overflowAnchor = "none";
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3;
    panel.scrollTop = from + delta * eased;
    if (t < 1) {
      panelScrollFrame = requestAnimationFrame(step);
      return;
    }
    panelScrollFrame = 0;
    panel.style.overflowAnchor = "";
    pinPageScroll();
  };
  panelScrollFrame = requestAnimationFrame(step);
}

function syncPanelPicks() {
  for (const card of panel.querySelectorAll<HTMLElement>(".slot-card[data-id]")) {
    const id = card.dataset.id;
    card.classList.toggle("is-picked", Boolean(id && pickedSlotIds.has(id)));
  }
}

function applyWorldPick() {
  if (!pickedSlotId) {
    world.setPicked(null);
    return;
  }
  world.setPicked(pickedSlotId, { ids: [...pickedSlotIds] });
}

function showPick(id: string) {
  pickedSlotIds.clear();
  pickedSlotIds.add(id);
  pickedSlotId = id;
  applyWorldPick();
  syncPanelPicks();
}

function releasePick(id: string) {
  if (!pickedSlotIds.has(id)) return;
  pickedSlotIds.delete(id);
  if (pickedSlotId === id) pickedSlotId = [...pickedSlotIds].at(-1) ?? null;
  applyWorldPick();
  panel.querySelector<HTMLElement>(`[data-id="${id}"]`)?.classList.remove("is-picked");
}

function dismissPick() {
  endChipEdit();
  closeSlotMenu();
  if (pickedSlotIds.size === 0) return;
  const primary = pickedSlotId;
  pickedSlotId = null;
  pickedSlotIds.clear();
  world.setPicked(null);
  syncPanelPicks();
  playRemove();
  if (primary) {
    const card = panel.querySelector<HTMLElement>(`[data-id="${primary}"]`);
    const slot = state.slots.find((item) => item.id === primary);
    const toggle = card?.querySelector<HTMLElement>(".slot-toggle");
    if (slot && toggle && openSlots.has(primary)) setSlotOpen(toggle, slot, false, false);
  }
}

function pickSlot(id: string | null, opts?: { force?: boolean; additive?: boolean }) {
  if (!id) {
    dismissPick();
    return;
  }
  const editing = world.editingId();
  if (editing && editing !== id) endChipEdit();

  if (opts?.additive) {
    if (pickedSlotIds.has(id) && pickedSlotIds.size > 1) {
      pickedSlotIds.delete(id);
      if (pickedSlotId === id) pickedSlotId = [...pickedSlotIds].at(-1) ?? null;
    } else if (pickedSlotIds.has(id) && pickedSlotIds.size === 1) {
      dismissPick();
      return;
    } else {
      pickedSlotIds.add(id);
      pickedSlotId = id;
    }
    applyWorldPick();
    syncPanelPicks();
    playClick();
    return;
  }

  const jumped = panelTab !== "physics";
  if (jumped) {
    panelTab = "physics";
    panel.scrollTop = 0;
    renderPanel();
  } else if (!opts?.force && id === pickedSlotId && pickedSlotIds.size <= 1) {
    dismissPick();
    return;
  }
  const card = panel.querySelector<HTMLElement>(`[data-id="${id}"]`);
  const slot = state.slots.find((item) => item.id === id);
  const toggle = card?.querySelector<HTMLElement>(".slot-toggle");
  if (!card || !slot || !toggle) return;

  let shrinkAbove = 0;
  const cardTop = card.getBoundingClientRect().top;
  for (const otherId of openSlots) {
    if (otherId === id) continue;
    const prev = panel.querySelector<HTMLElement>(`[data-id="${otherId}"]`);
    if (prev && prev.getBoundingClientRect().top < cardTop) {
      shrinkAbove += prev.querySelector(".slot-fold")?.getBoundingClientRect().height ?? 0;
    }
  }

  pickedSlotIds.clear();
  pickedSlotIds.add(id);
  pickedSlotId = id;
  applyWorldPick();
  syncPanelPicks();
  playClick();
  if (!openSlots.has(id)) setSlotOpen(toggle, slot, true, false);
  else closeOtherSlots(id);
  scrollPanelTo(card, shrinkAbove);
}

panel.addEventListener("wheel", stopPanelScroll, { passive: true });
panel.addEventListener("pointerdown", stopPanelScroll);

{
  const prefs = getPrefs();
  setProTipsEnabled(prefs.tipsOn);
  setTooltipsEnabled(prefs.tooltipsOn);
}
mountProTip(shell, { blank: () => state.template === "blank" });
mountTooltips(document);
world.attach(
  stage,
  pickSlot,
  (id, x, y) => {
    if (id == null) openCanvasMenu(x, y);
    else openSlotMenu(x, y, id, slotMenuHost());
  },
  (id, at) => editChipText(id, "end", at),
  (id) => state.slots.find((item) => item.id === id)?.scale ?? 1,
  scaleChip,
  rotateChip,
  gradientWheelOf,
  gradientWheelChip,
  openGradWheelStop,
  resizeTextFieldBox,
);
stage.addEventListener(
  "pointerdown",
  (event) => {
    if (!presenting || event.button !== 0) return;
    event.stopImmediatePropagation();
    stepPresent(1);
  },
  true,
);
stage.addEventListener(
  "contextmenu",
  (event) => {
    if (!presenting) return;
    event.stopImmediatePropagation();
  },
  true,
);

{
  let fileDragDepth = 0;
  const clearFileDrag = () => {
    fileDragDepth = 0;
    playfield.classList.remove("is-file-drag");
  };
  const hasFiles = (transfer: DataTransfer | null) =>
    Boolean(transfer && [...transfer.types].includes("Files"));

  playfield.addEventListener("dragenter", (e) => {
    if (!hasFiles(e.dataTransfer)) return;
    e.preventDefault();
    fileDragDepth += 1;
    playfield.classList.add("is-file-drag");
  });
  playfield.addEventListener("dragleave", () => {
    fileDragDepth = Math.max(0, fileDragDepth - 1);
    if (fileDragDepth === 0) playfield.classList.remove("is-file-drag");
  });
  playfield.addEventListener("dragover", (e) => {
    if (!hasFiles(e.dataTransfer)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  });
  playfield.addEventListener("drop", (e) => {
    if (!hasFiles(e.dataTransfer)) return;
    e.preventDefault();
    clearFileDrag();
    addImagesFromFiles(e.dataTransfer?.files ?? [], { clientX: e.clientX, clientY: e.clientY });
  });
  playfield.addEventListener("dragend", clearFileDrag);
}

const resize = () => {
  syncUiScale();
  if (syncCanvas(world.chipCount() > 0) && world.chipCount() > 0) relayout();
  if (state.background.logoId) applyLogo();
};
const frameObserver = new ResizeObserver(() => resize());
frameObserver.observe(stage);
frameObserver.observe(panelShell);
const themeShelfEl = shell.querySelector(".theme-shelf");
if (themeShelfEl) frameObserver.observe(themeShelfEl);
resize();
applyBackground();
applyPost();
renderPanel();
{
  const pageStripEl = app.querySelector<HTMLElement>("#page-strip");
  if (pageStripEl) {
    mountLayoutPageStrip(pageStripEl, pageStripHost);
    paintPages();
  }
}
void ensureTrims(state.slots);
void ensureTextFonts(state.slots);
document.fonts.addEventListener("loadingdone", () => {
  if (world.chipCount() === 0) return;
  relayout();
});

requestAnimationFrame(session.frame);

window.addEventListener("pagehide", () => {
  window.clearTimeout(draftTimer);
  if (getPrefs().rememberLast) void writeDraftNow();
});

async function applyStartupMode(mode: AppMode) {
  state.physics.layoutMode = mode === "layout";
  snapshotActivePage();
  renderPanel();
  paintWelcome();
  paintPages();
}

async function applyModeSelectChoice(choice: ModeSelectChoice) {
  if (choice.kind === "project") {
    try {
      await exportController.loadProject(choice.file);
    } catch (error) {
      await askNotice({
        title: "Couldn’t load project",
        body: error instanceof Error ? error.message : "Could not load this .pill file.",
      });
      await applyStartupMode("physics");
    }
    return;
  }
  await applyStartupMode(choice.mode);
}

/** Clear the canvas and return to Mode Select (logotype click). */
async function resetToModeSelect() {
  const ok = await askConfirm({
    title: "Start over?",
    body: "This clears the canvas and returns to Mode Select.",
    confirmLabel: "Start over",
    cancelLabel: "Cancel",
  });
  if (!ok) return;

  setPresenting(false);
  endChipEdit(false);
  closeSlotMenu();
  closeFontMenu();
  tintPicker?.close();
  session.setRunning(false);
  running = false;
  paused = false;
  posePinned = false;
  session.phase = "idle";
  session.dropTicket++;
  session.clearingDump = false;
  machineFont = "";
  appliedFont = "";
  pickedSlotId = null;
  pickedSlotIds.clear();
  world.setPicked(null);
  world.setFloorOpen(false);
  world.discardAll();
  openSlots.clear();
  past.length = 0;
  future.length = 0;
  await clearDraft().catch(() => {});
  lastDraftJson = "";
  adoptState(blankState());
  for (const slot of state.slots) captureBaseline(slot);
  resetPages();
  applyBackground();
  applyPost();
  syncCanvas(false);
  renderPanel();
  paintTransport();
  paintWelcome();

  warmModeSelectPreview();
  modeSelectContinuity = true;
  gridHoldForHandoff = true;
  const choice = await askModeSelect();
  await applyModeSelectChoice(choice);
  handoffModeSelectPreview(() => bootRevealGrid());
  releaseProTips();
  syncLogotypeAccent();
}

{
  const logo = shell.querySelector<HTMLElement>(".topbar .logotype");
  if (logo) {
    settleLogotypeReveal(logo);
    const live = mountHeaderLogotype(logo, () => ({
      theme: state.theme,
      backdrop: logoBackdropColor(state.background, state.stageColor),
    }));
    headerLogotype = live;
    headerLogotype.refresh();
    logo.addEventListener("click", () => {
      void resetToModeSelect();
    });
  }
}

/** Fresh start: keep black overlay, pick mode, then release UI. */
async function gateModeSelect() {
  await introAnimDone;
  const intro = app.querySelector<HTMLElement>("#app-intro");
  intro?.querySelector(".app-intro__gif")?.remove();
  intro?.querySelector(".app-intro__logo")?.remove();
  const choice = await askModeSelect();
  modeSelectContinuity = true;
  await applyModeSelectChoice(choice);
}

void (async () => {
  const releaseBoot = () => {
    resolveBootHold?.();
    resolveBootHold = null;
  };
  try {
    if (!getPrefs().rememberLast) {
      draftReady = true;
      await gateModeSelect();
      return;
    }
    const json = await readDraftJson();
    const project = json ? parsePillProject(json) : null;
    draftReady = true;
    if (!project) {
      await gateModeSelect();
      return;
    }
    // Keep load overlay up; modal alone until the user chooses.
    await introAnimDone;
    const intro = app.querySelector<HTMLElement>("#app-intro");
    intro?.querySelector(".app-intro__gif")?.remove();
    intro?.querySelector(".app-intro__logo")?.remove();
    const ok = await askReconnect();
    if (!ok) {
      lastDraftJson = serializePillProject(currentPillProject());
      await clearDraft().catch(() => {});
      const choice = await askModeSelect();
      await applyModeSelectChoice(choice);
      return;
    }
    await applyPillProject(project);
    lastDraftJson = json ?? "";
    paintWelcome();
  } catch {
    draftReady = true;
    try {
      await introAnimDone;
      await askNotice({
        title: "Couldn’t restore draft",
        body: "The last session couldn’t be opened. Starting fresh.",
      });
      await gateModeSelect();
    } catch {
      paintWelcome();
    }
  } finally {
    releaseBoot();
  }
})();
