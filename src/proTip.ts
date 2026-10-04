import exclamationMark from "@phosphor-icons/core/assets/regular/exclamation-mark.svg?raw";
import { setPrefs } from "./prefs";

const AFTER_READY_MS = 2000;
const HOLD_MS = 5000;
const GAP_MS = 5000;
const ANIM_MS = 1000;
/** Slide + mark + copy stagger (see .pro-tip CSS). */
const REVEAL_MS = 1500;

type Hint = {
  text: string;
  key?: string;
  after?: string;
};

const BLANK_FIRST: Hint = {
  text: "Add your first asset in the Create tab — or right-click the canvas",
};

const HINTS: Hint[] = [
  { text: "Hit", key: "Space", after: "to play" },
  { text: "Do you hate bouncy stuff? Try Layout Mode — or hit", key: "L" },
  { text: "Need ideas? Explore the templates in the Create tab" },
  { text: "Hide the UI for a clean canvas", key: "H" },
  { text: "Toggle the guide grid", key: "G" },
  { text: "Delete a selected piece with Backspace" },
  { text: "Duplicate a selection with Shift+D — or ⌘D / Ctrl+D" },
  { text: "Copy and paste assets with ⌘C / ⌘V or Ctrl+C / Ctrl+V" },
  { text: "Invert the selected piece", key: "I" },
  { text: "Click a piece to edit it" },
  { text: "Double-click one shape in a group to edit it alone" },
  { text: "Double-click text to type on the canvas — or hit Enter" },
  { text: "Right-click a piece to recolor, edit, duplicate, invert, or remove it" },
  { text: "The more stuff you add the slower the app becomes" },
  { text: "Want to use bloom but it feels laggy? Try Performance mode in Settings" },
  { text: "Do you hate sound? You can turn that off in the Settings" },
  { text: "Save your scene as a .pill file from the Export tab" },
];

let isBlank: () => boolean = () => false;

function queue(): Hint[] {
  return isBlank() ? [BLANK_FIRST, ...HINTS] : HINTS;
}

function typing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
  );
}

let enabled = true;
let hostEl: Element | null = null;
let tip: HTMLElement | null = null;
let hold = 0;
let enterTimer = 0;
let removeTimer = 0;
let gapTimer = 0;
let showTimer = 0;

function animMs(): number {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ANIM_MS;
}

function remove() {
  window.clearTimeout(removeTimer);
  tip?.remove();
  tip = null;
  document.removeEventListener("keydown", onKey);
}

function clearTimers() {
  window.clearTimeout(hold);
  window.clearTimeout(enterTimer);
  window.clearTimeout(removeTimer);
  window.clearTimeout(gapTimer);
  window.clearTimeout(showTimer);
}

function dismiss() {
  if (!tip) return;
  clearTimers();
  const node = tip;
  const index = Number(node.dataset.index);
  node.classList.add("is-leaving");
  node.classList.remove("is-in");
  let done = false;
  const finish = () => {
    if (done || tip !== node) return;
    done = true;
    remove();
    if (!enabled || index + 1 >= queue().length) return;
    gapTimer = window.setTimeout(() => show(index + 1), GAP_MS);
  };
  if (animMs() === 0) {
    finish();
    return;
  }
  const onOut = (event: TransitionEvent) => {
    if (event.target !== node || event.propertyName !== "transform") return;
    finish();
  };
  node.addEventListener("transitionend", onOut);
  removeTimer = window.setTimeout(finish, animMs() + 80);
}

function onKey(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (typing(event.target)) return;
  if (event.key === "Escape" || event.key === "h" || event.key === "H") dismiss();
}

function show(index: number) {
  if (!enabled || !hostEl) return;
  const hint = queue()[index];
  if (!hint) return;

  const node = document.createElement("div");
  node.className = "pro-tip";
  node.dataset.index = String(index);
  node.setAttribute("role", "status");

  const mark = document.createElement("span");
  mark.className = "pro-tip__mark";
  mark.setAttribute("aria-hidden", "true");
  mark.innerHTML = exclamationMark;

  const head = document.createElement("div");
  head.className = "pro-tip__head";

  const title = document.createElement("p");
  title.className = "pro-tip__title";
  title.textContent = "Pro Tip";

  head.append(mark, title);

  const body = document.createElement("p");
  body.className = "pro-tip__body";
  body.append(hint.text);
  if (hint.key) {
    body.append(" ");
    const key = document.createElement("kbd");
    key.textContent = hint.key;
    body.append(key);
  }
  if (hint.after) body.append(` ${hint.after}`);
  body.append(".");

  const stop = document.createElement("button");
  stop.type = "button";
  stop.className = "pro-tip__stop";
  stop.textContent = "Stop showing me these";
  stop.addEventListener("click", () => {
    setPrefs({ tipsOn: false });
    setProTipsEnabled(false);
  });

  node.append(head, body, stop);
  hostEl.append(node);
  tip = node;
  document.addEventListener("keydown", onKey);

  let settled = false;
  const settle = () => {
    if (settled || tip !== node) return;
    settled = true;
    hold = window.setTimeout(dismiss, HOLD_MS);
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (tip !== node) return;
      node.classList.add("is-in");
      if (animMs() === 0) {
        settle();
        return;
      }
      enterTimer = window.setTimeout(settle, REVEAL_MS + 80);
    });
  });
}

export function setProTipsEnabled(on: boolean) {
  enabled = on;
  if (on) return;
  clearTimers();
  remove();
}

/**
 * Start the tip cycle once boot UI is up (after Mode Select / grid reveal).
 * Safe to call more than once — resets any early flash.
 */
export function releaseProTips(delayMs = AFTER_READY_MS) {
  if (!hostEl) return;
  clearTimers();
  remove();
  if (!enabled) return;
  showTimer = window.setTimeout(() => show(0), delayMs);
}

export function mountProTip(host: Element, opts?: { blank?: () => boolean }): void {
  hostEl = host;
  isBlank = opts?.blank ?? (() => false);
  // Don't schedule yet — wait for releaseProTips after boot so tips don't flash under Mode Select.
}
