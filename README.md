# Atlas — From quarks to the cosmos · Du quark à l’Univers

[Explore the atlas](https://atlas.chalco.website) · [GitHub](https://github.com/Lomchat/atlas)

Atlas is a bilingual (English/French) journey through every power of ten, from quarks to the observable Universe, drawn as vivid, playful 3D illustrations. It pays tribute to *Powers of Ten* by Charles and Ray Eames (1977).

You start in a small park. Scroll, pinch or press **Dive** to go into a person, a tree or a pond; zoom out to see the landscape, the Earth, the Solar System and the galaxies. Every inward journey ends inside an atom, its nucleus, a proton and finally a quark.

## What you can do

- **Zoom continuously** with the mouse wheel, a trackpad or a pinch. When you stop, the view settles on the nearest place in the direction you were going. Drag to look around.
- **Dive or zoom out one step** with the big buttons, the arrow keys or `+`/`−`. At a crossroads (the park, the epidermis), choose where to dive; floating labels in the scene do the same.
- **Preview before you zoom**: hovering (or focusing, or long-pressing on a touch screen) any zoom control shows where it leads — what the place is, its order of magnitude and how far the zoom goes.
- **The Atlas logo** reopens the welcome screen with its starting points; the house button returns to the park.
- **The scale ruler** on the right shows where you are among all the powers of ten, from 10²⁷ m to 10⁻¹⁶ m. Click any stop to fly there. It also counts the places you have discovered.
- **Each place has a card**: its real size and order of magnitude, a relatable comparison, a short explanation, "Did you know?" facts and a source. Glowing dots in the scene open small explanations.
- **The guided tour** (▶, or Space) flies from place to place by itself, pausing long enough to read.
- **Share** a link to the exact place. The language is part of the link.

### Journeys

| Journey | From → to |
| --- | --- |
| Cosmos | observable Universe → Laniakea → Local Group → Milky Way → nearby stars → Solar System → rocky planets → Earth and Moon → Earth → a region → a landscape → the park |
| You | person → hand → fingerprint → skin → epidermis → skin cell → nucleus → chromatin → nucleosome → DNA → carbon atom |
| Blood | epidermis → capillary → red blood cell → inside it → hemoglobin → heme → iron atom |
| Tree | tree → leaf → leaf section → leaf cell → chloroplast → thylakoids → photosystem → chlorophyll → magnesium atom |
| Pond | pond → lily pad → drop → microscopic zoo → bacteria → viruses → water molecules → oxygen atom |
| Matter | atom → almost nothing → nucleus → proton → quark (for C, Fe, Mg and O) |

Sizes are real. Shapes are simplified and colours chosen for legibility; electrons, quarks and gluons are drawn symbolically. Where a view enlarges something to make it visible (planets in the Solar System), the place says so.

## Languages

Use the two flag buttons. Switching keeps the place, the zoom and the 3D view. A valid `?lang=en` or `?lang=fr` wins over the saved choice, then the browser language; English is the fallback. UI messages live in `src/locales/{en,fr}.json`; scientific texts live with each level as `{ en, fr }` pairs in `src/levels/data/`.

Read [AGENTS.md](AGENTS.md) before contributing: every change and every test must work in both languages.

## Development

Node 20.19+ or 22.12+.

```sh
npm ci
npm run dev          # http://127.0.0.1:3017
npm run build        # static site in dist/ (use -- --outDir .next-dist before publishing)
node scripts/shoot.mjs --at cell --offset -0.5 --lang fr   # screenshots of any level or transition
```

Useful URL parameters: `at=<level id>`, `lang=en|fr`, `intro=0|1`, and for screenshots `freeze=<seconds>` (stops animation time), `offset=<decades>` (partway into the next level) and `ui=0`.

### Tests

The browser suites expect the app at `http://127.0.0.1:3017` (override with `ATLAS_URL`) and use Playwright's Chromium (override with `CHROMIUM_PATH`).

```sh
npm test               # every suite, in English and in French
npm run test:journey   # intro, diving to the quark, branches, labels, ruler, wheel, keys, tour, old links
npm run test:language  # switching both ways, persistence, ?lang precedence, storage failures
npm run test:layout    # desktop, laptop, phone and landscape layouts, dialogs, hotspots
npm run test:scenes    # every level builds its own scene without errors, plus one dive frame each
npm run check          # catalogs and level registry only (no browser)
```

## How it works

- `src/levels/` — pure data: the level tree, sizes (metres), anchors inside the parent, home views, themes and bilingual content. `data/matter.ts` generates the atom → quark chain per element.
- `src/levels/scenes/` — one lazily loaded builder per scene, drawn with the illustrated style kit. A scene that fails falls back to a placeholder; navigation never breaks.
- `src/engine/Atlas.ts` — the infinite-zoom engine. The position is `z = log10(view size in metres)`; levels are drawn in the frame of the current level (a floating origin), stacked from largest to smallest and cross-faded. The camera tilts smoothly between each level's home view.
- `src/engine/kit.ts` — toon, halo, glow, point and line materials, organic blobs, tubes and canvas textures, all released together with their scene.
- `src/App.tsx`, `src/ui/` — card, controls, ruler, floating labels, intro, about dialog, language flags.

There is no backend, account or tracking. Fonts are bundled.

## Credits

Built with three.js and React; icons by Lucide. Fonts: Fredoka and Nunito (SIL Open Font License, see `public/licenses/`). All 3D content is generated by code in this repository. Scientific sources are cited on each place's card.
