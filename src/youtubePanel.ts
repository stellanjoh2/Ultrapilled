import gsap from "gsap";
import { playRemove, playTransition } from "./uiSounds";
import {
  DEFAULT_YOUTUBE_LOOP_SEC,
  YOUTUBE_LOOP_MAX,
  YOUTUBE_LOOP_MIN,
  parseYouTubeUrl,
  type YouTubeClip,
} from "./youtube";

let modalRoot: HTMLElement | null = null;
let closing = false;
let onKey: ((event: KeyboardEvent) => void) | null = null;

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isYouTubeOpen(): boolean {
  return Boolean(modalRoot);
}

export function closeYouTube(): void {
  if (!modalRoot || closing) return;
  closing = true;
  const root = modalRoot;
  const scrim = root.querySelector<HTMLElement>(".unsplash-modal__scrim");
  const card = root.querySelector<HTMLElement>(".unsplash-modal__card");
  if (onKey) window.removeEventListener("keydown", onKey);
  onKey = null;
  playRemove();

  const done = () => {
    root.remove();
    modalRoot = null;
    closing = false;
  };

  if (reducedMotion() || !scrim || !card) {
    done();
    return;
  }

  const tl = gsap.timeline({ onComplete: done });
  tl.to(card, { autoAlpha: 0, y: 12, scale: 0.96, duration: 0.22, ease: "power2.in" }, 0);
  tl.to(scrim, { autoAlpha: 0, duration: 0.28, ease: "power1.in" }, 0);
}

export function openYouTubeImport(opts: { onPick: (clip: YouTubeClip) => void }): void {
  if (modalRoot || closing) return;

  const root = document.createElement("div");
  root.className = "unsplash-modal youtube-modal";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "youtube-modal-title");
  root.innerHTML = `
    <div class="unsplash-modal__scrim" data-youtube-close></div>
    <div class="unsplash-modal__card">
      <header class="unsplash-modal__head">
        <h2 class="unsplash-modal__title" id="youtube-modal-title">Add from YouTube</h2>
        <button type="button" class="unsplash-modal__x" data-youtube-close aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.3 5.7 13 11l5.3 5.3-1.4 1.4L11.6 12.4 6.3 17.7 4.9 16.3 10.2 11 4.9 5.7 6.3 4.3l5.3 5.3 5.3-5.3z"/></svg>
        </button>
      </header>
      <div class="unsplash-modal__body">
        <div class="youtube-modal__row">
          <label class="field youtube-modal__url">YouTube URL
            <input type="url" data-youtube-url placeholder="https://www.youtube.com/watch?v=…" autocomplete="off" spellcheck="false" />
          </label>
          <label class="field youtube-modal__loop">Loop (s)
            <input type="number" data-youtube-loop min="${YOUTUBE_LOOP_MIN}" max="${YOUTUBE_LOOP_MAX}" step="1" value="${DEFAULT_YOUTUBE_LOOP_SEC}" />
          </label>
        </div>
        <p class="unsplash-modal__status" data-youtube-status>Paste a link. The clip autoplays muted and loops.</p>
        <div class="youtube-modal__actions">
          <button type="button" class="pill is-on youtube-modal__add" data-youtube-add>Add clip</button>
        </div>
      </div>
      <footer class="unsplash-modal__foot">
        <p class="unsplash-modal__credit">Muted autoplay embed — no API key required.</p>
      </footer>
    </div>
  `;

  const scrim = root.querySelector<HTMLElement>(".unsplash-modal__scrim")!;
  const card = root.querySelector<HTMLElement>(".unsplash-modal__card")!;
  const urlInput = root.querySelector<HTMLInputElement>("[data-youtube-url]")!;
  const loopInput = root.querySelector<HTMLInputElement>("[data-youtube-loop]")!;
  const status = root.querySelector<HTMLElement>("[data-youtube-status]")!;

  const setStatus = (text: string) => {
    status.textContent = text;
  };

  const loopValue = () => {
    const n = Number(loopInput.value);
    return Number.isFinite(n) ? n : DEFAULT_YOUTUBE_LOOP_SEC;
  };

  const submit = () => {
    const clip = parseYouTubeUrl(urlInput.value, loopValue());
    if (!clip) {
      setStatus("That doesn’t look like a YouTube link. Try again.");
      urlInput.focus({ preventScroll: true });
      return;
    }
    closeYouTube();
    opts.onPick(clip);
  };

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("[data-youtube-close]")) closeYouTube();
    if (target.closest("[data-youtube-add]")) submit();
  });

  onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeYouTube();
    }
  };
  window.addEventListener("keydown", onKey);

  urlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  });
  loopInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  });

  document.body.append(root);
  modalRoot = root;
  playTransition(true);
  urlInput.focus({ preventScroll: true });

  gsap.set(scrim, { autoAlpha: 0 });
  gsap.set(card, { autoAlpha: 0, y: 16, scale: 0.96 });

  if (reducedMotion()) {
    gsap.set([scrim, card], { clearProps: "all", autoAlpha: 1, y: 0, scale: 1 });
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.to(scrim, { autoAlpha: 1, duration: 0.28 }, 0);
  tl.to(card, { autoAlpha: 1, y: 0, scale: 1, duration: 0.36 }, 0.04);
}
