import type { ChipPose } from "./chipKinds";
import { uid, type BackgroundSettings, type Slot } from "./types";

export const LAYOUT_PAGE_MAX = 24;

export type LayoutPage = {
  id: string;
  slots: Slot[];
  poses: ChipPose[];
  background: BackgroundSettings;
  frame: { width: number; height: number };
};

export function copyPage(page: LayoutPage): LayoutPage {
  return {
    id: page.id,
    slots: structuredClone(page.slots),
    poses: page.poses.map((pose) => ({ ...pose })),
    background: structuredClone(page.background),
    frame: { ...page.frame },
  };
}

/** Duplicate a slide with fresh ids so Create-panel baselines stay per page. */
export function duplicatePage(page: LayoutPage): LayoutPage {
  const idMap = new Map<string, string>();
  const slots = page.slots.map((slot) => {
    const next = structuredClone(slot);
    next.id = uid();
    idMap.set(slot.id, next.id);
    return next;
  });
  return {
    id: uid(),
    slots,
    poses: page.poses.map((pose) => ({
      ...pose,
      slotId: idMap.get(pose.slotId) ?? pose.slotId,
    })),
    background: structuredClone(page.background),
    frame: { ...page.frame },
  };
}

export function pageFromLive(args: {
  slots: Slot[];
  poses: ChipPose[];
  background: BackgroundSettings;
  frame: { width: number; height: number };
  id?: string;
}): LayoutPage {
  return {
    id: args.id ?? uid(),
    slots: structuredClone(args.slots),
    poses: args.poses.map((pose) => ({ ...pose })),
    background: structuredClone(args.background),
    frame: {
      width: Math.max(1, args.frame.width),
      height: Math.max(1, args.frame.height),
    },
  };
}

export function clampPageIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(length - 1, Math.round(index)));
}
