/** Isso thread behind guestbook.ultrapilled.com — rules mirror guestbook/gate.py. */
export const GUESTBOOK_THREAD = "/guestbook";
export const DEFAULT_GUESTBOOK_API = "https://guestbook.ultrapilled.com";
/** `GUESTBOOK_DEV=1 gunicorn app:application` in guestbook/ */
export const LOCAL_GUESTBOOK_API = "http://localhost:8080";
export const GUESTBOOK_TURNSTILE_ACTION = "guestbook";
export const GUESTBOOK_PAGE_SIZE = 20;

export const MAX_GUESTBOOK_NAME = 40;
export const MIN_GUESTBOOK_WORDS = 5;
export const MAX_GUESTBOOK_TEXT = 500;

export function guestbookWordCount(message: string): number {
  const trimmed = message.trim();
  return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
}

const LINK =
  /(?:https?:|ftp:|mailto:|www\.|\]\(|<a\s|\[url|\b[\w-]+\.(?:com|net|org|info|biz|ru|cn|xyz|top|io|co|me|ly|link|click|site|online|shop|app|dev|gg|tk|ml|ga|cf|bit)\b|[\w.+-]+@[\w-]+\.[\w.-]+)/i;

export type GuestbookEntry = {
  id: number;
  author: string;
  text: string;
  created: number;
};

export type GuestbookPage = {
  entries: GuestbookEntry[];
  total: number;
  remaining: number;
};

export type GuestbookDraft = {
  author: string;
  text: string;
  honeypot: string;
  turnstileToken: string;
};

export type GuestbookPostResult =
  | { ok: true; pending: boolean }
  | { ok: false; status: number; code: string; message: string };

export function guestbookApiUrl(): string {
  const raw = import.meta.env.VITE_GUESTBOOK_API_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  return import.meta.env.DEV ? LOCAL_GUESTBOOK_API : DEFAULT_GUESTBOOK_API;
}

export function guestbookProblem(author: string, text: string): string | null {
  const name = author.trim();
  const body = text.trim();
  if (!name) return "Add your name.";
  if (name.length > MAX_GUESTBOOK_NAME) return `Keep your name under ${MAX_GUESTBOOK_NAME} characters.`;
  if (guestbookWordCount(body) < MIN_GUESTBOOK_WORDS) {
    return `Write a bit more — at least ${MIN_GUESTBOOK_WORDS} words.`;
  }
  if (body.length > MAX_GUESTBOOK_TEXT) return `Keep it under ${MAX_GUESTBOOK_TEXT} characters.`;
  if (LINK.test(name) || LINK.test(body)) return "Links and email addresses aren’t allowed in the guestbook.";
  return null;
}

type IssoComment = { id?: unknown; author?: unknown; text?: unknown; created?: unknown; mode?: unknown };

function toEntry(raw: IssoComment): GuestbookEntry | null {
  if (typeof raw.id !== "number" || typeof raw.text !== "string" || typeof raw.created !== "number") return null;
  if (raw.mode !== undefined && raw.mode !== 1) return null;
  return {
    id: raw.id,
    author: typeof raw.author === "string" && raw.author.trim() ? decodeEntities(raw.author) : "Anonymous",
    text: raw.text,
    created: raw.created,
  };
}

/** Isso HTML-escapes author names on save; show them as typed. */
function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

export async function fetchGuestbook(offset = 0, fetchImpl: typeof fetch = fetch): Promise<GuestbookPage> {
  const params = new URLSearchParams({
    uri: GUESTBOOK_THREAD,
    plain: "1",
    sort: "newest",
    limit: String(GUESTBOOK_PAGE_SIZE),
    offset: String(offset),
    nested_limit: "0",
  });
  const res = await fetchImpl(`${guestbookApiUrl()}/?${params}`, { credentials: "omit" });
  if (res.status === 404) return { entries: [], total: 0, remaining: 0 };
  if (!res.ok) throw new Error(`guestbook ${res.status}`);
  const data = (await res.json()) as { replies?: IssoComment[]; total_replies?: number; hidden_replies?: number };
  const entries = (data.replies ?? []).map(toEntry).filter((e): e is GuestbookEntry => e !== null);
  return {
    entries,
    total: data.total_replies ?? entries.length,
    remaining: Math.max(0, data.hidden_replies ?? 0),
  };
}

const ERROR_COPY: Record<string, string> = {
  rate_limited: "You’re signing a little too often. Wait a bit and try again.",
  turnstile_required: "Complete the security check, then sign.",
  turnstile_failed: "Security check failed. Try again.",
  turnstile_unconfigured: "The guestbook isn’t available right now.",
  too_short: `Write a bit more — at least ${MIN_GUESTBOOK_WORDS} words.`,
  links_not_allowed: "Links and email addresses aren’t allowed in the guestbook.",
  origin_denied: "The guestbook only accepts entries from ultrapilled.com.",
};

export async function postGuestbook(draft: GuestbookDraft, fetchImpl: typeof fetch = fetch): Promise<GuestbookPostResult> {
  const params = new URLSearchParams({ uri: GUESTBOOK_THREAD });
  const res = await fetchImpl(`${guestbookApiUrl()}/new?${params}`, {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      author: draft.author.trim(),
      text: draft.text.trim(),
      honeypot: draft.honeypot,
      turnstileToken: draft.turnstileToken,
    }),
  });
  if (res.ok) return { ok: true, pending: res.status === 202 };

  let err: { error?: string; code?: string } = {};
  try {
    err = (await res.json()) as typeof err;
  } catch {
    err = {};
  }
  // Isso's own guard (per-minute limit, 3 entries per network) answers 403 without a code.
  const code = err.code ?? (res.status === 403 || res.status === 429 ? "rate_limited" : "unknown");
  const message =
    ERROR_COPY[code] ??
    (res.status >= 500 ? "The guestbook isn’t available right now." : err.error || "Could not sign the guestbook. Try again later.");
  return { ok: false, status: res.status, code, message };
}
