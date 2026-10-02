import { ICON_PRESETS } from "./icons";
import { modeSelectPreviewState, MODE_SELECT_THEME_ID } from "./modeSelectTheme";
import { DEFAULT_THEME } from "./theme";
import {
  DEFAULT_PHYSICS,
  defaultBackground,
  defaultImageSlot,
  defaultTextSlot,
  demoState,
  uid,
  type AppState,
  type ImageSlot,
  type Slot,
  type TextSlot,
} from "./types";

export type TemplateId = "acid" | "new-york" | "miami" | "berlin" | "tokyo" | typeof MODE_SELECT_THEME_ID;

export const TEMPLATES: { id: TemplateId; label: string; build: () => AppState }[] = [
  { id: "acid", label: "London", build: acidState },
  { id: "new-york", label: "New York", build: newYorkState },
  { id: "miami", label: "Miami", build: miamiState },
  { id: "berlin", label: "Berlin", build: berlinState },
  { id: "tokyo", label: "Tokyo", build: tokyoState },
  { id: MODE_SELECT_THEME_ID, label: "Mode Select", build: modeSelectPreviewState },
];

export function templateLabel(id: string | undefined): string | undefined {
  return TEMPLATES.find((template) => template.id === id)?.label;
}

export function blankState(): AppState {
  return {
    ...demoState(),
    theme: [...DEFAULT_THEME],
    background: defaultBackground(),
    slots: [],
    shapeAmount: 0,
    sizeRandom: 0,
    pillPad: 30,
    textTracking: 0,
    template: "blank",
  };
}

/** Prefab labels when adding pills/type on a blank canvas — mostly 1 word, occasional 2–3. */
const BLANK_PREFAB_WORDS = [
  "Lorem",
  "Ipsum",
  "Dolor",
  "Sit Amet",
  "Consectetur",
  "Adipiscing",
  "Elit",
  "Hendrerit",
  "Nisi",
  "Sollicitudin",
  "Pellentesque",
  "Posuere",
  "Purus",
  "Rhoncus Pulvinar",
  "Aliquam",
  "Aliquet",
  "Tristique",
  "Volutpat",
  "Porttitor",
  "Venenatis",
  "Fringilla",
  "Massa",
  "Aliquam Erat",
  "Lacus",
  "Dictum",
  "Fermentum",
  "Tincidunt",
  "Lacinia",
  "Lectus",
  "Sit Amet Sodales",
  "Eros",
  "Mattis",
  "Convallis",
  "Semper Risus",
  "Ultrices",
  "Tellus",
  "Suscipit",
  "Vehicula",
] as const;

export function blankPrefabText(index: number): string {
  const words = BLANK_PREFAB_WORDS;
  return words[((index % words.length) + words.length) % words.length]!;
}

function presetIcon(name: string, amount: number, colorIndex: number, extra: Partial<ImageSlot> = {}): ImageSlot | null {
  const icon = ICON_PRESETS.find((preset) => preset.label === name);
  if (!icon) return null;
  return defaultImageSlot({
    src: icon.src,
    name: icon.label,
    size: 56,
    amount,
    colorIndex,
    ...extra,
  });
}

/** A bundled photo from public/templates/<template>/. Size is the long edge; the file keeps its aspect. */
function photo(template: TemplateId, file: string, name: string, size: number, radius: number, scale = 1): ImageSlot {
  return defaultImageSlot({ src: `/templates/${template}/${file}`, name, size, amount: 1, colorIndex: 0, scale, radius });
}

function emoji(char: string, name: string, amount: number, scale: number): ImageSlot {
  return defaultImageSlot({ src: "", name, emoji: char, size: 56, amount, colorIndex: 0, scale });
}

export function acidState(): AppState {
  const text = (slot: Partial<TextSlot>) => defaultTextSlot({ fontFamily: "Syne", fontWeight: 800, ...slot });
  const slots: Slot[] = [
    text({ text: "ACID", colorIndex: 1, scale: 1.5, tracking: -221, pillPad: 39 }),
    defaultImageSlot({ src: "", name: "Cool", emoji: "😎", size: 56, amount: 2, colorIndex: 1, scale: 0.7 }),
    text({
      text: "MASHED",
      fontFamily: "Outfit",
      fontWeight: 800,
      colorIndex: 2,
      scale: 0.8,
      gradient: true,
      gradientFromIndex: 2,
      gradientColorIndex: 0,
      gradientAngle: 122,
      tracking: -31,
      pillPad: 34,
      gradientScale: 52,
      animatedGradient: true,
      textColorIndex: 2,
    }),
    text({
      text: "BUZZING",
      shape: "box",
      radius: 13,
      colorIndex: 4,
      scale: 0.95,
      pillPad: 30,
      textAnim: true,
      tracking: -100,
    }),
    presetIcon("Clovers", 2, 2),
    defaultImageSlot({ src: "", name: "Skull", emoji: "💀", size: 56, amount: 2, colorIndex: 1, scale: 0.65 }),
    text({ text: "WAREHOUSE", colorIndex: 2, textColorIndex: 4, stroked: true, stroke: 2, pillPad: 24, scale: 1.35 }),
    defaultImageSlot({ src: "", name: "Pill", emoji: "💊", size: 56, amount: 3, colorIndex: 2, scale: 0.7 }),
    text({
      text: "MENTAL",
      shape: "none",
      colorIndex: 4,
      scale: 2.39,
      tracking: -30,
      gradient: true,
      gradientColorIndex: 2,
      animatedGradient: true,
      gradientSpeed: 65,
    }),
    photo("acid", "piccadilly.jpg", "Piccadilly", 115, 5, 1.15),
    defaultImageSlot({ src: "", name: "Control Knobs", emoji: "🎛️", size: 56, amount: 1, colorIndex: 1, scale: 0.4 }),
    text({
      text: "rewind",
      fontFamily: "Bebas Neue",
      fontWeight: 400,
      textHeight: 42,
      scale: 1.45,
      shape: "box",
      radius: 4,
      stroked: true,
      stroke: 2,
      pillPad: 24,
      colorIndex: 0,
      color: "#3b00ff",
      textColorIndex: 0,
      textAnim: true,
    }),
    defaultImageSlot({ src: "", name: "Musical Keyboard", emoji: "🎹", size: 72, amount: 1, colorIndex: 2, scale: 0.75 }),
    photo("acid", "yen-sung.jpg", "Yen Sung", 110, 18),
    text({
      text: "FREE PARTY",
      colorIndex: 1,
      scale: 0.6,
      pillPad: 36,
      gradient: true,
      gradientColorIndex: 2,
      animatedGradient: true,
      gradientScale: 48,
      gradientAngle: 153,
      gradientSpeed: 14,
      textColor: "#000000",
    }),
    text({ text: "NUTTER", colorIndex: 4, textColorIndex: 0, stroked: true, stroke: 4, scale: 0.75, pillPad: 64 }),
    presetIcon("Stars", 3, 1, { gradient: false, gradientColorIndex: 0, gradientAngle: 253 }),
    text({ text: "BOSH", colorIndex: 2, scale: 0.4, pillPad: 63 }),
    text({
      text: "160–180 BPM",
      fontFamily: "Libre Baskerville",
      fontWeight: 400,
      shape: "pill",
      colorIndex: 0,
      textColor: "#000000",
      scale: 0.38,
      pillPad: 84,
      tracking: -100,
    }),
    photo("acid", "fish-chips.jpg", "Fish & chips", 110, 8, 1.45),
    text({
      text: "1992",
      fontFamily: "Bebas Neue",
      fontWeight: 400,
      shape: "none",
      colorIndex: 1,
      scale: 5.64,
      tracking: -100,
    }),
    text({
      text: "M25",
      fontFamily: "Bebas Neue",
      fontWeight: 400,
      textHeight: 42,
      scale: 2.14,
      shape: "box",
      radius: 4,
      stroked: false,
      stroke: 2,
      pillPad: 24,
      colorIndex: 2,
      textColor: "#ffffff",
      gradient: true,
      gradientColorIndex: 3,
      animatedGradient: true,
      gradientSpeed: 100,
      gradientScale: 33,
      gradientFromIndex: 4,
      gradientFrom: "#3b00ff",
      gradientAngle: 146,
      tracking: -100,
    }),
    text({
      text: "GET SORTED",
      fontFamily: "Outfit",
      fontWeight: 700,
      scale: 0.65,
      colorIndex: 2,
      textColorIndex: 1,
      gradient: true,
      gradientColorIndex: 4,
      tracking: -19,
      pillPad: 49,
      textAnim: true,
    }),
  ].filter((slot): slot is Slot => slot != null);

  return {
    ...demoState(),
    stageColor: "#080808",
    background: {
      ...defaultBackground(),
      kind: "solid",
      shape: "radial",
      stops: [
        { id: uid(), color: "#02006c", at: 0 },
        { id: uid(), color: "#080808", at: 100 },
      ],
      grid: false,
      gridDensity: "base",
      gridColor: "#ffffff",
      gridOpacity: 20,
    },
    canvas: "16:9",
    masterScale: 3.5,
    sizeRandom: 100,
    pillPad: 14,
    textTracking: 37,
    shapeAmount: 17,
    theme: [...DEFAULT_THEME],
    physics: { ...DEFAULT_PHYSICS },
    post: { bloom: 0, bloomOpacity: 100, grain: 0, vignette: 0, saturate: 100, hue: 0, blend: "normal" },
    template: "acid",
    slots,
  };
}

/** Riso newsprint: ink on paper, red-orange against deep blue, light pink on color, print ornaments. */
export function newYorkState(): AppState {
  const INK = 0;
  const PAPER = 1;
  const RED = 2;
  const BLUE = 3;
  const PINK = 4;
  const bare = "none" as const;
  const box = { shape: "box" as const, radius: 0 };
  const grotesk = { fontFamily: "Anton", fontWeight: 400, tracking: -40 };
  const didone = (fontWeight: number) => ({ fontFamily: "Playfair Display", fontWeight });
  const serif = (fontWeight: number) => ({ fontFamily: "Libre Baskerville", fontWeight });
  const franklin = (fontWeight: number) => ({ fontFamily: "Libre Franklin", fontWeight });
  const text = (slot: Partial<TextSlot>) => defaultTextSlot(slot);
  const slots = [
    text({ text: "Issue", ...grotesk, shape: bare, colorIndex: INK, scale: 4.69, tracking: -82 }),
    text({ text: "The", ...didone(900), shape: bare, colorIndex: INK, scale: 2, tracking: -60 }),
    presetIcon("Stars", 2, RED, { scale: 0.6 }),
    photo("new-york", "grand-central.jpg", "Grand Central", 115, 0),
    text({ text: "Culture", ...grotesk, shape: bare, colorIndex: RED, scale: 2.4 }),
    photo("new-york", "parade.jpg", "Parade", 110, 24, 1.26),
    text({ text: "&", ...didone(900), shape: bare, colorIndex: BLUE, scale: 4.31 }),
    text({ text: "Section A", ...franklin(800), ...box, colorIndex: INK, textColorIndex: PAPER, scale: 0.95 }),
    presetIcon("Arches", 1, INK, { scale: 0.8 }),
    text({ text: "Weekend", ...franklin(900), shape: bare, colorIndex: INK, scale: 1.8, tracking: -80 }),
    text({ text: "Letters", ...serif(700), ...box, colorIndex: RED, textColorIndex: PINK, scale: 1.1 }),
    text({ text: "Style", ...didone(400), shape: bare, colorIndex: BLUE, scale: 2.1, tracking: -40 }),
    presetIcon("Spheres", 3, BLUE, { scale: 0.35 }),
    text({ text: "Essay", fontFamily: "DM Serif Display", fontWeight: 400, shape: bare, colorIndex: INK, scale: 1.6 }),
    text({ text: "No. 7", ...didone(700), ...box, stroked: true, stroke: 2, colorIndex: BLUE, scale: 1 }),
    text({ text: "1965", ...grotesk, shape: bare, colorIndex: INK, scale: 5.13 }),
    text({ text: "Special Report", ...franklin(800), ...box, colorIndex: BLUE, textColorIndex: PINK, scale: 0.9 }),
    presetIcon("Steps", 1, RED, { scale: 0.8 }),
    text({ text: "“", ...didone(900), shape: bare, colorIndex: RED, scale: 3 }),
    text({ text: "Reimagined", fontFamily: "DM Serif Display", fontWeight: 400, shape: bare, colorIndex: BLUE, scale: 1.3 }),
    photo("new-york", "white-horse.jpg", "White Horse Tavern", 110, 10),
    text({ text: "Final Edition", ...franklin(700), shape: "pill", colorIndex: INK, textColorIndex: PAPER, scale: 0.85 }),
    text({ text: "Vol. XXVI", ...serif(400), shape: bare, colorIndex: BLUE, scale: 1.1 }),
    presetIcon("Rings", 2, BLUE, { scale: 0.55 }),
    text({ text: "Page 12", ...franklin(600), shape: "pill", stroked: true, stroke: 2, colorIndex: RED, scale: 0.4 }),
    text({ text: "$4.95", ...franklin(700), shape: "pill", colorIndex: PINK, scale: 0.85 }),
    text({ text: "Est. 1924", ...serif(400), shape: bare, colorIndex: RED, scale: 0.45 }),
    text({ text: "Continued on A14", ...franklin(500), shape: "pill", stroked: true, stroke: 1, colorIndex: BLUE, scale: 0.35 }),
  ].filter((slot): slot is Slot => slot != null);
  return {
    ...demoState(),
    stageColor: "#efece5",
    background: {
      ...defaultBackground(),
      grid: true,
      gridDensity: "base",
      gridColor: "#1c2bc9",
      gridOpacity: 20,
    },
    pillPad: 22,
    textTracking: 0,
    shapeAmount: 12,
    theme: ["#111111", "#efece5", "#f0462a", "#1c2bc9", "#f7c6d2"],
    post: { bloom: 0, bloomOpacity: 100, grain: 14, vignette: 0, saturate: 100, hue: 0, blend: "normal" },
    physics: { ...DEFAULT_PHYSICS },
    template: "new-york",
    slots,
  };
}

/** Neon night: cyan and hot pink on indigo, sunset yellow, orange contrast, chrome gradients, synth grid. */
export function miamiState(): AppState {
  const PINK = 0;
  const CYAN = 1;
  const SUN = 2;
  const VIOLET = 3;
  const ORANGE = 4;
  const bare = "none" as const;
  const chrome = { gradient: true, gradientColorIndex: VIOLET, gradientAngle: 180, animatedGradient: true, gradientSpeed: 30 };
  const text = (slot: Partial<TextSlot>) => defaultTextSlot(slot);
  const slots = [
    text({ text: "Miami", fontFamily: "Syne", fontWeight: 800, shape: bare, colorIndex: PINK, scale: 2.8, tracking: -100 }),
    emoji("🌴", "Palm", 3, 0.8),
    text({ text: "305", fontFamily: "Bebas Neue", fontWeight: 400, shape: bare, colorIndex: CYAN, scale: 3.6, tracking: -100 }),
    text({ text: "Paradise", fontFamily: "Outfit", fontWeight: 800, textHeight: 54, shape: "pill", colorIndex: PINK, ...chrome, textColor: "#ffffff", scale: 1.6, tracking: -100 }),
    presetIcon("Spheres", 1, SUN, { scale: 1.2, gradient: true, gradientColorIndex: ORANGE, gradientAngle: 180 }),
    photo("miami", "coast-guard.jpg", "Coast Guard", 115, 0, 1.1),
    text({ text: "Nights", fontFamily: "Fraunces", fontWeight: 800, shape: bare, colorIndex: CYAN, scale: 2.2, tracking: -73 }),
    text({ text: "South Beach", fontFamily: "Bebas Neue", fontWeight: 400, textHeight: 38, shape: "box", radius: 3, colorIndex: CYAN, textColorIndex: PINK, scale: 1.35, pillPad: 24, tracking: -47 }),
    presetIcon("Waves", 2, CYAN, { scale: 0.7 }),
    text({ text: "Sunset", fontFamily: "Anton", fontWeight: 400, shape: bare, colorIndex: ORANGE, scale: 2.4, tracking: -73 }),
    photo("miami", "neron.jpg", "Neron Hotel", 115, 28, 1.27),
    text({ text: "Pool Party", fontFamily: "Syne", fontWeight: 800, shape: "pill", colorIndex: SUN, scale: 1, textAnim: true }),
    presetIcon("Stars", 3, PINK, { scale: 0.4 }),
    text({ text: "1985", fontFamily: "Bebas Neue", fontWeight: 400, shape: bare, colorIndex: SUN, scale: 3.6, tracking: -100 }),
    text({ text: "Ocean Drive", fontFamily: "Outfit", fontWeight: 200, shape: bare, colorIndex: CYAN, scale: 1.4, tracking: 100 }),
    text({ text: "Every Friday", fontFamily: "Space Grotesk", fontWeight: 700, shape: "pill", stroked: true, stroke: 2, colorIndex: CYAN, scale: 0.4 }),
    emoji("🦩", "Flamingo", 1, 0.8),
    text({ text: "8PM–2AM", fontFamily: "Space Grotesk", fontWeight: 700, shape: "pill", colorIndex: PINK, textColor: "#ffffff", scale: 0.9 }),
    text({ text: "C90", fontFamily: "Outfit", fontWeight: 200, shape: bare, colorIndex: PINK, scale: 1.6 }),
    text({ text: "Hotel", fontFamily: "Fraunces", fontWeight: 800, shape: "box", radius: 0, colorIndex: CYAN, scale: 1.1, tracking: -63 }),
    presetIcon("Arches", 1, VIOLET, { scale: 0.8 }),
    text({ text: "Side A", fontFamily: "Space Mono", fontWeight: 700, shape: "box", radius: 0, stroked: true, stroke: 2, colorIndex: PINK, scale: 0.4 }),
    photo("miami", "metrorail.jpg", "Metrorail", 110, 14),
    text({ text: "Open Late", fontFamily: "Bricolage Grotesque", fontWeight: 800, shape: "pill", colorIndex: ORANGE, textColor: "#ffffff", scale: 0.9, textAnim: true }),
    text({ text: "Tropical", fontFamily: "Fraunces", fontWeight: 700, shape: bare, colorIndex: ORANGE, scale: 1.4 }),
    text({ text: "Wish You Were Here", fontFamily: "Outfit", fontWeight: 600, shape: "pill", stroked: true, stroke: 2, colorIndex: SUN, scale: 0.35, tracking: -76 }),
  ].filter((slot): slot is Slot => slot != null);
  return {
    ...demoState(),
    stageColor: "#120d2b",
    background: {
      ...defaultBackground(),
      kind: "gradient",
      shape: "radial",
      stops: [
        { id: uid(), color: "#3d1670", at: 0 },
        { id: uid(), color: "#120d2b", at: 100 },
      ],
      grid: true,
      gridColor: "#ff3ea5",
      gridOpacity: 16,
    },
    theme: ["#ff3ea5", "#1fe3e3", "#ffe07a", "#7b3cff", "#ff6b2c"],
    post: { bloom: 0, bloomOpacity: 80, grain: 12, vignette: 20, saturate: 115, hue: 0, blend: "normal" },
    physics: { ...DEFAULT_PHYSICS },
    template: "miami",
    slots,
  };
}

/** Brutalist club poster: neon magenta on black, acid yellow contrast, condensed and mono type, square blocks. */
export function berlinState(): AppState {
  const PINK = 0;
  const ACID = 1;
  const WHITE = 2;
  const GREEN = 3;
  const BLUE = 4;
  const bare = "none" as const;
  const box = { shape: "box" as const, radius: 0 };
  const condensed = { fontFamily: "Anton", fontWeight: 400, tracking: -70 };
  const heavy = { fontFamily: "Archivo Black", fontWeight: 400 };
  const mono = (fontWeight: number) => ({ fontFamily: "Space Mono", fontWeight });
  const swiss = (fontWeight: number) => ({ fontFamily: "Inter", fontWeight });
  const text = (slot: Partial<TextSlot>) => defaultTextSlot(slot);
  const slots = [
    text({ text: "Berlin", ...condensed, shape: bare, colorIndex: PINK, scale: 4.35 }),
    presetIcon("Boxes", 2, ACID, { scale: 0.6 }),
    emoji("🍺", "Beer", 2, 0.75),
    text({ text: "030", ...condensed, shape: bare, colorIndex: ACID, scale: 3.6 }),
    text({ text: "Nacht", ...heavy, shape: bare, colorIndex: WHITE, scale: 2.4, tracking: -100 }),
    photo("berlin", "balloon.jpg", "Hi-Flyer", 110, 28),
    presetIcon("Xs", 2, PINK, { scale: 0.5 }),
    text({ text: "Kunst", ...heavy, shape: "box", radius: 10, colorIndex: PINK, textColor: "#000000", scale: 1.6, tracking: -80 }),
    photo("berlin", "moma-queue.jpg", "MoMA Queue", 110, 0),
    text({ text: "24H", ...condensed, shape: bare, colorIndex: GREEN, scale: 3.6 }),
    text({ text: "Undisclosed Location", ...heavy, ...box, colorIndex: ACID, textColor: "#000000", scale: 0.9, tracking: -40 }),
    text({ text: "Eintritt Frei", ...mono(700), shape: "box", radius: 8, stroked: true, stroke: 2, colorIndex: WHITE, scale: 0.35 }),
    presetIcon("Rings", 1, WHITE, { scale: 0.9 }),
    text({ text: "Döner", ...heavy, shape: "box", radius: 14, colorIndex: ACID, textColor: "#000000", scale: 1.2, tracking: -80 }),
    text({ text: "No Photos", ...heavy, shape: "box", radius: 22, colorIndex: WHITE, textColorIndex: PINK, scale: 1, tracking: -60 }),
    photo("berlin", "towers.jpg", "Potsdamer Platz", 110, 12),
    text({ text: "Room 2", ...mono(700), shape: "pill", colorIndex: PINK, textColor: "#ffffff", scale: 0.8, textAnim: true }),
    text({ text: "12AM–10AM", ...heavy, shape: bare, colorIndex: PINK, scale: 1.4, tracking: -80 }),
    text({
      text: "Afterhour",
      ...heavy,
      ...box,
      colorIndex: PINK,
      gradient: true,
      gradientColorIndex: ACID,
      gradientAngle: 90,
      animatedGradient: true,
      gradientSpeed: 45,
      textColor: "#000000",
      scale: 1.5,
      tracking: -60,
    }),
    presetIcon("Chevrons", 1, ACID, { scale: 0.7 }),
    emoji("🖤", "Black Heart", 2, 0.6),
    text({ text: "Türsteher", ...swiss(700), shape: bare, colorIndex: WHITE, scale: 1.6, tracking: -100 }),
    text({ text: "B2B", ...mono(700), shape: "box", radius: 6, colorIndex: BLUE, textColor: "#ffffff", scale: 0.9 }),
    text({ text: "Line Up TBA", ...mono(400), shape: "pill", stroked: true, stroke: 2, colorIndex: GREEN, scale: 0.4 }),
    text({ text: "Ost", ...heavy, shape: bare, colorIndex: BLUE, scale: 2.6, tracking: -100 }),
    presetIcon("Boxes", 1, GREEN, { scale: 0.8 }),
    emoji("🚇", "U-Bahn", 1, 0.75),
    text({ text: "Sign Up Now", ...swiss(700), shape: "pill", stroked: true, stroke: 2, colorIndex: PINK, scale: 0.45 }),
    text({ text: "Kater", ...swiss(600), shape: bare, colorIndex: WHITE, scale: 1.1, tracking: -60 }),
    emoji("🏢", "Office Building", 1, 1),
  ].filter((slot): slot is Slot => slot != null);
  return {
    ...demoState(),
    stageColor: "#000000",
    shapeAmount: 16,
    background: {
      ...defaultBackground(),
      kind: "solid",
      shape: "radial",
      stops: [
        { id: uid(), color: "#02006c", at: 0 },
        { id: uid(), color: "#080808", at: 100 },
      ],
      grid: true,
      gridDensity: "base",
      gridColor: "#ffffff",
      gridOpacity: 20,
    },
    theme: ["#f23cf5", "#e4ff1a", "#ffffff", "#29ff5a", "#2a8cff"],
    post: { bloom: 0, bloomOpacity: 77, grain: 99, vignette: 52, saturate: 120, hue: 0, blend: "normal" },
    physics: { ...DEFAULT_PHYSICS },
    template: "berlin",
    slots,
  };
}

/** City Pop / 90s cyber signage: cyan field, vermilion + canary + navy/teal, mixed badge ink. */
export function tokyoState(): AppState {
  const ORANGE = 0; // vermilion jacket
  const NAVY = 1; // dark badge → white ink
  const CYAN = 2; // sky energy → dark ink
  const YELLOW = 3; // canary → dark ink
  const TEAL = 4; // teal accent → white ink
  const bare = "none" as const;
  const sharp = { shape: "box" as const, radius: 0 };
  const plate = { shape: "box" as const, radius: 2 };
  const soft = { shape: "box" as const, radius: 22 };
  const pill = { shape: "pill" as const };
  const gothic = (weight: number) => ({ fontFamily: "Noto Sans JP", fontWeight: weight });
  const kaku = (weight: number) => ({ fontFamily: "Zen Kaku Gothic New", fontWeight: weight });
  const display = { fontFamily: "Dela Gothic One", fontWeight: 400 };
  const latin = { fontFamily: "Bebas Neue", fontWeight: 400 };
  const grotesk = (weight: number) => ({ fontFamily: "Space Grotesk", fontWeight: weight });
  const text = (slot: Partial<TextSlot>) => defaultTextSlot(slot);
  const WHITE = "#ffffff";
  const INK = "#111111";
  const slots = [
    // Hero — English + kanji city headers
    text({ text: "TOKYO", ...latin, textHeight: 48, shape: bare, colorIndex: YELLOW, scale: 3.4, tracking: -40 }),
    text({ text: "東京", ...display, shape: bare, colorIndex: ORANGE, scale: 2.8, tracking: -40 }),
    emoji("🏮", "Chōchin", 2, 0.7),
    // Sharp kanji tiles — white-on-dark AND dark-on-light
    text({ text: "東", ...gothic(900), ...sharp, colorIndex: ORANGE, textColor: WHITE, scale: 1.5, pillPad: 36 }),
    text({ text: "京", ...gothic(900), ...sharp, colorIndex: YELLOW, textColor: INK, scale: 1.5, pillPad: 36 }),
    text({ text: "夜", ...gothic(900), ...soft, colorIndex: NAVY, textColor: WHITE, scale: 1.5, pillPad: 36 }),
    text({ text: "駅", ...kaku(900), ...plate, colorIndex: TEAL, textColor: WHITE, scale: 1.8, pillPad: 48, tracking: -20 }),
    photo("tokyo", "akihabara-1993.jpg", "Akihabara 1993", 115, 0, 1.1),
    // District names — English + Japanese
    text({ text: "SHIBUYA", ...latin, textHeight: 36, ...sharp, colorIndex: NAVY, textColor: WHITE, scale: 1.2, pillPad: 32, tracking: -20 }),
    text({ text: "渋谷", ...gothic(900), ...pill, colorIndex: CYAN, textColor: INK, scale: 1.1, pillPad: 40 }),
    text({ text: "入口", ...gothic(800), ...plate, colorIndex: ORANGE, textColor: WHITE, scale: 1.35, pillPad: 40 }),
    presetIcon("Tiles", 2, CYAN, { scale: 0.55 }),
    text({ text: "出口", ...gothic(800), ...soft, colorIndex: YELLOW, textColor: INK, scale: 1.35, pillPad: 40 }),
    photo("tokyo", "asukayama-hanami.jpg", "Asukayama Hanami", 115, 10, 1.15),
    // Train departure boards — tracks, times, platforms
    text({ text: "TRACK 2", ...grotesk(700), ...sharp, colorIndex: NAVY, textColor: WHITE, scale: 0.85, pillPad: 36, tracking: -40 }),
    text({ text: "18:42", ...latin, textHeight: 40, ...pill, colorIndex: YELLOW, textColor: INK, scale: 1.3, pillPad: 44 }),
    text({ text: "PLATFORM 3", ...grotesk(700), ...plate, colorIndex: TEAL, textColor: WHITE, scale: 0.7, pillPad: 32, tracking: -30 }),
    text({ text: "DEP 19:05", ...grotesk(700), ...pill, colorIndex: CYAN, textColor: INK, scale: 0.75, pillPad: 36 }),
    text({ text: "新宿", ...gothic(900), ...sharp, colorIndex: ORANGE, textColor: WHITE, scale: 1.0, pillPad: 36, tracking: -30 }),
    text({ text: "SHINJUKU", ...latin, textHeight: 32, ...pill, colorIndex: YELLOW, textColor: INK, scale: 0.95, pillPad: 40, tracking: -20 }),
    presetIcon("Gates", 1, ORANGE, { scale: 0.85 }),
    text({ text: "夢", ...gothic(900), ...pill, colorIndex: NAVY, textColor: WHITE, scale: 1.4, pillPad: 36, textAnim: true }),
    emoji("🚇", "Metro", 2, 0.65),
    text({ text: "開", ...kaku(700), ...sharp, stroked: true, stroke: 3, colorIndex: CYAN, textColor: INK, scale: 1.1, pillPad: 40 }),
    photo("tokyo", "shinjuku-street.jpg", "Shinjuku Street", 110, 6),
    text({ text: "AKIHABARA", ...latin, textHeight: 30, ...soft, colorIndex: TEAL, textColor: WHITE, scale: 0.9, pillPad: 36, tracking: -20 }),
    text({ text: "秋葉原", ...kaku(900), ...plate, colorIndex: YELLOW, textColor: INK, scale: 1.0, pillPad: 36 }),
    presetIcon("Boxes", 2, YELLOW, { scale: 0.5 }),
    text({ text: "北", ...kaku(900), ...sharp, colorIndex: YELLOW, textColor: INK, scale: 1.2, pillPad: 44 }),
    text({ text: "南", ...kaku(900), ...soft, colorIndex: NAVY, textColor: WHITE, scale: 1.2, pillPad: 44 }),
    text({ text: "ASAKUSA", ...latin, textHeight: 30, ...pill, colorIndex: CYAN, textColor: INK, scale: 0.85, pillPad: 36 }),
    text({ text: "浅草", ...kaku(700), ...sharp, stroked: true, stroke: 2, colorIndex: ORANGE, scale: 0.7, pillPad: 32 }),
    text({ text: "注意", ...gothic(700), ...plate, colorIndex: YELLOW, textColor: INK, scale: 0.85, pillPad: 36, tracking: -40 }),
    emoji("➡️", "Arrow", 2, 0.55),
    text({ text: "西", ...kaku(900), ...pill, colorIndex: TEAL, textColor: WHITE, scale: 1.15, pillPad: 40 }),
    text({ text: "東", ...kaku(900), ...sharp, colorIndex: ORANGE, textColor: WHITE, scale: 1.15, pillPad: 40 }),
    presetIcon("Chevrons", 1, TEAL, { scale: 0.7 }),
    text({ text: "夜", ...display, shape: bare, colorIndex: NAVY, scale: 2.2 }),
    text({ text: "LINE 山手", ...grotesk(700), ...soft, colorIndex: ORANGE, textColor: WHITE, scale: 0.65, pillPad: 34 }),
  ].filter((slot): slot is Slot => slot != null);
  return {
    ...demoState(),
    stageColor: "#3ec8ff",
    background: {
      ...defaultBackground(),
      kind: "solid",
      shape: "radial",
      stops: [
        { id: uid(), color: "#5ad4ff", at: 0 },
        { id: uid(), color: "#3ec8ff", at: 100 },
      ],
      grid: true,
      gridColor: "#0a2f4a",
      gridOpacity: 12,
    },
    theme: ["#ff451a", "#0a2f4a", "#3ec8ff", "#ffe014", "#0d7a72"],
    post: { bloom: 0, bloomOpacity: 80, grain: 12, vignette: 14, saturate: 120, hue: 0, blend: "normal" },
    physics: { ...DEFAULT_PHYSICS },
    template: "tokyo",
    slots,
  };
}
