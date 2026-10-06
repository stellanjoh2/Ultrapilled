import { backgroundImage } from "./background";
import { lsGet, lsSet } from "./legacyStorage";
import {
  parsePillProject,
  serializePillProject,
  type PillEmbeddedImage,
  type PillProject,
} from "./project/pillFormat";
import { uid, type AppState } from "./types";

/** Session cache so draft debounces don't re-encode the same blob. */
const blobDataUrlCache = new Map<string, string>();

export type CustomTemplate = {
  id: string;
  label: string;
  json: string;
};

function readAll(): CustomTemplate[] {
  try {
    const raw = lsGet("customTemplates");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CustomTemplate => {
      if (!item || typeof item !== "object") return false;
      const record = item as Record<string, unknown>;
      return (
        typeof record.id === "string" &&
        record.id.startsWith("custom:") &&
        typeof record.label === "string" &&
        record.label.trim().length > 0 &&
        typeof record.json === "string" &&
        record.json.length > 0
      );
    });
  } catch {
    return [];
  }
}

function writeAll(items: CustomTemplate[]) {
  try {
    lsSet("customTemplates", JSON.stringify(items));
  } catch {
    throw new Error("Could not save templates");
  }
}

export function listCustomTemplates(): CustomTemplate[] {
  return readAll();
}

export function customTemplateLabel(id: string | undefined): string | undefined {
  if (!id) return undefined;
  return readAll().find((item) => item.id === id)?.label;
}

export function loadCustomTemplate(id: string): PillProject | null {
  const item = readAll().find((entry) => entry.id === id);
  if (!item) return null;
  return parsePillProject(item.json);
}

export function saveCustomTemplate(label: string, project: PillProject): CustomTemplate {
  const name = label.trim();
  if (!name) throw new Error("Name required");
  const id = `custom:${uid()}`;
  const state: AppState = { ...project.state, template: id };
  const json = serializePillProject({ ...project, state });
  const entry: CustomTemplate = { id, label: name, json };
  writeAll([...readAll(), entry]);
  return entry;
}

export function deleteCustomTemplate(id: string): boolean {
  const items = readAll();
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return false;
  writeAll(next);
  return true;
}

async function blobToDataUrl(src: string): Promise<string> {
  if (!src.startsWith("blob:")) return src;
  const hit = blobDataUrlCache.get(src);
  if (hit) return hit;
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Could not read image"));
      };
      reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
      reader.readAsDataURL(blob);
    });
    blobDataUrlCache.set(src, dataUrl);
    return dataUrl;
  } catch {
    return src;
  }
}

/**
 * Turn blob: slot / video / background images into data URLs so drafts and
 * custom templates survive reload (blob URLs die with the document).
 */
export async function embedSlotImages(project: PillProject): Promise<PillProject> {
  const state = structuredClone(project.state);
  const pages = project.pages.map((page) => structuredClone(page));

  const walk = async (slots: AppState["slots"]) => {
    await Promise.all(
      slots.map(async (slot) => {
        if (slot.kind !== "image") return;
        if (slot.src) slot.src = await blobToDataUrl(slot.src);
        if (slot.video?.src) {
          slot.video = { ...slot.video, src: await blobToDataUrl(slot.video.src) };
        }
      }),
    );
  };

  await walk(state.slots);
  for (const page of pages) await walk(page.slots);

  const images: PillEmbeddedImage[] = [];
  const seen = new Set<string>();
  const addBackground = async (id: string) => {
    if (!id || seen.has(id)) return;
    const file = backgroundImage(id);
    if (!file?.src) return;
    seen.add(id);
    images.push({
      id,
      src: await blobToDataUrl(file.src),
      name: file.name,
      width: file.width,
      height: file.height,
    });
  };
  await addBackground(state.background.imageId);
  await addBackground(state.background.logoId);
  for (const page of pages) {
    await addBackground(page.background.imageId);
    await addBackground(page.background.logoId);
  }
  for (const image of project.images) {
    if (seen.has(image.id)) continue;
    seen.add(image.id);
    images.push({ ...image, src: await blobToDataUrl(image.src) });
  }

  return { ...project, state, pages, images };
}
