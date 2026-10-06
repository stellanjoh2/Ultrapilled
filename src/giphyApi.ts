const API = "https://api.giphy.com/v1";
export const GIPHY_PER_PAGE = 12;
export const GIPHY_HOME = "https://giphy.com/";

export type GiphyGif = {
  id: string;
  alt: string;
  thumb: string;
  fileUrl: string;
  username: string;
  profileUrl: string;
  pageUrl: string;
  clickPing: string;
};

export type GiphySearchPage = {
  gifs: GiphyGif[];
  total: number;
  totalPages: number;
  page: number;
};

type Rendition = { url?: string; webp?: string };

type GifJson = {
  id?: string;
  title?: string;
  url?: string;
  username?: string;
  user?: { display_name?: string; username?: string; profile_url?: string };
  images?: {
    original?: Rendition;
    downsized?: Rendition;
    downsized_medium?: Rendition;
    fixed_width?: Rendition;
    fixed_width_small?: Rendition;
  };
  analytics?: { onclick?: { url?: string } };
};

type ListResponse = {
  data?: GifJson[] | GifJson;
  pagination?: { total_count?: number; count?: number; offset?: number };
  meta?: { status?: number; msg?: string };
};

function apiKey(): string {
  return (import.meta.env.VITE_GIPHY_API_KEY as string | undefined)?.trim() ?? "";
}

export function giphyConfigured(): boolean {
  return Boolean(apiKey());
}

function mapGif(gif: GifJson): GiphyGif | null {
  const fileUrl = gif.images?.downsized?.url || gif.images?.downsized_medium?.url || gif.images?.original?.url;
  const thumb = gif.images?.fixed_width?.url || gif.images?.fixed_width_small?.url || fileUrl;
  if (!gif.id || !fileUrl || !thumb) return null;
  const handle = gif.user?.username || gif.username || "";
  const username = gif.user?.display_name || handle || "GIPHY";
  const profileUrl = gif.user?.profile_url || (handle ? `${GIPHY_HOME}${handle}/` : GIPHY_HOME);
  return {
    id: gif.id,
    alt: gif.title || username,
    thumb,
    fileUrl,
    username,
    profileUrl,
    pageUrl: gif.url || `${GIPHY_HOME}gifs/${gif.id}`,
    clickPing: gif.analytics?.onclick?.url ?? "",
  };
}

async function apiGet(path: string, params: Record<string, string>): Promise<ListResponse> {
  const key = apiKey();
  if (!key) throw new Error("Missing Giphy API Key");
  const query = new URLSearchParams({ api_key: key, rating: "pg-13", ...params });
  const res = await fetch(`${API}${path}?${query}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Giphy ${res.status}`);
  }
  return (await res.json()) as ListResponse;
}

function listGifs(data: ListResponse): GifJson[] {
  if (Array.isArray(data.data)) return data.data;
  return data.data ? [data.data] : [];
}

function toPage(data: ListResponse, page: number): GiphySearchPage {
  const gifs = listGifs(data).map(mapGif).filter((gif): gif is GiphyGif => Boolean(gif));
  const total = data.pagination?.total_count ?? gifs.length;
  return {
    gifs,
    total,
    totalPages: Math.max(1, Math.ceil(total / GIPHY_PER_PAGE)),
    page: Math.max(1, page),
  };
}

function pageParams(page: number): Record<string, string> {
  const p = Math.max(1, page);
  return {
    limit: String(GIPHY_PER_PAGE),
    offset: String((p - 1) * GIPHY_PER_PAGE),
  };
}

export async function searchGiphy(query: string, page = 1): Promise<GiphySearchPage> {
  const q = query.trim();
  if (!q) return { gifs: [], total: 0, totalPages: 0, page: 1 };
  const data = await apiGet("/gifs/search", { q, ...pageParams(page) });
  return toPage(data, page);
}

export async function trendingGiphy(page = 1): Promise<GiphySearchPage> {
  const data = await apiGet("/gifs/trending", pageParams(page));
  return toPage(data, page);
}

export function trackGiphyClick(url: string): void {
  if (!url) return;
  void fetch(url).catch(() => {
    /* tracking must not block import */
  });
}

export async function getGiphyGif(id: string): Promise<GiphyGif> {
  const data = await apiGet(`/gifs/${encodeURIComponent(id)}`, {});
  const gif = mapGif(listGifs(data)[0] ?? {});
  if (!gif) throw new Error("GIF missing");
  return gif;
}

export async function giphyGifFile(gif: GiphyGif, opts?: { track?: boolean }): Promise<File> {
  if (opts?.track !== false) trackGiphyClick(gif.clickPing);
  const res = await fetch(gif.fileUrl);
  if (!res.ok) throw new Error(`GIF fetch failed (${res.status})`);
  const blob = await res.blob();
  const type = blob.type.includes("gif") ? blob.type : "image/gif";
  const safeName = gif.username.replace(/[^\w.-]+/g, "_").slice(0, 40) || "giphy";
  return new File([blob], `giphy-${safeName}-${gif.id}.gif`, { type });
}
