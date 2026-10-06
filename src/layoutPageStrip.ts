import minus from "@phosphor-icons/core/assets/regular/minus.svg?raw";
import plus from "@phosphor-icons/core/assets/regular/plus.svg?raw";
import presentation from "@phosphor-icons/core/assets/regular/presentation.svg?raw";
import speakerHigh from "@phosphor-icons/core/assets/regular/speaker-high.svg?raw";
import speakerSlash from "@phosphor-icons/core/assets/regular/speaker-slash.svg?raw";
import { LAYOUT_PAGE_MAX } from "./layoutPages";

export type LayoutPageStripHost = {
  layoutMode(): boolean;
  presenting(): boolean;
  soundMuted(): boolean;
  count(): number;
  index(): number;
  select(index: number): void;
  add(): void;
  remove(): void;
  present(): void;
  toggleSound(): void;
  peekThumb?(index: number): string | null;
  loadThumb?(index: number): Promise<string | null>;
};

function ensureParts(root: HTMLElement) {
  if (root.querySelector(".page-strip__tools")) return;
  root.innerHTML = `
    <div class="page-strip__tools"></div>
    <div class="page-strip__frames" role="list"></div>
    <div class="page-strip__preview" hidden>
      <img alt="" />
    </div>
  `;
}

function hidePreview(root: HTMLElement) {
  const preview = root.querySelector<HTMLElement>(".page-strip__preview");
  if (!preview) return;
  preview.hidden = true;
  preview.style.transform = "";
  delete preview.dataset.pageIndex;
}

function placePreview(root: HTMLElement, btn: HTMLElement, src: string) {
  const preview = root.querySelector<HTMLElement>(".page-strip__preview");
  const img = preview?.querySelector("img");
  if (!preview || !img) return;
  preview.hidden = false;
  preview.dataset.pageIndex = btn.dataset.pageIndex ?? "";
  if (img.src !== src) img.src = src;
  const layout = () => {
    if (preview.hidden || preview.dataset.pageIndex !== btn.dataset.pageIndex) return;
    const rect = btn.getBoundingClientRect();
    const tw = preview.offsetWidth;
    const th = preview.offsetHeight;
    let left = rect.left + rect.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    let top = rect.top - th - 10;
    if (top < 8) top = rect.bottom + 10;
    preview.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  };
  if (!img.complete) img.addEventListener("load", layout, { once: true });
  layout();
}

export function mountLayoutPageStrip(root: HTMLElement, host: LayoutPageStripHost) {
  let hoverGen = 0;

  root.addEventListener("click", (event) => {
    const btn = (event.target as HTMLElement | null)?.closest("button");
    if (!btn || !root.contains(btn) || btn.disabled) return;
    hidePreview(root);
    if (btn.dataset.pagePresent != null) {
      host.present();
      return;
    }
    if (btn.dataset.pageSound != null) {
      host.toggleSound();
      return;
    }
    if (btn.dataset.pageAdd != null) {
      host.add();
      return;
    }
    if (btn.dataset.pageRemove != null) {
      host.remove();
      return;
    }
    const index = Number(btn.dataset.pageIndex);
    if (Number.isFinite(index)) host.select(index);
  });

  root.addEventListener("pointerover", (event) => {
    const btn = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-page-index]");
    if (!btn || !root.contains(btn) || !host.peekThumb) return;
    const index = Number(btn.dataset.pageIndex);
    if (!Number.isFinite(index)) return;
    const gen = ++hoverGen;
    const cached = host.peekThumb(index);
    if (cached) placePreview(root, btn, cached);
    void host.loadThumb?.(index).then((src) => {
      if (gen !== hoverGen || !src) return;
      if (!btn.isConnected) return;
      placePreview(root, btn, src);
    });
  });

  root.addEventListener("pointerout", (event) => {
    const btn = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-page-index]");
    if (!btn || !root.contains(btn)) return;
    const next = event.relatedTarget;
    if (next instanceof Node && btn.contains(next)) return;
    hoverGen += 1;
    hidePreview(root);
  });

  window.addEventListener("scroll", () => hidePreview(root), true);
  window.addEventListener("resize", () => hidePreview(root));
}

export function paintLayoutPageStrip(root: HTMLElement, host: LayoutPageStripHost) {
  const on = host.layoutMode();
  const presenting = host.presenting();
  const muted = host.soundMuted();
  const count = Math.max(1, host.count());
  const index = host.index();
  const sig = `${on ? 1 : 0}:${presenting ? 1 : 0}:${muted ? 1 : 0}:${count}:${index}`;
  root.hidden = !on;
  root.classList.toggle("is-presenting", presenting);
  if (!on) {
    if (root.dataset.sig === sig) return;
    root.dataset.sig = sig;
    root.replaceChildren();
    return;
  }
  ensureParts(root);
  if (root.dataset.sig === sig && root.querySelector("[data-page-index]")) return;
  root.dataset.sig = sig;
  hidePreview(root);

  const frames = Array.from({ length: count }, (_, i) => {
    const current = i === index;
    return `<button type="button" class="page-strip__frame icon-hover${current ? " is-on" : ""}" data-page-index="${i}" aria-pressed="${current}" aria-label="Page ${i + 1}"><span>${i + 1}</span></button>`;
  }).join("");

  const tools = root.querySelector(".page-strip__tools");
  const list = root.querySelector(".page-strip__frames");
  if (!tools || !list) return;
  tools.innerHTML = `
    <button type="button" class="page-strip__icon icon-hover${presenting ? " is-on" : ""}" data-page-present aria-pressed="${presenting}" data-tip="${presenting ? "Exit presentation — Esc" : "Presentation mode"}" aria-label="${presenting ? "Exit presentation" : "Presentation mode"}">
      <span aria-hidden="true">${presentation}</span>
    </button>
    ${
      presenting
        ? `<button type="button" class="page-strip__icon icon-hover" data-page-sound aria-pressed="${muted}" data-tip="${muted ? "Unmute UI sounds" : "Mute UI sounds"}" aria-label="${muted ? "Unmute UI sounds" : "Mute UI sounds"}">
      <span aria-hidden="true">${muted ? speakerSlash : speakerHigh}</span>
    </button>`
        : `<button type="button" class="page-strip__icon icon-hover" data-page-add ${count >= LAYOUT_PAGE_MAX ? "disabled" : ""} data-tip="Duplicate this page" aria-label="Add page">
      <span aria-hidden="true">${plus}</span>
    </button>
    <button type="button" class="page-strip__icon icon-hover" data-page-remove ${count < 2 ? "disabled" : ""} data-tip="Remove this page" aria-label="Remove page">
      <span aria-hidden="true">${minus}</span>
    </button>`
    }
  `;
  list.innerHTML = frames;
}
