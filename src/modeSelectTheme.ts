import { ICON_PRESETS } from "./icons";
import { DEFAULT_THEME } from "./theme";
import {
  DEFAULT_AUDIO_REACT,
  DEFAULT_PHYSICS,
  defaultImageSlot,
  defaultTextSlot,
  normalizeBackground,
  uid,
  type AppState,
  type ImageSlot,
  type Slot,
  type TextSlot,
} from "./types";

/** Special scene for the mode-select backdrop — edit this file to restyle the gate. */
export const MODE_SELECT_THEME_ID = "mode-select-preview";

function icon(name: string, colorIndex: number, extra: Partial<ImageSlot> = {}): ImageSlot | null {
  const preset = ICON_PRESETS.find((item) => item.label === name);
  if (!preset) return null;
  return defaultImageSlot({
    src: preset.src,
    name: preset.label,
    size: 72,
    amount: 1,
    colorIndex,
    ...extra,
  });
}

function text(partial: Partial<TextSlot>): TextSlot {
  return defaultTextSlot({
    fontFamily: "Inter",
    fontWeight: 700,
    fontSize: 28,
    textHeight: 50,
    shape: "pill",
    radius: 12,
    stroked: false,
    stroke: 4,
    colorIndex: 0,
    ...partial,
  });
}

/** Live physics preview behind the mode selector. Mute + loop are handled by the host. */
export function modeSelectPreviewState(): AppState {
  const slots: Slot[] = [
    icon("Spheres", 2, { scale: 0.25 })!,
    text({
      text: "Lorem",
      scale: 0.58,
      color: "#333333",
      textColor: "#333333",
      textColorIndex: 0,
    }),
    icon("Clovers", 2, { scale: 0.25 })!,
    text({
      text: "frffrfrfr",
      scale: 1,
      color: "#121133",
      textColor: "#131133",
      tracking: -261,
    }),
    icon("Stars", 4, { scale: 0.25 })!,
    text({
      text: "Lorem",
      scale: 1,
      color: "#180e3d",
      textColor: "#180e3d",
      gradient: false,
      gradientFromIndex: 0,
      gradientFrom: "#202215",
      gradientColorIndex: 1,
      textColorIndex: 0,
    }),
    icon("Spheres", 2, { scale: 0.7 })!,
    text({
      text: "Lorem",
      textHeight: 9,
      scale: 0.6,
      color: "#1c1c1c",
      textColor: "#1c1c1c",
      tracking: 500,
      textColorIndex: 0,
    }),
    text({
      text: "frffrfrfr",
      scale: 0.4,
      color: "#121133",
      textColor: "#131133",
      pillPad: 5,
    }),
    text({
      text: "hhhuhhuhu",
      textHeight: 9,
      scale: 0.6,
      colorIndex: 2,
      textColorIndex: 2,
      tracking: 500,
      pillPad: 22,
    }),
    text({
      text: "frr",
      shape: "box",
      radius: 4,
      scale: 0.65,
      color: "#1a1942",
      textColor: "#1a1942",
      pillPad: 5,
      tracking: 500,
      textColorIndex: 0,
    }),
    icon("Blossoms", 4, { scale: 0.4 })!,
    text({
      text: "Lorem",
      shape: "box",
      radius: 6,
      scale: 0.9,
      color: "#391e4a",
      textColor: "#381f4a",
      textColorIndex: 0,
    }),
    text({
      text: "Lorem",
      scale: 0.9,
      color: "#191919",
      textColor: "#191919",
    }),
    icon("Stars", 1, { scale: 0.6 })!,
  ].filter(Boolean) as Slot[];

  return {
    stageColor: "#080808",
    background: normalizeBackground({
      kind: "solid",
      shape: "radial",
      stops: [
        { id: uid(), color: "#02006c", at: 0 },
        { id: uid(), color: "#080808", at: 100 },
      ],
      imageId: "",
      logoId: "",
      logoScale: 1,
      logoOriginal: "",
      logoTint: null,
      logoColor: "",
      logoFront: false,
      logoBlend: "normal",
      grid: false,
      gridDensity: "fine",
      gridColor: "#ffffff",
      gridOpacity: 10,
    }),
    canvas: "16:9",
    masterScale: 8.3,
    sizeRandom: 100,
    pillPad: 30,
    textTracking: 37,
    shapeAmount: 6,
    theme: [...DEFAULT_THEME],
    post: { bloom: 0, bloomOpacity: 100, grain: 0, vignette: 0, saturate: 100, hue: 0, blend: "normal" },
    physics: {
      ...DEFAULT_PHYSICS,
      weight: 1,
      gravity: 0.9,
      speed: 1,
      bounce: 1.05,
      friction: 0.1,
      grip: 0.5,
      spin: 0.06,
      hold: 0.8,
      complexity: "normal",
      layoutMode: false,
    },
    audioReact: { ...DEFAULT_AUDIO_REACT, enabled: false },
    slots,
    template: MODE_SELECT_THEME_ID,
  };
}

export const MOBILE_LANDING_THEME_ID = "custom";

/** Mobile gate backdrop — same pile as Mode Select, plus a few sad faces. */
export function mobileLandingPreviewState(): AppState {
  const state = modeSelectPreviewState();
  return {
    ...state,
    template: MOBILE_LANDING_THEME_ID,
    slots: [
      ...state.slots,
      defaultImageSlot({ src: "", name: "Crying Face", emoji: "😢", size: 56, amount: 1, colorIndex: 0, scale: 0.75 }),
      defaultImageSlot({ src: "", name: "Frowning Face", emoji: "☹️", size: 56, amount: 1, colorIndex: 0, scale: 0.675 }),
      defaultImageSlot({ src: "", name: "Disappointed Face", emoji: "😞", size: 56, amount: 1, colorIndex: 0, scale: 0.825 }),
    ],
  };
}
