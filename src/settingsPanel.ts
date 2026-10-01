import gsap from "gsap";
import atomIcon from "@phosphor-icons/core/assets/regular/atom.svg?raw";
import circleHalfIcon from "@phosphor-icons/core/assets/regular/circle-half.svg?raw";
import clockCounterClockwiseIcon from "@phosphor-icons/core/assets/regular/clock-counter-clockwise.svg?raw";
import gaugeIcon from "@phosphor-icons/core/assets/regular/gauge.svg?raw";
import gridFourIcon from "@phosphor-icons/core/assets/regular/grid-four.svg?raw";
import keyboardIcon from "@phosphor-icons/core/assets/regular/keyboard.svg?raw";
import layoutIcon from "@phosphor-icons/core/assets/regular/layout.svg?raw";
import lightbulbIcon from "@phosphor-icons/core/assets/regular/lightbulb.svg?raw";
import moonIcon from "@phosphor-icons/core/assets/regular/moon.svg?raw";
import speakerHighIcon from "@phosphor-icons/core/assets/regular/speaker-high.svg?raw";
import sunIcon from "@phosphor-icons/core/assets/regular/sun.svg?raw";
import { getPrefs, setPrefs, type AppPrefs, type ChromeTheme } from "./prefs";
import { checkInput } from "./checkBox";
import { playRemove, playSwitch, playTransition } from "./uiSounds";

export type SettingsController = {
  prefsChanged(): void;
  layoutMode(): boolean;
  setLayoutMode(next: boolean): void | Promise<void>;
};

let panelEl: HTMLElement | null = null;
let modalRoot: HTMLElement | null = null;
let closing = false;
let onKey: ((event: KeyboardEvent) => void) | null = null;
let shortcutsOpen = true;

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function modKeyLabel(): string {
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) ||
    /Mac/.test(navigator.userAgent)
    ? "⌘"
    : "Ctrl";
}

function altKeyLabel(): string {
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) ||
    /Mac/.test(navigator.userAgent)
    ? "⌥"
    : "Alt";
}

function keycap(label: string): string {
  return `<kbd class="keycap">${label}</kbd>`;
}

function sectionTitleIcon(svg: string): string {
  return `<span class="section-title__icon" aria-hidden="true">${svg}</span>`;
}

function shortcutRow(label: string, keys: string, note?: string): string {
  const noteHtml = note ? `<span class="shortcut-list__note">${note}</span>` : "";
  return `
    <li class="shortcut-list__row">
      <div class="shortcut-list__copy">
        <span class="shortcut-list__label">${label}</span>
        ${noteHtml}
      </div>
      <div class="shortcut-list__keys">${keys}</div>
    </li>
  `;
}

function shortcutsMarkup(): string {
  const mod = modKeyLabel();
  const rows = [
    shortcutRow("Play / pause", keycap("Space")),
    shortcutRow("Hide UI", keycap("H")),
    shortcutRow("Toggle grid", keycap("G")),
    shortcutRow("Toggle Layout Mode", keycap("L")),
    shortcutRow("Invert selection", keycap("I"), "Selected piece"),
    shortcutRow("Delete selection", `${keycap("⌫")}${keycap("Del")}`),
    shortcutRow("Duplicate", `${keycap(mod)}${keycap("D")}`),
    shortcutRow("Undo", `${keycap(mod)}${keycap("Z")}`),
    shortcutRow("Redo", `${keycap(mod)}${keycap("⇧")}${keycap("Z")}`, `Also ${mod}+Y`),
    shortcutRow("Deselect / exit edit", keycap("Esc")),
    shortcutRow("Edit selected text", keycap("Enter")),
    shortcutRow("Scale only while transforming", keycap("⇧"), "Hold during scale drag"),
    shortcutRow(
      "Scale only, snap angle",
      `${keycap("⇧")}${keycap(altKeyLabel())}`,
      "45° steps while scale-dragging",
    ),
    shortcutRow("Add to selection", `${keycap("⇧")}${keycap("Click")}`),
    shortcutRow("Physics debug outlines", keycap("D")),
  ].join("");
  return `
    <section class="section shortcuts-section${shortcutsOpen ? " is-open" : ""}" data-shortcuts-fold>
      <div class="section-head">
        <button type="button" class="section-toggle" aria-expanded="${shortcutsOpen}">
          <span class="shortcuts-title">
            ${sectionTitleIcon(keyboardIcon)}
            Keyboard Shortcuts
          </span>
        </button>
        <span class="section-chevron" aria-hidden="true"></span>
      </div>
      <div class="section-fold"${shortcutsOpen ? "" : " inert"} aria-hidden="${shortcutsOpen ? "false" : "true"}">
        <div class="section-fold-clip">
          <ul class="shortcut-list">${rows}</ul>
        </div>
      </div>
    </section>
  `;
}

function paintVolume() {
  const prefs = getPrefs();
  const input = panelEl?.querySelector<HTMLInputElement>("#settings-volume");
  const caption = panelEl?.querySelector("[data-range-label='settings-volume']");
  if (input) {
    input.value = String(prefs.soundVolume);
    input.disabled = !prefs.soundOn;
    const min = Number(input.min) || 0;
    const max = Number(input.max) || 100;
    const pct = ((prefs.soundVolume - min) / (max - min || 1)) * 100;
    input.style.setProperty("--pct", `${pct}%`);
  }
  if (caption) caption.textContent = `Volume ${prefs.soundVolume}`;
}

function paintToggles(controller?: SettingsController) {
  const prefs = getPrefs();
  panelEl?.querySelectorAll<HTMLInputElement>("#settings-sound, #settings-bounce-sounds, #settings-ui-sounds, #settings-tips, #settings-tooltips, #settings-remember, #settings-performance").forEach((input) => {
    if (input.id === "settings-sound") input.checked = prefs.soundOn;
    if (input.id === "settings-bounce-sounds") {
      input.checked = prefs.soundOn && prefs.bounceSounds;
      input.disabled = !prefs.soundOn;
    }
    if (input.id === "settings-ui-sounds") {
      input.checked = prefs.soundOn && prefs.uiSounds;
      input.disabled = !prefs.soundOn;
    }
    if (input.id === "settings-tips") input.checked = prefs.tipsOn;
    if (input.id === "settings-tooltips") input.checked = prefs.tooltipsOn;
    if (input.id === "settings-remember") input.checked = prefs.rememberLast;
    if (input.id === "settings-performance") input.checked = prefs.performance;
  });
  panelEl?.querySelectorAll<HTMLButtonElement>("[data-theme-chrome]").forEach((button) => {
    const on = button.dataset.themeChrome === prefs.theme;
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", String(on));
  });
  if (controller) paintDesignMode(controller);
  paintVolume();
}

function paintDesignMode(controller: SettingsController) {
  const layout = controller.layoutMode();
  panelEl?.querySelectorAll<HTMLButtonElement>("[data-design-mode]").forEach((button) => {
    const on =
      (button.dataset.designMode === "layout" && layout) ||
      (button.dataset.designMode === "physics" && !layout);
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", String(on));
  });
}

function panelHtml(prefs: AppPrefs, layoutMode: boolean): string {
  return `
    <section class="section">
      <h2 data-tip="Editor chrome colors">${sectionTitleIcon(circleHalfIcon)}UI theme</h2>
      <div class="segment" role="group" aria-label="UI theme">
        <button type="button" class="pill${prefs.theme === "night" ? " is-on" : ""}" data-theme-chrome="night" aria-pressed="${prefs.theme === "night"}" data-tip="Dark editor chrome"><span class="theme-chrome__icon" aria-hidden="true">${moonIcon}</span>Night</button>
        <button type="button" class="pill${prefs.theme === "day" ? " is-on" : ""}" data-theme-chrome="day" aria-pressed="${prefs.theme === "day"}" data-tip="Light editor chrome"><span class="theme-chrome__icon" aria-hidden="true">${sunIcon}</span>Day</button>
      </div>
    </section>
    <section class="section">
      <h2 data-tip="Physics fall or free Layout placement — shortcut L">${sectionTitleIcon(layoutIcon)}Design Mode</h2>
      <div class="segment" role="group" aria-label="Design Mode">
        <button type="button" class="pill${!layoutMode ? " is-on" : ""}" data-design-mode="physics" aria-pressed="${!layoutMode}" data-tip="Pieces fall, bounce, and stack"><span class="theme-chrome__icon" aria-hidden="true">${atomIcon}</span>Physics</button>
        <button type="button" class="pill${layoutMode ? " is-on" : ""}" data-design-mode="layout" aria-pressed="${layoutMode}" data-tip="Place freely like Figma — no physics, pieces can overlap"><span class="theme-chrome__icon" aria-hidden="true">${gridFourIcon}</span>Layout</button>
      </div>
    </section>
    <section class="section">
      <h2 data-tip="UI and impact sound effects">${sectionTitleIcon(speakerHighIcon)}Sound</h2>
      <div class="check-row">
        <label class="check" data-tip="Master mute for all sound effects">
          ${checkInput(`id="settings-sound" ${prefs.soundOn ? "checked" : ""}`)}
          Sound
        </label>
      </div>
      <div class="check-row">
        <label class="check" data-tip="Piece fall and collision impacts">
          ${checkInput(`id="settings-bounce-sounds" ${prefs.soundOn && prefs.bounceSounds ? "checked" : ""} ${prefs.soundOn ? "" : "disabled"}`)}
          Bounce Sounds
        </label>
      </div>
      <div class="check-row">
        <label class="check" data-tip="Clicks, toggles, typing, and other UI feedback">
          ${checkInput(`id="settings-ui-sounds" ${prefs.soundOn && prefs.uiSounds ? "checked" : ""} ${prefs.soundOn ? "" : "disabled"}`)}
          UI Sounds
        </label>
      </div>
      <label class="field" data-tip="Master level for UI and impact sounds"><span data-range-label="settings-volume">Volume ${prefs.soundVolume}</span>
        <input type="range" id="settings-volume" min="0" max="100" step="1" value="${prefs.soundVolume}" ${prefs.soundOn ? "" : "disabled"} />
      </label>
    </section>
    <section class="section">
      <h2 data-tip="Helpful hints and hover labels">${sectionTitleIcon(lightbulbIcon)}Guidance</h2>
      <div class="check-row">
        <label class="check" data-tip="Rotating Pro Tip cards in the corner">
          ${checkInput(`id="settings-tips" ${prefs.tipsOn ? "checked" : ""}`)}
          Tips
        </label>
      </div>
      <div class="check-row">
        <label class="check" data-tip="Hover labels on controls">
          ${checkInput(`id="settings-tooltips" ${prefs.tooltipsOn ? "checked" : ""}`)}
          Tooltips
        </label>
      </div>
    </section>
    <section class="section">
      <h2 data-tip="Lighter live bloom so piles stay smoother; exports stay full quality">${sectionTitleIcon(gaugeIcon)}Performance</h2>
      <div class="check-row">
        <label class="check" data-tip="Softens live bloom for smoother playback; exports stay full quality">
          ${checkInput(`id="settings-performance" ${prefs.performance ? "checked" : ""}`)}
          Performance mode
        </label>
      </div>
    </section>
    <section class="section">
      <h2 data-tip="Reopen your last unsaved session after a refresh">${sectionTitleIcon(clockCounterClockwiseIcon)}Session</h2>
      <div class="check-row">
        <label class="check" data-tip="Keep a draft and offer to reconnect after a refresh">
          ${checkInput(`id="settings-remember" ${prefs.rememberLast ? "checked" : ""}`)}
          Remember last
        </label>
      </div>
    </section>
    ${shortcutsMarkup()}
  `;
}

function bindCheck(panel: HTMLElement, id: string, key: keyof AppPrefs, controller: SettingsController) {
  panel.querySelector<HTMLInputElement>(`#${id}`)?.addEventListener("change", (event) => {
    const input = event.currentTarget as HTMLInputElement;
    setPrefs({ [key]: input.checked } as Partial<AppPrefs>);
    playSwitch(input.checked);
    paintToggles(controller);
    controller.prefsChanged();
  });
}

function bindShortcutsFold(panel: HTMLElement) {
  const section = panel.querySelector<HTMLElement>("[data-shortcuts-fold]");
  if (!section) return;
  const toggle = section.querySelector<HTMLButtonElement>(".section-toggle");
  const fold = section.querySelector<HTMLElement>(".section-fold");
  const setOpen = (open: boolean) => {
    shortcutsOpen = open;
    section.classList.toggle("is-open", open);
    toggle?.setAttribute("aria-expanded", String(open));
    if (fold) {
      fold.toggleAttribute("inert", !open);
      fold.setAttribute("aria-hidden", open ? "false" : "true");
    }
  };
  const onToggle = () => setOpen(!section.classList.contains("is-open"));
  toggle?.addEventListener("click", onToggle);
  section.querySelector(".section-head")?.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest(".section-toggle")) return;
    onToggle();
  });
}

function mountSettingsBody(panel: HTMLElement, controller: SettingsController) {
  panelEl = panel;
  panel.innerHTML = panelHtml(getPrefs(), controller.layoutMode());
  paintToggles(controller);
  bindShortcutsFold(panel);

  bindCheck(panel, "settings-sound", "soundOn", controller);
  bindCheck(panel, "settings-bounce-sounds", "bounceSounds", controller);
  bindCheck(panel, "settings-ui-sounds", "uiSounds", controller);
  bindCheck(panel, "settings-tips", "tipsOn", controller);
  bindCheck(panel, "settings-tooltips", "tooltipsOn", controller);
  bindCheck(panel, "settings-remember", "rememberLast", controller);
  bindCheck(panel, "settings-performance", "performance", controller);

  panel.querySelector<HTMLInputElement>("#settings-volume")?.addEventListener("input", (event) => {
    const input = event.currentTarget as HTMLInputElement;
    setPrefs({ soundVolume: Number(input.value) });
    paintVolume();
  });

  panel.querySelectorAll<HTMLButtonElement>("[data-theme-chrome]").forEach((button) => {
    button.addEventListener("click", () => {
      const theme = (button.dataset.themeChrome === "day" ? "day" : "night") as ChromeTheme;
      if (getPrefs().theme === theme) return;
      setPrefs({ theme });
      playSwitch(theme === "day");
      paintToggles(controller);
      controller.prefsChanged();
    });
  });

  panel.querySelectorAll<HTMLButtonElement>("[data-design-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.designMode === "layout";
      if (next === controller.layoutMode()) return;
      void Promise.resolve(controller.setLayoutMode(next)).then(() => {
        paintDesignMode(controller);
      });
    });
  });
}

export function isSettingsOpen(): boolean {
  return Boolean(modalRoot);
}

export function closeSettings(): void {
  if (!modalRoot || closing) return;
  closing = true;
  const root = modalRoot;
  const scrim = root.querySelector<HTMLElement>(".settings-modal__scrim");
  const sheet = root.querySelector<HTMLElement>(".settings-modal__sheet");
  if (onKey) window.removeEventListener("keydown", onKey);
  onKey = null;
  playRemove();

  const done = () => {
    root.remove();
    modalRoot = null;
    panelEl = null;
    closing = false;
  };

  if (reducedMotion() || !scrim || !sheet) {
    done();
    return;
  }

  const tl = gsap.timeline({ onComplete: done });
  tl.to(sheet, { x: 48, autoAlpha: 0, duration: 0.28, ease: "power2.in" }, 0);
  tl.to(scrim, { autoAlpha: 0, duration: 0.28, ease: "power1.in" }, 0);
}

export function openSettings(controller: SettingsController): void {
  if (modalRoot || closing) return;

  const root = document.createElement("div");
  root.className = "settings-modal";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "settings-modal-title");
  root.innerHTML = `
    <div class="settings-modal__scrim" data-settings-close></div>
    <div class="settings-modal__sheet">
      <header class="settings-modal__head">
        <h2 class="settings-modal__title" id="settings-modal-title">Settings</h2>
      </header>
      <div class="settings-modal__body" id="settings-modal-body"></div>
      <footer class="settings-modal__foot">
        <button type="button" class="pill is-on settings-modal__done" data-settings-close data-tip="Close settings">Done</button>
      </footer>
    </div>
  `;

  const scrim = root.querySelector<HTMLElement>(".settings-modal__scrim")!;
  const sheet = root.querySelector<HTMLElement>(".settings-modal__sheet")!;
  const body = root.querySelector<HTMLElement>(".settings-modal__body")!;
  const doneBtn = root.querySelector<HTMLButtonElement>(".settings-modal__done")!;

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("[data-settings-close]")) closeSettings();
  });

  onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSettings();
    }
  };
  window.addEventListener("keydown", onKey);

  document.body.append(root);
  modalRoot = root;
  mountSettingsBody(body, controller);
  playTransition(true);
  doneBtn.focus({ preventScroll: true });

  gsap.set(scrim, { autoAlpha: 0 });
  gsap.set(sheet, { autoAlpha: 0, x: 56 });

  if (reducedMotion()) {
    gsap.set([scrim, sheet], { clearProps: "all", autoAlpha: 1, x: 0 });
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.to(scrim, { autoAlpha: 1, duration: 0.32 }, 0);
  tl.to(sheet, { autoAlpha: 1, x: 0, duration: 0.42 }, 0.04);
}
