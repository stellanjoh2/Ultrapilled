import gsap from "gsap";
import { mountHeaderLogotype } from "./logotypeLive";
import { logotypeRevealMarkup } from "./logotypeReveal";
import { DEFAULT_THEME } from "./theme";
import "./privacyPage.css";

function wrap(el: HTMLElement, kind: "letter" | "word"): HTMLElement[] {
  const raw = (el.textContent ?? "").trim();
  el.textContent = "";
  const parts = kind === "letter" ? [...raw] : raw.split(/\s+/);
  const nodes: HTMLElement[] = [];
  parts.forEach((part, index) => {
    const span = document.createElement("span");
    span.className = kind;
    span.textContent = kind === "word" && index < parts.length - 1 ? `${part} ` : part;
    el.append(span);
    nodes.push(span);
  });
  return nodes;
}

const reduce =
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const titleEl = document.querySelector<HTMLElement>("h1");
const ledeEl = document.querySelector<HTMLElement>(".lede");
const back = document.querySelector<HTMLElement>(".back");
if (back) {
  back.insertAdjacentHTML("beforeend", logotypeRevealMarkup());
  mountHeaderLogotype(back, () => ({ theme: DEFAULT_THEME, backdrop: "#000000" }));
}
const title = titleEl ? wrap(titleEl, "letter") : [];
const lede = ledeEl ? wrap(ledeEl, "word") : [];
const heads = [...document.querySelectorAll<HTMLElement>("h2")].flatMap((el) => wrap(el, "word"));
const copy = [...document.querySelectorAll<HTMLElement>("section p, section li")];
const home = document.querySelector<HTMLElement>(".home");

if (reduce) {
  gsap.set([back, title, lede, heads, copy, home], { autoAlpha: 1, y: 0 });
} else {
  gsap.set(back, { autoAlpha: 0, y: 12 });
  gsap.set(title, { autoAlpha: 0, y: 20 });
  gsap.set(lede, { autoAlpha: 0, y: 18 });
  gsap.set(heads, { autoAlpha: 0, y: 16 });
  gsap.set(copy, { autoAlpha: 0, y: 16 });
  gsap.set(home, { autoAlpha: 0, y: 16 });

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.to(back, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.04);
  tl.to(title, { autoAlpha: 1, y: 0, duration: 0.78, stagger: 0.045 }, 0.08);
  tl.to(lede, { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.028 }, 0.28);
  tl.to(heads, { autoAlpha: 1, y: 0, duration: 0.62, stagger: 0.04 }, 0.42);
  tl.to(copy, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.035 }, 0.5);
  tl.to(home, { autoAlpha: 1, y: 0, duration: 0.45 }, 0.72);
}
