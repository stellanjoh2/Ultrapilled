import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canQueryLocalFonts,
  listedFamilies,
  localCatalogLoaded,
  localHasItalic,
  maybeQueryLocalCatalog,
  queryLocalCatalog,
  unbundledFontFamilies,
} from "./localFonts";

const bundled = new Set(["Inter", "Syne"]);

describe("localHasItalic", () => {
  afterEach(async () => {
    Object.defineProperty(window, "queryLocalFonts", {
      configurable: true,
      writable: true,
      value: vi.fn().mockResolvedValue([]),
    });
    await queryLocalCatalog();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("is undefined when the family is not in the catalog", async () => {
    Object.defineProperty(window, "queryLocalFonts", {
      configurable: true,
      writable: true,
      value: vi.fn().mockResolvedValue([]),
    });
    await queryLocalCatalog();
    expect(localHasItalic("Didot")).toBeUndefined();
  });

  it("is true when a local face is italic", async () => {
    Object.defineProperty(window, "queryLocalFonts", {
      configurable: true,
      writable: true,
      value: vi.fn().mockResolvedValue([
        { family: "Didot", style: "Regular", blob: async () => new Blob() },
        { family: "Didot", style: "Italic", blob: async () => new Blob() },
      ]),
    });
    await queryLocalCatalog();
    expect(localHasItalic("Didot")).toBe(true);
  });

  it("is false when local faces exist but none are italic", async () => {
    Object.defineProperty(window, "queryLocalFonts", {
      configurable: true,
      writable: true,
      value: vi.fn().mockResolvedValue([{ family: "Impact", style: "Regular", blob: async () => new Blob() }]),
    });
    await queryLocalCatalog();
    expect(localHasItalic("Impact")).toBe(false);
  });
});

describe("unbundledFontFamilies", () => {
  it("keeps custom names and drops bundled and blanks", () => {
    expect(unbundledFontFamilies(["Inter", " Helvetica Neue ", "Syne", "", "Helvetica Neue"], bundled)).toEqual([
      "Helvetica Neue",
    ]);
  });
});

describe("maybeQueryLocalCatalog", () => {
  afterEach(async () => {
    Object.defineProperty(window, "queryLocalFonts", {
      configurable: true,
      writable: true,
      value: vi.fn().mockResolvedValue([]),
    });
    await queryLocalCatalog();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function clearCatalog() {
    Object.defineProperty(window, "queryLocalFonts", {
      configurable: true,
      writable: true,
      value: vi.fn().mockResolvedValue([]),
    });
    await queryLocalCatalog();
  }

  it("does not prompt for bundled typefaces", async () => {
    const askAllow = vi.fn().mockResolvedValue(true);
    await maybeQueryLocalCatalog({ families: ["Inter", "Syne"], bundled, askAllow });
    expect(askAllow).not.toHaveBeenCalled();
  });

  it("prompts Allow local fonts when the API exists and the scene uses a custom face", async () => {
    await clearCatalog();
    const query = vi.fn().mockResolvedValue([{ family: "Helvetica Neue", style: "Regular", blob: async () => new Blob() }]);
    Object.defineProperty(window, "queryLocalFonts", {
      configurable: true,
      writable: true,
      value: query,
    });
    const askAllow = vi.fn().mockResolvedValue(true);

    expect(canQueryLocalFonts()).toBe(true);
    await maybeQueryLocalCatalog({ families: ["Helvetica Neue"], bundled, askAllow });

    expect(askAllow).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledOnce();
    expect(localCatalogLoaded()).toBe(true);
    expect(listedFamilies()).toEqual(["Helvetica Neue"]);
  });

  it("skips the prompt when the catalog was already loaded", async () => {
    await clearCatalog();
    Object.defineProperty(window, "queryLocalFonts", {
      configurable: true,
      writable: true,
      value: vi.fn().mockResolvedValue([{ family: "Futura", style: "Bold", blob: async () => new Blob() }]),
    });
    await queryLocalCatalog();
    const askAllow = vi.fn().mockResolvedValue(true);
    const query = vi.fn();
    Object.defineProperty(window, "queryLocalFonts", {
      configurable: true,
      writable: true,
      value: query,
    });

    await maybeQueryLocalCatalog({ families: ["Futura"], bundled, askAllow });
    expect(askAllow).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("does not query when the user declines", async () => {
    await clearCatalog();
    const query = vi.fn();
    Object.defineProperty(window, "queryLocalFonts", {
      configurable: true,
      writable: true,
      value: query,
    });
    await maybeQueryLocalCatalog({
      families: ["Futura"],
      bundled,
      askAllow: async () => false,
    });
    expect(query).not.toHaveBeenCalled();
    expect(localCatalogLoaded()).toBe(false);
  });
});
