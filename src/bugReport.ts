import gsap from "gsap";
import arrowLeftIcon from "@phosphor-icons/core/assets/regular/arrow-left.svg?raw";
import warningCircleIcon from "@phosphor-icons/core/assets/regular/warning-circle.svg?raw";
import { holdPhysicsForOverlay, releasePhysicsForOverlay } from "./physicsOverlayHold";
import { PRIVACY_HREF } from "./privacy";
import { ensureTurnstileScript, turnstileSiteKey } from "./turnstile";
import { playNotify, playRemove, playTransition } from "./uiSounds";

export const BUG_REPORT_APP = "ultrapilled";
export const MIN_BUG_MESSAGE_WORDS = 5;

/** Public Orby Vercel route; override with VITE_BUG_REPORT_API_URL. */
export const DEFAULT_BUG_REPORT_API = "https://orby-gamma.vercel.app/api/bug-report";

/** Same-origin path proxied by Vite in dev (see vite.config.ts). */
export const LOCAL_BUG_REPORT_PROXY = "/api/bug-report";

const CATEGORIES = [
  { value: "crash", label: "Crash / Freeze" },
  { value: "rendering", label: "Rendering / Display" },
  { value: "physics", label: "Physics / Motion" },
  { value: "ui", label: "UI / Controls" },
  { value: "export", label: "Export / Save" },
  { value: "media", label: "YouTube / Images / Audio" },
  { value: "other", label: "Other" },
] as const;

const SEVERITIES = [
  { value: "cosmetic", label: "Low — Visual niggle", tone: "low" },
  { value: "minor", label: "Minor — Easy workaround", tone: "minor" },
  { value: "moderate", label: "Moderate — Noticeable issue", tone: "moderate" },
  { value: "major", label: "Major — Blocks a feature", tone: "major" },
  { value: "blocker", label: "Blocker — Can't continue", tone: "blocker" },
] as const;

const THANK_YOU_PREFIX =
  "Thanks for letting us know — we really appreciate you taking the time. ";
const THANK_YOU_ACCENT = "We’ll look into it shortly.";
const THANK_YOU_OK = "Keep pilling";

/** Same arrow glyph as Orby’s big-message magic CTA. */
const THANKS_OK_ARROW = `<svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3.5 8h9M9 4.5L12.5 8 9 11.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

let modalRoot: HTMLElement | null = null;
let closing = false;
let sending = false;
let thanksMode = false;
let overlayPhysicsHeld = false;
let onKey: ((event: KeyboardEvent) => void) | null = null;
let returnFocus: HTMLElement | null = null;
let turnstileHost: HTMLElement | null = null;
let turnstileWidgetId: string | number | null = null;
let turnstileFadeTimer: ReturnType<typeof setTimeout> | null = null;

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clearTurnstileFadeTimer() {
  if (turnstileFadeTimer != null) {
    clearTimeout(turnstileFadeTimer);
    turnstileFadeTimer = null;
  }
}

function revealTurnstileHost() {
  if (!turnstileHost) return;
  clearTurnstileFadeTimer();
  turnstileHost.classList.remove("is-faded");
  turnstileHost.hidden = false;
  turnstileHost.setAttribute("aria-hidden", "false");
}

function fadeTurnstileHostOut() {
  if (!turnstileHost) return;
  clearTurnstileFadeTimer();
  const delay = reducedMotion() ? 0 : 2450;
  turnstileFadeTimer = setTimeout(() => {
    turnstileFadeTimer = null;
    turnstileHost?.classList.add("is-faded");
  }, delay);
}

function clearTurnstileWidget() {
  clearTurnstileFadeTimer();
  if (turnstileWidgetId != null && window.turnstile) {
    try {
      window.turnstile.remove(turnstileWidgetId);
    } catch {
      /* ignore */
    }
  }
  turnstileWidgetId = null;
}

function removeTurnstileHost() {
  clearTurnstileWidget();
  turnstileHost?.remove();
  turnstileHost = null;
}

async function prepareTurnstile() {
  const siteKey = turnstileSiteKey();
  if (!siteKey) return;
  if (!turnstileHost) {
    turnstileHost = document.createElement("div");
    turnstileHost.id = "bug-report-turnstile";
    turnstileHost.className = "bug-report-turnstile";
    turnstileHost.setAttribute("aria-label", "Security check");
    turnstileHost.hidden = true;
    turnstileHost.setAttribute("aria-hidden", "true");
    document.body.append(turnstileHost);
  }
  revealTurnstileHost();
  try {
    await ensureTurnstileScript();
  } catch {
    return;
  }
  if (!turnstileHost || !window.turnstile) return;
  clearTurnstileWidget();
  try {
    turnstileWidgetId = window.turnstile.render(turnstileHost, {
      sitekey: siteKey,
      theme: "dark",
      callback: () => fadeTurnstileHostOut(),
      "expired-callback": () => revealTurnstileHost(),
    });
    revealTurnstileHost();
  } catch {
    /* widget failed to start — submit will surface the error */
  }
}

function resetTurnstile() {
  if (turnstileWidgetId != null && window.turnstile) {
    try {
      window.turnstile.reset(turnstileWidgetId);
    } catch {
      /* ignore */
    }
  }
  revealTurnstileHost();
}

function thanksOkButtonHtml(): string {
  return `
    <button type="button" class="bug-report-thanks__ok" data-bug-thanks-dismiss>
      <span class="bug-report-thanks__ok-ring" aria-hidden="true"></span>
      <span class="bug-report-thanks__ok-inner">
        <span class="bug-report-thanks__ok-label">${THANK_YOU_OK}</span>
        <span class="bug-report-thanks__ok-arrow" aria-hidden="true">${THANKS_OK_ARROW}</span>
      </span>
    </button>
  `;
}

export function bugReportApiUrl(): string {
  const raw = import.meta.env.VITE_BUG_REPORT_API_URL?.trim();
  if (raw) return raw;
  // Avoid production CORS rejecting http://localhost — browser surfaces that as a network error.
  if (import.meta.env.DEV) return LOCAL_BUG_REPORT_PROXY;
  return DEFAULT_BUG_REPORT_API;
}

export function bugReportWordCount(message: string): number {
  const trimmed = message.trim();
  return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
}

export function bugReportMessagePasses(message: string): boolean {
  return bugReportWordCount(message) >= MIN_BUG_MESSAGE_WORDS;
}

export function reportCardHtml(): string {
  return `
    <section class="report-card">
      <h3 class="report-card__title">
        <span class="report-card__icon" aria-hidden="true">${warningCircleIcon}</span>
        Report An Issue
      </h3>
      <p class="report-card__copy">
        Spotted something wrong? Use the quick form here. I can’t reply, but I read everything you send.
        See also <a href="${PRIVACY_HREF}">Privacy</a>.
      </p>
      <button type="button" class="report-card__open" data-open-bug-report data-tip="Open the issue form">Tell us what happened</button>
    </section>
  `;
}

export function isBugReportOpen(): boolean {
  return Boolean(modalRoot);
}

function wrapThanksWords(root: HTMLElement) {
  if (root.querySelector(".bug-report-thanks__word")) return;
  const walk = (node: Node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? "";
        if (!text.trim()) continue;
        const frag = document.createDocumentFragment();
        for (const part of text.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            frag.append(document.createTextNode(part));
            continue;
          }
          const span = document.createElement("span");
          span.className = "bug-report-thanks__word";
          span.textContent = part;
          frag.append(span);
        }
        node.insertBefore(frag, child);
        child.remove();
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    }
  };
  walk(root);
}

function revealThankYou() {
  const root = modalRoot;
  if (!root || thanksMode) return;
  thanksMode = true;
  sending = false;
  closing = false;

  const swap = () => {
    if (modalRoot !== root) return;
    root.classList.add("is-thanks");
    root.setAttribute("aria-labelledby", "bug-report-thanks-message");
    root.innerHTML = `
      <div class="bug-report__scrim" data-bug-thanks-dismiss></div>
      <div class="bug-report-thanks">
        <p class="bug-report-thanks__message" id="bug-report-thanks-message">
          ${THANK_YOU_PREFIX}<span class="bug-report-thanks__accent">${THANK_YOU_ACCENT}</span>
        </p>
        ${thanksOkButtonHtml()}
      </div>
    `;
    removeTurnstileHost();
    if (!overlayPhysicsHeld) {
      holdPhysicsForOverlay();
      overlayPhysicsHeld = true;
    }

    const scrim = root.querySelector<HTMLElement>(".bug-report__scrim")!;
    const message = root.querySelector<HTMLElement>(".bug-report-thanks__message")!;
    const ok = root.querySelector<HTMLElement>(".bug-report-thanks__ok")!;
    ok.focus({ preventScroll: true });

    if (reducedMotion()) {
      gsap.set([scrim, message, ok], { clearProps: "all", autoAlpha: 1, y: 0 });
      return;
    }

    wrapThanksWords(message);
    const words = message.querySelectorAll(".bug-report-thanks__word");
    gsap.set(scrim, { autoAlpha: 1 });
    gsap.set(message, { autoAlpha: 1 });
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    if (words.length) {
      tl.fromTo(words, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.025 });
    } else {
      tl.fromTo(message, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.3 });
    }
    tl.fromTo(ok, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.28, ease: "power3.out" }, "-=0.14");
  };

  const sheet = root.querySelector<HTMLElement>(".bug-report__sheet");
  if (reducedMotion() || !sheet) {
    swap();
    return;
  }

  gsap.to(sheet, {
    x: 48,
    autoAlpha: 0,
    duration: 0.22,
    ease: "power2.in",
    onComplete: swap,
  });
}

export function closeBugReport(): void {
  if (!modalRoot || closing) return;
  closing = true;
  const root = modalRoot;
  const scrim = root.querySelector<HTMLElement>(".bug-report__scrim");
  const sheet = root.querySelector<HTMLElement>(".bug-report__sheet");
  const thanks = root.querySelector<HTMLElement>(".bug-report-thanks");
  if (onKey) window.removeEventListener("keydown", onKey, true);
  onKey = null;
  playRemove();

  const done = () => {
    gsap.killTweensOf(root.querySelectorAll(".bug-report-thanks__word, .bug-report-thanks__ok"));
    removeTurnstileHost();
    root.remove();
    modalRoot = null;
    closing = false;
    sending = false;
    thanksMode = false;
    if (overlayPhysicsHeld) {
      releasePhysicsForOverlay();
      overlayPhysicsHeld = false;
    }
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  };

  if (reducedMotion() || !scrim) {
    done();
    return;
  }

  const tl = gsap.timeline({ onComplete: done });
  if (thanksMode && thanks) {
    tl.to(thanks, { autoAlpha: 0, duration: 0.28, ease: "power2.in" }, 0);
    tl.to(scrim, { autoAlpha: 0, duration: 0.28, ease: "power1.in" }, 0);
    return;
  }
  if (sheet) tl.to(sheet, { x: 48, autoAlpha: 0, duration: 0.28, ease: "power2.in" }, 0);
  tl.to(scrim, { "--scrim-t": 0, duration: 0.28, ease: "power1.in" }, 0);
}

function optionsHtml(
  items: readonly { value: string; label: string; tone?: string }[],
  selected: string,
): string {
  return items
    .map((item) => {
      const tone = item.tone ? ` data-tone="${item.tone}"` : "";
      const sel = item.value === selected ? " selected" : "";
      return `<option value="${item.value}"${tone}${sel}>${item.label}</option>`;
    })
    .join("");
}

function syncWordMeter(form: HTMLFormElement) {
  const track = form.querySelector<HTMLElement>("[data-bug-word-meter]");
  const fill = form.querySelector<HTMLElement>("[data-bug-word-meter-fill]");
  const message = form.querySelector<HTMLTextAreaElement>("#bug-report-message");
  if (!track || !fill || !message) return;
  const words = bugReportWordCount(message.value);
  const ready = words >= MIN_BUG_MESSAGE_WORDS;
  fill.style.width = `${Math.min(words / MIN_BUG_MESSAGE_WORDS, 1) * 100}%`;
  fill.classList.toggle("is-ready", ready);
  track.setAttribute("aria-valuenow", String(Math.min(words, MIN_BUG_MESSAGE_WORDS)));
}

function syncSend(form: HTMLFormElement) {
  syncWordMeter(form);
  const send = form.querySelector<HTMLButtonElement>("[data-bug-send]");
  const wrap = form.querySelector<HTMLElement>("[data-bug-send-wrap]");
  const message = form.querySelector<HTMLTextAreaElement>("#bug-report-message");
  if (!send || !message) return;
  const detailOk = bugReportMessagePasses(message.value);
  send.disabled = sending || !detailOk;
  if (!wrap) return;
  if (send.disabled && !detailOk) wrap.title = "Please write some more!";
  else wrap.removeAttribute("title");
}

function setStatus(form: HTMLFormElement, text: string, isError = false) {
  const status = form.querySelector<HTMLElement>(".bug-report__status");
  if (!status) return;
  status.textContent = text;
  status.classList.toggle("is-error", isError);
}

async function submitForm(form: HTMLFormElement) {
  if (sending) return;
  const category = form.querySelector<HTMLSelectElement>("#bug-report-category")?.value ?? "";
  const severity = form.querySelector<HTMLSelectElement>("#bug-report-severity")?.value ?? "";
  const message = form.querySelector<HTMLTextAreaElement>("#bug-report-message")?.value.trim() ?? "";
  const honeypot = form.querySelector<HTMLInputElement>("[name='honeypot']")?.value ?? "";

  if (!bugReportMessagePasses(message)) {
    setStatus(
      form,
      `Add a bit more detail — at least ${MIN_BUG_MESSAGE_WORDS} words. Steps to reproduce and browser/OS really help.`,
      true,
    );
    return;
  }

  const siteKey = turnstileSiteKey();
  let turnstileToken = "";
  if (siteKey) {
    if (!window.turnstile || turnstileWidgetId == null) {
      setStatus(form, "Security check isn’t ready yet. Wait a moment and try again.", true);
      void prepareTurnstile();
      return;
    }
    turnstileToken = window.turnstile.getResponse(turnstileWidgetId) || "";
    if (!turnstileToken) {
      setStatus(form, "Complete the security check, then send.", true);
      revealTurnstileHost();
      return;
    }
  }

  sending = true;
  syncSend(form);
  setStatus(form, "Sending…");

  try {
    const res = await fetch(bugReportApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app: BUG_REPORT_APP,
        category,
        severity,
        message,
        honeypot,
        turnstileToken,
        source: "ultrapilled-app",
      }),
    });

    if (!res.ok) {
      const raw = await res.text();
      let err: { error?: string; detail?: string; code?: string; retryAfter?: number } = {};
      try {
        err = raw ? JSON.parse(raw) : {};
      } catch {
        err = {};
      }
      let msg = err.detail || err.error || "Could not send report. Try again later.";
      if (res.status === 429) msg = "You’re submitting a little too often. Wait a bit and try again.";
      if (res.status === 503) msg = "Issue reporting isn’t available right now.";
      if (err.code === "turnstile_failed" || err.code === "turnstile_required") {
        msg = "Security check failed. Try again.";
        resetTurnstile();
      }
      setStatus(form, msg, true);
      sending = false;
      syncSend(form);
      return;
    }

    playNotify();
    revealThankYou();
  } catch {
    setStatus(form, "Network error. Check your connection.", true);
    sending = false;
    syncSend(form);
  }
}

export function openBugReport(): void {
  if (modalRoot || closing) return;
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const root = document.createElement("div");
  root.className = "bug-report";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "bug-report-title");
  root.innerHTML = `
    <div class="bug-report__scrim" data-bug-close></div>
    <div class="bug-report__sheet">
      <header class="bug-report__head">
        <button type="button" class="bug-report__back icon-hover" data-bug-close aria-label="Back" data-tip="Close issue form">
          <span class="bug-report__back-icon" aria-hidden="true">${arrowLeftIcon}</span>
        </button>
        <div class="bug-report__titles">
          <h2 class="bug-report__title" id="bug-report-title">Report an issue</h2>
          <p class="bug-report__sub">Spotted something wrong? Tell me what happened</p>
        </div>
      </header>
      <div class="bug-report__body">
        <p class="bug-report__lede">
          Tell me what’s happening — steps, browser, and what you expected all help.
          <span class="bug-report__accent">I can’t reply, but every report is read.</span>
        </p>
        <form class="bug-report__form" id="bug-report-form" novalidate>
          <label class="bug-report__label" for="bug-report-category" data-tip="What kind of problem this is">Category</label>
          <select class="bug-report__field" id="bug-report-category" name="category">
            ${optionsHtml(CATEGORIES, "rendering")}
          </select>
          <label class="bug-report__label" for="bug-report-severity" data-tip="How badly it gets in the way">Severity</label>
          <div class="bug-report__severity">
            <select class="bug-report__field" id="bug-report-severity" name="severity">
              ${optionsHtml(SEVERITIES, "moderate")}
            </select>
          </div>
          <label class="bug-report__label" for="bug-report-message" data-tip="Steps, browser, and what you expected">Details</label>
          <textarea
            class="bug-report__field bug-report__message"
            id="bug-report-message"
            name="message"
            maxlength="8000"
            rows="6"
            placeholder="About 5+ words: steps to reproduce, browser/OS, what you expected…"
          ></textarea>
          <div
            class="bug-report__meter"
            data-bug-word-meter
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="${MIN_BUG_MESSAGE_WORDS}"
            aria-valuenow="0"
            aria-label="Words of detail"
          >
            <div class="bug-report__meter-fill" data-bug-word-meter-fill></div>
          </div>
          <input type="text" name="honeypot" class="bug-report__hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
          <p class="bug-report__status" aria-live="polite"></p>
          <span class="bug-report__send-wrap" data-bug-send-wrap>
            <button type="submit" class="pill pill--commit bug-report__send" data-bug-send disabled>Send report</button>
          </span>
          <p class="bug-report__fine">No contact details are collected with your report. <a href="${PRIVACY_HREF}">How we handle it</a>.</p>
        </form>
      </div>
      <footer class="bug-report__foot">
        <button type="button" class="bug-report__done" data-bug-close>Ok, take me back</button>
      </footer>
    </div>
  `;

  const scrim = root.querySelector<HTMLElement>(".bug-report__scrim")!;
  const sheet = root.querySelector<HTMLElement>(".bug-report__sheet")!;
  const form = root.querySelector<HTMLFormElement>("#bug-report-form")!;
  const message = form.querySelector<HTMLTextAreaElement>("#bug-report-message")!;
  const severity = form.querySelector<HTMLSelectElement>("#bug-report-severity")!;

  const paintSeverityTone = () => {
    const option = severity.selectedOptions[0];
    form.dataset.severity = option?.dataset.tone ?? "moderate";
  };
  paintSeverityTone();
  severity.addEventListener("change", paintSeverityTone);
  for (const eventName of ["input", "change"] as const) {
    message.addEventListener(eventName, () => {
      setStatus(form, "");
      syncSend(form);
    });
  }
  syncSend(form);

  root.addEventListener("click", (event) => {
    const target = event.target;
    // SVG icon clicks are SVGElement, not HTMLElement — use Element so Close works.
    if (!(target instanceof Element)) return;
    if (target.closest("[data-bug-thanks-dismiss], [data-bug-close]")) closeBugReport();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitForm(form);
  });

  onKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closeBugReport();
  };
  window.addEventListener("keydown", onKey, true);

  document.body.append(root);
  modalRoot = root;
  playTransition(true);
  message.focus({ preventScroll: true });
  void prepareTurnstile();

  if (reducedMotion()) return;

  gsap.set(scrim, { "--scrim-t": 0 });
  gsap.set(sheet, { autoAlpha: 0, x: 56 });

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.to(scrim, { "--scrim-t": 1, duration: 0.32 }, 0);
  tl.to(sheet, { autoAlpha: 1, x: 0, duration: 0.42 }, 0.04);
}
