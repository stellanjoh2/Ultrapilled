import { afterEach, describe, expect, it, vi } from "vitest";
import { closeAbout, isAboutOpen } from "./aboutPanel";
import { closeBugReport, isBugReportOpen } from "./bugReport";
import { closeGuestbook, isGuestbookOpen } from "./guestbookPanel";
import { askModeSelect, stopModeSelectPreview } from "./modeSelect";

describe("mode select header actions", () => {
  afterEach(() => {
    closeAbout();
    closeBugReport();
    closeGuestbook();
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
    const guestbook = actions?.querySelector("[data-open-guestbook]");
    expect(guestbook?.textContent).toContain("Guestbook");
    expect(guestbook?.classList.contains("mode-select__action")).toBe(true);
    expect(report?.nextElementSibling).toBe(guestbook);

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
    expect(root.classList.contains("is-sheet-dim")).toBe(true);

    root.querySelector<HTMLButtonElement>("[data-mode=layout]")?.click();
    await expect(pending).resolves.toEqual({ kind: "mode", mode: "layout" });
  });

  it("toggles the guestbook from the header and closes it on mode pick", async () => {
    stubReducedMotion();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ entries: [], remaining: 0 }))));
    const pending = askModeSelect();
    const root = document.querySelector(".mode-select")!;
    const pill = root.querySelector<HTMLButtonElement>(".mode-select__actions [data-open-guestbook]")!;

    pill.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(isGuestbookOpen()).toBe(true);
    expect(pill.classList.contains("is-open")).toBe(true);
    expect(pill.getAttribute("aria-pressed")).toBe("true");
    expect(root.classList.contains("is-sheet-dim")).toBe(true);
    pill.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(isGuestbookOpen()).toBe(false);
    expect(pill.classList.contains("is-open")).toBe(false);
    expect(root.classList.contains("is-sheet-dim")).toBe(false);

    pill.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    document.querySelector<HTMLButtonElement>(".guestbook-modal__back")!.click();
    expect(pill.classList.contains("is-open")).toBe(false);

    pill.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(isGuestbookOpen()).toBe(true);
    root.querySelector<HTMLButtonElement>("[data-mode=layout]")?.click();
    await expect(pending).resolves.toEqual({ kind: "mode", mode: "layout" });
    expect(isGuestbookOpen()).toBe(false);
  });

  it("opens About from the S logo without leaving Mode Select", async () => {
    stubReducedMotion();
    const pending = askModeSelect();
    const root = document.querySelector(".mode-select")!;
    const s = root.querySelector<HTMLButtonElement>(".mode-select__s");

    expect(s?.getAttribute("data-open-about")).toBe("");
    expect(s?.getAttribute("aria-label")).toBe("About the creator");
    expect(root.querySelector(".mode-select__lower > .mode-select__s")).toBe(s);
    expect(root.querySelector(".mode-select__social .mode-select__s")).toBeNull();

    s!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(isAboutOpen()).toBe(true);
    expect(document.querySelector(".mode-select")).toBe(root);

    root.querySelector<HTMLButtonElement>("[data-mode=layout]")?.click();
    await expect(pending).resolves.toEqual({ kind: "mode", mode: "layout" });
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
