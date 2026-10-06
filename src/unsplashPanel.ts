import gsap from "gsap";
import type { ImageRemote } from "./types";
import {
  searchUnsplash,
  unsplashConfigured,
  unsplashPhotoFile,
  withUnsplashUtm,
  type UnsplashPhoto,
} from "./unsplashApi";
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

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function isUnsplashOpen(): boolean {
  return Boolean(modalRoot);
}

export function closeUnsplash(): void {
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

export function openUnsplashImport(opts: { onPick: (file: File, remote?: ImageRemote) => void }): void {
  if (modalRoot || closing) return;

  const root = document.createElement("div");
  root.className = "unsplash-modal";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "unsplash-modal-title");
  root.innerHTML = `
    <div class="unsplash-modal__scrim" data-unsplash-close></div>
    <div class="unsplash-modal__card">
      <header class="unsplash-modal__head">
        <h2 class="unsplash-modal__title" id="unsplash-modal-title">Import from Unsplash</h2>
        <button type="button" class="unsplash-modal__x icon-hover" data-unsplash-close aria-label="Close" data-tip="Close">
          <span aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M18.3 5.7 13 11l5.3 5.3-1.4 1.4L11.6 12.4 6.3 17.7 4.9 16.3 10.2 11 4.9 5.7 6.3 4.3l5.3 5.3 5.3-5.3z"/></svg></span>
        </button>
      </header>
      <div class="unsplash-modal__body">
        <label class="field unsplash-modal__search" data-tip="Search photos on Unsplash">Search Unsplash
          <input type="search" data-unsplash-query placeholder="mountains, neon, portrait…" autocomplete="off" />
        </label>
        <p class="unsplash-modal__status" data-unsplash-status hidden></p>
        <div class="unsplash-grid-scroll">
          <div class="unsplash-grid" data-unsplash-grid></div>
        </div>
        <div class="unsplash-modal__more" data-unsplash-more hidden>
          <button type="button" class="pill pill--commit unsplash-modal__more-btn" data-unsplash-load-more data-tip="Load the next page of photos">
            Show more photos
          </button>
        </div>
      </div>
      <footer class="unsplash-modal__foot">
        <p class="unsplash-modal__credit">
          Photos from
          <a href="${withUnsplashUtm("https://unsplash.com")}" target="_blank" rel="noopener noreferrer">Unsplash</a>
        </p>
      </footer>
    </div>
  `;

  const scrim = root.querySelector<HTMLElement>(".unsplash-modal__scrim")!;
  const card = root.querySelector<HTMLElement>(".unsplash-modal__card")!;
  const input = root.querySelector<HTMLInputElement>("[data-unsplash-query]")!;
  const status = root.querySelector<HTMLElement>("[data-unsplash-status]")!;
  const grid = root.querySelector<HTMLElement>("[data-unsplash-grid]")!;
  const moreWrap = root.querySelector<HTMLElement>("[data-unsplash-more]")!;
  const moreBtn = root.querySelector<HTMLButtonElement>("[data-unsplash-load-more]")!;

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
    moreBtn.textContent = loadingMore ? "Loading…" : "Show more photos";
  };

  const resultStatus = () => {
    if (!loaded) return "No photos found.";
    if (total > loaded) {
      return `Showing ${formatCount(loaded)} of ${formatCount(total)} photos`;
    }
    return `${formatCount(loaded)} photos`;
  };

  const appendPhotos = (photos: UnsplashPhoto[]) => {
    for (const photo of photos) {
      if (seen.has(photo.id)) continue;
      seen.add(photo.id);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "unsplash-grid__item";
      btn.title = `${photo.alt} — ${photo.photographer}`;
      btn.innerHTML = `
        <img src="${photo.thumb}" alt="" loading="lazy" draggable="false" />
        <span class="unsplash-grid__by">
          <a href="${photo.profileUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(photo.photographer)}</a>
        </span>
      `;
      btn.querySelector("a")?.addEventListener("click", (event) => event.stopPropagation());
      btn.addEventListener("click", () => {
        void pickPhoto(photo, btn);
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

  const pickPhoto = async (photo: UnsplashPhoto, btn: HTMLButtonElement) => {
    if (btn.classList.contains("is-busy")) return;
    btn.classList.add("is-busy");
    setStatus("Importing…");
    try {
      const file = await unsplashPhotoFile(photo);
      closeUnsplash();
      opts.onPick(file, { kind: "unsplash", id: photo.id });
    } catch {
      btn.classList.remove("is-busy");
      setStatus("Couldn’t import that photo. Try another.");
      updateMore();
    }
  };

  const applyPage = (next: Awaited<ReturnType<typeof searchUnsplash>>, replace: boolean) => {
    if (replace) {
      grid.replaceChildren();
      seen.clear();
    }
    page = next.page;
    total = next.total;
    totalPages = next.totalPages;
    appendPhotos(next.photos);
    if (loaded) card.classList.add("has-results");
    else card.classList.remove("has-results");
    setStatus(resultStatus());
    updateMore();
  };

  const failSearch = (err: unknown) => {
    resetResults();
    const msg = err instanceof Error ? err.message : "";
    if (/401|invalid|Unauthorized/i.test(msg)) {
      setStatus("Invalid Access Key — re-paste it in .env and restart.");
    } else if (/403|rate/i.test(msg)) {
      setStatus("Rate limit hit — try again in a bit.");
    } else {
      setStatus("Search failed. Check your Access Key / rate limit.");
    }
  };

  const runSearch = (query: string) => {
    const q = query.trim();
    const gen = ++searchGen;
    activeQuery = q;
    if (!q) {
      resetResults();
      setStatus("");
      return;
    }
    loadingMore = false;
    setStatus("Searching…");
    updateMore();
    void searchUnsplash(q, 1)
      .then((next) => {
        if (gen !== searchGen) return;
        if (!next.photos.length) {
          resetResults();
          setStatus("No photos found.");
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
    if (!activeQuery || loadingMore || page >= totalPages) return;
    const gen = searchGen;
    loadingMore = true;
    updateMore();
    void searchUnsplash(activeQuery, page + 1)
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
        if (/403|rate/i.test(msg)) setStatus("Rate limit hit — try again in a bit.");
        else setStatus("Couldn’t load more photos.");
      });
  };

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("[data-unsplash-close]")) closeUnsplash();
    if (target.closest("[data-unsplash-load-more]")) loadMore();
  });

  onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeUnsplash();
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

  if (!unsplashConfigured()) {
    input.disabled = true;
    setStatus(
      import.meta.env.DEV
        ? "Add VITE_UNSPLASH_ACCESS_KEY to .env and restart the dev server."
        : "Unsplash search isn’t configured for this build.",
    );
  } else {
    setStatus("");
  }

  // Focus after the card is visible — gsap autoAlpha:0 would otherwise drop focus.
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
