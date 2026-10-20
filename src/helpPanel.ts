import gsap from "gsap";
import arrowLeftIcon from "@phosphor-icons/core/assets/regular/arrow-left.svg?raw";
import { holdPhysicsForOverlay, releasePhysicsForOverlay } from "./physicsOverlayHold";
import { playRemove, playTransition } from "./uiSounds";

let modalRoot: HTMLElement | null = null;
let closing = false;
let onKey: ((event: KeyboardEvent) => void) | null = null;

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function modKeyLabel(): string {
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) || /Mac/.test(navigator.userAgent)
    ? "⌘"
    : "Ctrl";
}

function altKeyLabel(): string {
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) || /Mac/.test(navigator.userAgent)
    ? "⌥"
    : "Alt";
}

function keycap(label: string): string {
  return `<kbd class="keycap">${label}</kbd>`;
}

/** Orby lime — sparingly, for fun / important phrases. */
function fun(text: string): string {
  return `<span class="help-fun">${text}</span>`;
}

/** Soft purple pop — even rarer than lime. */
function pop(text: string): string {
  return `<span class="help-pop">${text}</span>`;
}

function tocLink(id: string, label: string): string {
  return `<a class="help-toc__link" href="#${id}">${label}</a>`;
}

function guideBody(): string {
  const mod = modKeyLabel();
  const alt = altKeyLabel();

  return `
    <p class="help-lede">
      New here? This walks you through the ${fun("fun stuff")} — right-clicking objects onto the canvas,
      editing text, ${fun("triggering the fall")}, tuning the look, exporting, and ${fun("sharing a link")} when you’re ready.
      Take it section by section, or jump around with the chips below.
    </p>

    <nav class="help-toc" aria-label="Guide sections">
      ${tocLink("help-why", "Why")}
      ${tocLink("help-vibe", "Vibe")}
      ${tocLink("help-canvas", "Canvas")}
      ${tocLink("help-objects", "Objects")}
      ${tocLink("help-text", "Text")}
      ${tocLink("help-panel", "Panel")}
      ${tocLink("help-physics", "Physics")}
      ${tocLink("help-bounce", "Bounce")}
      ${tocLink("help-layout", "Layout")}
      ${tocLink("help-optical", "Optical")}
      ${tocLink("help-menus", "Menus")}
      ${tocLink("help-media", "Media")}
      ${tocLink("help-orby", "Orby")}
      ${tocLink("help-export", "Export")}
      ${tocLink("help-share", "Share")}
      ${tocLink("help-path", "Path")}
      ${tocLink("help-index", "Index")}
    </nav>

    <section class="help-section" id="help-why">
      <h3 class="help-section__title">What’s this for?</h3>
      <p>
        Ultrapilled is a ${fun("design tool")} driven by physics —
        type, shapes, icons, and motion on a canvas, without opening a full motion suite.
      </p>
      <p>Maybe you’re…</p>
      <ul class="help-list">
        <li>running a restaurant and need looping price boards for the TVs — drop your artwork on the background and you’re branded</li>
        <li>making club-night or VJ graphics that actually move — for Stories, Reels, or the screens</li>
        <li>whipping together a few fun slides for a school presentation in Layout mode</li>
        <li>pulling a quick moodboard together and saving it out before the meeting</li>
        <li>or you just want to drop things on a canvas and watch ${pop("gravity")} do the rest</li>
      </ul>
    </section>

    <section class="help-section" id="help-vibe">
      <h3 class="help-section__title">1. Choose your vibe</h3>
      <p>When you open Ultrapilled you pick a mode:</p>
      <div class="help-table" role="table" aria-label="Design modes">
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">${fun("Physics")}</span>
          <span class="help-table__val" role="cell">Design, then ${pop("chaos")}. Objects fall, bounce, and stack.</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Layout</span>
          <span class="help-table__val" role="cell">Place freely. Overlap is fine. No gravity.</span>
        </div>
      </div>
      <p>You can also <strong>Load Project</strong> (a <code>.pill</code> file) from this screen.</p>
      <p class="help-note"><span class="help-fun">Tip:</span> start in Physics for the classic loop. Switch later with ${keycap("L")} or Settings → Design Mode.</p>
      <p>If you turned on <strong>Remember last</strong>, you may see Reconnect — restore your last session or start fresh.</p>
    </section>

    <section class="help-section" id="help-canvas">
      <h3 class="help-section__title">2. Meet the canvas</h3>
      <p>
        Pick an aspect ratio under Create → Canvas
        (16:9, 1:1, 3:4, or 9:16). Change <strong>Canvas color</strong> anytime.
      </p>
      <p>There’s no pan or zoom — the frame fits the window. Hide the UI with ${keycap("H")} for a clean look.</p>
      <div class="help-table" role="table" aria-label="Canvas basics">
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Select</span>
          <span class="help-table__val" role="cell">Click an object</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Multi-select</span>
          <span class="help-table__val" role="cell">${keycap("⇧")}${keycap("Click")}</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Deselect</span>
          <span class="help-table__val" role="cell">${keycap("Esc")}, or click empty canvas</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Move</span>
          <span class="help-table__val" role="cell">Drag · hold ${keycap("⇧")} for a straight line</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Scale + rotate</span>
          <span class="help-table__val" role="cell">Drag a corner handle</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Scale only</span>
          <span class="help-table__val" role="cell">${keycap("⇧")} from corner · ${keycap("⇧")}${keycap(alt)} from center</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Delete</span>
          <span class="help-table__val" role="cell">${keycap("⌫")} or ${keycap("Del")}</span>
        </div>
      </div>
    </section>

    <section class="help-section" id="help-objects">
      <h3 class="help-section__title">3. Your first object</h3>
      <p>Empty canvas? ${fun("Right-click")} the canvas — or use Create → Objects.</p>
      <h4 class="help-section__sub">Ways to add</h4>
      <ul class="help-list">
        <li><strong>Right-click</strong> empty canvas — places at the cursor</li>
        <li><strong>Create → Objects</strong> buttons</li>
        <li><strong>Drag &amp; drop</strong> files (SVG, PNG, JPG, GIF, MP4)</li>
        <li>Templates, Icon, Unsplash, Giphy, YouTube</li>
      </ul>
      <h4 class="help-section__sub">Object types</h4>
      <div class="help-table" role="table" aria-label="Object types">
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Pill</span>
          <span class="help-table__val" role="cell">Text inside a rounded pill</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Words</span>
          <span class="help-table__val" role="cell">One-line type sized to the letters</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Longer text</span>
          <span class="help-table__val" role="cell">Wrapping box you can resize and paste into</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Shape</span>
          <span class="help-table__val" role="cell">Library shapes — stars, moons, waves…</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Emoji</span>
          <span class="help-table__val" role="cell">Emoji, with search</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Icon</span>
          <span class="help-table__val" role="cell">Search Phosphor — Solid or Outlined</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Image</span>
          <span class="help-table__val" role="cell">Your SVG / PNG / JPG / GIF / MP4</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Unsplash</span>
          <span class="help-table__val" role="cell">Search photos</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Giphy</span>
          <span class="help-table__val" role="cell">Search GIFs</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">YouTube</span>
          <span class="help-table__val" role="cell">Muted looping clip</span>
        </div>
      </div>
      <p class="help-note">
        Icons from
        <a class="help-link" href="https://phosphoricons.com/" target="_blank" rel="noopener noreferrer">Phosphor</a>
        (MIT). Shapes from
        <a class="help-link" href="https://www.shapes.gallery/" target="_blank" rel="noopener noreferrer">shapes.gallery</a>.
      </p>
      <p class="help-note"><span class="help-fun">Try this first:</span> right-click → Pill → type something short.</p>
    </section>

    <section class="help-section" id="help-text">
      <h3 class="help-section__title">4. Edit text</h3>
      <div class="help-table" role="table" aria-label="Text editing">
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Edit</span>
          <span class="help-table__val" role="cell">${fun("Double-click")}, or select + ${keycap("Enter")}, or right-click → Edit text</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Finish</span>
          <span class="help-table__val" role="cell">${keycap("Esc")} (Words also accept ${keycap("Enter")}), or click away</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Paste</span>
          <span class="help-table__val" role="cell">Into Longer text while editing</span>
        </div>
      </div>
      <ul class="help-list">
        <li><strong>Words</strong> — headlines, stickers, punchy short lines</li>
        <li><strong>Pill</strong> — labels with a filled shape behind them</li>
        <li><strong>Longer text</strong> — paragraphs; corner drag reflows the box</li>
      </ul>
    </section>

    <section class="help-section" id="help-panel">
      <h3 class="help-section__title">5. The Create panel</h3>
      <p>Right side — three tabs:</p>
      <div class="help-table" role="table" aria-label="Panel tabs">
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Create</span>
          <span class="help-table__val" role="cell">Objects, physics, composition, themes, type</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Background</span>
          <span class="help-table__val" role="cell">Canvas fill, grid, artwork</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Export</span>
          <span class="help-table__val" role="cell">Stills, sequences, GIF, video</span>
        </div>
      </div>
      <ul class="help-list">
        <li><strong>${fun("Trigger Physics")}</strong> (${keycap("P")}) — run / restart the fall</li>
        <li><strong>Loop</strong> — after Floor pause, the floor opens on a timer and the cycle repeats</li>
        <li><strong>Settings</strong> — sound, theme, shortcuts</li>
        <li>Floppy icon — Save / Load <code>.pill</code></li>
        <li>Share icon — temporary link (14 days); see <a class="help-link" href="#help-share">Share a link</a></li>
      </ul>
      <p>
        The <strong>Objects</strong> list is everything on the canvas. Drag cards to change fall / stack order
        (top falls in front). Expand a card for that object’s controls.
      </p>
    </section>

    <section class="help-section" id="help-physics">
      <h3 class="help-section__title">6. Physics — make it fall</h3>
      <ol class="help-list help-list--numbered">
        <li>Add a few objects</li>
        <li>Hit Trigger Physics or press ${keycap("P")}</li>
        <li>When the pile settles, try ${fun("Bounce")} with ${keycap("Space")}</li>
      </ol>
      <p>While things are live you can grab and throw them.</p>
      <p>
        Tune Gravity, Speed, Bounciness, and friends under Create → Physics.
        <strong>Composition</strong> sets global scale, size random, and amount of shapes.
        Per-object <strong>Amount</strong> is how many copies of that object exist.
      </p>
      <p class="help-note"><span class="help-fun">Pro move:</span> Loop + a longer Floor pause = settle, then dump, forever — great for looping exports.</p>
    </section>

    <section class="help-section" id="help-bounce">
      <h3 class="help-section__title">7. Bounce — shake the floor</h3>
      <p>
        ${fun("Bounce")} is a quick floor bump while Physics is live.
        Tap ${keycap("Space")} for a light shake; hold longer to ${pop("charge")} a bigger bounce, then release — like charging a shot.
      </p>
      <ul class="help-list">
        <li>Idle canvas — ${keycap("Space")} still starts the fall</li>
        <li>Live pile — ${keycap("Space")} bounces the floor (hold = stronger)</li>
        <li>Layout mode — Bounce is off (no gravity floor)</li>
      </ul>
      <p class="help-note">
        <span class="help-fun">Handy when:</span> the pile settles somewhere you don’t love — bounce it and see what happens.
      </p>
    </section>

    <section class="help-section" id="help-layout">
      <h3 class="help-section__title">8. Layout — place freely</h3>
      <p>Press ${keycap("L")} (or Settings → Design Mode → Layout).</p>
      <ul class="help-list">
        <li>No gravity; objects can overlap</li>
        <li>Right-click layering: front / forward / backward / back</li>
        <li><strong>Align straight</strong> on the context menu</li>
        <li><strong>Lock</strong> objects you don’t want to nudge</li>
        <li>Drop shadow and blend modes for depth</li>
      </ul>
      <p>
        Layout gets pages: duplicate, remove, and <strong>Presentation mode</strong>
        (${keycap("←")} / ${keycap("→")}, Space). ${keycap("Esc")} exits.
      </p>
    </section>

    <section class="help-section" id="help-optical">
      <h3 class="help-section__title">9. Optical workflows</h3>
      <p>Where Ultrapilled stops feeling like a toy and starts feeling like a ${fun("composition tool")}.</p>
      <ul class="help-list">
        <li><strong>Grid</strong> (${keycap("G")}) — ratio-locked square guides under Background</li>
        <li><strong>Text height</strong> — nudge Y when a font sits off-center</li>
        <li><strong>Color theme</strong> — pick a system, or View Themes (Common / Retro / Feral)</li>
        <li><strong>Copy style / Paste style</strong> — match look without copying the object</li>
        <li><strong>Invert</strong> (${keycap("I")}) — straight color invert</li>
        <li><strong>Gradients</strong> — drag on-canvas stops to rotate and scale; click to pick</li>
        <li><strong>Look</strong> — bloom, grain, vignette, saturate on the whole frame</li>
        <li><strong>Background</strong> — solid, gradient, or image; optional artwork behind/in front</li>
        <li><strong>Templates</strong> — open one, strip it down, steal the structure</li>
      </ul>
    </section>

    <section class="help-section" id="help-menus">
      <h3 class="help-section__title">10. Right-click is a second toolbar</h3>
      <p>Empty canvas: add objects, Hide UI, Clear canvas.</p>
      <p>
        On an object: Duplicate, Edit text, Copy/Paste style, Invert, Flip, Animate,
        Recolor, Replace, layer controls, Remove.
      </p>
      <h4 class="help-section__sub">Keyboard favorites</h4>
      <div class="help-table" role="table" aria-label="Keyboard shortcuts">
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">${fun("Bounce")}</span>
          <span class="help-table__val" role="cell">${keycap("Space")} · hold to charge</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">${fun("Trigger physics")}</span>
          <span class="help-table__val" role="cell">${keycap("P")}</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Hide UI</span>
          <span class="help-table__val" role="cell">${keycap("H")}</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Grid</span>
          <span class="help-table__val" role="cell">${keycap("G")}</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Collision boxes</span>
          <span class="help-table__val" role="cell">${keycap("C")}</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Layout ↔ Physics</span>
          <span class="help-table__val" role="cell">${keycap("L")}</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Invert</span>
          <span class="help-table__val" role="cell">${keycap("I")}</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Duplicate</span>
          <span class="help-table__val" role="cell">${keycap("⇧")}${keycap("D")} or ${keycap(mod)}${keycap("D")}</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Copy / Paste</span>
          <span class="help-table__val" role="cell">${keycap(mod)}${keycap("C")} / ${keycap(mod)}${keycap("V")}</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Undo / Redo</span>
          <span class="help-table__val" role="cell">${keycap(mod)}${keycap("Z")} / ${keycap(mod)}${keycap("⇧")}${keycap("Z")}</span>
        </div>
      </div>
      <p class="help-note">Full list lives in Settings → Keyboard Shortcuts.</p>
    </section>

    <section class="help-section" id="help-media">
      <h3 class="help-section__title">11. Icons, images, GIFs, and video</h3>
      <ul class="help-list">
        <li>Drop files on the canvas, or use Icon / Image / Unsplash / Giphy / YouTube</li>
        <li>Icon: search Phosphor (Solid / Outlined) — bundled with the app, no API key</li>
        <li>Raster images: Exposure, Contrast, Saturation, Temperature (Kelvin), Hue</li>
        <li>SVGs &amp; icons: Recolor vs original</li>
        <li>Collision type Box vs Sphere — ${keycap("C")} shows boxes</li>
        <li>YouTube: paste a URL, set loop length, muted autoplay loop</li>
      </ul>
      <p class="help-note">
        Export note: YouTube embeds and uploaded video don’t rasterize into stills / GIF / video —
        you’ll get a stand-in. Prefer shapes, icons, text, photos, and GIFs when you need a clean file.
      </p>
    </section>

    <section class="help-section" id="help-orby">
      <h3 class="help-section__title">Need more assets to work with?</h3>
      <p>
        Make your own ${fun("looping 3D GIFs")} in
        <a class="help-link help-fun" href="https://orby.studio/" target="_blank" rel="noopener noreferrer">Orby</a>
        — a free 3D studio that runs in your browser, by the same creator as Ultrapilled.
        Drop a GLB or SVG, light it or apply a shader, spin a turntable, and export a GIF (or a transparent PNG still).
        Then drag the file into Ultrapilled like any other object.
      </p>
      <p class="help-note">
        <span class="help-fun">Tip:</span> larger GIFs work fine too — a light starting point is
        ${fun("480p")} · ${fun("15 fps")} · ${fun("2 s")} if you want to keep file sizes down.
      </p>
      <p>
        Need a model? There’s a ton of free 3D assets in <code>.glb</code> on
        <a class="help-link" href="https://sketchfab.com/" target="_blank" rel="noopener noreferrer">Sketchfab</a>
        and
        <a class="help-link" href="https://www.fab.com/" target="_blank" rel="noopener noreferrer">Fab</a>.
      </p>
      <div class="help-orby-gifs" role="group" aria-label="Example Orby-style GIFs from templates">
        <figure class="help-orby-gifs__item">
          <img src="/templates/miami/template-miami-testarossa.gif" alt="Testarossa turntable GIF" width="160" height="160" loading="lazy" decoding="async" />
        </figure>
        <figure class="help-orby-gifs__item">
          <img src="/templates/halloween/pumpkin-low-poly.gif" alt="Pumpkin turntable GIF" width="160" height="160" loading="lazy" decoding="async" />
        </figure>
        <figure class="help-orby-gifs__item">
          <img src="/templates/berlin/template-berlin-skull.gif" alt="Skull turntable GIF" width="160" height="160" loading="lazy" decoding="async" />
        </figure>
      </div>
      <a class="help-orby-cta" href="https://orby.studio/" target="_blank" rel="noopener noreferrer">
        <span class="help-orby-cta__label">Visit Orby.studio</span>
      </a>
    </section>

    <section class="help-section" id="help-export">
      <h3 class="help-section__title">12. Save &amp; export</h3>
      <div class="help-table" role="table" aria-label="Save and export">
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Keep working</span>
          <span class="help-table__val" role="cell">Floppy → Save .pill</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Open again</span>
          <span class="help-table__val" role="cell">Load .pill · or open a Share link</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Auto-draft</span>
          <span class="help-table__val" role="cell">Settings → Remember last</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Still / sequence</span>
          <span class="help-table__val" role="cell">Export → Image (PNG/JPG)</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Movie</span>
          <span class="help-table__val" role="cell">Export → Video (MP4 / MOV)</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Loop clip</span>
          <span class="help-table__val" role="cell">Export → GIF</span>
        </div>
      </div>
      <p>
        Your exports are yours — no Ultrapilled credit required on the output.
        But if you enjoy the tool, have feedback, or want to show me what you’ve made,
        reach out on
        <a class="help-link" href="https://x.com/johstell" target="_blank" rel="noopener noreferrer">X</a>
        — I’d be happy to hear from you.
      </p>
    </section>

    <section class="help-section" id="help-share">
      <h3 class="help-section__title">13. Share a link</h3>
      <p>
        Want someone to open the scene — not just a still or GIF?
        Tap the ${fun("Share")} icon next to Save. You’ll see the packed size, confirm, and pass a quick security check.
        Nothing leaves the browser until you continue.
      </p>
      <ul class="help-list">
        <li>Link lasts ${fun("14 days")}, then it’s deleted</li>
        <li>About ${fun("8 MB")} max — prefer Unsplash / Giphy over huge uploads when you can</li>
        <li>Unsplash photos and Giphy GIFs stay as CDN links; your own uploads travel inside the file</li>
        <li>Anyone with the link can open and remake the scene — no public gallery, just an unlisted ID</li>
        <li>Desktop opens the full editor; phones get a simple viewer (${fun("Trigger Physics")} + pinch)</li>
      </ul>
      <p class="help-note">
        <span class="help-fun">Tip:</span> keep a <code>.pill</code> save for yourself. Share is for sending;
        Save is for keeping.
      </p>
    </section>

    <section class="help-section" id="help-path">
      <h3 class="help-section__title">14. A gentle learning path</h3>
      <ol class="help-list help-list--numbered">
        <li>Pick Physics, aspect 16:9</li>
        <li>Right-click → add a Pill, a few Shapes, and an Icon</li>
        <li>Double-click the pill text; change the words</li>
        <li>Nudge Color theme; turn on Grid (${keycap("G")})</li>
        <li>Press ${keycap("P")} — watch the fall</li>
        <li>When it settles, tap or hold ${keycap("Space")} to ${fun("Bounce")}</li>
        <li>Tweak Gravity / Bounciness once</li>
        <li>${keycap("H")} to hide UI; admire; ${keycap("H")} again</li>
        <li>Export a PNG, then Save .pill</li>
        <li>Optional: Share a link so a friend can remake it</li>
        <li>Press ${keycap("L")}, arrange overlapping layers, try Presentation</li>
      </ol>
      <p>${fun("That’s the whole loop.")} Everything else is taste, templates, and optical polish.</p>
    </section>

    <section class="help-section" id="help-index">
      <h3 class="help-section__title">Quick index</h3>
      <div class="help-table" role="table" aria-label="Quick index">
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Create at cursor</span>
          <span class="help-table__val" role="cell">Right-click canvas</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Edit type</span>
          <span class="help-table__val" role="cell">Double-click or ${keycap("Enter")}</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Run the fall</span>
          <span class="help-table__val" role="cell">${keycap("P")}</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">${fun("Bounce")}</span>
          <span class="help-table__val" role="cell">${keycap("Space")} · hold to charge</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Clean view</span>
          <span class="help-table__val" role="cell">${keycap("H")}</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Free place</span>
          <span class="help-table__val" role="cell">${keycap("L")}</span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">Project file</span>
          <span class="help-table__val" role="cell"><code>.pill</code></span>
        </div>
        <div class="help-table__row" role="row">
          <span class="help-table__key" role="cell">${fun("Share link")}</span>
          <span class="help-table__val" role="cell">Share icon · 14 days</span>
        </div>
      </div>
    </section>
  `;
}

function bindToc(body: HTMLElement): void {
  body.querySelectorAll<HTMLAnchorElement>('a[href^="#help-"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href?.startsWith("#")) return;
      const target = body.querySelector<HTMLElement>(href);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
    });
  });
}

export function isHelpOpen(): boolean {
  return Boolean(modalRoot);
}

export function closeHelp(): void {
  if (!modalRoot || closing) return;
  closing = true;
  const root = modalRoot;
  const scrim = root.querySelector<HTMLElement>(".help-modal__scrim");
  const sheet = root.querySelector<HTMLElement>(".help-modal__sheet");
  if (onKey) window.removeEventListener("keydown", onKey);
  onKey = null;
  playRemove();

  document.querySelectorAll<HTMLButtonElement>("[data-open-help]").forEach((btn) => {
    btn.classList.remove("is-on");
    btn.setAttribute("aria-expanded", "false");
  });

  const done = () => {
    root.remove();
    modalRoot = null;
    closing = false;
    releasePhysicsForOverlay();
  };

  if (reducedMotion() || !scrim || !sheet) {
    done();
    return;
  }

  const tl = gsap.timeline({ onComplete: done });
  tl.to(sheet, { x: -48, autoAlpha: 0, duration: 0.28, ease: "power2.in" }, 0);
  tl.to(scrim, { autoAlpha: 0, duration: 0.28, ease: "power1.in" }, 0);
}

export function openHelp(): void {
  if (modalRoot || closing) return;

  const root = document.createElement("div");
  root.className = "help-modal";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "help-modal-title");
  root.innerHTML = `
    <div class="help-modal__scrim" data-help-close></div>
    <div class="help-modal__sheet">
      <header class="help-modal__head">
        <button type="button" class="help-modal__back icon-hover" data-help-close aria-label="Back" data-tip="Close help">
          <span class="help-modal__back-icon" aria-hidden="true">${arrowLeftIcon}</span>
        </button>
        <div class="help-modal__titles">
          <h2 class="help-modal__title" id="help-modal-title">How to Guide</h2>
          <p class="help-modal__updated">Updated Oct 12, 2026</p>
        </div>
      </header>
      <div class="help-modal__body" id="help-modal-body">${guideBody()}</div>
      <footer class="help-modal__foot">
        <button type="button" class="pill pill--commit help-modal__done" data-help-close data-tip="Close help">Ok, I think I get it</button>
      </footer>
    </div>
  `;

  const scrim = root.querySelector<HTMLElement>(".help-modal__scrim")!;
  const sheet = root.querySelector<HTMLElement>(".help-modal__sheet")!;
  const body = root.querySelector<HTMLElement>(".help-modal__body")!;
  const doneBtn = root.querySelector<HTMLButtonElement>(".help-modal__done")!;

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-help-close]")) closeHelp();
  });

  onKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeHelp();
  };
  window.addEventListener("keydown", onKey);

  bindToc(body);
  document.body.append(root);
  modalRoot = root;
  holdPhysicsForOverlay();

  document.querySelectorAll<HTMLButtonElement>("[data-open-help]").forEach((btn) => {
    btn.classList.add("is-on");
    btn.setAttribute("aria-expanded", "true");
  });

  playTransition(true);
  doneBtn.focus({ preventScroll: true });

  gsap.set(scrim, { autoAlpha: 0 });
  gsap.set(sheet, { autoAlpha: 0, x: -56 });

  if (reducedMotion()) {
    gsap.set([scrim, sheet], { clearProps: "all", autoAlpha: 1, x: 0 });
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.to(scrim, { autoAlpha: 1, duration: 0.32 }, 0);
  tl.to(sheet, { autoAlpha: 1, x: 0, duration: 0.42 }, 0.04);
}

export function toggleHelp(): void {
  if (isHelpOpen()) closeHelp();
  else openHelp();
}
