import gsap from "gsap";
import atomIcon from "@phosphor-icons/core/assets/regular/atom.svg?raw";
import gridFourIcon from "@phosphor-icons/core/assets/regular/grid-four.svg?raw";
import { backgroundPaint } from "./background";
import { createPlaySession } from "./playSession";
import { modeSelectPreviewState } from "./modeSelectTheme";
import { logotypeRevealMarkup, playLogotypeReveal, settleLogotypeReveal } from "./logotypeReveal";
import { DEFAULT_THEME } from "./theme";
import warningCircleIcon from "@phosphor-icons/core/assets/regular/warning-circle.svg?raw";
import { isBugReportOpen, openBugReport } from "./bugReport";
import { playClick, playNotify } from "./uiSounds";
import { createWorld } from "./world";

export type AppMode = "physics" | "layout";

const PHYSICS_SRC = "/media/Mode-Select-Physics.mp4";
const LAYOUT_SRC = "/media/Mode-Select-Static.webp";
/** Orby Lime accent on "Choose your vibe:" */
const VIBE_ACCENT = DEFAULT_THEME[1];

/** Keep preloaded media alive so the browser doesn't drop the cache entry. */
let modeSelectVideoWarm: HTMLVideoElement | null = null;
let modeSelectImageWarm: HTMLImageElement | null = null;

/** Start fetching Mode Select thumbs ASAP (idempotent). */
export function preloadModeSelectMedia() {
  if (modeSelectImageWarm && modeSelectVideoWarm) return;

  if (!modeSelectImageWarm) {
    const img = new Image();
    img.decoding = "async";
    img.src = LAYOUT_SRC;
    modeSelectImageWarm = img;
  }

  if (!modeSelectVideoWarm) {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.src = PHYSICS_SRC;
    video.load();
    modeSelectVideoWarm = video;
  }
}

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
 * Build the headline so "Choose your vibe:" is a solid Orby Lime accent,
 * with the remaining copy still word-split for the fade-up stagger.
 */
function fillHeadline(el: HTMLElement) {
  el.replaceChildren();
  const vibe = document.createElement("span");
  vibe.className = "mode-select__word mode-select__vibe";
  vibe.textContent = "Choose your vibe:";
  vibe.style.color = VIBE_ACCENT;

  const rest = document.createElement("span");
  rest.className = "mode-select__rest";
  appendWords(rest, ["Completely"]);
  rest.append(document.createElement("br"));
  appendWords(rest, ["unusable", "but", "very", "fun,", "or", "calm"]);
  rest.append(document.createElement("br"));
  appendWords(rest, ["and", "composed", "and", "fun."]);

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
/** Live preview world/session — used to open the floor on Mode Select exit. */
let previewWorld: ReturnType<typeof createWorld> | null = null;
let previewSession: ReturnType<typeof createPlaySession> | null = null;
let previewPosePinned = false;
let previewRepeat = true;
let previewRunning = false;

/** Cap how long we wait for chips to fall off before forcing teardown. */
const EXIT_DUMP_MAX_MS = 2800;

function ensureHost(): HTMLElement {
  if (hostEl) return hostEl;
  const host = document.createElement("div");
  host.className = "mode-select-host";
  document.body.append(host);
  hostEl = host;
  return host;
}

function clearPreviewHandles() {
  previewWorld = null;
  previewSession = null;
  previewPosePinned = false;
  previewRepeat = true;
  previewRunning = false;
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
  previewRunning = false;
  previewPosePinned = false;
  previewRepeat = true;

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
    notifyLayoutModeBlocksPhysics: async () => false,
    playButton: () => {},
    getRunning: () => previewRunning,
    setRunningFlag: (on) => {
      previewRunning = on;
    },
    getPaused: () => false,
    setPaused: () => {},
    getRepeat: () => previewRepeat,
    getPosePinned: () => previewPosePinned,
    setPosePinned: (on) => {
      previewPosePinned = on;
    },
    shouldContinue: () => alive,
  });

  previewWorld = world;
  previewSession = session;

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
    clearPreviewHandles();
    hostEl?.remove();
    hostEl = null;
    previewCleanup = null;
  };
}

/**
 * Open the floor so the preview pile dumps out (same as Clear canvas).
 * Safe if already dumping — just stops the loop from respawning.
 */
export function beginModeSelectExitDump() {
  const world = previewWorld;
  const session = previewSession;
  if (!world || !session || reducedMotion()) return;

  previewRepeat = false;
  previewPosePinned = false;
  session.clearingDump = true;
  session.dropTicket++;
  if (!previewRunning) {
    previewRunning = true;
    world.setRunning(true);
  }
  // Wakes a frozen hold pile; no-op if the floor is already open mid-loop.
  world.setFloorOpen(true);
  session.phase = "dumping";
}

/** Tear down the early preview immediately. */
export function stopModeSelectPreview() {
  previewCleanup?.();
  if (hostEl) {
    hostEl.remove();
    hostEl = null;
  }
  clearPreviewHandles();
}

/**
 * Keep the dumping preview under chrome until chips are gone, then remove it.
 * Call instead of stopModeSelectPreview when leaving Mode Select into a fresh app.
 */
export function handoffModeSelectPreview(onDone?: () => void) {
  const host = hostEl;
  if (!host || !previewCleanup) {
    onDone?.();
    return;
  }

  if (reducedMotion() || !previewWorld) {
    stopModeSelectPreview();
    onDone?.();
    return;
  }

  host.classList.remove("is-gate");
  host.classList.add("is-handoff");
  beginModeSelectExitDump();

  const world = previewWorld;
  const started = performance.now();
  const tick = () => {
    if (!hostEl || hostEl !== host) {
      onDone?.();
      return;
    }
    if (!world || world.chipCount() === 0 || performance.now() - started > EXIT_DUMP_MAX_MS) {
      stopModeSelectPreview();
      onDone?.();
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** Phone gate: keep the Orby loop running and sit the access message over it. */
export function mountMobileAccessOverlay() {
  warmModeSelectPreview();
  const host = ensureHost();
  host.classList.add("is-mobile-gate");
  if (host.querySelector(".mobile-overlay")) return;
  const overlay = document.createElement("div");
  overlay.className = "mobile-overlay";
  overlay.setAttribute("role", "status");
  overlay.innerHTML = `
    <div class="mobile-overlay__mark logotype" aria-hidden="true">${logotypeRevealMarkup()}</div>
    <p class="mobile-overlay__message">Not available on mobile</p>
  `;
  host.append(overlay);
  const mark = overlay.querySelector<HTMLElement>(".mobile-overlay__mark");
  if (mark) settleLogotypeReveal(mark);
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
      <div class="mode-select__mark logotype" aria-hidden="true">${logotypeRevealMarkup()}</div>
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
            <span class="mode-select__name"><span class="mode-select__name-icon" aria-hidden="true">${atomIcon}</span>Physics</span>
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
            <span class="mode-select__name"><span class="mode-select__name-icon" aria-hidden="true">${gridFourIcon}</span>Layout</span>
            <span class="mode-select__desc">Place freely — no physics, pieces can overlap.</span>
          </button>
        </div>
      </div>
      <div class="mode-select__lower">
        <p class="mode-select__social">
          <a href="https://x.com/johstell" target="_blank" rel="noopener noreferrer" aria-label="X">
            <span class="mode-select__icon mode-select__icon--x" aria-hidden="true"></span>
          </a>
          <a href="https://github.com/stellanjoh2/Ultrapilled" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
            <svg viewBox="0 0 98 96" aria-hidden="true">
              <path fill="currentColor" d="M41.4395 69.3848C28.8066 67.8535 19.9062 58.7617 19.9062 46.9902C19.9062 42.2051 21.6289 37.0371 24.5 33.5918C23.2559 30.4336 23.4473 23.7344 24.8828 20.959C28.7109 20.4805 33.8789 22.4902 36.9414 25.2656C40.5781 24.1172 44.4062 23.543 49.0957 23.543C53.7852 23.543 57.6133 24.1172 61.0586 25.1699C64.0254 22.4902 69.2891 20.4805 73.1172 20.959C74.457 23.543 74.6484 30.2422 73.4043 33.4961C76.4668 37.1328 78.0937 42.0137 78.0937 46.9902C78.0937 58.7617 69.1934 67.6621 56.3691 69.2891C59.623 71.3945 61.8242 75.9883 61.8242 81.252L61.8242 91.2051C61.8242 94.0762 64.2168 95.7031 67.0879 94.5547C84.4102 87.9512 98 70.6289 98 49.1914C98 22.1074 75.9883 6.69539e-07 48.9043 4.309e-07C21.8203 1.92261e-07 -1.9479e-07 22.1074 -4.3343e-07 49.1914C-6.20631e-07 70.4375 13.4941 88.0469 31.6777 94.6504C34.2617 95.6074 36.75 93.8848 36.75 91.3008L36.75 83.6445C35.4102 84.2188 33.6875 84.6016 32.1562 84.6016C25.8398 84.6016 22.1074 81.1563 19.4277 74.7441C18.375 72.1602 17.2266 70.6289 15.0254 70.3418C13.877 70.2461 13.4941 69.7676 13.4941 69.1934C13.4941 68.0449 15.4082 67.1836 17.3223 67.1836C20.0977 67.1836 22.4902 68.9063 24.9785 72.4473C26.8926 75.2227 28.9023 76.4668 31.2949 76.4668C33.6875 76.4668 35.2187 75.6055 37.4199 73.4043C39.0469 71.7773 40.291 70.3418 41.4395 69.3848Z" />
            </svg>
          </a>
          <a href="https://www.linkedin.com/in/stellanj/" target="_blank" rel="noopener noreferrer" class="mode-select__s" aria-label="LinkedIn"></a>
        </p>
        <p class="mode-select__foot">
          Ultrapilled™ is a free physics playground for dropping text, icons, and images into motion.<br />
          We don’t track you, and <strong>we don’t use anything you upload to train AI</strong> — your files stay on your device.
        </p>
        <button type="button" class="mode-select__report" data-open-bug-report>
          <span class="mode-select__report-icon" aria-hidden="true">${warningCircleIcon}</span>
          Report an issue
        </button>
      </div>
    `;

    const mark = root.querySelector<HTMLElement>(".mode-select__mark")!;
    const headline = root.querySelector<HTMLElement>(".mode-select__headline")!;
    fillHeadline(headline);
    const words = [...headline.querySelectorAll<HTMLElement>(".mode-select__word")];
    const cards = [...root.querySelectorAll<HTMLButtonElement>(".mode-select__card")];
    const social = root.querySelector<HTMLElement>(".mode-select__social")!;
    const foot = root.querySelector<HTMLElement>(".mode-select__foot")!;
    const report = root.querySelector<HTMLElement>(".mode-select__report")!;
    const chrome = [social, foot, report];
    const video = root.querySelector<HTMLVideoElement>(".mode-select__video");
    const ink = [mark, headline, ...root.querySelectorAll<HTMLElement>(".mode-select__name, .mode-select__desc")];

    let settled = false;
    const finish = (mode: AppMode) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("keydown", onKey);
      playNotify();
      // Floor opens while the mode UI fades — dump instead of a hard cut later.
      beginModeSelectExitDump();

      const done = () => {
        video?.pause();
        // Same spot as the app topbar mark — keep it until chrome lands over it.
        if (mark.isConnected) host.append(mark);
        root.remove();
        host.classList.remove("is-gate");
        resolve(mode);
      };

      if (reducedMotion()) {
        done();
        return;
      }

      // Tear down in reverse of the enter beat (chrome → cards → words). Mark stays.
      const tl = gsap.timeline({ defaults: { ease: "power3.in" }, onComplete: done });
      tl.to(chrome, {
        autoAlpha: 0,
        y: 14,
        duration: 0.28,
        stagger: { each: 0.04, from: "end" },
      }, 0);
      tl.to(cards, {
        autoAlpha: 0,
        y: 20,
        scale: 0.96,
        duration: 0.36,
        stagger: { each: 0.07, from: "end" },
      }, "-=0.1");
      tl.to(words, {
        autoAlpha: 0,
        y: 16,
        duration: 0.32,
        stagger: { each: 0.03, from: "end" },
      }, "-=0.16");
    };

    const onKey = (event: KeyboardEvent) => {
      if (isBugReportOpen()) return;
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
      if (!(target instanceof Element)) return;
      if (target.closest("[data-open-bug-report]")) {
        event.preventDefault();
        openBugReport();
        return;
      }
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
    gsap.set([...words, ...cards, ...chrome], { autoAlpha: 0, y: 22 });
    gsap.set(mark, { autoAlpha: 1, y: 0 });

    if (reducedMotion()) {
      gsap.set(mark.querySelectorAll(".logotype-reveal__layer"), { clipPath: "inset(0% 0% 0% 0%)" });
      gsap.set([mark, ...words, ...cards, ...chrome], { clearProps: "all", autoAlpha: 1, y: 0 });
      return;
    }

    mark.classList.add("is-revealing");
    void (async () => {
      await playLogotypeReveal(mark, {
        scaleFrom: 5,
        scaleTo: 1,
        scaleEase: "power3.out",
      });
      mark.classList.remove("is-revealing");

      const reveal = { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.06, clearProps: clearBlend };
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.to(words, reveal);
      tl.to(cards, reveal, ">");
      tl.to(chrome, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.05, clearProps: clearBlend }, ">");
      tl.add(() => {
        gsap.set(ink, { clearProps: clearBlend });
      });
    })();
  });
}
