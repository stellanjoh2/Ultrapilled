import gsap from "gsap";
import type { TextSlot } from "./types";

export const DEFAULT_TEXT_ANIM_SPEED = 50;

type Running = { sig: string; kill: () => void };

const running = new WeakMap<HTMLElement, Running>();
const timelines = new Set<gsap.core.Timeline>();
let textAnimsPaused = false;

/** Pause or resume all live text letter timelines (settings stay on). */
export function setTextAnimsPaused(paused: boolean) {
  textAnimsPaused = paused;
  for (const tl of timelines) {
    if (paused) tl.pause();
    else tl.resume();
  }
}

export type RollingTextOpts = {
  speed?: number;
  fontSize?: number;
  /** Keep the full string as one cycle row (no word split). */
  asPhrase?: boolean;
  /** After split markup is mounted, before the timeline starts (e.g. gradient fill). */
  prepare?: (label: HTMLElement) => void;
};

export function textAnimSpeedOf(speed: number | undefined): number {
  const value = speed ?? DEFAULT_TEXT_ANIM_SPEED;
  if (!Number.isFinite(value)) return DEFAULT_TEXT_ANIM_SPEED;
  return Math.max(1, Math.min(100, Math.round(value)));
}

/** Words for cycle; empty text becomes a single space so measure stays valid. */
export function textAnimWords(text: string): string[] {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  return parts.length > 0 ? parts : [" "];
}

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function pace(speed: number | undefined) {
  const s = textAnimSpeedOf(speed);
  const scale = DEFAULT_TEXT_ANIM_SPEED / s;
  return {
    letter: 0.4 * scale,
    stagger: 0.045 * scale,
    pause: 0.85 * scale,
  };
}

/** How far letters travel so they clear the pill edge (clip happens on the chip). */
export function textAnimTravel(chipHeight: number, fontSize: number): number {
  if (chipHeight > 0) return Math.ceil(chipHeight / 2 + fontSize * 0.15);
  return Math.ceil(fontSize * 1.2);
}

function travelPx(label: HTMLElement, fontSize: number): number {
  const host = label.parentElement;
  if (!host) return textAnimTravel(0, fontSize);
  // Bare type stays ink-tight — travel is font-based so letters clear the clip edge.
  if (host.classList.contains("chip-bare")) {
    return textAnimTravel(0, fontSize);
  }
  // Prefer laid-out height; fall back to the inline size applyVisual just set
  // (clientHeight can still be 0 in the same frame as a canvas→DOM switch).
  const styled = Number.parseFloat(host.style.height);
  const height = host.clientHeight > 0 ? host.clientHeight : styled > 0 ? styled : 0;
  return textAnimTravel(height, fontSize);
}

function easePower2Out(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function easePower2In(t: number): number {
  return t * t;
}

/** Sample one letter of the live GSAP cycle (phrase mode) at export time. */
export function textAnimCharPose(
  timeMs: number,
  speed: number | undefined,
  charIndex: number,
  charCount: number,
  travel: number,
): { y: number; alpha: number } {
  if (charCount < 1) return { y: 0, alpha: 1 };
  const { letter, stagger, pause } = pace(speed);
  const wave = letter + Math.max(0, charCount - 1) * stagger;
  const cycle = 2 * wave + pause;
  if (cycle <= 0) return { y: 0, alpha: 1 };
  let t = (timeMs / 1000) % cycle;
  if (t < 0) t += cycle;

  const enterStart = charIndex * stagger;
  const enterEnd = enterStart + letter;
  const exitStart = wave + pause + charIndex * stagger;
  const exitEnd = exitStart + letter;

  if (t < enterStart) return { y: travel, alpha: 0 };
  if (t < enterEnd) {
    const p = easePower2Out((t - enterStart) / letter);
    return { y: travel * (1 - p), alpha: p };
  }
  if (t < exitStart) return { y: 0, alpha: 1 };
  if (t < exitEnd) {
    const p = easePower2In((t - exitStart) / letter);
    return { y: -travel * p, alpha: 1 - p };
  }
  return { y: -travel, alpha: 0 };
}

function splitChars(word: string): HTMLElement[] {
  return [...word].map((ch) => {
    const span = document.createElement("span");
    span.className = "char";
    span.textContent = ch === " " ? "\u00a0" : ch;
    return span;
  });
}

function clearInline(label: HTMLElement) {
  gsap.killTweensOf(label.querySelectorAll(".char, .text-anim-word, .text-anim-clip"));
  label.classList.remove("is-text-anim");
  label.parentElement?.classList.remove("is-text-anim-host");
  label.replaceChildren();
}

export function stopTextAnim(label: HTMLElement) {
  const prev = running.get(label);
  if (prev) {
    prev.kill();
    running.delete(label);
  } else {
    clearInline(label);
  }
}

export function stopTextAnimIn(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(".chip-label").forEach(stopTextAnim);
}

/** Looping letter motion (same engine as pill text anim). */
export function applyRollingText(label: HTMLElement, text: string, opts: RollingTextOpts = {}): boolean {
  const speed = textAnimSpeedOf(opts.speed);
  const fontSize =
    opts.fontSize ?? (Number.parseFloat(getComputedStyle(label).fontSize) || 14);
  const travel = travelPx(label, fontSize);
  const asPhrase = Boolean(opts.asPhrase);
  // Omit travel from the signature — pill height changes every tracking/scale tick and
  // would otherwise tear down + rebuild the GSAP cycle (hard on/off flicker).
  const sig = `cycle|${speed}|${text}|${asPhrase ? "phrase" : "words"}`;
  const prev = running.get(label);
  const host = label.parentElement;
  if (prev?.sig === sig) {
    // Repaints must keep host/label markers even when the timeline is reused.
    label.classList.add("is-text-anim");
    host?.classList.add("is-text-anim-host");
    return true;
  }

  stopTextAnim(label);

  host?.classList.add("is-text-anim-host");

  if (reducedMotion()) {
    label.classList.add("is-text-anim");
    label.textContent = asPhrase ? text.trim() || " " : (textAnimWords(text)[0] ?? text);
    running.set(label, {
      sig,
      kill: () => {
        label.classList.remove("is-text-anim");
        host?.classList.remove("is-text-anim-host");
        label.replaceChildren();
      },
    });
    return true;
  }

  label.classList.add("is-text-anim");
  const timing = pace(speed);
  const clip = document.createElement("span");
  clip.className = "text-anim-clip";

  const words = asPhrase ? [text.trim() || " "] : textAnimWords(text);
  for (const word of words) {
    const row = document.createElement("span");
    row.className = "text-anim-word";
    row.append(...splitChars(word));
    clip.append(row);
  }
  label.replaceChildren(clip);

  const rows = [...clip.querySelectorAll<HTMLElement>(".text-anim-word")];
  let maxW = 0;
  for (const row of rows) {
    row.style.position = "relative";
    maxW = Math.max(maxW, row.getBoundingClientRect().width);
    row.style.position = "";
  }
  if (maxW > 0) clip.style.width = `${Math.ceil(maxW)}px`;

  opts.prepare?.(label);

  gsap.set(rows, { autoAlpha: 0 });
  const tl = gsap.timeline({ repeat: -1 });
  for (const row of rows) {
    const chars = row.querySelectorAll<HTMLElement>(".char");
    tl.set(row, { autoAlpha: 1 });
    tl.fromTo(
      chars,
      { y: travel, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: timing.letter, stagger: timing.stagger, ease: "power2.out" },
    );
    tl.to(chars, {
      y: -travel,
      autoAlpha: 0,
      duration: timing.letter,
      stagger: timing.stagger,
      ease: "power2.in",
      delay: timing.pause,
    });
    tl.set(row, { autoAlpha: 0 });
  }

  timelines.add(tl);
  if (textAnimsPaused) tl.pause();

  running.set(label, {
    sig,
    kill: () => {
      timelines.delete(tl);
      tl.kill();
      clearInline(label);
    },
  });
  return true;
}

/** Builds split markup and starts looping letter motion on the full label. Returns false if caller should use plain text. */
export function applyTextAnim(
  label: HTMLElement,
  slot: TextSlot,
  prepare?: (label: HTMLElement) => void,
): boolean {
  if (!slot.textAnim) {
    stopTextAnim(label);
    return false;
  }
  return applyRollingText(label, slot.text, {
    speed: slot.textAnimSpeed,
    fontSize: slot.fontSize,
    asPhrase: true,
    prepare,
  });
}
