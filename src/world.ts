import Matter from "matter-js";
import handGrabbing from "@phosphor-icons/core/assets/regular/hand-grabbing.svg?raw";
import { imageColliderId } from "./icons";
import { isColorMask, type ChipDraw, type ChipPose } from "./chipKinds";
import {
  applyVisual,
  paintBareText,
  paintBareTextCss,
  paintDropShadow,
  paintFill,
  paintSweepBand,
} from "./chipDomPaint";
import { createColliderBody, presetIdForSrc, simpleColliderKind } from "./iconMesh";
import {
  cornerRadius,
  measureSlot,
  measureTextEditSize,
  pillPadOf,
  scaleSlot,
  textShiftEm,
  trackingEm,
  trackingOf,
} from "./measure";
import { SCALE_FREE_BASE, SCALE_MIN, clampScaleContinuous } from "./slotScale";
import {
  oppositeXformCorner,
  reanchorStartDist,
  scaleFromPivotRatio,
  type XformCorner,
} from "./xformAnchor";
import { fillSample, gradientAngleOf, gradientEnd, gradientScaleOf, pillGradient } from "./pillFill";
import { stopTextAnimIn } from "./textAnim";
import { pickTheme, resolveTextColor, type ColorTheme } from "./theme";
import { blendMode, physicsComplexity, shapeHasFill, type PhysicsComplexity, type PhysicsSettings, type Slot } from "./types";
import { playImpact } from "./uiSounds";
import { beginScrub, endScrub } from "./scrub";

export type { ChipDraw, ChipPose } from "./chipKinds";

const { Engine, Runner, Bodies, Composite, Body, Constraint, Sleeping, Events, Collision, Query, Axes } =
  Matter;

/**
 * Mirror a Matter body on one axis. `Body.scale` with a negative factor reverses
 * vertex winding, which breaks `Query.point` / `Vertices.contains` (and SAT axes).
 * Reverse vertices afterward so hit-testing and collisions stay valid.
 */
function flipBodyAxis(body: Matter.Body, axis: "x" | "y") {
  Body.scale(body, axis === "x" ? -1 : 1, axis === "y" ? -1 : 1);
  for (const part of body.parts) {
    part.vertices.reverse();
    part.axes = Axes.fromVertices(part.vertices);
  }
}

/** Matter runtime accepts a world-space pivot; @types/matter-js omits it. */
function rotateBodyAround(
  body: Matter.Body,
  rotation: number,
  point?: { x: number; y: number },
) {
  if (!point) {
    Body.rotate(body, rotation);
    return;
  }
  (
    Body.rotate as (
      b: Matter.Body,
      r: number,
      p?: { x: number; y: number },
    ) => void
  )(body, rotation, point);
}

const WALL = 120;
/** Shapes stop this far inside the canvas so the border never clips them. */
const EDGE = 1;
/** Matter categories: wide chips skip side walls so oversize never explodes the pile. */
const CAT_WALL = 0x0002;
const CAT_CHIP = 0x0004;
const CAT_WIDE = 0x0008;
const FRAME_MS = 1000 / 60;
const GRAVITY_SCALE = 0.001;
const MATTER_DENSITY = 0.001;
const AIR_FRICTION = 0.01;
const GRAB_STIFFNESS = 0.2;
/** Softens the grab spring so release doesn't sling chips into the pile. */
const GRAB_DAMPING = 0.12;
const SIZE_RANDOM_SPAN = 0.28;
/** Must be low enough that friction slides still count as "moving". */
const SETTLED_SPEED = 0.06;
const SETTLED_SPIN = 0.01;
const CLICK_SLOP = 6;
const HOLD_DRAG_MS = 220;
/** Free-transform floor/base from ./slotScale; upper bound via setFreeScaleMax. */
/** Closing speed along the contact normal before an impact sound plays. */
const IMPACT_SPEED = 3.2;
/** Closing speed that maps to full impact volume. */
const IMPACT_FULL_SPEED = 9;
/** Min gap between impact sounds so pile settle doesn't chatter. */
const IMPACT_COOLDOWN_MS = 90;

type PhysicsQuality = {
  separatePasses: number;
  maxContactSteps: number;
  positionSingle: number;
  positionMulti: number;
  velocitySingle: number;
  velocityMulti: number;
  overlapAllow: number;
  /** Max pixels of positional correction per pair per pass. */
  maxPush: number;
};

const PHYSICS_QUALITY: Record<PhysicsComplexity, PhysicsQuality> = {
  simple: {
    separatePasses: 12,
    maxContactSteps: 2,
    positionSingle: 6,
    positionMulti: 16,
    velocitySingle: 4,
    velocityMulti: 6,
    // Tiny slop only — larger allow left chips visually stacked after settle.
    overlapAllow: 0.12,
    maxPush: 5,
  },
  normal: {
    separatePasses: 20,
    maxContactSteps: 4,
    positionSingle: 6,
    positionMulti: 32,
    velocitySingle: 4,
    velocityMulti: 8,
    overlapAllow: 0.12,
    maxPush: 7,
  },
  ultra: {
    separatePasses: 32,
    maxContactSteps: 4,
    positionSingle: 12,
    positionMulti: 40,
    velocitySingle: 6,
    velocityMulti: 12,
    overlapAllow: 0.08,
    maxPush: 10,
  },
};

/** Below this, only soft position nudges — no velocity kicks that re-wake the pile. */
const QUIET_SEPARATE_SPEED = 0.2;
/** Start bleeding residual motion below this so settle/floor always arrives. */
const SETTLE_DAMP_SPEED = 0.35;

type ChipMirror = { face: HTMLElement; glow: HTMLElement };

type DroppedChip = {
  slotId: string;
  seqIndex: number;
  seqTotal: number;
  body: Matter.Body;
  el: HTMLElement;
  glow: HTMLElement;
  /** Selection chrome host in `.chip-chrome-layer` (frame / scale handle). */
  chrome: HTMLElement | null;
  mirrors: ChipMirror[];
  width: number;
  height: number;
  chamfer: number;
  anchorX: number;
  anchorY: number;
  meshKey: string;
  sizeUnit: number;
  /** Extra size from solo canvas scale (1 = slot scale only). */
  scaleMul: number;
  /** Local-space mirror toggles (Figma-style flip). */
  flipX: boolean;
  flipY: boolean;
  look: ChipLook | null;
  /** Physics/visual audio pulse currently applied to this chip (1 = base). */
  audioMul: number;
  /** Spawn/discard scale baked into `seat()` transform (1 = normal). */
  popScale: number;
  /** While true, seat around the visual box center so pop doesn't drift. */
  popping: boolean;
};

type ChipLook = {
  slot: Slot;
  radius: number;
  fill: string;
  ink: string;
  tracking: number;
  shiftEm: number;
};

/** Bounce SFX event for offline export muxing. `timeMs` is sim clock since `play()`. */
export type ImpactHit = {
  slotId: string;
  bounceIndex: number;
  speedFactor: number;
  timeMs: number;
};

export type WorldHandle = {
  play: (
    slots: Slot[],
    physics: PhysicsSettings,
    stage: HTMLElement,
    scale: number,
    theme: ColorTheme,
    pillPad: number,
    tracking: number,
    sizeRandom: number,
  ) => void;
  refresh: (
    slots: Slot[],
    physics: PhysicsSettings,
    scale: number,
    theme: ColorTheme,
    pillPad: number,
    tracking: number,
    sizeRandom: number,
  ) => boolean;
  clear: () => void;
  /** Scale-down-remove every chip without touching app slot data. */
  discardAll: () => void;
  resize: (width: number, height: number) => void;
  refit: (width: number, height: number, factor: number) => void;
  setRunning: (on: boolean) => void;
  attach: (
    stage: HTMLElement,
    onPick?: (slotId: string | null, opts?: { force?: boolean; additive?: boolean }) => void,
    onMenu?: (slotId: string | null, x: number, y: number) => void,
    onEdit?: (slotId: string) => void,
    scaleOf?: (slotId: string) => number,
    onScale?: (slotId: string, scale: number, phase: "start" | "move" | "end") => void,
    onRotate?: (slotId: string, angle: number, phase: "start" | "move" | "end") => void,
    gradientOf?: (slotId: string) => { from: string; to: string; angle: number; scale: number } | null,
    onGradientWheel?: (
      slotId: string,
      value: { angle: number; scale: number },
      phase: "start" | "move" | "end",
    ) => void,
    onGradientStop?: (slotId: string, stop: "from" | "to", anchor: HTMLElement) => void,
  ) => void;
  refreshFrost: () => void;
  setPicked: (slotId: string | null, opts?: { ids?: string[] }) => void;
  setEditing: (slotId: string | null) => void;
  editingId: () => string | null;
  chipEl: (slotId: string) => HTMLElement | null;
  /** Remeasure + repaint one slot's chips only (typing / light edits). */
  refreshSlot: (
    slotId: string,
    slots: Slot[],
    physics: PhysicsSettings,
    scale: number,
    theme: ColorTheme,
    pillPad: number,
    tracking: number,
    sizeRandom: number,
    opts?: { quiet?: boolean },
  ) => void;
  setSimulationScale: (scale: number) => void;
  /** Corner free-transform hard max (from composition masterScale). */
  setFreeScaleMax: (max: number) => void;
  /** Scale pulse per slot id (1 = normal). Grows dig out overlaps. */
  setAudioScales: (scales: ReadonlyMap<string, number> | null) => void;
  /** Upward hop for matching slot ids (sharp / icon hits). */
  impulseAudioJump: (slotIds: Iterable<string>, speed?: number) => void;
  setFloorOpen: (open: boolean) => void;
  freezePile: () => void;
  purgeFallen: (limitY: number) => void;
  isSettled: () => boolean;
  isQuiet: () => boolean;
  isDragging: () => boolean;
  chipCount: () => number;
  sync: () => void;
  draws: () => ChipDraw[];
  poses: () => ChipPose[];
  /** Next refresh spawns these slots at a playfield point instead of above the pile. */
  armPlaceAt: (slotIds: Iterable<string>, x: number, y: number) => void;
  /** Move chips for these slots to a playfield point and shove overlapping neighbors out. */
  placeSlotsAt: (slotIds: Iterable<string>, x: number, y: number) => void;
  /** True when any two chip colliders intersect (used before leaving layout mode). */
  chipsOverlap: () => boolean;
  /**
   * Match canvas paint order to slot list order (back → front = first → last in `slotIds`).
   * The panel shows that order reversed so the front layer sits at the top.
   */
  syncLayerOrder: (slotIds: readonly string[]) => void;
  /** Place chips at saved poses (scaled from `frame` to the current playfield). */
  restore: (
    slots: Slot[],
    physics: PhysicsSettings,
    stage: HTMLElement,
    scale: number,
    theme: ColorTheme,
    pillPad: number,
    tracking: number,
    sizeRandom: number,
    poses: ChipPose[],
    frame: { width: number; height: number },
  ) => void;
  /** Toggle Figma-style flip on chips for a slot (or current xform targets). */
  flipChips: (slotId: string, axis: "x" | "y") => void;
  /** Snap chips for a slot (or current xform targets) to angle 0. */
  alignChipsStraight: (slotId: string) => void;
  /** Offline export: record bounce hits (skips live speaker playback while set). */
  setImpactListener: (fn: ((hit: ImpactHit) => void) | null) => void;
  /** Convex hulls of each solid collider part, in stage pixels. */
  wireframes: () => { x: number; y: number }[][];
  step: (delta?: number) => void;
  destroy: () => void;
};

function chamferFor(radius: number, width: number, height: number): number {
  const max = Math.min(width, height) / 2 - 0.5;
  return Math.min(radius, Math.max(0, max));
}

function chipWeight(physics: PhysicsSettings) {
  return physics.weight > 0 ? physics.weight : 1;
}

function bodyProps(physics: PhysicsSettings, angle = 0) {
  return {
    restitution: physics.bounce,
    friction: physics.friction,
    frictionStatic: physics.grip,
    frictionAir: AIR_FRICTION,
    density: MATTER_DENSITY * chipWeight(physics),
    angle,
  };
}

function surfaceProps(kind: "wall" | "floor" = "floor") {
  // Walls only collide with chips that fit; floor / chip-chip stay normal.
  if (kind === "wall") {
    return { isStatic: true, collisionFilter: { category: CAT_WALL, mask: CAT_CHIP } };
  }
  return { isStatic: true };
}

function applyWeight(body: Matter.Body, weight: number) {
  const density = MATTER_DENSITY * weight;
  if (body.parts.length > 1) {
    let mass = 0;
    for (let i = 1; i < body.parts.length; i++) {
      Body.setDensity(body.parts[i], density);
      mass += body.parts[i].mass;
    }
    Body.setMass(body, mass);
    return;
  }
  Body.setDensity(body, density);
}

function colliderId(slot: Slot): string {
  if (slot.kind !== "image" || slot.emoji || !slot.src) return "";
  const own = presetIdForSrc(slot.src);
  if (own) return own;
  return imageColliderId(slot.collider);
}

function meshKey(
  slot: Slot,
  width: number,
  height: number,
  chamfer: number,
  complexity: PhysicsComplexity,
): string {
  return `${slot.kind}|${colliderId(slot)}|${width}|${height}|${chamfer.toFixed(2)}|${complexity}`;
}

function chipBody(
  slot: Slot,
  x: number,
  y: number,
  width: number,
  height: number,
  physics: PhysicsSettings,
  chamfer = 0,
  angle = 0,
) {
  const id = colliderId(slot);
  const props = bodyProps(physics, 0);
  const complexity = physicsComplexity(physics.complexity);
  // simple → AABB; normal → circle/box proxy; ultra → traced mesh parts
  const preset =
    id && complexity === "ultra" ? createColliderBody(id, x, y, width, height, props) : null;
  let body = preset?.body ?? null;
  let anchor = preset?.anchor ?? { x: 0, y: 0 };
  if (!body && id && complexity !== "simple" && simpleColliderKind(id) === "circle") {
    const radius = Math.min(width, height) / 2;
    body = Bodies.circle(x, y, Math.max(1, radius), props);
  }
  if (!body) {
    const rounded =
      chamfer > 0 ? { ...props, chamfer: { radius: chamfer } } : props;
    body = Bodies.rectangle(x, y, width, height, rounded);
  }
  if (angle) {
    Body.setAngle(body, angle);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = anchor.x * cos - anchor.y * sin;
    const ry = anchor.x * sin + anchor.y * cos;
    Body.setPosition(body, {
      x: body.position.x + anchor.x - rx,
      y: body.position.y + anchor.y - ry,
    });
  }
  applyWeight(body, chipWeight(physics));
  // Match wall mask (CAT_CHIP); syncWallCollision may widen to CAT_WIDE later.
  body.collisionFilter.category = CAT_CHIP;
  for (const part of body.parts) {
    part.collisionFilter.category = CAT_CHIP;
  }
  return { body, anchor };
}


function readySlots(slots: Slot[]): Slot[] {
  return slots.filter(
    (slot) =>
      slot.kind === "text" || Boolean(slot.src || slot.emoji || slot.youtube || slot.video),
  );
}

function shapeCopies(slot: Slot): number {
  if (slot.kind !== "image") return 1;
  return Math.max(1, Math.round(slot.amount));
}

function expandSlots(slots: Slot[]): Slot[] {
  const expanded: Slot[] = [];
  for (const slot of readySlots(slots)) {
    const copies = shapeCopies(slot);
    for (let i = 0; i < copies; i++) expanded.push(slot);
  }
  return expanded;
}

function glyphShift(slot: Slot): number {
  return slot.kind === "text" ? textShiftEm(slot.textHeight) : 0;
}

function slotFill(theme: ColorTheme, slot: Slot): string {
  return slot.color ?? pickTheme(theme, slot.colorIndex ?? 0);
}

function slotInk(theme: ColorTheme, slot: Slot): string {
  if (slot.kind !== "text") return slotFill(theme, slot);
  return resolveTextColor(theme, fillSample(theme, slot), shapeHasFill(slot), slot.textColorIndex, slot.textColor);
}

function sizeJitter(unit: number, amount: number): number {
  const spread = (Math.max(0, Math.min(100, amount)) / 100) * SIZE_RANDOM_SPAN;
  return 1 + unit * spread;
}

/** Vertical half-extent of a rotated rectangle. Upright height underestimates a tilt. */
function tiltedHalfHeight(width: number, height: number, angle: number): number {
  return (width * Math.abs(Math.sin(angle)) + height * Math.abs(Math.cos(angle))) / 2;
}

/** Horizontal half-extent of a rotated rectangle. Upright width underestimates a tilt. */
function tiltedHalfWidth(width: number, height: number, angle: number): number {
  return (width * Math.abs(Math.cos(angle)) + height * Math.abs(Math.sin(angle))) / 2;
}

function layoutOf(slot: Slot, scale: number, pillPad: number, tracking: number) {
  const scaled = scaleSlot(slot, scale);
  const size = measureSlot(scaled, pillPadOf(slot, pillPad) / 50, trackingEm(trackingOf(slot, tracking)));
  const radius = cornerRadius(scaled, size);
  // Match the visual: pills/boxes keep rounded colliders; bare type stays a sharp ink AABB
  // so letterforms can nestle against neighbors instead of acting like invisible pills.
  return { scaled, size, radius, chamfer: chamferFor(radius, size.width, size.height) };
}

/** Layout at the requested scale — no wall-span shrink; users may size past the frame. */
function contained(
  slot: Slot,
  scale: number,
  pillPad: number,
  tracking: number,
  _stageW: number,
) {
  return layoutOf(slot, scale, pillPad, tracking);
}

export function createWorld(options?: { paused?: boolean }): WorldHandle {
  const engine = Engine.create({ enableSleeping: true });
  const runner = Runner.create();
  let running = false;
  let spinDrag = 0;
  let contactSteps = 1;
  let physicsKey = "";
  let layoutMode = false;
  let quality = PHYSICS_QUALITY.normal;
  let simScale = 1;
  /** Corner free-transform hard max; main updates from masterScale. */
  let freeScaleMax = SCALE_FREE_BASE;
  let audioScaleBySlot = new Map<string, number>();
  let sides: Matter.Body[] = [];
  let roof: Matter.Body | null = null;
  let floor: Matter.Body | null = null;
  let floorOpen = false;
  let bounds = { width: 0, height: 0 };
  let maxSpan = 0;
  let chips: DroppedChip[] = [];
  let layer: HTMLElement | null = null;
  let bloomLayer: HTMLElement | null = null;
  let chromeLayer: HTMLElement | null = null;
  let stageEl: HTMLElement | null = null;
  let mirrorScenes: HTMLElement[] = [];
  let onPick: ((slotId: string | null, opts?: { force?: boolean; additive?: boolean }) => void) | null = null;
  let onMenu: ((slotId: string | null, x: number, y: number) => void) | null = null;
  let onEdit: ((slotId: string) => void) | null = null;
  let scaleOf: ((slotId: string) => number) | null = null;
  let onScale: ((slotId: string, scale: number, phase: "start" | "move" | "end") => void) | null = null;
  let onRotate: ((slotId: string, angle: number, phase: "start" | "move" | "end") => void) | null = null;
  let gradientOf: ((slotId: string) => { from: string; to: string; angle: number; scale: number } | null) | null =
    null;
  let onGradientWheel:
    | ((slotId: string, value: { angle: number; scale: number }, phase: "start" | "move" | "end") => void)
    | null = null;
  let onGradientStop: ((slotId: string, stop: "from" | "to", anchor: HTMLElement) => void) | null = null;
  let pickedId: string | null = null;
  /** All selected slot ids (includes `pickedId`). Shift-click grows this set. */
  const pickedIds = new Set<string>();
  /** Active Amount instance: selection chrome + pick/drag/rotate/free-transform target. */
  let soloBodyId: number | null = null;
  let editingId: string | null = null;
  /** Spawn these slot ids at a point on the next refresh (import / drop). */
  let pendingPlace: { ids: Set<string>; x: number; y: number } | null = null;
  let clickChip: DroppedChip | null = null;
  let drag: {
    /** Chip under the pointer (click / release still key off this). */
    chip: DroppedChip;
    pointerId: number;
    x: number;
    y: number;
    originX: number;
    originY: number;
    moved: boolean;
    /**
     * Physics: soft Matter pins. Layout: `pin` is null and `ox`/`oy` are rigid
     * pointer→body offsets (Figma-style, no throw).
     */
    pins: { chip: DroppedChip; pin: Matter.Constraint | null; ox: number; oy: number }[];
  } | null = null;
  let pending: {
    chip: DroppedChip;
    pointerId: number;
    x: number;
    y: number;
    originX: number;
    originY: number;
  } | null = null;
  /**
   * Combined scale+rotate: radial drag scales, angular drag rotates (like the gradient wheel).
   * Default pivot = opposite corner (Figma-style). Shift = center-anchored scale only.
   * Shift+Alt also snaps the locked angle to 45° steps.
   */
  let xformDrag: {
    chip: DroppedChip;
    slotId: string;
    pointerId: number;
    /** Which corner handle started the gesture (stays large while dragging). */
    corner: XformCorner;
    /** World-space opposite-corner anchor (default mode). */
    anchorX: number;
    anchorY: number;
    /** True while Shift holds center-anchored uniform scale. */
    centerAnchored: boolean;
    startDist: number;
    startScale: number;
    /** Per-slot scale at drag start (multi-select keeps relative sizes). */
    startScales: Map<string, number>;
    lastScale: number;
    /** Body scale applied so far relative to drag start (1 = unchanged). */
    bodyFactor: number;
    startPointerAngle: number;
    startBodyAngle: number;
    lastAngle: number;
  } | null = null;
  let gradAngleDrag: {
    chip: DroppedChip;
    slotId: string;
    pointerId: number;
    startPointerAngle: number;
    startGradAngle: number;
    lastAngle: number;
    lastScale: number;
    wheelMaxR: number;
    chipR: number;
    /** Color-stop grab: click opens picker, drag rotates / scales. */
    stop: "from" | "to" | null;
    stopEl: HTMLElement | null;
    originX: number;
    originY: number;
    moved: boolean;
    rotating: boolean;
  } | null = null;
  let holdTimer = 0;
  let blank: { pointerId: number; x: number; y: number } | null = null;
  const prevVel = new Map<number, { x: number; y: number }>();
  const bounceCount = new Map<number, number>();
  let lastImpactAt = 0;
  /** Advances only via `step()` — used for impact cooldown + export timestamps. */
  let simClockMs = 0;
  let impactListener: ((hit: ImpactHit) => void) | null = null;

  function setImpactListener(fn: ((hit: ImpactHit) => void) | null) {
    impactListener = fn;
  }

  function setRunning(on: boolean) {
    if (on && !running) {
      Runner.run(runner, engine);
      running = true;
    } else if (!on && running) {
      Runner.stop(runner);
      running = false;
    }
  }

  if (!options?.paused) setRunning(true);

  function noteSpan(width: number, height: number) {
    maxSpan = Math.max(maxSpan, Math.hypot(width, height));
  }

  function wallThick() {
    return Math.max(WALL, maxSpan * 0.55, 160);
  }

  /** Playfield CSS box — never the full stage (portrait letterbox is outside this). */
  function playfieldBox(stage: HTMLElement, chipLayer: HTMLElement | null) {
    const found = chipLayer?.closest(".playfield");
    const field = found instanceof HTMLElement ? found : null;
    return {
      width: field?.clientWidth || chipLayer?.parentElement?.clientWidth || stage.clientWidth,
      height: field?.clientHeight || chipLayer?.parentElement?.clientHeight || stage.clientHeight,
    };
  }

  /** True when the chip can't fit between the side walls at its current angle. */
  function tooWideForWalls(chip: DroppedChip) {
    if (bounds.width < 16) return false;
    const mul = Math.max(chip.audioMul, 1) * scalePreviewFactor(chip);
    const reach = tiltedHalfWidth(chip.width, chip.height, chip.body.angle) * mul;
    const inset = EDGE + 1;
    return inset + reach > bounds.width - inset - reach;
  }

  /**
   * Oversized chips must not collide with side walls — Matter + separateOverlaps
   * treat deep dual-wall penetration as a huge shove and yeet the whole pile off-canvas
   * (e.g. duplicate → wakeAll while a wide image is sleeping through the walls).
   */
  function syncWallCollision(chip: DroppedChip) {
    const wide = tooWideForWalls(chip);
    const filter = chip.body.collisionFilter;
    const category = wide ? CAT_WIDE : CAT_CHIP;
    // Wide: everything except side walls. Fitting: default (collide with walls).
    let mask = wide ? 0xffffffff ^ CAT_WALL : 0xffffffff;
    // Layout mode: free placement — no chip–chip or side-wall contacts.
    if (layoutMode) mask &= ~(CAT_CHIP | CAT_WIDE | CAT_WALL);
    if (filter.category !== category || filter.mask !== mask) {
      filter.category = category;
      filter.mask = mask;
      for (const part of chip.body.parts) {
        if (part === chip.body) continue;
        part.collisionFilter.category = category;
        part.collisionFilter.mask = mask;
      }
    }
    if (wide && !layoutMode) pinInsideWalls(chip);
  }

  /** Keep a chip fully between the hard side walls. */
  function pinInsideWalls(chip: DroppedChip) {
    // Layout mode turns walls off so large assets can cross the border freely.
    if (layoutMode || bounds.width < 16) return;
    const mul = Math.max(chip.audioMul, 1) * scalePreviewFactor(chip);
    const reach = tiltedHalfWidth(chip.width, chip.height, chip.body.angle) * mul;
    const inset = EDGE + 1;
    const minX = inset + reach;
    const maxX = bounds.width - inset - reach;
    const { x, y } = chip.body.position;
    const nextX = minX > maxX ? bounds.width / 2 : Math.min(maxX, Math.max(minX, x));
    if (Math.abs(nextX - x) > 0.05) Body.setPosition(chip.body, { x: nextX, y });
  }

  /**
   * After a chip widens (typing / scale), stay inside the side walls and shove
   * overlapping neighbors up — never out into the side void.
   */
  function releaseGrowth(grown: DroppedChip[]) {
    if (grown.length === 0 || bounds.width < 16) return;
    for (const chip of grown) pinInsideWalls(chip);

    // Layout mode keeps overlaps and ignores side walls.
    if (layoutMode) {
      for (const chip of chips) {
        Body.setVelocity(chip.body, { x: 0, y: 0 });
        Body.setAngularVelocity(chip.body, 0);
        Sleeping.set(chip.body, true);
      }
      return;
    }

    for (const chip of grown) {
      const gx = chip.body.position.x;
      const gy = chip.body.position.y;
      const gReach = Math.hypot(chip.width, chip.height) * 0.5 * Math.max(chip.audioMul, 1);
      for (const other of chips) {
        if (other === chip || other.body.isStatic) continue;
        const dx = other.body.position.x - gx;
        const dy = other.body.position.y - gy;
        const dist = Math.hypot(dx, dy) || 0.01;
        const reach = gReach + Math.hypot(other.width, other.height) * 0.5 * Math.max(other.audioMul, 1);
        if (dist >= reach) continue;
        const overlap = reach - dist;
        Sleeping.set(other.body, false);
        Body.setPosition(other.body, {
          x: other.body.position.x + (dx / dist) * overlap * 0.15,
          y: other.body.position.y - Math.max(overlap, 6) * 0.9,
        });
      }
    }

    wakeAll();
    if (!running) setRunning(true);
    separateOverlaps(true);
    for (const chip of chips) pinInsideWalls(chip);
  }

  function buildSides(width: number, height: number) {
    const t = wallThick();
    // Sides + ceiling far above the canvas so tall piles stay in and hard throws come back down.
    const above = Math.max(height * 6, maxSpan * 8, 6000);
    const below = Math.max(height, 1200);
    const top = -above;
    const bottom = height + below;
    const tall = bottom - top;
    const midY = top + tall / 2;
    Composite.remove(engine.world, sides);
    if (roof) {
      Composite.remove(engine.world, roof);
      roof = null;
    }
    sides = [
      Bodies.rectangle(EDGE - t / 2, midY, t, tall, surfaceProps("wall")),
      Bodies.rectangle(width - EDGE + t / 2, midY, t, tall, surfaceProps("wall")),
    ];
    // Floor-style collision so wide chips (which skip side walls) still bounce off the ceiling.
    roof = Bodies.rectangle(
      width / 2,
      top - t / 2,
      width + t * 4,
      t,
      surfaceProps("floor"),
    );
    Composite.add(engine.world, sides);
    Composite.add(engine.world, roof);
  }

  function setFloorOpen(open: boolean) {
    floorOpen = open;
    if (floor) {
      Composite.remove(engine.world, floor);
      floor = null;
    }
    if (!open && bounds.width > 0) {
      const t = wallThick();
      floor = Bodies.rectangle(
        bounds.width / 2,
        bounds.height - EDGE + t / 2,
        bounds.width + t * 4,
        t,
        surfaceProps("floor"),
      );
      Composite.add(engine.world, floor);
    }
    if (open) wakeAll();
  }

  function resize(width: number, height: number) {
    bounds = { width, height };
    buildSides(width, height);
    setFloorOpen(floorOpen);
  }

  function refit(width: number, height: number, factor: number) {
    dropPin();
    cancelPending();
    const oldW = Math.max(1, bounds.width);
    const oldH = Math.max(1, bounds.height);
    const uniform = Math.abs(height - oldH) < 2 && Math.abs(factor - 1) > 0.0001;
    for (const chip of chips) {
      const { x, y } = chip.body.position;
      Body.setPosition(
        chip.body,
        uniform
          ? { x: width / 2 + (x - oldW / 2) * factor, y: height + (y - oldH) * factor }
          : { x: (x / oldW) * width, y: (y / oldH) * height },
      );
    }
    resize(width, height);
  }

  function purgeFallen(limitY: number) {
    chips = chips.filter((chip) => {
      const reach = Math.hypot(chip.width, chip.height) / 2;
      if (chip.body.position.y - reach < limitY + Math.max(480, reach + 240)) return true;
      if (pending?.chip === chip) cancelPending();
      if (drag?.pins.some((entry) => entry.chip === chip)) dropPin();
      Composite.remove(engine.world, chip.body);
      stopTextAnimIn(chip.el);
      stopTextAnimIn(chip.glow);
      chip.chrome?.remove();
      chip.chrome = null;
      chip.el.remove();
      chip.glow.remove();
      for (const mirror of chip.mirrors) {
        mirror.face.remove();
        mirror.glow.remove();
      }
      return false;
    });
  }

  function dropPin() {
    if (!drag) return;
    for (const { chip, pin } of drag.pins) {
      if (pin) Composite.remove(engine.world, pin);
      chip.el.classList.remove("is-held");
      // Layout grabs are static while held — unlock and sleep so nothing coasts.
      if (layoutMode) {
        if (chip.slotId !== editingId && chip.body.isStatic) Body.setStatic(chip.body, false);
        Body.setVelocity(chip.body, { x: 0, y: 0 });
        Body.setAngularVelocity(chip.body, 0);
        Sleeping.set(chip.body, true);
        seat(chip);
      }
    }
    drag = null;
  }

  function cancelPending() {
    window.clearTimeout(holdTimer);
    pending = null;
  }

  function beginDrag() {
    const armed = pending;
    if (!armed) return;
    window.clearTimeout(holdTimer);
    pending = null;
    clickChip = null;
    const { chip, pointerId, x, y, originX, originY } = armed;
    dropPin();
    // Multi-select (distinct slots) moves together; Amount copies stay independent via soloBodyId.
    const targets = xformTargets(chip.slotId);
    const group = targets.some((item) => item.body.id === chip.body.id) ? targets : [chip];
    const pins = group.map((item) => {
      const body = item.body;
      const ox = body.position.x - x;
      const oy = body.position.y - y;
      item.el.classList.add("is-held");
      if (layoutMode) {
        // Rigid follow — no spring, no leftover throw velocity.
        Body.setVelocity(body, { x: 0, y: 0 });
        Body.setAngularVelocity(body, 0);
        Body.setStatic(body, true);
        return { chip: item, pin: null, ox, oy };
      }
      const pin = Constraint.create({
        pointA: { x, y },
        bodyB: body,
        pointB: { x: -ox, y: -oy },
        stiffness: GRAB_STIFFNESS,
        damping: GRAB_DAMPING,
        length: 0.01,
      });
      Object.assign(pin, { angularStiffness: 1 });
      Composite.add(engine.world, pin);
      Sleeping.set(body, false);
      return { chip: item, pin, ox, oy };
    });
    drag = { chip, pointerId, x, y, originX, originY, moved: false, pins };
    if (!layoutMode) setRunning(true);
  }

  function clear() {
    cancelPending();
    dropPin();
    endXformDrag();
    endGradAngleDrag();
    editingId = null;
    clickChip = null;
    soloBodyId = null;
    for (const chip of chips) {
      Composite.remove(engine.world, chip.body);
      stopTextAnimIn(chip.el);
      stopTextAnimIn(chip.glow);
      chip.chrome?.remove();
      chip.chrome = null;
      chip.el.remove();
      chip.glow.remove();
      for (const mirror of chip.mirrors) {
        mirror.face.remove();
        mirror.glow.remove();
      }
    }
    chips = [];
    chromeLayer?.replaceChildren();
    bounceCount.clear();
    prevVel.clear();
    maxSpan = 0;
    simClockMs = 0;
    lastImpactAt = Number.NEGATIVE_INFINITY;
  }

  function applyPhysics(physics: PhysicsSettings) {
    const weight = chipWeight(physics);
    const complexity = physicsComplexity(physics.complexity);
    const nextLayout = Boolean(physics.layoutMode);
    const key = `${weight}|${physics.gravity}|${physics.speed}|${physics.bounce}|${physics.friction}|${physics.grip}|${physics.spin}|${complexity}|${nextLayout ? 1 : 0}`;
    const changed = key !== physicsKey;
    const layoutChanged = nextLayout !== layoutMode;
    physicsKey = key;
    layoutMode = nextLayout;
    quality = PHYSICS_QUALITY[complexity];
    engine.gravity.y = layoutMode ? 0 : physics.gravity;
    engine.gravity.scale = GRAVITY_SCALE;
    engine.timing.timeScale = physics.speed;
    spinDrag = physics.spin;
    setSimulationScale(simScale);
    for (const chip of chips) {
      if (changed) applyWeight(chip.body, weight);
      chip.body.frictionAir = AIR_FRICTION;
      for (const part of chip.body.parts) {
        part.restitution = physics.bounce;
        part.friction = physics.friction;
        part.frictionStatic = physics.grip;
        part.frictionAir = AIR_FRICTION;
      }
      if (layoutChanged || changed) syncWallCollision(chip);
      if (layoutMode) {
        Body.setVelocity(chip.body, { x: 0, y: 0 });
        Body.setAngularVelocity(chip.body, 0);
        Sleeping.set(chip.body, true);
      } else if (changed) {
        Sleeping.set(chip.body, false);
      }
    }
    // Leaving layout: walls are back — pull anything that drifted past the border in.
    if (layoutChanged && !layoutMode) {
      for (const chip of chips) pinInsideWalls(chip);
    }
  }

  function solidParts(body: Matter.Body): Matter.Body[] {
    return body.parts.length > 1 ? body.parts.slice(1) : body.parts;
  }

  function boundsMiss(a: Matter.Body, b: Matter.Body): boolean {
    return a.bounds.max.x < b.bounds.min.x || a.bounds.min.x > b.bounds.max.x
      || a.bounds.max.y < b.bounds.min.y || a.bounds.min.y > b.bounds.max.y;
  }

  function pushScale(body: Matter.Body, hard = false): number {
    if (body.isStatic || isDraggedBody(body) || isHandleBody(body)) return 0;
    // Soft passes leave sleepers alone so settle/loop aren't fought awake.
    if (!hard && body.isSleeping) return 0;
    return body.inverseMass;
  }

  function isDraggedBody(body: Matter.Body) {
    return Boolean(drag?.pins.some((entry) => entry.chip.body === body));
  }

  function isHandleBody(body: Matter.Body) {
    const slotId = xformDrag?.slotId;
    if (!slotId) return false;
    return chips.some((chip) => chip.slotId === slotId && chip.body === body);
  }

  function resolveOverlap(a: Matter.Body, b: Matter.Body, hard = false): boolean {
    if ((a.isStatic || isDraggedBody(a) || isHandleBody(a)) && (b.isStatic || isDraggedBody(b) || isHandleBody(b))) {
      return false;
    }
    // Don't dig wide chips out of side walls — that shove launches the pile off-screen.
    const aSide = sides.includes(a);
    const bSide = sides.includes(b);
    if (aSide || bSide) {
      const other = aSide ? b : a;
      const chip = chips.find((item) => item.body === other || item.body.id === other.id);
      if (chip && tooWideForWalls(chip)) return false;
    }
    if (boundsMiss(a, b)) return false;

    let best: Matter.Collision | null = null;
    const aParts = solidParts(a);
    const bParts = solidParts(b);
    for (let pa = 0; pa < aParts.length; pa++) {
      const partA = aParts[pa];
      for (let pb = 0; pb < bParts.length; pb++) {
        const partB = bParts[pb];
        if (boundsMiss(partA, partB)) continue;
        const hit = Collision.collides(partA, partB);
        if (hit && (!best || hit.depth > best.depth)) best = hit;
      }
    }
    if (!best || best.depth <= (hard ? 0 : quality.overlapAllow)) return false;

    const parentA = best.parentA;
    const parentB = best.parentB;
    // A lively chip into a sleeping island: wake neighbors so soft pushes share
    // instead of slamming 100% into the thrown body (reads as settle jitter).
    const handleDrag = Boolean(xformDrag);
    const incoming =
      hard ||
      handleDrag ||
      parentA.speed > QUIET_SEPARATE_SPEED ||
      parentB.speed > QUIET_SEPARATE_SPEED ||
      isDraggedBody(parentA) ||
      isDraggedBody(parentB);

    // Sleep-island dig: fix frozen intersections with position only — never wake.
    // Waking here used to reset the settle clock every frame so Loop never opened.
    const sleepIsland =
      !hard &&
      !handleDrag &&
      parentA.isSleeping &&
      parentB.isSleeping &&
      !isDraggedBody(parentA) &&
      !isDraggedBody(parentB);

    const invA = sleepIsland
      ? (parentA.isStatic ? 0 : parentA.inverseMass)
      : pushScale(parentA, hard);
    const invB = sleepIsland
      ? (parentB.isStatic ? 0 : parentB.inverseMass)
      : pushScale(parentB, hard);
    const share = invA + invB;
    if (share === 0) return false;

    if (incoming && !sleepIsland) {
      if (parentA.isSleeping && !parentA.isStatic) Sleeping.set(parentA, false);
      if (parentB.isSleeping && !parentB.isStatic) Sleeping.set(parentB, false);
    }

    const nx = best.normal.x;
    const ny = best.normal.y;
    // Soft correction for normal settle; hard digs out audio-growth penetration fully.
    // Scale-drag prefers position nudges only — velocity kicks read as bounce jitter.
    const allow = hard ? 0 : quality.overlapAllow;
    const remainder = best.depth - allow;
    const soft = hard
      ? remainder
      : Math.min(remainder * (sleepIsland ? 0.9 : 0.4), quality.maxPush);
    const push = soft / share;
    if (invA) Body.setPosition(parentA, { x: parentA.position.x + nx * push * invA, y: parentA.position.y + ny * push * invA });
    if (invB) Body.setPosition(parentB, { x: parentB.position.x - nx * push * invB, y: parentB.position.y - ny * push * invB });

    // Near rest / sleep islands / live scale: position nudges only — velocity kicks re-wake the pile.
    if (!incoming || sleepIsland || handleDrag) return true;

    const relN = (parentB.velocity.x - parentA.velocity.x) * nx + (parentB.velocity.y - parentA.velocity.y) * ny;
    if (relN > 0) {
      if (invA) {
        Body.setVelocity(parentA, {
          x: parentA.velocity.x + nx * relN * invA / share,
          y: parentA.velocity.y + ny * relN * invA / share,
        });
      }
      if (invB) {
        Body.setVelocity(parentB, {
          x: parentB.velocity.x - nx * relN * invB / share,
          y: parentB.velocity.y - ny * relN * invB / share,
        });
      }
    }
    return true;
  }

  function separateOverlaps(hard: false | true | "audio" = false) {
    if (layoutMode || chips.length === 0) return;
    const intense = hard === "audio";
    const force = Boolean(hard);
    // Soft digs on a fully sleeping pile desync DOM during hold (no sync) and
    // flash as a snap the frame Loop opens the floor.
    if (!force && !drag && !xformDrag && chips.every((chip) => chip.body.isSleeping)) return;

    const bodies: Matter.Body[] = [];
    for (const chip of chips) bodies.push(chip.body);
    for (const side of sides) bodies.push(side);
    if (roof) bodies.push(roof);
    if (floor) bodies.push(floor);

    const cell = Math.max(48, maxSpan * 0.35);
    const n = bodies.length;

    // Full multi-pass separation while calm blows the Matter runner budget and
    // deferred steps read as frameskip during settle after a throw.
    let passes = quality.separatePasses;
    if (intense) {
      // Audio growth can dig many bodies into each other at once — need room to Gauss-Seidel out.
      passes = Math.max(passes, 48);
    } else if (force) {
      passes = Math.max(passes, 18);
    } else if (!drag) {
      let peak = 0;
      let allSleeping = true;
      for (const chip of chips) {
        peak = Math.max(peak, chip.body.speed, Math.abs(chip.body.angularVelocity) * 10);
        if (!chip.body.isSleeping) allSleeping = false;
      }
      // Calm piles still dig out residual overlaps (position only) — never leave
      // intersections frozen in a sleep island — but keep the pass budget small.
      if (allSleeping || peak < QUIET_SEPARATE_SPEED) passes = Math.min(passes, 6);
      else if (peak < 2) passes = Math.min(passes, 10);
    }

    for (let pass = 0; pass < passes; pass++) {
      let moved = false;
      const grid = new Map<string, number[]>();
      for (let i = 0; i < n; i++) {
        const b = bodies[i];
        const x0 = Math.floor(b.bounds.min.x / cell);
        const y0 = Math.floor(b.bounds.min.y / cell);
        const x1 = Math.floor(b.bounds.max.x / cell);
        const y1 = Math.floor(b.bounds.max.y / cell);
        for (let gx = x0; gx <= x1; gx++) {
          for (let gy = y0; gy <= y1; gy++) {
            const key = `${gx},${gy}`;
            const bucket = grid.get(key);
            if (bucket) bucket.push(i);
            else grid.set(key, [i]);
          }
        }
      }

      const seen = new Set<number>();
      for (const bucket of grid.values()) {
        for (let a = 0; a < bucket.length; a++) {
          for (let b = a + 1; b < bucket.length; b++) {
            const i = bucket[a];
            const j = bucket[b];
            const lo = i < j ? i : j;
            const hi = i < j ? j : i;
            const id = lo * n + hi;
            if (seen.has(id)) continue;
            seen.add(id);
            if (resolveOverlap(bodies[i], bodies[j], force)) moved = true;
          }
        }
      }
      if (!moved) break;
    }
  }

  /** Bleed leftover motion once the pile is nearly still so sleep always arrives. */
  function dampTowardSleep() {
    if (drag || chips.length === 0) return;
    let peak = 0;
    for (const chip of chips) {
      if (chip.body.isSleeping) continue;
      peak = Math.max(peak, chip.body.speed, Math.abs(chip.body.angularVelocity) * 8);
    }
    if (peak === 0 || peak > SETTLE_DAMP_SPEED) return;
    // Light ease only — strong kills read as a hard brake before hold/freeze.
    const t = 1 - peak / SETTLE_DAMP_SPEED;
    const keep = Math.pow(1 - (0.03 + 0.1 * t), 1 / contactSteps);
    for (const chip of chips) {
      if (chip.body.isSleeping) continue;
      const body = chip.body;
      Body.setVelocity(body, { x: body.velocity.x * keep, y: body.velocity.y * keep });
      Body.setAngularVelocity(body, body.angularVelocity * keep);
    }
  }

  Events.on(engine, "beforeUpdate", () => {
    prevVel.clear();
    for (const chip of chips) {
      const { x, y } = chip.body.velocity;
      prevVel.set(chip.body.id, { x, y });
    }
    if (spinDrag > 0) {
      const keep = Math.pow(1 - spinDrag, 1 / contactSteps);
      for (const chip of chips) {
        if (!chip.body.isSleeping) Body.setAngularVelocity(chip.body, chip.body.angularVelocity * keep);
      }
    }
    // Once the pile is nearly still, bleed residual slide/spin so Matter sleep
    // (and the floor/loop settle gate) always arrives — even on low friction.
    dampTowardSleep();
  });

  Events.on(engine, "collisionStart", (event) => {
    let best = 0;
    let bestBody: Matter.Body | null = null;
    for (const pair of event.pairs) {
      const { bodyA, bodyB, collision } = pair;
      const va = bodyA.isStatic ? { x: 0, y: 0 } : (prevVel.get(bodyA.id) ?? bodyA.velocity);
      const vb = bodyB.isStatic ? { x: 0, y: 0 } : (prevVel.get(bodyB.id) ?? bodyB.velocity);
      const closing = Math.abs((va.x - vb.x) * collision.normal.x + (va.y - vb.y) * collision.normal.y);
      if (closing < best) continue;
      best = closing;
      const speedA = bodyA.isStatic ? 0 : Math.hypot(va.x, va.y);
      const speedB = bodyB.isStatic ? 0 : Math.hypot(vb.x, vb.y);
      bestBody = speedA >= speedB ? (bodyA.isStatic ? bodyB : bodyA) : bodyB.isStatic ? bodyA : bodyB;
    }
    if (best < IMPACT_SPEED || !bestBody || bestBody.isStatic) return;
    const chip = chips.find((item) => item.body === bestBody || item.body.id === bestBody.id);
    if (!chip) return;
    // Live runner uses wall clock; offline `step()` uses sim clock so export cooldowns match the fall.
    const now = running ? performance.now() : simClockMs;
    if (now - lastImpactAt < IMPACT_COOLDOWN_MS) return;
    lastImpactAt = now;
    const bounceIndex = bounceCount.get(chip.body.id) ?? 0;
    bounceCount.set(chip.body.id, bounceIndex + 1);
    const speedFactor = Math.min(1, best / IMPACT_FULL_SPEED);
    if (impactListener) {
      try {
        impactListener({ slotId: chip.slotId, bounceIndex, speedFactor, timeMs: simClockMs });
      } catch {
        // Export recorders must never break the Matter step.
      }
    } else {
      playImpact(chip.slotId, bounceIndex, speedFactor);
    }
  });

  Events.on(engine, "afterUpdate", () => {
    // Wide chips ignore side walls — keep them centered so they can't drift off-canvas.
    for (const chip of chips) {
      if (tooWideForWalls(chip)) pinInsideWalls(chip);
    }
    // While bass/sharp scale is live, keep hard-depenetrating so Matter soft contacts
    // can't leave the enlarged pile intersecting.
    if (chips.some((chip) => Math.abs(chip.audioMul - 1) > 0.002)) separateOverlaps(true);
    else separateOverlaps();
  });

  /** Opacity + scale pop for spawn/discard — baked into `seat()` transform (not CSS `scale`). */
  const CHIP_POP_MS = 250;
  const CHIP_SPAWN_MS = 250;

  function chipPopMs(spawn: boolean) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return 0;
    return spawn ? CHIP_SPAWN_MS : CHIP_POP_MS;
  }

  function chipNodes(chip: DroppedChip) {
    return [chip.el, chip.glow, ...chip.mirrors.flatMap((mirror) => [mirror.face, mirror.glow])];
  }

  /** Ease matching CSS `ease` closely enough for short discard pops. */
  function chipPopEase(t: number) {
    return t * t * (3 - 2 * t);
  }

  /** easeOutCirc — decelerates hard into the final size. */
  function chipPopEaseOutCirc(t: number) {
    return Math.sqrt(1 - (t - 1) ** 2);
  }

  function animateChipPop(chip: DroppedChip, from: number, to: number, onDone?: () => void) {
    const nodes = chipNodes(chip);
    const spawn = to > from;
    const duration = chipPopMs(spawn);
    const ease = spawn ? chipPopEaseOutCirc : chipPopEase;
    chip.popping = true;
    chip.popScale = from;
    for (const node of nodes) {
      node.style.opacity = String(from);
      if (to < from) node.style.pointerEvents = "none";
    }
    seat(chip);
    if (duration === 0) {
      chip.popScale = to;
      chip.popping = false;
      for (const node of nodes) node.style.opacity = String(to);
      if (to > 0) seat(chip);
      onDone?.();
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const k = ease(t);
      const value = from + (to - from) * k;
      chip.popScale = value;
      for (const node of nodes) node.style.opacity = String(value);
      seat(chip);
      if (t < 1) {
        requestAnimationFrame(tick);
        return;
      }
      chip.popScale = to;
      chip.popping = false;
      for (const node of nodes) node.style.opacity = String(to);
      if (to > 0) seat(chip);
      onDone?.();
    };
    requestAnimationFrame(tick);
  }

  function discardChip(chip: DroppedChip) {
    if (pending?.chip === chip) cancelPending();
    if (drag?.pins.some((entry) => entry.chip === chip)) dropPin();
    if (editingId === chip.slotId) editingId = null;
    if (soloBodyId === chip.body.id) soloBodyId = null;
    bounceCount.delete(chip.body.id);
    Composite.remove(engine.world, chip.body);
    chip.chrome?.remove();
    chip.chrome = null;
    const nodes = chipNodes(chip);
    animateChipPop(chip, 1, 0, () => {
      for (const node of nodes) node.remove();
    });
  }

  /** Scale-down discard every chip (layout clear). Slots stay with the app. */
  function discardAll() {
    cancelPending();
    dropPin();
    endXformDrag();
    endGradAngleDrag();
    editingId = null;
    clickChip = null;
    soloBodyId = null;
    const outgoing = chips;
    chips = [];
    for (const chip of outgoing) discardChip(chip);
    bounceCount.clear();
    prevVel.clear();
    maxSpan = 0;
  }

  function replaceBody(
    chip: DroppedChip,
    slot: Slot,
    size: { width: number; height: number },
    chamfer: number,
    physics: PhysicsSettings,
  ) {
    if (drag?.pins.some((entry) => entry.chip === chip)) dropPin();
    const { position, angle, velocity, angularVelocity } = chip.body;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const visualX = position.x + chip.anchorX * cos - chip.anchorY * sin;
    const visualY = position.y + chip.anchorX * sin + chip.anchorY * cos;
    Composite.remove(engine.world, chip.body);
    const { body, anchor } = chipBody(
      slot,
      visualX,
      visualY,
      size.width,
      size.height,
      physics,
      chamfer,
      angle,
    );
    Body.setVelocity(body, velocity);
    Body.setAngularVelocity(body, angularVelocity);
    Composite.add(engine.world, body);
    const priorBounces = bounceCount.get(chip.body.id) ?? 0;
    const wasSolo = soloBodyId === chip.body.id;
    bounceCount.delete(chip.body.id);
    bounceCount.set(body.id, priorBounces);
    chip.body = body;
    if (wasSolo) soloBodyId = body.id;
    chip.anchorX = anchor.x;
    chip.anchorY = anchor.y;
    chip.meshKey = meshKey(slot, size.width, size.height, chamfer, physicsComplexity(physics.complexity));
    chip.width = size.width;
    chip.height = size.height;
    chip.chamfer = chamfer;
    if (chip.audioMul !== 1) Body.scale(body, chip.audioMul, chip.audioMul);
    applyBodyFlip(chip);
    if (chip.slotId === editingId) Body.setStatic(body, true);
    noteSpan(size.width, size.height);
    buildSides(bounds.width, bounds.height);
    setFloorOpen(floorOpen);
    syncWallCollision(chip);
    seat(chip);
  }

  function spawnChip(
    slot: Slot,
    x: number,
    y: number,
    angle: number,
    sizeUnit: number,
    physics: PhysicsSettings,
    scale: number,
    theme: ColorTheme,
    pillPad: number,
    tracking: number,
    sizeRandom: number,
    seqIndex: number,
    seqTotal: number,
    scaleMul = 1,
  ) {
    const { scaled, size, radius, chamfer } = contained(
      slot,
      scale * sizeJitter(sizeUnit, sizeRandom) * scaleMul,
      pillPad,
      tracking,
      bounds.width,
    );
    noteSpan(size.width, size.height);
    const { body, anchor } = chipBody(
      slot,
      x,
      y,
      size.width,
      size.height,
      physics,
      chamfer,
      angle,
    );
    Body.setVelocity(body, { x: 0, y: 0 });
    Body.setAngularVelocity(body, 0);

    const el = document.createElement("div");
    const glow = document.createElement("div");
    el.className = "chip";
    glow.className = "chip";
    const chip: DroppedChip = {
      slotId: slot.id,
      seqIndex,
      seqTotal,
      body,
      el,
      glow,
      chrome: null,
      mirrors: [],
      width: size.width,
      height: size.height,
      chamfer,
      anchorX: anchor.x,
      anchorY: anchor.y,
      meshKey: meshKey(slot, size.width, size.height, chamfer, physicsComplexity(physics.complexity)),
      sizeUnit,
      scaleMul,
      flipX: false,
      flipY: false,
      look: null,
      audioMul: 1,
      popScale: 0,
      popping: true,
    };
    mountMirrors(chip);
    paint(chip, scaled, size, radius, theme, trackingEm(trackingOf(slot, tracking)), glyphShift(slot));
    syncWallCollision(chip);
    for (const node of chipNodes(chip)) node.style.opacity = "0";
    seat(chip);
    layer!.append(el);
    bloomLayer!.append(glow);
    Composite.add(engine.world, body);
    chips.push(chip);
    animateChipPop(chip, 0, 1);
    return chip;
  }

  function refresh(
    slots: Slot[],
    physics: PhysicsSettings,
    scale: number,
    theme: ColorTheme,
    pillPad: number,
    tracking: number,
    sizeRandom: number,
  ): boolean {
    applyPhysics(physics);
    const byId = new Map(slots.map((slot) => [slot.id, slot]));
    const falling = expandSlots(slots);
    const want = new Map<string, number>();
    for (const slot of falling) {
      want.set(slot.id, (want.get(slot.id) ?? 0) + 1);
    }

    let removed = 0;
    let remeshed = 0;
    const grown: DroppedChip[] = [];
    chips = chips.filter((chip) => {
      const slot = byId.get(chip.slotId);
      if (!slot || (slot.kind === "image" && !slot.src && !slot.emoji && !slot.youtube && !slot.video)) {
        discardChip(chip);
        removed += 1;
        return false;
      }

      const prevW = chip.width;
      const prevH = chip.height;
      let { scaled, size, radius, chamfer } = contained(
        slot,
        scale * sizeJitter(chip.sizeUnit, sizeRandom) * chip.scaleMul,
        pillPad,
        tracking,
        bounds.width,
      );
      if (editingId === chip.slotId && scaled.kind === "text") {
        size = measureTextEditSize(
          scaled,
          pillPadOf(slot, pillPad) / 50,
          trackingEm(trackingOf(slot, tracking)),
        );
        radius = cornerRadius(scaled, size);
        chamfer = chamferFor(radius, size.width, size.height);
      }
      paint(chip, scaled, size, radius, theme, trackingEm(trackingOf(slot, tracking)), glyphShift(slot));
      if (chip.meshKey !== meshKey(slot, size.width, size.height, chamfer, physicsComplexity(physics.complexity))) {
        replaceBody(chip, slot, size, chamfer, physics);
        remeshed += 1;
        if (size.width > prevW + 1 || size.height > prevH + 1) grown.push(chip);
      }
      return true;
    });

    const kept = new Map<string, number>();
    chips = chips.filter((chip) => {
      const n = (kept.get(chip.slotId) ?? 0) + 1;
      if (n > (want.get(chip.slotId) ?? 0)) {
        discardChip(chip);
        removed += 1;
        return false;
      }
      kept.set(chip.slotId, n);
      return true;
    });

    if (!layer || !bloomLayer || bounds.width < 8) {
      paintPicked();
      return removed > 0 || remeshed > 0;
    }

    // Keep new chips on-screen (playfield clips overflow). Drop them just above the
    // pile — or into the upper field when empty — so one seat() already shows them.
    const pileTop =
      chips.length > 0
        ? Math.min(
            ...chips.map(
              (chip) => chip.body.position.y - Math.hypot(chip.width, chip.height) / 2,
            ),
          )
        : bounds.height * 0.35;
    let spawnY = Math.max(48, Math.min(pileTop - 28, bounds.height * 0.45));
    let added = 0;
    let placed: DroppedChip[] = [];
    let placeIndex = 0;

    for (const [id, need] of want) {
      const slot = byId.get(id);
      if (!slot) continue;
      let have = kept.get(id) ?? 0;
      while (have < need) {
        const sizeUnit = Math.random() * 2 - 1;
        const layout = contained(
          slot,
          scale * sizeJitter(sizeUnit, sizeRandom),
          pillPad,
          tracking,
          bounds.width,
        );
        const reach = Math.hypot(layout.size.width, layout.size.height) / 2;
        const inset = Math.min(Math.max(reach + 12, 24), Math.max(24, bounds.width / 2 - 8));
        const span = Math.max(0, bounds.width - inset * 2);
        const drop = pendingPlace && pendingPlace.ids.has(id) ? pendingPlace : null;
        const tight = layout.size.width > bounds.width * 0.65;
        const angle = drop ? 0 : (Math.random() - 0.5) * (tight ? 0.12 : 0.8);
        const half = tiltedHalfHeight(layout.size.width, layout.size.height, angle);
        const x = drop
          ? drop.x + (placeIndex % 3) * 14
          : inset + Math.random() * span;
        const y = drop ? drop.y + Math.floor(placeIndex / 3) * 14 : Math.max(half + 8, spawnY);
        if (!drop) spawnY = y - half - 12;
        const chip = spawnChip(
          slot,
          x,
          y,
          angle,
          sizeUnit,
          physics,
          scale,
          theme,
          pillPad,
          tracking,
          sizeRandom,
          chips.length,
          falling.length,
        );
        if (drop) {
          Body.setVelocity(chip.body, { x: 0, y: 0 });
          placed.push(chip);
          placeIndex += 1;
        } else if (layoutMode) {
          Body.setVelocity(chip.body, { x: 0, y: 0 });
          Body.setAngularVelocity(chip.body, 0);
          Sleeping.set(chip.body, true);
        } else {
          // Nudge so the frame loop treats the pile as busy and keeps syncing.
          Body.setVelocity(chip.body, { x: (Math.random() - 0.5) * 2, y: 2 });
        }
        have += 1;
        kept.set(id, have);
        added += 1;
      }
    }

    if (pendingPlace) {
      if (placed.length > 0) releaseGrowth(placed);
      pendingPlace = null;
    }

    const disturbed = added > 0 || removed > 0 || remeshed > 0;
    if (added > 0 || removed > 0) {
      buildSides(bounds.width, bounds.height);
      setFloorOpen(floorOpen);
    }
    // Wide chips must skip side walls before wake/separate, or dual-wall digs launch the pile.
    for (const chip of chips) syncWallCollision(chip);
    // Composition/slot scale remeshes colliders in place. Without a wake, a frozen or
    // runner-stopped pile keeps the new meshes asleep mid-air (shrink gaps especially).
    if (layoutMode) {
      if (grown.length > 0) releaseGrowth(grown);
      for (const chip of chips) {
        Body.setVelocity(chip.body, { x: 0, y: 0 });
        Body.setAngularVelocity(chip.body, 0);
        Sleeping.set(chip.body, true);
        pinInsideWalls(chip);
      }
    } else {
      if (disturbed) {
        wakeAll();
        if (!running) setRunning(true);
      }
      if (grown.length > 0) releaseGrowth(grown);
      else if (remeshed > 0) separateOverlaps(true);
      for (const chip of chips) pinInsideWalls(chip);
    }
    // seat() alone is enough for the first paint; sync again so any body nudges show up
    // even when main's phase is idle and the frame loop skips sync.
    sync();
    paintPicked();
    return disturbed;
  }

  function refreshSlot(
    slotId: string,
    slots: Slot[],
    physics: PhysicsSettings,
    scale: number,
    theme: ColorTheme,
    pillPad: number,
    tracking: number,
    sizeRandom: number,
    opts?: { quiet?: boolean },
  ) {
    const slot = slots.find((item) => item.id === slotId);
    if (!slot) return;
    applyPhysics(physics);
    const grown: DroppedChip[] = [];
    let remeshed = 0;
    for (const chip of chips) {
      if (chip.slotId !== slotId) continue;
      const prevW = chip.width;
      const prevH = chip.height;
      let { scaled, size, radius, chamfer } = contained(
        slot,
        scale * sizeJitter(chip.sizeUnit, sizeRandom) * chip.scaleMul,
        pillPad,
        tracking,
        bounds.width,
      );
      // Contenteditable lays out by advance width; ink AABB is tighter and clips glyphs.
      if (editingId === slotId && scaled.kind === "text") {
        size = measureTextEditSize(
          scaled,
          pillPadOf(slot, pillPad) / 50,
          trackingEm(trackingOf(slot, tracking)),
        );
        radius = cornerRadius(scaled, size);
        chamfer = chamferFor(radius, size.width, size.height);
      }
      paint(chip, scaled, size, radius, theme, trackingEm(trackingOf(slot, tracking)), glyphShift(slot));
      if (chip.meshKey !== meshKey(slot, size.width, size.height, chamfer, physicsComplexity(physics.complexity))) {
        replaceBody(chip, slot, size, chamfer, physics);
        remeshed += 1;
        if (size.width > prevW + 1 || size.height > prevH + 1) grown.push(chip);
      }
      syncWallCollision(chip);
    }
    if (grown.length > 0) {
      // Quiet: live scale already depenetrated — remesh without the upward shove.
      if (opts?.quiet) {
        for (const chip of grown) pinInsideWalls(chip);
        if (!layoutMode) separateOverlaps(true);
      } else {
        releaseGrowth(grown);
      }
    } else if (remeshed > 0) {
      if (layoutMode) {
        for (const chip of chips) {
          if (chip.slotId !== slotId) continue;
          Body.setVelocity(chip.body, { x: 0, y: 0 });
          Body.setAngularVelocity(chip.body, 0);
          Sleeping.set(chip.body, true);
          pinInsideWalls(chip);
        }
      } else {
        wakeAll();
        if (!running) setRunning(true);
        separateOverlaps(true);
      }
    }
    sync();
  }

  function bindStageLayers(stage: HTMLElement) {
    layer = stage.querySelector(".chip-layer");
    bloomLayer = stage.querySelector(".bloom-inner") ?? stage.querySelector(".bloom-blur");
    chromeLayer = stage.querySelector(".chip-chrome-layer");
    // Older stage markup / export hosts — create the overlay next to the chip layer.
    if (!chromeLayer && layer?.parentElement) {
      chromeLayer = document.createElement("div");
      chromeLayer.className = "chip-chrome-layer";
      chromeLayer.setAttribute("aria-hidden", "true");
      const bloom = layer.parentElement.querySelector(":scope > .bloom-layer");
      if (bloom) bloom.after(chromeLayer);
      else layer.after(chromeLayer);
    }
    stageEl = stage;
  }

  function play(
    slots: Slot[],
    physics: PhysicsSettings,
    stage: HTMLElement,
    scale: number,
    theme: ColorTheme,
    pillPad: number,
    tracking: number,
    sizeRandom: number,
  ) {
    bindStageLayers(stage);
    mirrorScenes = frostScenes();
    if (!layer || !bloomLayer) return;

    clear();
    applyPhysics(physics);

    const falling = expandSlots(slots);
    const box = playfieldBox(stage, layer);
    const stageW = box.width;
    const stageH = box.height;
    const sizeUnits = falling.map(() => Math.random() * 2 - 1);
    const layouts = falling.map((slot, index) =>
      contained(slot, scale * sizeJitter(sizeUnits[index], sizeRandom), pillPad, tracking, stageW),
    );
    maxSpan = 0;
    for (const { size } of layouts) noteSpan(size.width, size.height);
    floorOpen = false;
    resize(stageW, stageH);

    let spawnY = layoutMode ? stageH * 0.28 : -160;

    falling.forEach((slot, index) => {
      const { size } = layouts[index];
      const reach = Math.hypot(size.width, size.height) / 2;
      const inset = Math.min(Math.max(reach + 12, 24), Math.max(24, stageW / 2 - 8));
      const span = Math.max(0, stageW - inset * 2);
      const x = inset + Math.random() * span;
      const tight = size.width > stageW * 0.65;
      const angle = layoutMode ? 0 : (Math.random() - 0.5) * (tight ? 0.12 : 0.8);
      const half = tiltedHalfHeight(size.width, size.height, angle);
      let y: number;
      if (layoutMode) {
        y = Math.min(stageH * 0.72, Math.max(half + 16, spawnY));
        spawnY = y + half + 18;
      } else {
        spawnY -= half + 16;
        y = spawnY;
        spawnY -= half;
      }
      spawnChip(
        slot,
        x,
        y,
        angle,
        sizeUnits[index],
        physics,
        scale,
        theme,
        pillPad,
        tracking,
        sizeRandom,
        index,
        falling.length,
      );
      if (layoutMode) {
        const chip = chips[chips.length - 1];
        if (chip) {
          Body.setVelocity(chip.body, { x: 0, y: 0 });
          Body.setAngularVelocity(chip.body, 0);
          Sleeping.set(chip.body, true);
        }
      }
    });
    paintPicked();
  }

  function poses(): ChipPose[] {
    return chips.map((chip) => ({
      slotId: chip.slotId,
      seqIndex: chip.seqIndex,
      sizeUnit: chip.sizeUnit,
      scaleMul: chip.scaleMul === 1 ? undefined : chip.scaleMul,
      flipX: chip.flipX || undefined,
      flipY: chip.flipY || undefined,
      x: chip.body.position.x,
      y: chip.body.position.y,
      angle: chip.body.angle,
    }));
  }

  /** Mirror Matter vertices to match visual flip. */
  function applyBodyFlip(chip: DroppedChip) {
    if (chip.flipX) flipBodyAxis(chip.body, "x");
    if (chip.flipY) flipBodyAxis(chip.body, "y");
  }

  function flipChips(slotId: string, axis: "x" | "y") {
    const targets = xformTargets(slotId);
    if (!targets.length) return;
    for (const chip of targets) {
      if (axis === "x") {
        chip.flipX = !chip.flipX;
      } else {
        chip.flipY = !chip.flipY;
      }
      flipBodyAxis(chip.body, axis);
      syncWallCollision(chip);
      seat(chip);
    }
    if (layoutMode) {
      for (const chip of targets) {
        Body.setVelocity(chip.body, { x: 0, y: 0 });
        Body.setAngularVelocity(chip.body, 0);
        Sleeping.set(chip.body, true);
        pinInsideWalls(chip);
      }
    } else {
      wakeAll();
      if (!running) setRunning(true);
    }
  }

  function alignChipsStraight(slotId: string) {
    const targets = xformTargets(slotId);
    if (!targets.length) return;
    for (const chip of targets) {
      Body.setAngle(chip.body, 0);
      Body.setVelocity(chip.body, { x: 0, y: 0 });
      Body.setAngularVelocity(chip.body, 0);
      syncWallCollision(chip);
      seat(chip);
    }
    if (layoutMode) {
      for (const chip of targets) {
        Sleeping.set(chip.body, true);
        pinInsideWalls(chip);
      }
    } else {
      wakeAll();
      if (!running) setRunning(true);
    }
  }

  /** Keep import / drop points inside the playfield so a stale click can't shove the pile off-canvas. */
  function clampPlacePoint(x: number, y: number) {
    if (bounds.width < 16 || bounds.height < 16) return { x, y };
    const pad = EDGE + 8;
    return {
      x: Math.min(Math.max(x, pad), Math.max(pad, bounds.width - pad)),
      y: Math.min(Math.max(y, pad), Math.max(pad, bounds.height - pad)),
    };
  }

  /** Drop freshly added chips on a point and carve room in a sleeping or held pile. */
  function placeSlotsAt(slotIds: Iterable<string>, x: number, y: number) {
    const ids = new Set(slotIds);
    const targets = chips.filter((chip) => ids.has(chip.slotId));
    if (!targets.length) return;
    const at = clampPlacePoint(x, y);

    for (let i = 0; i < targets.length; i++) {
      const chip = targets[i]!;
      const ox = (i % 3) * 14;
      const oy = Math.floor(i / 3) * 14;
      Body.setPosition(chip.body, { x: at.x + ox, y: at.y + oy });
      Body.setAngle(chip.body, 0);
      Body.setVelocity(chip.body, { x: 0, y: 0 });
      Body.setAngularVelocity(chip.body, 0);
      Sleeping.set(chip.body, layoutMode);
    }
    if (layoutMode) {
      for (const chip of targets) pinInsideWalls(chip);
    } else {
      releaseGrowth(targets);
    }
    sync();
  }

  function chipsOverlap(): boolean {
    for (let i = 0; i < chips.length; i++) {
      for (let j = i + 1; j < chips.length; j++) {
        const a = chips[i]!.body;
        const b = chips[j]!.body;
        if (boundsMiss(a, b)) continue;
        const aParts = solidParts(a);
        const bParts = solidParts(b);
        for (let pa = 0; pa < aParts.length; pa++) {
          const partA = aParts[pa]!;
          for (let pb = 0; pb < bParts.length; pb++) {
            const partB = bParts[pb]!;
            if (boundsMiss(partA, partB)) continue;
            const hit = Collision.collides(partA, partB);
            if (hit && hit.depth > 0.5) return true;
          }
        }
      }
    }
    return false;
  }

  function armPlaceAt(slotIds: Iterable<string>, x: number, y: number) {
    const at = clampPlacePoint(x, y);
    pendingPlace = { ids: new Set(slotIds), x: at.x, y: at.y };
  }

  function restore(
    slots: Slot[],
    physics: PhysicsSettings,
    stage: HTMLElement,
    scale: number,
    theme: ColorTheme,
    pillPad: number,
    tracking: number,
    sizeRandom: number,
    saved: ChipPose[],
    frame: { width: number; height: number },
  ) {
    bindStageLayers(stage);
    mirrorScenes = frostScenes();
    if (!layer || !bloomLayer) return;

    clear();
    applyPhysics(physics);

    const box = playfieldBox(stage, layer);
    const stageW = box.width;
    const stageH = box.height;
    const sx = frame.width > 0 ? stageW / frame.width : 1;
    const sy = frame.height > 0 ? stageH / frame.height : 1;

    floorOpen = false;
    maxSpan = 0;
    resize(stageW, stageH);

    const byId = new Map(slots.map((slot) => [slot.id, slot]));
    const total = saved.length;

    saved.forEach((pose) => {
      const slot = byId.get(pose.slotId);
      if (!slot || (slot.kind === "image" && !slot.src && !slot.emoji && !slot.youtube && !slot.video)) return;
      spawnChip(
        slot,
        pose.x * sx,
        pose.y * sy,
        pose.angle,
        pose.sizeUnit,
        physics,
        scale,
        theme,
        pillPad,
        tracking,
        sizeRandom,
        pose.seqIndex,
        total,
        pose.scaleMul ?? 1,
      );
      const chip = chips[chips.length - 1];
      if (!chip) return;
      chip.flipX = Boolean(pose.flipX);
      chip.flipY = Boolean(pose.flipY);
      applyBodyFlip(chip);
      Body.setVelocity(chip.body, { x: 0, y: 0 });
      Body.setAngularVelocity(chip.body, 0);
      Sleeping.set(chip.body, true);
      seat(chip);
    });
    paintPicked();
  }

  function paintPicked() {
    for (const chip of chips) {
      const on = isPickPainted(chip);
      // Mount chrome before flipping is-picked so opacity/scale can fade in.
      if (on) {
        const frameHost = ensureChrome(chip);
        const needFrame = !frameHost.querySelector(":scope > .chip-xform-frame");
        const needHandles = frameHost.querySelectorAll(":scope > .chip-xform-handle").length !== 4;
        const hadWheel = Boolean(chip.el.querySelector(":scope > .chip-grad-wheel"));
        ensureXformFrame(frameHost);
        ensureXformHandle(frameHost);
        syncGradWheel(chip);
        const createdWheel =
          !hadWheel && Boolean(chip.el.querySelector(":scope > .chip-grad-wheel"));
        // Newly inserted nodes need a layout pass or the fade-in is skipped.
        if (!chip.el.classList.contains("is-picked") && (needFrame || needHandles || createdWheel)) {
          void chip.el.offsetWidth;
          void frameHost.offsetWidth;
        }
        chip.el.classList.add("is-picked");
        frameHost.classList.add("is-picked");
        syncChromeSeat(chip);
        syncXformHandleSide(chip, chipCssMul(chip));
      } else {
        chip.el.classList.remove("is-picked");
        const host = chip.chrome;
        if (host && host !== chip.el) {
          host.classList.remove("is-picked", "is-scaling", "is-rotating", "is-grad-angling");
        }
        if (xformHover?.bodyId === chip.body.id) xformHover = null;
        releaseGradWheel(chip.el);
      }
    }
  }

  /** Match gradient wheel appear/dismiss (0.15s). */
  const CHROME_FADE_MS = 150;

  /**
   * Overlay host for selection frame + scale handle (always on top).
   * Gradient wheel stays on the chip so it doesn't steal picks from assets in front.
   */
  function ensureChrome(chip: DroppedChip): HTMLElement {
    if (chip.chrome?.isConnected) {
      // Wheel stays on the chip; frame + handle live on the overlay.
      for (const node of chip.chrome.querySelectorAll(":scope > .chip-grad-wheel")) {
        chip.el.append(node);
      }
      for (const node of chip.el.querySelectorAll(
        ":scope > .chip-xform-frame, :scope > .chip-xform-handle",
      )) {
        chip.chrome.append(node);
      }
      return chip.chrome;
    }
    if (!chromeLayer) {
      chip.chrome = chip.el;
      return chip.el;
    }
    const host = document.createElement("div");
    host.className = "chip-chrome";
    host.dataset.bodyId = String(chip.body.id);
    // Migrate frame / handle left on the chip from earlier mounts / hot reload.
    for (const node of chip.el.querySelectorAll(
      ":scope > .chip-xform-frame, :scope > .chip-xform-handle",
    )) {
      host.append(node);
    }
    chromeLayer.append(host);
    chip.chrome = host;
    return host;
  }

  /** Frame / scale-handle host (overlay when available, else the chip). */
  function xformChromeOf(chip: DroppedChip): HTMLElement {
    return chip.chrome?.isConnected ? chip.chrome : chip.el;
  }

  function chipFromEl(el: Element | null): DroppedChip | undefined {
    if (!(el instanceof HTMLElement)) return undefined;
    return chips.find((item) => item.el === el || item.chrome === el);
  }

  /**
   * Front-most chip whose physics body contains the stage point.
   * Prefer this over DOM hit-testing — layout mix-blend-mode + the selection
   * overlay often make `event.target` miss the chip you clicked.
   */
  function topChipAtStagePoint(x: number, y: number): DroppedChip | undefined {
    const point = { x, y };
    for (let i = chips.length - 1; i >= 0; i--) {
      const chip = chips[i]!;
      if (Query.point([chip.body], point).length > 0) return chip;
    }
    return undefined;
  }

  /** Keep overlay host locked to the chip's live box + transform. */
  function syncChromeSeat(
    chip: DroppedChip,
    x?: number,
    y?: number,
    angle?: number,
    anchorX?: number,
    anchorY?: number,
    scaleX?: number,
    scaleY?: number,
  ) {
    const host = chip.chrome;
    if (!host || host === chip.el || !host.isConnected) return;
    host.style.width = `${chip.width}px`;
    host.style.height = `${chip.height}px`;
    if (x == null || y == null || angle == null || anchorX == null || anchorY == null) {
      host.style.transformOrigin = chip.el.style.transformOrigin;
      host.style.transform = chip.el.style.transform;
    } else {
      place(host, x, y, angle, chip.width, chip.height, anchorX, anchorY, scaleX ?? 1, scaleY ?? 1);
    }
    const chromeScale = chip.el.style.getPropertyValue("--chrome-scale");
    if (chromeScale) host.style.setProperty("--chrome-scale", chromeScale);
    else host.style.removeProperty("--chrome-scale");
    const scalePreview = chip.el.style.getPropertyValue("--scale-preview");
    if (scalePreview) host.style.setProperty("--scale-preview", scalePreview);
    else host.style.removeProperty("--scale-preview");
    // Concentric selection stroke: outer radius = asset radius + xform pad.
    host.style.setProperty("--chip-radius", `${chip.look?.radius ?? 0}px`);
  }

  function releaseGradWheel(host: HTMLElement) {
    const wheel = host.querySelector(":scope > .chip-grad-wheel");
    if (!(wheel instanceof HTMLElement)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      wheel.remove();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      wheel.removeEventListener("transitionend", onEnd);
      // Re-selected before the fade finished — keep the node.
      if (host.classList.contains("is-picked") && host.contains(wheel)) return;
      wheel.remove();
    };
    const onEnd = (event: TransitionEvent) => {
      if (event.target !== wheel || event.propertyName !== "opacity") return;
      finish();
    };
    wheel.addEventListener("transitionend", onEnd);
    window.setTimeout(finish, CHROME_FADE_MS + 80);
  }

  function isPickPainted(chip: DroppedChip) {
    if (!pickedIds.has(chip.slotId)) return false;
    if (soloBodyId != null) return chip.body.id === soloBodyId;
    return true;
  }

  /**
   * Chips that share a transform gesture.
   * Amount copies of one slot are independent (soloBodyId) unless Shift multi-select
   * spans distinct slots — then every chip of each picked slot moves together.
   */
  function xformTargets(slotId: string) {
    if (pickedIds.size > 1 && pickedIds.has(slotId) && soloBodyId == null) {
      return chips.filter((chip) => pickedIds.has(chip.slotId));
    }
    if (soloBodyId != null) {
      const solo = chips.find(
        (chip) => chip.slotId === slotId && chip.body.id === soloBodyId,
      );
      if (solo) return [solo];
    }
    // Single-slot fallback: one body only (never every Amount copy).
    const match = chips.find((chip) => chip.slotId === slotId);
    return match ? [match] : [];
  }

  function ensureXformFrame(host: HTMLElement) {
    // Drop SVG frames from earlier builds.
    host.querySelector(":scope > svg.chip-xform-frame")?.remove();
    if (!host.querySelector(":scope > .chip-xform-frame")) {
      const frame = document.createElement("div");
      frame.className = "chip-xform-frame";
      frame.setAttribute("aria-hidden", "true");
      host.prepend(frame);
    }
  }

  const XFORM_CORNERS: { id: XformCorner; sx: 1 | -1; sy: 1 | -1 }[] = [
    { id: "se", sx: 1, sy: 1 },
    { id: "ne", sx: 1, sy: -1 },
    { id: "nw", sx: -1, sy: -1 },
    { id: "sw", sx: -1, sy: 1 },
  ];

  const XFORM_CORNER_CLASS: Record<XformCorner, string> = {
    se: "chip-xform-handle--se",
    ne: "chip-xform-handle--ne",
    nw: "chip-xform-handle--nw",
    sw: "chip-xform-handle--sw",
  };

  /** Nearest corner in soft/hot range; phase drives mini vs large morph. */
  type XformHoverPhase = "soft" | "hot";
  let xformHover: { bodyId: number; corner: XformCorner; phase: XformHoverPhase } | null = null;

  function readXformHandleCorner(handle: HTMLElement): XformCorner {
    if (handle.classList.contains("chip-xform-handle--nw")) return "nw";
    if (handle.classList.contains("chip-xform-handle--ne")) return "ne";
    if (handle.classList.contains("chip-xform-handle--sw")) return "sw";
    return "se";
  }

  function ensureXformHandle(el: HTMLElement) {
    for (const old of el.querySelectorAll(":scope > .chip-scale-handle, :scope > .chip-rotate-handle")) {
      old.remove();
    }

    // Four corner handles (older builds: solo SE, or NW rotate + SE scale).
    const handles = [...el.querySelectorAll(":scope > .chip-xform-handle")];
    const legacy = handles.some(
      (node) =>
        node.classList.contains("chip-xform-handle--rotate") ||
        node.classList.contains("chip-xform-handle--scale"),
    );
    const byCorner = new Map<XformCorner, HTMLElement>();
    if (!legacy) {
      for (const node of handles) {
        if (!(node instanceof HTMLElement)) continue;
        byCorner.set(readXformHandleCorner(node), node);
      }
    }
    if (legacy || byCorner.size !== XFORM_CORNERS.length) {
      for (const node of handles) node.remove();
      byCorner.clear();
    }

    for (const { id } of XFORM_CORNERS) {
      let handle = byCorner.get(id);
      if (!handle) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `chip-xform-handle ${XFORM_CORNER_CLASS[id]}`;
        btn.tabIndex = -1;
        btn.setAttribute("aria-label", "Rotate and scale");
        btn.dataset.icon = "hand-grabbing";
        btn.innerHTML = handGrabbing;
        el.append(btn);
      } else {
        handle.className = `chip-xform-handle ${XFORM_CORNER_CLASS[id]}`;
        if (handle.dataset.icon !== "hand-grabbing") {
          handle.innerHTML = handGrabbing;
          handle.dataset.icon = "hand-grabbing";
          handle.setAttribute("aria-label", "Rotate and scale");
        }
      }
    }
  }

  /** Frame-corner world position (pad inset), scaled by live CSS mul. */
  function xformCornerWorld(chip: DroppedChip, corner: XformCorner, mul: number, pad = 12) {
    const entry = XFORM_CORNERS.find((item) => item.id === corner)!;
    const cos = Math.cos(chip.body.angle);
    const sin = Math.sin(chip.body.angle);
    const vx = (chip.width / 2 + pad) * mul * entry.sx;
    const vy = (chip.height / 2 + pad) * mul * entry.sy;
    return {
      x: chip.body.position.x + vx * cos - vy * sin,
      y: chip.body.position.y + vx * sin + vy * cos,
    };
  }

  /**
   * Reveal only the proximity (or drag) corner: `--soft` = mini, `--hot` = large.
   * All other corners stay hidden. `mul` kept for seat()/paintPicked call sites.
   */
  function syncXformHandleSide(chip: DroppedChip, _mul = 1) {
    if (!isPickPainted(chip)) return;
    let soft: XformCorner | null = null;
    let hot: XformCorner | null = null;
    if (xformDrag && xformDrag.chip.body.id === chip.body.id) {
      hot = xformDrag.corner;
    } else if (xformHover && xformHover.bodyId === chip.body.id) {
      if (xformHover.phase === "hot") hot = xformHover.corner;
      else soft = xformHover.corner;
    }
    for (const node of xformChromeOf(chip).querySelectorAll(":scope > .chip-xform-handle")) {
      if (!(node instanceof HTMLElement)) continue;
      const corner = readXformHandleCorner(node);
      node.classList.toggle("chip-xform-handle--soft", corner === soft);
      node.classList.toggle("chip-xform-handle--hot", corner === hot);
    }
  }

  /**
   * Soft = show mini; hot = morph to large. Stick radii avoid flicker at the edge.
   * Distances are stage px from the selection-frame corner.
   */
  const CORNER_SOFT_ENTER = 240;
  const CORNER_SOFT_STICK = 310;
  const CORNER_HOT_ENTER = 48;
  const CORNER_HOT_STICK = 68;

  function hoverCornerNear(
    chip: DroppedChip,
    point: { x: number; y: number },
    current: XformCorner | null,
  ): { corner: XformCorner; dist: number } | null {
    const mul = chipCssMul(chip);
    let best: XformCorner | null = null;
    let bestDist = Infinity;
    for (const { id } of XFORM_CORNERS) {
      const at = xformCornerWorld(chip, id, mul);
      const dist = Math.hypot(point.x - at.x, point.y - at.y);
      const limit = id === current ? CORNER_SOFT_STICK : CORNER_SOFT_ENTER;
      if (dist <= limit && dist < bestDist) {
        bestDist = dist;
        best = id;
      }
    }
    return best ? { corner: best, dist: bestDist } : null;
  }

  function hoverPhaseFor(
    dist: number,
    corner: XformCorner,
    prev: { corner: XformCorner; phase: XformHoverPhase } | null,
  ): XformHoverPhase {
    const same = prev?.corner === corner;
    if (dist <= CORNER_HOT_ENTER) return "hot";
    if (same && prev?.phase === "hot" && dist <= CORNER_HOT_STICK) return "hot";
    return "soft";
  }

  /**
   * Resolve soft/hot/hidden from a stage point (and optional DOM target).
   * Used by pointermove and by release settle so we never flash larger than grab.
   */
  function resolveXformHoverAt(
    point: { x: number; y: number },
    target: EventTarget | null = null,
  ): typeof xformHover {
    if (pickedIds.size === 0) return null;
    const overHandle =
      target instanceof Element ? target.closest(".chip-xform-handle") : null;
    if (overHandle instanceof HTMLElement) {
      const host = overHandle.closest(".chip, .chip-chrome");
      const chip = chipFromEl(host);
      if (chip && isPickPainted(chip)) {
        return {
          bodyId: chip.body.id,
          corner: readXformHandleCorner(overHandle),
          phase: "hot",
        };
      }
    }
    let bestChip: DroppedChip | null = null;
    let bestCorner: XformCorner | null = null;
    let bestDist = Infinity;
    for (const chip of chips) {
      if (!isPickPainted(chip)) continue;
      const current = xformHover?.bodyId === chip.body.id ? xformHover.corner : null;
      const hit = hoverCornerNear(chip, point, current);
      if (!hit) continue;
      if (hit.dist < bestDist) {
        bestDist = hit.dist;
        bestChip = chip;
        bestCorner = hit.corner;
      }
    }
    if (!bestChip || !bestCorner) return null;
    const prev =
      xformHover?.bodyId === bestChip.body.id
        ? { corner: xformHover.corner, phase: xformHover.phase }
        : null;
    return {
      bodyId: bestChip.body.id,
      corner: bestCorner,
      phase: hoverPhaseFor(bestDist, bestCorner, prev),
    };
  }

  function applyXformHover(next: typeof xformHover) {
    const prev = xformHover;
    if (
      (next?.bodyId ?? null) === (prev?.bodyId ?? null) &&
      (next?.corner ?? null) === (prev?.corner ?? null) &&
      (next?.phase ?? null) === (prev?.phase ?? null)
    ) {
      return;
    }
    xformHover = next;
    for (const chip of chips) {
      if (!isPickPainted(chip)) continue;
      syncXformHandleSide(chip);
    }
  }

  function updateXformHandleHover(event: PointerEvent) {
    if (xformDrag || drag || gradAngleDrag || editingId) return;
    applyXformHover(resolveXformHoverAt(stagePoint(event), event.target));
  }

  /** CSS degrees: 0 up, 90 right — matches linear-gradient / gradientLine. */
  function localPolar(chip: DroppedChip, point: { x: number; y: number }) {
    const dx = point.x - chip.body.position.x;
    const dy = point.y - chip.body.position.y;
    const cos = Math.cos(chip.body.angle);
    const sin = Math.sin(chip.body.angle);
    const localX = dx * cos + dy * sin;
    const localY = -dx * sin + dy * cos;
    return {
      angle: ((Math.atan2(localX, -localY) * 180) / Math.PI + 360) % 360,
      dist: Math.hypot(localX, localY),
    };
  }

  /** Live CSS scale on the chip (asset-scale preview × audio pulse). */
  function chipCssMul(chip: DroppedChip) {
    return Math.max(0.001, scalePreviewFactor(chip) * (audioScaleBySlot.get(chip.slotId) ?? 1));
  }

  /**
   * Wheel geometry. `maxR` / `chipR` are in stage/body pixels (for polar hit tests).
   * `size` is chip-local px — parent CSS scale brings it to screen.
   */
  function chipWheelMetrics(chip: DroppedChip) {
    const mul = chipCssMul(chip);
    const span = Math.max(chip.width, chip.height);
    const visualSpan = span * mul;
    const padScreen = Math.min(36, Math.max(12, visualSpan * 0.14));
    const size = span + (2 * padScreen) / mul;
    const maxR = visualSpan / 2 + padScreen - 2;
    const chipR = visualSpan / 2;
    return { mul, span, size, maxR, chipR, padScreen };
  }

  /** Map gradient scale 1–100 onto a ring between the chip edge and the outer guide. */
  function radiusForGradScale(scale: number, maxR: number, chipR: number) {
    const minR = Math.min(maxR, Math.max(maxR * 0.28, chipR * 0.55));
    const t = (gradientScaleOf(scale) - 1) / 99;
    return minR + t * (maxR - minR);
  }

  function gradScaleForRadius(dist: number, maxR: number, chipR: number) {
    const minR = Math.min(maxR, Math.max(maxR * 0.28, chipR * 0.55));
    const t = Math.max(0, Math.min(1, (dist - minR) / Math.max(1, maxR - minR)));
    return gradientScaleOf(1 + t * 99);
  }

  function syncGradWheel(chip: DroppedChip) {
    const info = gradientOf?.(chip.slotId) ?? null;
    const host = chip.el;
    let wheel = host.querySelector(":scope > .chip-grad-wheel");
    if (!info) {
      wheel?.remove();
      return;
    }
    if (
      !(wheel instanceof HTMLElement) ||
      !wheel.querySelector(":scope > .chip-grad-wheel__scale") ||
      !wheel.querySelector(".chip-grad-wheel__ring-path")
    ) {
      wheel?.remove();
      wheel = document.createElement("div");
      wheel.className = "chip-grad-wheel";
      wheel.setAttribute("aria-hidden", "true");
      // SVG annulus hit-target so the open center still receives chip drag.
      const hit = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      hit.setAttribute("class", "chip-grad-wheel__hit");
      hit.setAttribute("viewBox", "0 0 100 100");
      const hitRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      hitRing.setAttribute("class", "chip-grad-wheel__hit-ring");
      hitRing.setAttribute("cx", "50");
      hitRing.setAttribute("cy", "50");
      hitRing.setAttribute("r", "32");
      hitRing.setAttribute("fill", "none");
      hit.append(hitRing);
      const ring = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      ring.setAttribute("class", "chip-grad-wheel__ring");
      ring.setAttribute("viewBox", "0 0 100 100");
      ring.setAttribute("aria-hidden", "true");
      const ringPath = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      ringPath.setAttribute("class", "chip-grad-wheel__ring-path");
      ringPath.setAttribute("cx", "50");
      ringPath.setAttribute("cy", "50");
      ringPath.setAttribute("r", "43");
      ringPath.setAttribute("fill", "none");
      ring.append(ringPath);
      const scaleRing = document.createElement("div");
      scaleRing.className = "chip-grad-wheel__scale";
      const arm = document.createElement("div");
      arm.className = "chip-grad-wheel__arm";
      const hub = document.createElement("div");
      hub.className = "chip-grad-wheel__hub";
      const from = document.createElement("button");
      from.type = "button";
      from.className = "chip-grad-wheel__stop";
      from.dataset.stop = "from";
      from.tabIndex = -1;
      from.setAttribute("aria-label", "Start color");
      const to = document.createElement("button");
      to.type = "button";
      to.className = "chip-grad-wheel__stop";
      to.dataset.stop = "to";
      to.tabIndex = -1;
      to.setAttribute("aria-label", "End color");
      wheel.append(hit, ring, scaleRing, arm, hub, from, to);
      host.append(wheel);
    }
    const { mul, span, size, maxR, chipR } = chipWheelMetrics(chip);
    const wheelEl = wheel as HTMLElement;
    wheelEl.style.width = `${size}px`;
    wheelEl.style.height = `${size}px`;
    // Radii above are stage/body px; convert to chip-local for DOM under CSS scale.
    const scaleR = radiusForGradScale(info.scale, maxR, chipR) / mul;
    const chipRLocal = chipR / mul;
    const ringPath = wheelEl.querySelector(".chip-grad-wheel__ring-path");
    if (ringPath instanceof SVGCircleElement) {
      const rVb = Math.min(48.5, Math.max(20, (chipRLocal / Math.max(1, size / 2)) * 50 + 1.2));
      ringPath.setAttribute("r", String(rVb));
    }
    const hitRing = wheelEl.querySelector(".chip-grad-wheel__hit-ring");
    if (hitRing instanceof SVGCircleElement) {
      const rVb = Math.max(16, Math.min(46, (scaleR / Math.max(1, size / 2)) * 50));
      hitRing.setAttribute("r", String(rVb));
      const desiredCss = Math.min(22, Math.max(10, 10 + span * mul * 0.05));
      hitRing.setAttribute("stroke-width", String((desiredCss / (size * mul)) * 100));
    }
    const scaleRing = wheelEl.querySelector<HTMLElement>(".chip-grad-wheel__scale");
    if (scaleRing) {
      scaleRing.style.width = `${scaleR * 2}px`;
      scaleRing.style.height = `${scaleR * 2}px`;
    }
    const arm = wheelEl.querySelector<HTMLElement>(".chip-grad-wheel__arm");
    if (arm) {
      arm.style.height = `${scaleR}px`;
      arm.style.transform = `translate(-50%, -100%) rotate(${info.angle}deg)`;
    }
    const fromStop = wheelEl.querySelector<HTMLElement>(".chip-grad-wheel__stop[data-stop='from']");
    const toStop = wheelEl.querySelector<HTMLElement>(".chip-grad-wheel__stop[data-stop='to']");
    if (fromStop) {
      fromStop.style.background = info.from;
      placeGradStop(fromStop, info.angle + 180, scaleR);
    }
    if (toStop) {
      toStop.style.background = info.to;
      placeGradStop(toStop, info.angle, scaleR);
    }
  }

  function placeGradStop(el: HTMLElement, angleDeg: number, radius: number) {
    const rad = ((angleDeg % 360) * Math.PI) / 180;
    const x = Math.sin(rad) * radius;
    const y = -Math.cos(rad) * radius;
    el.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }

  function updateChipGradientPaint(chip: DroppedChip, from: string, to: string, angle: number, scale: number) {
    const slot = chip.look?.slot;
    if (!slot) return;
    // look.slot is a scaled copy from the last paint — keep angle/scale in sync with the live wheel.
    if ("gradientAngle" in slot) slot.gradientAngle = angle;
    if ("gradientScale" in slot) slot.gradientScale = scale;
    const radius = chip.look?.radius ?? 0;
    if (slot.kind === "text") {
      if (slot.shape === "none" && slot.gradient) {
        const tracking = chip.look?.tracking ?? 0.02;
        const shiftEm = chip.look?.shiftEm ?? 0;
        const bareCss = Boolean(slot.textAnim) || Boolean(slot.animatedGradient) || chip.slotId === editingId;
        if (bareCss) {
          for (const root of [chip.el, chip.glow]) {
            const label = root.querySelector<HTMLElement>(":scope > .chip-label, :scope > .chip-edit");
            if (label) {
              paintBareTextCss(label, from, to, angle, scale, Boolean(slot.animatedGradient), slot.gradientSpeed);
            }
          }
        } else {
          paintBareText(chip.el, slot, chip.width, chip.height, tracking, from, shiftEm, to, angle, scale);
          paintBareText(chip.glow, slot, chip.width, chip.height, tracking, from, shiftEm, to, angle, scale);
        }
        return;
      }
      const active = Boolean(slot.gradient) && slot.shape !== "none" && !slot.stroked;
      paintFill(
        chip.el,
        active,
        from,
        to,
        chip.width,
        chip.height,
        radius,
        angle,
        scale,
        Boolean(slot.animatedGradient),
        slot.gradientSpeed,
      );
      paintFill(
        chip.glow,
        active,
        from,
        to,
        chip.width,
        chip.height,
        radius,
        angle,
        scale,
        Boolean(slot.animatedGradient),
        slot.gradientSpeed,
      );
      return;
    }
    for (const face of [chip.el.querySelector(":scope > .chip-face"), chip.glow.querySelector(":scope > .chip-face")]) {
      if (!(face instanceof HTMLElement)) continue;
      if (slot.animatedGradient) {
        face.style.setProperty("--grad-angle", String(gradientAngleOf(angle)));
        paintSweepBand(face, from, to, chip.width, chip.height, radius, angle, scale);
      } else {
        face.style.background = pillGradient(from, to, angle, scale);
      }
    }
  }

  function applyLiveGradWheel(nextAngle: number, nextScale: number) {
    if (!gradAngleDrag) return;
    const angleChanged = Math.abs(nextAngle - gradAngleDrag.lastAngle) >= 0.05;
    const scaleChanged = nextScale !== gradAngleDrag.lastScale;
    if (!angleChanged && !scaleChanged) return;
    gradAngleDrag.lastAngle = nextAngle;
    gradAngleDrag.lastScale = nextScale;
    const value = { angle: nextAngle, scale: nextScale };
    if (!gradAngleDrag.rotating) {
      gradAngleDrag.rotating = true;
      beginScrub();
      onGradientWheel?.(gradAngleDrag.slotId, value, "start");
    }
    onGradientWheel?.(gradAngleDrag.slotId, value, "move");
    const info = gradientOf?.(gradAngleDrag.slotId);
    for (const chip of xformTargets(gradAngleDrag.slotId)) {
      if (info) updateChipGradientPaint(chip, info.from, info.to, nextAngle, nextScale);
      syncGradWheel(chip);
    }
  }

  function endGradAngleDrag() {
    if (!gradAngleDrag) return;
    const { lastAngle, lastScale, slotId, stop, stopEl, moved, rotating } = gradAngleDrag;
    gradAngleDrag = null;
    if (rotating) endScrub();
    for (const item of xformTargets(slotId)) {
      item.el.classList.remove("is-grad-angling");
      if (item.slotId !== editingId && item.body.isStatic) Body.setStatic(item.body, false);
      if (layoutMode) {
        Body.setVelocity(item.body, { x: 0, y: 0 });
        Body.setAngularVelocity(item.body, 0);
        Sleeping.set(item.body, true);
      }
    }
    if (!moved && stop && stopEl) {
      onGradientStop?.(slotId, stop, stopEl);
      return;
    }
    if (rotating) onGradientWheel?.(slotId, { angle: lastAngle, scale: lastScale }, "end");
  }

  function scaleMaxFor(_slot: Slot | undefined) {
    // Free-transform only — panel slider soft max lives in main/slotCards.
    // No raster-upload special case: tiny chips must be recoverable after masterScale downs.
    return freeScaleMax;
  }

  /** Free-transform clamp — continuous (no 0.01 snap) so release matches live preview. */
  function clampScale(value: number, max = freeScaleMax) {
    return clampScaleContinuous(value, max);
  }

  function endXformDrag(event?: PointerEvent) {
    if (!xformDrag) return;
    const { lastScale, startScale, startScales, lastAngle, slotId, chip, bodyFactor, corner } =
      xformDrag;
    const solo = soloBodyId != null && soloBodyId === chip.body.id;
    const factor = lastScale / startScale;
    // Settle BEFORE clearing is-scaling: shrink size ok, but never stay hot / inverted.
    // Release always snaps to soft (neutral dark) if still in soft range, else hidden.
    xformDrag = null;
    const host = xformChromeOf(chip);
    for (const node of host.querySelectorAll(":scope > .chip-xform-handle")) {
      if (node instanceof HTMLElement) node.blur();
    }
    if (event) {
      // Ignore event.target (over-handle would force hot) — release is never hot.
      const settled = resolveXformHoverAt(stagePoint(event), null);
      applyXformHover(
        settled ? { bodyId: settled.bodyId, corner: settled.corner, phase: "soft" } : null,
      );
    } else {
      xformHover = { bodyId: chip.body.id, corner, phase: "soft" };
      syncXformHandleSide(chip);
    }
    endScrub();
    for (const item of xformTargets(slotId)) {
      item.el.classList.remove("is-scaling", "is-rotating");
      item.chrome?.classList.remove("is-scaling", "is-rotating");
      item.el.style.removeProperty("--scale-preview");
      item.el.style.removeProperty("--chrome-scale");
      if (item.slotId !== editingId && item.body.isStatic) Body.setStatic(item.body, false);
      if (layoutMode) {
        Body.setVelocity(item.body, { x: 0, y: 0 });
        Body.setAngularVelocity(item.body, 0);
        Sleeping.set(item.body, true);
      }
      // Live Body.scale is only a preview — clear the mesh key so refresh remeshes to the final size.
      if (bodyFactor !== 1) item.meshKey = "";
      // Re-sync after class clear so soft/neutral wins over leftover drag chrome.
      if (isPickPainted(item)) syncXformHandleSide(item);
    }
    if (solo) {
      // Keep slot.scale shared; bake the gesture into this chip only, then remesh.
      chip.scaleMul = Math.min(freeScaleMax, Math.max(SCALE_MIN, chip.scaleMul * factor));
      onScale?.(slotId, scaleOf?.(slotId) ?? startScale, "end");
    } else if (startScales.size > 0) {
      for (const [id, base] of startScales) {
        const max = scaleMaxFor(chips.find((c) => c.slotId === id)?.look?.slot);
        onScale?.(id, clampScale(base * factor, max), "end");
      }
    } else {
      onScale?.(slotId, lastScale, "end");
    }
    onRotate?.(slotId, lastAngle, "end");
  }

  function lockHandle(slotId: string, mode: "xforming" | "grad-angling") {
    dropPin();
    cancelPending();
    for (const chip of xformTargets(slotId)) {
      Body.setVelocity(chip.body, { x: 0, y: 0 });
      Body.setAngularVelocity(chip.body, 0);
      Body.setStatic(chip.body, true);
      if (mode === "xforming") {
        chip.el.classList.add("is-scaling", "is-rotating");
        chip.chrome?.classList.add("is-scaling", "is-rotating");
      } else chip.el.classList.add("is-grad-angling");
      seat(chip);
    }
  }

  function scalePreviewFactor(chip: DroppedChip) {
    if (!xformDrag) return 1;
    if (soloBodyId != null && chip.body.id !== soloBodyId) return 1;
    if (!xformDrag.startScales.has(chip.slotId) && xformDrag.slotId !== chip.slotId) return 1;
    return xformDrag.bodyFactor;
  }

  /** Grow/shrink + rotate from one polar gesture (radial = scale, angular = rotate). */
  function applyLiveXform(
    nextScale: number,
    nextAngle: number,
    pivot: { x: number; y: number } | null,
  ) {
    if (!xformDrag) return;
    const nextFactor = nextScale / xformDrag.startScale;
    const delta = nextFactor / xformDrag.bodyFactor;
    const scaleChanged = Math.abs(delta - 1) > 0.0005;
    const angleChanged = Math.abs(nextAngle - xformDrag.lastAngle) >= 0.0005;
    if (scaleChanged || angleChanged) {
      const dAngle = nextAngle - xformDrag.lastAngle;
      const multi = xformDrag.startScales.size > 1;
      const point = pivot ?? undefined;
      for (const chip of xformTargets(xformDrag.slotId)) {
        // Corner pivot: Matter scales/rotates about the fixed world anchor so the
        // opposite corner stays put. Center mode omits `point` (body centre).
        if (scaleChanged) Body.scale(chip.body, delta, delta, point);
        if (angleChanged) {
          if (point || multi) {
            // Shared world pivot (or multi delta) keeps relative poses stable.
            rotateBodyAround(chip.body, dAngle, point);
          } else {
            // Solo center-anchored: absolute angle about the body centre.
            Body.setAngle(chip.body, nextAngle);
          }
        }
        syncWallCollision(chip);
        pinInsideWalls(chip);
      }
      if (scaleChanged) xformDrag.bodyFactor = nextFactor;
      if (!running) setRunning(true);
      // Hard position dig (no releaseGrowth shove) — neighbors slide away as we swell.
      separateOverlaps(true);
      for (const chip of chips) seat(chip);
    }
    xformDrag.lastScale = nextScale;
    xformDrag.lastAngle = nextAngle;
  }

  function beginXformDrag(chip: DroppedChip, event: PointerEvent, handle: HTMLElement) {
    endXformDrag();
    endGradAngleDrag();
    const point = stagePoint(event);
    const corner = readXformHandleCorner(handle);
    // Shift at gesture start → legacy center-anchored scale; else opposite corner.
    const centerAnchored = event.shiftKey;
    const anchor = xformCornerWorld(chip, oppositeXformCorner(corner), 1);
    const pivotX = centerAnchored ? chip.body.position.x : anchor.x;
    const pivotY = centerAnchored ? chip.body.position.y : anchor.y;
    const dx = point.x - pivotX;
    const dy = point.y - pivotY;
    const startDist = Math.max(8, Math.hypot(dx, dy));
    const startScales = new Map<string, number>();
    for (const item of xformTargets(chip.slotId)) {
      if (startScales.has(item.slotId)) continue;
      startScales.set(
        item.slotId,
        clampScale(scaleOf?.(item.slotId) ?? 1, scaleMaxFor(item.look?.slot)),
      );
    }
    if (!startScales.has(chip.slotId)) {
      startScales.set(
        chip.slotId,
        clampScale(scaleOf?.(chip.slotId) ?? 1, scaleMaxFor(chip.look?.slot)),
      );
    }
    const startScale = startScales.get(chip.slotId) ?? 1;
    const startPointerAngle = Math.atan2(dy, dx);
    const startBodyAngle = chip.body.angle;
    xformHover = { bodyId: chip.body.id, corner, phase: "hot" };
    xformDrag = {
      chip,
      slotId: chip.slotId,
      pointerId: event.pointerId,
      corner,
      anchorX: anchor.x,
      anchorY: anchor.y,
      centerAnchored,
      startDist,
      startScale,
      startScales,
      lastScale: startScale,
      bodyFactor: 1,
      startPointerAngle,
      startBodyAngle,
      lastAngle: startBodyAngle,
    };
    lockHandle(chip.slotId, "xforming");
    syncXformHandleSide(chip);
    handle.setPointerCapture(event.pointerId);
    // One undo snapshot for the combined gesture (scale key covers rotate too).
    beginScrub();
    onScale?.(chip.slotId, startScale, "start");
  }

  function setPicked(slotId: string | null, opts?: { ids?: string[] }) {
    if (!slotId) {
      soloBodyId = null;
      pickedId = null;
      pickedIds.clear();
    } else {
      const next = opts?.ids?.length ? opts.ids : [slotId];
      pickedIds.clear();
      for (const id of next) pickedIds.add(id);
      pickedIds.add(slotId);
      pickedId = slotId;
      if (pickedIds.size > 1) {
        // Shift multi-select: group transform across slots (all Amount copies of each).
        soloBodyId = null;
      } else {
        // Keep a canvas-armed instance; otherwise outline one chip (not every Amount copy).
        const soloStillValid =
          soloBodyId != null &&
          chips.some((chip) => chip.slotId === slotId && chip.body.id === soloBodyId);
        if (!soloStillValid) {
          soloBodyId = chips.find((chip) => chip.slotId === slotId)?.body.id ?? null;
        }
      }
    }
    paintPicked();
  }

  /** Pose tools target the clicked Amount instance; multi-slot drags keep a group. */
  function armSoloForPointer(chip: DroppedChip, shiftKey: boolean) {
    if (shiftKey) {
      soloBodyId = null;
      return;
    }
    if (pickedIds.size > 1 && pickedIds.has(chip.slotId)) {
      soloBodyId = null;
      return;
    }
    soloBodyId = chip.body.id;
  }

  function chipEl(slotId: string): HTMLElement | null {
    return chips.find((chip) => chip.slotId === slotId)?.el ?? null;
  }

  function unlockEdit(chip: DroppedChip) {
    if (chip.body.isStatic) Body.setStatic(chip.body, false);
  }

  function lockEdit(chip: DroppedChip) {
    dropPin();
    cancelPending();
    Body.setVelocity(chip.body, { x: 0, y: 0 });
    Body.setAngularVelocity(chip.body, 0);
    Body.setStatic(chip.body, true);
    seat(chip);
  }

  function setEditing(slotId: string | null) {
    if (editingId === slotId) return;
    if (editingId) {
      const prev = chips.find((item) => item.slotId === editingId);
      if (prev) unlockEdit(prev);
    }
    editingId = slotId;
    if (!slotId) return;
    const chip = chips.find((item) => item.slotId === slotId);
    if (!chip) {
      editingId = null;
      return;
    }
    lockEdit(chip);
  }

  function wakeAll() {
    for (const chip of chips) Sleeping.set(chip.body, false);
  }

  /** Lock the pile in place for the floor-pause / end-of-run hold. */
  function freezePile() {
    dropPin();
    cancelPending();
    endXformDrag();
    endGradAngleDrag();
    for (const chip of chips) {
      Body.setVelocity(chip.body, { x: 0, y: 0 });
      Body.setAngularVelocity(chip.body, 0);
      Sleeping.set(chip.body, true);
      seat(chip);
    }
  }

  function stagePoint(event: { clientX: number; clientY: number }) {
    const rect = (layer?.parentElement ?? stageEl)?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function pullDrag() {
    if (!drag) return;
    for (const { chip, pin, ox, oy } of drag.pins) {
      if (!pin) {
        Body.setPosition(chip.body, { x: drag.x + ox, y: drag.y + oy });
        seat(chip);
        continue;
      }
      Sleeping.set(chip.body, false);
      pin.pointA = { x: drag.x, y: drag.y };
    }
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest?.(".chip-edit")) return;

    const gradStop = target?.closest?.(".chip-grad-wheel__stop");
    if (gradStop instanceof HTMLElement) {
      const el = gradStop.closest(".chip");
      if (!(el instanceof HTMLElement) || el.closest(".bloom-layer")) return;
      const chip = chipFromEl(el);
      if (!chip || chip.slotId === editingId) return;
      const info = gradientOf?.(chip.slotId);
      if (!info) return;
      event.preventDefault();
      event.stopPropagation();
      blank = null;
      clickChip = null;
      cancelPending();
      dropPin();
      endXformDrag();
      endGradAngleDrag();
      const point = stagePoint(event);
      const polar = localPolar(chip, point);
      const stop = gradStop.dataset.stop === "to" ? "to" : "from";
      const metrics = chipWheelMetrics(chip);
      gradAngleDrag = {
        chip,
        slotId: chip.slotId,
        pointerId: event.pointerId,
        startPointerAngle: polar.angle,
        startGradAngle: info.angle,
        lastAngle: info.angle,
        lastScale: info.scale,
        wheelMaxR: metrics.maxR,
        chipR: metrics.chipR,
        stop,
        stopEl: gradStop,
        originX: event.clientX,
        originY: event.clientY,
        moved: false,
        rotating: false,
      };
      lockHandle(chip.slotId, "grad-angling");
      gradStop.setPointerCapture(event.pointerId);
      return;
    }

    const gradHit = target?.closest?.(".chip-grad-wheel__hit-ring, .chip-grad-wheel__hit, .chip-grad-wheel__scale, .chip-grad-wheel__ring");
    if (gradHit instanceof Element) {
      const el = gradHit.closest(".chip");
      if (el instanceof HTMLElement && !el.closest(".bloom-layer")) {
        const chip = chipFromEl(el);
        const info = chip && chip.slotId !== editingId ? gradientOf?.(chip.slotId) : null;
        if (chip && info) {
          const polar = localPolar(chip, stagePoint(event));
          // Keep the chip body center for grab/move — wheel only owns the outer annulus.
          const bodyR = Math.min(chip.width, chip.height) / 2;
          const grabHole = Math.max(12, Math.min(bodyR * 0.72, bodyR - 4));
          if (polar.dist >= grabHole) {
            event.preventDefault();
            event.stopPropagation();
            blank = null;
            clickChip = null;
            cancelPending();
            dropPin();
            endXformDrag();
            endGradAngleDrag();
            const metrics = chipWheelMetrics(chip);
            gradAngleDrag = {
              chip,
              slotId: chip.slotId,
              pointerId: event.pointerId,
              startPointerAngle: polar.angle,
              startGradAngle: info.angle,
              lastAngle: info.angle,
              lastScale: info.scale,
              wheelMaxR: metrics.maxR,
              chipR: metrics.chipR,
              stop: null,
              stopEl: null,
              originX: event.clientX,
              originY: event.clientY,
              moved: true,
              rotating: true,
            };
            lockHandle(chip.slotId, "grad-angling");
            const svg = gradHit.closest("svg");
            const capture = svg ?? (gradHit instanceof HTMLElement ? gradHit : null);
            capture?.setPointerCapture?.(event.pointerId);
            onGradientWheel?.(chip.slotId, { angle: info.angle, scale: info.scale }, "start");
            return;
          }
        }
      }
    }

    const xformHandle = target?.closest?.(".chip-xform-handle");
    if (xformHandle instanceof HTMLElement) {
      const host = xformHandle.closest(".chip, .chip-chrome");
      if (!(host instanceof HTMLElement) || host.closest(".bloom-layer")) return;
      const chip = chipFromEl(host);
      if (!chip || chip.slotId === editingId) return;
      event.preventDefault();
      event.stopPropagation();
      blank = null;
      clickChip = null;
      cancelPending();
      dropPin();
      armSoloForPointer(chip, event.shiftKey);
      beginXformDrag(chip, event, xformHandle);
      return;
    }

    // Resolve the chip from stage coords — not event.target. Layout blend modes and
    // the selection overlay regularly make DOM hit-testing miss the piece under the pointer.
    const point = stagePoint(event);
    const chip = topChipAtStagePoint(point.x, point.y);
    if (!chip) {
      clickChip = null;
      if (event.currentTarget === stageEl) blank = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      return;
    }
    if (chip.slotId === editingId) return;
    blank = null;
    clickChip = null;
    chip.el.setPointerCapture(event.pointerId);
    cancelPending();
    dropPin();
    pending = {
      chip,
      pointerId: event.pointerId,
      x: point.x,
      y: point.y,
      originX: event.clientX,
      originY: event.clientY,
    };
    armSoloForPointer(chip, event.shiftKey);
    // Already selected → grab right away so drag isn't fighting click-to-dismiss.
    // Layout: same for any piece — click-without-move still selects via !drag.moved.
    if (layoutMode || pickedIds.has(chip.slotId)) {
      beginDrag();
      return;
    }
    holdTimer = window.setTimeout(beginDrag, HOLD_DRAG_MS);
  }

  function onContextMenu(event: MouseEvent) {
    const point = stagePoint(event);
    const chip = topChipAtStagePoint(point.x, point.y);
    if (chip) {
      event.preventDefault();
      onMenu?.(chip.slotId, event.clientX, event.clientY);
      return;
    }
    event.preventDefault();
    onMenu?.(null, event.clientX, event.clientY);
  }

  function onPointerMove(event: PointerEvent) {
    if (xformDrag && event.pointerId === xformDrag.pointerId) {
      const point = stagePoint(event);
      const centerAnchored = event.shiftKey;
      // Mid-gesture Shift toggles corner ↔ center pivot without a scale jump.
      if (centerAnchored !== xformDrag.centerAnchored) {
        if (centerAnchored) {
          const cdx = point.x - xformDrag.chip.body.position.x;
          const cdy = point.y - xformDrag.chip.body.position.y;
          const cdist = Math.max(1, Math.hypot(cdx, cdy));
          xformDrag.startDist = reanchorStartDist(
            xformDrag.startScale,
            xformDrag.lastScale,
            cdist,
          );
        } else {
          const anchor = xformCornerWorld(
            xformDrag.chip,
            oppositeXformCorner(xformDrag.corner),
            xformDrag.bodyFactor,
          );
          xformDrag.anchorX = anchor.x;
          xformDrag.anchorY = anchor.y;
          const cdx = point.x - anchor.x;
          const cdy = point.y - anchor.y;
          const cdist = Math.max(1, Math.hypot(cdx, cdy));
          xformDrag.startDist = reanchorStartDist(
            xformDrag.startScale,
            xformDrag.lastScale,
            cdist,
          );
          xformDrag.startPointerAngle = Math.atan2(cdy, cdx);
          xformDrag.startBodyAngle = xformDrag.lastAngle;
        }
        xformDrag.centerAnchored = centerAnchored;
      }
      const pivot = centerAnchored
        ? null
        : { x: xformDrag.anchorX, y: xformDrag.anchorY };
      const pivotX = pivot ? pivot.x : xformDrag.chip.body.position.x;
      const pivotY = pivot ? pivot.y : xformDrag.chip.body.position.y;
      const dx = point.x - pivotX;
      const dy = point.y - pivotY;
      const dist = Math.max(1, Math.hypot(dx, dy));
      // Continuous while dragging — 0.01 rounding here stair-steps slow gestures.
      const nextScale = clampScaleContinuous(
        scaleFromPivotRatio(xformDrag.startScale, xformDrag.startDist, dist),
        scaleMaxFor(xformDrag.chip.look?.slot),
      );
      const pointerAngle = Math.atan2(dy, dx);
      // Shift = center scale only. Shift+Alt also snaps to 45°. Re-anchor on release.
      let nextAngle: number;
      if (centerAnchored) {
        const step = Math.PI / 4;
        nextAngle = event.altKey
          ? Math.round(xformDrag.lastAngle / step) * step
          : xformDrag.lastAngle;
        xformDrag.startPointerAngle = pointerAngle;
        xformDrag.startBodyAngle = nextAngle;
      } else {
        nextAngle = xformDrag.startBodyAngle + (pointerAngle - xformDrag.startPointerAngle);
      }
      const scaleChanged = Math.abs(nextScale - xformDrag.lastScale) >= 0.0005;
      const angleChanged = Math.abs(nextAngle - xformDrag.lastAngle) >= 0.0005;
      if (!scaleChanged && !angleChanged) return;
      applyLiveXform(nextScale, nextAngle, pivot);
      if (scaleChanged && (soloBodyId == null || soloBodyId !== xformDrag.chip.body.id)) {
        const factor = nextScale / xformDrag.startScale;
        for (const [id, base] of xformDrag.startScales) {
          const max = scaleMaxFor(chips.find((c) => c.slotId === id)?.look?.slot);
          onScale?.(id, clampScale(base * factor, max), "move");
        }
      }
      if (angleChanged) onRotate?.(xformDrag.slotId, nextAngle, "move");
      return;
    }
    if (gradAngleDrag && event.pointerId === gradAngleDrag.pointerId) {
      if (!gradAngleDrag.moved) {
        const dx = event.clientX - gradAngleDrag.originX;
        const dy = event.clientY - gradAngleDrag.originY;
        if (dx * dx + dy * dy <= CLICK_SLOP * CLICK_SLOP) return;
        gradAngleDrag.moved = true;
      }
      const point = stagePoint(event);
      const polar = localPolar(gradAngleDrag.chip, point);
      let delta = polar.angle - gradAngleDrag.startPointerAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      let nextAngle = (gradAngleDrag.startGradAngle + delta + 360) % 360;
      if (event.shiftKey) nextAngle = ((Math.round(nextAngle / 45) * 45) % 360 + 360) % 360;
      let nextScale = gradScaleForRadius(polar.dist, gradAngleDrag.wheelMaxR, gradAngleDrag.chipR);
      if (event.shiftKey) nextScale = Math.max(1, Math.min(100, Math.round(nextScale / 5) * 5));
      applyLiveGradWheel(nextAngle, nextScale);
      return;
    }
    if (blank && event.pointerId === blank.pointerId) {
      const dx = event.clientX - blank.x;
      const dy = event.clientY - blank.y;
      if (dx * dx + dy * dy > CLICK_SLOP * CLICK_SLOP) blank = null;
    }
    if (pending && event.pointerId === pending.pointerId) {
      const point = stagePoint(event);
      pending.x = point.x;
      pending.y = point.y;
      const dx = event.clientX - pending.originX;
      const dy = event.clientY - pending.originY;
      if (dx * dx + dy * dy > CLICK_SLOP * CLICK_SLOP) beginDrag();
    }
    if (!drag) updateXformHandleHover(event);
    if (!drag || event.pointerId !== drag.pointerId) return;
    const point = stagePoint(event);
    drag.x = point.x;
    drag.y = point.y;
    if (!drag.moved) {
      const dx = event.clientX - drag.originX;
      const dy = event.clientY - drag.originY;
      if (dx * dx + dy * dy > CLICK_SLOP * CLICK_SLOP) drag.moved = true;
    }
    pullDrag();
  }

  function onPointerUp(event: PointerEvent) {
    if (xformDrag && event.pointerId === xformDrag.pointerId) {
      endXformDrag(event);
      return;
    }
    if (gradAngleDrag && event.pointerId === gradAngleDrag.pointerId) {
      endGradAngleDrag();
      return;
    }
    if (blank && event.pointerId === blank.pointerId) {
      blank = null;
      onPick?.(null);
      return;
    }
    if (pending && event.pointerId === pending.pointerId) {
      clickChip = pending.chip;
      cancelPending();
      return;
    }
    if (!drag || event.pointerId !== drag.pointerId) return;
    // No real move → treat as click (dismiss / solo toggle) after the grab ends.
    if (!drag.moved) clickChip = drag.chip;
    dropPin();
  }

  function onClick(event: MouseEvent) {
    if (!clickChip) return;
    const chip = clickChip;
    clickChip = null;
    if (event.detail >= 2) {
      const slot = chip.look?.slot;
      if (slot?.kind === "text") {
        soloBodyId = chip.body.id;
        onEdit?.(chip.slotId);
        return;
      }
      // Non-text: force-pick this Amount instance (poses stay per-body).
      soloBodyId = chip.body.id;
      onPick?.(chip.slotId, { force: true });
      paintPicked();
      return;
    }
    // Same slot, different Amount copy → switch the active instance without dismissing.
    if (
      !event.shiftKey &&
      chip.slotId === pickedId &&
      pickedIds.size <= 1 &&
      soloBodyId != null &&
      chip.body.id !== soloBodyId
    ) {
      soloBodyId = chip.body.id;
      paintPicked();
      return;
    }
    if (event.shiftKey) soloBodyId = null;
    else soloBodyId = chip.body.id;
    onPick?.(chip.slotId, event.shiftKey ? { additive: true } : undefined);
    paintPicked();
  }

  function onPointerCancel(event: PointerEvent) {
    if (xformDrag && event.pointerId === xformDrag.pointerId) {
      endXformDrag(event);
      return;
    }
    if (gradAngleDrag && event.pointerId === gradAngleDrag.pointerId) {
      endGradAngleDrag();
      return;
    }
    if (blank && event.pointerId === blank.pointerId) blank = null;
    if (pending && event.pointerId === pending.pointerId) cancelPending();
    clickChip = null;
    if (!drag || event.pointerId !== drag.pointerId) return;
    dropPin();
  }

  function attach(
    stage: HTMLElement,
    pick?: (slotId: string | null, opts?: { force?: boolean; additive?: boolean }) => void,
    menu?: (slotId: string | null, x: number, y: number) => void,
    edit?: (slotId: string) => void,
    readScale?: (slotId: string) => number,
    scale?: (slotId: string, value: number, phase: "start" | "move" | "end") => void,
    rotate?: (slotId: string, angle: number, phase: "start" | "move" | "end") => void,
    readGradient?: (slotId: string) => { from: string; to: string; angle: number; scale: number } | null,
    gradientWheel?: (
      slotId: string,
      value: { angle: number; scale: number },
      phase: "start" | "move" | "end",
    ) => void,
    gradientStop?: (slotId: string, stop: "from" | "to", anchor: HTMLElement) => void,
  ) {
    onPick = pick ?? null;
    onMenu = menu ?? null;
    onEdit = edit ?? null;
    scaleOf = readScale ?? null;
    onScale = scale ?? null;
    onRotate = rotate ?? null;
    gradientOf = readGradient ?? null;
    onGradientWheel = gradientWheel ?? null;
    onGradientStop = gradientStop ?? null;
    bindStageLayers(stage);
    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("click", onClick);
    stage.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
  }

  function motionLow(speedLimit: number, spinLimit: number) {
    if (drag || xformDrag || gradAngleDrag || chips.length === 0) return false;
    return chips.every((chip) => {
      if (chip.body.isSleeping) return true;
      return chip.body.speed < speedLimit && Math.abs(chip.body.angularVelocity) < spinLimit;
    });
  }

  function isSettled() {
    if (drag || xformDrag || gradAngleDrag || chips.length === 0) return false;
    // Prefer Matter sleep — that's when friction has actually finished.
    if (chips.every((chip) => chip.body.isSleeping)) return true;
    return motionLow(SETTLED_SPEED, SETTLED_SPIN);
  }

  function isQuiet() {
    // Gate DOM sync on real sleep — not a high speed threshold. Syncing only
    // while speed ≥ ~1 left friction slides invisible until the next wake/snap.
    if (drag || xformDrag || gradAngleDrag) return false;
    return chips.length === 0 || chips.every((chip) => chip.body.isSleeping);
  }

  function isDragging() {
    return Boolean(drag || xformDrag || gradAngleDrag);
  }

  function frostScenes(): HTMLElement[] {
    return [];
  }

  function copyLook(from: HTMLElement, to: HTMLElement) {
    to.className = "chip is-mirror";
    if (from.classList.contains("chip-bare")) to.classList.add("chip-bare");
    if (from.classList.contains("chip-image")) to.classList.add("chip-image");
    if (from.classList.contains("chip-emoji")) to.classList.add("chip-emoji");
    to.style.cssText = from.style.cssText;
    to.replaceChildren();
    for (const child of from.childNodes) to.append(child.cloneNode(true));
  }

  function mountMirrors(chip: DroppedChip) {
    chip.mirrors = [];
  }

  function refreshFrost() {
    if (mirrorScenes.length === 0) return;
    for (const chip of chips) {
      for (const mirror of chip.mirrors) {
        mirror.face.remove();
        mirror.glow.remove();
      }
      chip.mirrors = [];
    }
    mirrorScenes = [];
  }

  function place(
    el: HTMLElement,
    x: number,
    y: number,
    angle: number,
    width: number,
    height: number,
    anchorX: number,
    anchorY: number,
    scaleX = 1,
    scaleY = 1,
  ) {
    const originX = width / 2 - anchorX;
    const originY = height / 2 - anchorY;
    el.style.transformOrigin = `${originX}px ${originY}px`;
    const scalePart =
      scaleX === 1 && scaleY === 1 ? "" : ` scale(${scaleX}, ${scaleY})`;
    el.style.transform = `translate(${x - originX}px, ${y - originY}px) rotate(${angle}rad)${scalePart}`;
  }

  function seat(chip: DroppedChip) {
    const body = chip.body;
    const angle = body.angle;
    const preview = scalePreviewFactor(chip);
    const audioScale = (audioScaleBySlot.get(chip.slotId) ?? 1) * preview;
    const pop = chip.popScale;
    const scaleX = (chip.flipX ? -1 : 1) * audioScale * pop;
    const scaleY = (chip.flipY ? -1 : 1) * audioScale * pop;
    // Keep selection / gradient chrome stroke width stable under CSS scale.
    if (Math.abs(audioScale - 1) > 0.001) chip.el.style.setProperty("--chrome-scale", String(audioScale));
    else chip.el.style.removeProperty("--chrome-scale");
    if (preview !== 1) chip.el.style.setProperty("--scale-preview", String(preview));
    else chip.el.style.removeProperty("--scale-preview");

    let x = body.position.x;
    let y = body.position.y;
    let anchorX = chip.anchorX;
    let anchorY = chip.anchorY;
    // During spawn/discard, pivot on the visual box center so scale doesn't drift.
    if (chip.popping) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      x = body.position.x + chip.anchorX * cos - chip.anchorY * sin;
      y = body.position.y + chip.anchorX * sin + chip.anchorY * cos;
      anchorX = 0;
      anchorY = 0;
    }

    place(chip.el, x, y, angle, chip.width, chip.height, anchorX, anchorY, scaleX, scaleY);
    place(chip.glow, x, y, angle, chip.width, chip.height, anchorX, anchorY, scaleX, scaleY);
    syncChromeSeat(chip, x, y, angle, anchorX, anchorY, scaleX, scaleY);
    for (const mirror of chip.mirrors) {
      place(mirror.face, x, y, angle, chip.width, chip.height, anchorX, anchorY, scaleX, scaleY);
      place(mirror.glow, x, y, angle, chip.width, chip.height, anchorX, anchorY, scaleX, scaleY);
    }
    // Keep the gradient wheel glued to the live visual size (incl. scale-drag preview).
    if (isPickPainted(chip)) {
      syncGradWheel(chip);
      syncXformHandleSide(chip, audioScale);
    }
  }

  function paint(
    chip: DroppedChip,
    slot: Slot,
    size: { width: number; height: number },
    radius: number,
    theme: ColorTheme,
    tracking: number,
    shiftEm = 0,
  ) {
    const fill = slotFill(theme, slot);
    const ink = slotInk(theme, slot);
    const gradientTo =
      slot.kind === "text" && slot.gradient && !slot.stroked
        ? gradientEnd(theme, slot)
        : slot.kind === "image" && slot.gradient && !slot.emoji && isColorMask(slot)
          ? gradientEnd(theme, slot)
          : "";
    chip.look = { slot, radius, fill, ink, tracking, shiftEm };
    const editing = chip.slotId === editingId;
    applyVisual(chip.el, slot, size.width, size.height, radius, fill, ink, tracking, false, shiftEm, gradientTo, editing);
    applyVisual(chip.glow, slot, size.width, size.height, radius, fill, ink, tracking, true, shiftEm, gradientTo, false);
    // Per-layer blend only matters when pieces can overlap (layout mode).
    const mix = layoutMode ? blendMode(slot.blend) : "normal";
    if (mix === "normal") {
      chip.el.style.removeProperty("mix-blend-mode");
      chip.glow.style.removeProperty("mix-blend-mode");
    } else {
      chip.el.style.mixBlendMode = mix;
      chip.glow.style.mixBlendMode = mix;
    }
    // Drop shadow is layout-only — physics keeps chips filter-free while tumbling.
    paintDropShadow(chip.el, slot, layoutMode);
    paintDropShadow(chip.glow, slot, false);
    for (const mirror of chip.mirrors) {
      copyLook(chip.el, mirror.face);
      copyLook(chip.glow, mirror.glow);
    }
    if (isPickPainted(chip)) {
      ensureXformFrame(ensureChrome(chip));
      ensureXformHandle(xformChromeOf(chip));
      syncXformHandleSide(chip, chipCssMul(chip));
      syncGradWheel(chip);
      syncChromeSeat(chip);
      // Selection chrome tracks the painted box immediately; body remesh may follow.
      if (chip.chrome && chip.chrome !== chip.el) {
        chip.chrome.style.width = `${size.width}px`;
        chip.chrome.style.height = `${size.height}px`;
      }
    }
  }

  function syncLayerOrder(slotIds: readonly string[]) {
    if (!layer || !bloomLayer || chips.length === 0) return;

    const groups = new Map<string, DroppedChip[]>();
    for (const chip of chips) {
      const group = groups.get(chip.slotId);
      if (group) group.push(chip);
      else groups.set(chip.slotId, [chip]);
    }

    const ordered: DroppedChip[] = [];
    const seen = new Set<string>();
    for (const id of slotIds) {
      const group = groups.get(id);
      if (!group) continue;
      ordered.push(...group);
      seen.add(id);
    }
    for (const chip of chips) {
      if (!seen.has(chip.slotId)) ordered.push(chip);
    }

    if (ordered.length === chips.length && ordered.every((chip, i) => chip === chips[i])) return;

    chips = ordered;
    for (const chip of chips) {
      layer.append(chip.el);
      bloomLayer.append(chip.glow);
    }
  }

  function draws(): ChipDraw[] {
    const out: ChipDraw[] = [];
    for (const chip of chips) {
      if (!chip.look) continue;
      out.push({
        x: chip.body.position.x,
        y: chip.body.position.y,
        angle: chip.body.angle,
        width: chip.width,
        height: chip.height,
        anchorX: chip.anchorX,
        anchorY: chip.anchorY,
        flipX: chip.flipX || undefined,
        flipY: chip.flipY || undefined,
        slot: chip.look.slot,
        radius: chip.look.radius,
        fill: chip.look.fill,
        ink: chip.look.ink,
        tracking: chip.look.tracking,
        shiftEm: chip.look.shiftEm,
      });
    }
    return out;
  }

  function wireframes(): { x: number; y: number }[][] {
    const out: { x: number; y: number }[][] = [];
    for (const chip of chips) {
      for (const part of solidParts(chip.body)) {
        const verts = part.vertices;
        const poly: { x: number; y: number }[] = [];
        for (let i = 0; i < verts.length; i++) poly.push({ x: verts[i].x, y: verts[i].y });
        out.push(poly);
      }
    }
    return out;
  }

  function setSimulationScale(scale: number) {
    const safe = Number.isFinite(scale) && scale > 0 ? Math.min(1, scale) : 1;
    simScale = safe;
    // Same pixel speed on a smaller body tunnels and rests inside neighbors.
    // Shorter steps keep the fall distance and let contacts resolve.
    contactSteps = Math.min(quality.maxContactSteps, Math.max(1, Math.ceil(1 / safe)));
    runner.delta = FRAME_MS / contactSteps;
    engine.positionIterations = contactSteps > 1 ? quality.positionMulti : quality.positionSingle;
    engine.velocityIterations = contactSteps > 1 ? quality.velocityMulti : quality.velocitySingle;
  }

  function setFreeScaleMax(max: number) {
    const safe = Number.isFinite(max) && max > 0 ? max : SCALE_FREE_BASE;
    freeScaleMax = Math.max(SCALE_MIN, safe);
  }

  function setAudioScales(scales: ReadonlyMap<string, number> | null) {
    audioScaleBySlot = scales && scales.size > 0 ? new Map(scales) : new Map();
    let woke = false;
    let grew = false;
    let growDelta = 0;
    for (const chip of chips) {
      const target = audioScaleBySlot.get(chip.slotId) ?? 1;
      const prev = chip.audioMul;
      if (Math.abs(target - prev) > 0.0005) {
        Body.scale(chip.body, target / prev, target / prev);
        chip.audioMul = target;
        syncWallCollision(chip);
        Sleeping.set(chip.body, false);
        woke = true;
        if (target > prev) {
          grew = true;
          growDelta = Math.max(growDelta, target - prev);
        }
      }
      seat(chip);
    }
    if (woke) {
      wakeAll();
      if (!running) setRunning(true);
    }
    // Grow digs bodies into neighbors — shove them apart as hard shapes and keep
    // resolving while anything stays enlarged so the pile can't rest intersecting.
    if (grew) {
      breatheAudioGrowth(growDelta);
      separateOverlaps("audio");
      for (const chip of chips) seat(chip);
    } else if (woke) {
      for (const chip of chips) seat(chip);
    }
  }

  /** Give a packed bass-growth cluster a little outward room before depenetration. */
  function breatheAudioGrowth(delta: number) {
    if (delta < 0.0005) return;
    const grown = chips.filter((chip) => chip.audioMul > 1.002 && !chip.body.isStatic);
    if (grown.length < 2) return;
    let cx = 0;
    let cy = 0;
    for (const chip of grown) {
      cx += chip.body.position.x;
      cy += chip.body.position.y;
    }
    cx /= grown.length;
    cy /= grown.length;
    for (const chip of grown) {
      const dx = chip.body.position.x - cx;
      const dy = chip.body.position.y - cy;
      const dist = Math.hypot(dx, dy);
      const swell = delta * Math.hypot(chip.width, chip.height) * 0.35;
      if (swell < 0.05) continue;
      Sleeping.set(chip.body, false);
      if (dist < 1) {
        Body.setPosition(chip.body, {
          x: chip.body.position.x + (Math.random() - 0.5) * swell,
          y: chip.body.position.y - swell,
        });
      } else {
        Body.setPosition(chip.body, {
          x: chip.body.position.x + (dx / dist) * swell,
          y: chip.body.position.y + (dy / dist) * swell,
        });
      }
    }
  }

  function impulseAudioJump(slotIds: Iterable<string>, speed = 8) {
    if (layoutMode) return;
    const ids = slotIds instanceof Set ? slotIds : new Set(slotIds);
    if (ids.size === 0 || bounds.height < 8) return;
    const stageH = bounds.height;
    const stageW = bounds.width;
    // Headroom for sizeMul boost on large chips (up to ~1.5×).
    const maxUp = Math.abs(speed) * 1.7;
    let any = false;
    for (const chip of chips) {
      if (!ids.has(chip.slotId)) continue;
      if (chip.body.isStatic) continue;

      const { x, y } = chip.body.position;
      const reach = Math.hypot(chip.width, chip.height) * 0.5;
      // Stay in the playfield — no chain-jumps off the top or sides.
      if (y < reach * 0.6) continue;
      if (y > stageH + reach) continue;
      if (x < -reach || x > stageW + reach) continue;

      const vy = chip.body.velocity.y;
      // Already rising — don't stack another kick (constant hats).
      if (vy < -maxUp * 0.4) continue;

      // Fade the hop toward the top of the canvas.
      const climb = Math.max(0, Math.min(1, (y - stageH * 0.12) / (stageH * 0.5)));
      // Larger chips bury deeper in contacts — give them a bit more lift so bass reads.
      const span = Math.hypot(chip.width, chip.height);
      const sizeMul = Math.min(1.5, Math.max(1, Math.sqrt(span / 110)));
      const kick = speed * (0.85 + Math.random() * 0.3) * climb * sizeMul;
      if (kick < 0.35) continue;

      Sleeping.set(chip.body, false);
      Body.setVelocity(chip.body, {
        x: chip.body.velocity.x * 0.35 + (Math.random() - 0.5) * 1.2,
        y: Math.max(-maxUp, Math.min(vy, 0) - kick),
      });
      any = true;
    }
    if (!any) return;
    if (!running) setRunning(true);
  }

  function step(delta = FRAME_MS) {
    const slice = delta / contactSteps;
    for (let i = 0; i < contactSteps; i++) Engine.update(engine, slice);
    simClockMs += delta;
  }

  function sync() {
    pullDrag();
    for (const chip of chips) seat(chip);
  }

  function destroy() {
    Runner.stop(runner);
    Engine.clear(engine);
    clear();
  }

  return {
    play,
    refresh,
    clear,
    discardAll,
    resize,
    refit,
    setRunning,
    attach,
    refreshFrost,
    setFloorOpen,
    freezePile,
    purgeFallen,
    isSettled,
    isQuiet,
    isDragging,
    chipCount: () => chips.length,
    setPicked,
    setEditing,
    editingId: () => editingId,
    chipEl,
    refreshSlot,
    setSimulationScale,
    setFreeScaleMax,
    setAudioScales,
    impulseAudioJump,
    sync,
    draws,
    poses,
    armPlaceAt,
    placeSlotsAt,
    chipsOverlap,
    syncLayerOrder,
    restore,
    flipChips,
    alignChipsStraight,
    setImpactListener,
    wireframes,
    step,
    destroy,
  };
}
