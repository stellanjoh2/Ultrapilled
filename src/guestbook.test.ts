import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOCAL_GUESTBOOK_API,
  clearGuestbookDeepLink,
  fetchGuestbook,
  guestbookApiUrl,
  guestbookProblem,
  postGuestbook,
  shouldOpenGuestbookFromUrl,
} from "./guestbook";
import { closeGuestbook, isGuestbookOpen, openGuestbook } from "./guestbookPanel";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("guestbook rules", () => {
  it("uses the local Isso in dev", () => {
    expect(guestbookApiUrl()).toBe(LOCAL_GUESTBOOK_API);
  });

  it("detects guestbook deep links from the moderation email redirect", () => {
    expect(shouldOpenGuestbookFromUrl(new URL("https://ultrapilled.com/?guestbook=1"))).toBe(true);
    expect(shouldOpenGuestbookFromUrl(new URL("https://ultrapilled.com/#guestbook"))).toBe(true);
    expect(shouldOpenGuestbookFromUrl(new URL("https://ultrapilled.com/"))).toBe(false);
    history.replaceState(null, "", "/?guestbook=1");
    clearGuestbookDeepLink();
    expect(window.location.search).toBe("");
  });

  it("mirrors the server content rules", () => {
    expect(guestbookProblem("", "hello there friends today now")).toMatch(/name/);
    expect(guestbookProblem("n".repeat(41), "hello there friends today now")).toMatch(/40/);
    expect(guestbookProblem("Ada", "hi")).toMatch(/5 words/);
    expect(guestbookProblem("Ada", "one two three four")).toMatch(/5 words/);
    expect(guestbookProblem("Ada", `${"word ".repeat(5)}${"x".repeat(480)}`)).toMatch(/500/);
    for (const text of [
      "see https://x.y right now please",
      "www.spam.net is not allowed here",
      "spam.ru rocks please leave now",
      "mail me@example.com about this soon",
      "[a](b) is a markdown link",
    ]) {
      expect(guestbookProblem("Ada", text)).toMatch(/Links/);
    }
    expect(guestbookProblem("Ada", "Love the bouncy pills! e.g. the purple ones")).toBeNull();
  });
});

describe("guestbook api", () => {
  it("reads the newest approved entries as plain text", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        total_replies: 3,
        hidden_replies: 1,
        replies: [
          { id: 2, author: "A &amp; B &lt;3", text: "<b>hi</b>", created: 1_800_000_000, mode: 1 },
          { id: 1, author: null, text: "anon note", created: 1_790_000_000, mode: 1 },
          { id: 9, author: "Pending", text: "hidden", created: 1_790_000_000, mode: 2 },
        ],
      }),
    );
    const page = await fetchGuestbook(0, fetchImpl);
    const url = new URL(fetchImpl.mock.calls[0][0] as string);
    expect(url.searchParams.get("uri")).toBe("/guestbook");
    expect(url.searchParams.get("plain")).toBe("1");
    expect(url.searchParams.get("sort")).toBe("newest");
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ credentials: "omit" });
    expect(page.entries.map((e) => [e.author, e.text])).toEqual([
      ["A & B <3", "<b>hi</b>"],
      ["Anonymous", "anon note"],
    ]);
    expect(page.remaining).toBe(1);
  });

  it("treats a missing thread as empty", async () => {
    const page = await fetchGuestbook(0, vi.fn().mockResolvedValue(new Response("", { status: 404 })));
    expect(page.entries).toEqual([]);
  });

  it("posts only the guestbook fields", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(202, { mode: 2 }));
    const result = await postGuestbook(
      { author: " Ada ", text: " Hello! ", honeypot: "", turnstileToken: "tok" },
      fetchImpl,
    );
    expect(result).toEqual({ ok: true, pending: true });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${LOCAL_GUESTBOOK_API}/new?uri=%2Fguestbook`);
    expect(JSON.parse(init.body)).toEqual({ author: "Ada", text: "Hello!", honeypot: "", turnstileToken: "tok" });
  });

  it("maps gate and Isso guard errors to friendly copy", async () => {
    const rate = await postGuestbook(
      { author: "A", text: "abc", honeypot: "", turnstileToken: "" },
      vi.fn().mockResolvedValue(jsonResponse(429, { code: "rate_limited" })),
    );
    expect(rate).toMatchObject({ ok: false, code: "rate_limited" });
    const guard = await postGuestbook(
      { author: "A", text: "abc", honeypot: "", turnstileToken: "" },
      vi.fn().mockResolvedValue(new Response("<h1>Forbidden</h1>", { status: 403 })),
    );
    expect(guard).toMatchObject({ ok: false, code: "rate_limited" });
    const down = await postGuestbook(
      { author: "A", text: "abc", honeypot: "", turnstileToken: "" },
      vi.fn().mockResolvedValue(new Response("", { status: 502 })),
    );
    expect(down).toMatchObject({ ok: false, message: "The guestbook isn’t available right now." });
  });
});

describe("guestbook panel", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          total_replies: 1,
          hidden_replies: 0,
          replies: [{ id: 1, author: "Ada", text: "<img src=x onerror=alert(1)>", created: 1_800_000_000, mode: 1 }],
        }),
      ),
    );
  });

  afterEach(() => {
    closeGuestbook();
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("opens a left sheet like the How to Guide", async () => {
    openGuestbook();
    expect(isGuestbookOpen()).toBe(true);
    expect(document.querySelector(".guestbook-modal__sheet")).toBeTruthy();
    expect(document.querySelector("#guestbook-title")?.textContent).toBe("Guestbook");
    expect(document.querySelector(".guestbook-modal__back")).toBeTruthy();
    expect(document.querySelector(".guestbook-modal__done")?.textContent).toBe("Ok, take me back");
    await vi.waitFor(() => expect(document.querySelector(".guestbook__entry")).toBeTruthy());
    const text = document.querySelector(".guestbook__text")!;
    expect(text.textContent).toBe("<img src=x onerror=alert(1)>");
    expect(text.querySelector("img")).toBeNull();
    expect(document.querySelector(".guestbook__author")?.textContent).toBe("Ada");
  });

  it("fills the word meter and unlocks signing at five words", () => {
    openGuestbook();
    const name = document.querySelector<HTMLInputElement>("#guestbook-name")!;
    const message = document.querySelector<HTMLTextAreaElement>("#guestbook-message")!;
    const send = document.querySelector<HTMLButtonElement>("[data-guestbook-send]")!;
    const fill = document.querySelector<HTMLElement>("[data-guestbook-word-meter-fill]");
    const meter = document.querySelector<HTMLElement>("[data-guestbook-word-meter]");
    expect(send.disabled).toBe(true);
    expect(meter?.getAttribute("aria-valuemax")).toBe("5");
    name.value = "Ada";
    message.value = "one two three four";
    message.dispatchEvent(new Event("input", { bubbles: true }));
    expect(send.disabled).toBe(true);
    expect(fill?.classList.contains("is-ready")).toBe(false);
    message.value = "Hello from Stockholm this evening";
    message.dispatchEvent(new Event("input", { bubbles: true }));
    expect(send.disabled).toBe(false);
    expect(fill?.classList.contains("is-ready")).toBe(true);
    message.value = "check out spam.com please now";
    message.dispatchEvent(new Event("input", { bubbles: true }));
    expect(send.disabled).toBe(true);
  });

  it("mounts Turnstile off the modal", async () => {
    vi.stubGlobal("turnstile", {
      render: () => "widget-1",
      remove: () => {},
      reset: () => {},
      getResponse: () => "",
    });
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "test-site-key");
    openGuestbook();
    await vi.waitFor(() => expect(document.querySelector("#guestbook-turnstile")).toBeTruthy());
    expect(document.querySelector(".guestbook-modal__sheet #guestbook-turnstile")).toBeNull();
    expect(document.querySelector("#guestbook-turnstile")?.parentElement).toBe(document.body);
    closeGuestbook();
    expect(document.querySelector("#guestbook-turnstile")).toBeNull();
  });

  it("closes on Escape", () => {
    openGuestbook();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(isGuestbookOpen()).toBe(false);
  });
});
