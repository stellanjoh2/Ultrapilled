import { EMOJI_FONT } from "./emojis";
import { isColorMask } from "./chipKinds";
import { rasterRing, textLookFlags } from "./chipLook";
import { measureTextInk, paintTextInk } from "./measure";
import { gradientAngleOf, gradientPeriodMs, pillGradient, pillSweepBand, pillSweepGradient, sweepBandMetrics, textGradientFill } from "./pillFill";
import {
  applyBareCanvasTextAnim,
  applyTextAnim,
  stopBareCanvasTextAnimIn,
  stopTextAnim,
  stopTextAnimIn,
} from "./textAnim";
import { inkOn } from "./theme";
import { peekTrim } from "./trim";
import { dropShadowCssColor, dropShadowDistanceOf, dropShadowRadiusOf, sanitizeTextMotion, type Slot, type TextSlot } from "./types";
import { armYouTubeLoop, clearYouTubeLoop, youtubeEmbedKey, youtubeEmbedSrc } from "./youtube";

export function paintSweepBand(
  host: HTMLElement,
  from: string,
  to: string,
  width: number,
  height: number,
  radius: number,
  angle?: number,
  scale?: number,
) {
  const { coverPx, tilePx } = sweepBandMetrics(width, height, angle, scale);
  host.style.clipPath = `inset(0 round ${Math.max(0, radius)}px)`;
  const found = host.querySelector(":scope > .chip-fill-band");
  const band = found instanceof HTMLElement ? found : document.createElement("div");
  if (band.parentElement !== host) {
    band.className = "chip-fill-band";
    host.replaceChildren(band);
  }
  band.style.width = `${coverPx}px`;
  band.style.height = `${coverPx}px`;
  band.style.setProperty("--sweep-tile", `${tilePx}px`);
  band.style.backgroundImage = pillSweepBand(from, to);
}

export function setSweepDuration(el: HTMLElement, speed?: number) {
  const next = `${gradientPeriodMs(speed) / 1000}s`;
  // Re-setting duration restarts the CSS animation — only touch it when it changes.
  if (el.style.getPropertyValue("--sweep-duration") !== next) {
    el.style.setProperty("--sweep-duration", next);
  }
}

export function paintFill(
  el: HTMLElement,
  on: boolean,
  from: string,
  to: string,
  width: number,
  height: number,
  radius: number,
  angle?: number,
  scale?: number,
  animated = false,
  speed?: number,
) {
  const existing = el.querySelector(":scope > .chip-fill");
  if (!on) {
    existing?.remove();
    return;
  }
  const fill = existing instanceof HTMLElement ? existing : document.createElement("div");
  if (fill.parentElement !== el) {
    fill.className = "chip-fill";
    fill.setAttribute("aria-hidden", "true");
    el.prepend(fill);
  }
  if (animated) {
    fill.classList.add("is-gradient-animated");
    fill.style.background = "transparent";
    fill.style.backgroundColor = "transparent";
    setSweepDuration(fill, speed);
    fill.style.setProperty("--grad-angle", String(gradientAngleOf(angle)));
    // Reuse the band node so other pills keep rolling when this chip is repainted.
    paintSweepBand(fill, from, to, width, height, radius, angle, scale);
  } else {
    if (fill.childNodes.length) fill.replaceChildren();
    fill.classList.remove("is-gradient-animated");
    fill.style.removeProperty("--sweep-duration");
    fill.style.removeProperty("--grad-angle");
    fill.style.clipPath = "";
    fill.style.background = pillGradient(from, to, angle, scale);
    fill.style.backgroundColor = "transparent";
  }
}

export function paintStroke(el: HTMLElement, ring: boolean, gradient: boolean, stroke: number, fill: string, label: HTMLElement) {
  const existing = el.querySelector(":scope > .chip-ring");
  if (!ring || !gradient) {
    existing?.remove();
    el.style.boxShadow = ring ? `inset 0 0 0 ${Math.max(1, stroke)}px ${fill}` : "none";
    return;
  }
  el.style.boxShadow = "none";
  const ringEl = existing instanceof HTMLElement ? existing : document.createElement("div");
  if (ringEl.parentElement !== el) {
    ringEl.className = "chip-ring";
    ringEl.setAttribute("aria-hidden", "true");
    el.insertBefore(ringEl, label);
  }
  ringEl.style.boxShadow = `inset 0 0 0 ${Math.max(1, stroke)}px ${fill}`;
}

/** Layout-only soft shadow — skipped in physics so tumbling piles stay cheap. */
export function paintDropShadow(el: HTMLElement, slot: Slot, enabled: boolean) {
  if (!enabled || !slot.dropShadow) {
    if (el.classList.contains("is-drop-shadow") || el.classList.contains("is-drop-shadow-box")) {
      el.classList.remove("is-drop-shadow", "is-drop-shadow-box");
      el.style.removeProperty("--drop-blur");
      el.style.removeProperty("--drop-y");
      el.style.removeProperty("--drop-color");
      const img = el.querySelector(":scope > img");
      if (img instanceof HTMLImageElement) {
        img.style.filter = slot.kind === "image" && slot.inverted ? "invert(1)" : "invert(0)";
      }
    }
    return;
  }
  const blur = dropShadowRadiusOf(slot.dropShadowRadius);
  const y = dropShadowDistanceOf(slot.dropShadowDistance);
  const color = dropShadowCssColor(slot.dropShadowColor, slot.dropShadowOpacity);
  // Alpha silhouettes need filter on look nodes; shaped pills use box-shadow so
  // selection chrome (handle / wheel) isn't filtered with the layer.
  const alpha = slot.kind === "image" || (slot.kind === "text" && slot.shape === "none");
  const boxClass = alpha ? "is-drop-shadow" : "is-drop-shadow-box";
  const otherClass = alpha ? "is-drop-shadow-box" : "is-drop-shadow";
  el.classList.remove(otherClass);
  el.classList.add(boxClass);
  el.style.setProperty("--drop-blur", `${blur}px`);
  el.style.setProperty("--drop-y", `${y}px`);
  el.style.setProperty("--drop-color", color);
  // Img invert is inline — compose drop-shadow here so it isn't overwritten.
  const img = el.querySelector(":scope > img");
  if (img instanceof HTMLImageElement) {
    const invert = slot.kind === "image" && slot.inverted ? "invert(1)" : "invert(0)";
    img.style.filter = `${invert} drop-shadow(0 ${y}px ${blur}px ${color})`;
  }
}

export function paintBareText(
  el: HTMLElement,
  slot: TextSlot,
  width: number,
  height: number,
  tracking: number,
  color: string,
  shiftEm: number,
  gradientTo = "",
  angle?: number,
  scale?: number,
) {
  const found = el.querySelector(":scope > canvas");
  const canvas = found instanceof HTMLCanvasElement ? found : document.createElement("canvas");
  stripLookChildren(el, canvas);
  mountLookChild(el, canvas);
  for (const node of el.querySelectorAll(":scope > .chip-ink-ghost")) node.remove();

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.ceil(width * dpr));
  const h = Math.max(1, Math.ceil(height * dpr));
  // Exact buffer in device pixels with identity CTM (same as bare Animate).
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.display = "block";
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const inkCss = measureTextInk(slot, tracking);
  const paintSlot = { ...slot, fontSize: slot.fontSize * dpr };
  const ink = {
    width: inkCss.width * dpr,
    height: inkCss.height * dpr,
    originX: inkCss.originX * dpr,
    baseline: inkCss.baseline * dpr,
    advance: inkCss.advance * dpr,
  };
  const fill =
    slot.gradient && gradientTo
      ? textGradientFill(
          ctx,
          w,
          h,
          color,
          gradientTo,
          angle ?? slot.gradientAngle,
          scale ?? slot.gradientScale,
        )
      : color;
  paintTextInk(ctx, paintSlot, tracking, fill, shiftEm, ink);
}

export function clearBareTextCss(el: HTMLElement) {
  el.classList.remove("is-text-gradient", "is-gradient-animated");
  el.style.removeProperty("background");
  el.style.removeProperty("background-image");
  el.style.removeProperty("background-color");
  el.style.removeProperty("background-size");
  el.style.removeProperty("background-position");
  el.style.removeProperty("background-repeat");
  el.style.removeProperty("-webkit-background-clip");
  el.style.removeProperty("background-clip");
  el.style.removeProperty("color");
  el.style.removeProperty("-webkit-text-fill-color");
  el.style.removeProperty("--sweep-duration");
  el.style.removeProperty("--grad-angle");
}

export function styleBareTextCss(
  el: HTMLElement,
  from: string,
  to: string,
  angle?: number,
  scale?: number,
  animated = false,
  speed?: number,
) {
  el.classList.add("is-text-gradient");
  if (animated) {
    el.classList.add("is-gradient-animated");
    el.style.backgroundImage = pillSweepGradient(from, to, angle, scale);
    setSweepDuration(el, speed);
    el.style.setProperty("--grad-angle", String(gradientAngleOf(angle)));
  } else {
    el.classList.remove("is-gradient-animated");
    el.style.backgroundImage = pillGradient(from, to, angle, scale);
    el.style.removeProperty("--sweep-duration");
    el.style.removeProperty("--grad-angle");
  }
  el.style.backgroundColor = "transparent";
  el.style.backgroundRepeat = "no-repeat";
  el.style.webkitBackgroundClip = "text";
  el.style.backgroundClip = "text";
  el.style.color = "transparent";
  el.style.webkitTextFillColor = "transparent";
}

/** One static gradient across a word of split glyphs (layout offsets; ignores GSAP transforms). */
function syncCharWordGradient(word: HTMLElement) {
  const chars = [...word.querySelectorAll<HTMLElement>(".char")];
  if (!chars.length) return;
  let minL = Infinity;
  let maxR = -Infinity;
  let minT = Infinity;
  let maxB = -Infinity;
  for (const char of chars) {
    const l = char.offsetLeft;
    const t = char.offsetTop;
    minL = Math.min(minL, l);
    maxR = Math.max(maxR, l + char.offsetWidth);
    minT = Math.min(minT, t);
    maxB = Math.max(maxB, t + char.offsetHeight);
  }
  const wordW = Math.max(1, maxR - minL);
  const wordH = Math.max(1, maxB - minT);
  for (const char of chars) {
    char.style.backgroundSize = `${wordW}px ${wordH}px`;
    char.style.backgroundPosition = `${-(char.offsetLeft - minL)}px ${-(char.offsetTop - minT)}px`;
  }
}

function clearBareTextAnimSeat(label: HTMLElement) {
  if (!label.classList.contains("is-bare-text-anim")) return;
  label.classList.remove("is-bare-text-anim");
  for (const prop of [
    "position",
    "left",
    "top",
    "width",
    "height",
    "overflow",
    "display",
    "line-height",
    "box-sizing",
    "margin",
    "padding",
    "z-index",
  ] as const) {
    label.style.removeProperty(prop);
  }
  for (const node of label.querySelectorAll<HTMLElement>(".text-anim-clip, .text-anim-word, .char")) {
    for (const prop of [
      "position",
      "left",
      "top",
      "right",
      "bottom",
      "inset",
      "width",
      "height",
      "overflow",
      "display",
      "line-height",
      "text-align",
      "vertical-align",
      "transform",
    ] as const) {
      node.style.removeProperty(prop);
    }
  }
}

export function paintBareTextCss(
  label: HTMLElement,
  from: string,
  to: string,
  angle?: number,
  scale?: number,
  animated = false,
  speed?: number,
) {
  const words = [...label.querySelectorAll<HTMLElement>(".text-anim-word")];
  const chars = [...label.querySelectorAll<HTMLElement>(".char")];
  if (!to) {
    clearBareTextCss(label);
    for (const word of words) clearBareTextCss(word);
    for (const char of chars) clearBareTextCss(char);
    return;
  }
  // Letter-cycle + animated gradient are mutually exclusive. With textAnim we only
  // ever paint a static gradient — share one word-sized tile across glyphs.
  if (chars.length > 0) {
    clearBareTextCss(label);
    for (const word of words) {
      clearBareTextCss(word);
      const wordChars = [...word.querySelectorAll<HTMLElement>(".char")];
      for (const char of wordChars) styleBareTextCss(char, from, to, angle, scale, false, speed);
      syncCharWordGradient(word);
    }
    return;
  }
  styleBareTextCss(label, from, to, angle, scale, animated, speed);
}

export function textLabel(el: HTMLElement, editing: boolean): HTMLElement {
  const found = el.querySelector(":scope > .chip-label, :scope > .chip-edit");
  const label = found instanceof HTMLElement ? found : document.createElement("span");
  // Swap role classes only — a full className reset drops is-text-anim /
  // is-text-gradient and leaves GSAP letter motion in a broken inline layout.
  label.classList.remove("chip-label", "chip-edit");
  label.classList.add(editing ? "chip-edit" : "chip-label");
  if (editing) {
    label.setAttribute("contenteditable", "plaintext-only");
    if (label.contentEditable !== "plaintext-only") label.contentEditable = "true";
    label.setAttribute("role", "textbox");
    label.setAttribute("aria-label", "Edit text");
    label.spellcheck = false;
  } else if (label.isContentEditable) {
    label.removeAttribute("contenteditable");
    label.removeAttribute("role");
    label.removeAttribute("aria-label");
    label.contentEditable = "inherit";
  }
  return label;
}

/** Selection chrome that must survive look repaints so color/invert can CSS-fade. */
export function isChipChrome(node: Element): boolean {
  return (
    node.classList.contains("chip-xform-handle") ||
    node.classList.contains("chip-xform-frame") ||
    node.classList.contains("chip-grad-wheel")
  );
}

export function stripLookChildren(el: HTMLElement, keep?: Element | null) {
  for (const child of [...el.children]) {
    if (child === keep || isChipChrome(child)) continue;
    if (child instanceof HTMLIFrameElement) clearYouTubeLoop(child);
    child.remove();
  }
}

export function mountLookChild(el: HTMLElement, node: HTMLElement) {
  if (node.parentElement === el) return;
  const chrome = [...el.children].find(isChipChrome);
  if (chrome) el.insertBefore(node, chrome);
  else el.append(node);
}

function mountMediaLoader(el: HTMLElement) {
  const found = el.querySelector(":scope > .chip-media-loader");
  const loader = found instanceof HTMLElement ? found : document.createElement("div");
  if (loader.parentElement !== el) {
    loader.className = "chip-media-loader";
    loader.setAttribute("aria-hidden", "true");
    loader.innerHTML = `
      <div class="chip-media-loader__inner">
        <p class="chip-media-loader__text">Loading</p>
        <span class="chip-media-loader__load"></span>
      </div>
    `;
  }
  mountLookChild(el, loader);
}

export function applyVisual(
  el: HTMLElement,
  slot: Slot,
  width: number,
  height: number,
  radius: number,
  fill: string,
  ink: string,
  tracking = 0.02,
  bloom = false,
  shiftEm = 0,
  gradientTo = "",
  editing = false,
) {
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.borderRadius = `${radius}px`;
  el.style.maskImage = "";
  el.style.webkitMaskImage = "";

  if (slot.kind === "text") {
    sanitizeTextMotion(slot);
    const { ring, bare, shapeGradient, textGradient: wantsTextGradient } = textLookFlags(slot);
    const textGradient = wantsTextGradient && Boolean(gradientTo);
    const hideText = bloom && !bare;
    const liveEdit = editing && !bloom;
    // Pill letter-cycle + animated CSS gradients need a DOM label.
    // Bare letter-cycle stays on the ink canvas (seamless with static paint).
    const bareCss =
      (Boolean(slot.textAnim) && !bare) ||
      (textGradient && (liveEdit || Boolean(slot.animatedGradient)));
    el.classList.remove("chip-image", "chip-emoji", "chip-youtube", "chip-video");
    el.classList.toggle("chip-bare", bare || ring);
    el.classList.toggle("is-editing", liveEdit);
    if (bare || ring || shapeGradient) {
      el.style.background = "transparent";
      el.style.backgroundColor = "transparent";
    } else {
      el.style.backgroundImage = "none";
      el.style.backgroundColor = fill;
    }
    el.style.color = hideText ? fill : ink;
    el.style.border = "none";
    el.style.fontFamily = `"${slot.fontFamily}", sans-serif`;
    el.style.fontWeight = String(slot.fontWeight);
    el.style.fontSize = `${slot.fontSize}px`;
    el.style.letterSpacing = `${tracking}em`;

    // Bare Animate: canvas letter poses — never swap to DOM (that caused the jump).
    if (bare && slot.textAnim && !liveEdit && !hideText) {
      stopTextAnimIn(el);
      el.querySelectorAll(":scope > .chip-label, :scope > .chip-edit").forEach((n) => n.remove());
      // Ensure the ink canvas exists without resetting a running cycle every tick.
      const found = el.querySelector(":scope > canvas");
      if (!(found instanceof HTMLCanvasElement)) {
        paintBareText(
          el,
          slot,
          width,
          height,
          tracking,
          textGradient ? fill : ink,
          shiftEm,
          textGradient ? gradientTo : "",
        );
      } else {
        // Keep chrome / drop other look nodes, but leave this canvas mounted.
        for (const child of [...el.children]) {
          if (child === found || isChipChrome(child)) continue;
          child.remove();
        }
        mountLookChild(el, found);
        // Match chip box immediately (anim frame will set the bitmap).
        found.style.width = `${width}px`;
        found.style.height = `${height}px`;
      }
      const canvas = el.querySelector(":scope > canvas");
      if (canvas instanceof HTMLCanvasElement) {
        applyBareCanvasTextAnim(
          canvas,
          el,
          slot,
          width,
          height,
          tracking,
          textGradient ? fill : ink,
          shiftEm,
          textGradient ? gradientTo : "",
          slot.gradientAngle,
          slot.gradientScale,
        );
      } else {
        el.classList.add("is-text-anim-host");
      }
      return;
    }

    if (bare && !bareCss && !liveEdit) {
      // Tear down letter-cycle BEFORE stripLookChildren — otherwise is-text-anim-host
      // stays on the chip and the context menu keeps offering "Stop Animation".
      stopTextAnimIn(el);
      stopBareCanvasTextAnimIn(el);
      el.classList.remove("is-text-anim-host");
      // Solid or static-gradient ink canvas (tight AABB).
      paintBareText(el, slot, width, height, tracking, textGradient ? fill : ink, shiftEm, textGradient ? gradientTo : "");
      return;
    }

    stopBareCanvasTextAnimIn(el);
    el.querySelector(":scope > canvas")?.remove();

    const label = textLabel(el, liveEdit);
    if (label.parentElement !== el) {
      mountLookChild(el, label);
    }
    for (const child of [...el.children]) {
      if (
        child === label ||
        child.classList.contains("chip-fill") ||
        child.classList.contains("chip-ring") ||
        isChipChrome(child)
      ) {
        continue;
      }
      child.remove();
    }

    if (bare) {
      el.querySelector(":scope > .chip-fill")?.remove();
      el.querySelector(":scope > .chip-ring")?.remove();
      el.style.boxShadow = "none";
    } else {
      paintFill(el, shapeGradient, fill, gradientTo || fill, width, height, radius, slot.gradientAngle, slot.gradientScale, Boolean(slot.animatedGradient), slot.gradientSpeed);
      paintStroke(el, ring, shapeGradient, slot.stroke, fill, label);
    }
    // While editing, the caret owns the text — don't clobber it from slot.
    if (!liveEdit) {
      const paintGrad = () => {
        if (!textGradient) return;
        paintBareTextCss(
          label,
          fill,
          gradientTo,
          slot.gradientAngle,
          slot.gradientScale,
          Boolean(slot.animatedGradient),
          slot.gradientSpeed,
        );
      };
      if (hideText) {
        stopTextAnim(label);
        clearBareTextAnimSeat(label);
        label.textContent = "";
      } else if (
        !applyTextAnim(label, slot, () => {
          if (textGradient) paintGrad();
        })
      ) {
        clearBareTextAnimSeat(label);
        label.style.lineHeight = "1";
        label.textContent = slot.text;
      } else {
        clearBareTextAnimSeat(label);
      }
      // Gradient clip hides the native caret — use solid ink while typing.
      // Also refreshes fill when the letter-cycle timeline was reused (early return).
      if (textGradient) paintGrad();
      else paintBareTextCss(label, "", "");
      if (textGradient) el.style.color = "transparent";
    } else if (label.classList.contains("is-text-anim")) {
      stopTextAnim(label);
      clearBareTextAnimSeat(label);
      label.textContent = slot.text;
    }
    if (liveEdit) {
      // Gradient clip hides the native caret — use solid ink while typing.
      paintBareTextCss(label, "", "");
      if (textGradient) el.style.color = fill;
    }
    // Caret must read on any surface: match ink on bare type; contrast the pill fill otherwise.
    if (liveEdit) {
      label.style.caretColor = bare || ring ? (textGradient ? fill : ink) : inkOn(fill);
    } else {
      label.style.removeProperty("caret-color");
    }
    label.style.transform = `translateY(${shiftEm}em)`;
    return;
  }

  el.classList.remove("is-editing");

  el.style.border = "none";
  el.style.boxShadow = "none";
  el.style.color = "";
  el.style.fontFamily = "";
  el.style.fontWeight = "";
  el.style.fontSize = "";
  el.style.letterSpacing = "";
  el.style.background = "transparent";
  el.style.backgroundColor = "transparent";

  if (slot.kind === "image" && slot.youtube) {
    el.classList.add("chip-image", "chip-youtube");
    el.classList.remove("chip-bare", "chip-emoji", "chip-video");
    el.style.webkitMaskImage = "";
    el.style.maskImage = "";
    for (const node of [...el.childNodes]) {
      if (node.nodeType === Node.TEXT_NODE) node.remove();
    }
    // Bloom pass is a tinted duplicate — don't spawn a second YouTube player.
    if (bloom) {
      stripLookChildren(el);
      el.style.backgroundColor = "#111";
      return;
    }
    const found = el.querySelector(":scope > iframe.chip-youtube__frame");
    const iframe = found instanceof HTMLIFrameElement ? found : document.createElement("iframe");
    stripLookChildren(el, iframe);
    const key = youtubeEmbedKey(slot.youtube);
    if (iframe.dataset.embedKey !== key) {
      iframe.dataset.embedKey = key;
      clearYouTubeLoop(iframe);
      iframe.src = youtubeEmbedSrc(slot.youtube);
      armYouTubeLoop(iframe, slot.youtube);
    }
    iframe.className = "chip-youtube__frame";
    iframe.title = slot.name || "YouTube clip";
    iframe.loading = "lazy";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.setAttribute("allowfullscreen", "false");
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.style.borderRadius = `${radius}px`;
    mountLookChild(el, iframe);
    if (rasterRing(slot)) {
      const foundRing = el.querySelector(":scope > .chip-ring");
      const ringEl = foundRing instanceof HTMLElement ? foundRing : document.createElement("div");
      if (ringEl.parentElement !== el) {
        ringEl.className = "chip-ring";
        ringEl.setAttribute("aria-hidden", "true");
      }
      ringEl.style.boxShadow = `inset 0 0 0 ${Math.max(1, slot.stroke ?? 4)}px ${fill}`;
      mountLookChild(el, ringEl);
    }
    return;
  }

  if (slot.kind === "image" && slot.video) {
    el.classList.add("chip-image", "chip-video");
    el.classList.remove("chip-bare", "chip-emoji", "chip-youtube");
    el.style.webkitMaskImage = "";
    el.style.maskImage = "";
    for (const node of [...el.childNodes]) {
      if (node.nodeType === Node.TEXT_NODE) node.remove();
    }
    if (bloom) {
      stripLookChildren(el);
      el.style.backgroundColor = "#111";
      return;
    }

    const loading = !slot.video.ready;
    const foundVid = el.querySelector(":scope > video.chip-video__frame");
    const video = foundVid instanceof HTMLVideoElement ? foundVid : document.createElement("video");
    stripLookChildren(el, loading ? null : video);

    if (loading) {
      el.style.backgroundColor = "#111";
      mountMediaLoader(el);
    } else {
      el.style.backgroundColor = "transparent";
      if (video.dataset.videoSrc !== slot.video.src) {
        video.dataset.videoSrc = slot.video.src;
        video.src = slot.video.src;
      }
      video.className = "chip-video__frame";
      video.muted = true;
      video.defaultMuted = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      video.disablePictureInPicture = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      video.controls = false;
      video.style.borderRadius = `${radius}px`;
      mountLookChild(el, video);
      void video.play().catch(() => {
        /* autoplay can fail until a gesture; muted usually ok */
      });
    }

    if (rasterRing(slot)) {
      const foundRing = el.querySelector(":scope > .chip-ring");
      const ringEl = foundRing instanceof HTMLElement ? foundRing : document.createElement("div");
      if (ringEl.parentElement !== el) {
        ringEl.className = "chip-ring";
        ringEl.setAttribute("aria-hidden", "true");
      }
      ringEl.style.boxShadow = `inset 0 0 0 ${Math.max(1, slot.stroke ?? 4)}px ${fill}`;
      mountLookChild(el, ringEl);
    }
    return;
  }

  if (slot.emoji) {
    el.classList.add("chip-emoji");
    el.classList.remove("chip-image", "chip-bare", "chip-youtube", "chip-video");
    el.style.webkitMaskImage = "";
    el.style.maskImage = "";
    el.style.fontFamily = EMOJI_FONT;
    el.style.fontSize = `${Math.round(slot.size)}px`;
    stripLookChildren(el);
    for (const node of [...el.childNodes]) {
      if (node.nodeType === Node.TEXT_NODE) node.remove();
    }
    const chrome = [...el.children].find(isChipChrome);
    const glyph = document.createTextNode(slot.emoji);
    if (chrome) el.insertBefore(glyph, chrome);
    else el.append(glyph);
    return;
  }

  const src = peekTrim(slot.src)?.displaySrc ?? slot.src;
  el.classList.add("chip-image");
  el.classList.remove("chip-bare", "chip-emoji", "chip-youtube", "chip-video");
  // Drop any leftover emoji text node.
  for (const node of [...el.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) node.remove();
  }

  if (!isColorMask(slot)) {
    const foundImg = el.querySelector(":scope > img");
    const img = foundImg instanceof HTMLImageElement ? foundImg : document.createElement("img");
    stripLookChildren(el, img);
    if (img.src !== src) img.src = src;
    img.alt = "";
    img.draggable = false;
    // Keep radius on the img so xform handles outside the chip stay visible.
    img.style.borderRadius = `${radius}px`;
    // Explicit invert(0) so filter can fade to/from invert(1).
    img.style.filter = slot.inverted ? "invert(1)" : "invert(0)";
    mountLookChild(el, img);
    // Raster inner stroke sits in a ring overlay so the img doesn't cover it.
    if (rasterRing(slot)) {
      const foundRing = el.querySelector(":scope > .chip-ring");
      const ringEl = foundRing instanceof HTMLElement ? foundRing : document.createElement("div");
      if (ringEl.parentElement !== el) {
        ringEl.className = "chip-ring";
        ringEl.setAttribute("aria-hidden", "true");
      }
      ringEl.style.boxShadow = `inset 0 0 0 ${Math.max(1, slot.stroke ?? 4)}px ${fill}`;
      mountLookChild(el, ringEl);
    }
    return;
  }

  const foundFace = el.querySelector(":scope > .chip-face");
  const face = foundFace instanceof HTMLElement ? foundFace : document.createElement("div");
  stripLookChildren(el, face);
  if (face.parentElement !== el) face.className = "chip-face";
  const sweep = Boolean(slot.gradient && gradientTo && slot.animatedGradient);
  if (slot.gradient && gradientTo && sweep) {
    face.classList.add("is-gradient-animated");
    face.style.background = "transparent";
    face.style.backgroundColor = "transparent";
    face.style.setProperty("--sweep-duration", `${gradientPeriodMs(slot.gradientSpeed) / 1000}s`);
    face.style.setProperty("--grad-angle", String(gradientAngleOf(slot.gradientAngle)));
    paintSweepBand(face, fill, gradientTo, width, height, radius, slot.gradientAngle, slot.gradientScale);
  } else {
    face.classList.remove("is-gradient-animated");
    face.replaceChildren();
    face.style.clipPath = "";
    face.style.removeProperty("--sweep-duration");
    face.style.removeProperty("--grad-angle");
    if (slot.gradient && gradientTo) {
      face.style.background = pillGradient(fill, gradientTo, slot.gradientAngle, slot.gradientScale);
      face.style.backgroundColor = "transparent";
    } else {
      face.style.backgroundImage = "none";
      face.style.backgroundColor = fill;
    }
  }
  const mask = `url("${src}")`;
  face.style.webkitMaskImage = mask;
  face.style.maskImage = mask;
  face.style.webkitMaskSize = "contain";
  face.style.maskSize = "contain";
  face.style.webkitMaskRepeat = "no-repeat";
  face.style.maskRepeat = "no-repeat";
  face.style.webkitMaskPosition = "center";
  face.style.maskPosition = "center";
  mountLookChild(el, face);
}
