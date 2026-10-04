import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUG_REPORT_APP,
  DEFAULT_BUG_REPORT_API,
  LOCAL_BUG_REPORT_PROXY,
  MIN_BUG_MESSAGE_WORDS,
  bugReportApiUrl,
  bugReportMessagePasses,
  bugReportWordCount,
  closeBugReport,
  isBugReportOpen,
  openBugReport,
} from "./bugReport";

describe("bug report", () => {
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
  });

  afterEach(() => {
    closeBugReport();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("requires at least five words", () => {
    expect(bugReportWordCount("")).toBe(0);
    expect(bugReportWordCount("   ")).toBe(0);
    expect(bugReportWordCount("too short")).toBe(2);
    expect(bugReportMessagePasses("too short")).toBe(false);
    expect(bugReportMessagePasses("one two three four five")).toBe(true);
  });

  it("targets the shared Orby inbox endpoint", () => {
    expect(BUG_REPORT_APP).toBe("ultrapilled");
    expect(DEFAULT_BUG_REPORT_API).toBe("https://orby-gamma.vercel.app/api/bug-report");
    // Vitest runs as DEV, so we hit the Vite same-origin proxy path.
    expect(bugReportApiUrl()).toBe(LOCAL_BUG_REPORT_PROXY);
  });

  it("opens a styled form with UltraPilled categories", () => {
    openBugReport();
    expect(isBugReportOpen()).toBe(true);
    const select = document.querySelector<HTMLSelectElement>("#bug-report-category");
    const values = [...(select?.options ?? [])].map((option) => option.value);
    expect(values).toEqual(["crash", "rendering", "physics", "ui", "export", "media", "other"]);
    expect(select?.value).toBe("rendering");
  });

  it("fills the word meter and unlocks send at five words", () => {
    openBugReport();
    const message = document.querySelector<HTMLTextAreaElement>("#bug-report-message");
    const send = document.querySelector<HTMLButtonElement>("[data-bug-send]");
    const wrap = document.querySelector<HTMLElement>("[data-bug-send-wrap]");
    const fill = document.querySelector<HTMLElement>("[data-bug-word-meter-fill]");
    const meter = document.querySelector<HTMLElement>("[data-bug-word-meter]");
    expect(message).toBeTruthy();
    expect(send?.disabled).toBe(true);
    expect(wrap?.title).toBe("Please write some more!");
    expect(fill?.style.width).toBe("0%");
    expect(meter?.getAttribute("aria-valuemax")).toBe(String(MIN_BUG_MESSAGE_WORDS));

    message!.value = "one two";
    message!.dispatchEvent(new Event("input"));
    expect(send?.disabled).toBe(true);
    expect(fill?.style.width).toBe("40%");
    expect(fill?.classList.contains("is-ready")).toBe(false);

    message!.value = "one two three four five";
    message!.dispatchEvent(new Event("input"));
    expect(send?.disabled).toBe(false);
    expect(wrap?.title).toBe("");
    expect(fill?.style.width).toBe("100%");
    expect(fill?.classList.contains("is-ready")).toBe(true);
    expect(meter?.getAttribute("aria-valuenow")).toBe("5");
  });

  it("closes when clicking the SVG inside the Close button", () => {
    openBugReport();
    expect(isBugReportOpen()).toBe(true);

    const path = document.querySelector(".bug-report__x svg path, .bug-report__x svg");
    expect(path).toBeTruthy();
    expect(path instanceof HTMLElement).toBe(false);
    path!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(isBugReportOpen()).toBe(false);
  });

  it("shows a thank-you overlay after a successful send", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => "",
      }),
    );
    openBugReport();
    const message = document.querySelector<HTMLTextAreaElement>("#bug-report-message");
    const form = document.querySelector<HTMLFormElement>("#bug-report-form");
    expect(message).toBeTruthy();
    expect(form).toBeTruthy();
    message!.value = "one two three four five";
    message!.dispatchEvent(new Event("input"));
    form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(document.querySelector(".bug-report-thanks__message")?.textContent).toContain(
        "Thanks for letting us know",
      );
    });
    expect(document.querySelector(".bug-report-thanks__accent")?.textContent).toBe(
      "We’ll look into it shortly.",
    );
    expect(document.querySelector(".bug-report-thanks__ok")?.textContent?.trim()).toBe(
      "Keep pilling",
    );
    expect(document.querySelector("#bug-report-form")).toBeNull();
    expect(isBugReportOpen()).toBe(true);

    document.querySelector(".bug-report-thanks__ok")!.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(isBugReportOpen()).toBe(false);
  });
});
