import { getAudioContext, playSound, unlockAudio, type SoundPlayback } from "@/lib/sound-engine";
import type { SoundAsset } from "@/lib/sound-types";
import { getPrefs, onPrefsChange } from "./prefs";
import { drop001Sound } from "@/sounds/drop-001";
import { drop002Sound } from "@/sounds/drop-002";
import { drop004Sound } from "@/sounds/drop-004";

/** Collapse same-tick requests; block another play shortly after. */
const SOUND_LOCK_MS = 50;
/** Min gap between hover cues so sweeping the panel doesn’t chatter. */
const HOVER_MIN_INTERVAL_MS = 120;

/** Shape-fall impacts stay on Soundcn drops (drop-004 weighted twice). */
const IMPACT_POOL: SoundAsset[] = [drop004Sound, drop002Sound, drop004Sound, drop001Sound];

/** SND01 sine UI pack under public/sounds. */
const S = (name: string) => `/sounds/${name}.wav`;

const TAP_URLS = [S("tap_01"), S("tap_02"), S("tap_03"), S("tap_04"), S("tap_05")];
const TYPE_URLS = [S("type_01"), S("type_02"), S("type_03"), S("type_04"), S("type_05")];
/** Mozayk project-owned hover cue. */
const HOVER_URL = S("hover");

/** Interactive chrome that should chirp on pointer enter. */
const HOVER_SELECTOR = [
  "button",
  "[role='button']",
  "a[href]",
  ".panel-tabs__tab",
  ".theme-swatch",
  ".tint",
  ".font-menu-item",
  ".font-pick-trigger",
  ".section-toggle",
  "label.check",
  ".panel-credit__author",
  ".panel-credit__social button",
].join(", ");

const impactBySlot = new Map<string, string>();

let pendingUri: string | null = null;
let pendingVolume = 1;
let pendingRate = 1;
let pendingGate: () => boolean = () => false;
let pendingImportant = false;
let flushQueued = false;
let lockedUntil = 0;
let hoverUntil = 0;
let unlockBound = false;
/** Stops a just-started tap when an open/close cue wins in the lock window. */
let activePlayback: SoundPlayback | null = null;
let playEpoch = 0;
/** Forced mute (e.g. audio-react mic). Overrides user sound prefs. */
let forceMuted = false;
let soundOn = getPrefs().soundOn;
let bounceSounds = getPrefs().bounceSounds;
let uiSounds = getPrefs().uiSounds;
let hoverSounds = getPrefs().hoverSounds;
let soundVolume = getPrefs().soundVolume;
let typeBound = false;
let hoverBound = false;
let progressPlayback: SoundPlayback | null = null;

onPrefsChange(() => {
  const prefs = getPrefs();
  soundOn = prefs.soundOn;
  bounceSounds = prefs.bounceSounds;
  uiSounds = prefs.uiSounds;
  hoverSounds = prefs.hoverSounds;
  soundVolume = prefs.soundVolume;
  if (!soundOn || !uiSounds || soundVolume <= 0 || forceMuted) {
    stopProgress();
    stopChargeHum();
  }
});

/** When true, all UI / impact SFX are skipped (e.g. audio-react mic is on). */
export function setUiSoundsMuted(next: boolean) {
  forceMuted = next;
  pendingUri = null;
  activePlayback?.stop();
  activePlayback = null;
  playEpoch += 1;
  stopProgress();
  stopChargeHum();
}

function masterAudible(): boolean {
  return !forceMuted && soundOn && soundVolume > 0;
}

function uiAudible(): boolean {
  return masterAudible() && uiSounds;
}

function bounceAudible(): boolean {
  return masterAudible() && bounceSounds;
}

function hoverAudible(): boolean {
  return masterAudible() && hoverSounds;
}

function gain(volume: number): number {
  return volume * (soundVolume / 100);
}

function pick(urls: string[]): string {
  return urls[Math.floor(Math.random() * urls.length)]!;
}

function requestPlay(
  src: string,
  volume = 1,
  gate: () => boolean = uiAudible,
  opts?: { important?: boolean; rate?: number },
) {
  if (!gate()) return;
  // Block hover for this event before the menu DOM appears under the pointer.
  hoverUntil = Math.max(hoverUntil, performance.now() + HOVER_MIN_INTERVAL_MS);
  const important = Boolean(opts?.important);
  const rate = opts?.rate ?? 1;
  if (flushQueued) {
    // Pending open/close must not be replaced by a generic click (or vice versa: open wins).
    if (pendingImportant && !important) return;
    pendingUri = src;
    pendingVolume = volume;
    pendingRate = rate;
    pendingGate = gate;
    if (important) pendingImportant = true;
    return;
  }
  pendingUri = src;
  pendingVolume = volume;
  pendingRate = rate;
  pendingGate = gate;
  pendingImportant = important;
  flushQueued = true;
  queueMicrotask(() => {
    flushQueued = false;
    const force = pendingImportant;
    pendingImportant = false;
    if (!pendingGate()) {
      pendingUri = null;
      return;
    }
    const uri = pendingUri;
    const vol = pendingVolume;
    const playbackRate = pendingRate;
    pendingUri = null;
    pendingVolume = 1;
    pendingRate = 1;
    if (!uri) return;
    const now = performance.now();
    // Generic clicks yield to a cue already playing in the lock window.
    if (!force && now < lockedUntil) return;
    // Open/close replaces a just-started tap instead of layering on top.
    if (force && now < lockedUntil) {
      activePlayback?.stop();
      activePlayback = null;
    }
    lockedUntil = now + SOUND_LOCK_MS;
    hoverUntil = Math.max(hoverUntil, lockedUntil);
    const epoch = ++playEpoch;
    void playSound(uri, { volume: gain(vol), playbackRate }).then((playback) => {
      if (epoch !== playEpoch) {
        playback.stop();
        return;
      }
      activePlayback = playback;
    });
  });
}

function impactUriForSlot(slotId: string): string {
  let uri = impactBySlot.get(slotId);
  if (!uri) {
    uri = IMPACT_POOL[Math.floor(Math.random() * IMPACT_POOL.length)]!.dataUri;
    impactBySlot.set(slotId, uri);
  }
  return uri;
}

/** Resolve the sticky drop sample + live volume for a bounce (shared by speaker + export). */
export function resolveImpact(
  slotId: string,
  bounceIndex: number,
  speedFactor: number,
): { uri: string; volume: number } {
  const bounceVol = bounceIndex <= 0 ? 1 : bounceIndex === 1 ? 0.5 : 0.25;
  const volume = Math.max(0.15, Math.min(1, bounceVol * speedFactor));
  return { uri: impactUriForSlot(slotId), volume };
}

/** Light UI press (random tap). */
export function playClick() {
  requestPlay(pick(TAP_URLS));
}

/** Trigger Physics primary control — notification.wav retired. */
export function playButton() {
  requestPlay(S("select"));
}

/** Add / upload / duplicate. */
export function playCreate() {
  requestPlay(S("select"));
}

/** Impact for a slot’s assigned drop sound. `bounceIndex` 0 = first hit. */
export function playImpact(slotId: string, bounceIndex: number, speedFactor: number) {
  const { uri, volume } = resolveImpact(slotId, bounceIndex, speedFactor);
  requestPlay(uri, volume, bounceAudible);
}

/** Remove / dismiss / deselect — same priority as open so it beats the auto click. */
export function playRemove() {
  requestPlay(S("transition_down"), 1, uiAudible, { important: true });
}

/** Soft success (clipboard, quick confirm) — notification.wav retired. */
export function playNotify() {}

/** Bigger success (export finished). */
export function playCelebrate() {
  requestPlay(S("celebration"));
}

/** Error / cancel / warning — caution.wav retired. */
export function playCaution() {}

/** Checkbox / boolean control. */
export function playSwitch(on = true) {
  requestPlay(on ? S("toggle_on") : S("toggle_off"));
}

/** Slot accordion / context menu open / close. */
export function playTransition(up: boolean) {
  requestPlay(up ? S("transition_up") : S("transition_down"), 1, uiAudible, { important: true });
}

/** Tab change / hide UI / invert — same light tap as other UI. */
export function playSwipe() {
  playClick();
}

export function playInvert() {
  playClick();
}

/** Disabled control feedback. */
export function playDisabled() {
  requestPlay(S("disabled"));
}

/** Random typewriter click; overlaps allowed so rapid typing still feels dense. */
export function playType() {
  if (!uiAudible()) return;
  void playSound(pick(TYPE_URLS), { volume: gain(0.7) });
}

/** Soft chirp when the pointer enters interactive chrome. */
export function playHover() {
  if (!hoverAudible()) return;
  const now = performance.now();
  if (now < hoverUntil || now < lockedUntil) return;
  hoverUntil = now + HOVER_MIN_INTERVAL_MS;
  void playSound(HOVER_URL, { volume: gain(0.85) });
}

/** Looping bed while a long export runs. */
export function startProgress() {
  if (!uiAudible()) return;
  stopProgress();
  void playSound(S("progress_loop"), { volume: gain(0.35), loop: true }).then((playback) => {
    if (!uiAudible()) {
      playback.stop();
      return;
    }
    progressPlayback = playback;
  });
}

export function stopProgress() {
  progressPlayback?.stop();
  progressPlayback = null;
}

const CHARGE_HUM_FROM_HZ = 220;
const CHARGE_HUM_TO_HZ = 740;
const CHARGE_HUM_VOLUME = 0.09;
/** Matches the meter's fade-in delay so quick taps stay silent. */
const CHARGE_HUM_DELAY_S = 0.08;
let chargeHum: { stop: () => void } | null = null;

/** Hover-car whirr that glides up over `chargeMs` (t² like the shake) and wobbles at the top. */
export function startChargeHum(chargeMs: number) {
  stopChargeHum();
  if (!uiAudible()) return;
  const ctx = getAudioContext();
  if (ctx.state !== "running") return;

  const now = ctx.currentTime;
  const chargeS = chargeMs / 1000;
  const steps = 32;
  const ratio = CHARGE_HUM_TO_HZ / CHARGE_HUM_FROM_HZ;
  const curve = new Float32Array(steps);
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    curve[i] = CHARGE_HUM_FROM_HZ * ratio ** (t * t);
  }

  const out = ctx.createGain();
  out.gain.setValueAtTime(0, now);
  out.gain.setValueAtTime(0, now + CHARGE_HUM_DELAY_S);
  out.gain.linearRampToValueAtTime(gain(CHARGE_HUM_VOLUME), now + CHARGE_HUM_DELAY_S + 0.06);

  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 2400;
  tone.connect(out);
  out.connect(ctx.destination);

  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime(6, now);
  lfo.frequency.linearRampToValueAtTime(11, now + chargeS);
  lfo.frequency.linearRampToValueAtTime(15, now + chargeS + 0.05);
  const wobble = ctx.createGain();
  wobble.gain.setValueAtTime(18, now);
  wobble.gain.linearRampToValueAtTime(40, now + chargeS);
  lfo.connect(wobble);

  const voices = [
    { type: "sine" as const, mult: 1, level: 1 },
    { type: "triangle" as const, mult: 2, level: 0.25 },
  ].map(({ type, mult, level }) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueCurveAtTime(curve.map((hz) => hz * mult), now, chargeS);
    wobble.connect(osc.detune);
    const voiceGain = ctx.createGain();
    voiceGain.gain.value = level;
    osc.connect(voiceGain).connect(tone);
    return osc;
  });

  const sources = [lfo, ...voices];
  for (const src of sources) src.start(now);

  chargeHum = {
    stop: () => {
      const end = ctx.currentTime;
      out.gain.cancelScheduledValues(end);
      out.gain.setValueAtTime(out.gain.value, end);
      out.gain.linearRampToValueAtTime(0, end + 0.08);
      for (const src of sources) src.stop(end + 0.1);
    },
  };
}

export function stopChargeHum() {
  chargeHum?.stop();
  chargeHum = null;
}

/** dB below full volume for a zero-charge tap; max charge plays at 0 dB. */
const SHAKE_RELEASE_FLOOR_DB = -24;
const SHAKE_RELEASE_RATE = 0.8;

/** 8-bit boom on shake release; `charge` 0–1 maps linearly in dB up to full volume. */
export function playShakeRelease(charge: number) {
  const c = Math.min(1, Math.max(0, charge));
  const volume = 10 ** ((SHAKE_RELEASE_FLOOR_DB * (1 - c)) / 20);
  requestPlay(S("shake_release"), volume, uiAudible, { important: true, rate: SHAKE_RELEASE_RATE });
}

function isTypingField(target: EventTarget | null): boolean {
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLInputElement) {
    const type = target.type;
    return type === "text" || type === "search" || type === "password" || type === "";
  }
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  return false;
}

function bindAudioUnlock() {
  if (unlockBound) return;
  unlockBound = true;
  const unlock = () => {
    void unlockAudio();
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
}

/** Bind gesture unlock early (e.g. mobile gate) so pile touches can re-open Web Audio. */
export function bindAudioUnlockGestures() {
  bindAudioUnlock();
}

/** Sine taps / button on interactive UI presses. */
export function bindUiClickSounds(root: ParentNode = document) {
  bindAudioUnlock();
  root.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const el = target.closest("button, [role='button']");
      if (!(el instanceof HTMLElement)) return;
      if (el instanceof HTMLButtonElement && el.disabled) {
        playDisabled();
        return;
      }
      if (el.getAttribute("aria-disabled") === "true") {
        playDisabled();
        return;
      }
      // Explicit sounds elsewhere (tabs, slot accordion, section folds, Trigger Physics, mic).
      if (el.id === "play" || el.id === "audio-mic") return;
      if (el.classList.contains("panel-tabs__tab")) return;
      if (el.classList.contains("slot-toggle")) return;
      if (el.classList.contains("section-toggle")) return;
      playClick();
    },
    true,
  );
}

/** Random type sound on text / contenteditable input (panel + canvas). */
export function bindUiTypeSounds(root: ParentNode = document) {
  if (typeBound) return;
  typeBound = true;
  bindAudioUnlock();
  root.addEventListener(
    "input",
    (event) => {
      if (!isTypingField(event.target)) return;
      playType();
    },
    true,
  );
}

function shouldPlayHover(el: HTMLElement): boolean {
  if (el instanceof HTMLButtonElement && el.disabled) return false;
  if (el instanceof HTMLAnchorElement && el.getAttribute("aria-disabled") === "true") return false;
  if (el.getAttribute("aria-disabled") === "true") return false;
  // Media thumbs aren't text links — skip so sweeping the About reel doesn't chatter.
  if (el.classList.contains("about-project__media")) return false;
  if (el.classList.contains("check")) {
    const input = el.querySelector("input");
    if (input instanceof HTMLInputElement && input.disabled) return false;
  }
  return true;
}

/** Mozayk-style hover chirp on interactive UI chrome. */
export function bindUiHoverSounds(root: ParentNode = document) {
  if (hoverBound) return;
  hoverBound = true;
  bindAudioUnlock();
  root.addEventListener(
    "mouseover",
    (event) => {
      if (!(event instanceof MouseEvent)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const el = target.closest(HOVER_SELECTOR);
      if (!(el instanceof HTMLElement) || !shouldPlayHover(el)) return;
      const related = event.relatedTarget;
      if (related instanceof Node && el.contains(related)) return;
      playHover();
    },
    true,
  );
}
