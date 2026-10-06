export type EmojiItem = {
  char: string;
  name: string;
  tags: string;
};

/** Boot-safe strip — no unicode-emoji-json / emojilib. */
export const FEATURED_EMOJI: EmojiItem[] = [
  { char: "😂", name: "Joy", tags: "laugh lol crying funny" },
  { char: "🔥", name: "Fire", tags: "lit hot flame" },
  { char: "✨", name: "Sparkles", tags: "shine magic stars" },
  { char: "🎉", name: "Party", tags: "celebrate confetti popper" },
  { char: "💀", name: "Skull", tags: "dead bones funny" },
  { char: "❤️", name: "Heart", tags: "love red" },
  { char: "🚀", name: "Rocket", tags: "space launch" },
  { char: "😎", name: "Cool", tags: "sunglasses smug fun" },
];

export const EMOJI_FONT =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

type EmojiBox = { width: number; height: number };
const emojiBoxes = new Map<string, EmojiBox>();
const emojiCanvas = document.createElement("canvas");
const emojiCtx = emojiCanvas.getContext("2d", { willReadFrequently: true });

export function measureEmojiBox(char: string, size: number): EmojiBox {
  const key = `${char}:${Math.round(size)}`;
  const hit = emojiBoxes.get(key);
  if (hit) return hit;

  const fallback = {
    width: Math.max(8, Math.round(size * 0.7)),
    height: Math.max(8, Math.round(size * 0.7)),
  };
  if (!emojiCtx) {
    emojiBoxes.set(key, fallback);
    return fallback;
  }

  const dim = Math.max(32, Math.ceil(size * 2));
  emojiCanvas.width = dim;
  emojiCanvas.height = dim;
  emojiCtx.clearRect(0, 0, dim, dim);
  emojiCtx.font = `${size}px ${EMOJI_FONT}`;
  emojiCtx.textAlign = "center";
  emojiCtx.textBaseline = "middle";
  emojiCtx.fillText(char, dim / 2, dim / 2);

  const { data, width: w, height: h } = emojiCtx.getImageData(0, 0, dim, dim);
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < 20) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) {
    emojiBoxes.set(key, fallback);
    return fallback;
  }

  const pad = 2;
  const box = {
    width: Math.max(8, maxX - minX + 1 + pad * 2),
    height: Math.max(8, maxY - minY + 1 + pad * 2),
  };
  emojiBoxes.set(key, box);
  return box;
}

let catalogWarm: Promise<typeof import("./emojiCatalog")> | null = null;

/** Prefetch the full emoji catalog (search box focus). */
export function warmEmojiCatalog(): Promise<void> {
  catalogWarm ??= import("./emojiCatalog");
  return catalogWarm.then(() => undefined);
}

/** Full-catalog search — loads unicode-emoji-json + emojilib on first call. */
export async function searchEmoji(query: string): Promise<EmojiItem[]> {
  catalogWarm ??= import("./emojiCatalog");
  const { searchEmojiCatalog } = await catalogWarm;
  return searchEmojiCatalog(query);
}
