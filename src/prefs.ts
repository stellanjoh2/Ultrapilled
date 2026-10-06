import { lsGet, lsSet } from "./legacyStorage";

export type ChromeTheme = "night" | "day";

export type AppPrefs = {
  soundOn: boolean;
  bounceSounds: boolean;
  uiSounds: boolean;
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

const THEME_ANIM_MS = 320;
let themeAnimTimer = 0;

/** Applies night/day chrome before first paint and after changes. */
export function applyChromeTheme(theme: ChromeTheme = prefs.theme, options?: { animate?: boolean }) {
  const root = document.documentElement;
  const reduce =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const animate = Boolean(options?.animate) && !reduce;

  if (animate) {
    root.classList.add("theme-animating");
    window.clearTimeout(themeAnimTimer);
    themeAnimTimer = window.setTimeout(() => {
      root.classList.remove("theme-animating");
      themeAnimTimer = 0;
    }, THEME_ANIM_MS);
  }

  root.dataset.theme = theme;
  root.style.colorScheme = theme === "day" ? "light" : "dark";
}

applyChromeTheme();
