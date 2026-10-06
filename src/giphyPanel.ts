import gsap from "gsap";
import {
  GIPHY_HOME,
  giphyConfigured,
  giphyGifFile,
  searchGiphy,
  trendingGiphy,
  type GiphyGif,
} from "./giphyApi";
import type { ImageRemote } from "./types";
import { playRemove, playTransition } from "./uiSounds";

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

export function isGiphyOpen(): boolean {
  return Boolean(modalRoot);
}

export function closeGiphy(): void {
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

export function openGiphyImport(opts: { onPick: (file: File, remote?: ImageRemote) => void }): void {
  if (modalRoot || closing) return;

  const root = document.createElement("div");
  root.className = "unsplash-modal";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "giphy-modal-title");
  root.innerHTML = `
    <div class="unsplash-modal__scrim" data-giphy-close></div>
    <div class="unsplash-modal__card">
      <header class="unsplash-modal__head">
        <h2 class="unsplash-modal__title" id="giphy-modal-title">Add from Giphy</h2>
        <button type="button" class="unsplash-modal__x icon-hover" data-giphy-close aria-label="Close">
          <span aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M18.3 5.7 13 11l5.3 5.3-1.4 1.4L11.6 12.4 6.3 17.7 4.9 16.3 10.2 11 4.9 5.7 6.3 4.3l5.3 5.3 5.3-5.3z"/></svg></span>
        </button>
      </header>
      <div class="unsplash-modal__body">
        <label class="field unsplash-modal__search">Search Giphy
          <input type="search" data-giphy-query placeholder="cats, wow, dance…" autocomplete="off" />
        </label>
        <p class="unsplash-modal__status" data-giphy-status hidden></p>
        <div class="unsplash-grid" data-giphy-grid></div>
        <div class="unsplash-modal__more" data-giphy-more hidden>
          <button type="button" class="pill pill--commit unsplash-modal__more-btn" data-giphy-load-more>
            Show more GIFs
          </button>
        </div>
      </div>
      <footer class="unsplash-modal__foot">
        <p class="unsplash-modal__credit">
          Powered by
          <a href="${GIPHY_HOME}" target="_blank" rel="noopener noreferrer">GIPHY</a>
        </p>
      </footer>
    </div>
  `;

  const scrim = root.querySelector<HTMLElement>(".unsplash-modal__scrim")!;
  const card = root.querySelector<HTMLElement>(".unsplash-modal__card")!;
  const input = root.querySelector<HTMLInputElement>("[data-giphy-query]")!;
  const status = root.querySelector<HTMLElement>("[data-giphy-status]")!;
  const grid = root.querySelector<HTMLElement>("[data-giphy-grid]")!;
  const moreWrap = root.querySelector<HTMLElement>("[data-giphy-more]")!;
  const moreBtn = root.querySelector<HTMLButtonElement>("[data-giphy-load-more]")!;

  let activeQuery = "";
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

  const updateMore = () => {
    const hasMore = page > 0 && page < totalPages;
    moreWrap.hidden = !hasMore;
    moreBtn.disabled = loadingMore;
    moreBtn.textContent = loadingMore ? "Loading…" : "Show more GIFs";
  };

  const resultStatus = () => {
    if (!loaded) return "No GIFs found.";
    const kind = activeQuery ? "GIFs" : "trending GIFs";
    if (total > loaded) {
      return `Showing ${loaded.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} ${kind}`;
    }
    return `${loaded.toLocaleString("en-US")} ${kind}`;
  };

  const appendGifs = (gifs: GiphyGif[]) => {
    for (const gif of gifs) {
      if (seen.has(gif.id)) continue;
      seen.add(gif.id);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "unsplash-grid__item";
      btn.title = `${gif.alt} — ${gif.username}`;
      btn.innerHTML = `
        <img src="${gif.thumb}" alt="" loading="lazy" draggable="false" />
        <span class="unsplash-grid__by">
          <a href="${gif.profileUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(gif.username)}</a>
        </span>
      `;
      btn.querySelector("a")?.addEventListener("click", (event) => event.stopPropagation());
      btn.addEventListener("click", () => {
        void pickGif(gif, btn);
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

  const pickGif = async (gif: GiphyGif, btn: HTMLButtonElement) => {
    if (btn.classList.contains("is-busy")) return;
    btn.classList.add("is-busy");
    setStatus("Importing…");
    try {
      const file = await giphyGifFile(gif);
      closeGiphy();
      opts.onPick(file, { kind: "giphy", id: gif.id });
    } catch {
      btn.classList.remove("is-busy");
      setStatus("Couldn’t import that GIF. Try another.");
      updateMore();
    }
  };

  const applyPage = (next: Awaited<ReturnType<typeof searchGiphy>>, replace: boolean) => {
    if (replace) {
      grid.replaceChildren();
      seen.clear();
    }
    page = next.page;
    total = next.total;
    totalPages = next.totalPages;
    appendGifs(next.gifs);
    if (loaded) card.classList.add("has-results");
    else card.classList.remove("has-results");
    setStatus(resultStatus());
    updateMore();
  };

  const failSearch = (err: unknown) => {
    resetResults();
    const msg = err instanceof Error ? err.message : "";
    if (/401|403|invalid|Unauthorized/i.test(msg)) {
      setStatus("Invalid API key — re-paste it in .env and restart.");
    } else if (/429|rate/i.test(msg)) {
      setStatus("Rate limit hit — try again in a bit.");
    } else {
      setStatus("Search failed. Check your API key / rate limit.");
    }
  };

  const fetchPage = (query: string, nextPage: number) =>
    query ? searchGiphy(query, nextPage) : trendingGiphy(nextPage);

  const runSearch = (query: string) => {
    const q = query.trim();
    const gen = ++searchGen;
    activeQuery = q;
    loadingMore = false;
    setStatus(q ? "Searching…" : "Loading trending…");
    updateMore();
    void fetchPage(q, 1)
      .then((next) => {
        if (gen !== searchGen) return;
        if (!next.gifs.length) {
          resetResults();
          setStatus("No GIFs found.");
          return;
        }
        applyPage(next, true);
      })
      .catch((err: unknown) => {
        if (gen !== searchGen) return;
        failSearch(err);
      });
  };

  const loadMore = () => {
    if (loadingMore || page >= totalPages) return;
    const gen = searchGen;
    loadingMore = true;
    updateMore();
    void fetchPage(activeQuery, page + 1)
      .then((next) => {
        if (gen !== searchGen) return;
        loadingMore = false;
        applyPage(next, false);
        moreBtn.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
      })
      .catch((err: unknown) => {
        if (gen !== searchGen) return;
        loadingMore = false;
        updateMore();
        const msg = err instanceof Error ? err.message : "";
        if (/429|rate/i.test(msg)) setStatus("Rate limit hit — try again in a bit.");
        else setStatus("Couldn’t load more GIFs.");
      });
  };

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("[data-giphy-close]")) closeGiphy();
    if (target.closest("[data-giphy-load-more]")) loadMore();
  });

  onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeGiphy();
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

  if (!giphyConfigured()) {
    input.disabled = true;
    setStatus(
      import.meta.env.DEV
        ? "Add VITE_GIPHY_API_KEY to .env and restart the dev server."
        : "Giphy search isn’t configured for this build.",
    );
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
