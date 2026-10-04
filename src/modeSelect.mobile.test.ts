import { afterEach, describe, expect, it, vi } from "vitest";
import { mountMobileAccessOverlay, stopModeSelectPreview } from "./modeSelect";

describe("mobile access overlay", () => {
  afterEach(() => {
    stopModeSelectPreview();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("puts the access message on the Orby preview host, not the editor chrome", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        addEventListener() {},
        removeEventListener() {},
      }),
    );

    mountMobileAccessOverlay();
    mountMobileAccessOverlay();

    const host = document.querySelector(".mode-select-host");
    expect(host).toBeTruthy();
    expect(host?.classList.contains("is-mobile-gate")).toBe(true);
    expect(host?.querySelectorAll(".mobile-overlay")).toHaveLength(1);
    expect(host?.querySelector(".mobile-overlay__message")?.textContent).toBe(
      "Not intended for mobile screens",
    );
    expect(document.querySelector(".panel")).toBeNull();
    expect(document.querySelector(".topbar")).toBeNull();
  });
});
