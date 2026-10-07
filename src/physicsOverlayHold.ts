/** Full-screen blur overlays (About, bug thanks, …) freeze Matter + stage anims like a game pause. */

import { setTextAnimsPaused } from "./textAnim";

type Stoppable = { setRunning: (on: boolean) => void };

const OVERLAY_ANIMS_CLASS = "is-overlay-anims-frozen";
const STAGE_MEDIA = ".chip-video__frame, .mode-select__video";

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

function freezeStageVisuals(): void {
  document.documentElement.classList.add(OVERLAY_ANIMS_CLASS);
  setTextAnimsPaused(true);
  pausedMedia.clear();
  for (const video of document.querySelectorAll<HTMLVideoElement>(STAGE_MEDIA)) {
    if (video.paused) continue;
    video.pause();
    pausedMedia.add(video);
  }
}

function restoreStageVisuals(): void {
  document.documentElement.classList.remove(OVERLAY_ANIMS_CLASS);
  // Keep user freeze-anims preference if they left it on.
  setTextAnimsPaused(document.documentElement.classList.contains("is-asset-anims-frozen"));
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
  document.documentElement.classList.remove(OVERLAY_ANIMS_CLASS);
}
