import { describe, expect, it } from "vitest";
import { paintSectionResets } from "./panel/createPanel";
import { blankState } from "./templates";
import {
  audioReactAtDefault,
  compositionAtDefault,
  DEFAULT_AUDIO_REACT,
  DEFAULT_PHYSICS,
  demoState,
  physicsAtDefault,
} from "./types";

describe("section reset dirty checks", () => {
  it("treats a blank scene's physics as already at default", () => {
    const scene = {
      physics: {
        weight: 1,
        gravity: 2,
        speed: 1,
        bounce: 0,
        friction: 0.1,
        grip: 0.5,
        spin: 0.06,
        hold: 0.8,
        complexity: "normal" as const,
        layoutMode: false,
      },
    };
    expect(physicsAtDefault(scene.physics)).toBe(true);
    expect(physicsAtDefault({ ...DEFAULT_PHYSICS, gravity: 1.5 })).toBe(false);
  });

  it("treats blank composition as dirty versus the composition reset target", () => {
    const blank = blankState();
    expect(compositionAtDefault(blank)).toBe(false);
    expect(compositionAtDefault(demoState())).toBe(true);
  });

  it("treats default audio-react as clean", () => {
    expect(audioReactAtDefault({ ...DEFAULT_AUDIO_REACT })).toBe(true);
    expect(audioReactAtDefault({ ...DEFAULT_AUDIO_REACT, enabled: true })).toBe(false);
  });

  it("hides section resets when their restore would be a no-op", () => {
    document.body.innerHTML = `
      <button type="button" class="section-reset" id="reset-physics"></button>
      <button type="button" class="section-reset" id="reset-master"></button>
      <button type="button" class="section-reset" id="reset-audio-react"></button>
    `;
    const blank = blankState();
    paintSectionResets(document, blank);
    expect(document.querySelector<HTMLButtonElement>("#reset-physics")?.hidden).toBe(true);
    expect(document.querySelector<HTMLButtonElement>("#reset-audio-react")?.hidden).toBe(true);
    expect(document.querySelector<HTMLButtonElement>("#reset-master")?.hidden).toBe(false);

    paintSectionResets(document, demoState());
    expect(document.querySelector<HTMLButtonElement>("#reset-physics")?.hidden).toBe(true);
    expect(document.querySelector<HTMLButtonElement>("#reset-master")?.hidden).toBe(true);
  });

  it("hides audio-react reset in layout mode even when settings are dirty", () => {
    document.body.innerHTML = `
      <button type="button" class="section-reset" id="reset-audio-react"></button>
    `;
    const scene = blankState();
    scene.audioReact = { ...DEFAULT_AUDIO_REACT, enabled: true };
    scene.physics.layoutMode = true;
    paintSectionResets(document, scene);
    expect(document.querySelector<HTMLButtonElement>("#reset-audio-react")?.hidden).toBe(true);

    scene.physics.layoutMode = false;
    paintSectionResets(document, scene);
    expect(document.querySelector<HTMLButtonElement>("#reset-audio-react")?.hidden).toBe(false);
  });
});
