# Matter Atlas

[Explore the atlas](https://atlas.chalco.website) · [GitHub](https://github.com/Lomchat/atlas)

An interactive English/French Three.js atlas of matter, from familiar objects to valence quarks. The neutral studio and camera-led exploration are inspired by Human Atlas and Model X Studio.

## Languages

Choose English or French using the two always-visible flag buttons in the upper-left corner (also available inside dialogs). Language changes preserve your molecule, zoom, orbit, lesson and gallery selection. All UI, scientific explanations, accessibility labels and the flask label update in place.

A valid `?lang=en` or `?lang=fr` link takes priority over a saved preference, then the browser language; other browser languages default to English. Shared exploration URLs include the language, current scale and the molecule’s spatial `site=x,y,z` address. English and French messages live in `src/locales/en.json` and `src/locales/fr.json` and are accessed through the typed `t()` helper.

Read [AGENTS.md](AGENTS.md) before contributing: every feature and every test must support both languages.

## Explore

- Start with a glass of water, a glass of sparkling water or a methane flask. The collection dialog shows the large object in 3D, with a small molecular illustration and the path between them. Browsing and cancelling preserve the current exploration; entering a different material starts at its object.
- Shared procedural object models use rounded vessel walls, blue/turquoise water and menisci, outlined bubbles, and a cobalt glass flask with a ribbed copper cap and a curved printed label. Scale-independent optical edges keep transparent surfaces readable in the scene and gallery; geometries, materials and label textures are released together.
- Explore a continuous spatial volume: aim anywhere in the water or methane, or inside any CO₂ bubble. Molecular details resolve at the place you approach. The molecular field fills the view. Entering an atom isolates its nucleus and electrons; entering the nucleus shows only its nucleons; entering a nucleon shows only its quarks. The reverse path stays available, without a central marker or an isolated water droplet.
- The exploration button inside the scene continues through every scale to the quarks, shares the current named destination and supports rapid repeated clicks. Elementary particles show an explicit endpoint.
- The compact bottom navigation names both destinations and leaves the centre of the scene open. Repeated clicks immediately retarget the camera, including mid-flight reversals, with no queue. Flights use a nominal 850 ms logarithmic movement, retain fading departure surfaces and progressively reveal the contents. Large empty scale intervals cross quickly in the middle of the flight; dropped frames are capped to retain intermediate views. Reduced motion snaps to the destination.
- An enlarged permanent panel compares two 3D objects at the same scale, with a numeric ratio and Auto/Hair/DNA/Ruler choices. It frames both objects independently from the main camera and explains subpixel differences. A separate ruler tracks actual meters per CSS pixel in the main view.
- Wheel and pinch zoom toward the pointer or touch midpoint at every scale. Drag to orbit; right-drag (or Shift-drag) to pan through the volume. Click a molecule or constituent to approach it. Positions and orientations stay deterministic when revisiting a region.
- Contextual explanations connect an observable effect to its meaning: attractions between water molecules, gas motion and wall collisions, covalent bonds, nuclear cohesion, gluon exchanges, photon absorption/emission, and the Higgs field. Each has three user-controlled moments, a legend, a limitation and a scientific source. Animations loop within the selected moment: moving photons, energy halos, traveling highlights, gas trails and water motion. Pause freezes the animation clock; replay restarts the current moment. Reduced motion uses static diagrams. The 440 px desktop explanation panel uses 15 px body text, and camera framing reserves its actual width. Photon energy levels are shown alongside the 3D representation.
- The macro object, streamed molecular volume and active microscopic hierarchy share one renderer. The composition tree follows the currently explored molecule and branch. Water, carbon dioxide and methane retain their 88, 204 and 84 microscopic nodes excluding the molecule. The three outer nodes describe sampled scales, not actual counts of molecules.
- The composition opens on demand. The inspector can be closed, its properties/source expand separately, and focus mode folds both sidebars while retaining the size comparison. The camera refits to the available space. Search, theme selection, orbit, annotations and sharing remain available. There is no unfolding gauge.

Keyboard: `R` return to the object, `L` annotations, `+` / `−` named zoom, `/` search, Escape close the explanation or return to the object. Native dialogs use Escape to close.

## Development

Node 20.19+ or Node 22.12+.

```sh
npm ci
npm run dev
npm run build
```

Vite listens on `127.0.0.1:3017`. Production is served statically by Caddy from `dist/`. All geometry and fonts are local; there is no backend or database.

To build without changing the live site:

```sh
npm run build -- --outDir .next-dist
```

`src/MatterVolume.ts` streams deterministic, jittered molecular cells inside the vessel (or the CO₂ bubbles). Instanced meshes share geometry/materials and display bonded atoms across a bounded, spatially distributed sample. Only the active graph reveals interiors; neighboring molecules disappear once an atom is entered. Far points represent occupied volumes, not individual molecules. Picking promotes a cell into the detailed graph at the same position and orientation. Cell addresses survive language changes and shared links; active instance bounds are invalidated when cells move through the render window. Depth fading and a bounded working set keep the view legible. No full physical simulation runs in the browser.

`src/continuum.ts` defines the persistent graph and the current navigation target. `src/Scene.tsx` constructs it once per molecule. Child positions are fixed; opening envelopes changes opacity without moving their contents or enlarging their radii. A floating origin at the active molecular cell and adaptive near/far camera planes preserve precision from the vessel down to nuclei. Cursor zoom follows the constituent’s depth, and scene annotations forward wheel events so labels cannot block exploration. Camera fitting targets the selected constituent's center and bounds, while a stable branch preference determines the next destination. Layer thresholds use camera-to-object distance and scale with the available viewport. A small hysteresis keeps layer boundaries stable.

## Verification

```sh
npm test                     # Every suite, in both English and French
npm run test:navigation      # A focused suite, still in both languages
npm run test:language
npm run test:rapid
npm run test:picker
npm run test:scales
npm run test:experience
npm run test:volume
ATLAS_URL=https://atlas.chalco.website npm test
```

The local suites expect `npm run dev` to be running. `scripts/test-matrix.mjs` automatically discovers all `verify*.mjs` suites and runs the same scenarios in both locales. It first checks identical catalog keys, nonempty translations and matching placeholders. Results are recorded in `artifacts/test-matrix.json`; screenshots use `en-` and `fr-` prefixes. New tests must use `scripts/locale-fixture.mjs` and assert the actual document language. A single-locale diagnostic run does not satisfy the bilingual gate.

The size-reference suite checks the actual rendered ruler against SI dimensions, fixed radii, nuclear containment, the atom-to-nucleus scale gap, 3D comparison ratios and manual reference selection, distant cell coordinates, continuous wheel zoom and responsive lesson layouts in both languages. Run it with `node scripts/test-matrix.mjs size-reference`.

The volume suite checks distinct off-center wheel paths, actual picking after streaming to another region, wheel-only revelation of quarks, all three materials to quarks and back, renderer identity, spatial URL persistence, language changes, bounded draw calls, small/mobile/landscape layouts and touch pinch.

The dedicated language suite checks both switching directions, saved preference and link precedence, live graph/renderer/lesson preservation, gallery and comparison texture updates, responsive flag access, unavailable storage and translated graphics fallbacks. Set `CHROMIUM_PATH` if needed, or install Chromium with `npx playwright install chromium`.

The rapid-navigation suite uses normal motion to check batched clicks, actual seven-click bursts, mid-flight reversal, endpoint clamping, keyboard repeat, remembered siblings and mobile behavior. The main browser suite checks the named inward/outward destination chain, disabled endpoint buttons, a pointed sibling remaining selected, exact ray picking, centered camera targets after orbiting, wheel reversal, mobile and landscape layouts, pinch targeting a hydrogen atom, absence of the gauge, persistent scene identity, photons, search, themes, shared URLs and graph composition totals. Screenshots are saved to `artifacts/navigation-*.png`.

## Scientific conventions

The scene shares one dimensional calibration from the roughly 11 cm vessel to molecular bond lengths and conventional atomic/nuclear radii. Opening a nucleus does not enlarge it: the camera traverses the real size gap. This remains an illustrative model, not a quantum simulation. Dimensions, approximations and primary sources are documented in [SCIENCE.md](SCIENCE.md). Neighboring molecules and volume specks are illustrative samples, never a count of all molecules present. Water and methane volumes have no artificial boundary or membrane. The CO₂ bubbles have gas–liquid interfaces. The sparkling-water route follows the CO₂ in the bubble while the surrounding liquid contains water.

Within a molecule, spheres and envelopes are visual conventions. Atomic envelopes use covalent radii and nuclei use approximate nuclear radii; clouds do not compute molecular orbitals. Electron and quark markers have no assigned physical diameter and do not show classical trajectories. The photon lesson uses an isolated-atom, two-level schematic; molecular energy levels differ. Its steps do not represent elapsed physical time.

The nuclear links, intermolecular dashed lines and gluon curves are symbolic. Gas trajectories are slowed, simplified wall-collision illustrations. Three valence quarks omit full quark–gluon dynamics and virtual pairs; quarks remain confined. The Higgs dots represent a field, not individual bosons, a fluid or friction. The lesson distinguishes elementary-particle mass from the strong-interaction contribution that dominates proton mass.

Sources are linked in each explanation and the inspector: OpenStax Chemistry 2e, CERN and PubChem. All 3D geometry is procedural and local. Human Atlas inspiration is credited under its MIT license (`public/licenses/human-atlas.txt`); Model X Studio is a visual reference. No automotive or anatomy assets are reused. DM Sans uses the SIL Open Font License.
