import Matter from "matter-js";

const { Body, Composite } = Matter;

/**
 * Port of https://github.com/liabru/matter-attractors for Matter.js 0.20.
 * That package hooks `Matter.Plugin` (`base.before('Engine.update')`), which
 * 0.20 no longer ships. Same `body.plugin.attractors` API; we drive the loop.
 */
export type AttractorFn = (bodyA: Matter.Body, bodyB: Matter.Body) => Matter.Vector | void;

/**
 * Soft capped spring. Unbounded `delta * k` launched chips (force grew with
 * canvas distance). Honey follow = short spring + heavy relative damping.
 */
export const FOLLOW_ATTRACT_STRENGTH = 1.6e-4;
/** Px of separation that still counts toward the spring (the rest is ignored). */
export const FOLLOW_ATTRACT_PULL_CAP = 56;
/** Relative-velocity damping (thick liquid). `dv = -c * vRel * dt` per step. */
export const FOLLOW_ATTRACT_DAMP = 0.018;
/** Inside this, only match the magnet's velocity — no extra slam. */
export const FOLLOW_ATTRACT_SOFT_PX = 14;
export const DEFAULT_ATTRACTOR_STRENGTH = 50;
export const DEFAULT_ATTRACTOR_REACH = 100;
/** Menu + settings stay in code; flip on when the feel is ready. */
export const ATTRACTOR_UI = false;

export function attractorStrengthOf(value: number | undefined): number {
  const n = value ?? DEFAULT_ATTRACTOR_STRENGTH;
  return Math.max(1, Math.min(100, Math.round(n)));
}

export function attractorReachOf(value: number | undefined): number {
  const n = value ?? DEFAULT_ATTRACTOR_REACH;
  return Math.max(1, Math.min(100, Math.round(n)));
}

/** Max pull distance in px. `null` means the whole canvas (slider 100). */
export function attractorReachPx(value: number | undefined): number | null {
  const n = attractorReachOf(value);
  if (n >= DEFAULT_ATTRACTOR_REACH) return null;
  return 48 + n * 12;
}

export function followAttractorFor(strength?: number, reach?: number): AttractorFn {
  const k = FOLLOW_ATTRACT_STRENGTH * (attractorStrengthOf(strength) / DEFAULT_ATTRACTOR_STRENGTH);
  const maxDist = attractorReachPx(reach);
  return (bodyA, bodyB) => {
    const dx = bodyA.position.x - bodyB.position.x;
    const dy = bodyA.position.y - bodyB.position.y;
    const dist = Math.hypot(dx, dy);
    if (maxDist != null && dist > maxDist) return;
    const mass = bodyB.mass || 1;
    const rx = bodyB.velocity.x - bodyA.velocity.x;
    const ry = bodyB.velocity.y - bodyA.velocity.y;
    let sx = 0;
    let sy = 0;
    if (dist > FOLLOW_ATTRACT_SOFT_PX) {
      const pull = Math.min(dist, FOLLOW_ATTRACT_PULL_CAP);
      const scale = (pull * k) / dist;
      sx = dx * scale;
      sy = dy * scale;
    }
    return {
      x: (sx - rx * FOLLOW_ATTRACT_DAMP) * mass,
      y: (sy - ry * FOLLOW_ATTRACT_DAMP) * mass,
    };
  };
}

export function followAttractor(bodyA: Matter.Body, bodyB: Matter.Body): Matter.Vector {
  return followAttractorFor()(bodyA, bodyB) ?? { x: 0, y: 0 };
}

export function setBodyAttractors(body: Matter.Body, attractors: AttractorFn[]) {
  body.plugin = { ...body.plugin, attractors };
}

export function bodyAttractors(body: Matter.Body): AttractorFn[] {
  const list = body.plugin?.attractors;
  return Array.isArray(list) ? (list as AttractorFn[]) : [];
}

/** Apply `bodyA.plugin.attractors` to every other non-static body (not only later indices). */
export function applyAttractors(engine: Matter.Engine) {
  const bodies = Composite.allBodies(engine.world);
  for (const bodyA of bodies) {
    const attractors = bodyAttractors(bodyA);
    if (!attractors.length) continue;
    for (const bodyB of bodies) {
      if (bodyB === bodyA || bodyB.isStatic) continue;
      if (bodyAttractors(bodyB).length) continue;
      for (const attractor of attractors) {
        const force = attractor(bodyA, bodyB);
        if (force) Body.applyForce(bodyB, bodyB.position, force);
      }
    }
  }
}
