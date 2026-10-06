import { sceneSkipsRasterCapture, type ChipDraw, type ChipPose } from "../chipKinds";
import type { AppState } from "../types";
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
  type VideoSizePreset,
} from "./size";
import { defaultPillFileName, isPillFile } from "../project/pillFormat";
import { askConfirm } from "../confirmDialog";
import { playCaution, playCelebrate, playNotify, startProgress, stopProgress } from "../uiSounds";
import { closeExportProgress, openExportProgress, setExportFrame } from "./exportProgress";
import { canPickFrameFolder, pickFrameFolder } from "./frameFolder";

export type ExportController = {
  prepare(): Promise<void>;
  stageSize(): { width: number; height: number; scale: number };
  draws(): ChipDraw[];
  poses(): ChipPose[];
  /** True when poses are the last fall’s start layout (replay instead of redeploy). */
  replayFall(): boolean;
  state(): AppState;
  saveProject(): void | Promise<void>;
  loadProject(file: File): Promise<void>;
};

type ExportKind = "png" | "png-alpha" | "png-seq" | "jpg" | "jpg-seq" | "mp4" | "gif" | "mov" | "mov-alpha";
type ImageFormat = "png" | "jpg";
type ImageOutput = "still" | "sequence";
type VideoFormat = "mp4" | "mov";

let frameRate: FrameRate = 30;
let imagePreset: ImageSizePreset = "1080p";
let videoPreset: VideoSizePreset = "1080p";
let gifPreset: GifPreset = "480p";
let imageFormat: ImageFormat = "png";
let imageTransparent = false;
let imageOutput: ImageOutput = "still";
let videoFormat: VideoFormat = "mp4";
let videoTransparent = false;
let busy = false;
let cancelRequested = false;
let lastStatus = "";
let panelEl: HTMLElement | null = null;
let mountAbort = new AbortController();
let fileInput: HTMLInputElement | null = null;
const FRAME_PROGRESS = /^Rendering frame (\d+)$/;

function setStatus(message: string) {
  lastStatus = message;
  const node = panelEl?.querySelector("#export-status");
  if (node) node.textContent = message;
  const match = FRAME_PROGRESS.exec(message);
  if (match) setExportFrame(Number(match[1]));
}

function applyBusy() {
  panelEl
    ?.querySelectorAll<HTMLButtonElement>(
      "[data-export], [data-fps], [data-image-format], [data-image-alpha], [data-image-output], [data-video-format], [data-video-alpha], #export-save-pill, #export-load-pill",
    )
    .forEach((button) => {
      button.disabled = busy;
    });
  panelEl?.querySelectorAll<HTMLSelectElement>("select").forEach((select) => {
    select.disabled = busy;
  });
  if (!busy) paintChoices();
}

function paintChoices() {
  if (imageFormat === "jpg") imageTransparent = false;
  if (videoFormat === "mp4") videoTransparent = false;

  panelEl?.querySelectorAll<HTMLButtonElement>("[data-fps]").forEach((button) => {
    const on = Number(button.dataset.fps) === frameRate;
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", String(on));
  });
  panelEl?.querySelectorAll<HTMLButtonElement>("[data-image-format]").forEach((button) => {
    const on = button.dataset.imageFormat === imageFormat;
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", String(on));
  });
  panelEl?.querySelectorAll<HTMLButtonElement>("[data-image-alpha]").forEach((button) => {
    const on = (button.dataset.imageAlpha === "1") === imageTransparent;
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", String(on));
    button.disabled = busy || imageFormat === "jpg";
  });
  panelEl?.querySelectorAll<HTMLButtonElement>("[data-image-output]").forEach((button) => {
    const on = button.dataset.imageOutput === imageOutput;
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", String(on));
  });
  panelEl?.querySelectorAll<HTMLButtonElement>("[data-video-format]").forEach((button) => {
    const on = button.dataset.videoFormat === videoFormat;
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", String(on));
  });
  panelEl?.querySelectorAll<HTMLButtonElement>("[data-video-alpha]").forEach((button) => {
    const on = (button.dataset.videoAlpha === "1") === videoTransparent;
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", String(on));
    button.disabled = busy || videoFormat === "mp4";
  });

  const seqHint = panelEl?.querySelector("#seq-folder-hint");
  if (seqHint instanceof HTMLElement) {
    seqHint.hidden = imageOutput !== "sequence";
  }
}

function sizeLine(controller: ExportController, preset: ImageSizePreset | GifPreset): string {
  const stage = controller.stageSize();
  const { width, height } = frameSize(stage.width, stage.height, preset);
  return `${width}×${height}`;
}

function paintSizes(controller: ExportController) {
  const stage = controller.stageSize();
  const image = panelEl?.querySelector("#image-size-meta");
  const video = panelEl?.querySelector("#video-size-meta");
  const gif = panelEl?.querySelector("#gif-size-meta");
  if (image) image.textContent = sizeLine(controller, imagePreset);
  if (video) video.textContent = sizeLine(controller, videoPreset);
  if (gif) gif.textContent = sizeLine(controller, gifPreset);
  paintSelectOptions("#image-size", IMAGE_SIZE_PRESETS, imagePreset, stage);
  paintSelectOptions("#video-size", VIDEO_SIZE_PRESETS, videoPreset, stage);
}

function doneMessage(note: LoopResult, fps: FrameRate, toFolder = false): string {
  const count = `${note.frames} ${note.frames === 1 ? "frame" : "frames"} at ${fps} fps`;
  if (toFolder) return `Wrote ${count} to the folder.`;
  if (note.truncated) return `Exported ${count}. GIF stopped early so the tab could encode it.`;
  if (note.limited) return `Exported ${count}. Stopped at the frame limit.`;
  return `Exported ${count}.`;
}

function optionsHtml(
  presets: readonly string[],
  selected: string,
  stage?: { width: number; height: number },
): string {
  return presets
    .map(
      (preset) =>
        `<option value="${preset}"${preset === selected ? " selected" : ""}>${sizeLabel(preset as ImageSizePreset | GifPreset, stage)}</option>`,
    )
    .join("");
}

function paintSelectOptions(
  id: string,
  presets: readonly string[],
  selected: string,
  stage: { width: number; height: number },
) {
  const select = panelEl?.querySelector<HTMLSelectElement>(id);
  if (!select) return;
  const focus = document.activeElement === select;
  select.innerHTML = optionsHtml(presets, selected, stage);
  if (focus) select.focus();
}

function imageKind(): ExportKind {
  if (imageOutput === "sequence") return imageFormat === "jpg" ? "jpg-seq" : "png-seq";
  if (imageFormat === "jpg") return "jpg";
  return imageTransparent ? "png-alpha" : "png";
}

function videoKind(): ExportKind {
  if (videoFormat === "mp4") return "mp4";
  return videoTransparent ? "mov-alpha" : "mov";
}

function panelHtml(): string {
  return `
    <section class="section">
      <h2 data-tip="Save or open the full scene as a .pill project">Project</h2>
      <div class="export-list">
        <button type="button" class="pill" id="export-save-pill" data-tip="Download the scene as a .pill file">Save .pill</button>
        <button type="button" class="pill" id="export-load-pill" data-tip="Open a .pill scene file">Load .pill</button>
      </div>
    </section>
    <section class="section">
      <h2 data-tip="Frames per second for sequences and video">Frame rate</h2>
      <div class="segment" role="group" aria-label="Frame rate">
        <button type="button" class="pill${frameRate === 30 ? " is-on" : ""}" data-fps="30" aria-pressed="${frameRate === 30}" data-tip="Smaller files, fine for most uses">30 fps</button>
        <button type="button" class="pill${frameRate === 60 ? " is-on" : ""}" data-fps="60" aria-pressed="${frameRate === 60}" data-tip="Smoother motion, much larger files">60 fps</button>
      </div>
      <p class="hint">Stills are the canvas right now. Sequences and video fall the current scene. 60 fps files are much larger.</p>
    </section>
    <section class="section">
      <h2 data-tip="Still frames and image sequences">Images</h2>
      <label class="field" data-tip="Pixel size for PNG and JPG exports. Up to 8K for stills and sequences.">Resolution
        <select id="image-size">${optionsHtml(IMAGE_SIZE_PRESETS, imagePreset)}</select>
      </label>
      <p class="hint" id="image-size-meta"></p>
      <h2 data-tip="Image file type">Format</h2>
      <div class="segment" role="group" aria-label="Image format">
        <button type="button" class="pill" data-image-format="png" data-tip="Lossless image">.PNG</button>
        <button type="button" class="pill" data-image-format="jpg" data-tip="Smaller photo-style image">.JPG</button>
      </div>
      <h2 data-tip="Keep the background clear in the file">Transparent</h2>
      <div class="segment" role="group" aria-label="Image transparency">
        <button type="button" class="pill" data-image-alpha="0" data-tip="Keep the composition background">No</button>
        <button type="button" class="pill" data-image-alpha="1" data-tip="Clear background. PNG only.">Yes</button>
      </div>
      <h2 data-tip="One frame now, or every frame of a fall">Output</h2>
      <div class="segment" role="group" aria-label="Image output">
        <button type="button" class="pill" data-image-output="still" data-tip="Save the current canvas">Still</button>
        <button type="button" class="pill" data-image-output="sequence" data-tip="Save every frame of a new loop">Sequence</button>
      </div>
      <p class="hint" id="seq-folder-hint"></p>
      <div class="export-list">
        <button type="button" class="pill" data-export="image" data-tip="Export with the image settings above">Export</button>
      </div>
    </section>
    <section class="section">
      <h2 data-tip="Rendered video of a full loop">Video</h2>
      <label class="field" data-tip="Pixel size for MP4 and MOV. Up to 4K.">Resolution
        <select id="video-size">${optionsHtml(VIDEO_SIZE_PRESETS, videoPreset)}</select>
      </label>
      <p class="hint" id="video-size-meta"></p>
      <h2 data-tip="Video file type">Format</h2>
      <div class="segment" role="group" aria-label="Video format">
        <button type="button" class="pill" data-video-format="mp4" data-tip="Wide compatibility. Includes bounce sounds when Sound is on.">.MP4</button>
        <button type="button" class="pill" data-video-format="mov" data-tip="Good for editing apps. Includes bounce sounds when Sound is on.">.MOV</button>
      </div>
      <h2 data-tip="Keep the background clear in the file">Transparent</h2>
      <div class="segment" role="group" aria-label="Video transparency">
        <button type="button" class="pill" data-video-alpha="0" data-tip="Keep the composition background">No</button>
        <button type="button" class="pill" data-video-alpha="1" data-tip="Clear background. MOV only.">Yes</button>
      </div>
      <div class="export-list">
        <button type="button" class="pill" data-export="video" data-tip="Export with the video settings above">Export</button>
      </div>
      <h2 data-tip="Animated GIF of a loop">.GIF</h2>
      <label class="field" data-tip="GIF pixel size. Long loops may stop early to stay small.">Resolution
        <select id="gif-size">${optionsHtml(GIF_PRESETS, gifPreset)}</select>
      </label>
      <p class="hint" id="gif-size-meta"></p>
      <p class="hint">Same frame rate. If the loop is long, the GIF stops before it gets too large.</p>
      <div class="export-list">
        <button type="button" class="pill" data-export="gif" data-tip="Render a new loop to a GIF">Export</button>
      </div>
    </section>
    <p class="hint" id="export-status" role="status"></p>
  `;
}

export function mountExportPanel(panel: HTMLElement, controller: ExportController, scroll: number) {
  panelEl = panel;
  panel.innerHTML = panelHtml();
  setStatus(lastStatus);
  const seqHint = panel.querySelector("#seq-folder-hint");
  if (seqHint) {
    seqHint.textContent = canPickFrameFolder()
      ? ".PNG and .JPG sequences ask for a folder, then write each frame there."
      : ".PNG and .JPG sequences download as a zip.";
  }
  paintChoices();
  paintSizes(controller);
  applyBusy();
  panel.scrollTop = scroll;

  mountAbort.abort();
  mountAbort = new AbortController();
  const signal = mountAbort.signal;
  window.addEventListener("resize", () => paintSizes(controller), { signal });

  panel.querySelectorAll<HTMLButtonElement>("[data-fps]").forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        frameRate = Number(button.dataset.fps) === 60 ? 60 : 30;
        paintChoices();
      },
      { signal },
    );
  });
  panel.querySelectorAll<HTMLButtonElement>("[data-image-format]").forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        imageFormat = button.dataset.imageFormat === "jpg" ? "jpg" : "png";
        paintChoices();
      },
      { signal },
    );
  });
  panel.querySelectorAll<HTMLButtonElement>("[data-image-alpha]").forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        if (imageFormat === "jpg") return;
        imageTransparent = button.dataset.imageAlpha === "1";
        paintChoices();
      },
      { signal },
    );
  });
  panel.querySelectorAll<HTMLButtonElement>("[data-image-output]").forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        imageOutput = button.dataset.imageOutput === "sequence" ? "sequence" : "still";
        paintChoices();
      },
      { signal },
    );
  });
  panel.querySelectorAll<HTMLButtonElement>("[data-video-format]").forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        videoFormat = button.dataset.videoFormat === "mov" ? "mov" : "mp4";
        paintChoices();
      },
      { signal },
    );
  });
  panel.querySelectorAll<HTMLButtonElement>("[data-video-alpha]").forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        if (videoFormat === "mp4") return;
        videoTransparent = button.dataset.videoAlpha === "1";
        paintChoices();
      },
      { signal },
    );
  });
  panel.querySelector<HTMLSelectElement>("#image-size")?.addEventListener(
    "change",
    (event) => {
      const value = (event.target as HTMLSelectElement).value;
      if ((IMAGE_SIZE_PRESETS as readonly string[]).includes(value)) imagePreset = value as ImageSizePreset;
      paintSizes(controller);
    },
    { signal },
  );
  panel.querySelector<HTMLSelectElement>("#video-size")?.addEventListener(
    "change",
    (event) => {
      const value = (event.target as HTMLSelectElement).value;
      if ((VIDEO_SIZE_PRESETS as readonly string[]).includes(value)) videoPreset = value as VideoSizePreset;
      paintSizes(controller);
    },
    { signal },
  );
  panel.querySelector<HTMLSelectElement>("#gif-size")?.addEventListener(
    "change",
    (event) => {
      const value = (event.target as HTMLSelectElement).value;
      if (value === "480p" || value === "720p") gifPreset = value;
      paintSizes(controller);
    },
    { signal },
  );
  panel.querySelector("#export-save-pill")?.addEventListener(
    "click",
    () => {
      if (busy) return;
      void (async () => {
        try {
          await controller.saveProject();
          setStatus(`Saved ${defaultPillFileName()}`);
          playNotify();
        } catch {
          setStatus("Could not save the project.");
          playCaution();
        }
      })();
    },
    { signal },
  );
  if (!fileInput) {
    fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".pill,application/x-ultrapilled-project";
    fileInput.className = "bg-file";
    fileInput.hidden = true;
    document.body.append(fileInput);
  }
  fileInput.onchange = () => {
    const file = fileInput?.files?.[0];
    if (fileInput) fileInput.value = "";
    if (!file || busy) return;
    if (!isPillFile(file)) {
      setStatus("Only .pill files can be loaded.");
      playCaution();
      return;
    }
    void (async () => {
      try {
        await controller.loadProject(file);
        setStatus(`Loaded ${file.name}`);
        playNotify();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not load this .pill file.");
        playCaution();
      }
    })();
  };
  panel.querySelector("#export-load-pill")?.addEventListener(
    "click",
    () => {
      if (busy) return;
      fileInput?.click();
    },
    { signal },
  );
  panel.addEventListener(
    "click",
    (event) => {
      const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>("[data-export]");
      if (!button || busy) return;
      const action = button.dataset.export;
      if (!action) return;
      const kind =
        action === "image" ? imageKind() : action === "video" ? videoKind() : action === "gif" ? "gif" : null;
      if (!kind) return;
      void runExport(kind, controller);
    },
    { signal },
  );
}

async function runExport(kind: ExportKind, controller: ExportController) {
  if (busy) return;
  const sequence = kind === "png-seq" || kind === "jpg-seq";
  let folder: FileSystemDirectoryHandle | undefined;
  if (sequence && canPickFrameFolder()) {
    const picked = await pickFrameFolder();
    if (!picked || busy) return;
    folder = picked;
  }
  if (sceneSkipsRasterCapture(controller.state().slots)) {
    const ok = await askConfirm({
      title: "Video won’t export",
      body: "YouTube clips and uploaded videos can’t be captured. They’ll show as a play button in this file.",
      confirmLabel: "Export anyway",
      cancelLabel: "Cancel",
    });
    if (!ok || busy) return;
  }
  busy = true;
  cancelRequested = false;
  applyBusy();
  setStatus("Rendering…");
  const fps = frameRate;
  const image = imagePreset;
  const video = videoPreset;
  const gif = gifPreset;
  const longJob = kind !== "png" && kind !== "png-alpha" && kind !== "jpg";
  if (longJob) {
    startProgress();
    openExportProgress(() => {
      cancelRequested = true;
      setStatus("Cancelling…");
    }, { toFolder: Boolean(folder) });
  }
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
      loops: 1 as const,
      poses: controller.poses(),
      replayFall: controller.replayFall(),
      frame: { width: stage.width, height: stage.height },
      shouldStop,
      onProgress: progress,
    };
    const note =
      kind === "png-seq"
        ? await exportSequence({
            ...shared,
            preset: image,
            kind: "png",
            transparent: imageTransparent,
            folder,
          })
        : kind === "jpg-seq"
          ? await exportSequence({ ...shared, preset: image, kind: "jpg", transparent: false, folder })
          : kind === "mp4"
            ? await exportMp4({ ...shared, preset: video })
            : kind === "gif"
              ? await exportGif({ ...shared, preset: gif })
              : await exportMov({ ...shared, preset: video, transparent: kind === "mov-alpha" });
    setStatus(doneMessage(note, fps, Boolean(folder)));
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
    closeExportProgress();
    busy = false;
    cancelRequested = false;
    applyBusy();
  }
}
