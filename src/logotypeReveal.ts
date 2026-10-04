import gsap from "gsap";
import { LOGOTYPE_MARK_SVG, S_LOGOTYPE_MARK_SVG } from "./logotypeMark";

/** Left→right wipe: purple → lime → white. */
export const LOGOTYPE_REVEAL_MASK_S = 0.3;
export const LOGOTYPE_REVEAL_STAGGER_S = 0.25;
export const LOGOTYPE_REVEAL_HOLD_S = 1;
export const LOGOTYPE_REVEAL_EASE = "power2.inOut";

const HIDDEN_LEFT = "inset(0% 100% 0% 0%)";
const VISIBLE = "inset(0% 0% 0% 0%)";
const HIDDEN_RIGHT = "inset(0% 0% 0% 100%)";

type RevealLayers = {
  scaleEl: HTMLElement;
  purple: HTMLElement;
  lime: HTMLElement;
  white: HTMLElement;
};

function revealLayers(root: HTMLElement): RevealLayers | null {
  const scaleEl = root.querySelector<HTMLElement>(".logotype-reveal__scale");
  const purple = root.querySelector<HTMLElement>(".logotype-reveal__layer--purple");
  const lime = root.querySelector<HTMLElement>(".logotype-reveal__layer--lime");
  const white = root.querySelector<HTMLElement>(".logotype-reveal__layer--white");
  if (!scaleEl || !purple || !lime || !white) return null;
  return { scaleEl, purple, lime, white };
}

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function revealMarkup(markSvg: string): string {
  return `
    <div class="logotype-reveal">
      <div class="logotype-reveal__scale">
        <div class="logotype-reveal__layer logotype-reveal__layer--purple">${markSvg}</div>
        <div class="logotype-reveal__layer logotype-reveal__layer--lime">${markSvg}</div>
        <div class="logotype-reveal__layer logotype-reveal__layer--white">${markSvg}</div>
      </div>
    </div>
  `;
}

/** Three stacked wordmarks for the purple → lime → white mask. */
export function logotypeRevealMarkup(): string {
  return revealMarkup(LOGOTYPE_MARK_SVG);
}

/** Three stacked S marks for the same purple → lime → white mask. */
export function sLogotypeRevealMarkup(): string {
  return revealMarkup(S_LOGOTYPE_MARK_SVG);
}

const GITHUB_MARK_SVG = `<svg class="logotype__mark" viewBox="0 0 98 96" aria-hidden="true" focusable="false">
  <path class="logotype__glyph" d="M41.4395 69.3848C28.8066 67.8535 19.9062 58.7617 19.9062 46.9902C19.9062 42.2051 21.6289 37.0371 24.5 33.5918C23.2559 30.4336 23.4473 23.7344 24.8828 20.959C28.7109 20.4805 33.8789 22.4902 36.9414 25.2656C40.5781 24.1172 44.4062 23.543 49.0957 23.543C53.7852 23.543 57.6133 24.1172 61.0586 25.1699C64.0254 22.4902 69.2891 20.4805 73.1172 20.959C74.457 23.543 74.6484 30.2422 73.4043 33.4961C76.4668 37.1328 78.0937 42.0137 78.0937 46.9902C78.0937 58.7617 69.1934 67.6621 56.3691 69.2891C59.623 71.3945 61.8242 75.9883 61.8242 81.252L61.8242 91.2051C61.8242 94.0762 64.2168 95.7031 67.0879 94.5547C84.4102 87.9512 98 70.6289 98 49.1914C98 22.1074 75.9883 6.69539e-07 48.9043 4.309e-07C21.8203 1.92261e-07 -1.9479e-07 22.1074 -4.3343e-07 49.1914C-6.20631e-07 70.4375 13.4941 88.0469 31.6777 94.6504C34.2617 95.6074 36.75 93.8848 36.75 91.3008L36.75 83.6445C35.4102 84.2188 33.6875 84.6016 32.1562 84.6016C25.8398 84.6016 22.1074 81.1563 19.4277 74.7441C18.375 72.1602 17.2266 70.6289 15.0254 70.3418C13.877 70.2461 13.4941 69.7676 13.4941 69.1934C13.4941 68.0449 15.4082 67.1836 17.3223 67.1836C20.0977 67.1836 22.4902 68.9063 24.9785 72.4473C26.8926 75.2227 28.9023 76.4668 31.2949 76.4668C33.6875 76.4668 35.2187 75.6055 37.4199 73.4043C39.0469 71.7773 40.291 70.3418 41.4395 69.3848Z"/>
</svg>`;

/** Three stacked GitHub marks for the same purple → lime → white mask. */
export function githubRevealMarkup(): string {
  return revealMarkup(GITHUB_MARK_SVG);
}

const X_MARK_SVG = `<svg class="logotype__mark" viewBox="0 0 1200 1227" aria-hidden="true" focusable="false">
  <path class="logotype__glyph" d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"/>
</svg>`;

/** Three stacked X marks for the same purple → lime → white mask. */
export function xRevealMarkup(): string {
  return revealMarkup(X_MARK_SVG);
}

/** Resting topbar mark: white (theme) layer fully visible. */
export function settleLogotypeReveal(root: HTMLElement) {
  const layers = revealLayers(root);
  if (!layers) return;
  gsap.killTweensOf([layers.purple, layers.lime, layers.white, layers.scaleEl]);
  gsap.set([layers.purple, layers.lime], { clipPath: HIDDEN_LEFT });
  gsap.set(layers.white, { clipPath: VISIBLE });
}

export type LogotypeRevealOpts = {
  /** Hold then wipe out (intro splash). Default: reveal only. */
  maskOut?: boolean;
  holdS?: number;
  scaleFrom?: number;
  scaleTo?: number;
  scaleEase?: string;
};

/**
 * Mask the wordmark in (purple → lime → white).
 * With `maskOut`, holds then wipes out (white → lime → purple).
 */
export function playLogotypeReveal(root: HTMLElement, opts: LogotypeRevealOpts = {}): Promise<void> {
  const layers = revealLayers(root);
  if (!layers) return Promise.resolve();
  const { scaleEl, purple, lime, white } = layers;

  const maskOut = Boolean(opts.maskOut);
  const holdS = opts.holdS ?? LOGOTYPE_REVEAL_HOLD_S;
  const scaleFrom = opts.scaleFrom;
  const scaleTo = opts.scaleTo;
  const scaleEase = opts.scaleEase ?? "none";
  const revealS = LOGOTYPE_REVEAL_STAGGER_S * 2 + LOGOTYPE_REVEAL_MASK_S;
  const totalS = maskOut
    ? revealS + holdS + LOGOTYPE_REVEAL_STAGGER_S * 2 + LOGOTYPE_REVEAL_MASK_S
    : revealS;
  const whiteAt = LOGOTYPE_REVEAL_STAGGER_S * 2;

  return new Promise((resolve) => {
    gsap.set([purple, lime, white], { clipPath: HIDDEN_LEFT });
    if (scaleFrom != null) gsap.set(scaleEl, { scale: scaleFrom });

    const tl = gsap.timeline({
      onComplete: () => {
        if (maskOut) {
          gsap.set(scaleEl, { clearProps: "transform" });
          gsap.set([purple, lime, white], { clearProps: "clipPath" });
        }
        resolve();
      },
    });

    if (scaleFrom != null && scaleTo != null) {
      tl.to(scaleEl, { scale: scaleTo, duration: totalS, ease: scaleEase }, 0);
    }

    tl.to(purple, { clipPath: VISIBLE, duration: LOGOTYPE_REVEAL_MASK_S, ease: LOGOTYPE_REVEAL_EASE }, 0);
    tl.to(lime, { clipPath: VISIBLE, duration: LOGOTYPE_REVEAL_MASK_S, ease: LOGOTYPE_REVEAL_EASE }, LOGOTYPE_REVEAL_STAGGER_S);
    tl.to(white, { clipPath: VISIBLE, duration: LOGOTYPE_REVEAL_MASK_S, ease: LOGOTYPE_REVEAL_EASE }, whiteAt);

    if (!maskOut) return;

    const outAt = revealS + holdS;
    tl.to(white, { clipPath: HIDDEN_RIGHT, duration: LOGOTYPE_REVEAL_MASK_S, ease: LOGOTYPE_REVEAL_EASE }, outAt);
    tl.to(lime, { clipPath: HIDDEN_RIGHT, duration: LOGOTYPE_REVEAL_MASK_S, ease: LOGOTYPE_REVEAL_EASE }, outAt + LOGOTYPE_REVEAL_STAGGER_S);
    tl.to(purple, { clipPath: HIDDEN_RIGHT, duration: LOGOTYPE_REVEAL_MASK_S, ease: LOGOTYPE_REVEAL_EASE }, outAt + LOGOTYPE_REVEAL_STAGGER_S * 2);
  });
}

/**
 * Continuous wipe loop for the topbar mark (no hold between cycles).
 * Starts with OUT from the resting visible state so the first frame
 * never blanks, then in→out forever.
 */
export function loopLogotypeReveal(root: HTMLElement): () => void {
  const layers = revealLayers(root);
  if (!layers || reducedMotion()) return () => settleLogotypeReveal(root);
  const { purple, lime, white } = layers;

  gsap.killTweensOf([purple, lime, white]);
  // Resting mark is already showing — stack all layers visible so the first
  // OUT wipe has purple/lime underneath (no 1-frame blank).
  gsap.set([purple, lime, white], { clipPath: VISIBLE });

  const wave = LOGOTYPE_REVEAL_STAGGER_S * 2 + LOGOTYPE_REVEAL_MASK_S;
  const tl = gsap.timeline({ repeat: -1 });

  // OUT first (white → lime → purple).
  tl.to(white, { clipPath: HIDDEN_RIGHT, duration: LOGOTYPE_REVEAL_MASK_S, ease: LOGOTYPE_REVEAL_EASE }, 0);
  tl.to(lime, { clipPath: HIDDEN_RIGHT, duration: LOGOTYPE_REVEAL_MASK_S, ease: LOGOTYPE_REVEAL_EASE }, LOGOTYPE_REVEAL_STAGGER_S);
  tl.to(purple, { clipPath: HIDDEN_RIGHT, duration: LOGOTYPE_REVEAL_MASK_S, ease: LOGOTYPE_REVEAL_EASE }, LOGOTYPE_REVEAL_STAGGER_S * 2);
  tl.set([purple, lime, white], { clipPath: HIDDEN_LEFT });

  // IN (purple → lime → white), then repeat resumes with OUT.
  tl.to(purple, { clipPath: VISIBLE, duration: LOGOTYPE_REVEAL_MASK_S, ease: LOGOTYPE_REVEAL_EASE }, wave);
  tl.to(lime, { clipPath: VISIBLE, duration: LOGOTYPE_REVEAL_MASK_S, ease: LOGOTYPE_REVEAL_EASE }, wave + LOGOTYPE_REVEAL_STAGGER_S);
  tl.to(white, { clipPath: VISIBLE, duration: LOGOTYPE_REVEAL_MASK_S, ease: LOGOTYPE_REVEAL_EASE }, wave + LOGOTYPE_REVEAL_STAGGER_S * 2);

  return () => {
    tl.kill();
    settleLogotypeReveal(root);
  };
}
