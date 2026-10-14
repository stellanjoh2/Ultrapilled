import { describe, expect, it } from "vitest";
import { backgroundImage } from "./background";
import { berlinState, ULTRAPILLED_LOGO_ID, ultrapilledState } from "./templates";

describe("ultrapilledState logo store", () => {
  it("reuses one logo id so reloading the template does not leak data URLs", () => {
    const first = ultrapilledState();
    const second = ultrapilledState();
    expect(first.background.logoId).toBe(ULTRAPILLED_LOGO_ID);
    expect(second.background.logoId).toBe(ULTRAPILLED_LOGO_ID);
    const file = backgroundImage(ULTRAPILLED_LOGO_ID);
    expect(file?.name).toBe("ultrapilled-logo.svg");
    expect(file?.src.startsWith("data:image/svg+xml")).toBe(true);
  });
});

describe("berlinState background", () => {
  it("ships with the magenta grid on", () => {
    const background = berlinState().background;
    expect(background.grid).toBe(true);
    expect(background.gridColor).toBe("#ed20ec");
    expect(background.gridOpacity).toBe(50);
    expect(background.kind).toBe("gradient");
  });
});

describe("berlinState tweaks", () => {
  it("keeps Kunst animated and the late-night scales", () => {
    const slots = berlinState().slots;
    const kunst = slots.find((slot) => slot.kind === "text" && slot.text === "Kunst");
    expect(kunst).toMatchObject({
      kind: "text",
      radius: 40,
      pillPad: 43,
      gradient: true,
      animatedGradient: true,
      gradientSpeed: 96,
    });
    const hours = slots.find((slot) => slot.kind === "text" && slot.text === "12AM–10AM");
    expect(hours).toMatchObject({ kind: "text", scale: 1 });
    const afterhour = slots.find((slot) => slot.kind === "text" && slot.text === "Afterhour");
    expect(afterhour).toMatchObject({ kind: "text", scale: 0.6 });
    const giphy = slots.find((slot) => slot.kind === "image" && slot.remote?.kind === "giphy");
    expect(giphy).toMatchObject({ kind: "image", collider: "block" });
  });
});
