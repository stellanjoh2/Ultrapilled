import { afterEach, describe, expect, it, vi } from "vitest";
import { closeHelp, isHelpOpen, openHelp } from "./helpPanel";

describe("help panel", () => {
  afterEach(() => {
    closeHelp();
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

  it("opens a left sheet with the guide and closes from Back SVG", () => {
    stubReducedMotion();

    openHelp();
    expect(isHelpOpen()).toBe(true);

    const sheet = document.querySelector(".help-modal__sheet");
    const title = document.querySelector("#help-modal-title");
    expect(sheet).toBeTruthy();
    expect(title?.textContent).toBe("How to Guide");
    expect(document.querySelector("#help-objects")).toBeTruthy();
    expect(document.querySelector("#help-orby")).toBeTruthy();
    expect(document.body.textContent).toContain("Double-click");
    expect(document.querySelector('.help-orby-cta[href="https://orby.studio/"]')?.textContent?.trim()).toBe(
      "Visit Orby",
    );
    const gifs = [...document.querySelectorAll<HTMLImageElement>(".help-orby-gifs__item img")];
    expect(gifs).toHaveLength(3);
    expect(gifs[1]?.getAttribute("src")).toContain("pumpkin-low-poly.gif");

    const path = document.querySelector(".help-modal__back svg path, .help-modal__back svg");
    expect(path).toBeTruthy();
    path!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(isHelpOpen()).toBe(false);
  });

  it("marks the open-help trigger as expanded while open", () => {
    stubReducedMotion();

    const trigger = document.createElement("button");
    trigger.setAttribute("data-open-help", "");
    trigger.setAttribute("aria-expanded", "false");
    document.body.append(trigger);

    openHelp();
    expect(trigger.classList.contains("is-on")).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    closeHelp();
    expect(trigger.classList.contains("is-on")).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});
