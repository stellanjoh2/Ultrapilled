/** Shrink past max-width so a tip shell hugs the longest wrapped line. */
export function hugTipWidth(el: HTMLElement) {
  const max = Math.ceil(el.getBoundingClientRect().width);
  if (max <= 1) return;
  const height = el.offsetHeight;
  el.style.width = "min-content";
  let lo = Math.min(Math.ceil(el.offsetWidth), max);
  let hi = max;
  let best = max;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    el.style.width = `${mid}px`;
    if (el.offsetHeight > height) lo = mid + 1;
    else {
      best = mid;
      hi = mid - 1;
    }
  }
  el.style.width = `${best}px`;
}
