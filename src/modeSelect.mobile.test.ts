import { afterEach, describe, expect, it, vi } from "vitest";
import { mountMobileAccessOverlay, stopModeSelectPreview } from "./modeSelect";
import { mobileLandingPreviewState, modeSelectPreviewState } from "./modeSelectTheme";

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
    expect(host?.querySelector(".mobile-overlay__s .logotype__mark")?.getAttribute("viewBox")).toBe(
      "0 0 198 248.77",
    );
    expect(host?.querySelector(".mobile-overlay__mark")).toBeTruthy();
    expect(host?.querySelector(".mobile-overlay__mark .logotype__mark")?.getAttribute("viewBox")).toBe(
      "0 0 276.31 76.32",
    );
    expect(host?.querySelector(".mobile-overlay__message")?.textContent).toBe(
      "Not available on mobile",
    );
    expect(host?.querySelector(".mobile-overlay__ok")?.textContent).toBe("I understand");
    const github = host?.querySelector<HTMLAnchorElement>(".mobile-overlay__github");
    expect(github?.getAttribute("href")).toBe("https://github.com/stellanjoh2/Ultrapilled");
    expect(github?.querySelector(".logotype__mark")?.getAttribute("viewBox")).toBe("0 0 98 96");
    const x = host?.querySelector<HTMLAnchorElement>(".mobile-overlay__x");
    expect(x?.getAttribute("href")).toBe("https://x.com/johstell");
    expect(x?.querySelector(".logotype__mark")?.getAttribute("viewBox")).toBe("0 0 1200 1227");
    expect(document.querySelector(".panel")).toBeNull();
    expect(document.querySelector(".topbar")).toBeNull();
    expect(document.querySelector(".mode-select")).toBeNull();
    expect(document.querySelector(".reconnect")).toBeNull();
  });

  it("hides the overlay when I understand is pressed so the pile can be touched", () => {
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
    const host = document.querySelector(".mode-select-host");
    host?.querySelector<HTMLButtonElement>(".mobile-overlay__ok")?.click();

    expect(host?.classList.contains("is-playing")).toBe(true);
    expect(host?.querySelector(".mobile-overlay")).toBeNull();
  });
});

describe("mobile landing preview", () => {
  it("is a custom template with three sad smileys, leaving Mode Select unchanged", () => {
    const desktop = modeSelectPreviewState();
    const mobile = mobileLandingPreviewState();
    const sad = mobile.slots
      .filter((slot): slot is Extract<typeof slot, { kind: "image" }> => slot.kind === "image" && Boolean(slot.emoji))
      .map((slot) => slot.emoji);

    expect(desktop.template).toBe("mode-select-preview");
    expect(desktop.slots.some((slot) => slot.kind === "image" && slot.emoji)).toBe(false);
    expect(mobile.template).toBe("custom");
    expect(sad).toEqual(["😢", "☹️", "😞"]);
  });
});
