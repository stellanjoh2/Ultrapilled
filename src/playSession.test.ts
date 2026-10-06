import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPlaySession, type PlaySessionHost } from "./playSession";
import type { AppState } from "./types";
import { defaultTextSlot } from "./types";
import { blankState } from "./templates";
import type { WorldHandle } from "./world";

function stubWorld(overrides: Partial<WorldHandle> = {}): WorldHandle {
  return {
    play: vi.fn(),
    refresh: vi.fn(() => false),
    clear: vi.fn(),
    discardAll: vi.fn(),
    resize: vi.fn(),
    refit: vi.fn(),
    setRunning: vi.fn(),
    attach: vi.fn(),
    refreshFrost: vi.fn(),
    setPicked: vi.fn(),
    setEditing: vi.fn(),
    editingId: () => null,
    chipEl: () => null,
    refreshSlot: vi.fn(),
    setSimulationScale: vi.fn(),
    adaptFrameBudget: vi.fn(),
    setFreeScaleMax: vi.fn(),
    setBloomLive: vi.fn(),
    setAudioScales: vi.fn(),
    impulseAudioJump: vi.fn(),
    setFloorOpen: vi.fn(),
    freezePile: vi.fn(),
    redeployFall: vi.fn(),
    purgeFallen: vi.fn(),
    isSettled: () => true,
    isQuiet: () => true,
    isDragging: () => false,
    chipCount: () => 0,
    sync: vi.fn(),
    draws: () => [],
    poses: () => [],
    armPlaceAt: vi.fn(),
    armSpawnFrom: vi.fn(),
    placeSlotsAt: vi.fn(),
    chipsOverlap: () => false,
    syncLayerOrder: vi.fn(),
    restore: vi.fn(),
    flipChips: vi.fn(),
    alignChipsStraight: vi.fn(),
    setImpactListener: vi.fn(),
    wireframes: () => [],
    step: vi.fn(),
    destroy: vi.fn(),
    ...overrides,
  } as WorldHandle;
}

function stubHost(
  world: WorldHandle,
  state: AppState,
  opts?: { getRepeat?: () => boolean },
): PlaySessionHost {
  let running = false;
  let paused = false;
  let posePinned = false;
  return {
    world,
    getState: () => state,
    stage: document.createElement("div"),
    playfield: document.createElement("div"),
    fitScale: () => 1,
    syncCanvas: () => false,
    ensureAssets: async () => undefined,
    scheduleDraft: vi.fn(),
    dismissWelcome: vi.fn(),
    paintWelcome: vi.fn(),
    paintTransport: vi.fn(),
    paintPhysDebug: vi.fn(),
    tickAudioReact: vi.fn(),
    nudgeEmptyScene: vi.fn(),
    notifyLayoutModeBlocksPhysics: async () => true,
    playButton: vi.fn(),
    getRunning: () => running,
    setRunningFlag: (on) => {
      running = on;
    },
    getPaused: () => paused,
    setPaused: (on) => {
      paused = on;
    },
    getRepeat: () => opts?.getRepeat?.() ?? false,
    getPosePinned: () => posePinned,
    setPosePinned: (on) => {
      posePinned = on;
    },
  };
}

describe("playSession drop / triggerPhysics", () => {
  it("spawns via play() when the board is empty", async () => {
    const state = blankState();
    state.slots = [defaultTextSlot({ text: "HELLO" })];
    const world = stubWorld({ chipCount: () => 0 });
    const host = stubHost(world, state);
    const session = createPlaySession(host);

    await session.triggerPhysics();

    expect(world.play).toHaveBeenCalledTimes(1);
    expect(world.redeployFall).not.toHaveBeenCalled();
    expect(world.refresh).not.toHaveBeenCalled();
    expect(session.phase).toBe("falling");
  });

  it("lifts and re-falls current chips on re-trigger instead of play()", async () => {
    const state = blankState();
    state.slots = [defaultTextSlot({ text: "HELLO", scale: 4.5 })];
    const world = stubWorld({ chipCount: () => 2 });
    const host = stubHost(world, state);
    const session = createPlaySession(host);

    await session.triggerPhysics();

    expect(world.play).not.toHaveBeenCalled();
    expect(world.refresh).toHaveBeenCalledTimes(1);
    expect(world.redeployFall).toHaveBeenCalledTimes(1);
    expect(world.sync).toHaveBeenCalled();
    expect(session.phase).toBe("falling");
  });

  it("still uses play() after a dump clears the board (loop)", async () => {
    const state = blankState();
    state.slots = [defaultTextSlot({ text: "AGAIN" })];
    let count = 0;
    const world = stubWorld({
      chipCount: () => count,
    });
    const host = stubHost(world, state);
    const session = createPlaySession(host);

    count = 3;
    await session.triggerPhysics();
    expect(world.redeployFall).toHaveBeenCalledTimes(1);
    expect(world.play).not.toHaveBeenCalled();

    // Simulate post-dump empty board, then a fresh drop (repeat path).
    count = 0;
    vi.mocked(world.redeployFall).mockClear();
    vi.mocked(world.refresh).mockClear();
    await session.drop();

    expect(world.play).toHaveBeenCalledTimes(1);
    expect(world.redeployFall).not.toHaveBeenCalled();
  });
});

describe("playSession dump loop", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", vi.fn());
  });

  async function tickDrop(session: ReturnType<typeof createPlaySession>, now: number) {
    session.frame(now);
    await Promise.resolve();
    await Promise.resolve();
  }

  it("respawns via play() once a looping dump has emptied the board", async () => {
    const state = blankState();
    state.slots = [defaultTextSlot({ text: "AGAIN" })];
    const world = stubWorld({ chipCount: () => 0 });
    const host = stubHost(world, state, { getRepeat: () => true });
    host.setRunningFlag(true);
    const session = createPlaySession(host);
    session.phase = "dumping";

    await tickDrop(session, 8000);

    expect(world.play).toHaveBeenCalledTimes(1);
    expect(session.phase).toBe("falling");
  });

  it("still loops after a dump even if the pile was grabbed recently", async () => {
    const state = blankState();
    state.slots = [defaultTextSlot({ text: "AGAIN" })];
    const world = stubWorld({ chipCount: () => 0 });
    const host = stubHost(world, state, { getRepeat: () => true });
    host.setRunningFlag(true);
    const session = createPlaySession(host);
    session.phase = "dumping";
    session.lastInteractAt = 7900;

    await tickDrop(session, 8000);

    expect(world.play).toHaveBeenCalledTimes(1);
  });

  it("force-clears sleeping leftovers so a dump can loop", async () => {
    const state = blankState();
    state.slots = [defaultTextSlot({ text: "AGAIN" })];
    let count = 3;
    const world = stubWorld({
      chipCount: () => count,
      isQuiet: () => true,
      discardAll: vi.fn(() => {
        count = 0;
      }),
    });
    const host = stubHost(world, state, { getRepeat: () => true });
    host.setRunningFlag(true);
    const session = createPlaySession(host);
    session.phase = "dumping";
    session.dumpStarted = 1000;

    await tickDrop(session, 1000 + 2000);

    expect(world.discardAll).toHaveBeenCalled();
    expect(world.play).toHaveBeenCalledTimes(1);
  });
});
