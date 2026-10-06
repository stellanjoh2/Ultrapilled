import { lsGet, lsSet } from "./legacyStorage";
import { parsePillProject, serializePillProject, type PillProject } from "./project/pillFormat";
import { uid, type AppState } from "./types";

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

/** Turn blob: slot images into data URLs so the template survives reload. */
export async function embedSlotImages(project: PillProject): Promise<PillProject> {
  const state = structuredClone(project.state);
  const pages = project.pages.map((page) => structuredClone(page));
  const cached = new Map<string, string>();

  const embedSrc = async (src: string): Promise<string> => {
    if (!src.startsWith("blob:")) return src;
    const hit = cached.get(src);
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
      cached.set(src, dataUrl);
      return dataUrl;
    } catch {
      return src;
    }
  };

  const walk = async (slots: AppState["slots"]) => {
    await Promise.all(
      slots.map(async (slot) => {
        if (slot.kind !== "image" || !slot.src) return;
        slot.src = await embedSrc(slot.src);
      }),
    );
  };

  await walk(state.slots);
  for (const page of pages) await walk(page.slots);
  return { ...project, state, pages };
}
