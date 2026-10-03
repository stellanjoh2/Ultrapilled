import "./mobile-gate.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app missing");

const mobile = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

// Store mobile flag globally so main.ts can access it
(window as any).__ULTRAPILLED_MOBILE__ = mobile;

const intro = new Image();
intro.src = "/images/intropill.gif";
void intro.decode().catch(() => {});
await import("./main.ts");
