import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { holdPhysicsForOverlay, releasePhysicsForOverlay } from "./physicsOverlayHold";
import { DEFAULT_THEME } from "./theme";
import { playRemove, playTransition } from "./uiSounds";

gsap.registerPlugin(ScrollTrigger);

const ABOUT_TEXT =
  "Hi, I'm Stellan Johansson, a creative director and brand designer with 20+ years across games, 3D, motion, UI and visual identity — shipping titles at studios, running agencies, and shaping platforms used by millions of creators. Ultrapilled™ is one of my sideprojects.";

/** Orby Lime — same accent as Mode Select “Choose your vibe:”. */
const NAME_ACCENT = DEFAULT_THEME[1];
const ABOUT_NAME = "Stellan Johansson";

export const LINKEDIN_HREF = "https://www.linkedin.com/in/stellanj/";
const GITHUB_HREF = "https://github.com/stellanjoh2/Ultrapilled";

const ABOUT_LINKS = [
  { text: "LinkedIn", href: LINKEDIN_HREF },
  { text: "GitHub", href: GITHUB_HREF },
  {
    text: "MobyGames",
    href: "https://www.mobygames.com/person/289121/stellan-johansson/credits/",
  },
  { text: "X", href: "https://x.com/johstell" },
  { text: "Instagram", href: "https://www.instagram.com/stellanj/" },
] as const;

/** Ritual past-work cycle — 1 frame/sec, each still once. */
const RITUAL_CYCLE = [
  "/images/projects/ritual/01-really.jpg",
  "/images/projects/ritual/02-quixel.jpg",
  "/images/projects/ritual/03-coffee.jpg",
  "/images/projects/ritual/04-hazelight.jpg",
  "/images/projects/ritual/05-fractal.jpg",
  "/images/projects/ritual/06-afterlife.jpg",
  "/images/projects/ritual/07-awayout.jpg",
  "/images/projects/ritual/08-ascent.jpg",
] as const;

/**
 * Sideprojects + showreel. Optional `video` uses Orby-style muted loop autoplay
 * (muted/playsInline as properties + poster until painted). Optional `images`
 * stacks JPGs and crossfades once per second (GIF-style still cycle).
 */
const ABOUT_PROJECTS = [
  {
    id: "showreel",
    name: "Showreel",
    cta: "Watch showreel",
    title: "Showreel 2020-2026",
    lede: "Highlights from those years — a small selection of projects I touched as Creative Director and Principal Designer, from Quixel Megascans and Unreal Engine through to Fortnite.",
    image: "/media/about-sjreel.jpg",
    imageAlt: "Showreel 2020–2026 — Stellan Johansson",
    video: "/media/about-sjreel.mp4",
    href: "https://www.youtube.com/watch?v=SXf1NswrDpw",
  },
  {
    id: "orby",
    name: "Orby",
    title: "Orby — Your virtual studio, in the browser",
    lede: "Orby is more than a 3D viewer — set the stage on any model, in the browser. Go photoreal for portfolios and client decks, or push into expressive stylized territory for your designs and animations.",
    image: "/images/projects/orby.jpg",
    imageAlt: "Orby 3D studio — lighting and framing a model in the browser",
    href: "https://orby.studio/",
  },
  {
    id: "lx01",
    name: "LX01",
    title: "LX01 — Text in, cyborg out",
    lede: "LX01™ is a free browser speech synthesizer for robotic voices — type a line, pick from four voice engines, or dial in a classic reciter preset. Vocode, crush, and reshape. Tune formants, EQ, and pronunciation, then ship synthetic speech or a fully vocoded take.",
    image: "/images/projects/lx01.webp",
    imageAlt: "LX01 speech synthesizer — robotic voice vocoder",
    href: "https://stellanjoh2.github.io/Cyborg/",
  },
  {
    id: "mozayk",
    name: "Mozayk",
    title: "Mozayk — Complex visuals, made easy",
    lede: "Mozayk™ is a free mosaic generator for random abstract visuals — start on a blank canvas, generate a clean layout, or import a photo or video. Scramble, restyle, and export. Shape palettes, colour, overlays, and a timeline, then ship stills or a short animation.",
    image: "/images/projects/mozayk.jpg",
    imageAlt: "Mozayk mosaic generator — abstract grid mosaics",
    href: "https://mozayk.design/",
  },
  {
    id: "ritual",
    name: "Ritual",
    cta: "Visit Ritual",
    title: "Ritual Design & Development",
    lede: "Work from Ritual, the design-driven digital agency I co-founded in Gothenburg in 2018 — brand systems, logotypes, and interactive experiences for studios and clients from Hazelight to Fractal Design.",
    image: RITUAL_CYCLE[0],
    images: RITUAL_CYCLE,
    imageAlt: "Ritual Design & Development — past projects from the Gothenburg design agency",
    href: "https://madebyritual.com/",
  },
] as const;

/** Inline attrs shared with Orby marketing loops — Safari needs properties too (see primeAboutVideo). */
const ABOUT_VIDEO_HTML_ATTRS =
  'autoplay playsinline webkit-playsinline muted loop preload="auto"';

let modalRoot: HTMLElement | null = null;
let closing = false;
let onKey: ((event: KeyboardEvent) => void) | null = null;
let openTl: gsap.core.Timeline | null = null;
let blurTween: gsap.core.Tween | null = null;
let projectTriggers: ScrollTrigger[] = [];
let cycleTimers: number[] = [];

const CYCLE_MS = 1000;

const ABOUT_BLUR_PX = 20;

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Scrim for the open About overlay — blur lives here, not on #app / Mode Select. */
function aboutBlurScrim(): HTMLElement | null {
  return modalRoot?.querySelector<HTMLElement>(".about-overlay__scrim") ?? null;
}

/**
 * Soften whatever sits under About via backdrop-filter on the scrim.
 * Avoids full-bleed filter:blur on #app / Mode Select, which fringes a bright
 * light-leak at the viewport edges. Clears fully when off (same as before so
 * Mode Select frost / mix-blend aren’t left in a filter containing block).
 */
function setAboutBlurPx(scrim: HTMLElement, px: number): void {
  if (px <= 0.05) {
    scrim.style.removeProperty("backdrop-filter");
    scrim.style.removeProperty("-webkit-backdrop-filter");
    return;
  }
  const value = `blur(${px}px)`;
  scrim.style.setProperty("-webkit-backdrop-filter", value);
  scrim.style.backdropFilter = value;
}

/** Tween scrim blur so open/close isn’t a hard cut. */
function tweenAboutBlur(on: boolean, duration: number): void {
  const scrim = aboutBlurScrim();
  if (!scrim) return;
  blurTween?.kill();
  blurTween = null;

  const from = on ? 0 : ABOUT_BLUR_PX;
  const to = on ? ABOUT_BLUR_PX : 0;

  if (reducedMotion() || duration <= 0) {
    setAboutBlurPx(scrim, to);
    return;
  }

  const state = { px: from };
  setAboutBlurPx(scrim, from);
  blurTween = gsap.to(state, {
    px: to,
    duration,
    ease: on ? "power2.out" : "power1.in",
    onUpdate: () => setAboutBlurPx(scrim, state.px),
    onComplete: () => {
      setAboutBlurPx(scrim, to);
      blurTween = null;
    },
  });
}

function fillBio(el: HTMLElement): HTMLElement[] {
  el.replaceChildren();
  const words: HTMLElement[] = [];
  const parts = ABOUT_TEXT.split(/\s+/);
  let index = 0;
  while (index < parts.length) {
    const part = parts[index]!;
    const next = parts[index + 1];
    if (part === "Stellan" && next?.startsWith("Johansson")) {
      const name = document.createElement("span");
      name.className = "about-overlay__word about-overlay__name";
      const punct = next.slice("Johansson".length);
      name.textContent = ABOUT_NAME + punct;
      name.style.color = NAME_ACCENT;
      el.append(name);
      words.push(name);
      index += 2;
    } else if ((part === "a" || part === "an") && next) {
      // Keep article + next word together so “a” doesn’t orphan at a line end.
      const span = document.createElement("span");
      span.className = "about-overlay__word";
      span.textContent = `${part}\u00A0${next}`;
      el.append(span);
      words.push(span);
      index += 2;
    } else {
      const span = document.createElement("span");
      span.className = "about-overlay__word";
      span.textContent = part;
      el.append(span);
      words.push(span);
      index += 1;
    }
    if (index < parts.length) el.append(document.createTextNode(" "));
  }
  return words;
}

function projectMediaHtml(
  project: (typeof ABOUT_PROJECTS)[number],
  index: number,
): string {
  // Eager + decode — scroll reveals stay smooth; lazy would hitch mid-tween.
  const priority = index === 0 ? ` fetchpriority="high"` : "";
  if ("video" in project && project.video) {
    return `<video class="about-project__image about-project__video" src="${project.video}" poster="${project.image}" width="1600" height="900" ${ABOUT_VIDEO_HTML_ATTRS} aria-label="${project.imageAlt}"></video>`;
  }
  if ("images" in project && project.images && project.images.length > 1) {
    const frames = project.images
      .map(
        (src, i) =>
          `<img class="about-project__image${i === 0 ? " is-on" : ""}" src="${src}" alt="" width="1600" height="900" loading="eager" decoding="async"${i === 0 ? priority : ""} />`,
      )
      .join("");
    return `<span class="about-project__cycle" role="img" aria-label="${project.imageAlt}">${frames}</span>`;
  }
  return `<img class="about-project__image" src="${project.image}" alt="${project.imageAlt}" width="1600" height="900" loading="eager" decoding="async"${priority} />`;
}

function projectsHtml(): string {
  const cards = ABOUT_PROJECTS.map((project, index) => {
    const external = project.href.startsWith("http");
    const extra = external ? ` target="_blank" rel="noopener noreferrer"` : "";
    const cta = "cta" in project ? project.cta : `Launch ${project.name}`;
    return `
      <article class="about-project">
        <a class="about-project__media" href="${project.href}"${extra} aria-label="${cta}">
          ${projectMediaHtml(project, index)}
        </a>
        <h3 class="about-project__title">
          <a class="about-project__title-link" href="${project.href}"${extra}>${project.title}</a>
        </h3>
        <p class="about-project__lede">${project.lede}</p>
        <a class="pill about-project__launch" href="${project.href}"${extra}>${cta}</a>
      </article>
    `;
  }).join("");
  return `
    <section class="about-overlay__projects" aria-label="More from me">
      <h2 class="about-overlay__projects-title">More from me</h2>
      <div class="about-overlay__projects-list">${cards}</div>
    </section>
  `;
}

function projectBits(card: HTMLElement): HTMLElement[] {
  return [
    card.querySelector<HTMLElement>(".about-project__media"),
    card.querySelector<HTMLElement>(".about-project__title"),
    card.querySelector<HTMLElement>(".about-project__lede"),
    card.querySelector<HTMLElement>(".about-project__launch"),
  ].filter((el): el is HTMLElement => Boolean(el));
}

async function ensureImageReady(img: HTMLImageElement | null): Promise<void> {
  if (!img) return;
  if (!img.complete) {
    await new Promise<void>((resolve) => {
      img.addEventListener("load", () => resolve(), { once: true });
      img.addEventListener("error", () => resolve(), { once: true });
    });
  }
  try {
    await img.decode();
  } catch {
    /* decode can reject on error — reveal still proceeds */
  }
}

/** Safari: muted/playsInline must be properties, not only HTML attributes (Orby marketing). */
function primeAboutVideo(video: HTMLVideoElement): void {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("autoplay", "");
  video.setAttribute("loop", "");
}

/** Ensure .src is a real property — Safari can ignore attribute-only src. */
function ensureAboutVideoLoaded(video: HTMLVideoElement): void {
  primeAboutVideo(video);
  const attr = video.getAttribute("src") || "";
  if (!attr) return;
  let resolved = attr;
  try {
    resolved = new URL(attr, document.baseURI || window.location.href).href;
  } catch {
    /* keep attr */
  }
  if (video.error || (video.src !== resolved && video.currentSrc !== resolved)) {
    video.src = attr;
  }
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) video.load();
}

/**
 * Orby marketing play path — keep poster until decoded pixels, then retry play on reject.
 * Reduced-motion leaves the poster JPG only.
 */
function playAboutVideo(video: HTMLVideoElement): void {
  if (reducedMotion()) return;
  ensureAboutVideoLoaded(video);

  const dropPosterWhenPainted = () => {
    if (video.videoWidth > 0 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      video.removeAttribute("poster");
      video.removeEventListener("loadeddata", dropPosterWhenPainted);
      video.removeEventListener("playing", dropPosterWhenPainted);
    }
  };
  video.addEventListener("loadeddata", dropPosterWhenPainted);
  video.addEventListener("playing", dropPosterWhenPainted);

  const attemptPlay = () => {
    if (video.error) ensureAboutVideoLoaded(video);
    if (video.error) return;
    const result = video.play();
    if (result && typeof result.then === "function") {
      result.catch(() => {
        ensureAboutVideoLoaded(video);
        window.setTimeout(() => {
          if (!video.error) void video.play().catch(() => {});
        }, 120);
      });
    }
  };

  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    attemptPlay();
    return;
  }
  video.addEventListener("loadeddata", attemptPlay, { once: true });
  video.addEventListener("canplay", attemptPlay, { once: true });
}

async function ensureVideoReady(video: HTMLVideoElement | null): Promise<void> {
  if (!video) return;
  ensureAboutVideoLoaded(video);
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) return;
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    video.addEventListener("loadeddata", done, { once: true });
    video.addEventListener("error", done, { once: true });
    // Poster paints immediately; don't block the reveal forever on a slow mp4.
    window.setTimeout(done, 2500);
  });
}

async function ensureProjectMediaReady(card: HTMLElement): Promise<void> {
  const video = card.querySelector<HTMLVideoElement>(".about-project__video");
  if (video) {
    await ensureVideoReady(video);
    return;
  }
  const cycle = card.querySelector(".about-project__cycle");
  if (cycle) {
    const frames = [...cycle.querySelectorAll<HTMLImageElement>("img.about-project__image")];
    await Promise.all(frames.map((img) => ensureImageReady(img)));
    return;
  }
  await ensureImageReady(card.querySelector<HTMLImageElement>(".about-project__image"));
}

/** Kick decode / fetch so later cards are warm by the time they enter view. */
function warmProjectMedia(root: HTMLElement): void {
  for (const img of root.querySelectorAll<HTMLImageElement>("img.about-project__image")) {
    void ensureImageReady(img);
  }
  for (const video of root.querySelectorAll<HTMLVideoElement>(".about-project__video")) {
    primeAboutVideo(video);
    if (!reducedMotion()) void ensureVideoReady(video);
  }
}

function pauseAboutVideos(root: HTMLElement): void {
  for (const video of root.querySelectorAll<HTMLVideoElement>(".about-project__video")) {
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      /* seek unsupported on partial buffers */
    }
  }
}

function stopAboutCycles(): void {
  for (const id of cycleTimers) window.clearInterval(id);
  cycleTimers = [];
}

/** JPG stack crossfade — 1 frame/sec; reduced-motion keeps the first still. */
function startAboutCycle(card: HTMLElement): void {
  if (reducedMotion()) return;
  const cycle = card.querySelector<HTMLElement>(".about-project__cycle");
  if (!cycle || cycle.dataset.cycling === "1") return;
  const frames = [...cycle.querySelectorAll<HTMLImageElement>("img.about-project__image")];
  if (frames.length < 2) return;
  cycle.dataset.cycling = "1";
  let index = frames.findIndex((img) => img.classList.contains("is-on"));
  if (index < 0) {
    index = 0;
    frames[0]!.classList.add("is-on");
  }
  const id = window.setInterval(() => {
    frames[index]!.classList.remove("is-on");
    index = (index + 1) % frames.length;
    frames[index]!.classList.add("is-on");
  }, CYCLE_MS);
  cycleTimers.push(id);
}

function killProjectTriggers(): void {
  for (const st of projectTriggers) st.kill();
  projectTriggers = [];
}

function armProjectScrollReveals(
  root: HTMLElement,
  scroller: HTMLElement,
  cards: HTMLElement[],
  doneBtn: HTMLElement,
): void {
  killProjectTriggers();
  const clearBlend = "opacity,visibility,transform";

  for (const card of cards) {
    const bits = projectBits(card);
    const media = bits[0];
    const rest = bits.slice(1);
    const video = card.querySelector<HTMLVideoElement>(".about-project__video");
    const hasCycle = Boolean(card.querySelector(".about-project__cycle"));

    const st = ScrollTrigger.create({
      scroller,
      trigger: card,
      start: "top 88%",
      once: true,
      onEnter: () => {
        void (async () => {
          await ensureProjectMediaReady(card);
          if (modalRoot !== root || closing) return;
          const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
          if (media) {
            tl.to(media, { autoAlpha: 1, y: 0, duration: 0.65, clearProps: clearBlend });
          }
          if (rest.length) {
            tl.to(
              rest,
              { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08, clearProps: clearBlend },
              media ? "-=0.4" : 0,
            );
          }
          if (video) tl.add(() => playAboutVideo(video), media ? "-=0.5" : 0);
          if (hasCycle) tl.add(() => startAboutCycle(card), media ? "-=0.5" : 0);
        })();
      },
    });
    projectTriggers.push(st);
  }

  projectTriggers.push(
    ScrollTrigger.create({
      scroller,
      trigger: doneBtn,
      start: "top 92%",
      once: true,
      onEnter: () => {
        if (modalRoot !== root || closing) return;
        gsap.to(doneBtn, {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          ease: "power3.out",
          clearProps: clearBlend,
        });
      },
    }),
  );

  ScrollTrigger.refresh();
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
    ${projectsHtml()}
  `;
}

export function isAboutOpen(): boolean {
  return Boolean(modalRoot);
}

export function closeAbout(): void {
  if (!modalRoot || closing) return;
  closing = true;
  const root = modalRoot;
  const scrim = root.querySelector<HTMLElement>(".about-overlay__scrim");
  const scroll = root.querySelector<HTMLElement>(".about-overlay__scroll");
  openTl?.kill();
  openTl = null;
  killProjectTriggers();
  stopAboutCycles();
  pauseAboutVideos(root);
  if (onKey) window.removeEventListener("keydown", onKey);
  onKey = null;
  playRemove();

  const done = () => {
    root.remove();
    document.body.classList.remove("is-about-open");
    modalRoot = null;
    closing = false;
    releasePhysicsForOverlay();
  };

  tweenAboutBlur(false, reducedMotion() ? 0 : 0.35);

  if (reducedMotion() || !scroll || !scrim) {
    done();
    return;
  }

  const tl = gsap.timeline({ onComplete: done });
  tl.to(scroll, { y: 12, autoAlpha: 0, duration: 0.28, ease: "power2.in" }, 0);
  tl.to(scrim, { "--about-dim": 0, duration: 0.35, ease: "power1.in" }, 0);
}

export function openAbout(): void {
  if (modalRoot || closing) return;

  const root = document.createElement("div");
  root.className = "about-overlay";
  root.setAttribute("role", "presentation");
  root.innerHTML = `
    <div class="about-overlay__scrim" data-about-close></div>
    <div class="about-overlay__scroll" role="dialog" aria-modal="true" aria-label="About Stellan Johansson">
      <div class="about-overlay__content">
        ${bodyHtml()}
        <button type="button" class="about-overlay__ok" data-about-close>OK, take me back</button>
      </div>
    </div>
  `;

  const bio = root.querySelector<HTMLElement>(".about-overlay__bio")!;
  const words = fillBio(bio);
  const links = root.querySelector<HTMLElement>(".about-overlay__links")!;
  const projectsTitle = root.querySelector<HTMLElement>(".about-overlay__projects-title")!;
  const projectCards = [...root.querySelectorAll<HTMLElement>(".about-project")];
  const projectRevealBits = projectCards.flatMap(projectBits);
  const doneBtn = root.querySelector<HTMLButtonElement>(".about-overlay__ok")!;
  const scroll = root.querySelector<HTMLElement>(".about-overlay__scroll")!;
  const scrim = root.querySelector<HTMLElement>(".about-overlay__scrim")!;

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-about-close]")) {
      closeAbout();
      return;
    }
    // Full-bleed scroller sits above the scrim — gutter clicks land on `scroll`, not content.
    if (target === scroll) closeAbout();
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
  document.body.classList.add("is-about-open");
  holdPhysicsForOverlay();
  playTransition(true);
  doneBtn.focus({ preventScroll: true });

  const intro = [links, projectsTitle];

  if (reducedMotion()) {
    tweenAboutBlur(true, 0);
    scrim.style.setProperty("--about-dim", "1");
    gsap.set([words, ...intro, ...projectRevealBits, doneBtn], {
      clearProps: "all",
      autoAlpha: 1,
      y: 0,
    });
    warmProjectMedia(root);
    return;
  }

  const clearBlend = "opacity,visibility,transform";
  gsap.set(words, { autoAlpha: 0, y: -22 });
  gsap.set(intro, { autoAlpha: 0, y: -28 });
  gsap.set([...projectRevealBits, doneBtn], { autoAlpha: 0, y: -28 });
  gsap.set(scrim, { "--about-dim": 0 });

  // Soften stage + dim together, then stagger copy. Projects wait for scroll.
  tweenAboutBlur(true, 0.55);
  openTl = gsap.timeline({ defaults: { ease: "power3.out" } });
  openTl.to(scrim, { "--about-dim": 1, duration: 0.55, ease: "power2.out" }, 0);
  openTl.to(
    words,
    { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.06, clearProps: clearBlend },
    0.12,
  );
  openTl.to(links, { autoAlpha: 1, y: 0, duration: 0.55, clearProps: clearBlend }, ">");
  // Projects (incl. the first still in view) wait until bio + social finish.
  openTl.add(() => {
    if (modalRoot !== root || closing) return;
    armProjectScrollReveals(root, scroll, projectCards, doneBtn);
  });
  openTl.to(projectsTitle, { autoAlpha: 1, y: 0, duration: 0.55, clearProps: clearBlend }, ">");

  // Eager media + decode ahead of the scroller; each reveal still waits on its own ready.
  warmProjectMedia(root);
}
