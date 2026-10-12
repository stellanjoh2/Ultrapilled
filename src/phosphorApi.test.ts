import { describe, expect, it } from "vitest";
import {
  FEATURED_PHOSPHOR,
  parsePhosphorRemoteId,
  phosphorConfigured,
  phosphorRemoteId,
  phosphorSvgMarkup,
  searchPhosphor,
} from "./phosphorApi";

describe("phosphorApi", () => {
  it("ships fill and regular assets for search", () => {
    expect(phosphorConfigured()).toBe(true);
  });

  it("returns featured icons when the query is empty", () => {
    const page = searchPhosphor("", 1, "fill");
    expect(page.icons.length).toBeGreaterThan(0);
    expect(page.icons.length).toBeLessThanOrEqual(FEATURED_PHOSPHOR.length);
    expect(page.icons.every((icon) => icon.thumb && icon.style === "fill")).toBe(true);
  });

  it("searches both solid and outlined styles", () => {
    const solid = searchPhosphor("heart", 1, "fill");
    const outline = searchPhosphor("heart", 1, "regular");
    expect(solid.icons.some((icon) => icon.id === "fill:heart")).toBe(true);
    expect(outline.icons.some((icon) => icon.id === "regular:heart")).toBe(true);
    expect(solid.icons[0]?.thumb).not.toBe(outline.icons.find((i) => i.name === "heart")?.thumb);
  });

  it("finds icons by tag", () => {
    const byTag = searchPhosphor("love", 1, "fill");
    expect(byTag.total).toBeGreaterThan(0);
    expect(byTag.icons.some((icon) => icon.name.includes("heart") || icon.tags.includes("love"))).toBe(
      true,
    );
  });

  it("pages search results", () => {
    const first = searchPhosphor("a", 1, "fill");
    const second = searchPhosphor("a", 2, "fill");
    expect(first.page).toBe(1);
    if (first.totalPages > 1) {
      expect(second.page).toBe(2);
      expect(second.icons[0]?.id).not.toBe(first.icons[0]?.id);
    }
  });

  it("encodes and parses remote ids", () => {
    expect(phosphorRemoteId("regular", "rocket")).toBe("regular:rocket");
    expect(parsePhosphorRemoteId("fill:heart")).toEqual({ style: "fill", name: "heart" });
    expect(parsePhosphorRemoteId("heart")).toEqual({ style: "fill", name: "heart" });
  });

  it("bakes a solid fill for img / mask use", () => {
    expect(phosphorSvgMarkup('<svg fill="currentColor"><path/></svg>')).toBe(
      '<svg fill="#000000"><path/></svg>',
    );
  });
});
