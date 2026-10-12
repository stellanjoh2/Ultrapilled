import gsap from "gsap";
import {
  PHOSPHOR_HOME,
  PHOSPHOR_STYLES,
  phosphorConfigured,
  phosphorIconFile,
  searchPhosphor,
  type PhosphorIcon,
  type PhosphorStyle,
} from "./phosphorApi";
import type { ImageRemote } from "./types";
import { playRemove, playSwitch, playTransition } from "./uiSounds";

let modalRoot: HTMLElement | null = null;
let closing = false;
let onKey: ((event: KeyboardEvent) => void) | null = null;
let searchTimer = 0;
let searchGen = 0;

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function isPhosphorOpen(): boolean {
  return Boolean(modalRoot);
}

export function closePhosphor(): void {
  if (!modalRoot || closing) return;
  closing = true;
  const root = modalRoot;
  const scrim = root.querySelector<HTMLElement>(".unsplash-modal__scrim");
  const card = root.querySelector<HTMLElement>(".unsplash-modal__card");
  if (onKey) window.removeEventListener("keydown", onKey);
  onKey = null;
  window.clearTimeout(searchTimer);
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

export function openPhosphorImport(opts: { onPick: (file: File, remote?: ImageRemote) => void }): void {
  if (modalRoot || closing) return;

  const root = document.createElement("div");
  root.className = "unsplash-modal";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "phosphor-modal-title");
  root.innerHTML = `
    <div class="unsplash-modal__scrim" data-phosphor-close></div>
    <div class="unsplash-modal__card">
      <header class="unsplash-modal__head">
        <h2 class="unsplash-modal__title" id="phosphor-modal-title">Add an icon</h2>
        <button type="button" class="unsplash-modal__x icon-hover" data-phosphor-close aria-label="Close" data-tip="Close">
          <span aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M18.3 5.7 13 11l5.3 5.3-1.4 1.4L11.6 12.4 6.3 17.7 4.9 16.3 10.2 11 4.9 5.7 6.3 4.3l5.3 5.3 5.3-5.3z"/></svg></span>
        </button>
      </header>
      <div class="unsplash-modal__body">
        <div class="segment unsplash-modal__style" role="tablist" aria-label="Icon style">
          ${PHOSPHOR_STYLES.map(
            (style, index) => `
            <button type="button" class="pill${index === 0 ? " is-on" : ""}" role="tab" data-phosphor-style="${style.id}" aria-selected="${index === 0}" aria-pressed="${index === 0}" data-tip="${style.label} Phosphor icons">
              ${style.label}
            </button>`,
          ).join("")}
        </div>
        <label class="field unsplash-modal__search" data-tip="Search Phosphor icons by name or tag">Search icons
          <input type="search" data-phosphor-query placeholder="heart, rocket, coffee…" autocomplete="off" />
        </label>
        <p class="unsplash-modal__status" data-phosphor-status hidden></p>
        <div class="unsplash-grid-scroll">
          <div class="unsplash-grid unsplash-grid--icons" data-phosphor-grid></div>
        </div>
        <div class="unsplash-modal__more" data-phosphor-more hidden>
          <button type="button" class="pill pill--commit unsplash-modal__more-btn" data-phosphor-load-more data-tip="Load the next page of icons">
            Show more icons
          </button>
        </div>
      </div>
      <footer class="unsplash-modal__foot">
        <p class="unsplash-modal__credit">
          Icons from
          <a href="${PHOSPHOR_HOME}" target="_blank" rel="noopener noreferrer">Phosphor</a>
        </p>
      </footer>
    </div>
  `;

  const scrim = root.querySelector<HTMLElement>(".unsplash-modal__scrim")!;
  const card = root.querySelector<HTMLElement>(".unsplash-modal__card")!;
  const input = root.querySelector<HTMLInputElement>("[data-phosphor-query]")!;
  const status = root.querySelector<HTMLElement>("[data-phosphor-status]")!;
  const grid = root.querySelector<HTMLElement>("[data-phosphor-grid]")!;
  const gridScroll = root.querySelector<HTMLElement>(".unsplash-grid-scroll")!;
  const moreWrap = root.querySelector<HTMLElement>("[data-phosphor-more]")!;
  const moreBtn = root.querySelector<HTMLButtonElement>("[data-phosphor-load-more]")!;
  const styleBtns = [...root.querySelectorAll<HTMLButtonElement>("[data-phosphor-style]")];

  let activeQuery = "";
  let activeStyle: PhosphorStyle = "fill";
  let page = 0;
  let total = 0;
  let totalPages = 0;
  let loaded = 0;
  let loadingMore = false;
  const seen = new Set<string>();

  const setStatus = (text: string) => {
    status.textContent = text;
    status.hidden = !text;
  };

  const paintStyleTabs = () => {
    for (const btn of styleBtns) {
      const on = btn.dataset.phosphorStyle === activeStyle;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-selected", String(on));
      btn.setAttribute("aria-pressed", String(on));
    }
  };

  const updateMore = () => {
    const hasMore = page > 0 && page < totalPages;
    moreWrap.hidden = !hasMore;
    moreBtn.disabled = loadingMore;
    moreBtn.textContent = loadingMore ? "Loading…" : "Show more icons";
  };

  const resultStatus = () => {
    if (!loaded) return "No icons found.";
    const kind = activeQuery ? "icons" : "featured icons";
    if (total > loaded) {
      return `Showing ${loaded.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} ${kind}`;
    }
    return `${loaded.toLocaleString("en-US")} ${kind}`;
  };

  const appendIcons = (next: PhosphorIcon[]) => {
    for (const icon of next) {
      if (seen.has(icon.id)) continue;
      seen.add(icon.id);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "unsplash-grid__item unsplash-grid__item--icon";
      btn.title = icon.label;
      btn.setAttribute("aria-label", icon.label);
      btn.innerHTML = `
        <img src="${icon.thumb}" alt="" loading="lazy" draggable="false" />
        <span class="unsplash-grid__by">${escapeHtml(icon.label)}</span>
      `;
      btn.addEventListener("click", () => {
        void pickIcon(icon, btn);
      });
      grid.append(btn);
    }
    loaded = seen.size;
  };

  const resetResults = () => {
    grid.replaceChildren();
    seen.clear();
    loaded = 0;
    page = 0;
    total = 0;
    totalPages = 0;
    loadingMore = false;
    card.classList.remove("has-results");
    updateMore();
  };

  const pickIcon = async (icon: PhosphorIcon, btn: HTMLButtonElement) => {
    if (btn.classList.contains("is-busy")) return;
    btn.classList.add("is-busy");
    setStatus("Adding…");
    try {
      const file = await phosphorIconFile(icon);
      closePhosphor();
      opts.onPick(file, { kind: "phosphor", id: icon.id });
    } catch {
      btn.classList.remove("is-busy");
      setStatus("Couldn’t add that icon. Try another.");
      updateMore();
    }
  };

  const applyPage = (next: ReturnType<typeof searchPhosphor>, replace: boolean) => {
    if (replace) {
      grid.replaceChildren();
      seen.clear();
    }
    page = next.page;
    total = next.total;
    totalPages = next.totalPages;
    appendIcons(next.icons);
    if (loaded) card.classList.add("has-results");
    else card.classList.remove("has-results");
    setStatus(resultStatus());
    updateMore();
  };

  const runSearch = (query: string) => {
    const q = query.trim();
    const gen = ++searchGen;
    activeQuery = q;
    loadingMore = false;
    setStatus(q ? "Searching…" : "Loading…");
    updateMore();
    try {
      const next = searchPhosphor(q, 1, activeStyle);
      if (gen !== searchGen) return;
      if (!next.icons.length) {
        resetResults();
        setStatus("No icons found.");
        return;
      }
      applyPage(next, true);
    } catch {
      if (gen !== searchGen) return;
      resetResults();
      setStatus("Search failed.");
    }
  };

  const scrollToNewResults = (fromIndex: number) => {
    const firstNew = grid.children[fromIndex];
    if (!(firstNew instanceof HTMLElement)) return;
    const top =
      gridScroll.scrollTop +
      (firstNew.getBoundingClientRect().top - gridScroll.getBoundingClientRect().top);
    gridScroll.scrollTo({ top, behavior: reducedMotion() ? "auto" : "smooth" });
  };

  const loadMore = () => {
    if (loadingMore || page >= totalPages) return;
    const gen = searchGen;
    loadingMore = true;
    updateMore();
    try {
      const next = searchPhosphor(activeQuery, page + 1, activeStyle);
      if (gen !== searchGen) return;
      loadingMore = false;
      const fromIndex = grid.children.length;
      applyPage(next, false);
      scrollToNewResults(fromIndex);
    } catch {
      if (gen !== searchGen) return;
      loadingMore = false;
      updateMore();
      setStatus("Couldn’t load more icons.");
    }
  };

  const setStyle = (next: PhosphorStyle) => {
    if (next === activeStyle) return;
    activeStyle = next;
    paintStyleTabs();
    playSwitch(true);
    runSearch(input.value);
  };

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("[data-phosphor-close]")) closePhosphor();
    if (target.closest("[data-phosphor-load-more]")) loadMore();
    const styleBtn = target.closest<HTMLButtonElement>("[data-phosphor-style]");
    if (styleBtn?.dataset.phosphorStyle === "fill" || styleBtn?.dataset.phosphorStyle === "regular") {
      setStyle(styleBtn.dataset.phosphorStyle);
    }
  });

  onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closePhosphor();
    }
  };
  window.addEventListener("keydown", onKey);

  input.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => runSearch(input.value), 300);
  });

  document.body.append(root);
  modalRoot = root;
  playTransition(true);

  if (!phosphorConfigured()) {
    input.disabled = true;
    for (const btn of styleBtns) btn.disabled = true;
    setStatus("Phosphor icons aren’t available in this build.");
  } else {
    runSearch("");
  }

  const focusSearch = () => {
    if (!modalRoot || input.disabled) return;
    input.focus({ preventScroll: true });
    if (input.value) input.select();
  };

  gsap.set(scrim, { autoAlpha: 0 });
  gsap.set(card, { autoAlpha: 0, y: 16, scale: 0.96 });

  if (reducedMotion()) {
    gsap.set([scrim, card], { clearProps: "all", autoAlpha: 1, y: 0, scale: 1 });
    focusSearch();
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.to(scrim, { autoAlpha: 1, duration: 0.28 }, 0);
  tl.to(card, { autoAlpha: 1, y: 0, scale: 1, duration: 0.36, onStart: focusSearch }, 0.04);
}
