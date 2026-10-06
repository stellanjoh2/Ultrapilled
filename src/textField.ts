import { TEXT_FIELD_WORD_MAX } from "./types";

export function textFieldWordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Keep the first `max` words; preserve newlines and spacing up to the cut. */
export function clampTextFieldWords(text: string, max = TEXT_FIELD_WORD_MAX): string {
  if (textFieldWordCount(text) <= max) return text;
  const parts = text.split(/(\s+)/);
  let words = 0;
  let out = "";
  for (const part of parts) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      if (words > 0 && words < max) out += part;
      continue;
    }
    if (words >= max) break;
    out += part;
    words += 1;
  }
  return out;
}

/** Wrap a paragraph to `maxWidth` using the provided advance-width measure. */
export function wrapTextFieldLines(
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string[] {
  const width = Math.max(1, maxWidth);
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];
  for (const para of paragraphs) {
    if (!para) {
      lines.push("");
      continue;
    }
    const tokens = para.split(/(\s+)/).filter(Boolean);
    let line = "";
    for (const token of tokens) {
      const next = line + token;
      if (line && measure(next) > width) {
        lines.push(line.replace(/\s+$/g, ""));
        line = /^\s+$/.test(token) ? "" : token.replace(/^\s+/g, "");
      } else {
        line = next;
      }
    }
    lines.push(line.replace(/\s+$/g, ""));
  }
  return lines.length ? lines : [""];
}
