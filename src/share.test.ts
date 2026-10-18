import { afterEach, describe, expect, it, vi } from "vitest";
import { blankState } from "./templates";
import { serializePillProject, type PillProject } from "./project/pillFormat";
import {
  SHARE_MAX_BYTES,
  clearShareDeepLink,
  createShareLink,
  fetchShareProject,
  formatShareRetryAfter,
  isShareId,
  publicShareUrl,
  shareIdFromUrl,
  shareRateLimitedMessage,
  shareTooLargeMessage,
  utf8ByteLength,
} from "./share";

const MIN_PROJECT: PillProject = {
  state: { ...blankState(), slots: [], template: "blank" },
  poses: [],
  frame: { width: 1280, height: 720 },
  images: [],
  loop: false,
  pages: [],
  pageIndex: 0,
};
const MIN_PILL = serializePillProject(MIN_PROJECT);

describe("share helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    history.replaceState(null, "", "/");
  });

  it("validates share ids", () => {
    expect(isShareId("abcdefghijklmnopqr")).toBe(true);
    expect(isShareId("short")).toBe(false);
    expect(isShareId("bad/id/here!!!!!!!!!!")).toBe(false);
  });

  it("reads /r/, ?r=, and #r= deep links", () => {
    const id = "abcdefghijklmnopqr12";
    expect(shareIdFromUrl(new URL(`https://ultrapilled.com/r/${id}`))).toBe(id);
    expect(shareIdFromUrl(new URL(`https://ultrapilled.com/?r=${id}`))).toBe(id);
    expect(shareIdFromUrl(new URL(`https://ultrapilled.com/#r=${id}`))).toBe(id);
    expect(shareIdFromUrl(new URL("https://ultrapilled.com/"))).toBeNull();
  });

  it("reads a stashed share id after a /r/ → / hop", () => {
    sessionStorage.setItem("up-share-id", "abcdefghijklmnopqr12");
    history.replaceState(null, "", "/");
    expect(shareIdFromUrl()).toBe("abcdefghijklmnopqr12");
  });

  it("clears the deep link from the address bar", () => {
    history.replaceState(null, "", "/?r=abcdefghijklmnopqr12");
    clearShareDeepLink();
    expect(window.location.search).toBe("");
  });

  it("clears /r/ path and session stash", () => {
    sessionStorage.setItem("up-share-id", "abcdefghijklmnopqr12");
    history.replaceState(null, "", "/r/abcdefghijklmnopqr12");
    clearShareDeepLink();
    expect(window.location.pathname).toBe("/");
    expect(sessionStorage.getItem("up-share-id")).toBeNull();
  });

  it("builds a public share url as share-host /o/<id>", () => {
    expect(publicShareUrl("abcdefghijklmnopqr12", "https://share.ultrapilled.com")).toBe(
      "https://share.ultrapilled.com/o/abcdefghijklmnopqr12",
    );
  });

  it("blocks oversize creates client-side", async () => {
    const huge = "x".repeat(SHARE_MAX_BYTES + 10);
    const result = await createShareLink(huge, "tok", vi.fn() as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("too_large");
      expect(result.message).toBe(shareTooLargeMessage());
    }
  });

  it("posts a project and returns a url", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ id: "abcdefghijklmnopqr12", expiresAt: 1_700_000_000 }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;
    const result = await createShareLink(MIN_PILL, "tok", fetchImpl);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.id).toBe("abcdefghijklmnopqr12");
      expect(result.url).toContain("/o/abcdefghijklmnopqr12");
    }
    expect(fetchImpl).toHaveBeenCalled();
  });

  it("falls back to the fly.dev host when the primary fetch fails", async () => {
    vi.stubEnv("VITE_SHARE_API_URL", "https://share.ultrapilled.com");
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("share.ultrapilled.com")) throw new TypeError("Failed to fetch");
      return new Response(JSON.stringify({ id: "abcdefghijklmnopqr12", expiresAt: 1_700_000_000 }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;
    const result = await createShareLink(MIN_PILL, "tok", fetchImpl);
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("fetches and parses a shared project", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(MIN_PILL, { status: 200, headers: { "Content-Type": "application/json" } }),
    ) as unknown as typeof fetch;
    const project = await fetchShareProject("abcdefghijklmnopqr12", fetchImpl);
    expect(project.state.slots).toEqual([]);
  });

  it("maps expired shares to a clear error", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ code: "gone" }), { status: 410 }),
    ) as unknown as typeof fetch;
    await expect(fetchShareProject("abcdefghijklmnopqr12", fetchImpl)).rejects.toMatchObject({
      code: "gone",
    });
  });

  it("counts utf8 bytes", () => {
    expect(utf8ByteLength("aé")).toBe(3);
  });

  it("formats retry-after waits for rate-limit copy", () => {
    expect(formatShareRetryAfter(30)).toBe("less than a minute");
    expect(formatShareRetryAfter(60)).toBe("about a minute");
    expect(formatShareRetryAfter(12 * 60)).toBe("about 12 minutes");
    expect(formatShareRetryAfter(3600)).toBe("about an hour");
    expect(shareRateLimitedMessage(720)).toBe(
      "You’re sharing a little too often. Try again in about 12 minutes.",
    );
  });

  it("surfaces retryAfter from a 429 create response", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ code: "rate_limited", retryAfter: 900 }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "900" },
      }),
    ) as unknown as typeof fetch;
    const result = await createShareLink(MIN_PILL, "tok", fetchImpl);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("rate_limited");
      expect(result.message).toBe("You’re sharing a little too often. Try again in about 15 minutes.");
    }
  });
});
