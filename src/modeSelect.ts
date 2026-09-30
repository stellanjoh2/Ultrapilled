import gsap from "gsap";
import { playClick, playNotify } from "./uiSounds";

export type AppMode = "physics" | "layout";

const PHYSICS_SRC = "/media/Mode-Select-Physics.mp4";
const LAYOUT_SRC = "/media/Mode-Select-Static.webp";

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** First-run mode gate. Resolves with the chosen mode after the overlay exits. */
export function askModeSelect(): Promise<AppMode> {
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.className = "mode-select";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "mode-select-title");
    root.innerHTML = `
      <p class="mode-select__mark logotype" aria-hidden="true">Ultrapilled</p>
      <div class="mode-select__upper" aria-hidden="true"></div>
      <div class="mode-select__inner">
        <h1 class="mode-select__headline" id="mode-select-title">Mode Select</h1>
        <div class="mode-select__row">
          <button type="button" class="mode-select__card" data-mode="physics">
            <span class="mode-select__media">
              <span class="mode-select__stroke" aria-hidden="true"></span>
              <video
                class="mode-select__video"
                src="${PHYSICS_SRC}"
                muted
                loop
                playsinline
                preload="auto"
                aria-hidden="true"
              ></video>
            </span>
            <span class="mode-select__name">Physics</span>
            <span class="mode-select__desc">Create your design, then watch the chaos unfold.</span>
          </button>
          <button type="button" class="mode-select__card" data-mode="layout">
            <span class="mode-select__media">
              <span class="mode-select__stroke" aria-hidden="true"></span>
              <img
                class="mode-select__image"
                src="${LAYOUT_SRC}"
                alt=""
                draggable="false"
              />
            </span>
            <span class="mode-select__name">Layout</span>
            <span class="mode-select__desc">Place freely — no physics, pieces can overlap.</span>
          </button>
        </div>
      </div>
      <div class="mode-select__lower">
        <p class="mode-select__foot">
          Ultrapilled is a free physics playground for dropping text, icons, and images into motion. We don’t track you, and we don’t use anything you upload to train AI — your files stay on your device.
        </p>
      </div>
    `;

    const headline = root.querySelector<HTMLElement>(".mode-select__headline")!;
    const cards = [...root.querySelectorAll<HTMLButtonElement>(".mode-select__card")];
    const video = root.querySelector<HTMLVideoElement>(".mode-select__video");

    let settled = false;
    const finish = (mode: AppMode) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("keydown", onKey);
      playNotify();

      const done = () => {
        video?.pause();
        root.remove();
        resolve(mode);
      };

      if (reducedMotion()) {
        done();
        return;
      }

      const tl = gsap.timeline({ onComplete: done });
      tl.to([headline, ...cards], {
        autoAlpha: 0,
        y: 10,
        duration: 0.22,
        stagger: 0.04,
        ease: "power2.in",
      }, 0);
      tl.to(root, { autoAlpha: 0, duration: 0.28, ease: "power1.in" }, 0.06);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const i = cards.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === "ArrowLeft"
          ? (i <= 0 ? cards.length - 1 : i - 1)
          : (i < 0 || i >= cards.length - 1 ? 0 : i + 1);
        cards[next]?.focus({ preventScroll: true });
      } else if (event.key === "Enter" && !event.isComposing) {
        const active = document.activeElement;
        if (active instanceof HTMLButtonElement && active.dataset.mode) {
          event.preventDefault();
          finish(active.dataset.mode as AppMode);
        }
      }
    };

    root.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const card = target.closest<HTMLButtonElement>("[data-mode]");
      if (!card?.dataset.mode) return;
      playClick();
      finish(card.dataset.mode as AppMode);
    });

    document.body.append(root);
    window.addEventListener("keydown", onKey);
    cards[0]?.focus({ preventScroll: true });

    void video?.play().catch(() => {});

    gsap.set(root, { autoAlpha: 0 });
    gsap.set(headline, { autoAlpha: 0, y: 16 });
    gsap.set(cards, { autoAlpha: 0, y: 20 });

    if (reducedMotion()) {
      gsap.set([root, headline, ...cards], { clearProps: "all", autoAlpha: 1 });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.to(root, { autoAlpha: 1, duration: 0.35 }, 0);
    tl.to(headline, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.08);
    tl.to(cards, {
      autoAlpha: 1,
      y: 0,
      duration: 0.42,
      stagger: 0.08,
    }, 0.16);
  });
}
