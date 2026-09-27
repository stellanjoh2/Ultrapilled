import type { AppState } from "../types";
import type { ChipDraw } from "../world";
import { exportGif, exportMov, exportMp4, exportSequence, exportStill, type LoopResult } from "./exportMedia";
import { ExportCancelled } from "./simulate";
import {
  frameSize,
  GIF_PRESETS,
  IMAGE_SIZE_PRESETS,
  sizeLabel,
  VIDEO_SIZE_PRESETS,
  type FrameRate,
  type GifPreset,
  type ImageSizePreset,
  type LoopCount,
  type VideoSizePreset,
} from "./size";
import { playCaution, playCelebrate, playNotify, startProgress, stopProgress } from "../uiSounds";

export type ExportController = {
  prepare(): Promise<void>;
  stageSize(): { width: number; height: number; scale: number };
  draws(): ChipDraw[];
  state(): AppState;
};

type ExportKind = "png" | "png-alpha" | "png-seq" | "jpg" | "jpg-seq" | "mp4" | "gif" | "mov" | "mov-alpha";

let frameRate: FrameRate = 30;
let loops: LoopCount = 1;
let imagePreset: ImageSizePreset = "screen";
let videoPreset: VideoSizePreset = "screen";
let gifPreset: GifPreset = "480p";
let busy = false;
let cancelRequested = false;
let lastStatus = "";
let panelEl: HTMLElement | null = null;
let mountAbort = new AbortController();

function setStatus(message: string) {
  lastStatus = message;
  const node = panelEl?.querySelector("#export-status");
  if (node) node.textContent = message;
}

function applyBusy() {
  panelEl?.querySelectorAll<HTMLButtonElement>("[data-export], [data-fps], [data-loops]").forEach((button) => {
    button.disabled = busy;
  });
  panelEl?.querySelectorAll<HTMLSelectElement>("select").forEach((select) => {
    select.disabled = busy;
  });
  const cancel = panelEl?.querySelector<HTMLButtonElement>("#export-cancel");
  if (cancel) cancel.hidden = !busy;
}

function paintChoices() {
  panelEl?.querySelectorAll<HTMLButtonElement>("[data-fps]").forEach((button) => {
    const on = Number(button.dataset.fps) === frameRate;
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", String(on));
  });
  panelEl?.querySelectorAll<HTMLButtonElement>("[data-loops]").forEach((button) => {
    const on = Number(button.dataset.loops) === loops;
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", String(on));
  });
}

function sizeLine(controller: ExportController, preset: ImageSizePreset | GifPreset): string {
  const stage = controller.stageSize();
  const { width, height } = frameSize(stage.width, stage.height, preset);
  return `${width}×${height}`;
}

function paintSizes(controller: ExportController) {
  const image = panelEl?.querySelector("#image-size-meta");
  const video = panelEl?.querySelector("#video-size-meta");
  const gif = panelEl?.querySelector("#gif-size-meta");
  if (image) image.textContent = sizeLine(controller, imagePreset);
  if (video) video.textContent = sizeLine(controller, videoPreset);
  if (gif) gif.textContent = sizeLine(controller, gifPreset);
}

function doneMessage(note: LoopResult, fps: FrameRate): string {
  const count = `${note.frames} ${note.frames === 1 ? "frame" : "frames"} at ${fps} fps`;
  if (note.truncated) return `Exported ${count}. GIF stopped early so the tab could encode it.`;
  if (note.limited) return `Exported ${count}. Stopped at the frame limit.`;
  return `Exported ${count}.`;
}

function optionsHtml(presets: readonly string[], selected: string): string {
  return presets
    .map(
      (preset) =>
        `<option value="${preset}"${preset === selected ? " selected" : ""}>${sizeLabel(preset as ImageSizePreset | GifPreset)}</option>`,
    )
    .join("");
}

function panelHtml(): string {
  return `
    <section class="section">
      <h2 data-tip="Frames per second for sequences and video">Frame rate</h2>
      <div class="segment" role="group" aria-label="Frame rate">
        <button type="button" class="pill${frameRate === 30 ? " is-on" : ""}" data-fps="30" aria-pressed="${frameRate === 30}" data-tip="Smaller files, fine for most uses">30 fps</button>
        <button type="button" class="pill${frameRate === 60 ? " is-on" : ""}" data-fps="60" aria-pressed="${frameRate === 60}" data-tip="Smoother motion, much larger files">60 fps</button>
      </div>
      <h2 data-tip="How many times the fall plays in the export">Loops</h2>
      <div class="segment" role="group" aria-label="Loops">
        <button type="button" class="pill${loops === 1 ? " is-on" : ""}" data-loops="1" aria-pressed="${loops === 1}" data-tip="Export a single fall">1 loop</button>
        <button type="button" class="pill${loops === 2 ? " is-on" : ""}" data-loops="2" aria-pressed="${loops === 2}" data-tip="Play the fall twice in the file">2 loops</button>
      </div>
      <p class="hint">Stills are the canvas right now. Sequences and video render a new loop. 60 fps files are much larger.</p>
    </section>
    <section class="section">
      <h2 data-tip="Still frames and image sequences">Images</h2>
      <label class="field" data-tip="Pixel size for PNG and JPG exports. Up to 8K for stills and sequences.">Resolution
        <select id="image-size">${optionsHtml(IMAGE_SIZE_PRESETS, imagePreset)}</select>
      </label>
      <p class="hint" id="image-size-meta"></p>
      <div class="export-list">
        <button type="button" class="pill" data-export="png" data-tip="Save the current frame as a PNG">Export PNG frame</button>
        <button type="button" class="pill" data-export="png-alpha" data-tip="Save the current frame with a transparent background">Export transparent PNG</button>
        <button type="button" class="pill" data-export="png-seq" data-tip="Save every frame of a new loop as PNGs">Export PNG sequence</button>
        <button type="button" class="pill" data-export="jpg" data-tip="Save the current frame as a JPG">Export JPG frame</button>
        <button type="button" class="pill" data-export="jpg-seq" data-tip="Save every frame of a new loop as JPGs">Export JPG sequence</button>
      </div>
    </section>
    <section class="section">
      <h2 data-tip="Rendered video of a full loop">Video</h2>
      <label class="field" data-tip="Pixel size for MP4 and MOV. Up to 4K.">Resolution
        <select id="video-size">${optionsHtml(VIDEO_SIZE_PRESETS, videoPreset)}</select>
      </label>
      <p class="hint" id="video-size-meta"></p>
      <div class="export-list">
        <button type="button" class="pill" data-export="mp4" data-tip="Render a new loop to an MP4 file">Export MP4</button>
        <button type="button" class="pill" data-export="mov" data-tip="Render a new loop to a MOV file">Export MOV</button>
        <button type="button" class="pill" data-export="mov-alpha" data-tip="Render a MOV with a transparent background">Export transparent MOV</button>
      </div>
      <h2 data-tip="Animated GIF of a loop">GIF</h2>
      <label class="field" data-tip="GIF pixel size. Long loops may stop early to stay small.">Resolution
        <select id="gif-size">${optionsHtml(GIF_PRESETS, gifPreset)}</select>
      </label>
      <p class="hint" id="gif-size-meta"></p>
      <p class="hint">Same frame rate. If the loop is long, the GIF stops before it gets too large.</p>
      <div class="export-list">
        <button type="button" class="pill" data-export="gif" data-tip="Render a new loop to a GIF">Export GIF</button>
      </div>
    </section>
    <p class="hint" id="export-status" role="status"></p>
    <button type="button" class="pill" id="export-cancel" hidden data-tip="Stop the export in progress">Cancel</button>
  `;
}

export function mountExportPanel(panel: HTMLElement, controller: ExportController, scroll: number) {
  panelEl = panel;
  panel.innerHTML = panelHtml();
  setStatus(lastStatus);
  paintChoices();
  paintSizes(controller);
  applyBusy();
  panel.scrollTop = scroll;

  mountAbort.abort();
  mountAbort = new AbortController();
  const signal = mountAbort.signal;
  window.addEventListener("resize", () => paintSizes(controller), { signal });

  panel.querySelectorAll<HTMLButtonElement>("[data-fps]").forEach((button) => {
    button.addEventListener("click", () => {
      frameRate = Number(button.dataset.fps) === 60 ? 60 : 30;
      paintChoices();
    }, { signal });
  });
  panel.querySelectorAll<HTMLButtonElement>("[data-loops]").forEach((button) => {
    button.addEventListener("click", () => {
      loops = Number(button.dataset.loops) === 2 ? 2 : 1;
      paintChoices();
    }, { signal });
  });
  panel.querySelector<HTMLSelectElement>("#image-size")?.addEventListener("change", (event) => {
    const value = (event.target as HTMLSelectElement).value;
    if ((IMAGE_SIZE_PRESETS as readonly string[]).includes(value)) imagePreset = value as ImageSizePreset;
    paintSizes(controller);
  }, { signal });
  panel.querySelector<HTMLSelectElement>("#video-size")?.addEventListener("change", (event) => {
    const value = (event.target as HTMLSelectElement).value;
    if ((VIDEO_SIZE_PRESETS as readonly string[]).includes(value)) videoPreset = value as VideoSizePreset;
    paintSizes(controller);
  }, { signal });
  panel.querySelector<HTMLSelectElement>("#gif-size")?.addEventListener("change", (event) => {
    const value = (event.target as HTMLSelectElement).value;
    if (value === "480p" || value === "720p") gifPreset = value;
    paintSizes(controller);
  }, { signal });
  panel.querySelector("#export-cancel")?.addEventListener("click", () => {
    cancelRequested = true;
    setStatus("Cancelling…");
  }, { signal });
  panel.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>("[data-export]");
    if (!button || busy) return;
    const kind = button.dataset.export;
    if (!kind) return;
    void runExport(kind as ExportKind, controller);
  }, { signal });
}

async function runExport(kind: ExportKind, controller: ExportController) {
  if (busy) return;
  busy = true;
  cancelRequested = false;
  applyBusy();
  setStatus("Rendering…");
  const fps = frameRate;
  const loopCount = loops;
  const image = imagePreset;
  const video = videoPreset;
  const gif = gifPreset;
  const longJob = kind !== "png" && kind !== "png-alpha" && kind !== "jpg";
  if (longJob) startProgress();
  try {
    await controller.prepare();
    if (cancelRequested) throw new ExportCancelled();
    const stage = controller.stageSize();
    if (stage.width < 2 || stage.height < 2) throw new Error("Export failed");
    const state = controller.state();
    const fitted = { ...state, masterScale: state.masterScale * (stage.scale || 1) };
    const progress = (message: string) => setStatus(message);
    const shouldStop = () => cancelRequested;

    if (kind === "png" || kind === "png-alpha" || kind === "jpg") {
      await exportStill({
        draws: controller.draws(),
        state,
        stageWidth: stage.width,
        stageHeight: stage.height,
        preset: image,
        kind: kind === "jpg" ? "jpg" : "png",
        transparent: kind === "png-alpha",
      });
      setStatus(kind === "jpg" ? "Exported JPG." : kind === "png-alpha" ? "Exported transparent PNG." : "Exported PNG.");
      playNotify();
      return;
    }

    const shared = {
      state: fitted,
      stageWidth: stage.width,
      stageHeight: stage.height,
      fps,
      loops: loopCount,
      shouldStop,
      onProgress: progress,
    };
    const note =
      kind === "png-seq"
        ? await exportSequence({ ...shared, preset: image, kind: "png", transparent: false })
        : kind === "jpg-seq"
          ? await exportSequence({ ...shared, preset: image, kind: "jpg", transparent: false })
          : kind === "mp4"
            ? await exportMp4({ ...shared, preset: video })
            : kind === "gif"
              ? await exportGif({ ...shared, preset: gif })
              : await exportMov({ ...shared, preset: video, transparent: kind === "mov-alpha" });
    setStatus(doneMessage(note, fps));
    playCelebrate();
  } catch (error) {
    if (error instanceof ExportCancelled || cancelRequested) {
      setStatus("Cancelled.");
      playCaution();
    } else {
      setStatus(error instanceof Error ? error.message : "Export failed");
      playCaution();
    }
  } finally {
    stopProgress();
    busy = false;
    cancelRequested = false;
    applyBusy();
  }
}
