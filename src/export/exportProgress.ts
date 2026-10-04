import gsap from "gsap";

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let root: HTMLElement | null = null;
let countEl: HTMLElement | null = null;
let onCancel: (() => void) | null = null;

function onKey(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  event.preventDefault();
  event.stopImmediatePropagation();
  onCancel?.();
}

function lockApp(on: boolean) {
  document.body.classList.toggle("is-exporting", on);
  const app = document.querySelector(".app");
  if (on) app?.setAttribute("inert", "");
  else app?.removeAttribute("inert");
}

function noteHtml(toFolder: boolean): string {
  const wait =
    "This encode runs in the tab. If the browser says the page isn’t responding, click Wait.";
  const frames = toFolder
    ? "Frames are writing into the folder you chose. If the tab dies, run .PNG sequence again."
    : "If the tab dies, use .PNG sequence. Frame by frame, the reliable path.";
  const estimate =
    "The fall follows your layer stack, same hierarchy each trigger. Settle timing can still shift a little, so we can’t say exactly how many frames it’ll be, but they’ll be done soon.";
  return `<p class="export-progress__note">${wait} ${frames}</p><p class="export-progress__note">${estimate}</p>`;
}

export function setExportFrame(frame: number) {
  if (!countEl) return;
  const text = String(Math.max(0, Math.floor(frame)));
  if (countEl.textContent === text) return;
  countEl.textContent = text;
}

export function openExportProgress(cancel: () => void, opts?: { toFolder?: boolean }) {
  closeExportProgress(true);
  onCancel = cancel;

  const node = document.createElement("div");
  node.className = "export-progress";
  node.setAttribute("role", "dialog");
  node.setAttribute("aria-modal", "true");
  node.setAttribute("aria-labelledby", "export-progress-title");
  node.innerHTML = `
    <div class="export-progress__scrim"></div>
    <div class="export-progress__stack">
      <div class="export-progress__card">
        <h2 class="export-progress__title" id="export-progress-title">Rendering frame:</h2>
        <p class="export-progress__n" aria-live="polite">0</p>
        <button type="button" class="pill export-progress__cancel">Cancel Export</button>
      </div>
      ${noteHtml(Boolean(opts?.toFolder))}
    </div>
  `;

  const stack = node.querySelector<HTMLElement>(".export-progress__stack")!;
  const card = node.querySelector<HTMLElement>(".export-progress__card")!;
  const scrim = node.querySelector<HTMLElement>(".export-progress__scrim")!;
  const title = node.querySelector<HTMLElement>(".export-progress__title")!;
  const count = node.querySelector<HTMLElement>(".export-progress__n")!;
  const notes = [...node.querySelectorAll<HTMLElement>(".export-progress__note")];
  const button = node.querySelector<HTMLButtonElement>(".export-progress__cancel")!;
  button.addEventListener("click", () => onCancel?.());

  root = node;
  countEl = count;
  document.body.append(node);
  lockApp(true);
  window.addEventListener("keydown", onKey, true);
  button.focus({ preventScroll: true });

  const content = [title, count, button, ...notes];
  gsap.set(scrim, { autoAlpha: 0 });
  gsap.set(card, { autoAlpha: 0, scale: 0.92, y: 28 });
  gsap.set(content, { autoAlpha: 0, y: 14 });
  if (reducedMotion()) {
    gsap.set([scrim, stack, card, ...content], { clearProps: "all", autoAlpha: 1 });
    return;
  }
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.to(scrim, { autoAlpha: 1, duration: 0.35 }, 0);
  tl.to(card, { autoAlpha: 1, scale: 1, y: 0, duration: 0.48 }, 0.06);
  tl.to(content, { autoAlpha: 1, y: 0, duration: 0.36, stagger: 0.055 }, 0.16);
}

export function closeExportProgress(immediate = false) {
  const node = root;
  window.removeEventListener("keydown", onKey, true);
  onCancel = null;
  countEl = null;
  root = null;
  if (!node) {
    lockApp(false);
    return;
  }
  gsap.killTweensOf(node.querySelectorAll("*"));
  gsap.killTweensOf(node);

  const done = () => {
    node.remove();
    lockApp(false);
  };

  if (immediate || reducedMotion()) {
    done();
    return;
  }

  const card = node.querySelector<HTMLElement>(".export-progress__card");
  const scrim = node.querySelector<HTMLElement>(".export-progress__scrim");
  const content = node.querySelectorAll<HTMLElement>(
    ".export-progress__title, .export-progress__n, .export-progress__cancel, .export-progress__note",
  );
  const tl = gsap.timeline({ onComplete: done });
  if (content.length) {
    tl.to(content, { autoAlpha: 0, y: 8, duration: 0.18, stagger: 0.03, ease: "power2.in" }, 0);
  }
  if (card) {
    tl.to(card, { autoAlpha: 0, scale: 0.94, y: 12, duration: 0.22, ease: "power2.in" }, 0.04);
  }
  if (scrim) tl.to(scrim, { autoAlpha: 0, duration: 0.28, ease: "power1.in" }, 0);
}
