import orderedEmoji from "unicode-emoji-json/data-ordered-emoji.json";
import dataByEmoji from "unicode-emoji-json/data-by-emoji.json";
import emojiKeywords from "emojilib";
import type { EmojiItem } from "./emojis";

type EmojiMeta = {
  name: string;
};

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

/** Full-catalog search — loaded only when the emoji picker queries. */
export function searchEmojiCatalog(query: string): EmojiItem[] {
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
