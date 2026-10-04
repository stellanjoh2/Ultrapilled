import { describe, expect, it } from "vitest";
import { backgroundImage } from "./background";
import { ULTRAPILLED_LOGO_ID, ultrapilledState } from "./templates";

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
