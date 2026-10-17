const SHEET_DIM_CLASS = "is-sheet-dim";

let generation = 0;

/** Mode Select stage. Side sheets darken this so the header pills stay above the tint. */
export function modeSelectSheetDim(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".mode-select");
}

/** Arm the shared 20% dim. Close with the same token so a newer sheet is left alone. */
export function beginSheetDim(): { el: HTMLElement | null; token: number } {
  const token = ++generation;
  const el = modeSelectSheetDim();
  el?.classList.add(SHEET_DIM_CLASS);
  return { el, token };
}

export function endSheetDim(token: number): void {
  if (token !== generation) return;
  const el = modeSelectSheetDim();
  el?.classList.remove(SHEET_DIM_CLASS);
  el?.style.removeProperty("--scrim-t");
}
