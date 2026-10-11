/** Seekable GIF frame tracks for offline export (canvas drawImage won't animate <img>). */

import { isGifSrc } from "../trim";
import type { Slot } from "../types";

export type GifTrack = {
  frames: ImageBitmap[];
  /** Per-frame duration in ms. */
  durations: number[];
  /** Full loop length in ms. */
  duration: number;
};

const tracks = new Map<string, Promise<GifTrack | null>>();

function decoderAvailable(): boolean {
  return typeof ImageDecoder !== "undefined" && typeof createImageBitmap === "function";
}

/** Pick the frame that should show at `timeMs` (loops). */
export function gifFrameAt(track: GifTrack, timeMs: number): ImageBitmap {
  const frames = track.frames;
  if (frames.length === 0) throw new Error("Empty GIF track");
  if (frames.length === 1 || track.duration <= 0) return frames[0]!;
  let t = timeMs % track.duration;
  if (t < 0) t += track.duration;
  let acc = 0;
  for (let i = 0; i < frames.length; i++) {
    acc += track.durations[i]!;
    if (t < acc) return frames[i]!;
  }
  return frames[frames.length - 1]!;
}

async function decodeGifTrack(src: string): Promise<GifTrack | null> {
  if (!src || !decoderAvailable()) return null;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    const decoder = new ImageDecoder({ data, type: "image/gif", preferAnimation: true });
    await decoder.tracks.ready;
    // frameCount can still grow until the demux finishes.
    if (!decoder.complete) await decoder.completed;
    const track = decoder.tracks.selectedTrack;
    if (!track || track.frameCount < 1) {
      decoder.close();
      return null;
    }
    const frames: ImageBitmap[] = [];
    const durations: number[] = [];
    for (let i = 0; i < track.frameCount; i++) {
      const { image } = await decoder.decode({ frameIndex: i });
      try {
        // ImageDecoder durations are microseconds.
        durations.push(Math.max(20, (image.duration ?? 100_000) / 1000));
        frames.push(await createImageBitmap(image));
      } finally {
        image.close();
      }
    }
    decoder.close();
    if (!frames.length) return null;
    const duration = durations.reduce((sum, ms) => sum + ms, 0);
    return { frames, durations, duration };
  } catch {
    return null;
  }
}

/** Decode once per src on success. Failures are not cached so a later export can retry. */
export function loadGifTrack(src: string): Promise<GifTrack | null> {
  if (!src) return Promise.resolve(null);
  let pending = tracks.get(src);
  if (!pending) {
    pending = decodeGifTrack(src).then((track) => {
      if (!track) tracks.delete(src);
      return track;
    });
    tracks.set(src, pending);
  }
  return pending;
}

/** Warm GIF tracks before a long export so the first paint isn't racing the encoder. */
export async function warmGifTracks(slots: readonly Slot[]): Promise<void> {
  const srcs = new Set<string>();
  for (const slot of slots) {
    if (slot.kind !== "image" || !slot.src || slot.emoji || slot.youtube || slot.video) continue;
    if (isGifSrc(slot.src, slot.name)) srcs.add(slot.src);
  }
  await Promise.all([...srcs].map((src) => loadGifTrack(src)));
}
