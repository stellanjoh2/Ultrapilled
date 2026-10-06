import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hideTooltip, mountTooltips, setTooltipsEnabled, suggestTooltip } from "./tooltip";

describe("tooltip fade on action", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        addEventListener() {},
        removeEventListener() {},
      }),
    );
    document.body.innerHTML = '<button type="button" id="handle" data-tip="Rotate and scale">grab</button>';
    setTooltipsEnabled(true);
    mountTooltips(document);
  });

  afterEach(() => {
    setTooltipsEnabled(false);
    document.body.innerHTML = "";
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("fades the tip when hideTooltip({ fade: true }) runs", () => {
    suggestTooltip(document.getElementById("handle")!);
    vi.advanceTimersByTime(400);
    const tip = document.querySelector(".ui-tip");
    expect(tip).toBeInstanceOf(HTMLElement);
    expect((tip as HTMLElement).hidden).toBe(false);

    hideTooltip({ fade: true });
    expect((tip as HTMLElement).classList.contains("is-leaving")).toBe(true);
    expect((tip as HTMLElement).hidden).toBe(false);
  });

  it("hides immediately when reduced motion is on", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        addEventListener() {},
        removeEventListener() {},
      }),
    );
    suggestTooltip(document.getElementById("handle")!);
    vi.advanceTimersByTime(400);
    const tip = document.querySelector(".ui-tip");
    hideTooltip({ fade: true });
    expect((tip as HTMLElement).classList.contains("is-leaving")).toBe(false);
    expect((tip as HTMLElement).hidden).toBe(true);
  });
});
