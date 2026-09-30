import { describe, expect, it } from "vitest";
import { parseYouTubeUrl, youtubeEmbedSrc } from "./youtube";

describe("parseYouTubeUrl", () => {
  it("parses watch URLs", () => {
    const clip = parseYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ", 8);
    expect(clip).toEqual({ videoId: "dQw4w9WgXcQ", startSec: 0, loopSec: 8 });
  });

  it("parses youtu.be with start time", () => {
    const clip = parseYouTubeUrl("https://youtu.be/dQw4w9WgXcQ?t=43", 12);
    expect(clip).toEqual({ videoId: "dQw4w9WgXcQ", startSec: 43, loopSec: 12 });
  });

  it("parses watch URLs with t=Ns", () => {
    const clip = parseYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s", 10);
    expect(clip?.startSec).toBe(90);
  });

  it("parses clock timestamps", () => {
    const clip = parseYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s", 10);
    expect(clip?.startSec).toBe(90);
  });

  it("parses bare ids", () => {
    expect(parseYouTubeUrl("dQw4w9WgXcQ")?.videoId).toBe("dQw4w9WgXcQ");
  });

  it("rejects junk", () => {
    expect(parseYouTubeUrl("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseYouTubeUrl("not-a-link")).toBeNull();
  });
});

describe("youtubeEmbedSrc", () => {
  it("builds a muted embed that keeps start (no playlist loop)", () => {
    const src = youtubeEmbedSrc({ videoId: "dQw4w9WgXcQ", startSec: 10, loopSec: 5 });
    const url = new URL(src);
    expect(url.pathname).toBe("/embed/dQw4w9WgXcQ");
    expect(url.searchParams.get("autoplay")).toBe("1");
    expect(url.searchParams.get("mute")).toBe("1");
    expect(url.searchParams.get("loop")).toBeNull();
    expect(url.searchParams.get("playlist")).toBeNull();
    expect(url.searchParams.get("start")).toBe("10");
    expect(url.searchParams.get("end")).toBe("15");
  });
});
