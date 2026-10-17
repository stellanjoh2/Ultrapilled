/** Temporary share links — share.ultrapilled.com stores opt-in .pill files for 14 days. */

import { parsePillProject, type PillProject } from "./project/pillFormat";

export const SHARE_TURNSTILE_ACTION = "share";
export const DEFAULT_SHARE_API = "https://share.ultrapilled.com";
export const LOCAL_SHARE_API = "http://localhost:8081";
export const SHARE_TTL_DAYS = 14;
export const SHARE_MAX_BYTES = 8 * 1024 * 1024;
/** Query/hash used to open a shared scene. */
export const SHARE_DEEP_LINK = "r";

export type ShareCreateResult =
  | { ok: true; id: string; expiresAt: number; url: string }
  | { ok: false; status: number; code: string; message: string };

export function shareApiUrl(): string {
  const raw = import.meta.env.VITE_SHARE_API_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  return import.meta.env.DEV ? LOCAL_SHARE_API : DEFAULT_SHARE_API;
}

export function shareIdFromUrl(url: URL | Location = window.location): string | null {
  const params = new URLSearchParams(url.search);
  const fromQuery = params.get(SHARE_DEEP_LINK)?.trim();
  if (fromQuery && isShareId(fromQuery)) return fromQuery;
  const hash = url.hash.replace(/^#/, "");
  if (hash.startsWith(`${SHARE_DEEP_LINK}=`)) {
    const value = hash.slice(SHARE_DEEP_LINK.length + 1).trim();
    if (isShareId(value)) return value;
  }
  if (hash.startsWith(`${SHARE_DEEP_LINK}/`)) {
    const value = hash.slice(SHARE_DEEP_LINK.length + 1).trim();
    if (isShareId(value)) return value;
  }
  return null;
}

export function isShareId(value: string): boolean {
  return /^[A-Za-z0-9_-]{16,64}$/.test(value);
}

/** Drop ?r= / #r= after opening so refresh doesn’t re-fetch. */
export function clearShareDeepLink(): void {
  const url = new URL(window.location.href);
  const hadQuery = url.searchParams.has(SHARE_DEEP_LINK);
  const hash = url.hash.replace(/^#/, "");
  const hadHash =
    hash === SHARE_DEEP_LINK ||
    hash.startsWith(`${SHARE_DEEP_LINK}=`) ||
    hash.startsWith(`${SHARE_DEEP_LINK}/`);
  if (!hadQuery && !hadHash) return;
  url.searchParams.delete(SHARE_DEEP_LINK);
  if (hadHash) url.hash = "";
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function shareTooLargeMessage(): string {
  return `This scene is over ${SHARE_MAX_BYTES / (1024 * 1024)} MB. Shrink or remove large GIFs and video uploads, or use Unsplash photos, then try again.`;
}

export function publicShareUrl(id: string, origin = typeof window !== "undefined" ? window.location.origin : "https://ultrapilled.com"): string {
  return `${origin.replace(/\/+$/, "")}/?${SHARE_DEEP_LINK}=${encodeURIComponent(id)}`;
}

const ERROR_COPY: Record<string, string> = {
  rate_limited: "You’re sharing a little too often. Wait a bit and try again.",
  turnstile_required: "Complete the security check, then create the link.",
  turnstile_failed: "Security check failed. Try again.",
  turnstile_unconfigured: "Share links aren’t available right now.",
  too_large: shareTooLargeMessage(),
  bad_pill: "This scene couldn’t be packed for sharing.",
  origin_denied: "Share links only work from ultrapilled.com.",
  gone: "This share link expired or was already removed.",
  not_found: "This share link expired or was already removed.",
};

export function shareErrorMessage(code: string, fallback?: string): string {
  return ERROR_COPY[code] ?? fallback ?? "Could not create a share link. Try again later.";
}

export async function createShareLink(
  projectJson: string,
  turnstileToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ShareCreateResult> {
  const bytes = utf8ByteLength(projectJson);
  if (bytes > SHARE_MAX_BYTES) {
    return { ok: false, status: 413, code: "too_large", message: shareTooLargeMessage() };
  }

  let project: unknown;
  try {
    project = JSON.parse(projectJson);
  } catch {
    return { ok: false, status: 400, code: "bad_pill", message: shareErrorMessage("bad_pill") };
  }

  let res: Response;
  try {
    res = await fetchImpl(`${shareApiUrl()}/r`, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project, turnstileToken }),
    });
  } catch {
    return {
      ok: false,
      status: 0,
      code: "network",
      message: "Couldn’t reach the share server. Check your connection and try again.",
    };
  }

  if (res.ok) {
    const data = (await res.json()) as { id?: string; expiresAt?: number };
    if (typeof data.id !== "string" || !isShareId(data.id) || typeof data.expiresAt !== "number") {
      return { ok: false, status: res.status, code: "bad_response", message: shareErrorMessage("unknown") };
    }
    return {
      ok: true,
      id: data.id,
      expiresAt: data.expiresAt,
      url: publicShareUrl(data.id),
    };
  }

  let err: { error?: string; code?: string } = {};
  try {
    err = (await res.json()) as typeof err;
  } catch {
    err = {};
  }
  const code = err.code ?? (res.status === 413 ? "too_large" : res.status === 429 ? "rate_limited" : "unknown");
  return {
    ok: false,
    status: res.status,
    code,
    message: shareErrorMessage(code, err.error),
  };
}

export async function fetchShareProject(id: string, fetchImpl: typeof fetch = fetch): Promise<PillProject> {
  if (!isShareId(id)) {
    throw Object.assign(new Error(shareErrorMessage("gone")), { code: "gone" });
  }
  let res: Response;
  try {
    res = await fetchImpl(`${shareApiUrl()}/r/${encodeURIComponent(id)}`, { credentials: "omit" });
  } catch {
    throw Object.assign(new Error("Couldn’t reach the share server."), { code: "network" });
  }
  if (res.status === 410 || res.status === 404) {
    throw Object.assign(new Error(shareErrorMessage("gone")), { code: "gone" });
  }
  if (!res.ok) {
    let code = "unknown";
    try {
      const err = (await res.json()) as { code?: string };
      if (err.code) code = err.code;
    } catch {
      /* ignore */
    }
    throw Object.assign(new Error(shareErrorMessage(code)), { code });
  }
  const raw = await res.text();
  const project = parsePillProject(raw);
  if (!project) {
    throw Object.assign(new Error("This share link isn’t a valid scene."), { code: "bad_pill" });
  }
  return project;
}
