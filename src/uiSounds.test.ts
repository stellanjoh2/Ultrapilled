import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stop = vi.fn();
const playSound = vi.fn(async (..._args: unknown[]) => ({ stop }));

vi.mock("@/lib/sound-engine", () => ({
  playSound: (...args: unknown[]) => playSound(...args),
  unlockAudio: vi.fn(async () => {}),
}));

describe("uiSounds priority", () => {
  beforeEach(async () => {
    stop.mockClear();
    playSound.mockClear();
    playSound.mockImplementation(async (..._args: unknown[]) => ({ stop }));
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function load() {
    return import("./uiSounds");
  }

  async function flush() {
    await Promise.resolve();
    await Promise.resolve();
  }

  it("keeps open over a same-tick click when open is requested first", async () => {
    const { playClick, playTransition } = await load();
    playTransition(true);
    playClick();
    await flush();

    expect(playSound).toHaveBeenCalledTimes(1);
    expect(String(playSound.mock.calls[0]![0])).toContain("transition_up");
  });

  it("keeps open over a same-tick click when click is requested first", async () => {
    const { playClick, playTransition } = await load();
    playClick();
    playTransition(true);
    await flush();

    expect(playSound).toHaveBeenCalledTimes(1);
    expect(String(playSound.mock.calls[0]![0])).toContain("transition_up");
  });

  it("stops a just-played click when open arrives in the lock window", async () => {
    const { playClick, playTransition } = await load();
    playClick();
    await flush();
    expect(playSound).toHaveBeenCalledTimes(1);
    expect(String(playSound.mock.calls[0]![0])).toMatch(/tap_/);

    playTransition(true);
    await flush();

    expect(stop).toHaveBeenCalled();
    expect(playSound).toHaveBeenCalledTimes(2);
    expect(String(playSound.mock.calls[1]![0])).toContain("transition_up");
  });

  it("lets close beat a same-tick click", async () => {
    const { playClick, playRemove } = await load();
    playClick();
    playRemove();
    await flush();

    expect(playSound).toHaveBeenCalledTimes(1);
    expect(String(playSound.mock.calls[0]![0])).toContain("transition_down");
  });
});
