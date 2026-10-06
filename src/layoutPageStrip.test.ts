import { describe, expect, it, vi } from "vitest";
import { mountLayoutPageStrip, paintLayoutPageStrip, type LayoutPageStripHost } from "./layoutPageStrip";

function host(partial: Partial<LayoutPageStripHost> = {}): LayoutPageStripHost {
  return {
    layoutMode: () => true,
    presenting: () => false,
    soundMuted: () => false,
    count: () => 2,
    index: () => 0,
    select: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    present: vi.fn(),
    toggleSound: vi.fn(),
    ...partial,
  };
}

describe("layoutPageStrip", () => {
  it("hides outside layout mode", () => {
    const root = document.createElement("nav");
    paintLayoutPageStrip(root, host({ layoutMode: () => false }));
    expect(root.hidden).toBe(true);
    expect(root.querySelectorAll("button")).toHaveLength(0);
  });

  it("paints frames and routes clicks", () => {
    const root = document.createElement("nav");
    const api = host();
    mountLayoutPageStrip(root, api);
    paintLayoutPageStrip(root, api);
    expect(root.hidden).toBe(false);
    expect(root.querySelectorAll("[data-page-index]")).toHaveLength(2);
    expect([...root.querySelectorAll("button")].every((btn) => btn.classList.contains("icon-hover"))).toBe(true);
    const tools = root.querySelector(".page-strip__tools");
    const frames = root.querySelector(".page-strip__frames");
    expect(root.firstElementChild).toBe(tools);
    expect(tools?.nextElementSibling).toBe(frames);
    expect(tools?.querySelector("[data-page-present]")).not.toBeNull();
    expect(frames?.contains(root.querySelector("[data-page-index]")!)).toBe(true);
    root.querySelector<HTMLButtonElement>("[data-page-index='1']")?.click();
    expect(api.select).toHaveBeenCalledWith(1);
    root.querySelector<HTMLButtonElement>("[data-page-add]")?.click();
    expect(api.add).toHaveBeenCalledTimes(1);
    root.querySelector<HTMLButtonElement>("[data-page-remove]")?.click();
    expect(api.remove).toHaveBeenCalledTimes(1);
    root.querySelector<HTMLButtonElement>("[data-page-present]")?.click();
    expect(api.present).toHaveBeenCalledTimes(1);
    expect(root.querySelector("[data-page-sound]")).toBeNull();
  });

  it("hides add/remove while presenting", () => {
    const root = document.createElement("nav");
    paintLayoutPageStrip(root, host({ presenting: () => true }));
    expect(root.classList.contains("is-presenting")).toBe(true);
    expect(root.querySelector("[data-page-add]")).toBeNull();
    expect(root.querySelector("[data-page-remove]")).toBeNull();
    expect(root.querySelector("[data-page-present]")).not.toBeNull();
    expect(root.querySelector("[data-page-sound]")).not.toBeNull();
    expect(root.querySelector(".page-strip__tools")?.querySelector("[data-page-present]")).not.toBeNull();
  });

  it("toggles presentation mute", () => {
    const root = document.createElement("nav");
    const api = host({ presenting: () => true, soundMuted: () => true });
    mountLayoutPageStrip(root, api);
    paintLayoutPageStrip(root, api);
    const sound = root.querySelector<HTMLButtonElement>("[data-page-sound]");
    expect(sound?.getAttribute("aria-pressed")).toBe("true");
    sound?.click();
    expect(api.toggleSound).toHaveBeenCalledTimes(1);
  });

  it("shows a cached page snapshot on hover", () => {
    const root = document.createElement("nav");
    document.body.append(root);
    const src = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    const api = host({ peekThumb: () => src });
    mountLayoutPageStrip(root, api);
    paintLayoutPageStrip(root, api);
    root.querySelector("[data-page-index='1']")?.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    const preview = root.querySelector<HTMLElement>(".page-strip__preview");
    expect(preview?.hidden).toBe(false);
    expect(preview?.querySelector("img")?.src).toContain("data:image");
    root.remove();
  });
});
