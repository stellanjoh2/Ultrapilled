import gsap from "gsap";
import xIcon from "@phosphor-icons/core/assets/regular/x.svg?raw";
import {
  GUESTBOOK_TURNSTILE_ACTION,
  MAX_GUESTBOOK_NAME,
  MAX_GUESTBOOK_TEXT,
  fetchGuestbook,
  guestbookProblem,
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
let turnstileWidgetId: string | number | null = null;

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isGuestbookOpen(): boolean {
  return Boolean(modalRoot);
}

function turnstileTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "day" ? "light" : "dark";
}

async function mountTurnstile(host: HTMLElement): Promise<void> {
  const siteKey = turnstileSiteKey();
  if (!siteKey) return;
  try {
    await ensureTurnstileScript();
  } catch {
    return;
  }
  if (!window.turnstile || !host.isConnected) return;
  host.hidden = false;
  try {
    turnstileWidgetId = window.turnstile.render(host, {
      sitekey: siteKey,
      theme: turnstileTheme(),
      action: GUESTBOOK_TURNSTILE_ACTION,
    });
  } catch {
    /* widget failed to start — submit will surface the error */
  }
}

function unmountTurnstile(): void {
  if (turnstileWidgetId != null && window.turnstile) {
    try {
      window.turnstile.remove(turnstileWidgetId);
    } catch {
      /* ignore */
    }
  }
  turnstileWidgetId = null;
}

function resetTurnstile(): void {
  if (turnstileWidgetId != null && window.turnstile) {
    try {
      window.turnstile.reset(turnstileWidgetId);
    } catch {
      /* ignore */
    }
  }
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

function syncForm(form: HTMLFormElement): void {
  const name = form.querySelector<HTMLInputElement>("#guestbook-name")!;
  const message = form.querySelector<HTMLTextAreaElement>("#guestbook-message")!;
  const count = form.querySelector<HTMLElement>("[data-guestbook-count]")!;
  const send = form.querySelector<HTMLButtonElement>("[data-guestbook-send]")!;
  const length = message.value.trim().length;
  count.textContent = `${length}/${MAX_GUESTBOOK_TEXT}`;
  count.classList.toggle("is-over", length > MAX_GUESTBOOK_TEXT);
  send.disabled = sending || guestbookProblem(name.value, message.value) !== null;
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
      return;
    }
    turnstileToken = window.turnstile.getResponse(turnstileWidgetId) || "";
    if (!turnstileToken) {
      setStatus(form, "Complete the security check, then sign.", "error");
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
          ? `Thanks, ${name.value.trim()}! Your entry will show up once it’s approved.`
          : `Thanks, ${name.value.trim()}!`,
        "ok",
      );
      if (!result.pending && modalRoot) void loadEntries(modalRoot, true);
    } else {
      setStatus(form, result.message, "error");
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
  const scrim = root.querySelector<HTMLElement>(".guestbook__scrim");
  const card = root.querySelector<HTMLElement>(".guestbook__card");
  if (onKey) window.removeEventListener("keydown", onKey, true);
  onKey = null;
  playRemove();

  const done = () => {
    unmountTurnstile();
    root.remove();
    modalRoot = null;
    closing = false;
    sending = false;
    releasePhysicsForOverlay();
    returnFocus?.focus({ preventScroll: true });
    returnFocus = null;
  };

  if (reducedMotion() || !scrim || !card) {
    done();
    return;
  }
  const tl = gsap.timeline({ onComplete: done });
  tl.to(card, { y: 24, autoAlpha: 0, duration: 0.24, ease: "power2.in" }, 0);
  tl.to(scrim, { autoAlpha: 0, duration: 0.24, ease: "power1.in" }, 0);
}

export function openGuestbook(): void {
  if (modalRoot || closing) return;
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const root = document.createElement("div");
  root.className = "guestbook";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "guestbook-title");
  root.innerHTML = `
    <div class="guestbook__scrim" data-guestbook-close></div>
    <div class="guestbook__card">
      <header class="guestbook__head">
        <h2 class="guestbook__title" id="guestbook-title">Guestbook</h2>
        <button type="button" class="guestbook__x icon-hover" data-guestbook-close aria-label="Close" data-tip="Close">
          <span aria-hidden="true">${xIcon}</span>
        </button>
      </header>
      <p class="guestbook__lede">
        Say hi, share what you made, or leave a note for the next visitor.
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
          maxlength="${MAX_GUESTBOOK_TEXT + 50}"
          rows="4"
          placeholder="No links, be kind."
        ></textarea>
        <p class="guestbook__count" data-guestbook-count aria-hidden="true">0/${MAX_GUESTBOOK_TEXT}</p>
        <input type="text" name="honeypot" class="guestbook__hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
        <div class="guestbook__turnstile" aria-label="Security check" hidden></div>
        <p class="guestbook__status" aria-live="polite"></p>
        <div class="guestbook__actions">
          <button type="button" class="pill" data-guestbook-close>Close</button>
          <button type="submit" class="pill pill--commit" data-guestbook-send disabled>Sign the guestbook</button>
        </div>
        <p class="guestbook__fine">Your name, message, and date are public once approved. <a href="${PRIVACY_HREF}#guestbook">How we handle it</a>.</p>
      </form>
      <section class="guestbook__entries" aria-label="Entries">
        <ol class="guestbook__list"></ol>
        <p class="guestbook__empty">Loading entries…</p>
        <button type="button" class="pill guestbook__more" data-guestbook-more hidden>Show more</button>
      </section>
    </div>
  `;

  const scrim = root.querySelector<HTMLElement>(".guestbook__scrim")!;
  const card = root.querySelector<HTMLElement>(".guestbook__card")!;
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
  void mountTurnstile(form.querySelector<HTMLElement>(".guestbook__turnstile")!);
  void loadEntries(root, true);

  if (reducedMotion()) return;
  gsap.set(scrim, { autoAlpha: 0 });
  gsap.set(card, { autoAlpha: 0, y: 28 });
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.to(scrim, { autoAlpha: 1, duration: 0.28 }, 0);
  tl.to(card, { autoAlpha: 1, y: 0, duration: 0.38, clearProps: "transform" }, 0.04);
}
