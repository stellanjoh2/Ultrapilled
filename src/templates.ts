import { putBackgroundImage, sanitizeSvgMarkup } from "./background";
import { ICON_PRESETS } from "./icons";
import { modeSelectPreviewState, MODE_SELECT_THEME_ID, notFoundPreviewState, NOT_FOUND_THEME_ID } from "./modeSelectTheme";
import { DEFAULT_THEME } from "./theme";
import {
  bouncePhysicsFromUi,
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
import ultrapilledLogoRaw from "./assets/ultrapilled-logo.svg?raw";

/** Light spring — UI Bounciness 10 on the 0–100 scale. */
const TEMPLATE_BOUNCE = bouncePhysicsFromUi(10);

export type TemplateId =
  | "acid"
  | "new-york"
  | "miami"
  | "berlin"
  | "halloween"
  | "games"
  | "ultrapilled"
  | typeof MODE_SELECT_THEME_ID
  | typeof NOT_FOUND_THEME_ID;

export const TEMPLATES: { id: TemplateId; label: string; build: () => AppState; devOnly?: boolean }[] = [
  { id: "acid", label: "London", build: acidState },
  { id: "new-york", label: "New York", build: newYorkState },
  { id: "miami", label: "Miami", build: miamiState },
  { id: "berlin", label: "Berlin", build: berlinState },
  { id: "halloween", label: "Halloween", build: halloweenState },
  { id: "games", label: "Games", build: gamesState },
  { id: "ultrapilled", label: "Ultrapilled", build: ultrapilledState },
  { id: MODE_SELECT_THEME_ID, label: "Mode Select", build: modeSelectPreviewState },
  { id: NOT_FOUND_THEME_ID, label: "404", build: notFoundPreviewState, devOnly: true },
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
function photo(
  template: TemplateId,
  file: string,
  name: string,
  size: number,
  radius: number,
  scale = 1,
  extra: Partial<ImageSlot> = {},
): ImageSlot {
  return defaultImageSlot({ src: `/templates/${template}/${file}`, name, size, amount: 1, colorIndex: 0, scale, radius, ...extra });
}

function emoji(char: string, name: string, amount: number, scale: number): ImageSlot {
  return defaultImageSlot({ src: "", name, emoji: char, size: 56, amount, colorIndex: 0, scale });
}

/** Phosphor Create → Icon pick; empty src relinks from `@phosphor-icons/core` on load. */
function phosphor(
  remoteId: `${"fill" | "regular"}:${string}`,
  extra: Partial<ImageSlot> = {},
): ImageSlot {
  return defaultImageSlot({
    src: "",
    name: `phosphor-${remoteId.replace(":", "-")}.svg`,
    size: 69.44444444444444,
    amount: 1,
    colorIndex: 1,
    radius: 0,
    tint: true,
    collider: "sphere",
    remote: { kind: "phosphor", id: remoteId },
    ...extra,
  });
}

export function acidState(): AppState {
  const text = (slot: Partial<TextSlot>) => defaultTextSlot({ fontFamily: "Syne", fontWeight: 800, ...slot });
  const slots: Slot[] = [
    text({ text: "ACID", colorIndex: 1, scale: 1.5, tracking: -221, pillPad: 39 }),
    defaultImageSlot({ src: "", name: "Cool", emoji: "😎", size: 56, amount: 1, colorIndex: 1, scale: 0.7 }),
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
    photo("acid", "piccadilly.jpg", "Piccadilly", 115, 5, 1.77),
    photo("acid", "template-acid-big-ben.gif", "Big Ben", 110, 0, 2.4033368155205364, {
      colorIndex: 1,
      collider: "block",
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
    defaultImageSlot({ src: "", name: "Control Knobs", emoji: "🎛️", size: 56, amount: 1, colorIndex: 1, scale: 1 }),
    text({ text: "WAREHOUSE", colorIndex: 2, textColorIndex: 4, stroked: true, stroke: 2, pillPad: 24, scale: 0.95 }),
    defaultImageSlot({ src: "", name: "Skull", emoji: "💀", size: 56, amount: 2, colorIndex: 1, scale: 0.65 }),
    phosphor("regular:smiley"),
    defaultImageSlot({ src: "", name: "Pill", emoji: "💊", size: 56, amount: 2, colorIndex: 2, scale: 0.7 }),
    defaultImageSlot({
      src: "",
      name: "giphy-Felini_Rocks-84BHwBZB4ThDyOHbEI.gif",
      size: 89,
      amount: 1,
      colorIndex: 3,
      scale: 1.32,
      radius: 3,
      stroke: 4,
      remote: { kind: "giphy", id: "84BHwBZB4ThDyOHbEI" },
    }),
    text({
      text: "MENTAL",
      shape: "none",
      colorIndex: 4,
      scale: 1.8,
      tracking: -30,
      gradient: true,
      gradientColorIndex: 2,
      animatedGradient: true,
      gradientSpeed: 65,
    }),
    text({
      text: "1992",
      fontFamily: "Bebas Neue",
      fontWeight: 400,
      shape: "none",
      colorIndex: 1,
      scale: 5.64,
      tracking: -100,
    }),
    presetIcon("Clovers", 2, 2),
    defaultImageSlot({ src: "", name: "Musical Keyboard", emoji: "🎹", size: 72, amount: 1, colorIndex: 2, scale: 0.75 }),
    phosphor("fill:smiley", { scale: 1.1020408409924023 }),
    photo("acid", "go-ahead-london.jpg", "Go Ahead London", 110, 18),
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
    presetIcon("Stars", 1, 1, { scale: 1, gradient: false, gradientColorIndex: 0, gradientAngle: 253 }),
    text({ text: "NUTTER", colorIndex: 4, textColorIndex: 0, stroked: true, stroke: 4, scale: 0.75, pillPad: 64 }),
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
      grid: true,
      gridDensity: "base",
      gridColor: "#ffffff",
      gridOpacity: 20,
    },
    canvas: "16:9",
    masterScale: 3.6,
    sizeRandom: 100,
    pillPad: 14,
    textTracking: 37,
    shapeAmount: 14,
    theme: [...DEFAULT_THEME],
    physics: { ...DEFAULT_PHYSICS, gravity: 2.05, bounce: TEMPLATE_BOUNCE },
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
  const boldonse = { fontFamily: "Boldonse", fontWeight: 400 };
  const didone = (fontWeight: number) => ({ fontFamily: "Playfair Display", fontWeight });
  const serif = (fontWeight: number) => ({ fontFamily: "Libre Baskerville", fontWeight });
  const franklin = (fontWeight: number) => ({ fontFamily: "Libre Franklin", fontWeight });
  const text = (slot: Partial<TextSlot>) => defaultTextSlot(slot);
  const face = (char: string, name: string, colorIndex: number, scale = 1, amount = 1) =>
    defaultImageSlot({ src: "", name, emoji: char, size: 56, amount, colorIndex, scale });
  const slots = [
    text({ text: "Issue", ...boldonse, shape: bare, colorIndex: INK, scale: 4.1942332272433775, tracking: -105 }),
    text({ text: "The", ...didone(900), shape: bare, colorIndex: INK, scale: 2, tracking: -60 }),
    presetIcon("Stars", 2, RED, { scale: 0.6 }),
    text({
      text: "Schmear",
      ...boldonse,
      shape: "pill",
      colorIndex: INK,
      textColorIndex: PINK,
      scale: 1.9924023005359022,
      tracking: -88,
      pillPad: 48,
    }),
    presetIcon("Checks", 1, INK, { scale: 0.8 }),
    text({ text: "&", ...didone(900), shape: bare, colorIndex: BLUE, scale: 4.31 }),
    photo("new-york", "template-new-york-pizza-slice.gif", "Pizza", 114, 0, 1.4660714123441718, {
      colorIndex: BLUE,
      exposure: 22,
    }),
    text({
      text: "Section A",
      ...franklin(800),
      shape: "box",
      radius: 4,
      colorIndex: INK,
      textColorIndex: PAPER,
      scale: 0.95,
      tracking: -21,
      pillPad: 54,
    }),
    text({ text: "Subway", ...franklin(900), shape: bare, colorIndex: INK, scale: 2.272699390605009, tracking: -80 }),
    defaultImageSlot({
      src: "",
      name: "giphy-GIPHY-pOeaTGiDBZgYM.gif",
      size: 114,
      amount: 1,
      colorIndex: INK,
      scale: 1.9,
      radius: 40,
      stroke: 4,
      remote: { kind: "giphy", id: "pOeaTGiDBZgYM" },
    }),
    text({
      text: "Stoop",
      ...serif(700),
      shape: "box",
      radius: 4,
      colorIndex: RED,
      textColorIndex: PINK,
      scale: 1.1,
      tracking: -46,
    }),
    text({ text: "Bodega", ...didone(400), shape: bare, colorIndex: BLUE, scale: 1.6177968802026015, tracking: -85 }),
    presetIcon("Spheres", 1, BLUE, { scale: 0.35 }),
    text({ text: "Slice", fontFamily: "DM Serif Display", fontWeight: 400, shape: bare, colorIndex: RED, scale: 1.6 }),
    defaultImageSlot({
      src: "",
      name: "unsplash-Wes_Hicks-Q_CmcYcMSKo.jpg",
      size: 114,
      amount: 1,
      colorIndex: PINK,
      scale: 1.204892321806908,
      radius: 4,
      remote: { kind: "unsplash", id: "Q_CmcYcMSKo" },
    }),
    text({ text: "No. 7", ...didone(700), ...box, textHeight: 61, stroked: true, stroke: 2, colorIndex: BLUE, scale: 1 }),
    text({ text: "1996", ...boldonse, shape: bare, colorIndex: INK, scale: 4.578192262202997, tracking: -115 }),
    text({
      text: "Special Report",
      ...franklin(800),
      shape: "box",
      radius: 40,
      colorIndex: BLUE,
      textColorIndex: PINK,
      scale: 0.65,
      pillPad: 55,
    }),
    photo("new-york", "template-new-york-nyc-taxi.gif", "NYC Taxi", 114, 0, 1.5302974404738625, {
      colorIndex: PINK,
      exposure: 39,
    }),
    defaultImageSlot({
      src: "",
      name: "unsplash-Benny_Rotlevy-pnmOm0dG1Ng.jpg",
      size: 114,
      amount: 1,
      colorIndex: PINK,
      scale: 1.4886380397705188,
      radius: 3,
      remote: { kind: "unsplash", id: "pnmOm0dG1Ng" },
    }),
    presetIcon("Steps", 1, RED, { scale: 0.8 }),
    phosphor("fill:baseball", { colorIndex: BLUE, size: 75.75757575757576, scale: 0.750344203684905 }),
    text({ text: "“", ...didone(900), shape: bare, colorIndex: RED, scale: 3 }),
    face("🗞️", "Rolled-Up Newspaper", PINK),
    face("🇺🇸", "Flag United States", RED),
    text({
      text: "The Village",
      fontFamily: "DM Serif Display",
      fontWeight: 400,
      shape: "pill",
      colorIndex: BLUE,
      textColorIndex: PAPER,
      scale: 1.3,
      tracking: -71,
      pillPad: 54,
    }),
    phosphor("fill:train", { colorIndex: INK, size: 96.80134680134681, scale: 0.9359301197969678, collider: "block" }),
    text({ text: "Vol. XXVI", ...serif(400), shape: bare, colorIndex: BLUE, scale: 1.1 }),
    presetIcon("Rings", 2, BLUE, { scale: 0.55 }),
    text({ text: "Final Edition", ...franklin(700), shape: "pill", colorIndex: INK, textColorIndex: PAPER, scale: 0.85 }),
    face("🗽", "Statue Of Liberty", BLUE),
    text({ text: "Page 12", ...franklin(600), shape: "pill", stroked: true, stroke: 2, colorIndex: RED, scale: 0.4, pillPad: 50 }),
    text({ text: "$4.95", ...franklin(700), shape: "pill", colorIndex: PINK, scale: 0.85 }),
    text({ text: "Est. 1924", ...serif(400), shape: bare, colorIndex: RED, scale: 0.45 }),
    text({
      text: "Continued on A14",
      ...franklin(500),
      shape: "pill",
      stroked: true,
      stroke: 1,
      colorIndex: BLUE,
      scale: 0.35,
      pillPad: 43,
    }),
    face("🍕", "Pizza", INK),
    face("🚕", "Taxi", PAPER),
    face("🐀", "Rat", RED, 0.7452051546241213, 2),
  ].filter((slot): slot is Slot => slot != null);
  return {
    ...demoState(),
    stageColor: "#efece5",
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
      gridColor: "#1c2bc9",
      gridOpacity: 20,
    },
    masterScale: 2.9,
    sizeRandom: 100,
    pillPad: 22,
    textTracking: 0,
    shapeAmount: 21,
    theme: ["#111111", "#efece5", "#f0462a", "#1c2bc9", "#f7c6d2"],
    post: { bloom: 0, bloomOpacity: 100, grain: 14, vignette: 0, saturate: 100, hue: 0, blend: "normal" },
    physics: { ...DEFAULT_PHYSICS, bounce: TEMPLATE_BOUNCE },
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
  const text = (slot: Partial<TextSlot>) => defaultTextSlot(slot);
  const slots = [
    text({ text: "Miami", fontFamily: "Syne", fontWeight: 800, shape: bare, colorIndex: PINK, scale: 4.15, tracking: -100 }),
    emoji("🌴", "Palm", 1, 0.8),
    text({
      text: "Paradise",
      fontFamily: "Outfit",
      fontWeight: 800,
      textHeight: 54,
      shape: "pill",
      colorIndex: PINK,
      gradient: true,
      gradientColorIndex: VIOLET,
      gradientAngle: 229,
      animatedGradient: true,
      gradientSpeed: 30,
      gradientScale: 23,
      textColor: "#ffffff",
      scale: 1.2424358914741083,
      tracking: -100,
      pillPad: 37,
    }),
    presetIcon("Spheres", 1, SUN, { scale: 1.2, gradient: true, gradientColorIndex: ORANGE, gradientAngle: 180 }),
    photo("miami", "coast-guard.jpg", "Coast Guard", 115, 3, 1.44),
    text({ text: "Nights", fontFamily: "Fraunces", fontWeight: 800, shape: bare, colorIndex: CYAN, scale: 2.2, tracking: -73 }),
    text({ text: "South Beach", fontFamily: "Bebas Neue", fontWeight: 400, textHeight: 38, shape: "box", radius: 3, colorIndex: CYAN, textColorIndex: PINK, scale: 0.9, pillPad: 24, tracking: -47 }),
    phosphor("fill:martini", { colorIndex: CYAN, size: 71.42857142857143, scale: 0.514940049175949 }),
    text({ text: "Ocean Drive", fontFamily: "Outfit", fontWeight: 200, shape: bare, colorIndex: CYAN, scale: 1.55, tracking: -174 }),
    photo("miami", "template-miami-testarossa.gif", "Testarossa", 114, 0, 1.6987092828305308, { colorIndex: CYAN, collider: "sphere" }),
    text({ text: "Sunset", fontFamily: "Anton", fontWeight: 400, shape: bare, colorIndex: ORANGE, scale: 1.6325085707152776, tracking: -73 }),
    photo("miami", "neron.jpg", "Neron Hotel", 115, 28, 1.27),
    text({ text: "Pool Party", fontFamily: "Syne", fontWeight: 800, shape: "pill", colorIndex: SUN, scale: 0.6, textAnim: true, pillPad: 57 }),
    presetIcon("Stars", 1, SUN, { scale: 0.4 }),
    phosphor("fill:tree-palm", { colorIndex: CYAN, size: 71.42857142857143, scale: 1.0938284793353892 }),
    text({ text: "1985", fontFamily: "Bebas Neue", fontWeight: 400, shape: bare, colorIndex: PINK, scale: 5.7, tracking: -100 }),
    defaultImageSlot({
      src: "",
      name: "giphy-GIPHY-sdarezLLwzMkw.gif",
      size: 114,
      amount: 1,
      colorIndex: SUN,
      scale: 1.89,
      radius: 40,
      stroke: 4,
      // Downsized Giphy screen — keeps the collider landscape before relink/trim.
      ratioW: 500,
      ratioH: 210,
      remote: { kind: "giphy", id: "sdarezLLwzMkw" },
    }),
    text({ text: "Every Friday", fontFamily: "Space Grotesk", fontWeight: 700, shape: "pill", stroked: true, stroke: 2, colorIndex: CYAN, scale: 0.4, pillPad: 63 }),
    emoji("🦩", "Flamingo", 4, 0.8),
    text({ text: "8PM–2AM", fontFamily: "Space Grotesk", fontWeight: 700, shape: "pill", colorIndex: PINK, textColor: "#ffffff", scale: 0.5, tracking: -81, pillPad: 54 }),
    text({ text: "Hotel", fontFamily: "Fraunces", fontWeight: 800, shape: "box", radius: 3, colorIndex: CYAN, scale: 0.7, tracking: -63, pillPad: 26 }),
    presetIcon("Arches", 1, VIOLET, { scale: 0.8 }),
    text({ text: "Side A", fontFamily: "Space Mono", fontWeight: 700, shape: "box", radius: 6, stroked: true, stroke: 2, colorIndex: PINK, scale: 0.4, pillPad: 54 }),
    photo("miami", "metrorail.jpg", "Metrorail", 110, 14),
    text({
      text: "Open Late",
      fontFamily: "Bricolage Grotesque",
      fontWeight: 800,
      shape: "pill",
      colorIndex: ORANGE,
      color: "#000000",
      textColorIndex: PINK,
      scale: 0.5,
      textAnim: true,
      pillPad: 35,
    }),
    text({ text: "Tropical", fontFamily: "Fraunces", fontWeight: 700, shape: bare, colorIndex: CYAN, scale: 1.4 }),
    text({ text: "Wish You Were Here", fontFamily: "Outfit", fontWeight: 600, shape: "pill", stroked: true, stroke: 2, colorIndex: SUN, scale: 0.35, tracking: -76 }),
  ].filter((slot): slot is Slot => slot != null);
  return {
    ...demoState(),
    stageColor: "#120d2b",
    shapeAmount: 15,
    background: {
      ...defaultBackground(),
      kind: "gradient",
      shape: "radial",
      stops: [
        { id: uid(), color: "#500076", at: 0 },
        { id: uid(), color: "#000031", at: 100 },
      ],
      grid: true,
      gridDensity: "base",
      gridColor: "#00e8da",
      gridOpacity: 16,
    },
    theme: ["#ff3ea5", "#1fe3e3", "#ffe07a", "#7b3cff", "#ff6b2c"],
    post: { bloom: 0, bloomOpacity: 80, grain: 12, vignette: 20, saturate: 115, hue: 0, blend: "normal" },
    physics: { ...DEFAULT_PHYSICS, bounce: TEMPLATE_BOUNCE },
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
  const condensed = { fontFamily: "Anton", fontWeight: 400, tracking: -70 };
  const heavy = { fontFamily: "Archivo Black", fontWeight: 400 };
  const pixel = { fontFamily: "Geist Pixel", fontWeight: 400 as const };
  const swiss = (fontWeight: number) => ({ fontFamily: "Inter", fontWeight });
  const text = (slot: Partial<TextSlot>) => defaultTextSlot(slot);
  const slots = [
    text({ text: "Berlin", ...condensed, shape: bare, colorIndex: PINK, scale: 6.56, textAnim: true }),
    presetIcon("Chevrons", 1, GREEN, { scale: 1.6 }),
    emoji("🍺", "Beer", 2, 0.75),
    text({ text: "030", ...condensed, shape: bare, colorIndex: ACID, scale: 3.6, tracking: -46 }),
    text({ text: "SCHRANZ", ...heavy, shape: bare, colorIndex: WHITE, scale: 2.75, tracking: -256 }),
    photo("berlin", "template-berlin-balloon.jpg", "Hi-Flyer", 110, 28),
    presetIcon("Xs", 2, BLUE, { scale: 0.5 }),
    text({
      text: "Kunst",
      ...heavy,
      shape: "box",
      radius: 40,
      colorIndex: PINK,
      textColor: "#000000",
      scale: 1.6,
      tracking: -80,
      pillPad: 43,
      gradient: true,
      gradientColorIndex: GREEN,
      animatedGradient: true,
      gradientSpeed: 96,
    }),
    photo("berlin", "template-berlin-moma-queue.jpg", "MoMA Queue", 110, 0),
    text({ text: "24H", ...pixel, shape: bare, colorIndex: GREEN, scale: 4.688479933455517, tracking: -217 }),
    phosphor("fill:headphones", {
      colorIndex: ACID,
      size: 71.42857142857143,
      scale: 0.7576293831200989,
      collider: "block",
    }),
    text({
      text: "Undisclosed Location",
      ...pixel,
      shape: "box",
      radius: 4,
      colorIndex: ACID,
      textColor: "#000000",
      textColorIndex: PINK,
      scale: 0.55,
      tracking: 30,
      pillPad: 68,
    }),
    text({ text: "Eintritt Frei", ...pixel, shape: "box", radius: 8, stroked: true, stroke: 4, colorIndex: WHITE, scale: 0.35, pillPad: 57 }),
    presetIcon("Xs", 1, PINK, { scale: 0.9 }),
    text({ text: "Döner", ...heavy, shape: "box", radius: 40, colorIndex: ACID, textColor: "#000000", scale: 0.85, tracking: -127, pillPad: 37 }),
    text({
      text: "SPÄTI",
      ...heavy,
      shape: "box",
      radius: 40,
      colorIndex: GREEN,
      textColorIndex: BLUE,
      textColor: "#000000",
      scale: 0.6,
      tracking: -138,
      pillPad: 51,
    }),
    photo("berlin", "template-berlin-towers.jpg", "Potsdamer Platz", 110, 12),
    text({
      text: "Kartenzahlung möglich?",
      ...pixel,
      shape: "pill",
      colorIndex: GREEN,
      color: "#282828",
      textColorIndex: GREEN,
      scale: 0.4,
      textAnim: true,
      pillPad: 77,
      tracking: -20,
    }),
    photo("berlin", "template-berlin-skull.gif", "Skull", 104, 0, 1.0643852467628665, {
      colorIndex: ACID,
      collider: "block",
      exposure: 22,
    }),
    defaultImageSlot({
      src: "",
      name: "giphy-Timmy._ID-3A1rfKbBovWtaNzxNu.gif",
      size: 114,
      amount: 1,
      colorIndex: ACID,
      scale: 1,
      radius: 2,
      stroke: 4,
      remote: { kind: "giphy", id: "3A1rfKbBovWtaNzxNu" },
      collider: "block",
    }),
    text({ text: "12AM–10AM", ...pixel, shape: bare, colorIndex: PINK, scale: 1, tracking: -80 }),
    text({
      text: "Afterhour",
      ...heavy,
      shape: "box",
      radius: 4,
      colorIndex: PINK,
      gradient: true,
      gradientColorIndex: ACID,
      gradientAngle: 166,
      animatedGradient: true,
      gradientSpeed: 45,
      gradientScale: 25,
      textColor: "#000000",
      scale: 0.6,
      tracking: -60,
      pillPad: 48,
    }),
    presetIcon("Chevrons", 1, ACID, { scale: 0.7 }),
    emoji("🖤", "Black Heart", 2, 0.6),
    text({ text: "Türsteher", ...swiss(700), shape: bare, colorIndex: WHITE, scale: 1.6, tracking: -181 }),
    phosphor("regular:bicycle", {
      colorIndex: GREEN,
      size: 73.14285714285714,
      scale: 1.1833021791524172,
      collider: "block",
    }),
    text({ text: "B2B", ...pixel, shape: "box", radius: 6, colorIndex: BLUE, textColor: "#ffffff", scale: 0.9 }),
    text({ text: "Line Up TBA", ...pixel, shape: "pill", stroked: true, stroke: 2, colorIndex: GREEN, scale: 0.4, pillPad: 65 }),
    text({ text: "Ost", ...heavy, shape: bare, colorIndex: BLUE, scale: 2.6, tracking: -172 }),
    presetIcon("Boxes", 1, GREEN, { scale: 0.8 }),
    emoji("🚇", "U-Bahn", 1, 0.75),
    text({ text: "Sign Up Now", ...swiss(700), shape: "pill", stroked: true, stroke: 2, colorIndex: PINK, scale: 0.3, pillPad: 55 }),
    text({ text: "Kater", ...swiss(600), shape: bare, colorIndex: WHITE, scale: 1.1, tracking: -212 }),
    emoji("🏢", "Office Building", 1, 1),
  ].filter((slot): slot is Slot => slot != null);
  return {
    ...demoState(),
    stageColor: "#000000",
    shapeAmount: 19,
    background: {
      ...defaultBackground(),
      kind: "gradient",
      shape: "radial",
      stops: [
        { id: uid(), color: "#2e0044", at: 0 },
        { id: uid(), color: "#080808", at: 100 },
      ],
      grid: true,
      gridDensity: "base",
      gridColor: "#ed20ec",
      gridOpacity: 50,
    },
    theme: ["#f23cf5", "#e4ff1a", "#ffffff", "#29ff5a", "#2a8cff"],
    post: { bloom: 0, bloomOpacity: 77, grain: 99, vignette: 52, saturate: 120, hue: 0, blend: "normal" },
    physics: { ...DEFAULT_PHYSICS, bounce: TEMPLATE_BOUNCE },
    template: "berlin",
    slots,
  };
}

/** Spooky night: pumpkin orange, witch purple, slime green on black — horror type, candy emoji, jack-o’-lanterns. */
export function halloweenState(): AppState {
  const ORANGE = 0;
  const PURPLE = 1;
  const SLIME = 2;
  const BLACK = 3;
  const CANDY = 4;
  const bare = "none" as const;
  const creep = { fontFamily: "Creepster", fontWeight: 400 as const };
  const quest = { fontFamily: "Mystery Quest", fontWeight: 400 as const };
  const consent = { fontFamily: "Manufacturing Consent", fontWeight: 400 as const };
  const jolly = { fontFamily: "Jolly Lodger", fontWeight: 400 as const };
  const text = (slot: Partial<TextSlot>) => defaultTextSlot(slot);
  const slots = [
    // Short horror words stay large; long lines stay under ~stage width so they
    // don't fall as one huge horizontal slab (Creepster/Mystery Quest run wide).
    text({ text: "Trick or treat!", ...creep, shape: bare, colorIndex: SLIME, scale: 2.6, tracking: -20 }),
    emoji("🎃", "Pumpkin", 1, 0.95),
    photo("halloween", "hi-fi-spider.gif", "Hi-fi spider", 138, 0, 1.73, { colorIndex: SLIME, exposure: 45 }),
    text({
      text: "Happy Halloween!",
      ...quest,
      shape: "pill",
      colorIndex: BLACK,
      textColorIndex: ORANGE,
      scale: 1.35,
      pillPad: 62,
      textAnim: true,
    }),
    presetIcon("Moons", 2, SLIME, { scale: 0.7 }),
    text({ text: "Spooky", ...creep, shape: bare, colorIndex: PURPLE, scale: 2.8 }),
    emoji("👻", "Ghost", 1, 0.85),
    text({
      text: "Witch",
      ...quest,
      shape: "box",
      radius: 40,
      colorIndex: BLACK,
      textColorIndex: SLIME,
      scale: 1.05,
      tracking: -20,
      pillPad: 42,
    }),
    presetIcon("Stars", 3, ORANGE, { scale: 0.4 }),
    text({ text: "Something wicked this way comes.", ...quest, shape: bare, colorIndex: SLIME, scale: 0.85 }),
    emoji("🦇", "Bat", 2, 0.7),
    text({ text: "BOO!", ...creep, shape: bare, colorIndex: ORANGE, scale: 8.04, tracking: -40, textAnim: true }),
    text({ text: "Haunted", ...creep, shape: bare, colorIndex: PURPLE, scale: 2.4, tracking: -30 }),
    text({ text: "Beware of the witch’s curse!", ...jolly, shape: "pill", colorIndex: PURPLE, textColor: "#ffffff", scale: 0.55, pillPad: 40 }),
    presetIcon("Spots", 1, PURPLE, { scale: 0.55 }),
    text({
      text: "Death",
      ...quest,
      shape: "pill",
      colorIndex: BLACK,
      textColorIndex: BLACK,
      textColor: "#ffffff",
      scale: 1.2,
      pillPad: 48,
    }),
    emoji("💀", "Skeleton", 1, 0.75),
    text({ text: "Don’t go into the basement alone.", ...jolly, shape: "pill", stroked: true, stroke: 2, colorIndex: ORANGE, scale: 0.4, pillPad: 72 }),
    phosphor("fill:knife", { colorIndex: PURPLE, size: 86.20689655172414, scale: 1 }),
    photo("halloween", "friday-the-13th.jpg", "Friday the 13th", 115, 8, 1.05),
    emoji("🕷️", "Spider", 2, 0.65),
    text({ text: "Graveyard", ...creep, shape: bare, colorIndex: SLIME, scale: 1.9 }),
    photo("halloween", "pumpkin-low-poly.gif", "Low-poly pumpkin", 138, 0, 1, {
      colorIndex: PURPLE,
      collider: "block",
      exposure: 25,
    }),
    defaultImageSlot({
      src: "",
      name: "giphy-GIPHY-SpZQKqB6SsBig.gif",
      size: 138,
      amount: 1,
      colorIndex: SLIME,
      scale: 1,
      radius: 6,
      stroke: 4,
      remote: { kind: "giphy", id: "SpZQKqB6SsBig" },
    }),
    text({
      text: "The pumpkin grinned in the moonlight.",
      ...quest,
      shape: "box",
      radius: 40,
      colorIndex: BLACK,
      textColorIndex: CANDY,
      scale: 0.4,
      pillPad: 71,
    }),
    emoji("🍬", "Candy", 2, 0.6),
    phosphor("fill:skull", { colorIndex: SLIME, size: 89.45998698763825, scale: 1, color: "#ffffff" }),
    text({ text: "Vampires", ...consent, shape: bare, colorIndex: ORANGE, color: "#ffffff", scale: 1.8, tracking: -80 }),
    photo("halloween", "carroll-borland.jpg", "Carroll Borland", 115, 12, 1.1),
    text({ text: "Sweet dreams... if you dare!", ...quest, shape: "pill", colorIndex: BLACK, textColorIndex: SLIME, scale: 0.75, pillPad: 36 }),
    emoji("🧙‍♀️", "Witch", 1, 0.9),
    text({ text: "Zombie", ...creep, shape: bare, colorIndex: SLIME, scale: 2.54 }),
    presetIcon("Blooms", 1, ORANGE, { scale: 0.65 }),
    text({
      text: "Who’s that knocking at my door?",
      ...jolly,
      shape: "pill",
      stroked: true,
      stroke: 2,
      colorIndex: SLIME,
      scale: 0.38,
      pillPad: 74,
    }),
    emoji("🌕", "Full moon", 1, 0.85),
    text({ text: "Cauldron", ...quest, shape: bare, colorIndex: CANDY, scale: 1.4 }),
    text({
      text: "Stir the cauldron three times.",
      ...consent,
      shape: "box",
      radius: 40,
      colorIndex: SLIME,
      textColorIndex: BLACK,
      textColor: "#ffffff",
      scale: 0.3,
      tracking: -68,
      gradient: true,
      gradientColorIndex: BLACK,
      gradientAngle: 120,
      animatedGradient: true,
      gradientSpeed: 40,
      pillPad: 42,
    }),
    emoji("🍭", "Lollipop", 1, 0.7),
    text({ text: "Cobweb", ...creep, shape: bare, colorIndex: ORANGE, scale: 1.6 }),
  ].filter((slot): slot is Slot => slot != null);
  return {
    ...demoState(),
    stageColor: "#0a0614",
    background: {
      ...defaultBackground(),
      kind: "gradient",
      shape: "radial",
      stops: [
        { id: uid(), color: "#3b1466", at: 0 },
        { id: uid(), color: "#0a0614", at: 100 },
      ],
      grid: false,
      gridColor: "#c8ff3a",
      gridOpacity: 12,
    },
    theme: ["#ff6a12", "#7b2cff", "#c8ff3a", "#0a0614", "#ffd84a"],
    post: { bloom: 0, bloomOpacity: 70, grain: 22, vignette: 36, saturate: 118, hue: 0, blend: "normal" },
    physics: { ...DEFAULT_PHYSICS, bounce: TEMPLATE_BOUNCE },
    masterScale: 2.9,
    sizeRandom: 100,
    shapeAmount: 26,
    pillPad: 24,
    textTracking: 0,
    template: "halloween",
    slots,
  };
}

/**
 * Arcade night on PSX primaries (color-picked from the classic logo):
 * white / yellow #f0c000 / red #dc0028 / teal #00a898 / blue #3068b0.
 * Type mix (~6): Geist Pixel + Pixelify Sans, Anton + Archivo Black (fighting/arcade),
 * DM Serif Display + Playfair Display (cinematic / magazine drama).
 */
export function gamesState(): AppState {
  const WHITE = 0;
  const YELLOW = 1;
  const RED = 2;
  const TEAL = 3;
  const BLUE = 4;
  const bare = "none" as const;
  const geist = { fontFamily: "Geist Pixel", fontWeight: 400 as const };
  const pixelify = { fontFamily: "Pixelify Sans", fontWeight: 700 as const };
  const fight = { fontFamily: "Anton", fontWeight: 400 as const };
  const arcade = { fontFamily: "Archivo Black", fontWeight: 400 as const };
  const serif = { fontFamily: "DM Serif Display", fontWeight: 400 as const };
  const display = { fontFamily: "Playfair Display", fontWeight: 700 as const };
  const text = (slot: Partial<TextSlot>) => defaultTextSlot(slot);
  const slots = [
    defaultImageSlot({
      src: "",
      name: "giphy-GIPHY-IXUgy25IUYDgA.gif",
      size: 98,
      amount: 1,
      colorIndex: TEAL,
      scale: 1,
      radius: 9,
      stroke: 4,
      remote: { kind: "giphy", id: "IXUgy25IUYDgA" },
      ratioW: 245,
      ratioH: 245,
    }),
    text({
      text: "FINISH HIM",
      ...serif,
      shape: bare,
      colorIndex: RED,
      scale: 4.25,
      tracking: -40,
      textAnim: true,
    }),
    photo("games", "template-games-gameboy.gif", "Game Boy", 114.28571428571429, 0, 3.1452632443694912, {
      colorIndex: WHITE,
      temperature: 4050,
    }),
    text({ text: "SEGA!", ...arcade, shape: bare, colorIndex: BLUE, scale: 3.4, tracking: -80 }),
    photo(
      "games",
      "template-games-playstation-oxford-circus.jpg",
      "PlayStation Oxford Circus",
      115,
      8,
      1.9964651744639457,
      { colorIndex: RED },
    ),
    text({
      text: "Fatality",
      ...serif,
      shape: "pill",
      colorIndex: RED,
      textColorIndex: YELLOW,
      scale: 1.35,
      pillPad: 48,
    }),
    photo(
      "games",
      "template-games-fire-flower.gif",
      "Fire Flower",
      89.42857142857143,
      0,
      0.9246958433562164,
      { colorIndex: YELLOW, amount: 2 },
    ),
    text({ text: "Toasty!", ...pixelify, shape: bare, colorIndex: TEAL, scale: 1.9 }),
    text({
      text: "GET OVER HERE",
      ...fight,
      shape: "pill",
      colorIndex: YELLOW,
      textColorIndex: RED,
      scale: 1.55,
      tracking: -30,
      pillPad: 44,
      textAnim: true,
    }),
    defaultImageSlot({
      src: "",
      name: "unsplash-Felix-PXAcac16eJQ.jpg",
      size: 114.28571428571429,
      amount: 1,
      colorIndex: BLUE,
      scale: 1.514405974946693,
      radius: 8,
      stroked: false,
      stroke: 4,
      remote: { kind: "unsplash", id: "PXAcac16eJQ" },
      contrast: 8,
    }),
    defaultImageSlot({
      src: "",
      name: "unsplash-Nik-b-bnM85Z35o.jpg",
      size: 114.28571428571429,
      amount: 1,
      colorIndex: WHITE,
      scale: 2.065753602004303,
      radius: 4,
      stroked: false,
      stroke: 4,
      remote: { kind: "unsplash", id: "b-bnM85Z35o" },
      temperature: 5800,
    }),
    defaultImageSlot({
      src: "",
      name: "YouTube",
      size: 280,
      amount: 1,
      colorIndex: YELLOW,
      scale: 1,
      radius: 12,
      stroked: false,
      stroke: 4,
      youtube: { videoId: "jZl_BM3-hLw", startSec: 3520, loopSec: 30 },
    }),
    text({ text: "Hey! Listen!", ...pixelify, shape: "pill", colorIndex: BLUE, textColor: "#ffffff", scale: 0.75, pillPad: 44 }),
    defaultImageSlot({
      src: "",
      name: "giphy-GIPHY-hDMJjUNxLhIjK.gif",
      size: 91.42857142857143,
      amount: 1,
      colorIndex: RED,
      scale: 2.75,
      radius: 11,
      stroke: 4,
      remote: { kind: "giphy", id: "hDMJjUNxLhIjK" },
      ratioW: 320,
      ratioH: 320,
    }),
    text({ text: "Falcon Punch!", ...fight, shape: bare, colorIndex: RED, scale: 1.85, tracking: -50 }),
    text({
      text: "Snake? Snake?! SNAAAKE!",
      ...display,
      shape: "pill",
      stroked: true,
      stroke: 2,
      colorIndex: TEAL,
      scale: 0.55,
      pillPad: 52,
    }),
    photo("games", "template-games-atari-fuji.gif", "Atari Fuji", 102.57142857142857, 0, 1.5489184866474863, {
      colorIndex: YELLOW,
      exposure: 100,
    }),
    text({
      text: "Wasted",
      ...pixelify,
      shape: "box",
      radius: 8,
      colorIndex: RED,
      textColorIndex: YELLOW,
      scale: 1.4,
      pillPad: 42,
    }),
    text({ text: "Flawless victory", ...fight, shape: bare, colorIndex: WHITE, scale: 1.45, tracking: -35 }),
    text({ text: "Headshot!", ...pixelify, shape: bare, colorIndex: RED, scale: 1.7 }),
    defaultImageSlot({
      src: "",
      name: "giphy-Sabato-xT9DPEVTWMiTZiM9O0.gif",
      size: 95.14285714285714,
      amount: 1,
      colorIndex: TEAL,
      scale: 1.4296206813929326,
      radius: 1,
      stroke: 4,
      remote: { kind: "giphy", id: "xT9DPEVTWMiTZiM9O0" },
      ratioW: 333,
      ratioH: 250,
    }),
    text({ text: "Godlike", ...geist, shape: bare, colorIndex: YELLOW, scale: 4.5, tracking: -40 }),
    text({ text: "pwned", ...pixelify, shape: "pill", colorIndex: WHITE, textColorIndex: RED, scale: 0.9, pillPad: 50 }),
    text({
      text: "Nuclear launch detected",
      ...serif,
      shape: "box",
      radius: 10,
      stroked: true,
      stroke: 2,
      colorIndex: RED,
      textColorIndex: RED,
      scale: 0.48,
      pillPad: 69,
      textAnim: true,
    }),
    defaultImageSlot({
      src: "",
      name: "giphy-GIPHY-u4th4weIsJfuE.gif",
      size: 181.8181818181818,
      amount: 1,
      colorIndex: BLUE,
      scale: 1,
      radius: 0,
      stroke: 4,
      remote: { kind: "giphy", id: "u4th4weIsJfuE" },
      ratioW: 500,
      ratioH: 500,
    }),
    defaultImageSlot({
      src: "",
      name: "giphy-slicedbread-PgNiaDQ1QsWvsGrCaq.gif",
      size: 190.47619047619048,
      amount: 1,
      colorIndex: WHITE,
      scale: 1.15,
      radius: 0,
      stroke: 4,
      remote: { kind: "giphy", id: "PgNiaDQ1QsWvsGrCaq" },
      ratioW: 480,
      ratioH: 360,
    }),
    text({
      text: '"[Playstation Portable] ...will elevate portable entertainment out of the handheld gaming ghetto, and Sony is the only company that can do it."\n\n- Kaz Hirai',
      ...serif,
      fontSize: 18,
      shape: bare,
      colorIndex: RED,
      scale: 0.9200918086849594,
      textField: true,
      boxW: 421.6931039531781,
      boxH: 116.60181460483633,
      boxAuto: false,
      align: "left",
      lineHeight: 50,
    }),
  ].filter((slot): slot is Slot => slot != null);
  return {
    ...demoState(),
    stageColor: "#000b41",
    background: {
      ...defaultBackground(),
      kind: "solid",
      shape: "radial",
      stops: [
        { id: uid(), color: "#0a1628", at: 0 },
        { id: uid(), color: "#080808", at: 100 },
      ],
      grid: true,
      gridDensity: "fine",
      gridColor: "#ffffff",
      gridOpacity: 12,
    },
    canvas: "16:9",
    masterScale: 1.9,
    sizeRandom: 0,
    pillPad: 30,
    textTracking: 0,
    shapeAmount: 12,
    // Color-picked from classic PSX logo: yellow, red P, teal S, blue S (+ white).
    theme: ["#ffffff", "#f0c000", "#dc0028", "#00a898", "#3068b0"],
    physics: { ...DEFAULT_PHYSICS },
    post: { bloom: 0, bloomOpacity: 100, grain: 0, vignette: 0, saturate: 100, hue: 0, blend: "normal" },
    template: "games",
    slots,
  };
}

/** Stable library id so switching to this template does not leak data URLs. */
export const ULTRAPILLED_LOGO_ID = "ultrapilled-builtin-logo";

/** Baked Ultrapilled stage mark — reused so preload and template share one data URL. */
let ultrapilledLogoBake: { dataUrl: string; width: number; height: number } | null = null;

/** Same bake path as a real logo upload: comments/scripts stripped, width/height set, data URL. */
export function ultrapilledLogoAsset(): { dataUrl: string; width: number; height: number } {
  if (ultrapilledLogoBake) return ultrapilledLogoBake;
  // XML comments cannot contain "--"; the source once had "--logotype-pill" and Chromium refused <img> load.
  const logoSvg = sanitizeSvgMarkup(ultrapilledLogoRaw);
  const viewBoxMatch = logoSvg.match(/viewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)/i);
  const width = viewBoxMatch ? Number(viewBoxMatch[1]) : 276.31;
  const height = viewBoxMatch ? Number(viewBoxMatch[2]) : 76.32;
  const logoWithSize = /\bwidth\s*=/i.test(logoSvg) && /\bheight\s*=/i.test(logoSvg)
    ? logoSvg
    : logoSvg.replace(/<svg\b/i, `<svg width="${width}" height="${height}"`);
  ultrapilledLogoBake = {
    dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoWithSize)}`,
    width,
    height,
  };
  return ultrapilledLogoBake;
}

/** Decode the stage mark early so the first Ultrapilled reveal doesn't hitch. */
export function preloadUltrapilledLogo(): Promise<void> {
  const { dataUrl } = ultrapilledLogoAsset();
  const img = new Image();
  img.decoding = "async";
  img.src = dataUrl;
  if (img.decode) return img.decode().catch(() => {});
  if (img.complete) return Promise.resolve();
  return new Promise((resolve) => {
    img.onload = () => resolve();
    img.onerror = () => resolve();
  });
}

/** Wordmark letters (public/logotype) are the drop; pills, shapes, and a lab photo fill in. */
export function ultrapilledState(): AppState {
  const logo = ultrapilledLogoAsset();
  putBackgroundImage(ULTRAPILLED_LOGO_ID, logo.dataUrl, "ultrapilled-logo.svg", logo.width, logo.height);

  const text = (slot: Partial<TextSlot>) => defaultTextSlot(slot);
  const letter = (file: string, name: string, colorIndex: number, scale: number): ImageSlot =>
    defaultImageSlot({
      src: `/logotype/${file}.svg`,
      name,
      size: 88,
      amount: 1,
      colorIndex,
      scale,
      radius: 0,
      stroked: false,
      stroke: 4,
      tint: true,
    });
  const slots = [
    letter("u", "u", 0, 1.85),
    letter("l", "l", 1, 2.05),
    text({
      text: "PHYSICS",
      fontFamily: "Syne",
      fontWeight: 800,
      fontSize: 28,
      textHeight: 50,
      shape: "pill",
      radius: 12,
      stroked: false,
      stroke: 4,
      colorIndex: 2,
      scale: 1.15,
      tracking: -40,
      textColorIndex: 0,
      pillPad: 28,
    }),
    letter("t", "t", 3, 1.7),
    letter("r", "r", 4, 1.75),
    presetIcon("Stars", 1, 1, { scale: 0.45 }),
    letter("a", "a", 0, 1.8),
    letter("p", "p", 1, 1.85),
    photo("ultrapilled", "carters-little-liver-pills.jpg", "Carter's Little Liver Pills", 115, 8),
    photo("ultrapilled", "pills-blister-pack.jpg", "Pills", 115, 8),
    letter("i", "i", 2, 1.9),
    letter("l2", "l", 0, 2.15),
    text({
      text: "ULTRA",
      fontFamily: "Anton",
      fontWeight: 400,
      fontSize: 28,
      textHeight: 50,
      shape: "none",
      radius: 12,
      stroked: false,
      colorIndex: 1,
      scale: 2.4,
      tracking: -80,
    }),
    letter("l3", "l", 3, 1.9),
    letter("e", "e", 4, 1.7),
    presetIcon("Rings", 1, 3, { scale: 0.55 }),
    presetIcon("Waves", 1, 4, { scale: 0.5 }),
    letter("d", "d", 1, 1.85),
  ].filter((slot): slot is Slot => slot != null);
  return {
    ...demoState(),
    stageColor: "#07060c",
    background: {
      ...defaultBackground(),
      kind: "solid",
      shape: "radial",
      stops: [
        { id: uid(), color: "#1a0560", at: 0 },
        { id: uid(), color: "#07060c", at: 100 },
      ],
      imageId: "",
      logoId: ULTRAPILLED_LOGO_ID,
      // Intro mark is 55vw, and the opening frame scales it by 1.5, so ~82.5% of the frame width.
      logoScale: 8 / 3,
      logoOriginal: "#ffffff",
      logoTint: null,
      logoColor: "#ffffff",
      logoFront: false,
      logoBlend: "difference",
      grid: true,
      gridDensity: "fine",
      gridColor: "#ffffff",
      gridOpacity: 20,
    },
    canvas: "16:9",
    masterScale: 3.5,
    sizeRandom: 55,
    pillPad: 22,
    textTracking: 0,
    shapeAmount: 18,
    theme: ["#ffffff", "#c4ff00", "#3b00ff", "#00e5ff", "#ff3ec8"],
    post: { bloom: 0, bloomOpacity: 80, grain: 18, vignette: 28, saturate: 110, hue: 0, blend: "difference" },
    physics: { ...DEFAULT_PHYSICS, bounce: TEMPLATE_BOUNCE },
    template: "ultrapilled",
    slots,
  };
}
