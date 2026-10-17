import { afterEach, describe, expect, it, vi } from "vitest";
import { blankState } from "./templates";
import { serializePillProject, type PillProject } from "./project/pillFormat";
import {
  SHARE_MAX_BYTES,
  clearShareDeepLink,
  createShareLink,
  fetchShareProject,
  isShareId,
  publicShareUrl,
  shareIdFromUrl,
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

  it("reads ?r= and #r= deep links", () => {
    const id = "abcdefghijklmnopqr12";
    expect(shareIdFromUrl(new URL(`https://ultrapilled.com/?r=${id}`))).toBe(id);
    expect(shareIdFromUrl(new URL(`https://ultrapilled.com/#r=${id}`))).toBe(id);
    expect(shareIdFromUrl(new URL("https://ultrapilled.com/"))).toBeNull();
  });

  it("clears the deep link from the address bar", () => {
    history.replaceState(null, "", "/?r=abcdefghijklmnopqr12");
    clearShareDeepLink();
    expect(window.location.search).toBe("");
  });

  it("builds a public share url", () => {
    expect(publicShareUrl("abcdefghijklmnopqr12", "https://ultrapilled.com")).toBe(
      "https://ultrapilled.com/?r=abcdefghijklmnopqr12",
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
      expect(result.url).toContain("?r=abcdefghijklmnopqr12");
    }
    expect(fetchImpl).toHaveBeenCalledOnce();
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
});
