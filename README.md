# Ultrapilled™

A desktop web physics playground for playful motion graphics. Drop pills, words, longer text, shapes, emoji, uploads, Unsplash photos, Giphy GIFs, and muted YouTube or MP4 clips into **Physics** (fall, bounce, stack) or **Layout** (place freely, multi-page). Theme with palettes, fonts, and look FX—including optional mic-driven Audio react—then export stills, sequences, GIF, MP4, or transparent ProRes, or save a local `.pill` project. Live at [ultrapilled.com](https://ultrapilled.com/). Built on [Matter.js](https://brm.io/matter-js/).

**Desktop browsers only.** Phones and most tablets are gated at the door. Privacy: [ultrapilled.com/privacy.html](https://ultrapilled.com/privacy.html) (also in this repo as [`privacy.html`](privacy.html)).

## Run

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` if you want Unsplash or Giphy search. Those keys are public in the client bundle — restrict them to this origin in each dashboard.

```bash
npm test
```

## Use

1. Pick **Physics** (things fall) or **Layout** (place freely, like Figma).
2. Add text, icons, uploads, Unsplash photos, Giphy GIFs, or a YouTube / MP4 clip from Create.
3. Tune gravity, speed, and bounciness (Physics), or arrange layers (Layout).
4. Spacebar triggers a fall. Export GIF / MP4 / MOV / PNG, or save a `.pill` project.

YouTube and uploaded video do not rasterize — export warns, then draws a play-button stand-in.

## Shapes

Shapes provided by [shapes.gallery](https://www.shapes.gallery/).

## Sounds

**UI** — [SND01 "sine"](https://snd.dev/) by [Ayako Taniguchi](https://ayakotaniguchi.jp/) (`public/sounds/`). Free for personal and commercial use under [snd.dev Terms of Use](https://snd.dev/); do not redistribute the unprocessed assets alone or use them as an unprocessed sound logo / trademark.

**Shape impacts** — [Soundcn](https://www.soundcn.xyz/?category=UI) drop samples (embedded in `src/sounds/`), played via the Web Audio API (`src/lib/sound-engine.ts`). Add more with:

```bash
npx shadcn add https://soundcn.xyz/r/<sound-name>.json
```

## Fonts

**Le Murmure** — used for the Ultrapilled logotype. [Le Murmure](https://velvetyne.fr/fonts/le-murmure/) by Jérémy Landes, published by [Velvetyne](https://velvetyne.fr/). SIL Open Font License 1.1.

## Video export

**ProRes MOV** — [prores-wasm-encoder](https://github.com/OlivierEstevez/ProRes-WASM-encoder) by [Olivier Estevez](https://github.com/OlivierEstevez). Thank you, Oli — real ProRes (including transparent 4444) in the browser made our editing exports possible. LGPL-2.1-or-later.

## Template asset credits

Bundled under `public/templates/<id>/`. Full per-file notes also live in each folder’s `CREDITS.txt`. Photos and third-party 3D-derived renders (PNG / GIF) keep their original licenses — credit authors where the license requires it (e.g. CC BY).

**Acid** (London night + 1990s rave / club + Sketchfab-derived render; **CC BY / CC BY-SA / CC0**)

| File | Work | Author | License |
|------|------|--------|---------|
| `piccadilly.jpg` | [Piccadilly Circus at night in 1988](https://commons.wikimedia.org/wiki/File:Piccadilly_Circus_at_night_in_1988_-_geograph.org.uk_-_2687917.jpg) | Peter Shimmon | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) |
| `go-ahead-london.jpg` | [Go Ahead London's 171](https://commons.wikimedia.org/wiki/File:20200914_Go_Ahead_London_171.jpg) | Alex Noble | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `fish-chips.jpg` | [Anstruther Fish Supper](https://commons.wikimedia.org/wiki/File:Anstruther_Fish_Supper.jpg) | Edinburgh Blog | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |
| `template-acid-big-ben.gif` | [Clock Tower (Big Ben)](https://sketchfab.com/3d-models/clock-tower-big-ben-9a1c691fac774bcca4e2ba565c4c9d9b) | [ManySince910](https://sketchfab.com/noears6) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

**New York** (1960s B&W; public domain)

| File | Work | Source | License |
|------|------|--------|---------|
| `grand-central.jpg` | [Grand Central during Gemini 3 launch](https://commons.wikimedia.org/wiki/File:Grand_Central_during_Gemini_3_launch.png) (1965) | Wikimedia Commons | Public domain |
| `parade.jpg` | [Virgil Grissom and John Young parade](https://commons.wikimedia.org/wiki/File:Virgil_Grissom_and_John_Young_parade_NYWTS.jpg) (1965) | NYWT&S / Library of Congress | Public domain |
| `white-horse.jpg` | [White Horse Tavern](https://commons.wikimedia.org/wiki/File:White_Horse_Tavern_NYWTS.jpg) (1961) | NYWT&S / Library of Congress | Public domain |

**Miami** (photos + Sketchfab-derived render; **public domain / CC0 / CC BY**)

| File | Work | Source | License |
|------|------|--------|---------|
| `neron.jpg` | [Neron Hotel, Miami Beach, Florida](https://commons.wikimedia.org/wiki/File:Neron_Hotel,_Miami_Beach,_Florida_LCCN2017711369.tif) (1980) | John Margolies / Library of Congress | Public domain |
| `coast-guard.jpg` | [Reagan visit to USCGC Dauntless](https://commons.wikimedia.org/wiki/File:President_Ronald_Reagan_Visit_to_Us_Coast_Guard_Cutter_Dauntless_Miami_Beach_Florida_Speaking_at_Podium_-_DPLA_-_0999c396e6877565b8d4b748419005ec.jpg) (1982) | White House Photographic Office | Public domain |
| `metrorail.jpg` | [Passengers aboard the Metrorail in Miami](https://commons.wikimedia.org/wiki/File:Passengers_aboard_the_Metrorail_in_Miami.jpg) (1980s) | Florida Film Bureau | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `template-miami-testarossa.gif` | [1988 Ferrari Testarossa](https://sketchfab.com/3d-models/1988-ferrari-testarossa-8968ceebb4ae445091f02d2344d367ea) | [Ddiaz Design](https://sketchfab.com/ddiaz-design) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

**Berlin** (photos + Sketchfab-derived render; **CC0 / CC BY**)

| File | Work | Author | License |
|------|------|--------|---------|
| `template-berlin-moma-queue.jpg` | [MoMa Ausstellung in Berlin 2004 RIMG0457](https://commons.wikimedia.org/wiki/File:MoMa_Ausstellung_in_Berlin_2004_RIMG0457.JPG) | Jochims | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `template-berlin-balloon.jpg` | [Potsdamer Platz Berlin RIMG0463](https://commons.wikimedia.org/wiki/File:Potsdamer_Platz_Berlin_RIMG0463.JPG) | Jochims | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `template-berlin-towers.jpg` | [Potsdamer Platz Berlin RIMG0464](https://commons.wikimedia.org/wiki/File:Potsdamer_Platz_Berlin_RIMG0464.JPG) | Jochims | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `template-berlin-skull.gif` | [Skull downloadable](https://sketchfab.com/3d-models/skull-downloadable-1a9db900738d44298b0bc59f68123393) | [martinjario](https://sketchfab.com/martinjario) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

**Halloween** (photos + Sketchfab-derived renders; **CC BY / CC BY-SA / public domain**)

| File | Work | Author | License |
|------|------|--------|---------|
| `jack-o-lantern.jpg` | [Jack-o'-Lantern 2003-10-31](https://commons.wikimedia.org/wiki/File:Jack-o%27-Lantern_2003-10-31.jpg) | Toby Ord | [CC BY-SA 2.5](https://creativecommons.org/licenses/by-sa/2.5/) |
| `halloween-pumpkins.jpg` | [Halloween pumpkins](https://commons.wikimedia.org/wiki/File:Halloween_pumpkins.jpg) | Jiayu Zuo | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `carroll-borland.jpg` | [Carroll Borland - Mark of Vampire still](https://commons.wikimedia.org/wiki/File:Carroll_Borland_-_Mark_of_Vampire_still.jpg) | Famous Monsters of Filmland #39 (1966) | Public domain |
| `friday-the-13th.jpg` | [Friday the 13th (1979 Variety advertisement)](https://commons.wikimedia.org/wiki/File:Friday_the_13th_(1979_Variety_advertisement).jpg) | Sean Cunningham Films Ltd. / Paramount Pictures | Public domain |
| `pumpkin-low-poly.gif` | [Halloween Pumpkin - low poly](https://sketchfab.com/3d-models/halloween-pumpkin-low-poly-b0aef49e4b7e400c91cac3aa252c2dc4) | [Karolina Renkiewicz](https://sketchfab.com/KarolinaRenkiewicz) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `hi-fi-spider.gif` | [hi-fi-spider](https://sketchfab.com/3d-models/hi-fi-spider-ff8a4433a5d449a3a0fc54989185a024) | [jonmariano21](https://sketchfab.com/jonmariano21) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

## License

Original Ultrapilled code and original assets are under the [MIT License](LICENSE).

**What this means**

- You can use, share, and adapt this project, including commercially. Keep the copyright and license notice when you redistribute the source (or a substantial portion of it).
- GIFs, videos, stills, and other files you export from the app are **yours**. You do not need to credit Ultrapilled on that work.
- This covers **our** code and original assets only. Dependencies and bundled third-party files keep their own terms:
  - [Matter.js](https://brm.io/matter-js/)
  - [GSAP](https://gsap.com/standard-license/)
  - [Phosphor Icons](https://github.com/phosphor-icons/core)
  - [prores-wasm-encoder](https://github.com/OlivierEstevez/ProRes-WASM-encoder) by Olivier Estevez (LGPL-2.1-or-later; see [Video export](#video-export))
  - Mattone (`public/fonts/Mattone-LICENSE.txt`, SIL Open Font License 1.1)
  - [Le Murmure](https://velvetyne.fr/fonts/le-murmure/) (Ultrapilled logotype, SIL Open Font License 1.1)
  - Template photos and attributed template objects (tables above / each folder’s `CREDITS.txt`)
  - Sounds (see [Sounds](#sounds))
  - [Unsplash](https://unsplash.com/license) photos you search in-app
  - [Giphy](https://support.giphy.com/hc/en-us/articles/360032872931-GIPHY-User-Terms-of-Service) GIFs you search in-app
  - YouTube embeds (YouTube’s terms)
