import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MODE_SELECT_MOBILE_ASSET_SCALE,
  modeSelectAssetScale,
  mountMobileAccessOverlay,
  stopModeSelectPreview,
} from "./modeSelect";
import {
  MOBILE_LANDING_IMPACT_KEEP,
  mobileLandingPreviewState,
  modeSelectPreviewState,
} from "./modeSelectTheme";

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
    expect(host?.querySelector(".mobile-overlay__ok")?.textContent).toBe("I WANT TO TOUCH");
    expect(host?.querySelector(".mobile-overlay__privacy")).toBeNull();
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

  it("hides the overlay when I WANT TO TOUCH is pressed so the pile can be touched", () => {
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

  it("keeps Mode Select bounce and damps mobile impact by 75%", () => {
    const desktop = modeSelectPreviewState();
    const mobile = mobileLandingPreviewState();

    expect(desktop.physics.bounce).toBe(1.05);
    expect(mobile.physics.bounce).toBeCloseTo(desktop.physics.bounce * MOBILE_LANDING_IMPACT_KEEP, 10);
    expect(mobile.physics.friction).toBe(desktop.physics.friction);
    expect(mobile.physics.grip).toBe(desktop.physics.grip);
    expect(mobile.physics.spin).toBe(desktop.physics.spin);
  });
});

describe("mode select asset scale", () => {
  it("matches 1440p at the authoring size and tracks 1080p / 4K", () => {
    const master = modeSelectPreviewState().masterScale;
    expect(modeSelectAssetScale(master, false, 2560, 1440)).toBeCloseTo(master, 10);
    expect(modeSelectAssetScale(master, false, 1920, 1080)).toBeCloseTo(master * 0.75, 10);
    expect(modeSelectAssetScale(master, false, 3840, 2160)).toBeCloseTo(master * 1.5, 10);
  });

  it("keeps the phone landing shrink instead of stacking viewport scale", () => {
    const master = mobileLandingPreviewState().masterScale;
    expect(modeSelectAssetScale(master, true, 390, 844)).toBeCloseTo(master * MODE_SELECT_MOBILE_ASSET_SCALE, 10);
    expect(modeSelectAssetScale(master, true, 2560, 1440)).toBeCloseTo(master * MODE_SELECT_MOBILE_ASSET_SCALE, 10);
  });
});
