const PREFIX = "ultrapilled.";
const LEGACY = "falldown.";

/** Read a namespaced key, copying a leftover Falldown key once if needed. */
export function lsGet(name: string): string | null {
  try {
    const current = localStorage.getItem(PREFIX + name);
    if (current != null) return current;
    const legacy = localStorage.getItem(LEGACY + name);
    if (legacy == null) return null;
    try {
      localStorage.setItem(PREFIX + name, legacy);
      localStorage.removeItem(LEGACY + name);
    } catch {
      /* still return the legacy value */
    }
    return legacy;
  } catch {
    return null;
  }
}

export function lsSet(name: string, value: string): void {
  localStorage.setItem(PREFIX + name, value);
  try {
    localStorage.removeItem(LEGACY + name);
  } catch {
    /* ignore */
  }
}

export function lsRemove(name: string): void {
  localStorage.removeItem(PREFIX + name);
  localStorage.removeItem(LEGACY + name);
}
