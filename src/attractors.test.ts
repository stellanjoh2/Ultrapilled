import { describe, expect, it } from "vitest";
import Matter from "matter-js";
import { applyAttractors, followAttractor, followAttractorFor, setBodyAttractors } from "./attractors";

const { Engine, Bodies, Composite, Body } = Matter;

describe("attractors", () => {
  it("pulls a later body toward the magnet", () => {
    const engine = Engine.create({ gravity: { x: 0, y: 0 } });
    const magnet = Bodies.circle(0, 0, 10, { isStatic: true });
    const follower = Bodies.circle(120, 0, 10);
    setBodyAttractors(magnet, [followAttractor]);
    Composite.add(engine.world, [magnet, follower]);
    applyAttractors(engine);
    Engine.update(engine, 1000 / 60);
    expect(follower.position.x).toBeLessThan(120);
    expect(Math.abs(follower.position.y)).toBeLessThan(1);
  });

  it("still pulls a body that was added before the magnet", () => {
    const engine = Engine.create({ gravity: { x: 0, y: 0 } });
    const follower = Bodies.circle(-80, 40, 10);
    const magnet = Bodies.circle(0, 0, 10, { isStatic: true });
    setBodyAttractors(magnet, [followAttractor]);
    Composite.add(engine.world, [follower, magnet]);
    const start = { ...follower.position };
    applyAttractors(engine);
    Engine.update(engine, 1000 / 60);
    expect(Math.hypot(follower.position.x, follower.position.y)).toBeLessThan(
      Math.hypot(start.x, start.y),
    );
  });

  it("does not pull static walls", () => {
    const engine = Engine.create({ gravity: { x: 0, y: 0 } });
    const magnet = Bodies.circle(0, 0, 10);
    const wall = Bodies.rectangle(80, 0, 20, 200, { isStatic: true });
    setBodyAttractors(magnet, [followAttractor]);
    Composite.add(engine.world, [magnet, wall]);
    applyAttractors(engine);
    expect(wall.force.x).toBe(0);
    expect(wall.force.y).toBe(0);
  });

  it("leaves other magnets unforced so only followers chase", () => {
    const engine = Engine.create({ gravity: { x: 0, y: 0 } });
    const a = Bodies.circle(0, 0, 10);
    const b = Bodies.circle(100, 0, 10);
    setBodyAttractors(a, [followAttractor]);
    setBodyAttractors(b, [followAttractor]);
    Composite.add(engine.world, [a, b]);
    Body.setVelocity(a, { x: 0, y: 0 });
    applyAttractors(engine);
    expect(a.force.x).toBe(0);
    expect(b.force.x).toBe(0);
  });

  it("scales pull with strength and ignores bodies past reach", () => {
    const magnet = Bodies.circle(0, 0, 10);
    const near = Bodies.circle(80, 0, 10);
    const far = Bodies.circle(900, 0, 10);
    const weak = followAttractorFor(10)(magnet, near);
    const strong = followAttractorFor(100)(magnet, near);
    expect(weak && strong).toBeTruthy();
    expect(Math.abs(strong!.x)).toBeGreaterThan(Math.abs(weak!.x));
    expect(followAttractorFor(50, 10)(magnet, near)).toBeTruthy();
    expect(followAttractorFor(50, 10)(magnet, far)).toBeUndefined();
  });

  it("does not scale spring with canvas distance", () => {
    const magnet = Bodies.circle(0, 0, 10);
    const near = Bodies.circle(80, 0, 10);
    const far = Bodies.circle(800, 0, 10);
    const fn = followAttractorFor();
    const a = fn(magnet, near);
    const b = fn(magnet, far);
    expect(a && b).toBeTruthy();
    expect(Math.abs(b!.x)).toBeLessThanOrEqual(Math.abs(a!.x) * 1.15);
  });
});
