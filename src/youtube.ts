/** Parsed YouTube clip for a muted autoplay iframe loop. */
export type YouTubeClip = {
  videoId: string;
  /** Seconds from the start of the video to begin the loop. */
  startSec: number;
  /** Length of the looping segment in seconds. */
  loopSec: number;
};

export const DEFAULT_YOUTUBE_LOOP_SEC = 10;
export const DEFAULT_YOUTUBE_SIZE = 280;
export const YOUTUBE_LOOP_MIN = 1;
export const YOUTUBE_LOOP_MAX = 600;

const VIDEO_ID_RE = /^[\w-]{11}$/;

function parseClock(value: string): number {
  const raw = value.trim();
  if (!raw) return 0;
  if (/^\d+(\.\d+)?$/.test(raw)) return Math.max(0, Math.floor(Number(raw)));

  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match) return 0;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return Math.max(0, Math.floor(hours * 3600 + minutes * 60 + seconds));
}

function clampLoopSec(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_YOUTUBE_LOOP_SEC;
  return Math.max(YOUTUBE_LOOP_MIN, Math.min(YOUTUBE_LOOP_MAX, Math.round(value)));
}

/** Pull a video id + optional start time from a YouTube URL or bare id. */
export function parseYouTubeUrl(input: string, loopSec = DEFAULT_YOUTUBE_LOOP_SEC): YouTubeClip | null {
  const raw = input.trim();
  if (!raw) return null;

  if (VIDEO_ID_RE.test(raw)) {
    return { videoId: raw, startSec: 0, loopSec: clampLoopSec(loopSec) };
  }

  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  let videoId = "";

  if (host === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
  } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live" || parts[0] === "v") {
      videoId = parts[1] ?? "";
    } else {
      videoId = url.searchParams.get("v") ?? "";
    }
  } else {
    return null;
  }

  videoId = videoId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 11);
  if (!VIDEO_ID_RE.test(videoId)) return null;

  let startSec = 0;
  const startParam =
    url.searchParams.get("start") ??
    url.searchParams.get("t") ??
    url.searchParams.get("time_continue");
  if (startParam) startSec = parseClock(startParam);
  const hash = url.hash.replace(/^#/, "");
  if (hash.startsWith("t=")) startSec = parseClock(hash.slice(2));

  return {
    videoId,
    startSec: Math.max(0, Math.floor(startSec)),
    loopSec: clampLoopSec(loopSec),
  };
}

/**
 * Muted autoplay embed URL (no API key).
 * Intentionally omits `loop`/`playlist` — those make YouTube ignore `start`.
 * Callers restart the iframe when the segment ends (see armYouTubeLoop).
 */
export function youtubeEmbedSrc(clip: YouTubeClip, bust = 0): string {
  const start = Math.max(0, Math.floor(clip.startSec));
  const loop = clampLoopSec(clip.loopSec);
  const end = start + loop;
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    playsinline: "1",
    start: String(start),
    end: String(end),
    modestbranding: "1",
    rel: "0",
  });
  if (bust > 0) params.set("_", String(bust));
  return `https://www.youtube.com/embed/${clip.videoId}?${params.toString()}`;
}

export function youtubeEmbedKey(clip: YouTubeClip): string {
  return `${clip.videoId}:${Math.floor(clip.startSec)}:${clampLoopSec(clip.loopSec)}`;
}

const loopTimers = new WeakMap<HTMLIFrameElement, number>();

export function clearYouTubeLoop(iframe: HTMLIFrameElement): void {
  const id = loopTimers.get(iframe);
  if (id == null) return;
  window.clearTimeout(id);
  loopTimers.delete(iframe);
}

/** Reload the iframe when the segment should end so `start` is honored on every pass. */
export function armYouTubeLoop(iframe: HTMLIFrameElement, clip: YouTubeClip): void {
  clearYouTubeLoop(iframe);
  const ms = clampLoopSec(clip.loopSec) * 1000 + 250;
  const tick = () => {
    if (!iframe.isConnected) {
      clearYouTubeLoop(iframe);
      return;
    }
    iframe.src = youtubeEmbedSrc(clip, Date.now());
    loopTimers.set(iframe, window.setTimeout(tick, ms));
  };
  loopTimers.set(iframe, window.setTimeout(tick, ms));
}
