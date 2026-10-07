import { isPhysicsHeldByOverlay } from "./physicsOverlayHold";
import type { AppState } from "./types";
import type { WorldHandle } from "./world";

export type PlayPhase = "idle" | "preparing" | "falling" | "holding" | "dumping";

const MIN_CYCLE_MS = 1200;
/** Extra ease time after motion is low before locking the hold pose. */
const SETTLE_CONFIRM_MS = 1600;
const PLAY_IDLE_MS = 3000;
/** Sleeping leftovers after the floor opens — don't wait forever to loop. */
const DUMP_STUCK_MS = 1500;

export type PlaySessionHost = {
  world: WorldHandle;
  getState: () => AppState;
  stage: HTMLElement;
  playfield: HTMLElement;
  fitScale: () => number;
  syncCanvas: (refitChips: boolean) => boolean;
  ensureAssets: () => Promise<unknown>;
  scheduleDraft: () => void;
  dismissWelcome: () => void;
  paintWelcome: () => void;
  paintTransport: () => void;
  paintPhysDebug: () => void;
  tickAudioReact: (now: number) => void;
  nudgeEmptyScene: () => void;
  /** Resolves true when layout mode was turned off so physics can run. */
  notifyLayoutModeBlocksPhysics: () => Promise<boolean>;
  playButton: () => void;
  getRunning: () => boolean;
  setRunningFlag: (on: boolean) => void;
  getPaused: () => boolean;
  setPaused: (on: boolean) => void;
  getRepeat: () => boolean;
  getPosePinned: () => boolean;
  setPosePinned: (on: boolean) => void;
  /** When set, the frame loop stops scheduling once this returns false. */
  shouldContinue?: () => boolean;
};

export type PlaySession = {
  drop: () => Promise<void>;
  triggerPhysics: () => Promise<void>;
  setRunning: (on: boolean) => void;
  finishRun: () => void;
  togglePause: () => void;
  frame: (now: number) => void;
  phase: PlayPhase;
  dropTicket: number;
  settledSince: number;
  holdStarted: number;
  droppedAt: number;
  lastInteractAt: number;
  dumpStarted: number;
  clearingDump: boolean;
};

export function createPlaySession(host: PlaySessionHost): PlaySession {
  let droppedAt = 0;
  let settledSince = 0;
  let holdStarted = 0;
  let lastInteractAt = 0;
  let dumpStarted = 0;
  let phase: PlayPhase = "idle";
  let dropTicket = 0;
  /** Floor-dump from Clear canvas — finish idle instead of looping a new drop. */
  let clearingDump = false;
  let prevFrame = 0;

  function holdSequenceClock(dt: number) {
    droppedAt += dt;
    if (settledSince) settledSince += dt;
    if (holdStarted) holdStarted += dt;
  }

  async function drop() {
    const ticket = ++dropTicket;
    host.setPosePinned(false);
    phase = "preparing";
    await host.ensureAssets();
    if (!host.getRunning() || ticket !== dropTicket) return;
    host.syncCanvas(false);
    host.world.setFloorOpen(false);
    const state = host.getState();
    // Re-trigger with chips on the board: keep user transforms, lift above stage, fall again.
    // Fresh spawn (template apply, empty canvas, post-dump loop) still uses play().
    if (host.world.chipCount() > 0) {
      host.world.refresh(
        state.slots,
        state.physics,
        host.fitScale(),
        state.theme,
        state.pillPad,
        state.textTracking,
        state.sizeRandom,
      );
      host.world.redeployFall();
      host.world.sync();
    } else {
      host.world.play(
        state.slots,
        state.physics,
        host.stage,
        host.fitScale(),
        state.theme,
        state.pillPad,
        state.textTracking,
        state.sizeRandom,
      );
    }
    droppedAt = performance.now();
    settledSince = 0;
    holdStarted = 0;
    lastInteractAt = 0;
    dumpStarted = 0;
    if (state.physics.layoutMode) {
      host.world.freezePile();
      host.world.sync();
      host.setPosePinned(true);
      phase = "holding";
      holdStarted = performance.now();
    } else {
      phase = "falling";
    }
    host.scheduleDraft();
  }

  function setRunning(on: boolean) {
    host.setRunningFlag(on);
    host.setPaused(false);
    if (!on) host.setPosePinned(false);
    host.world.setRunning(on);
    host.paintTransport();
    if (on) {
      host.dismissWelcome();
      void drop();
      return;
    }
    dropTicket++;
    phase = "idle";
    host.world.setFloorOpen(false);
    host.world.clear();
    host.paintWelcome();
  }

  function finishRun() {
    host.setRunningFlag(false);
    host.setPaused(false);
    phase = "idle";
    host.world.setRunning(false);
    host.paintTransport();
    host.paintWelcome();
  }

  async function triggerPhysics() {
    const state = host.getState();
    if (!state.slots.length) {
      host.nudgeEmptyScene();
      return;
    }
    if (state.physics.layoutMode) {
      const activated = await host.notifyLayoutModeBlocksPhysics();
      if (!activated) return;
    }
    host.playButton();
    setRunning(true);
  }

  function togglePause() {
    if (!host.getRunning()) {
      if (!host.getState().slots.length) {
        host.nudgeEmptyScene();
        return;
      }
      setRunning(true);
      return;
    }
    const next = !host.getPaused();
    host.setPaused(next);
    host.world.setRunning(!next);
  }

  let overlayHeld = false;

  function frame(now: number) {
    const dt = prevFrame ? now - prevFrame : 0;
    prevFrame = now;
    if (dt > 0) host.world.adaptFrameBudget(dt);
    host.tickAudioReact(now);

    // Full-screen blur overlays: freeze the level (no Matter, no hold/dump clocks).
    const heldByOverlay = isPhysicsHeldByOverlay();
    if (heldByOverlay) {
      overlayHeld = true;
      host.world.setRunning(false);
      if (host.shouldContinue?.() === false) return;
      requestAnimationFrame(frame);
      return;
    }
    if (overlayHeld) {
      overlayHeld = false;
      if (host.getRunning() && !host.getPaused()) host.world.setRunning(true);
    }

    if (host.getPaused()) {
      host.world.setRunning(false);
      holdSequenceClock(dt);
      if (lastInteractAt) lastInteractAt += dt;
      if (host.shouldContinue?.() === false) return;
      requestAnimationFrame(frame);
      return;
    }

    const busy =
      host.world.isDragging() ||
      phase === "falling" ||
      phase === "holding" ||
      phase === "dumping" ||
      phase === "preparing" ||
      !host.world.isQuiet();
    if (busy) {
      host.world.sync();
      host.world.purgeFallen(host.playfield.clientHeight);
    }
    host.paintPhysDebug();

    if (host.world.isDragging()) lastInteractAt = now;
    const playing = lastInteractAt > 0 && now - lastInteractAt < PLAY_IDLE_MS;
    const running = host.getRunning();
    const state = host.getState();

    if (running && playing && phase !== "dumping") {
      holdSequenceClock(dt);
      if (state.physics.layoutMode) {
        // Rigid layout: never leave leftover throw / coast after a grab.
        if (!host.world.isDragging()) {
          if (phase !== "holding" && phase !== "preparing") {
            phase = "holding";
            holdStarted = now;
          }
          host.world.freezePile();
          host.world.sync();
          host.setPosePinned(true);
        }
      } else if (phase === "holding") {
        host.setPosePinned(false);
        phase = "falling";
        settledSince = 0;
        holdStarted = 0;
      }
      if (host.shouldContinue?.() === false) return;
      return requestAnimationFrame(frame);
    }

    if (running && state.physics.layoutMode && phase !== "dumping") {
      if (phase !== "holding" && phase !== "preparing") {
        phase = "holding";
        holdStarted = now;
        host.world.freezePile();
        host.world.sync();
        host.setPosePinned(true);
      }
      if (host.shouldContinue?.() === false) return;
      return requestAnimationFrame(frame);
    }

    if (running) {
      if (phase === "falling") {
        const elapsed = now - droppedAt;
        // Clock starts when motion is low; freeze only once fully asleep so the last ease isn't cut.
        // Freeze only once Matter has actually slept the pile — never on a wall-clock cut.
        const settledLongEnough =
          elapsed >= MIN_CYCLE_MS &&
          settledSince !== 0 &&
          now - settledSince >= SETTLE_CONFIRM_MS &&
          host.world.isQuiet();
        if (settledLongEnough) {
          phase = "holding";
          holdStarted = now;
          host.world.freezePile();
          host.world.sync();
          host.scheduleDraft();
        } else if (elapsed >= MIN_CYCLE_MS && host.world.isSettled()) {
          if (!settledSince) settledSince = now;
        } else {
          // Any remaining slide (even "quiet" friction) restarts the settle clock.
          settledSince = 0;
        }
      } else if (phase === "holding" && !host.getPosePinned() && now - holdStarted >= state.physics.hold * 1000) {
        if (!host.getRepeat()) {
          finishRun();
        } else {
          host.world.setFloorOpen(true);
          phase = "dumping";
          dumpStarted = now;
          host.world.sync();
        }
      } else if (phase === "dumping") {
        if (!dumpStarted) dumpStarted = now;
        if (host.world.chipCount() > 0) {
          // Sleeping bodies ignore gravity — keep a dump awake so chips can leave.
          host.world.setFloorOpen(true);
          if (now - dumpStarted >= DUMP_STUCK_MS && host.world.isQuiet()) {
            host.world.discardAll();
          }
        }
        if (host.world.chipCount() === 0) {
          if (clearingDump) {
            clearingDump = false;
            host.world.setFloorOpen(false);
            finishRun();
          } else if (!host.getRepeat()) finishRun();
          else void drop();
        }
      }
    }

    if (host.shouldContinue?.() === false) return;
    requestAnimationFrame(frame);
  }

  return {
    drop,
    triggerPhysics,
    setRunning,
    finishRun,
    togglePause,
    frame,
    get phase() {
      return phase;
    },
    set phase(value: PlayPhase) {
      phase = value;
    },
    get dropTicket() {
      return dropTicket;
    },
    set dropTicket(value: number) {
      dropTicket = value;
    },
    get settledSince() {
      return settledSince;
    },
    set settledSince(value: number) {
      settledSince = value;
    },
    get holdStarted() {
      return holdStarted;
    },
    set holdStarted(value: number) {
      holdStarted = value;
    },
    get droppedAt() {
      return droppedAt;
    },
    set droppedAt(value: number) {
      droppedAt = value;
    },
    get lastInteractAt() {
      return lastInteractAt;
    },
    set lastInteractAt(value: number) {
      lastInteractAt = value;
    },
    get dumpStarted() {
      return dumpStarted;
    },
    set dumpStarted(value: number) {
      dumpStarted = value;
    },
    get clearingDump() {
      return clearingDump;
    },
    set clearingDump(value: boolean) {
      clearingDump = value;
    },
  };
}
