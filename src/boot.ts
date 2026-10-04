import "./mobile-gate.css";
import { isMobileAccessGate } from "./mobileGate";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app missing");

const mobile = isMobileAccessGate();
if (mobile) document.documentElement.classList.add("is-mobile-gate");

if (mobile) {
  await import("./style.css");
  const { mountMobileAccessOverlay } = await import("./modeSelect");
  mountMobileAccessOverlay();
} else {
  const intro = new Image();
  intro.src = "/images/intropill.gif";
  void intro.decode().catch(() => {});
  await import("./main.ts");
}
