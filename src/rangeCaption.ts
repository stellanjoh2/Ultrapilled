/**
 * Split name/value range captions and Figma-style double-click value editing.
 * Value span becomes a text field; Enter/blur commit, Escape cancels.
 * Commit clamps to the paired range input's min/max/step, then dispatches input/change.
 */

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Markup for a caption with a separately editable numeric value. */
export function rangeCaptionHtml(key: string, name: string, value: string): string {
  return `<span class="field-caption" data-range-label="${escapeHtml(key)}"><span class="field-caption-name">${escapeHtml(name)}</span> <span class="field-caption-value">${escapeHtml(value)}</span></span>`;
}

/** Update only the numeric/readout part (keeps the name span intact). */
export function setRangeCaptionValue(caption: Element | null | undefined, value: string): void {
  if (!caption) return;
  const valueEl = caption.querySelector(".field-caption-value");
  if (valueEl) {
    valueEl.textContent = value;
    return;
  }
  // Mid-edit the value node is an <input class="field-caption-input"> — skip; commit restores a span.
  if (caption.querySelector(".field-caption-input")) return;
}

/** Parse the first number from typed text (strips units like K, °, s, ×, %). */
export function parseTypedRangeValue(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/-?\d*\.?\d+(?:[eE][+-]?\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

/** Clamp to [min, max] and snap to step (HTML range semantics). */
export function snapRangeValue(value: number, min: number, max: number, step: number): number {
  const lo = Number.isFinite(min) ? min : value;
  const hi = Number.isFinite(max) ? max : value;
  let v = Math.max(lo, Math.min(hi, value));
  if (!Number.isFinite(step) || step <= 0) return v;
  const stepped = Math.round((v - lo) / step) * step + lo;
  const stepStr = String(step);
  const dot = stepStr.indexOf(".");
  const decimals = dot >= 0 ? stepStr.length - dot - 1 : 0;
  v = decimals > 0 ? Number(stepped.toFixed(Math.min(decimals, 10))) : Math.round(stepped);
  return Math.max(lo, Math.min(hi, v));
}

type ActiveEdit = {
  finish: (commit: boolean) => void;
};

let activeEdit: ActiveEdit | null = null;

/** Cancel any in-progress value edit without committing. */
export function cancelRangeValueEdit(): void {
  activeEdit?.finish(false);
}

function findRangeInput(caption: Element, root: ParentNode = document): HTMLInputElement | null {
  const key = (caption as HTMLElement).dataset.rangeLabel;
  const field = caption.closest(".field, label");
  const inField = field?.querySelector<HTMLInputElement>("input[type='range']");
  if (inField) return inField;
  if (!key) return null;
  if (key === "loopSec") {
    const yt = field?.querySelector<HTMLInputElement>("[data-youtube-loop]");
    if (yt) return yt;
  }
  const byId = root.querySelector<HTMLInputElement>(`#${CSS.escape(key)}`);
  if (byId?.type === "range") return byId;
  const byKey = field?.querySelector<HTMLInputElement>(`input[data-key="${CSS.escape(key)}"]`);
  if (byKey?.type === "range") return byKey;
  return root.querySelector<HTMLInputElement>(`input[data-key="${CSS.escape(key)}"][type="range"]`);
}

function beginRangeValueEdit(_caption: Element, input: HTMLInputElement, valueEl: HTMLElement): void {
  if (activeEdit) activeEdit.finish(true);

  const previous = valueEl.textContent ?? "";
  const edit = document.createElement("input");
  edit.type = "text";
  edit.className = "field-caption-input";
  edit.value = previous;
  edit.inputMode = "decimal";
  edit.autocomplete = "off";
  edit.spellcheck = false;
  edit.setAttribute("aria-label", "Edit value");
  // Size to content so the row doesn't jump; tabular nums keep width stable.
  edit.style.width = `${Math.max(previous.length + 1, 3)}ch`;

  valueEl.replaceWith(edit);

  const abort = new AbortController();
  const { signal } = abort;
  let finished = false;

  const finish = (commit: boolean) => {
    if (finished) return;
    finished = true;
    abort.abort();
    if (activeEdit?.finish === finish) activeEdit = null;

    const span = document.createElement("span");
    span.className = "field-caption-value";

    if (!commit) {
      span.textContent = previous;
      edit.replaceWith(span);
      return;
    }

    const parsed = parseTypedRangeValue(edit.value);
    if (parsed == null) {
      span.textContent = previous;
      edit.replaceWith(span);
      return;
    }

    const min = Number(input.min);
    const max = Number(input.max);
    const stepRaw = input.step;
    const step = stepRaw === "any" || stepRaw === "" ? NaN : Number(stepRaw);
    const snapped = snapRangeValue(parsed, min, max, step);

    // Restore a value span before dispatch so caption updaters can find it.
    span.textContent = String(snapped);
    edit.replaceWith(span);

    if (String(input.value) !== String(snapped)) {
      input.value = String(snapped);
    } else {
      // Force handlers even when the numeric value is unchanged after re-type.
      input.value = String(snapped);
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  activeEdit = { finish };

  edit.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        finish(true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        finish(false);
      }
    },
    { signal },
  );

  edit.addEventListener(
    "blur",
    () => {
      // Defer so a click that blurs can settle; Escape path aborts first.
      queueMicrotask(() => finish(true));
    },
    { signal },
  );

  // Focus after dblclick finishes so select-all isn't cleared.
  window.setTimeout(() => {
    if (finished) return;
    edit.focus();
    edit.select();
  }, 0);
}

/** Double-click the readout value → type a number (Enter/blur commit, Escape cancel). */
export function bindRangeValueEdit(caption: Element, input: HTMLInputElement): void {
  caption.addEventListener("dblclick", (event) => {
    if (input.disabled) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const valueEl = target.closest(".field-caption-value");
    if (!valueEl || !caption.contains(valueEl)) return;
    event.preventDefault();
    event.stopPropagation();
    beginRangeValueEdit(caption, input, valueEl as HTMLElement);
  });
}

/** Wire every range caption under root to its paired range input. */
export function wireRangeCaptions(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>("[data-range-label]").forEach((caption) => {
    if (!caption.querySelector(".field-caption-value")) return;
    const input = findRangeInput(caption, root);
    if (input) bindRangeValueEdit(caption, input);
  });
}
