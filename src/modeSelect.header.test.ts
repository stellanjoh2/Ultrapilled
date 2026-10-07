import { afterEach, describe, expect, it, vi } from "vitest";
import { isAboutOpen } from "./aboutPanel";
import { closeBugReport, isBugReportOpen } from "./bugReport";
import { askModeSelect, stopModeSelectPreview } from "./modeSelect";

describe("mode select header actions", () => {
  afterEach(() => {
    closeBugReport();
    stopModeSelectPreview();
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

  it("puts Load Project and Report issue in the header, opposite the logo", async () => {
    stubReducedMotion();
    const pending = askModeSelect();
    const root = document.querySelector(".mode-select")!;
    const actions = root.querySelector(".mode-select__actions");
    const load = actions?.querySelector("[data-load-project]");
    const report = actions?.querySelector("[data-open-bug-report]");

    expect(root.querySelector(".mode-select__mark")).toBeTruthy();
    expect(actions).toBeTruthy();
    expect(load?.textContent).toContain("Load Project");
    expect(report?.textContent).toContain("Report issue");
    expect(root.querySelector(".mode-select__lower [data-open-bug-report]")).toBeNull();
    expect(root.querySelector(".mode-select__file")?.getAttribute("hidden")).toBe("");
    expect(load?.classList.contains("mode-select__action")).toBe(true);
    expect(load?.classList.contains("pill")).toBe(true);
    expect(load?.getAttribute("data-tip")).toBe("Open a saved .pill scene");
    expect(report?.classList.contains("mode-select__action")).toBe(true);
    expect(report?.classList.contains("pill")).toBe(true);
    expect(report?.getAttribute("data-tip")).toBe("Send a bug report");

    root.querySelector<HTMLButtonElement>("[data-mode=physics]")?.click();
    await expect(pending).resolves.toEqual({ kind: "mode", mode: "physics" });
  });

  it("opens the bug form from the header without leaving Mode Select", async () => {
    stubReducedMotion();
    const pending = askModeSelect();
    const root = document.querySelector(".mode-select")!;

    root.querySelector("[data-open-bug-report]")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(isBugReportOpen()).toBe(true);
    expect(document.querySelector(".mode-select")).toBe(root);

    root.querySelector<HTMLButtonElement>("[data-mode=layout]")?.click();
    await expect(pending).resolves.toEqual({ kind: "mode", mode: "layout" });
  });

  it("links the S logo to LinkedIn without leaving Mode Select", async () => {
    stubReducedMotion();
    const pending = askModeSelect();
    const root = document.querySelector(".mode-select")!;
    const s = root.querySelector<HTMLAnchorElement>(".mode-select__s");

    expect(s?.getAttribute("href")).toBe("https://www.linkedin.com/in/stellanj/");
    expect(s?.getAttribute("target")).toBe("_blank");
    expect(s?.getAttribute("aria-label")).toBe("LinkedIn");
    expect(isAboutOpen()).toBe(false);
    expect(document.querySelector(".mode-select")).toBe(root);

    root.querySelector<HTMLButtonElement>("[data-mode=physics]")?.click();
    await expect(pending).resolves.toEqual({ kind: "mode", mode: "physics" });
  });

  it("opens a .pill picker from Load Project", async () => {
    stubReducedMotion();
    const pending = askModeSelect();
    const root = document.querySelector(".mode-select")!;
    const input = root.querySelector<HTMLInputElement>(".mode-select__file")!;
    const click = vi.spyOn(input, "click").mockImplementation(() => {});

    root.querySelector("[data-load-project]")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(click).toHaveBeenCalledOnce();
    expect(input.accept).toContain(".pill");
    expect(document.querySelector(".mode-select")).toBe(root);

    root.querySelector<HTMLButtonElement>("[data-mode=physics]")?.click();
    await pending;
  });

  it("resolves with the chosen .pill file", async () => {
    stubReducedMotion();
    const pending = askModeSelect();
    const input = document.querySelector<HTMLInputElement>(".mode-select__file")!;
    const file = new File(["{}"], "scene.pill", { type: "application/x-ultrapilled-project" });
    Object.defineProperty(input, "files", { value: [file] });
    input.dispatchEvent(new Event("change"));

    await expect(pending).resolves.toEqual({ kind: "project", file });
    expect(document.querySelector(".mode-select")).toBeNull();
  });
});
