import orderedEmoji from "unicode-emoji-json/data-ordered-emoji.json";
import dataByEmoji from "unicode-emoji-json/data-by-emoji.json";
import emojiKeywords from "emojilib";

export type EmojiItem = {
  char: string;
  name: string;
  tags: string;
};

type EmojiMeta = {
  name: string;
};

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

function prettyName(name: string): string {
  return name.replace(/(^|[\s-])\w/g, (m) => m.toUpperCase());
}

export const EMOJI_CATALOG: EmojiItem[] = (orderedEmoji as string[]).flatMap((char) => {
  const meta = (dataByEmoji as Record<string, EmojiMeta>)[char];
  if (!meta) return [];
  const keywords = (emojiKeywords as Record<string, string[]>)[char] ?? [];
  const nameLower = meta.name.toLowerCase();
  const tags = keywords
    .map((k) => k.replace(/_/g, " ").toLowerCase())
    .filter((k) => k !== nameLower)
    .join(" ");
  return [{ char, name: prettyName(meta.name), tags }];
});

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function searchEmoji(query: string): EmojiItem[] {
  const raw = query.trim();
  const q = raw.toLowerCase();
  if (!q) return [];

  const scored: { item: EmojiItem; score: number; index: number }[] = [];
  for (let index = 0; index < EMOJI_CATALOG.length; index++) {
    const item = EMOJI_CATALOG[index]!;
    if (item.char === raw) {
      scored.push({ item, score: 0, index });
      continue;
    }
    const name = item.name.toLowerCase();
    const nameWords = tokens(item.name);
    const tagWords = tokens(item.tags);
    let score = 99;
    if (nameWords.some((w) => w === q)) score = 1;
    else if (tagWords.some((w) => w === q)) {
      // Prefer short alias tags ("car" → Automobile) over loose synonyms ("car" on Bus).
      const nameLen = name.replace(/[^a-z0-9]/g, "").length;
      score = q.length < nameLen ? 2 : 3;
    } else if (name.startsWith(q)) score = 4;
    else if (nameWords.some((w) => w.startsWith(q)) || tagWords.some((w) => w.startsWith(q)))
      score = 5;
    else if (name.includes(q)) score = 6;
    else continue;
    scored.push({ item, score, index });
  }

  scored.sort((a, b) => a.score - b.score || a.index - b.index);
  return scored.slice(0, 48).map((s) => s.item);
}

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
