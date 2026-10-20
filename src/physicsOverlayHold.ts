/** Modals freeze Matter + stage media so underlays stay calm. */

import { setGifBloomPaused } from "./chipDomPaint";
import { setTextAnimsPaused } from "./textAnim";
import { pauseAllYouTubeLoops, resumeAllYouTubeLoops } from "./youtube";

type Stoppable = { setRunning: (on: boolean) => void };

const OVERLAY_ANIMS_CLASS = "is-overlay-anims-frozen";
const STAGE_VIDEO =
  "video.chip-video__frame, video.mode-select__video, .stage video, .mode-select video";
const STAGE_IMG = ".stage img, .mode-select img, .chip img";
const LIVE_SRC_ATTR = "data-overlay-live-src";

let depth = 0;
const worlds = new Set<Stoppable>();
/** Videos we paused so release can resume only those. */
const pausedMedia = new Set<HTMLVideoElement>();

export function registerPhysicsWorld(world: Stoppable): () => void {
  worlds.add(world);
  return () => {
    worlds.delete(world);
  };
}

export function isPhysicsHeldByOverlay(): boolean {
  return depth > 0;
}

function looksAnimatedRaster(img: HTMLImageElement): boolean {
  const src = img.currentSrc || img.src;
  if (!src) return false;
  if (/\.gif(\?|#|$)/i.test(src)) return true;
  // Remote GIF hosts often omit .gif in the path.
  if (/giphy\.com|giphy\.gif|media\d*\.giphy/i.test(src)) return true;
  return false;
}

/**
 * Swap looping `<img>` GIFs to a still PNG of the current frame.
 * Same-origin / CORS-ok only — tainted canvases are skipped (decoder path
 * covers bloom GIFs via {@link setGifBloomPaused}).
 */
function freezeRasterGifs(): void {
  for (const node of document.querySelectorAll(STAGE_IMG)) {
    if (!(node instanceof HTMLImageElement)) continue;
    if (node.hasAttribute(LIVE_SRC_ATTR)) continue;
    if (!looksAnimatedRaster(node)) continue;
    if (!node.complete || node.naturalWidth < 1) continue;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = node.naturalWidth;
      canvas.height = node.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.drawImage(node, 0, 0);
      node.setAttribute(LIVE_SRC_ATTR, node.currentSrc || node.src);
      node.src = canvas.toDataURL("image/png");
    } catch {
      /* cross-origin without CORS — leave looping */
    }
  }
}

function thawRasterGifs(): void {
  for (const node of document.querySelectorAll(`img[${LIVE_SRC_ATTR}]`)) {
    if (!(node instanceof HTMLImageElement)) continue;
    const live = node.getAttribute(LIVE_SRC_ATTR);
    node.removeAttribute(LIVE_SRC_ATTR);
    if (live) node.src = live;
  }
}

function freezeStageVisuals(): void {
  document.documentElement.classList.add(OVERLAY_ANIMS_CLASS);
  setTextAnimsPaused(true);
  setGifBloomPaused(true);
  pauseAllYouTubeLoops();
  freezeRasterGifs();
  pausedMedia.clear();
  for (const video of document.querySelectorAll<HTMLVideoElement>(STAGE_VIDEO)) {
    if (video.paused) continue;
    video.pause();
    pausedMedia.add(video);
  }
}

function restoreStageVisuals(): void {
  document.documentElement.classList.remove(OVERLAY_ANIMS_CLASS);
  // Keep user freeze-anims preference if they left it on.
  setTextAnimsPaused(document.documentElement.classList.contains("is-asset-anims-frozen"));
  setGifBloomPaused(false);
  thawRasterGifs();
  resumeAllYouTubeLoops();
  for (const video of pausedMedia) {
    if (video.isConnected) void video.play().catch(() => {});
  }
  pausedMedia.clear();
}

export function holdPhysicsForOverlay(): void {
  depth += 1;
  if (depth === 1) {
    for (const world of worlds) world.setRunning(false);
    freezeStageVisuals();
  }
}

export function releasePhysicsForOverlay(): void {
  if (depth === 0) return;
  depth -= 1;
  if (depth === 0) restoreStageVisuals();
  // Physics resume is owned by playSession so Space-pause / idle stay respected.
}

/** Test helper — resets hold depth and world registry. */
export function resetPhysicsOverlayHoldForTests(): void {
  depth = 0;
  worlds.clear();
  pausedMedia.clear();
  setGifBloomPaused(false);
  thawRasterGifs();
  document.documentElement.classList.remove(OVERLAY_ANIMS_CLASS);
}
