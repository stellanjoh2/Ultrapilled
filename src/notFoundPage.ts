import { backgroundPaint } from "./background";
import {
  isMobileAccessGate,
  MOBILE_ACCESS_GATE_QUERY,
  MODE_SELECT_MOBILE_ASSET_SCALE,
  modeSelectAssetScale,
} from "./mobileGate";
import { createPlaySession } from "./playSession";
import { notFoundPreviewState } from "./modeSelectTheme";
import { compositionScale } from "./uiScale";
import { createWorld } from "./world";
import "./style.css";
import "./notFoundPage.css";

/** Same-origin home (ultrapilled.com in production). */
const HOME_HREF = "/";

function fillHeadline(el: Element, mobile: boolean) {
  const words = ["Well", "that", "didn't", "land", "right"];
  if (!mobile) {
    el.textContent = words.join(" ");
    return;
  }
  el.replaceChildren();
  words.forEach((word, index) => {
    const span = document.createElement("span");
    span.className = "mode-select__word";
    span.textContent = word;
    el.append(span);
    if (index < words.length - 1) el.append(document.createTextNode(" "));
  });
}

function syncNotFoundMobile(host: HTMLElement) {
  const mobile = isMobileAccessGate();
  const wasMobile = host.classList.contains("is-mobile");
  host.classList.toggle("is-mobile", mobile);
  const headline = host.querySelector(".not-found__headline");
  if (!headline) return;
  if (wasMobile === mobile && headline.textContent) return;
  fillHeadline(headline, mobile);
}

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function paintBackdrop(
  stage: HTMLElement,
  playfield: HTMLElement,
  state: ReturnType<typeof notFoundPreviewState>,
) {
  const paint = backgroundPaint(state.background, state.canvas, state.stageColor);
  stage.style.background = state.stageColor;
  playfield.style.backgroundColor = paint.color;
  playfield.style.backgroundImage = paint.image;
  playfield.style.backgroundSize = paint.size;
  playfield.style.backgroundPosition = paint.position;
  playfield.style.backgroundRepeat = paint.repeat;
}

function warmNotFoundPreview(host: HTMLElement, state: ReturnType<typeof notFoundPreviewState>) {
  if (reducedMotion()) {
    const stage = document.createElement("div");
    stage.className = "not-found__stage";
    stage.style.background = state.stageColor;
    host.prepend(stage);
    return () => {};
  }

  const wrap = document.createElement("div");
  wrap.className = "not-found__preview";
  wrap.innerHTML = `
    <div class="stage not-found__stage">
      <div class="playfield not-found__playfield">
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

  const stage = wrap.querySelector<HTMLElement>(".not-found__stage")!;
  const playfield = wrap.querySelector<HTMLElement>(".not-found__playfield")!;
  paintBackdrop(stage, playfield, state);
  playfield.style.left = "0";
  playfield.style.top = "0";
  playfield.style.width = "100%";
  playfield.style.height = "100%";

  const world = createWorld();
  world.setImpactListener(() => {});
  // Enable grab / toss — no panel chrome, just the physics.
  world.attach(stage);

  let alive = true;
  let running = false;
  let posePinned = false;
  const repeat = true;

  const previewScale = () => {
    const mobile = isMobileAccessGate();
    const view = mobile ? MODE_SELECT_MOBILE_ASSET_SCALE : compositionScale(1);
    world.setSimulationScale(view);
    return modeSelectAssetScale(state.masterScale, mobile);
  };

  const session = createPlaySession({
    world,
    getState: () => state,
    stage,
    playfield,
    fitScale: previewScale,
    syncCanvas: () => {
      paintBackdrop(stage, playfield, state);
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
    getRunning: () => running,
    setRunningFlag: (on) => {
      running = on;
    },
    getPaused: () => false,
    setPaused: () => {},
    getRepeat: () => repeat,
    getPosePinned: () => posePinned,
    setPosePinned: (on) => {
      posePinned = on;
    },
    shouldContinue: () => alive,
  });

  const onResize = () => {
    if (!alive) return;
    syncNotFoundMobile(host);
    const w = playfield.clientWidth;
    const h = playfield.clientHeight;
    if (w < 8 || h < 8) return;
    world.resize(w, h);
    if (world.chipCount() === 0) return;
    world.refresh(
      state.slots,
      state.physics,
      previewScale(),
      state.theme,
      state.pillPad,
      state.textTracking,
      state.sizeRandom,
      { quiet: true },
    );
  };
  window.addEventListener("resize", onResize);
  const gateMq = typeof matchMedia === "function" ? matchMedia(MOBILE_ACCESS_GATE_QUERY) : null;
  gateMq?.addEventListener("change", onResize);

  requestAnimationFrame(session.frame);
  session.setRunning(true);

  return () => {
    alive = false;
    window.removeEventListener("resize", onResize);
    gateMq?.removeEventListener("change", onResize);
    session.setRunning(false);
    world.destroy();
  };
}

function mountOverlay(host: HTMLElement) {
  const overlay = document.createElement("div");
  overlay.className = "not-found__overlay";
  overlay.innerHTML = `
    <h1 class="not-found__headline"></h1>
    <a class="pill not-found__home" href="${HOME_HREF}">Go back to ultrapilled.com</a>
  `;
  host.append(overlay);
  syncNotFoundMobile(host);
}

function boot() {
  const root = document.querySelector<HTMLElement>("#not-found-root");
  if (!root) throw new Error("#not-found-root missing");

  const host = document.createElement("div");
  host.className = "not-found-host";
  syncNotFoundMobile(host);
  root.append(host);

  const state = notFoundPreviewState();
  warmNotFoundPreview(host, state);
  mountOverlay(host);

  const gateMq = typeof matchMedia === "function" ? matchMedia(MOBILE_ACCESS_GATE_QUERY) : null;
  gateMq?.addEventListener("change", () => syncNotFoundMobile(host));
}

boot();
