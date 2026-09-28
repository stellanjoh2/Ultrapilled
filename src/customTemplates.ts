import { parsePillProject, serializePillProject, type PillProject } from "./project/pillFormat";
import { uid, type AppState } from "./types";

const STORAGE_KEY = "falldown.customTemplates";

export type CustomTemplate = {
  id: string;
  label: string;
  json: string;
};

function readAll(): CustomTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
  await Promise.all(
    state.slots.map(async (slot) => {
      if (slot.kind !== "image" || !slot.src?.startsWith("blob:")) return;
      try {
        const response = await fetch(slot.src);
        const blob = await response.blob();
        slot.src = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") resolve(reader.result);
            else reject(new Error("Could not read image"));
          };
          reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
          reader.readAsDataURL(blob);
        });
      } catch {
        /* keep blob url — may not restore later */
      }
    }),
  );
  return { ...project, state };
}
