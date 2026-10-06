const API = "https://api.unsplash.com";
const UTM_SOURCE = "ultrapilled";
export const UNSPLASH_PER_PAGE = 12;

export type UnsplashPhoto = {
  id: string;
  alt: string;
  thumb: string;
  regular: string;
  downloadLocation: string;
  photographer: string;
  profileUrl: string;
  pageUrl: string;
};

export type UnsplashSearchPage = {
  photos: UnsplashPhoto[];
  total: number;
  totalPages: number;
  page: number;
};

type SearchResponse = {
  total: number;
  total_pages: number;
  results: Array<{
    id: string;
    alt_description: string | null;
    description: string | null;
    urls: { thumb: string; small: string; regular: string };
    links: { download_location: string; html: string };
    user: { name: string; links: { html: string } };
  }>;
};

function accessKey(): string {
  return (import.meta.env.VITE_UNSPLASH_ACCESS_KEY as string | undefined)?.trim() ?? "";
}

export function unsplashConfigured(): boolean {
  return Boolean(accessKey());
}

export function withUnsplashUtm(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", UTM_SOURCE);
    u.searchParams.set("utm_medium", "referral");
    return u.toString();
  } catch {
    return url;
  }
}

async function apiGet(path: string): Promise<Response> {
  const key = accessKey();
  if (!key) throw new Error("Missing Unsplash Access Key");
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Unsplash ${res.status}`);
  }
  return res;
}

function mapPhoto(photo: SearchResponse["results"][number]): UnsplashPhoto | null {
  if (!photo?.id || !photo.urls?.regular || !photo.links?.download_location) return null;
  return {
    id: photo.id,
    alt: photo.alt_description || photo.description || photo.user.name,
    thumb: photo.urls.thumb || photo.urls.small,
    regular: photo.urls.regular,
    downloadLocation: photo.links.download_location,
    photographer: photo.user.name,
    profileUrl: withUnsplashUtm(photo.user.links.html),
    pageUrl: withUnsplashUtm(photo.links.html),
  };
}

function mapPhotos(results: SearchResponse["results"]): UnsplashPhoto[] {
  return (results ?? []).map(mapPhoto).filter((photo): photo is UnsplashPhoto => Boolean(photo));
}

export async function getUnsplashPhoto(id: string): Promise<UnsplashPhoto> {
  const res = await apiGet(`/photos/${encodeURIComponent(id)}`);
  const mapped = mapPhoto((await res.json()) as SearchResponse["results"][number]);
  if (!mapped) throw new Error("Photo missing");
  return mapped;
}

export async function searchUnsplash(query: string, page = 1): Promise<UnsplashSearchPage> {
  const q = query.trim();
  if (!q) return { photos: [], total: 0, totalPages: 0, page: 1 };
  const params = new URLSearchParams({
    query: q,
    page: String(Math.max(1, page)),
    per_page: String(UNSPLASH_PER_PAGE),
    content_filter: "high",
  });
  const res = await apiGet(`/search/photos?${params}`);
  const data = (await res.json()) as SearchResponse;
  return {
    photos: mapPhotos(data.results),
    total: data.total ?? 0,
    totalPages: data.total_pages ?? 0,
    page: Math.max(1, page),
  };
}

/** Required Unsplash “download” ping when the user chooses a photo. */
export async function trackUnsplashDownload(downloadLocation: string): Promise<void> {
  const key = accessKey();
  if (!key || !downloadLocation) return;
  const url = downloadLocation.includes("?")
    ? `${downloadLocation}&client_id=${encodeURIComponent(key)}`
    : `${downloadLocation}?client_id=${encodeURIComponent(key)}`;
  await fetch(url).catch(() => {
    /* tracking must not block import */
  });
}

export async function unsplashPhotoFile(photo: UnsplashPhoto, opts?: { track?: boolean }): Promise<File> {
  if (opts?.track !== false) await trackUnsplashDownload(photo.downloadLocation);
  const res = await fetch(photo.regular);
  if (!res.ok) throw new Error(`Image fetch failed (${res.status})`);
  const blob = await res.blob();
  const ext = blob.type.includes("png") ? "png" : "jpg";
  const safeName = photo.photographer.replace(/[^\w.-]+/g, "_").slice(0, 40) || "unsplash";
  return new File([blob], `unsplash-${safeName}-${photo.id}.${ext}`, {
    type: blob.type || "image/jpeg",
  });
}
