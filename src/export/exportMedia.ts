import { zipSync } from "fflate";
import type { ChipDraw, ChipPose } from "../chipKinds";
import { getPrefs } from "../prefs";
import type { AppState } from "../types";
import { AAC_PACKET_SAMPLES, mixBounceTrack } from "./bounceAudio";
import { writeFrameFile } from "./frameFolder";
import { paintFrame } from "./paint";
import { ExportCancelled, renderLoop, yieldToUi } from "./simulate";
import {
  frameSize,
  type FrameRate,
  type GifPreset,
  type ImageSizePreset,
  type LoopCount,
  type VideoSizePreset,
} from "./size";

const GIF_QUALITY = 90;

export type LoopResult = { frames: number; limited: boolean; truncated: boolean };

type LoopRequest = {
  state: AppState;
  stageWidth: number;
  stageHeight: number;
  width: number;
  height: number;
  fps: FrameRate;
  loops: LoopCount;
  transparent: boolean;
  poses?: ChipPose[];
  replayFall?: boolean;
  frame?: { width: number; height: number };
  canvas?: HTMLCanvasElement;
  onFrame: (canvas: HTMLCanvasElement, index: number) => Promise<void | false> | void | false;
  shouldStop?: () => boolean;
  onProgress?: (message: string) => void;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Export failed"));
    }, type, quality);
  });
}

function frameName(index: number, ext: string): string {
  return `ultrapilled-frame${String(index).padStart(4, "0")}.${ext}`;
}

function sceneOf(
  state: AppState,
  stageWidth: number,
  stageHeight: number,
  width: number,
  height: number,
  transparent: boolean,
) {
  return {
    width,
    height,
    stageWidth,
    stageHeight,
    stageColor: state.stageColor,
    background: state.background,
    canvas: state.canvas,
    theme: state.theme,
    post: state.post,
    transparent,
    layoutMode: Boolean(state.physics.layoutMode),
    pillPad: state.pillPad,
  };
}

/**
 * Fall-from-above parks the pile above y=0. Opaque stills still show the stage;
 * transparent ones would download empty. When nothing intersects the stage, slide
 * the pile into frame for the still only.
 */
function drawsForTransparentStill(draws: ChipDraw[], stageWidth: number, stageHeight: number): ChipDraw[] {
  if (draws.length === 0 || stageWidth < 2 || stageHeight < 2) return draws;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const chip of draws) {
    const pad = Math.max(chip.width, chip.height);
    minX = Math.min(minX, chip.x - pad);
    minY = Math.min(minY, chip.y - pad);
    maxX = Math.max(maxX, chip.x + pad);
    maxY = Math.max(maxY, chip.y + pad);
  }
  if (!(Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY))) {
    return draws;
  }
  const hitsStage = maxX > 0 && minX < stageWidth && maxY > 0 && minY < stageHeight;
  if (hitsStage) return draws;
  const dx = stageWidth / 2 - (minX + maxX) / 2;
  const dy = stageHeight / 2 - (minY + maxY) / 2;
  return draws.map((chip) => ({ ...chip, x: chip.x + dx, y: chip.y + dy }));
}

export async function exportStill(options: {
  draws: ChipDraw[];
  state: AppState;
  stageWidth: number;
  stageHeight: number;
  preset: ImageSizePreset;
  kind: "png" | "jpg";
  transparent: boolean;
}): Promise<void> {
  const { width, height } = frameSize(options.stageWidth, options.stageHeight, options.preset);
  const canvas = document.createElement("canvas");
  const draws =
    options.transparent && options.kind === "png"
      ? drawsForTransparentStill(options.draws, options.stageWidth, options.stageHeight)
      : options.draws;
  await paintFrame(
    canvas,
    draws,
    sceneOf(options.state, options.stageWidth, options.stageHeight, width, height, options.transparent),
  );
  if (options.kind === "jpg") {
    downloadBlob(await canvasBlob(canvas, "image/jpeg", 0.92), "ultrapilled.jpg");
    return;
  }
  downloadBlob(
    await canvasBlob(canvas, "image/png"),
    options.transparent ? "ultrapilled-transparent.png" : "ultrapilled.png",
  );
}

async function runLoop(options: LoopRequest) {
  return renderLoop(options);
}

export async function exportSequence(options: {
  state: AppState;
  stageWidth: number;
  stageHeight: number;
  preset: ImageSizePreset;
  kind: "png" | "jpg";
  transparent: boolean;
  fps: FrameRate;
  loops: LoopCount;
  poses?: ChipPose[];
  replayFall?: boolean;
  frame?: { width: number; height: number };
  folder?: FileSystemDirectoryHandle;
  shouldStop?: () => boolean;
  onProgress?: (message: string) => void;
}): Promise<LoopResult> {
  const { width, height } = frameSize(options.stageWidth, options.stageHeight, options.preset);
  const ext = options.kind === "jpg" ? "jpg" : "png";
  const type = options.kind === "jpg" ? "image/jpeg" : "image/png";
  const files: Record<string, Uint8Array> = {};
  const toFolder = Boolean(options.folder);
  const result = await runLoop({
    state: options.state,
    stageWidth: options.stageWidth,
    stageHeight: options.stageHeight,
    width,
    height,
    fps: options.fps,
    loops: options.loops,
    transparent: options.kind === "png" && options.transparent,
    poses: options.poses,
    replayFall: options.replayFall,
    frame: options.frame,
    shouldStop: options.shouldStop,
    onProgress: options.onProgress,
    onFrame: async (canvas, index) => {
      const blob = await canvasBlob(canvas, type, options.kind === "jpg" ? 0.92 : undefined);
      const name = frameName(index, ext);
      if (options.folder) {
        await writeFrameFile(options.folder, name, blob);
        return;
      }
      files[name] = new Uint8Array(await blob.arrayBuffer());
    },
  });
  if (result.frames === 0) throw new Error("Export failed");
  if (toFolder) return { ...result, truncated: false };
  options.onProgress?.("Packaging…");
  await yieldToUi();
  const zipped = zipSync(files, { level: 0 });
  const copy = zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength);
    downloadBlob(new Blob([copy]), options.kind === "jpg" ? "ultrapilled-jpg.zip" : "ultrapilled-png.zip");
  return { ...result, truncated: false };
}

async function exportVideo(options: {
  state: AppState;
  stageWidth: number;
  stageHeight: number;
  preset: VideoSizePreset;
  fps: FrameRate;
  loops: LoopCount;
  transparent: boolean;
  format: "mp4" | "mov";
  poses?: ChipPose[];
  replayFall?: boolean;
  frame?: { width: number; height: number };
  shouldStop?: () => boolean;
  onProgress?: (message: string) => void;
}): Promise<LoopResult> {
  const prefs = getPrefs();
  const {
    canEncodeAudio,
    Quality,
  } = await import("mediabunny");
  const audioQuality = new Quality("high");
  const canAudio =
    prefs.soundOn &&
    prefs.bounceSounds &&
    prefs.soundVolume > 0 &&
    (await canEncodeAudio("aac", { numberOfChannels: 2, sampleRate: 44100, quality: audioQuality }));

  // Prefer audio+video; if the mux comes out short (players freeze on frame 0), retry video-only.
  if (canAudio) {
    try {
      return await encodeVideoFile({ ...options, withAudio: true });
    } catch (error) {
      if (error instanceof ExportCancelled) throw error;
      options.onProgress?.("Audio mux failed — exporting video only…");
    }
  }
  return encodeVideoFile({ ...options, withAudio: false });
}

let proresEncoderReady: Promise<void> | null = null;

function ensureProResEncoder(): Promise<void> {
  proresEncoderReady ??= import("prores-wasm-encoder/mediabunny").then(({ registerProResEncoder }) => {
    registerProResEncoder();
  });
  return proresEncoderReady;
}

async function encodeVideoFile(options: {
  state: AppState;
  stageWidth: number;
  stageHeight: number;
  preset: VideoSizePreset;
  fps: FrameRate;
  loops: LoopCount;
  transparent: boolean;
  format: "mp4" | "mov";
  withAudio: boolean;
  poses?: ChipPose[];
  replayFall?: boolean;
  frame?: { width: number; height: number };
  shouldStop?: () => boolean;
  onProgress?: (message: string) => void;
}): Promise<LoopResult> {
  const { width, height } = frameSize(options.stageWidth, options.stageHeight, options.preset);
  const {
    Output,
    Mp4OutputFormat,
    MovOutputFormat,
    BufferTarget,
    CanvasSource,
    AudioBufferSource,
    Quality,
    canEncodeVideo,
    Input,
    ALL_FORMATS,
    BlobSource,
  } = await import("mediabunny");

  const videoQuality = new Quality("high");
  const audioQuality = new Quality("high");
  type VideoCodec = "avc" | "prores" | "hevc" | "vp9";
  let codec: VideoCodec;
  let fullCodecString: string | undefined;
  if (options.format === "mov") {
    await ensureProResEncoder();
    // ap4h = ProRes 4444 (alpha); apch = ProRes 422 HQ (opaque editing master).
    fullCodecString = options.transparent ? "ap4h" : "apch";
    const proresOk = await canEncodeVideo("prores", {
      width,
      height,
      quality: videoQuality,
      fullCodecString,
      ...(options.transparent ? { alpha: "keep" as const } : {}),
    });
    if (proresOk) {
      codec = "prores";
    } else if (options.transparent) {
      codec = await (async () => {
        for (const next of ["hevc", "vp9"] as const) {
          if (await canEncodeVideo(next, { alpha: "keep", quality: videoQuality, width, height })) return next;
        }
        throw new Error("Transparent MOV needs ProRes, HEVC, or VP9 with alpha");
      })();
      fullCodecString = undefined;
    } else if (await canEncodeVideo("avc", { width, height })) {
      codec = "avc";
      fullCodecString = undefined;
    } else {
      throw new Error("MOV export needs ProRes or H.264 in this browser");
    }
  } else {
    if (!(await canEncodeVideo("avc", { width, height }))) {
      throw new Error("MP4 export needs H.264 in this browser");
    }
    codec = "avc";
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d", { alpha: true, willReadFrequently: true });
  const output = new Output({
    format:
      options.format === "mp4"
        ? new Mp4OutputFormat({ fastStart: "in-memory" })
        : new MovOutputFormat(),
    target: new BufferTarget(),
  });
  const video = new CanvasSource(canvas, {
    codec,
    quality: videoQuality,
    keyFrameInterval: 1 / options.fps,
    ...(fullCodecString ? { fullCodecString } : {}),
    ...(options.transparent ? { alpha: "keep" as const } : {}),
  });
  output.addVideoTrack(video, { frameRate: options.fps });
  const audio = options.withAudio
    ? new AudioBufferSource({ codec: "aac", quality: audioQuality }, { startTimestamp: 0 })
    : null;
  if (audio) output.addAudioTrack(audio);
  await output.start();

  try {
    const frameDuration = 1 / options.fps;
    const result = await runLoop({
      state: options.state,
      stageWidth: options.stageWidth,
      stageHeight: options.stageHeight,
      width,
      height,
      fps: options.fps,
      loops: options.loops,
      transparent: options.transparent,
      poses: options.poses,
      replayFall: options.replayFall,
      frame: options.frame,
      canvas,
      shouldStop: options.shouldStop,
      onProgress: options.onProgress,
      onFrame: async (_frame, index) => {
        await video.add(index * frameDuration, frameDuration);
      },
    });
    if (result.frames === 0) throw new Error("Export failed");
    const contentDurationSec = result.frames / options.fps;
    if (audio) {
      // Hold the last painted frame long enough to cover AAC packet padding so
      // players don't flash a black frame past the video track (breaks loops).
      const padFrames = Math.max(1, Math.ceil((AAC_PACKET_SAMPLES / 44100) * options.fps));
      for (let i = 0; i < padFrames; i++) {
        await video.add((result.frames + i) * frameDuration, frameDuration);
      }
      options.onProgress?.("Mixing bounce audio…");
      const mixed = await mixBounceTrack(result.impacts, contentDurationSec);
      if (mixed.duration > contentDurationSec + 1e-3) {
        throw new Error("Bounce audio bed longer than video");
      }
      await audio.add(mixed);
    }
    options.onProgress?.("Packaging…");
    await output.finalize();
    const buffer = output.target.buffer;
    if (!buffer) throw new Error("Export failed");

    // Short AAC tracks make players stop on frame 0 — looks like a frozen export.
    if (audio) {
      const input = new Input({
        formats: ALL_FORMATS,
        source: new BlobSource(new Blob([buffer], { type: "video/mp4" })),
      });
      const outDuration = await input.computeDuration();
      if (outDuration < contentDurationSec * 0.5) {
        throw new Error("Export duration too short after audio mux");
      }
    }

    const filename = options.transparent ? "ultrapilled-transparent.mov" : `ultrapilled.${options.format}`;
    const mime = options.format === "mp4" ? "video/mp4" : "video/quicktime";
    downloadBlob(new Blob([buffer], { type: mime }), filename);
    return { frames: result.frames, limited: result.limited, truncated: false };
  } catch (error) {
    await output.cancel().catch(() => undefined);
    throw error;
  }
}

export function exportMp4(options: {
  state: AppState;
  stageWidth: number;
  stageHeight: number;
  preset: VideoSizePreset;
  fps: FrameRate;
  loops: LoopCount;
  poses?: ChipPose[];
  replayFall?: boolean;
  frame?: { width: number; height: number };
  shouldStop?: () => boolean;
  onProgress?: (message: string) => void;
}): Promise<LoopResult> {
  return exportVideo({ ...options, format: "mp4", transparent: false });
}

export function exportMov(options: {
  state: AppState;
  stageWidth: number;
  stageHeight: number;
  preset: VideoSizePreset;
  fps: FrameRate;
  loops: LoopCount;
  transparent: boolean;
  poses?: ChipPose[];
  replayFall?: boolean;
  frame?: { width: number; height: number };
  shouldStop?: () => boolean;
  onProgress?: (message: string) => void;
}): Promise<LoopResult> {
  return exportVideo({ ...options, format: "mov" });
}

type GifWorkerResult = { ok: true; bytes: ArrayBuffer } | { ok: false; message: string };

function encodeGif(frames: ImageData[], width: number, height: number, fps: FrameRate): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./gifskiEncoder.worker.ts", import.meta.url), { type: "module" });
    const buffers = frames.map((frame) => frame.data.buffer);
    if (buffers.length === 1) buffers.push(buffers[0].slice(0));
    worker.onmessage = (event: MessageEvent<GifWorkerResult>) => {
      worker.terminate();
      if (event.data.ok) {
        resolve(new Uint8Array(event.data.bytes));
        return;
      }
      reject(new Error(event.data.message));
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error("GIF export failed"));
    };
    worker.postMessage({ frames: buffers, width, height, fps, quality: GIF_QUALITY }, buffers);
  });
}

export async function exportGif(options: {
  state: AppState;
  stageWidth: number;
  stageHeight: number;
  preset: GifPreset;
  fps: FrameRate;
  loops: LoopCount;
  poses?: ChipPose[];
  replayFall?: boolean;
  frame?: { width: number; height: number };
  shouldStop?: () => boolean;
  onProgress?: (message: string) => void;
}): Promise<LoopResult> {
  const { width, height } = frameSize(options.stageWidth, options.stageHeight, options.preset);
  const frames: ImageData[] = [];
  const result = await runLoop({
    state: options.state,
    stageWidth: options.stageWidth,
    stageHeight: options.stageHeight,
    width,
    height,
    fps: options.fps,
    loops: options.loops,
    transparent: false,
    poses: options.poses,
    replayFall: options.replayFall,
    frame: options.frame,
    shouldStop: options.shouldStop,
    onProgress: options.onProgress,
    onFrame: (canvas) => {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("GIF export failed");
      frames.push(ctx.getImageData(0, 0, width, height));
    },
  });
  if (frames.length === 0) throw new Error("GIF export failed");
  options.onProgress?.("Encoding GIF…");
  await yieldToUi();
  const bytes = await encodeGif(frames, width, height, options.fps);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  downloadBlob(new Blob([copy], { type: "image/gif" }), "ultrapilled.gif");
  return { frames: frames.length, limited: result.limited, truncated: false };
}
