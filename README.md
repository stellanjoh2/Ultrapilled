# Ultrapilled

A standalone physics playground for text chips and icons. Built on [Matter.js](https://brm.io/matter-js/).

## Run

```bash
npm install
npm run dev
```

## Use

1. Add text slots (typeface, colors, pill / box / no holding shape, box radius).
2. Add icon slots from presets or upload SVG / PNG / JPG.
3. Tune gravity, speed, and bounciness.
4. Hit **Trigger Physics** — everything drops from above.

## Sounds

**UI** — [SND01 "sine"](https://snd.dev/) by [Ayako Taniguchi](https://ayakotaniguchi.jp/) (`public/sounds/`). Free for personal and commercial use under [snd.dev Terms of Use](https://snd.dev/); do not redistribute the unprocessed assets alone or use them as an unprocessed sound logo / trademark.

**Shape impacts** — [Soundcn](https://www.soundcn.xyz/?category=UI) drop samples (embedded in `src/sounds/`), played via the Web Audio API (`src/lib/sound-engine.ts`). Add more with:

```bash
npx shadcn add https://soundcn.xyz/r/<sound-name>.json
```

## Template photo credits

Bundled under `public/templates/<id>/`. Full per-file notes also live in each folder’s `CREDITS.txt`.

**Acid** (early–mid 1990s European rave / club; **CC BY / CC BY-SA** — attribution required)

| File | Work | Author | License |
|------|------|--------|---------|
| `love-parade.jpg` | [Love Parade Berlin 1996 1](https://commons.wikimedia.org/wiki/File:Love_Parade_Berlin_1996_1.jpg) | Gerd Danigel | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `yen-sung.jpg` | [DJ Yen Sung in Lisbon, Portugal (1993)](https://commons.wikimedia.org/wiki/File:DJ_Yen_Sung_in_Lisbon,_Portugal_(1993).jpg) | Ithaka Darin Pappas | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `dubmission.jpg` | [Love-parade 1995-dubmission halle-weissensee](https://commons.wikimedia.org/wiki/File:Love-parade_1995-dubmission_halle-weissensee.jpg) | Das Kraftfuttermischwerk | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |

**New York** (1960s B&W; public domain)

| File | Work | Source | License |
|------|------|--------|---------|
| `grand-central.jpg` | [Grand Central during Gemini 3 launch](https://commons.wikimedia.org/wiki/File:Grand_Central_during_Gemini_3_launch.png) (1965) | Wikimedia Commons | Public domain |
| `parade.jpg` | [Virgil Grissom and John Young parade](https://commons.wikimedia.org/wiki/File:Virgil_Grissom_and_John_Young_parade_NYWTS.jpg) (1965) | NYWT&S / Library of Congress | Public domain |
| `white-horse.jpg` | [White Horse Tavern](https://commons.wikimedia.org/wiki/File:White_Horse_Tavern_NYWTS.jpg) (1961) | NYWT&S / Library of Congress | Public domain |

**Miami** (1980s color; public domain / CC0)

| File | Work | Source | License |
|------|------|--------|---------|
| `neron.jpg` | [Neron Hotel, Miami Beach, Florida](https://commons.wikimedia.org/wiki/File:Neron_Hotel,_Miami_Beach,_Florida_LCCN2017711369.tif) (1980) | John Margolies / Library of Congress | Public domain |
| `coast-guard.jpg` | [Reagan visit to USCGC Dauntless](https://commons.wikimedia.org/wiki/File:President_Ronald_Reagan_Visit_to_Us_Coast_Guard_Cutter_Dauntless_Miami_Beach_Florida_Speaking_at_Podium_-_DPLA_-_0999c396e6877565b8d4b748419005ec.jpg) (1982) | White House Photographic Office | Public domain |
| `metrorail.jpg` | [Passengers aboard the Metrorail in Miami](https://commons.wikimedia.org/wiki/File:Passengers_aboard_the_Metrorail_in_Miami.jpg) (1980s) | Florida Film Bureau | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

**Berlin** (13 September 2004; CC0)

| File | Work | Author | License |
|------|------|--------|---------|
| `moma-queue.jpg` | [MoMa Ausstellung in Berlin 2004 RIMG0457](https://commons.wikimedia.org/wiki/File:MoMa_Ausstellung_in_Berlin_2004_RIMG0457.JPG) | Jochims | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `balloon.jpg` | [Potsdamer Platz Berlin RIMG0463](https://commons.wikimedia.org/wiki/File:Potsdamer_Platz_Berlin_RIMG0463.JPG) | Jochims | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `towers.jpg` | [Potsdamer Platz Berlin RIMG0464](https://commons.wikimedia.org/wiki/File:Potsdamer_Platz_Berlin_RIMG0464.JPG) | Jochims | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
