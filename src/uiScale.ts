/** Design reference — UI is authored for this viewport and scales via --ui-scale. */
export const UI_REF_W = 2560;
export const UI_REF_H = 1440;

export function uiScale(): number {
  return Math.min(window.innerWidth / UI_REF_W, window.innerHeight / UI_REF_H);
}

/** Keep `--ui-scale` in sync for CSS calc() (JS override matches resize precisely). */
export function syncUiScale(): number {
  const scale = uiScale();
  document.documentElement.style.setProperty("--ui-scale", String(scale));
  return scale;
}

/** Place a `position: fixed` element in viewport (client) coordinates. */
export function placeZoomedFixed(el: HTMLElement, x: number, y: number, gap = 8): void {
  const left = Math.max(gap, Math.min(x, window.innerWidth - el.offsetWidth - gap));
  const top = Math.max(gap, Math.min(y, window.innerHeight - el.offsetHeight - gap));
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}
