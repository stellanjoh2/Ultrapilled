import { canvasFrame } from "./canvas";
import type { ChipDraw } from "./chipKinds";
import type { LayoutPage } from "./layoutPages";
import { paintFrame, type PaintScene } from "./export/paint";
import type { AppState, BackgroundSettings } from "./types";
import { createWorld } from "./world";

export const PAGE_THUMB_MAX_W = 220;
export const PAGE_THUMB_MAX_H = 132;

export function pageThumbSize(frame: { width: number; height: number }): { width: number; height: number } {
  const fw = Math.max(1, frame.width);
  const fh = Math.max(1, frame.height);
  const fit = Math.min(PAGE_THUMB_MAX_W / fw, PAGE_THUMB_MAX_H / fh);
  return {
    width: Math.max(2, Math.round(fw * fit)),
    height: Math.max(2, Math.round(fh * fit)),
  };
}

function sceneOf(
  state: AppState,
  background: BackgroundSettings,
  stageWidth: number,
  stageHeight: number,
  width: number,
  height: number,
): PaintScene {
  return {
    width,
    height,
    stageWidth,
    stageHeight,
    stageColor: state.stageColor,
    background,
    canvas: state.canvas,
    theme: state.theme,
    post: state.post,
    transparent: false,
    layoutMode: true,
    pillPad: state.pillPad,
  };
}

let paintLock: Promise<void> = Promise.resolve();

function withPaintLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = paintLock.then(fn, fn);
  paintLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function paintThumbNow(args: {
  draws: ChipDraw[];
  state: AppState;
  background: BackgroundSettings;
  stageWidth: number;
  stageHeight: number;
}): Promise<string> {
  const size = pageThumbSize({ width: args.stageWidth, height: args.stageHeight });
  const canvas = document.createElement("canvas");
  await paintFrame(
    canvas,
    args.draws,
    sceneOf(args.state, args.background, args.stageWidth, args.stageHeight, size.width, size.height),
  );
  return canvas.toDataURL("image/jpeg", 0.72);
}

export function paintPageThumb(args: {
  draws: ChipDraw[];
  state: AppState;
  background: BackgroundSettings;
  stageWidth: number;
  stageHeight: number;
}): Promise<string> {
  return withPaintLock(() => paintThumbNow(args));
}

export function paintPageThumbFromPage(page: LayoutPage, state: AppState): Promise<string> {
  return withPaintLock(async () => {
    const stageWidth = Math.max(2, page.frame.width);
    const stageHeight = Math.max(2, page.frame.height);
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = `position:fixed;left:-16000px;top:0;width:${stageWidth}px;height:${stageHeight}px;overflow:hidden;pointer-events:none;opacity:0`;
    host.innerHTML = `<div class="chip-layer"></div><div class="bloom-layer"><div class="bloom-blur"><div class="bloom-inner"></div></div></div><div class="chip-chrome-layer" aria-hidden="true"></div>`;
    document.body.append(host);
    const sim = createWorld({ paused: true });
    try {
      sim.setSimulationScale(canvasFrame(stageWidth, stageHeight, state.canvas).scale);
      if (page.poses.length) {
        sim.restore(
          page.slots,
          state.physics,
          host,
          state.masterScale,
          state.theme,
          state.pillPad,
          state.textTracking,
          state.sizeRandom,
          page.poses,
          page.frame,
        );
        sim.freezePile();
        sim.sync();
      }
      return await paintThumbNow({
        draws: sim.draws(),
        state,
        background: page.background,
        stageWidth,
        stageHeight,
      });
    } finally {
      sim.destroy();
      host.remove();
    }
  });
}
