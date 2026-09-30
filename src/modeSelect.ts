import gsap from "gsap";
import { styleBareTextCss } from "./chipDomPaint";
import { DEFAULT_GRADIENT_ANGLE } from "./pillFill";
import { DEFAULT_THEME } from "./theme";
import { playClick, playNotify } from "./uiSounds";

export type AppMode = "physics" | "layout";

const PHYSICS_SRC = "/media/Mode-Select-Physics.mp4";
const LAYOUT_SRC = "/media/Mode-Select-Static.webp";
/** Orby Lime → White — same sweep as in-app animated text gradients. */
const VIBE_FROM = DEFAULT_THEME[1];
const VIBE_TO = DEFAULT_THEME[0];

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function appendWords(parent: HTMLElement, words: string[]) {
  words.forEach((word, index) => {
    const span = document.createElement("span");
    span.className = "mode-select__word";
    span.textContent = word;
    parent.append(span);
    if (index < words.length - 1) parent.append(document.createTextNode(" "));
  });
}

/**
 * Build the headline so "Choose your vibe." is one continuous gradient host,
 * with the remaining copy still word-split for the fade-up stagger.
 */
function fillHeadline(el: HTMLElement) {
  el.replaceChildren();
  const vibe = document.createElement("span");
  vibe.className = "mode-select__word mode-select__vibe";
  vibe.textContent = "Choose your vibe.";
  el.append(vibe, document.createTextNode(" "));
  appendWords(el, ["Wild", "and"]);
  el.append(document.createElement("br"));
  appendWords(el, ["wobbly,", "or", "calm", "and", "composed."]);
}

/** First-run mode gate. Resolves with the chosen mode after the overlay exits. */
export function askModeSelect(): Promise<AppMode> {
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.className = "mode-select";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "mode-select-title");
    root.innerHTML = `
      <p class="mode-select__mark logotype" aria-hidden="true">Ultrapilled</p>
      <div class="mode-select__upper" aria-hidden="true"></div>
      <div class="mode-select__inner">
        <h1 class="mode-select__headline" id="mode-select-title"></h1>
        <div class="mode-select__row">
          <button type="button" class="mode-select__card" data-mode="physics">
            <span class="mode-select__media">
              <span class="mode-select__stroke" aria-hidden="true"></span>
              <video
                class="mode-select__video"
                src="${PHYSICS_SRC}"
                muted
                loop
                playsinline
                preload="auto"
                aria-hidden="true"
              ></video>
            </span>
            <span class="mode-select__name">Physics</span>
            <span class="mode-select__desc">Create your design, then watch the chaos unfold.</span>
          </button>
          <button type="button" class="mode-select__card" data-mode="layout">
            <span class="mode-select__media">
              <span class="mode-select__stroke" aria-hidden="true"></span>
              <img
                class="mode-select__image"
                src="${LAYOUT_SRC}"
                alt=""
                draggable="false"
              />
            </span>
            <span class="mode-select__name">Layout</span>
            <span class="mode-select__desc">Place freely — no physics, pieces can overlap.</span>
          </button>
        </div>
      </div>
      <div class="mode-select__lower">
        <p class="mode-select__foot">
          Ultrapilled is a free physics playground for dropping text, icons, and images into motion. We don’t track you, and we don’t use anything you upload to train AI — your files stay on your device.
        </p>
      </div>
    `;

    const headline = root.querySelector<HTMLElement>(".mode-select__headline")!;
    fillHeadline(headline);
    const vibe = headline.querySelector<HTMLElement>(".mode-select__vibe")!;
    styleBareTextCss(vibe, VIBE_FROM, VIBE_TO, DEFAULT_GRADIENT_ANGLE, undefined, true);
    const words = [...headline.querySelectorAll<HTMLElement>(".mode-select__word")];
    const cards = [...root.querySelectorAll<HTMLButtonElement>(".mode-select__card")];
    const video = root.querySelector<HTMLVideoElement>(".mode-select__video");

    let settled = false;
    const finish = (mode: AppMode) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("keydown", onKey);
      playNotify();

      const done = () => {
        video?.pause();
        root.remove();
        resolve(mode);
      };

      if (reducedMotion()) {
        done();
        return;
      }

      const tl = gsap.timeline({ onComplete: done });
      tl.to([headline, ...cards], {
        autoAlpha: 0,
        y: 10,
        duration: 0.22,
        stagger: 0.04,
        ease: "power2.in",
      }, 0);
      tl.to(root, { autoAlpha: 0, duration: 0.28, ease: "power1.in" }, 0.06);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const i = cards.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === "ArrowLeft"
          ? (i <= 0 ? cards.length - 1 : i - 1)
          : (i < 0 || i >= cards.length - 1 ? 0 : i + 1);
        cards[next]?.focus({ preventScroll: true });
      } else if (event.key === "Enter" && !event.isComposing) {
        const active = document.activeElement;
        if (active instanceof HTMLButtonElement && active.dataset.mode) {
          event.preventDefault();
          finish(active.dataset.mode as AppMode);
        }
      }
    };

    root.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const card = target.closest<HTMLButtonElement>("[data-mode]");
      if (!card?.dataset.mode) return;
      playClick();
      finish(card.dataset.mode as AppMode);
    });

    document.body.append(root);
    window.addEventListener("keydown", onKey);
    cards[0]?.focus({ preventScroll: true });

    void video?.play().catch(() => {});

    gsap.set(root, { autoAlpha: 0 });
    gsap.set(words, { autoAlpha: 0, y: 22 });
    gsap.set(cards, { autoAlpha: 0, y: 22 });

    if (reducedMotion()) {
      gsap.set([root, ...words, ...cards], { clearProps: "all", autoAlpha: 1, y: 0 });
      return;
    }

    const reveal = { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.06 };
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.to(root, { autoAlpha: 1, duration: 0.35 }, 0);
    tl.to(words, reveal, 0.08);
    // Drop GSAP transform so CSS hover scale isn’t fighting an inline matrix.
    tl.to(cards, { ...reveal, clearProps: "transform" }, ">");
  });
}
