/** Suppress chip look CSS transitions while a slider/picker is actively scrubbing. */
let depth = 0;

export function beginScrub() {
  if (depth === 0) document.getElementById("stage")?.classList.add("is-scrubbing");
  depth += 1;
}

export function endScrub() {
  if (depth === 0) return;
  depth -= 1;
  if (depth === 0) document.getElementById("stage")?.classList.remove("is-scrubbing");
}
