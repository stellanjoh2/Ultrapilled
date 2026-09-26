import { ICON_PRESETS } from "./icons";
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

export type TemplateId = "acid" | "new-york" | "miami" | "berlin";

export const TEMPLATES: { id: TemplateId; label: string; build: () => AppState }[] = [
  { id: "acid", label: "Acid", build: acidState },
  { id: "new-york", label: "New York", build: newYorkState },
  { id: "miami", label: "Miami", build: miamiState },
  { id: "berlin", label: "Berlin", build: berlinState },
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
    template: "blank",
  };
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
  const next = demoState();
  const [techno, nope, hardcore, singleAf, noWay, dnb, acid, friday, tokyo, doors, oh] = next.slots;
  next.slots = [
    techno,
    defaultImageSlot({ src: "", name: "Cool", emoji: "😎", size: 56, amount: 2, colorIndex: 1, scale: 0.7 }),
    nope,
    acid,
    presetIcon("Clovers", 3, 3),
    defaultImageSlot({ src: "", name: "Skull", emoji: "💀", size: 56, amount: 2, colorIndex: 1, scale: 0.65 }),
    hardcore,
    presetIcon("Stars", 2, 1),
    friday,
    singleAf,
    noWay,
    presetIcon("Stars", 3, 4, { gradient: true, gradientColorIndex: 0, gradientAngle: 253 }),
    defaultImageSlot({ src: "", name: "Fire", emoji: "🔥", size: 56, amount: 3, colorIndex: 2, scale: 0.7 }),
    dnb,
    tokyo,
    doors,
    oh,
  ].filter((slot): slot is Slot => slot != null);
  next.template = "acid";
  return next;
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
    text({ text: "Issue", ...grotesk, shape: bare, colorIndex: INK, scale: 2.8 }),
    text({ text: "The", ...didone(900), shape: bare, colorIndex: INK, scale: 2, tracking: -60 }),
    presetIcon("Stars", 2, RED, { scale: 0.6 }),
    photo("new-york", "grand-central.jpg", "Grand Central", 115, 0),
    text({ text: "Culture", ...grotesk, shape: bare, colorIndex: RED, scale: 2.4 }),
    text({ text: "&", ...didone(900), shape: bare, colorIndex: BLUE, scale: 3.2 }),
    text({ text: "Section A", ...franklin(800), ...box, colorIndex: INK, textColorIndex: PAPER, scale: 0.95 }),
    presetIcon("Arches", 1, INK, { scale: 0.8 }),
    text({ text: "Weekend", ...franklin(900), shape: bare, colorIndex: INK, scale: 1.8, tracking: -80 }),
    text({ text: "Letters", ...serif(700), ...box, colorIndex: RED, textColorIndex: PINK, scale: 1.1 }),
    text({ text: "Style", ...didone(400), shape: bare, colorIndex: BLUE, scale: 2.1, tracking: -40 }),
    presetIcon("Spheres", 3, BLUE, { scale: 0.35 }),
    photo("new-york", "parade.jpg", "Parade", 110, 24),
    text({ text: "Essay", fontFamily: "DM Serif Display", fontWeight: 400, shape: bare, colorIndex: INK, scale: 1.6 }),
    text({ text: "No. 7", ...didone(700), ...box, stroked: true, stroke: 2, colorIndex: BLUE, scale: 1 }),
    text({ text: "1965", ...grotesk, shape: bare, colorIndex: INK, scale: 3.6 }),
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
    background: { ...defaultBackground(), grid: false },
    pillPad: 22,
    textTracking: 0,
    theme: ["#111111", "#efece5", "#f0462a", "#1c2bc9", "#f7c6d2"],
    post: { bloom: 0, bloomOpacity: 100, grain: 14, vignette: 0, saturate: 100, hue: 0, blend: "normal" },
    physics: { ...DEFAULT_PHYSICS, gravity: 2.2, bounce: 0.02 },
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
  const WHITE = 6;
  const bare = "none" as const;
  const chrome = { gradient: true, gradientColorIndex: VIOLET, gradientAngle: 180, animatedGradient: true, gradientSpeed: 30 };
  const text = (slot: Partial<TextSlot>) => defaultTextSlot(slot);
  const slots = [
    text({ text: "Miami", fontFamily: "Syne", fontWeight: 800, shape: bare, colorIndex: PINK, scale: 2.8, tracking: -100 }),
    emoji("🌴", "Palm", 3, 0.8),
    text({ text: "305", fontFamily: "Bebas Neue", fontWeight: 400, shape: bare, colorIndex: CYAN, scale: 3.6, tracking: -100 }),
    text({ text: "Paradise", fontFamily: "Outfit", fontWeight: 800, textHeight: 54, shape: "pill", colorIndex: PINK, ...chrome, textColorIndex: WHITE, scale: 1.6, tracking: -100 }),
    presetIcon("Spheres", 1, SUN, { scale: 1.2, gradient: true, gradientColorIndex: ORANGE, gradientAngle: 180 }),
    photo("miami", "fontainebleau.jpg", "Fontainebleau", 115, 0, 1.1),
    text({ text: "Nights", fontFamily: "Fraunces", fontWeight: 800, shape: bare, colorIndex: CYAN, scale: 2.2, tracking: -73 }),
    text({ text: "South Beach", fontFamily: "Bebas Neue", fontWeight: 400, textHeight: 38, shape: "box", radius: 3, colorIndex: CYAN, textColorIndex: PINK, scale: 1.35, pillPad: 24, tracking: -47 }),
    presetIcon("Waves", 2, CYAN, { scale: 0.7 }),
    text({ text: "Sunset", fontFamily: "Anton", fontWeight: 400, shape: bare, colorIndex: ORANGE, scale: 2.4, tracking: -73 }),
    photo("miami", "neron.jpg", "Neron Hotel", 115, 28, 2),
    text({ text: "Pool Party", fontFamily: "Syne", fontWeight: 800, shape: "pill", colorIndex: SUN, scale: 1, textAnim: true }),
    presetIcon("Stars", 3, PINK, { scale: 0.4 }),
    text({ text: "1985", fontFamily: "Bebas Neue", fontWeight: 400, shape: bare, colorIndex: SUN, scale: 3.6, tracking: -100 }),
    text({ text: "Ocean Drive", fontFamily: "Outfit", fontWeight: 200, shape: bare, colorIndex: CYAN, scale: 1.4, tracking: 100 }),
    text({ text: "Every Friday", fontFamily: "Space Grotesk", fontWeight: 700, shape: "pill", stroked: true, stroke: 2, colorIndex: CYAN, scale: 0.4 }),
    emoji("🦩", "Flamingo", 1, 0.8),
    text({ text: "8PM–2AM", fontFamily: "Space Grotesk", fontWeight: 700, shape: "pill", colorIndex: PINK, textColorIndex: WHITE, scale: 0.9 }),
    text({ text: "C90", fontFamily: "Outfit", fontWeight: 200, shape: bare, colorIndex: PINK, scale: 1.6 }),
    text({ text: "Hotel", fontFamily: "Fraunces", fontWeight: 800, shape: "box", radius: 0, colorIndex: CYAN, scale: 1.1, tracking: -63 }),
    presetIcon("Arches", 1, VIOLET, { scale: 0.8 }),
    text({ text: "Side A", fontFamily: "Space Mono", fontWeight: 700, shape: "box", radius: 0, stroked: true, stroke: 2, colorIndex: PINK, scale: 0.4 }),
    photo("miami", "berkeley-shore.jpg", "Berkeley Shore", 110, 14),
    text({ text: "Open Late", fontFamily: "Bricolage Grotesque", fontWeight: 800, shape: "pill", colorIndex: ORANGE, textColorIndex: WHITE, scale: 0.9, textAnim: true }),
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
    post: { bloom: 35, bloomOpacity: 80, grain: 12, vignette: 20, saturate: 115, hue: 0, blend: "normal" },
    physics: { ...DEFAULT_PHYSICS, gravity: 1.6, bounce: 0.35 },
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
  const TEXT_BLACK = 5;
  const TEXT_WHITE = 6;
  const bare = "none" as const;
  const box = { shape: "box" as const, radius: 0 };
  const condensed = { fontFamily: "Anton", fontWeight: 400, tracking: -70 };
  const heavy = { fontFamily: "Archivo Black", fontWeight: 400 };
  const mono = (fontWeight: number) => ({ fontFamily: "Space Mono", fontWeight });
  const swiss = (fontWeight: number) => ({ fontFamily: "Inter", fontWeight });
  const text = (slot: Partial<TextSlot>) => defaultTextSlot(slot);
  const slots = [
    text({ text: "Berlin", ...condensed, shape: bare, colorIndex: PINK, scale: 3.2 }),
    presetIcon("Boxes", 2, ACID, { scale: 0.6 }),
    emoji("🍺", "Beer", 2, 0.75),
    text({ text: "030", ...condensed, shape: bare, colorIndex: ACID, scale: 3.6 }),
    text({ text: "Nacht", ...heavy, shape: bare, colorIndex: WHITE, scale: 2.4, tracking: -100 }),
    photo("berlin", "balloon.jpg", "Hi-Flyer", 110, 28),
    presetIcon("Xs", 2, PINK, { scale: 0.5 }),
    text({ text: "Kunst", ...heavy, shape: "box", radius: 10, colorIndex: PINK, textColorIndex: TEXT_BLACK, scale: 1.6, tracking: -80 }),
    photo("berlin", "moma-queue.jpg", "MoMA Queue", 110, 0),
    text({ text: "24H", ...condensed, shape: bare, colorIndex: GREEN, scale: 3.6 }),
    text({ text: "Undisclosed Location", ...heavy, ...box, colorIndex: ACID, textColorIndex: TEXT_BLACK, scale: 0.9, tracking: -40 }),
    text({ text: "Eintritt Frei", ...mono(700), shape: "box", radius: 8, stroked: true, stroke: 2, colorIndex: WHITE, scale: 0.35 }),
    presetIcon("Rings", 1, WHITE, { scale: 0.9 }),
    text({ text: "Döner", ...heavy, shape: "box", radius: 14, colorIndex: ACID, textColorIndex: TEXT_BLACK, scale: 1.2, tracking: -80 }),
    text({ text: "No Photos", ...heavy, shape: "box", radius: 22, colorIndex: WHITE, textColorIndex: PINK, scale: 1, tracking: -60 }),
    photo("berlin", "towers.jpg", "Potsdamer Platz", 110, 12),
    text({ text: "Room 2", ...mono(700), shape: "pill", colorIndex: PINK, textColorIndex: TEXT_WHITE, scale: 0.8, textAnim: true }),
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
      textColorIndex: TEXT_BLACK,
      scale: 1.5,
      tracking: -60,
    }),
    presetIcon("Chevrons", 1, ACID, { scale: 0.7 }),
    emoji("🖤", "Black Heart", 2, 0.6),
    text({ text: "Türsteher", ...swiss(700), shape: bare, colorIndex: WHITE, scale: 1.6, tracking: -100 }),
    text({ text: "B2B", ...mono(700), shape: "box", radius: 6, colorIndex: BLUE, textColorIndex: TEXT_WHITE, scale: 0.9 }),
    text({ text: "Line Up TBA", ...mono(400), shape: "pill", stroked: true, stroke: 2, colorIndex: GREEN, scale: 0.4 }),
    text({ text: "Ost", ...heavy, shape: bare, colorIndex: BLUE, scale: 2.6, tracking: -100 }),
    presetIcon("Boxes", 1, GREEN, { scale: 0.8 }),
    emoji("🚇", "U-Bahn", 1, 0.75),
    text({ text: "Sign Up Now", ...swiss(700), shape: "pill", stroked: true, stroke: 2, colorIndex: PINK, scale: 0.45 }),
    text({ text: "Kater", ...swiss(600), shape: bare, colorIndex: WHITE, scale: 1.1, tracking: -60 }),
  ].filter((slot): slot is Slot => slot != null);
  return {
    ...demoState(),
    stageColor: "#000000",
    background: { ...defaultBackground(), grid: false },
    theme: ["#f23cf5", "#e4ff1a", "#ffffff", "#29ff5a", "#2a8cff"],
    post: { bloom: 25, bloomOpacity: 80, grain: 25, vignette: 0, saturate: 120, hue: 0, blend: "normal" },
    physics: { ...DEFAULT_PHYSICS, gravity: 2.8, bounce: 0.1 },
    template: "berlin",
    slots,
  };
}
