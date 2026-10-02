import { describe, expect, it, vi } from "vitest";
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
    setFreeScaleMax: vi.fn(),
    setAudioScales: vi.fn(),
    impulseAudioJump: vi.fn(),
    setFloorOpen: vi.fn(),
    freezePile: vi.fn(),
    wakePile: vi.fn(),
    purgeFallen: vi.fn(),
    isSettled: () => true,
    isQuiet: () => true,
    isDragging: () => false,
    chipCount: () => 0,
    sync: vi.fn(),
    draws: () => [],
    poses: () => [],
    armPlaceAt: vi.fn(),
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

function stubHost(world: WorldHandle, state: AppState): PlaySessionHost {
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
    getRepeat: () => false,
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
    expect(world.wakePile).not.toHaveBeenCalled();
    expect(world.refresh).not.toHaveBeenCalled();
    expect(session.phase).toBe("falling");
  });

  it("reuses current chips on re-trigger instead of play()", async () => {
    const state = blankState();
    state.slots = [defaultTextSlot({ text: "HELLO", scale: 4.5 })];
    const world = stubWorld({ chipCount: () => 2 });
    const host = stubHost(world, state);
    const session = createPlaySession(host);

    await session.triggerPhysics();

    expect(world.play).not.toHaveBeenCalled();
    expect(world.refresh).toHaveBeenCalledTimes(1);
    expect(world.wakePile).toHaveBeenCalledTimes(1);
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
    expect(world.wakePile).toHaveBeenCalledTimes(1);
    expect(world.play).not.toHaveBeenCalled();

    // Simulate post-dump empty board, then a fresh drop (repeat path).
    count = 0;
    vi.mocked(world.wakePile).mockClear();
    vi.mocked(world.refresh).mockClear();
    await session.drop();

    expect(world.play).toHaveBeenCalledTimes(1);
    expect(world.wakePile).not.toHaveBeenCalled();
  });
});
