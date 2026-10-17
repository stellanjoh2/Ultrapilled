import "./mobile-gate.css";
import { isMobileAccessGate, shouldBootMobileGate } from "./mobileGate";
import { shareIdFromUrl } from "./share";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app missing");

const shareLink = Boolean(shareIdFromUrl());
const mobileGate = shouldBootMobileGate(shareLink);
if (mobileGate) document.documentElement.classList.add("is-mobile-gate");

if (mobileGate) {
  await import("./style.css");
  const { mountMobileAccessOverlay } = await import("./modeSelect");
  mountMobileAccessOverlay();
} else {
  if (shareLink && isMobileAccessGate()) {
    document.documentElement.classList.add("is-mobile-share");
  }
  const intro = new Image();
  intro.src = "/images/intropill.gif";
  void intro.decode().catch(() => {});
  await import("./main.ts");
}
