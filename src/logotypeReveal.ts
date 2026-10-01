import gsap from "gsap";
import { LOGOTYPE_MARK_SVG } from "./logotypeMark";

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

/** Three stacked wordmarks for the purple → lime → white mask. */
export function logotypeRevealMarkup(): string {
  return `
    <div class="logotype-reveal">
      <div class="logotype-reveal__scale">
        <div class="logotype-reveal__layer logotype-reveal__layer--purple">${LOGOTYPE_MARK_SVG}</div>
        <div class="logotype-reveal__layer logotype-reveal__layer--lime">${LOGOTYPE_MARK_SVG}</div>
        <div class="logotype-reveal__layer logotype-reveal__layer--white">${LOGOTYPE_MARK_SVG}</div>
      </div>
    </div>
  `;
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
