import { getGiphyGif, giphyConfigured, giphyGifFile } from "./giphyApi";
import {
  getPhosphorIcon,
  parsePhosphorRemoteId,
  phosphorConfigured,
  phosphorIconFile,
  phosphorRemoteId,
} from "./phosphorApi";
import type { PillProject } from "./project/pillFormat";
import type { ImageRemote, ImageSlot, Slot } from "./types";
import { getUnsplashPhoto, unsplashConfigured, unsplashPhotoFile } from "./unsplashApi";

export function parseRemoteFromName(name: string): ImageRemote | null {
  const base = name.trim();
  const unsplash = /^unsplash-.+-([A-Za-z0-9_-]+)\.(jpe?g|png|webp|gif)$/i.exec(base);
  if (unsplash?.[1]) return { kind: "unsplash", id: unsplash[1] };
  const giphy = /^giphy-.+-([A-Za-z0-9]+)\.gif$/i.exec(base);
  if (giphy?.[1]) return { kind: "giphy", id: giphy[1] };
  const phosphorStyled = /^phosphor-(fill|regular)-([a-z0-9-]+)\.svg$/i.exec(base);
  if (phosphorStyled?.[1] && phosphorStyled[2]) {
    return {
      kind: "phosphor",
      id: phosphorRemoteId(phosphorStyled[1].toLowerCase() as "fill" | "regular", phosphorStyled[2].toLowerCase()),
    };
  }
  // Legacy bare name from the first ship = solid fill.
  const phosphor = /^phosphor-([a-z0-9-]+)\.svg$/i.exec(base);
  if (phosphor?.[1]) return { kind: "phosphor", id: phosphorRemoteId("fill", phosphor[1].toLowerCase()) };
  return null;
}

export function imageRemoteOf(slot: Pick<ImageSlot, "remote" | "name">): ImageRemote | null {
  const stored = slot.remote;
  if (
    stored &&
    (stored.kind === "unsplash" || stored.kind === "giphy" || stored.kind === "phosphor") &&
    stored.id
  ) {
    if (stored.kind === "phosphor") {
      const parsed = parsePhosphorRemoteId(stored.id);
      if (!parsed) return parseRemoteFromName(slot.name);
      return { kind: "phosphor", id: phosphorRemoteId(parsed.style, parsed.name) };
    }
    return { kind: stored.kind, id: stored.id };
  }
  return parseRemoteFromName(slot.name);
}

export function srcNeedsRelink(src: string | undefined): boolean {
  return !src || src.startsWith("blob:");
}

export async function fileForRemote(remote: ImageRemote): Promise<File | null> {
  try {
    if (remote.kind === "unsplash") {
      if (!unsplashConfigured()) return null;
      return unsplashPhotoFile(await getUnsplashPhoto(remote.id), { track: false });
    }
    if (remote.kind === "giphy") {
      if (!giphyConfigured()) return null;
      return giphyGifFile(await getGiphyGif(remote.id), { track: false });
    }
    if (!phosphorConfigured()) return null;
    return phosphorIconFile(await getPhosphorIcon(remote.id));
  } catch {
    return null;
  }
}

/** Re-fetch Unsplash / Giphy / Phosphor blobs after a refresh. Data URLs and live files stay put. */
export async function relinkProjectImages(project: PillProject): Promise<void> {
  const unique: Slot[] = [];
  const seen = new Set<Slot>();
  const add = (slots: Slot[]) => {
    for (const slot of slots) {
      if (seen.has(slot)) continue;
      seen.add(slot);
      unique.push(slot);
    }
  };
  add(project.state.slots);
  for (const page of project.pages) add(page.slots);

  const cache = new Map<string, string>();
  await Promise.all(
    unique.map(async (slot) => {
      if (slot.kind !== "image" || slot.youtube || slot.video) return;
      if (!srcNeedsRelink(slot.src)) return;
      await relinkSlotImage(slot, cache);
    }),
  );
}

/** True when the chip has no loadable pixels (dead blob after reconnect, or empty src). */
export function imageLooksMissing(slot: ImageSlot, chipEl?: HTMLElement | null): boolean {
  if (slot.youtube || slot.video || slot.emoji) return false;
  if (!slot.src) return true;
  const img = chipEl?.querySelector(":scope > img");
  if (img instanceof HTMLImageElement) return img.complete && img.naturalWidth === 0;
  // Bloom-synced GIFs paint to a canvas (no <img>).
  const canvas = chipEl?.querySelector(":scope > canvas");
  if (canvas instanceof HTMLCanvasElement) return canvas.width < 1 || canvas.height < 1;
  return slot.src.startsWith("blob:");
}

export function canRelinkSlot(slot: Slot, chipEl?: HTMLElement | null): slot is ImageSlot {
  return slot.kind === "image" && Boolean(imageRemoteOf(slot)) && imageLooksMissing(slot, chipEl);
}

/** Fetch a new blob for one Unsplash / Giphy / Phosphor chip. Leaves look, size, and pose alone. */
export async function relinkSlotImage(slot: ImageSlot, cache?: Map<string, string>): Promise<boolean> {
  if (slot.youtube || slot.video) return false;
  const remote = imageRemoteOf(slot);
  if (!remote) return false;
  const key = `${remote.kind}:${remote.id}`;
  let src = cache?.get(key);
  if (!src) {
    const file = await fileForRemote(remote);
    if (!file) return false;
    src = URL.createObjectURL(file);
    cache?.set(key, src);
  }
  slot.src = src;
  slot.remote = remote;
  return true;
}
