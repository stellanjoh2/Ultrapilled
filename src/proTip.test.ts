import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hintMediaExportOnce, mountProTip, setProTipsEnabled } from "./proTip";

describe("hintMediaExportOnce", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        addEventListener() {},
        removeEventListener() {},
      }),
    );
    document.body.innerHTML = '<div id="host"></div>';
    localStorage.clear();
    setProTipsEnabled(false);
    mountProTip(document.getElementById("host")!);
  });

  afterEach(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    setProTipsEnabled(false);
    document.body.innerHTML = "";
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows a Hint once, then stays quiet", () => {
    hintMediaExportOnce();
    const card = document.querySelector(".pro-tip");
    expect(card).toBeTruthy();
    expect(card?.querySelector(".pro-tip__title")?.textContent).toBe("Hint");
    expect(card?.querySelector(".pro-tip__body")?.textContent).toContain(
      "GIFs and YouTube clips won’t export in videos",
    );
    expect(card?.querySelector(".pro-tip__stop")).toBeNull();

    hintMediaExportOnce();
    expect(document.querySelectorAll(".pro-tip")).toHaveLength(1);
  });
});
