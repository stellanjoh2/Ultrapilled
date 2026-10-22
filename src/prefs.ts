import { lsGet, lsSet } from "./legacyStorage";

export type ChromeTheme = "night" | "day";

export type AppPrefs = {
  soundOn: boolean;
  bounceSounds: boolean;
  uiSounds: boolean;
  hoverSounds: boolean;
  soundVolume: number;
  tipsOn: boolean;
  tooltipsOn: boolean;
  rememberLast: boolean;
  theme: ChromeTheme;
  performance: boolean;
};

const DEFAULTS: AppPrefs = {
  soundOn: true,
  bounceSounds: true,
  uiSounds: true,
  hoverSounds: true,
  soundVolume: 80,
  tipsOn: true,
  tooltipsOn: true,
  rememberLast: true,
  theme: "night",
  performance: true,
};

function clampVolume(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function read(): AppPrefs {
  try {
    const raw = lsGet("prefs");
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<AppPrefs>;
    return {
      soundOn: parsed.soundOn !== false,
      bounceSounds: parsed.bounceSounds !== false,
      uiSounds: parsed.uiSounds !== false,
      hoverSounds: parsed.hoverSounds !== false,
      soundVolume: clampVolume(Number(parsed.soundVolume ?? DEFAULTS.soundVolume)),
      tipsOn: parsed.tipsOn !== false,
      tooltipsOn: parsed.tooltipsOn !== false,
      rememberLast: parsed.rememberLast !== false,
      theme: parsed.theme === "day" ? "day" : "night",
      performance: typeof parsed.performance === "boolean" ? parsed.performance : DEFAULTS.performance,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

let prefs = read();
const listeners = new Set<() => void>();

function persist() {
  try {
    lsSet("prefs", JSON.stringify(prefs));
  } catch {
    /* private mode / quota */
  }
}

function notify() {
  for (const listener of listeners) listener();
}

export function getPrefs(): AppPrefs {
  return { ...prefs };
}

export function onPrefsChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setPrefs(patch: Partial<AppPrefs>) {
  const prevTheme = prefs.theme;
  prefs = {
    ...prefs,
    ...patch,
    soundVolume:
      patch.soundVolume != null ? clampVolume(patch.soundVolume) : prefs.soundVolume,
    theme: patch.theme === "day" || patch.theme === "night" ? patch.theme : prefs.theme,
  };
  persist();
  const themeChanged = patch.theme != null && patch.theme !== prevTheme;
  applyChromeTheme(prefs.theme, { animate: themeChanged });
  notify();
}

/** Cover → swap → uncover so night↔day never crossfades mid-token. */
const THEME_FADE_MS = 180;
let themeFadeToken = 0;
let themePending: ChromeTheme | null = null;
let themeFading = false;
let themeVeilEl: HTMLElement | null = null;

function paintChromeTheme(theme: ChromeTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme === "day" ? "light" : "dark";
}

function ensureThemeVeil(): HTMLElement {
  if (themeVeilEl?.isConnected) return themeVeilEl;
  const el = document.createElement("div");
  el.className = "theme-veil";
  el.setAttribute("aria-hidden", "true");
  document.body.append(el);
  themeVeilEl = el;
  return el;
}

function removeThemeVeil() {
  themeVeilEl?.remove();
  themeVeilEl = null;
}

function cancelThemeFade() {
  themeFadeToken += 1;
  themePending = null;
  // Leave themeFading to the in-flight run's finally so a follow-up
  // animate pass can re-queue via themePending without double-starting.
  removeThemeVeil();
}

async function setVeilOn(el: HTMLElement, on: boolean): Promise<void> {
  if (el.classList.contains("is-on") === on) return;
  el.classList.toggle("is-on", on);
  // Prefer transitionend so we never swap mid-fade; timeout is a fallback.
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener("transitionend", onEnd);
      resolve();
    };
    const onEnd = (event: TransitionEvent) => {
      if (event.target !== el || event.propertyName !== "opacity") return;
      finish();
    };
    el.addEventListener("transitionend", onEnd);
    window.setTimeout(finish, THEME_FADE_MS + 40);
  });
}

async function runThemeFade() {
  if (themeFading) return;
  const root = document.documentElement;
  themeFading = true;

  try {
    while (themePending) {
      const target = themePending;
      themePending = null;
      if (root.dataset.theme === target) continue;

      const token = ++themeFadeToken;
      const veilColor =
        getComputedStyle(document.body).backgroundColor ||
        getComputedStyle(root).getPropertyValue("--canvas-soft").trim() ||
        "#1c1c1c";

      const veil = ensureThemeVeil();
      veil.style.setProperty("--theme-veil-color", veilColor);
      veil.getBoundingClientRect();
      await setVeilOn(veil, true);
      if (token !== themeFadeToken) return;

      const final = themePending ?? target;
      themePending = null;
      paintChromeTheme(final);
      // Settle new tokens under the opaque cover before lifting.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      if (token !== themeFadeToken) return;

      await setVeilOn(veil, false);
      if (token !== themeFadeToken) return;
      removeThemeVeil();
    }
  } finally {
    themeFading = false;
    if (themePending) void runThemeFade();
  }
}

/** Applies night/day chrome before first paint and after changes. */
export function applyChromeTheme(theme: ChromeTheme = prefs.theme, options?: { animate?: boolean }) {
  const reduce =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const animate = Boolean(options?.animate) && !reduce;

  if (!animate) {
    cancelThemeFade();
    paintChromeTheme(theme);
    return;
  }

  themePending = theme;
  void runThemeFade();
}

applyChromeTheme();
