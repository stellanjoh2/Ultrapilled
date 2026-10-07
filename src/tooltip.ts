import { hugTipWidth } from "./tipHug";

const SHOW_MS = 380;
const HIDE_MS = 180;
const GAP = 8;
const EDGE = 8;

let enabled = true;
let tip: HTMLElement | null = null;
let active: HTMLElement | null = null;
let timer = 0;
let fadeTimer = 0;
let tipId = "";
let rootEl: ParentNode | null = null;

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function tipTarget(node: EventTarget | null, root: ParentNode): HTMLElement | null {
  if (!(node instanceof Element)) return null;
  const el = node.closest("[data-tip]");
  if (!(el instanceof HTMLElement) || !root.contains(el)) return null;
  if (!el.getAttribute("data-tip")?.trim()) return null;
  return el;
}

function finishHide() {
  window.clearTimeout(fadeTimer);
  fadeTimer = 0;
  if (!tip) return;
  tip.classList.remove("is-leaving");
  tip.removeAttribute("id");
  tip.hidden = true;
  tip.textContent = "";
}

function hide(fade = false) {
  window.clearTimeout(timer);
  timer = 0;
  if (active && tipId) active.removeAttribute("aria-describedby");
  active = null;
  tipId = "";
  if (!tip) return;
  const visible = !tip.hidden;
  if (fade && visible && !reducedMotion()) {
    if (tip.classList.contains("is-leaving")) return;
    const node = tip;
    const done = (event?: TransitionEvent) => {
      if (event && event.propertyName !== "opacity") return;
      if (tip !== node) return;
      node.removeEventListener("transitionend", onEnd);
      finishHide();
    };
    const onEnd = (event: TransitionEvent) => done(event);
    node.addEventListener("transitionend", onEnd);
    node.classList.add("is-leaving");
    fadeTimer = window.setTimeout(() => done(), HIDE_MS + 40);
    return;
  }
  finishHide();
}

function place(el: HTMLElement) {
  if (!tip) return;
  const text = el.getAttribute("data-tip")?.trim();
  if (!text) {
    hide();
    return;
  }
  tip.style.width = "";
  tip.textContent = text;
  tip.hidden = false;
  hugTipWidth(tip);
  const rect = el.getBoundingClientRect();
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  let left = rect.left + rect.width / 2 - tw / 2;
  left = Math.max(EDGE, Math.min(left, window.innerWidth - tw - EDGE));
  let top = rect.top - th - GAP;
  if (top < EDGE) top = rect.bottom + GAP;
  if (top + th > window.innerHeight - EDGE) {
    top = Math.max(EDGE, window.innerHeight - th - EDGE);
  }
  tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}

function show(el: HTMLElement) {
  if (!tip || !enabled) return;
  window.clearTimeout(fadeTimer);
  fadeTimer = 0;
  tip.classList.remove("is-leaving");
  if (active && tipId) active.removeAttribute("aria-describedby");
  active = el;
  tipId = `ui-tip-${Math.random().toString(36).slice(2, 9)}`;
  tip.id = tipId;
  el.setAttribute("aria-describedby", tipId);
  place(el);
}

function entering(el: HTMLElement, related: EventTarget | null) {
  if (!enabled) return;
  if (related instanceof Node && el.contains(related)) return;
  if (el === active) return;
  window.clearTimeout(timer);
  window.clearTimeout(fadeTimer);
  timer = 0;
  fadeTimer = 0;
  if (active && tipId) active.removeAttribute("aria-describedby");
  active = null;
  if (tip) {
    tip.classList.remove("is-leaving");
    tip.hidden = true;
  }
  timer = window.setTimeout(() => show(el), SHOW_MS);
}

function leaving(el: HTMLElement, related: EventTarget | null) {
  if (!rootEl) return;
  if (related instanceof Node && el.contains(related)) return;
  if (related instanceof Element && tipTarget(related, rootEl) === el) return;
  if (el === active || timer) hide();
}

export function setTooltipsEnabled(on: boolean) {
  enabled = on;
  if (!on) hide();
}

/** Hide a lingering canvas-handle tip when the control goes away. */
export function hideTooltip(opts?: { fade?: boolean }) {
  hide(Boolean(opts?.fade));
}

/** Start the usual delay for an element that appeared under the pointer. */
export function suggestTooltip(el: HTMLElement) {
  entering(el, null);
}

export function mountTooltips(root: ParentNode): void {
  rootEl = root;
  tip = document.createElement("div");
  tip.className = "ui-tip";
  tip.hidden = true;
  tip.setAttribute("role", "tooltip");
  document.body.append(tip);

  root.addEventListener("pointerover", (event) => {
    const el = tipTarget(event.target, root);
    if (!el) return;
    entering(el, event instanceof PointerEvent ? event.relatedTarget : null);
  });

  root.addEventListener("pointerout", (event) => {
    const el = tipTarget(event.target, root);
    if (!el) return;
    leaving(el, event instanceof PointerEvent ? event.relatedTarget : null);
  });

  root.addEventListener("focusin", (event) => {
    const el = tipTarget(event.target, root);
    if (!el) return;
    entering(el, event instanceof FocusEvent ? event.relatedTarget : null);
  });

  root.addEventListener("focusout", (event) => {
    const el = tipTarget(event.target, root);
    if (!el) return;
    leaving(el, event instanceof FocusEvent ? event.relatedTarget : null);
  });

  root.addEventListener("pointerdown", () => hide(true));
  root.addEventListener("scroll", () => hide(), true);
  window.addEventListener("scroll", () => hide(), true);
  window.addEventListener("resize", () => hide());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hide();
  });
}
