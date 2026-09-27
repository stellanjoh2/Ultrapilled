import gsap from "gsap";
import { playCaution, playNotify, playRemove } from "./uiSounds";

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function openDialog(opts: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.className = "reconnect";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "confirm-title");
    root.setAttribute("aria-describedby", "confirm-body");
    const cancel = opts.cancelLabel
      ? `<button type="button" class="pill" data-confirm="cancel">${opts.cancelLabel}</button>`
      : "";
    root.innerHTML = `
      <div class="reconnect__scrim" data-confirm="cancel"></div>
      <div class="reconnect__card">
        <h2 class="reconnect__title" id="confirm-title">${opts.title}</h2>
        <p class="reconnect__body" id="confirm-body">${opts.body}</p>
        <div class="reconnect__actions">
          ${cancel}
          <button type="button" class="pill is-on" data-confirm="ok" autofocus>${opts.confirmLabel}</button>
        </div>
      </div>
    `;

    const card = root.querySelector<HTMLElement>(".reconnect__card")!;
    const scrim = root.querySelector<HTMLElement>(".reconnect__scrim")!;
    const title = root.querySelector<HTMLElement>(".reconnect__title")!;
    const body = root.querySelector<HTMLElement>(".reconnect__body")!;
    const actions = root.querySelector<HTMLElement>(".reconnect__actions")!;
    const okBtn = root.querySelector<HTMLButtonElement>('[data-confirm="ok"]')!;
    const content = [title, body, actions];
    const canCancel = Boolean(opts.cancelLabel);

    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("keydown", onKey);
      if (ok) playNotify();
      else playRemove();

      const done = () => {
        root.remove();
        resolve(ok);
      };

      if (reducedMotion()) {
        done();
        return;
      }

      const tl = gsap.timeline({ onComplete: done });
      tl.to(content, {
        autoAlpha: 0,
        y: 8,
        duration: 0.18,
        stagger: 0.03,
        ease: "power2.in",
      }, 0);
      tl.to(card, {
        autoAlpha: 0,
        scale: 0.94,
        y: 12,
        duration: 0.22,
        ease: "power2.in",
      }, 0.04);
      tl.to(scrim, { autoAlpha: 0, duration: 0.28, ease: "power1.in" }, 0);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish(canCancel ? false : true);
      } else if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault();
        finish(true);
      }
    };

    root.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.closest<HTMLElement>("[data-confirm]")?.dataset.confirm;
      if (action === "ok") finish(true);
      else if (action === "cancel") finish(canCancel ? false : true);
    });

    document.body.append(root);
    window.addEventListener("keydown", onKey);
    playCaution();
    okBtn.focus({ preventScroll: true });

    gsap.set(scrim, { autoAlpha: 0 });
    gsap.set(card, { autoAlpha: 0, scale: 0.92, y: 28 });
    gsap.set(content, { autoAlpha: 0, y: 14 });

    if (reducedMotion()) {
      gsap.set([scrim, card, ...content], { clearProps: "all", autoAlpha: 1 });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.to(scrim, { autoAlpha: 1, duration: 0.35 }, 0);
    tl.to(card, { autoAlpha: 1, scale: 1, y: 0, duration: 0.48 }, 0.06);
    tl.to(content, {
      autoAlpha: 1,
      y: 0,
      duration: 0.36,
      stagger: 0.055,
    }, 0.16);
  });
}

/** Branded confirm. Resolves true on confirm, false on cancel / Escape / scrim. */
export function askConfirm(opts: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
}): Promise<boolean> {
  return openDialog(opts);
}

/** Branded notice. Resolves when dismissed. */
export function askNotice(opts: {
  title: string;
  body: string;
  confirmLabel?: string;
}): Promise<void> {
  return openDialog({
    title: opts.title,
    body: opts.body,
    confirmLabel: opts.confirmLabel ?? "Got it",
  }).then(() => undefined);
}
