type FontDataLike = {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
  blob: () => Promise<Blob>;
};

type QueryLocalFonts = () => Promise<FontDataLike[]>;

let catalog: FontDataLike[] = [];
const loaded = new Set<string>();

function queryLocalFontsFn(): QueryLocalFonts | undefined {
  return (window as Window & { queryLocalFonts?: QueryLocalFonts }).queryLocalFonts;
}

export function canQueryLocalFonts(): boolean {
  return typeof queryLocalFontsFn() === "function";
}

export function localCatalogLoaded(): boolean {
  return catalog.length > 0;
}

export function listedFamilies(): string[] {
  return [...new Set(catalog.map((font) => font.family))].sort((a, b) => a.localeCompare(b));
}

/** Families that are not in the app’s bundled list. */
export function unbundledFontFamilies(families: Iterable<string>, bundled: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of families) {
    const family = raw.trim();
    if (!family || bundled.has(family) || seen.has(family)) continue;
    seen.add(family);
    out.push(family);
  }
  return out;
}

/** Prompt once per session when a loaded scene needs installed fonts. */
export async function maybeQueryLocalCatalog(opts: {
  families: Iterable<string>;
  bundled: ReadonlySet<string>;
  askAllow: () => Promise<boolean>;
}): Promise<void> {
  if (!unbundledFontFamilies(opts.families, opts.bundled).length) return;
  if (localCatalogLoaded() || !canQueryLocalFonts()) return;
  if (!(await opts.askAllow())) return;
  try {
    await queryLocalCatalog();
  } catch {
    /* denied — activateFamily still tries local() */
  }
}

export function localWeights(family: string): number[] {
  const weights = new Set<number>();
  for (const font of catalog) {
    if (font.family !== family) continue;
    weights.add(Number(weightFromStyle(font.style)));
  }
  return [...weights].sort((a, b) => a - b);
}

/** `undefined` when this family is not in the local catalog. */
export function localHasItalic(family: string): boolean | undefined {
  let found = false;
  for (const font of catalog) {
    if (font.family !== family) continue;
    found = true;
    if (/italic|oblique/i.test(font.style)) return true;
  }
  return found ? false : undefined;
}

export async function queryLocalCatalog(): Promise<string[]> {
  const query = queryLocalFontsFn();
  if (!query) throw new Error("unsupported");
  catalog = await query();
  return listedFamilies();
}

function weightFromStyle(style: string): string {
  const s = style.toLowerCase();
  if (/(extra|ultra)?\s*black|heavy/.test(s)) return "900";
  if (/(extra|ultra)\s*bold/.test(s)) return "800";
  if (/\bbold\b/.test(s)) return "700";
  if (/semi\s*bold|demi\s*bold/.test(s)) return "600";
  if (/\bmedium\b/.test(s)) return "500";
  if (/\blight\b/.test(s)) return "300";
  if (/extra\s*light|ultra\s*light|thin|hairline/.test(s)) return "100";
  return "400";
}

async function addFace(family: string, source: BufferSource | string, weight: string, italic: boolean) {
  const face = new FontFace(family, source, {
    weight,
    style: italic ? "italic" : "normal",
    display: "swap",
  });
  await face.load();
  document.fonts.add(face);
}

export async function activateFamily(family: string): Promise<void> {
  const key = family.trim().toLowerCase();
  if (!key || loaded.has(key)) return;

  const matches = catalog.filter((font) => font.family === family);
  if (matches.length) {
    await Promise.all(
      matches.map(async (font) => {
        try {
          const buffer = await (await font.blob()).arrayBuffer();
          await addFace(family, buffer, weightFromStyle(font.style), /italic|oblique/i.test(font.style));
        } catch {
          /* skip unreadable faces */
        }
      }),
    );
    loaded.add(key);
    return;
  }

  for (const localName of [family, family.replaceAll(" ", "")]) {
    try {
      await addFace(family, `local("${localName}")`, "700", false);
      try {
        await addFace(family, `local("${localName}")`, "400", false);
      } catch {
        /* bold-only is enough for chips */
      }
      loaded.add(key);
      return;
    } catch {
      /* try next local name */
    }
  }
}
