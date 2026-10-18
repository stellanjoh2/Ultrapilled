import type { ChipDraw } from "./chipKinds";
import { paintFrame, type PaintScene } from "./export/paint";
import type { AppState, BackgroundSettings } from "./types";

/** Soft cap for Messenger / OG share stills. */
export const SHARE_OG_MAX_BYTES = 200 * 1024;
/** Longest edge — keeps JPEG well under the byte budget. */
export const SHARE_OG_MAX_EDGE = 720;

export function shareOgSize(frame: { width: number; height: number }): { width: number; height: number } {
  const fw = Math.max(1, frame.width);
  const fh = Math.max(1, frame.height);
  const fit = Math.min(1, SHARE_OG_MAX_EDGE / Math.max(fw, fh));
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

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function encodeUnderCap(canvas: HTMLCanvasElement): Promise<string | null> {
  for (const quality of [0.72, 0.6, 0.48, 0.36, 0.28]) {
    const blob = await canvasToJpegBlob(canvas, quality);
    if (!blob || blob.size === 0) continue;
    if (blob.size > SHARE_OG_MAX_BYTES) continue;
    return blobToBase64(blob);
  }
  return null;
}

/**
 * Paint the live canvas to a JPEG under ~200 KB (base64 without data: prefix).
 * Returns null if painting fails — share still works without a preview.
 */
export async function paintShareOgJpeg(args: {
  draws: ChipDraw[];
  state: AppState;
  background: BackgroundSettings;
  stageWidth: number;
  stageHeight: number;
}): Promise<string | null> {
  let size = shareOgSize({ width: args.stageWidth, height: args.stageHeight });
  for (let pass = 0; pass < 2; pass++) {
    const canvas = document.createElement("canvas");
    await paintFrame(
      canvas,
      args.draws,
      sceneOf(
        args.state,
        args.background,
        args.stageWidth,
        args.stageHeight,
        size.width,
        size.height,
      ),
    );
    const encoded = await encodeUnderCap(canvas);
    if (encoded) return encoded;
    size = {
      width: Math.max(2, Math.round(size.width * 0.7)),
      height: Math.max(2, Math.round(size.height * 0.7)),
    };
  }
  return null;
}
