export const CANVAS_RATIOS = ["16:9", "1:1", "3:4", "9:16"] as const;

export type CanvasRatio = (typeof CANVAS_RATIOS)[number];

export type CanvasBox = { x: number; y: number; width: number; height: number };

export type CanvasFrame = CanvasBox & { scale: number };

const LANDSCAPE = 16 / 9;

const ASPECT: Record<CanvasRatio, number> = {
  "16:9": LANDSCAPE,
  "1:1": 1,
  "3:4": 3 / 4,
  "9:16": 9 / 16,
};

/** Fit a canvas in the work area. 16:9 is the full stage. Other ratios are centered frames scaled from a 16:9 of matching height. */
export function canvasFrame(
  stageWidth: number,
  stageHeight: number,
  ratio: CanvasRatio,
  work?: CanvasBox,
): CanvasFrame {
  if (ratio === "16:9" || stageWidth < 2 || stageHeight < 2) {
    return { x: 0, y: 0, width: stageWidth, height: stageHeight, scale: 1 };
  }
  const area = work ?? { x: 0, y: 0, width: stageWidth, height: stageHeight };
  const aspect = ASPECT[ratio];
  let width = area.height * aspect;
  let height = area.height;
  if (width > area.width) {
    width = area.width;
    height = width / aspect;
  }
  width = Math.max(2, Math.round(width));
  height = Math.max(2, Math.round(height));
  return {
    x: Math.round(area.x + (area.width - width) / 2),
    y: Math.round(area.y + (area.height - height) / 2),
    width,
    height,
    scale: width / (height * LANDSCAPE),
  };
}

export function isCanvasRatio(value: unknown): value is CanvasRatio {
  return CANVAS_RATIOS.includes(value as CanvasRatio);
}

export function parseCanvasRatio(value: unknown): CanvasRatio {
  return isCanvasRatio(value) ? value : "16:9";
}

/** Prefabs ship with their own ratio; keep the user's selected frame when switching templates. */
export function keepSelectedCanvas<T extends { canvas: CanvasRatio }>(next: T, selected: CanvasRatio): T {
  return { ...next, canvas: selected };
}
