import { canvasFrame } from "../canvas";
import type { ChipPose } from "../chipKinds";
import type { AppState } from "../types";
import { paintFrame } from "./paint";
import { createWorld, type ImpactHit } from "../world";

const STEP_MS = 1000 / 60;
const MIN_CYCLE_MS = 1200;
const SETTLE_CONFIRM_MS = 1600;
const MAX_FRAMES = 7200;
/** Sim-time cap so a pile that never sleeps cannot run for tens of minutes. */
const MAX_FALL_MS = 20_000;
const MAX_WALL_MS = 90_000;

export class ExportCancelled extends Error {
  constructor() {
    super("Export cancelled");
    this.name = "ExportCancelled";
  }
}

export function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

export async function renderLoop(options: {
  state: AppState;
  stageWidth: number;
  stageHeight: number;
  width: number;
  height: number;
  fps: 30 | 60;
  loops: 1 | 2;
  transparent: boolean;
  /** Live chip poses. When set, the loop falls this scene instead of a fresh template spawn. */
  poses?: ChipPose[];
  /** When true with poses, wake in place (replay last fall start). When false, redeployFall. */
  replayFall?: boolean;
  frame?: { width: number; height: number };
  canvas?: HTMLCanvasElement;
  onFrame: (canvas: HTMLCanvasElement, index: number) => Promise<void | false> | void | false;
  shouldStop?: () => boolean;
  onProgress?: (message: string) => void;
}): Promise<{ frames: number; limited: boolean; impacts: ImpactHit[] }> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = `position:fixed;left:-16000px;top:0;width:${options.stageWidth}px;height:${options.stageHeight}px;overflow:hidden;pointer-events:none;opacity:0`;
  host.innerHTML = `<div class="chip-layer"></div><div class="bloom-layer"><div class="bloom-blur"><div class="bloom-inner"></div></div></div><div class="chip-chrome-layer" aria-hidden="true"></div>`;
  document.body.appendChild(host);

  const sim = createWorld({ paused: true });
  sim.setSimulationScale(canvasFrame(options.stageWidth, options.stageHeight, options.state.canvas).scale);
  const canvas = options.canvas ?? document.createElement("canvas");
  if (canvas.width !== options.width || canvas.height !== options.height) {
    canvas.width = options.width;
    canvas.height = options.height;
  }

  const stepsPerFrame = options.fps === 60 ? 1 : 2;
  const frameMs = stepsPerFrame * STEP_MS;
  const holdMs = options.state.physics.hold * 1000;

  let frames = 0;
  let limited = false;
  let timeMs = 0;
  const impacts: ImpactHit[] = [];

  try {
    const stageWidth = host.clientWidth || options.stageWidth;
    const stageHeight = host.clientHeight || options.stageHeight;
    if (stageWidth < 2 || stageHeight < 2) throw new Error("Export failed");
    const scene = {
      width: options.width,
      height: options.height,
      stageWidth,
      stageHeight,
      stageColor: options.state.stageColor,
      background: options.state.background,
      canvas: options.state.canvas,
      theme: options.state.theme,
      post: options.state.post,
      transparent: options.transparent,
      layoutMode: Boolean(options.state.physics.layoutMode),
    };

    for (let loop = 0; loop < options.loops; loop++) {
      if (options.shouldStop?.()) throw new ExportCancelled();
      const loopStartMs = timeMs;
      sim.setImpactListener((hit) => {
        impacts.push({ ...hit, timeMs: loopStartMs + hit.timeMs });
      });
      const poses = options.poses;
      const frame = options.frame ?? { width: options.stageWidth, height: options.stageHeight };
      if (poses?.length) {
        sim.restore(
          options.state.slots,
          options.state.physics,
          host,
          options.state.masterScale,
          options.state.theme,
          options.state.pillPad,
          options.state.textTracking,
          options.state.sizeRandom,
          poses,
          frame,
        );
        if (options.state.physics.layoutMode) sim.freezePile();
        else if (options.replayFall) sim.wakeAll();
        else sim.redeployFall();
        sim.sync();
      } else {
        sim.play(
          options.state.slots,
          options.state.physics,
          host,
          options.state.masterScale,
          options.state.theme,
          options.state.pillPad,
          options.state.textTracking,
          options.state.sizeRandom,
        );
      }

      if (sim.chipCount() === 0) {
        await paintFrame(canvas, sim.draws(), scene, timeMs);
        if ((await options.onFrame(canvas, frames)) === false) return { frames, limited, impacts };
        frames += 1;
        timeMs += frameMs;
        options.onProgress?.(`Rendering frame ${frames}`);
        continue;
      }

      let phase: "falling" | "holding" = "falling";
      let elapsed = 0;
      let settledFor = 0;
      let holdFor = 0;
      const wallStart = performance.now();

      while (true) {
        if (options.shouldStop?.()) throw new ExportCancelled();
        if (frames >= MAX_FRAMES) {
          limited = true;
          return { frames, limited, impacts };
        }

        for (let step = 0; step < stepsPerFrame; step++) sim.step(STEP_MS);
        sim.purgeFallen(stageHeight);
        await paintFrame(canvas, sim.draws(), scene, timeMs);
        if ((await options.onFrame(canvas, frames)) === false) return { frames, limited, impacts };
        frames += 1;
        timeMs += frameMs;
        options.onProgress?.(`Rendering frame ${frames}`);
        elapsed += frameMs;

        if (phase === "falling") {
          const timedOut = elapsed >= MAX_FALL_MS || performance.now() - wallStart >= MAX_WALL_MS;
          const settled = elapsed >= MIN_CYCLE_MS && sim.isSettled();
          const quietLongEnough =
            settledFor >= SETTLE_CONFIRM_MS && sim.isQuiet();
          if (quietLongEnough || timedOut) {
            if (timedOut) limited = true;
            phase = "holding";
            holdFor = 0;
          } else if (settled) {
            settledFor += frameMs;
          } else {
            settledFor = 0;
          }
        } else {
          holdFor += frameMs;
          if (holdFor >= holdMs) break;
        }

        await yieldToUi();
      }
    }
    return { frames, limited, impacts };
  } finally {
    sim.setImpactListener(null);
    sim.destroy();
    host.remove();
  }
}
