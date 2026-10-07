import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DEFAULT_THEME } from "./theme";
import { playRemove, playTransition } from "./uiSounds";

gsap.registerPlugin(ScrollTrigger);

const ABOUT_TEXT =
  "Hi, I'm Stellan Johansson, a creative director and brand designer with 20+ years across games, 3D, motion, UI and visual identity — shipping titles at studios, running agencies, and shaping platforms used by millions of creators. Ultrapilled™ is one of my sideprojects.";

/** Orby Lime — same accent as Mode Select “Choose your vibe:”. */
const NAME_ACCENT = DEFAULT_THEME[1];
const ABOUT_NAME = "Stellan Johansson";

const ABOUT_LINKS = [
  { text: "LinkedIn", href: "https://www.linkedin.com/in/stellanj/" },
  {
    text: "MobyGames",
    href: "https://www.mobygames.com/person/289121/stellan-johansson/credits/",
  },
  { text: "X", href: "https://x.com/johstell" },
] as const;

/** Sideprojects + showreel — stills from Orby marketing / promo captures. */
const ABOUT_PROJECTS = [
  {
    id: "showreel",
    name: "Showreel",
    cta: "Watch showreel",
    title: "Showreel 2020-2026",
    lede: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus fermentum, nisl a tincidunt tincidunt, nisi nisl aliquam nisl, eget aliquam nisl nisl sit amet nisl.",
    image: "/images/projects/showreel.jpg",
    imageAlt: "Showreel 2020–2026 — Stellan Johansson",
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
    id: "mozayk",
    name: "Mozayk",
    title: "Mozayk — Complex visuals, made easy",
    lede: "Mozayk™ is a free mosaic generator for random abstract visuals — start on a blank canvas, generate a clean layout, or import a photo or video. Scramble, restyle, and export. Shape palettes, colour, overlays, and a timeline, then ship stills or a short animation.",
    image: "/images/projects/mozayk.jpg",
    imageAlt: "Mozayk mosaic generator — abstract grid mosaics",
    href: "https://stellanjoh2.github.io/mozayk/",
  },
  {
    id: "lx01",
    name: "LX01",
    title: "LX01 — Text in, cyborg out",
    lede: "LX01™ is a free browser speech synthesizer for robotic voices — type a line, pick from four voice engines, or dial in a classic reciter preset. Vocode, crush, and reshape. Tune formants, EQ, and pronunciation, then ship synthetic speech or a fully vocoded take.",
    image: "/images/projects/lx01.jpg",
    imageAlt: "LX01 speech synthesizer — robotic voice vocoder",
    href: "https://stellanjoh2.github.io/Cyborg/",
  },
] as const;

let modalRoot: HTMLElement | null = null;
let closing = false;
let onKey: ((event: KeyboardEvent) => void) | null = null;
let openTl: gsap.core.Timeline | null = null;
let blurTween: gsap.core.Tween | null = null;
let projectTriggers: ScrollTrigger[] = [];

const ABOUT_BLUR_PX = 14;

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function appEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>("#app");
}

/** Soften the stage under About — tween blur so open/close isn’t a hard cut. */
function tweenAboutBlur(on: boolean, duration: number): void {
  const app = appEl();
  if (!app) return;
  blurTween?.kill();
  blurTween = null;
  if (reducedMotion()) {
    if (on) app.style.filter = `blur(${ABOUT_BLUR_PX}px)`;
    else {
      app.style.removeProperty("filter");
      gsap.set(app, { clearProps: "filter" });
    }
    return;
  }
  if (on) {
    blurTween = gsap.fromTo(
      app,
      { filter: "blur(0px)" },
      { filter: `blur(${ABOUT_BLUR_PX}px)`, duration, ease: "power2.out" },
    );
  } else {
    blurTween = gsap.to(app, {
      filter: "blur(0px)",
      duration,
      ease: "power1.in",
      onComplete: () => {
        gsap.set(app, { clearProps: "filter" });
        blurTween = null;
      },
    });
  }
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

function projectsHtml(): string {
  const cards = ABOUT_PROJECTS.map((project, index) => {
    const external = project.href.startsWith("http");
    const extra = external ? ` target="_blank" rel="noopener noreferrer"` : "";
    const cta = "cta" in project ? project.cta : `Launch ${project.name}`;
    // Eager + decode — scroll reveals stay smooth; lazy would hitch mid-tween.
    const priority = index === 0 ? ` fetchpriority="high"` : "";
    return `
      <article class="about-project">
        <a class="about-project__media" href="${project.href}"${extra} aria-label="${cta}">
          <img class="about-project__image" src="${project.image}" alt="${project.imageAlt}" width="1600" height="900" loading="eager" decoding="async"${priority} />
        </a>
        <h3 class="about-project__title">${project.title}</h3>
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

/** Kick decode for every still so later cards are warm by the time they enter view. */
function warmProjectImages(root: HTMLElement): void {
  for (const img of root.querySelectorAll<HTMLImageElement>(".about-project__image")) {
    void ensureImageReady(img);
  }
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
    const img = card.querySelector<HTMLImageElement>(".about-project__image");

    const st = ScrollTrigger.create({
      scroller,
      trigger: card,
      start: "top 88%",
      once: true,
      onEnter: () => {
        void (async () => {
          await ensureImageReady(img);
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
  if (onKey) window.removeEventListener("keydown", onKey);
  onKey = null;
  playRemove();

  const done = () => {
    root.remove();
    document.body.classList.remove("is-about-open");
    modalRoot = null;
    closing = false;
  };

  tweenAboutBlur(false, reducedMotion() ? 0 : 0.35);

  if (reducedMotion() || !scroll || !scrim) {
    done();
    return;
  }

  const tl = gsap.timeline({ onComplete: done });
  tl.to(scroll, { y: 12, autoAlpha: 0, duration: 0.28, ease: "power2.in" }, 0);
  tl.to(scrim, { autoAlpha: 0, duration: 0.35, ease: "power1.in" }, 0);
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
  playTransition(true);
  doneBtn.focus({ preventScroll: true });

  const intro = [links, projectsTitle];

  if (reducedMotion()) {
    tweenAboutBlur(true, 0);
    gsap.set([words, ...intro, ...projectRevealBits, doneBtn], {
      clearProps: "all",
      autoAlpha: 1,
      y: 0,
    });
    warmProjectImages(root);
    return;
  }

  const clearBlend = "opacity,visibility,transform";
  gsap.set(words, { autoAlpha: 0, y: -22 });
  gsap.set(intro, { autoAlpha: 0, y: -28 });
  gsap.set([...projectRevealBits, doneBtn], { autoAlpha: 0, y: -28 });
  gsap.set(scrim, { autoAlpha: 0 });

  // Soften stage + dim together, then stagger copy. Projects wait for scroll.
  tweenAboutBlur(true, 0.55);
  openTl = gsap.timeline({ defaults: { ease: "power3.out" } });
  openTl.to(scrim, { autoAlpha: 1, duration: 0.55, ease: "power2.out" }, 0);
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

  // Eager imgs + decode ahead of the scroller; each reveal still waits on its own decode.
  warmProjectImages(root);
}
