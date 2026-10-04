/** Design reference — UI and falling assets are authored for this viewport. */
export const UI_REF_W = 2560;
export const UI_REF_H = 1440;

/** Fit of a viewport against 2560×1440. Same factor as CSS `--ui-scale`. */
export function viewportScale(viewW: number, viewH: number): number {
  if (viewW < 2 || viewH < 2) return 1;
  return Math.min(viewW / UI_REF_W, viewH / UI_REF_H);
}

export function uiScale(): number {
  return viewportScale(window.innerWidth, window.innerHeight);
}

/**
 * Chip / physics scale: framed-canvas factor × viewport vs 2560×1440.
 * Keeps assets the same fraction of the stage at 1080p, 1440p, and 4K.
 */
export function compositionScale(frameScale: number, viewW?: number, viewH?: number): number {
  const view =
    viewW != null && viewH != null ? viewportScale(viewW, viewH) : uiScale();
  const scale = frameScale * view;
  return Number.isFinite(scale) && scale > 0 ? Math.max(0.001, scale) : 0.001;
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
