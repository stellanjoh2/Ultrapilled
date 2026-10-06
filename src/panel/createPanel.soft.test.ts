import { beforeEach, describe, expect, it } from "vitest";
import { paintAudioMic, syncCompositionControls } from "./createPanel";
import { blankState } from "../templates";

function paintPct(input: HTMLInputElement) {
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 100;
  const pct = ((Number(input.value) - min) / (max - min || 1)) * 100;
  input.style.setProperty("--pct", `${pct}%`);
}

describe("create panel soft sync", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("paintAudioMic toggles Listening without remounting", () => {
    document.body.innerHTML = `
      <button type="button" id="audio-mic" class="pill smash-btn" aria-pressed="false">
        <span class="smash-btn__text">Microphone</span>
      </button>
      <button type="button" id="reset-audio-react"></button>
    `;
    const state = blankState();
    state.audioReact.enabled = true;
    paintAudioMic(document.body, state);
    const btn = document.querySelector<HTMLButtonElement>("#audio-mic")!;
    expect(btn.classList.contains("is-on")).toBe(true);
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.querySelector(".smash-btn__text")?.textContent).toBe("Listening");
  });

  it("syncCompositionControls updates range values in place", () => {
    document.body.innerHTML = `
      <label class="field">
        <span data-range-label>Scale</span>
        <input type="range" id="masterScale" min="4" max="100" value="50" />
      </label>
      <label class="field">
        <span data-range-label>Size</span>
        <input type="range" id="sizeRandom" min="0" max="100" value="0" />
      </label>
      <label class="field">
        <span data-range-label>Pad</span>
        <input type="range" id="pillPad" min="0" max="100" value="14" />
      </label>
      <label class="field">
        <span data-range-label>Amount</span>
        <input type="range" id="shapeAmount" min="1" max="40" value="10" />
      </label>
      <button type="button" id="reset-master"></button>
    `;
    const state = blankState();
    state.masterScale = 0.8;
    state.sizeRandom = 25;
    state.pillPad = 20;
    state.shapeAmount = 12;
    syncCompositionControls(document.body, state, paintPct);
    expect(document.querySelector<HTMLInputElement>("#masterScale")!.value).toBe("8");
    expect(document.querySelector<HTMLInputElement>("#sizeRandom")!.value).toBe("25");
    expect(document.querySelector<HTMLInputElement>("#pillPad")!.value).toBe("20");
    expect(document.querySelector<HTMLInputElement>("#shapeAmount")!.value).toBe("12");
  });
});
