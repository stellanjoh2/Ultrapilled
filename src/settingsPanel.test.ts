import { afterEach, describe, expect, it, vi } from "vitest";
import { closeBugReport, isBugReportOpen } from "./bugReport";
import { closeSettings, isSettingsOpen, openSettings } from "./settingsPanel";

describe("settings panel close targets", () => {
  afterEach(() => {
    closeBugReport();
    closeSettings();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  function stubReducedMotion() {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        addEventListener() {},
        removeEventListener() {},
      }),
    );
  }

  it("closes when clicking the SVG inside the Back button", () => {
    stubReducedMotion();

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

  it("lists Shift+D for duplicate and hides Dev mode", () => {
    stubReducedMotion();

    openSettings({
      prefsChanged() {},
      layoutMode: () => false,
      setLayoutMode() {},
    });

    const rows = [...document.querySelectorAll(".shortcut-list__row")];
    const duplicate = rows.find((row) => row.querySelector(".shortcut-list__label")?.textContent === "Duplicate");
    const dev = rows.find((row) => row.querySelector(".shortcut-list__label")?.textContent === "Dev mode");
    expect(duplicate?.querySelector(".shortcut-list__keys")?.textContent).toContain("⇧");
    expect(duplicate?.querySelector(".shortcut-list__keys")?.textContent).toContain("D");
    expect(duplicate?.querySelector(".shortcut-list__keys")?.textContent).toMatch(/⌘|Ctrl/);
    expect(dev).toBeUndefined();
  });

  it("shows the report card at the bottom and opens the bug form", () => {
    stubReducedMotion();

    openSettings({
      prefsChanged() {},
      layoutMode: () => false,
      setLayoutMode() {},
    });

    const card = document.querySelector(".report-card");
    const body = document.querySelector("#settings-modal-body");
    expect(card).toBeTruthy();
    expect(body?.lastElementChild).toBe(card);

    const openBtn = document.querySelector("[data-open-bug-report]");
    openBtn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(isBugReportOpen()).toBe(true);
    expect(isSettingsOpen()).toBe(true);
  });
});
