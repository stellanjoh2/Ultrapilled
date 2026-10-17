import gsap from "gsap";
import {
  SHARE_MAX_BYTES,
  SHARE_TTL_DAYS,
  SHARE_TURNSTILE_ACTION,
  createShareLink,
  shareTooLargeMessage,
  utf8ByteLength,
} from "./share";
import { ensureTurnstileScript, turnstileSiteKey } from "./turnstile";
import { playCaution, playNotify, playRemove } from "./uiSounds";

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function turnstileTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "day" ? "light" : "dark";
}

function formatExpiry(expiresAt: number): string {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(expiresAt * 1000),
  );
}

export type ShareDialogPayload = {
  /** Serialized .pill JSON (already image-embedded). */
  projectJson: string;
};

/**
 * Opt-in share: confirm + Turnstile → upload → copy link.
 * Returns the public URL on success, or null if cancelled / failed.
 */
export async function askShareLink(payload: ShareDialogPayload): Promise<string | null> {
  const bytes = utf8ByteLength(payload.projectJson);
  if (bytes > SHARE_MAX_BYTES) {
    playCaution();
    await shareNotice("Scene too large", shareTooLargeMessage());
    return null;
  }

  const confirmed = await shareConfirm();
  if (!confirmed) return null;

  const result = await createShareLink(payload.projectJson, confirmed.token);
  if (!result.ok) {
    playCaution();
    await shareNotice("Couldn’t create link", result.message);
    return null;
  }

  await shareSuccess(result.url, result.expiresAt);
  return result.url;
}

function shareConfirm(): Promise<{ token: string } | null> {
  return openCard({
    title: "Share link?",
    body: `Uploads this scene for ${SHARE_TTL_DAYS} days, then deletes it. Anyone with the link can open and remake it. Nothing is uploaded unless you continue.`,
    confirmLabel: "Create link",
    cancelLabel: "Cancel",
    withTurnstile: true,
  });
}

function shareNotice(title: string, body: string): Promise<void> {
  return openCard({
    title,
    body,
    confirmLabel: "OK",
    withTurnstile: false,
  }).then(() => undefined);
}

function shareSuccess(url: string, expiresAt: number): Promise<void> {
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.className = "reconnect";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "share-success-title");
    root.innerHTML = `
      <div class="reconnect__scrim" data-share="ok"></div>
      <div class="reconnect__card">
        <h2 class="reconnect__title" id="share-success-title">Link ready</h2>
        <p class="reconnect__body">Expires ${formatExpiry(expiresAt)}. Copied to your clipboard when you tap Copy.</p>
        <input type="text" class="reconnect__input" id="share-url" readonly value="${escapeAttr(url)}" />
        <div class="reconnect__actions">
          <button type="button" class="pill" data-share="copy">Copy link</button>
          <button type="button" class="pill pill--commit" data-share="ok" autofocus>Done</button>
        </div>
      </div>
    `;

    const card = root.querySelector<HTMLElement>(".reconnect__card")!;
    const scrim = root.querySelector<HTMLElement>(".reconnect__scrim")!;
    const input = root.querySelector<HTMLInputElement>("#share-url")!;
    const content = [
      root.querySelector<HTMLElement>(".reconnect__title")!,
      root.querySelector<HTMLElement>(".reconnect__body")!,
      input,
      root.querySelector<HTMLElement>(".reconnect__actions")!,
    ];

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener("keydown", onKey);
      removeTurnstileHost();
      playNotify();
      const done = () => {
        root.remove();
        resolve();
      };
      if (reducedMotion()) {
        done();
        return;
      }
      const tl = gsap.timeline({ onComplete: done });
      tl.to(content, { autoAlpha: 0, y: 8, duration: 0.18, stagger: 0.03, ease: "power2.in" }, 0);
      tl.to(card, { autoAlpha: 0, scale: 0.94, y: 12, duration: 0.22, ease: "power2.in" }, 0.04);
      tl.to(scrim, { autoAlpha: 0, duration: 0.28, ease: "power1.in" }, 0);
    };

    const copy = async () => {
      try {
        await navigator.clipboard.writeText(url);
        playNotify();
        input.select();
      } catch {
        playCaution();
        input.focus({ preventScroll: true });
        input.select();
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish();
      }
    };

    root.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.closest<HTMLElement>("[data-share]")?.dataset.share;
      if (action === "copy") void copy();
      if (action === "ok") finish();
    });

    document.body.append(root);
    window.addEventListener("keydown", onKey);
    void copy();

    if (!reducedMotion()) {
      gsap.set(scrim, { autoAlpha: 0 });
      gsap.set(card, { autoAlpha: 0, scale: 0.94, y: 16 });
      gsap.set(content, { autoAlpha: 0, y: 10 });
      const tl = gsap.timeline();
      tl.to(scrim, { autoAlpha: 1, duration: 0.28, ease: "power1.out" }, 0);
      tl.to(card, { autoAlpha: 1, scale: 1, y: 0, duration: 0.34, ease: "power3.out" }, 0.04);
      tl.to(content, { autoAlpha: 1, y: 0, duration: 0.28, stagger: 0.04, ease: "power2.out" }, 0.1);
    }
  });
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

type CardResult = { token: string } | null;

type CardOpts = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  withTurnstile: boolean;
};

let turnstileHost: HTMLElement | null = null;
let turnstileWidgetId: string | number | null = null;
let turnstileFadeTimer: ReturnType<typeof setTimeout> | null = null;

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

async function prepareTurnstile(): Promise<void> {
  const siteKey = turnstileSiteKey();
  if (!siteKey) return;
  if (!turnstileHost) {
    turnstileHost = document.createElement("div");
    turnstileHost.id = "share-turnstile";
    turnstileHost.className = "share-turnstile";
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
      action: SHARE_TURNSTILE_ACTION,
      callback: () => fadeTurnstileHostOut(),
      "expired-callback": () => revealTurnstileHost(),
    });
    revealTurnstileHost();
  } catch {
    /* submit will surface */
  }
}

function readTurnstileToken(): string {
  if (turnstileWidgetId == null || !window.turnstile) return "";
  try {
    return window.turnstile.getResponse(turnstileWidgetId) || "";
  } catch {
    return "";
  }
}

function openCard(opts: CardOpts): Promise<CardResult> {
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.className = "reconnect";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "share-title");
    const cancel = opts.cancelLabel
      ? `<button type="button" class="pill" data-share="cancel">${opts.cancelLabel}</button>`
      : "";
    root.innerHTML = `
      <div class="reconnect__scrim"${opts.cancelLabel ? ' data-share="cancel"' : ' data-share="ok"'}></div>
      <div class="reconnect__card">
        <h2 class="reconnect__title" id="share-title">${opts.title}</h2>
        <p class="reconnect__body">${opts.body}</p>
        <div class="reconnect__actions">
          ${cancel}
          <button type="button" class="pill pill--commit" data-share="ok" autofocus>${opts.confirmLabel}</button>
        </div>
      </div>
    `;

    const card = root.querySelector<HTMLElement>(".reconnect__card")!;
    const scrim = root.querySelector<HTMLElement>(".reconnect__scrim")!;
    const content = [
      root.querySelector<HTMLElement>(".reconnect__title")!,
      root.querySelector<HTMLElement>(".reconnect__body")!,
      root.querySelector<HTMLElement>(".reconnect__actions")!,
    ];
    const okBtn = root.querySelector<HTMLButtonElement>('[data-share="ok"]')!;

    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      const token = opts.withTurnstile ? readTurnstileToken() : "";
      if (ok && opts.withTurnstile && turnstileSiteKey() && !token) {
        playCaution();
        revealTurnstileHost();
        return;
      }
      settled = true;
      window.removeEventListener("keydown", onKey);
      if (ok) playNotify();
      else playRemove();
      removeTurnstileHost();
      const done = () => {
        root.remove();
        resolve(ok ? { token } : null);
      };
      if (reducedMotion()) {
        done();
        return;
      }
      const tl = gsap.timeline({ onComplete: done });
      tl.to(content, { autoAlpha: 0, y: 8, duration: 0.18, stagger: 0.03, ease: "power2.in" }, 0);
      tl.to(card, { autoAlpha: 0, scale: 0.94, y: 12, duration: 0.22, ease: "power2.in" }, 0.04);
      tl.to(scrim, { autoAlpha: 0, duration: 0.28, ease: "power1.in" }, 0);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && opts.cancelLabel) {
        event.preventDefault();
        finish(false);
      } else if (event.key === "Escape" && !opts.cancelLabel) {
        event.preventDefault();
        finish(true);
      } else if (event.key === "Enter" && document.activeElement !== okBtn) {
        /* let button handle */
      }
    };

    root.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.closest<HTMLElement>("[data-share]")?.dataset.share;
      if (action === "cancel") finish(false);
      if (action === "ok") finish(true);
    });

    document.body.append(root);
    window.addEventListener("keydown", onKey);
    if (opts.withTurnstile) void prepareTurnstile();

    if (!reducedMotion()) {
      gsap.set(scrim, { autoAlpha: 0 });
      gsap.set(card, { autoAlpha: 0, scale: 0.94, y: 16 });
      gsap.set(content, { autoAlpha: 0, y: 10 });
      const tl = gsap.timeline();
      tl.to(scrim, { autoAlpha: 1, duration: 0.28, ease: "power1.out" }, 0);
      tl.to(card, { autoAlpha: 1, scale: 1, y: 0, duration: 0.34, ease: "power3.out" }, 0.04);
      tl.to(content, { autoAlpha: 1, y: 0, duration: 0.28, stagger: 0.04, ease: "power2.out" }, 0.1);
    }
  });
}
