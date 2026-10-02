/**
 * Slot scale limits.
 *
 * Panel range inputs stay on a tight soft max so everyday tweaks stay controllable.
 * Corner free-transform is intentionally much freer (and grows when Composition
 * Scale is low) so tiny chips can be recovered after heavy masterScale downs.
 */

export const SCALE_MIN = 0.1;

/** Soft ceiling for the panel scale range (text / shape / SVG). */
export const SCALE_SLIDER_MAX = 3;

/** Soft ceiling for raster-upload panel scale range. */
export const SCALE_UPLOAD_SLIDER_MAX = 4;

/** Baseline free-transform ceiling at the reference composition scale. */
export const SCALE_FREE_BASE = 100;

/** Absolute free-transform ceiling (physics / layout safety). */
export const SCALE_FREE_CEILING = 500;

/** Default Composition Scale (masterScale) used as the free-transform reference. */
export const SCALE_FREE_REF_MASTER = 3.5;

/** Hard max for corner free-transform; rises when composition scale is small. */
export function freeTransformScaleMax(masterScale: number): number {
  const master = Math.max(SCALE_MIN, masterScale);
  const dynamic = (SCALE_FREE_BASE * SCALE_FREE_REF_MASTER) / master;
  return Math.min(SCALE_FREE_CEILING, Math.max(SCALE_FREE_BASE, Math.round(dynamic * 100) / 100));
}

/** Clamp only — no centi rounding. Use for live free-transform preview. */
export function clampScaleContinuous(value: number, max: number): number {
  return Math.min(max, Math.max(SCALE_MIN, value));
}

/** Persist / panel: clamp and round to 0.01. */
export function clampScaleForFreeTransform(value: number, masterScale: number): number {
  const max = freeTransformScaleMax(masterScale);
  return Math.min(max, Math.max(SCALE_MIN, Math.round(value * 100) / 100));
}

/**
 * Soft slider ceiling. Expands when the current value was set higher via canvas
 * free-transform so the thumb stays reachable without loosening the default UX.
 */
export function slotScaleSliderMax(scale: number, rasterUpload: boolean): number {
  const soft = rasterUpload ? SCALE_UPLOAD_SLIDER_MAX : SCALE_SLIDER_MAX;
  return Math.max(soft, scale);
}

/** Clamp a panel slider value; hard ceiling matches free-transform (soft max is HTML). */
export function clampScaleForSlider(value: number, masterScale: number): number {
  return clampScaleForFreeTransform(value, masterScale);
}
