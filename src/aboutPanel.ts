import gsap from "gsap";
import { playRemove, playTransition } from "./uiSounds";

const ABOUT_TEXT =
  "Hi, I'm Stellan Johansson, a creative director and brand designer with 20+ years across games, 3D, motion, UI and visual identity — shipping titles at studios, running agencies, and shaping platforms used by millions of creators. Ultrapilled™ is one of my sideprojects.";

const ABOUT_LINKS = [
  { text: "LinkedIn", href: "https://www.linkedin.com/in/stellanj/" },
  {
    text: "MobyGames",
    href: "https://www.mobygames.com/person/289121/stellan-johansson/credits/",
  },
  { text: "X", href: "https://x.com/johstell" },
  { text: "Orby", href: "https://orby.studio/" },
] as const;

let modalRoot: HTMLElement | null = null;
let closing = false;
let onKey: ((event: KeyboardEvent) => void) | null = null;
let openTl: gsap.core.Timeline | null = null;

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function fillBio(el: HTMLElement): HTMLElement[] {
  el.replaceChildren();
  const parts = ABOUT_TEXT.split(/\s+/);
  const words: HTMLElement[] = [];
  parts.forEach((part, index) => {
    const span = document.createElement("span");
    span.className = "about-overlay__word";
    span.textContent = part;
    el.append(span);
    words.push(span);
    if (index < parts.length - 1) el.append(document.createTextNode(" "));
  });
  return words;
}

function bodyHtml(): string {
  const links = ABOUT_LINKS.map((link) => {
    const external = link.href.startsWith("http");
    const extra = external ? ` target="_blank" rel="noopener noreferrer"` : "";
    return `<a href="${link.href}"${extra}>${link.text}</a>`;
  }).join('<span class="about-overlay__sep" aria-hidden="true"></span>');
  return `
    <p class="about-overlay__bio"></p>
    <p class="about-overlay__links">${links}</p>
  `;
}

export function isAboutOpen(): boolean {
  return Boolean(modalRoot);
}

export function closeAbout(): void {
  if (!modalRoot || closing) return;
  closing = true;
  const root = modalRoot;
  const scroll = root.querySelector<HTMLElement>(".about-overlay__scroll");
  openTl?.kill();
  openTl = null;
  if (onKey) window.removeEventListener("keydown", onKey);
  onKey = null;
  playRemove();

  const done = () => {
    root.remove();
    modalRoot = null;
    closing = false;
  };

  if (reducedMotion() || !scroll) {
    done();
    return;
  }

  const tl = gsap.timeline({ onComplete: done });
  tl.to(scroll, { y: 12, autoAlpha: 0, duration: 0.28, ease: "power2.in" }, 0);
  tl.to(root, { autoAlpha: 0, duration: 0.28, ease: "power1.in" }, 0);
}

export function openAbout(): void {
  if (modalRoot || closing) return;

  const root = document.createElement("div");
  root.className = "about-overlay";
  root.setAttribute("role", "presentation");
  root.innerHTML = `
    <div class="about-overlay__scroll" role="dialog" aria-modal="true" aria-label="About Stellan Johansson">
      <div class="about-overlay__content">
        ${bodyHtml()}
        <button type="button" class="pill about-overlay__ok" data-about-close>OK, TAKE ME BACK</button>
      </div>
    </div>
  `;

  const scroll = root.querySelector<HTMLElement>(".about-overlay__scroll")!;
  const bio = root.querySelector<HTMLElement>(".about-overlay__bio")!;
  const words = fillBio(bio);
  const links = root.querySelector<HTMLElement>(".about-overlay__links")!;
  const doneBtn = root.querySelector<HTMLButtonElement>(".about-overlay__ok")!;

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target === root || target.closest("[data-about-close]")) closeAbout();
  });

  onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAbout();
    }
  };
  window.addEventListener("keydown", onKey);

  document.body.append(root);
  modalRoot = root;
  playTransition(true);
  doneBtn.focus({ preventScroll: true });

  gsap.set(root, { autoAlpha: 0 });

  if (reducedMotion()) {
    gsap.set(root, { autoAlpha: 1 });
    return;
  }

  const clearBlend = "opacity,visibility,transform";
  const reveal = { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.06, clearProps: clearBlend };
  gsap.set(words, { autoAlpha: 0, y: 22 });
  gsap.set([links, doneBtn], { autoAlpha: 0, y: 22 });

  openTl = gsap.timeline({ defaults: { ease: "power3.out" } });
  openTl.to(root, { autoAlpha: 1, duration: 0.32 }, 0);
  openTl.to(words, reveal, 0.08);
  openTl.to([links, doneBtn], reveal, ">");
}
