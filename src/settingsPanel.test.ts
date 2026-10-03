import { afterEach, describe, expect, it, vi } from "vitest";
import { closeSettings, isSettingsOpen, openSettings } from "./settingsPanel";

describe("settings panel close targets", () => {
  afterEach(() => {
    closeSettings();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("closes when clicking the SVG inside the Back button", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        addEventListener() {},
        removeEventListener() {},
      }),
    );

    openSettings({
      prefsChanged() {},
      layoutMode: () => false,
      setLayoutMode() {},
    });
    expect(isSettingsOpen()).toBe(true);

    const path = document.querySelector(".settings-modal__back svg path, .settings-modal__back svg");
    expect(path).toBeTruthy();
    expect(path instanceof HTMLElement).toBe(false);
    path!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(isSettingsOpen()).toBe(false);
  });
});
