import gsap from "gsap";
import arrowLeftIcon from "@phosphor-icons/core/assets/regular/arrow-left.svg?raw";
import {
  GUESTBOOK_TURNSTILE_ACTION,
  MAX_GUESTBOOK_NAME,
  MAX_GUESTBOOK_TEXT,
  MIN_GUESTBOOK_WORDS,
  fetchGuestbook,
  guestbookProblem,
  guestbookWordCount,
  postGuestbook,
  type GuestbookEntry,
} from "./guestbook";
import { holdPhysicsForOverlay, releasePhysicsForOverlay } from "./physicsOverlayHold";
import { PRIVACY_HREF } from "./privacy";
import { ensureTurnstileScript, turnstileSiteKey } from "./turnstile";
import { playNotify, playRemove, playTransition } from "./uiSounds";

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

let modalRoot: HTMLElement | null = null;
let closing = false;
let sending = false;
let loadedOffset = 0;
let onKey: ((event: KeyboardEvent) => void) | null = null;
let returnFocus: HTMLElement | null = null;
let turnstileHost: HTMLElement | null = null;
let turnstileWidgetId: string | number | null = null;
let turnstileFadeTimer: ReturnType<typeof setTimeout> | null = null;

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isGuestbookOpen(): boolean {
  return Boolean(modalRoot);
}

function turnstileTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "day" ? "light" : "dark";
}

function clearTurnstileFadeTimer(): void {
  if (turnstileFadeTimer != null) {
    clearTimeout(turnstileFadeTimer);
    turnstileFadeTimer = null;
  }
}

function revealTurnstileHost(): void {
  if (!turnstileHost) return;
  clearTurnstileFadeTimer();
  turnstileHost.classList.remove("is-faded");
  turnstileHost.hidden = false;
  turnstileHost.setAttribute("aria-hidden", "false");
}

function fadeTurnstileHostOut(): void {
  if (!turnstileHost) return;
  clearTurnstileFadeTimer();
  const delay = reducedMotion() ? 0 : 2450;
  turnstileFadeTimer = setTimeout(() => {
    turnstileFadeTimer = null;
    turnstileHost?.classList.add("is-faded");
  }, delay);
}

function clearTurnstileWidget(): void {
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

function removeTurnstileHost(): void {
  clearTurnstileWidget();
  turnstileHost?.remove();
  turnstileHost = null;
}

async function prepareTurnstile(): Promise<void> {
  const siteKey = turnstileSiteKey();
  if (!siteKey) return;
  if (!turnstileHost) {
    turnstileHost = document.createElement("div");
    turnstileHost.id = "guestbook-turnstile";
    turnstileHost.className = "guestbook-turnstile";
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
      theme: turnstileTheme(),
      action: GUESTBOOK_TURNSTILE_ACTION,
      callback: () => fadeTurnstileHostOut(),
      "expired-callback": () => revealTurnstileHost(),
    });
    revealTurnstileHost();
  } catch {
    /* widget failed to start — submit will surface the error */
  }
}

function resetTurnstile(): void {
  if (turnstileWidgetId != null && window.turnstile) {
    try {
      window.turnstile.reset(turnstileWidgetId);
    } catch {
      /* ignore */
    }
  }
  revealTurnstileHost();
}

function entryElement(entry: GuestbookEntry): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "guestbook__entry";
  const text = document.createElement("p");
  text.className = "guestbook__text";
  text.textContent = entry.text;
  const meta = document.createElement("p");
  meta.className = "guestbook__meta";
  const author = document.createElement("span");
  author.className = "guestbook__author";
  author.textContent = entry.author;
  const time = document.createElement("time");
  time.className = "guestbook__time";
  const date = new Date(entry.created * 1000);
  time.dateTime = date.toISOString();
  time.textContent = DATE_FORMAT.format(date);
  meta.append(author, time);
  li.append(text, meta);
  return li;
}

async function loadEntries(root: HTMLElement, reset: boolean): Promise<void> {
  const list = root.querySelector<HTMLOListElement>(".guestbook__list")!;
  const empty = root.querySelector<HTMLElement>(".guestbook__empty")!;
  const more = root.querySelector<HTMLButtonElement>("[data-guestbook-more]")!;
  if (reset) loadedOffset = 0;
  more.disabled = true;
  empty.hidden = false;
  if (reset) empty.textContent = "Loading entries…";
  try {
    const page = await fetchGuestbook(loadedOffset);
    if (modalRoot !== root) return;
    if (reset) list.replaceChildren();
    list.append(...page.entries.map(entryElement));
    loadedOffset += page.entries.length;
    empty.hidden = list.childElementCount > 0;
    empty.textContent = "No entries yet. Be the first to sign.";
    more.hidden = page.remaining <= 0;
  } catch {
    if (modalRoot !== root) return;
    empty.hidden = list.childElementCount > 0;
    empty.textContent = "Couldn’t load the guestbook right now.";
  } finally {
    more.disabled = false;
  }
}

function setStatus(form: HTMLFormElement, text: string, tone: "" | "error" | "ok" = ""): void {
  const status = form.querySelector<HTMLElement>(".guestbook__status");
  if (!status) return;
  status.textContent = text;
  status.classList.toggle("is-error", tone === "error");
  status.classList.toggle("is-ok", tone === "ok");
}

function syncWordMeter(form: HTMLFormElement): void {
  const track = form.querySelector<HTMLElement>("[data-guestbook-word-meter]");
  const fill = form.querySelector<HTMLElement>("[data-guestbook-word-meter-fill]");
  const message = form.querySelector<HTMLTextAreaElement>("#guestbook-message");
  if (!track || !fill || !message) return;
  const words = guestbookWordCount(message.value);
  const ready = words >= MIN_GUESTBOOK_WORDS;
  fill.style.width = `${Math.min(words / MIN_GUESTBOOK_WORDS, 1) * 100}%`;
  fill.classList.toggle("is-ready", ready);
  track.setAttribute("aria-valuenow", String(Math.min(words, MIN_GUESTBOOK_WORDS)));
}

function syncForm(form: HTMLFormElement): void {
  syncWordMeter(form);
  const name = form.querySelector<HTMLInputElement>("#guestbook-name")!;
  const message = form.querySelector<HTMLTextAreaElement>("#guestbook-message")!;
  const send = form.querySelector<HTMLButtonElement>("[data-guestbook-send]")!;
  const wrap = form.querySelector<HTMLElement>("[data-guestbook-send-wrap]");
  const problem = guestbookProblem(name.value, message.value);
  send.disabled = sending || problem !== null;
  if (!wrap) return;
  if (send.disabled && problem) wrap.title = problem;
  else wrap.removeAttribute("title");
}

async function submit(form: HTMLFormElement): Promise<void> {
  if (sending) return;
  const name = form.querySelector<HTMLInputElement>("#guestbook-name")!;
  const message = form.querySelector<HTMLTextAreaElement>("#guestbook-message")!;
  const honeypot = form.querySelector<HTMLInputElement>("[name='honeypot']")?.value ?? "";

  const problem = guestbookProblem(name.value, message.value);
  if (problem) {
    setStatus(form, problem, "error");
    return;
  }

  let turnstileToken = "";
  if (turnstileSiteKey()) {
    if (!window.turnstile || turnstileWidgetId == null) {
      setStatus(form, "Security check isn’t ready yet. Wait a moment and try again.", "error");
      void prepareTurnstile();
      return;
    }
    turnstileToken = window.turnstile.getResponse(turnstileWidgetId) || "";
    if (!turnstileToken) {
      setStatus(form, "Complete the security check, then sign.", "error");
      revealTurnstileHost();
      return;
    }
  }

  sending = true;
  syncForm(form);
  setStatus(form, "Signing…");
  try {
    const result = await postGuestbook({ author: name.value, text: message.value, honeypot, turnstileToken });
    if (!form.isConnected) return;
    if (result.ok) {
      playNotify();
      message.value = "";
      setStatus(
        form,
        result.pending
          ? `Thanks, ${name.value.trim()}! Your entry will show up once it's approved.`
          : `Thanks, ${name.value.trim()}!`,
        "ok",
      );
      if (!result.pending && modalRoot) void loadEntries(modalRoot, true);
    } else {
      setStatus(form, result.message, "error");
      if (result.code === "turnstile_failed" || result.code === "turnstile_required") resetTurnstile();
    }
  } catch {
    setStatus(form, "Network error. Check your connection.", "error");
  } finally {
    sending = false;
    resetTurnstile();
    if (form.isConnected) syncForm(form);
  }
}

export function closeGuestbook(): void {
  if (!modalRoot || closing) return;
  closing = true;
  const root = modalRoot;
  const scrim = root.querySelector<HTMLElement>(".guestbook-modal__scrim");
  const sheet = root.querySelector<HTMLElement>(".guestbook-modal__sheet");
  if (onKey) window.removeEventListener("keydown", onKey, true);
  onKey = null;
  playRemove();

  const done = () => {
    removeTurnstileHost();
    root.remove();
    modalRoot = null;
    closing = false;
    sending = false;
    releasePhysicsForOverlay();
    returnFocus?.focus({ preventScroll: true });
    returnFocus = null;
  };

  if (reducedMotion() || !scrim || !sheet) {
    done();
    return;
  }
  const tl = gsap.timeline({ onComplete: done });
  tl.to(sheet, { x: -48, autoAlpha: 0, duration: 0.28, ease: "power2.in" }, 0);
  tl.to(scrim, { autoAlpha: 0, duration: 0.28, ease: "power1.in" }, 0);
}

export function openGuestbook(): void {
  if (modalRoot || closing) return;
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const root = document.createElement("div");
  root.className = "guestbook-modal";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "guestbook-title");
  root.innerHTML = `
    <div class="guestbook-modal__scrim" data-guestbook-close></div>
    <div class="guestbook-modal__sheet">
      <header class="guestbook-modal__head">
        <button type="button" class="guestbook-modal__back icon-hover" data-guestbook-close aria-label="Back" data-tip="Close guestbook">
          <span class="guestbook-modal__back-icon" aria-hidden="true">${arrowLeftIcon}</span>
        </button>
        <div class="guestbook-modal__titles">
          <h2 class="guestbook-modal__title" id="guestbook-title">Guestbook</h2>
          <p class="guestbook-modal__updated">Leave a note for the next visitor</p>
        </div>
      </header>
      <div class="guestbook-modal__body">
        <p class="guestbook__lede">
          Say hi, share what you made, or leave a note.
          <span class="guestbook__accent">Every entry is read by a human before it shows up.</span>
        </p>
        <form class="guestbook__form" id="guestbook-form" novalidate>
          <label class="guestbook__label" for="guestbook-name">Name</label>
          <input
            class="guestbook__field"
            id="guestbook-name"
            name="author"
            type="text"
            maxlength="${MAX_GUESTBOOK_NAME}"
            autocomplete="nickname"
            spellcheck="false"
            placeholder="What should we call you?"
          />
          <label class="guestbook__label" for="guestbook-message">Message</label>
          <textarea
            class="guestbook__field guestbook__message"
            id="guestbook-message"
            name="text"
            maxlength="${MAX_GUESTBOOK_TEXT}"
            rows="5"
            placeholder="About 5+ words. No links, be kind."
          ></textarea>
          <div
            class="guestbook__meter"
            data-guestbook-word-meter
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="${MIN_GUESTBOOK_WORDS}"
            aria-valuenow="0"
            aria-label="Words of the message"
          >
            <div class="guestbook__meter-fill" data-guestbook-word-meter-fill></div>
          </div>
          <input type="text" name="honeypot" class="guestbook__hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
          <p class="guestbook__status" aria-live="polite"></p>
          <span class="guestbook__send-wrap" data-guestbook-send-wrap>
            <button type="submit" class="pill pill--commit guestbook__send" data-guestbook-send disabled>Sign the guestbook</button>
          </span>
          <p class="guestbook__fine">Your name, message, and date are public once approved. <a href="${PRIVACY_HREF}#guestbook">How we handle it</a>.</p>
        </form>
        <section class="guestbook__entries" aria-label="Entries">
          <h3 class="guestbook__entries-title">Entries</h3>
          <ol class="guestbook__list"></ol>
          <p class="guestbook__empty">Loading entries…</p>
          <button type="button" class="pill guestbook__more" data-guestbook-more hidden>Show more</button>
        </section>
      </div>
      <footer class="guestbook-modal__foot">
        <button type="button" class="pill pill--commit guestbook-modal__done" data-guestbook-close data-tip="Close guestbook">Ok, take me back</button>
      </footer>
    </div>
  `;

  const scrim = root.querySelector<HTMLElement>(".guestbook-modal__scrim")!;
  const sheet = root.querySelector<HTMLElement>(".guestbook-modal__sheet")!;
  const form = root.querySelector<HTMLFormElement>("#guestbook-form")!;
  const name = form.querySelector<HTMLInputElement>("#guestbook-name")!;

  form.addEventListener("input", () => {
    setStatus(form, "");
    syncForm(form);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submit(form);
  });
  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-guestbook-close]")) {
      closeGuestbook();
      return;
    }
    if (target.closest("[data-guestbook-more]")) void loadEntries(root, false);
  });

  onKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closeGuestbook();
  };
  window.addEventListener("keydown", onKey, true);

  document.body.append(root);
  modalRoot = root;
  holdPhysicsForOverlay();
  playTransition(true);
  name.focus({ preventScroll: true });
  syncForm(form);
  void prepareTurnstile();
  void loadEntries(root, true);

  gsap.set(scrim, { autoAlpha: 0 });
  gsap.set(sheet, { autoAlpha: 0, x: -56 });

  if (reducedMotion()) {
    gsap.set([scrim, sheet], { clearProps: "all", autoAlpha: 1, x: 0 });
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.to(scrim, { autoAlpha: 1, duration: 0.32 }, 0);
  tl.to(sheet, { autoAlpha: 1, x: 0, duration: 0.42 }, 0.04);
}
