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
    text({
      text: "Lorem",
      scale: 0.75,
      color: "#191919",
      textColor: "#191919",
    }),
    text({
      text: "frffrfrfr",
      scale: 1,
      color: "#121133",
      textColor: "#131133",
    }),
    text({
      text: "Lorem",
      scale: 1,
      color: "#202215",
      textColor: "#1f2215",
      gradient: false,
      gradientFromIndex: 0,
      gradientFrom: "#202215",
      gradientColorIndex: 1,
    }),
    icon("Stars", 1, { scale: 0.6 })!,
    text({
      text: "Lorem",
      textHeight: 9,
      scale: 0.6,
      color: "#202215",
      textColor: "#1f2215",
      tracking: 500,
    }),
    icon("Spheres", 2, { scale: 0.25 })!,
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
      scale: 0.35,
      color: "#202215",
      textColor: "#1f2215",
      tracking: 500,
    }),
    text({
      text: "frr",
      shape: "box",
      radius: 4,
      scale: 0.65,
      color: "#121133",
      textColor: "#131133",
      pillPad: 5,
      tracking: 500,
    }),
    text({
      text: "Lorem",
      shape: "box",
      radius: 0,
      scale: 0.9,
      color: "#191919",
      textColor: "#191919",
    }),
    icon("Quads", 4, { scale: 0.6 })!,
    text({
      text: "Lorem",
      scale: 0.9,
      color: "#191919",
      textColor: "#191919",
    }),
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
      grid: false,
      gridDensity: "base",
      gridColor: "#ffffff",
      gridOpacity: 20,
    }),
    canvas: "16:9",
    masterScale: 9.3,
    sizeRandom: 100,
    pillPad: 30,
    textTracking: 37,
    shapeAmount: 3,
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
