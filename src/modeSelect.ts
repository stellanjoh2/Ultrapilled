import gsap from "gsap";
import { backgroundPaint } from "./background";
import { createPlaySession } from "./playSession";
import { modeSelectPreviewState } from "./modeSelectTheme";
import { LOGOTYPE_MARK_SVG } from "./logotypeMark";
import { DEFAULT_THEME } from "./theme";
import { playClick, playNotify } from "./uiSounds";
import { createWorld } from "./world";

export type AppMode = "physics" | "layout";

const PHYSICS_SRC = "/media/Mode-Select-Physics.mp4";
const LAYOUT_SRC = "/media/Mode-Select-Static.webp";
/** Orby Lime accent on "Choose your vibe." */
const VIBE_ACCENT = DEFAULT_THEME[1];

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
 * Build the headline so "Choose your vibe." is a solid Orby Lime accent,
 * with the remaining copy still word-split for the fade-up stagger.
 */
function fillHeadline(el: HTMLElement) {
  el.replaceChildren();
  const vibe = document.createElement("span");
  vibe.className = "mode-select__word mode-select__vibe";
  vibe.textContent = "Choose your vibe.";
  vibe.style.color = VIBE_ACCENT;

  const rest = document.createElement("span");
  rest.className = "mode-select__rest";
  appendWords(rest, ["Completely"]);
  rest.append(document.createElement("br"));
  appendWords(rest, ["unusable", "but", "very", "fun,", "or", "calm"]);
  rest.append(document.createElement("br"));
  appendWords(rest, ["and", "composed", "and", "fun:"]);

  el.append(vibe, document.createTextNode(" "), rest);
}

function paintPreviewBackdrop(stage: HTMLElement, playfield: HTMLElement, state: ReturnType<typeof modeSelectPreviewState>) {
  const paint = backgroundPaint(state.background, state.canvas, state.stageColor);
  stage.style.background = state.stageColor;
  playfield.style.backgroundColor = paint.color;
  playfield.style.backgroundImage = paint.image;
  playfield.style.backgroundSize = paint.size;
  playfield.style.backgroundPosition = paint.position;
  playfield.style.backgroundRepeat = paint.repeat;
}

let hostEl: HTMLElement | null = null;
let previewCleanup: (() => void) | null = null;

function ensureHost(): HTMLElement {
  if (hostEl) return hostEl;
  const host = document.createElement("div");
  host.className = "mode-select-host";
  document.body.append(host);
  hostEl = host;
  return host;
}

/** Silent looping physics behind intro + mode gate. Idempotent. */
export function warmModeSelectPreview() {
  if (previewCleanup || reducedMotion()) return;

  const host = ensureHost();
  const wrap = document.createElement("div");
  wrap.className = "mode-select-preview";
  wrap.setAttribute("aria-hidden", "true");
  wrap.innerHTML = `
    <div class="stage mode-select-preview__stage">
      <div class="playfield mode-select-preview__playfield">
        <div class="pile">
          <div class="chip-layer"></div>
          <div class="bloom-layer" aria-hidden="true">
            <div class="bloom-blur">
              <div class="bloom-inner"></div>
            </div>
          </div>
          <div class="chip-chrome-layer" aria-hidden="true"></div>
        </div>
      </div>
    </div>
  `;
  host.prepend(wrap);

  const state = modeSelectPreviewState();
  const stage = wrap.querySelector<HTMLElement>(".mode-select-preview__stage")!;
  const playfield = wrap.querySelector<HTMLElement>(".mode-select-preview__playfield")!;
  paintPreviewBackdrop(stage, playfield, state);

  playfield.style.left = "0";
  playfield.style.top = "0";
  playfield.style.width = "100%";
  playfield.style.height = "100%";

  const world = createWorld();
  // Empty listener skips speaker playback (export path); preview stays silent.
  world.setImpactListener(() => {});

  let alive = true;
  let running = false;
  let posePinned = false;

  const session = createPlaySession({
    world,
    getState: () => state,
    stage,
    playfield,
    fitScale: () => {
      world.setSimulationScale(1);
      return state.masterScale;
    },
    syncCanvas: () => {
      paintPreviewBackdrop(stage, playfield, state);
      return false;
    },
    ensureAssets: async () => {
      const textSlots = state.slots.filter((slot) => slot.kind === "text");
      await Promise.all(
        textSlots.map((slot) =>
          document.fonts.load(`${slot.fontWeight} 28px "${slot.fontFamily}"`, slot.text || " ").catch(() => undefined),
        ),
      );
    },
    scheduleDraft: () => {},
    dismissWelcome: () => {},
    paintWelcome: () => {},
    paintTransport: () => {},
    paintPhysDebug: () => {},
    tickAudioReact: () => {},
    nudgeEmptyScene: () => {},
    notifyLayoutModeBlocksPhysics: async () => {},
    playButton: () => {},
    getRunning: () => running,
    setRunningFlag: (on) => {
      running = on;
    },
    getPaused: () => false,
    setPaused: () => {},
    getRepeat: () => true,
    getPosePinned: () => posePinned,
    setPosePinned: (on) => {
      posePinned = on;
    },
    shouldContinue: () => alive,
  });

  const onResize = () => {
    if (!alive || world.chipCount() === 0) return;
    const w = playfield.clientWidth;
    const h = playfield.clientHeight;
    if (w < 8 || h < 8) return;
    world.resize(w, h);
  };
  window.addEventListener("resize", onResize);

  requestAnimationFrame(session.frame);
  session.setRunning(true);

  previewCleanup = () => {
    alive = false;
    window.removeEventListener("resize", onResize);
    session.setRunning(false);
    world.destroy();
    hostEl?.remove();
    hostEl = null;
    previewCleanup = null;
  };
}

/** Tear down the early preview (call when revealing the real app UI). */
export function stopModeSelectPreview() {
  previewCleanup?.();
  if (hostEl) {
    hostEl.remove();
    hostEl = null;
  }
}

/** First-run mode gate. Resolves with the chosen mode after the overlay exits. */
export function askModeSelect(): Promise<AppMode> {
  return new Promise((resolve) => {
    warmModeSelectPreview();
    const host = ensureHost();
    host.classList.add("is-gate");

    const root = document.createElement("div");
    root.className = "mode-select";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "mode-select-title");
    root.innerHTML = `
      <div class="mode-select__mark logotype" aria-hidden="true">${LOGOTYPE_MARK_SVG}</div>
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

    const mark = root.querySelector<HTMLElement>(".mode-select__mark")!;
    const headline = root.querySelector<HTMLElement>(".mode-select__headline")!;
    fillHeadline(headline);
    const words = [...headline.querySelectorAll<HTMLElement>(".mode-select__word")];
    const cards = [...root.querySelectorAll<HTMLButtonElement>(".mode-select__card")];
    const foot = root.querySelector<HTMLElement>(".mode-select__foot")!;
    const video = root.querySelector<HTMLVideoElement>(".mode-select__video");
    const ink = [mark, headline, ...root.querySelectorAll<HTMLElement>(".mode-select__name, .mode-select__desc")];

    let settled = false;
    const finish = (mode: AppMode) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("keydown", onKey);
      playNotify();

      const done = () => {
        video?.pause();
        root.remove();
        host.classList.remove("is-gate");
        resolve(mode);
      };

      if (reducedMotion()) {
        done();
        return;
      }

      // Fade UI only — never opacity on a parent shared with the preview (breaks difference).
      const tl = gsap.timeline({ onComplete: done });
      tl.to([mark, headline, ...cards, foot], {
        autoAlpha: 0,
        y: 10,
        duration: 0.22,
        stagger: 0.04,
        ease: "power2.in",
      }, 0);
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

    host.append(root);
    window.addEventListener("keydown", onKey);
    cards[0]?.focus({ preventScroll: true });

    void video?.play().catch(() => {});

    // Animate pieces — clear opacity/transform after so mix-blend-mode can reach the preview.
    const clearBlend = "opacity,visibility,transform";
    gsap.set([mark, ...words, ...cards, foot], { autoAlpha: 0, y: 22 });

    if (reducedMotion()) {
      gsap.set([mark, ...words, ...cards, foot], { clearProps: "all", autoAlpha: 1, y: 0 });
      return;
    }

    const reveal = { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.06, clearProps: clearBlend };
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.to(mark, { autoAlpha: 1, y: 0, duration: 0.45, clearProps: clearBlend }, 0);
    tl.to(words, reveal, 0.08);
    tl.to(cards, reveal, ">");
    tl.to(foot, { autoAlpha: 1, y: 0, duration: 0.4, clearProps: clearBlend }, "<0.1");
    // Ensure ink nodes are fully clear of GSAP opacity after the timeline.
    tl.add(() => {
      gsap.set(ink, { clearProps: clearBlend });
    });
  });
}
