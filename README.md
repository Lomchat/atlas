# Matter Atlas

[Explore the atlas](https://atlas.chalco.website) · [GitHub](https://github.com/Lomchat/atlas)

An interactive English/French Three.js atlas, from a familiar landscape to organs, cells, molecules and elementary particles. The visual studio and camera-led exploration are inspired by Human Atlas and Model X Studio.

The default route opens the World Atlas: 189 connected scientific views across the human body, a tree, a glass of water, a cloud, a rock and a mushroom. The original molecular laboratory remains available at [`/lab`](https://atlas.chalco.website/lab).

## Languages

Choose English or French using the two visible flag buttons. Language changes preserve the current world object, ancestor path and camera. In the laboratory they preserve the molecule, zoom, orbit, lesson and gallery selection. UI, scientific explanations and accessibility labels update in place; the laboratory’s flask label also updates without rebuilding its renderer.

A valid `?lang=en` or `?lang=fr` link takes priority over a saved preference, then the browser language; other browser languages default to English. World links include the selected `world` node ID. Laboratory links retain their scale and molecular `site=x,y,z` address. Shared links include the language.

UI messages live in `src/locales/en.json` and `src/locales/fr.json` and use the typed `t()` helper. Structured scientific records in `src/world/data.ts` use required `Bilingual { en, fr }` pairs, validated by the same content guard in both locale runs. This explicit registry exception does not apply to ordinary UI strings, and neither path relies on silently falling back to English.

Read [AGENTS.md](AGENTS.md) before contributing: every feature and every test must support both languages.

## Explore the world

- Choose an object in the landscape, click its labeled structures and follow the named inward/outward destinations. A persistent scene carries the camera between local scales. The composition map, search and guided trails provide alternative ways to reach a question without requiring precise 3D aiming.
- Follow **human → vein → blood → mature red cell → hemoglobin → heme → iron → atomic nucleus → nucleon → quark**. The neighboring white-cell route leads through its cellular nucleus, chromatin, nucleosomes, DNA and nucleotides. A mature human red cell has no cellular nucleus or DNA branch.
- Explore the heart’s muscle cells, lung alveoli and nearby capillaries, skeletal-muscle sarcomeres, living skin cells, hair and neuronal synapses. Cell and tissue samples explain what part of the complete structure is shown.
- Enter **tree → wood → xylem → cell wall → cellulose microfibril → cellulose chain → glucose-derived residue**. Another route follows a leaf cell into chloroplasts, thylakoids and chlorophyll’s magnesium center. Leaf cells also expose their nucleus/DNA, mitochondria and ribosomes.
- Compare liquid water, cloud droplets and ice; examine air molecules; follow a rock’s quartz grain into its extended silicon–oxygen network; or explore fungal hyphae, walls and chitin. Every object family has a route to atomic structure and an elementary endpoint.
- Nine guided trails start from questions, ten quizzes explain their answers, and four three-step mechanisms cover oxygen transport, DNA packaging, filament sliding and photosynthesis. Saved discoveries and trail progress support returning to a subject later.
- Compact navigation, a foldable inspector and focus mode keep the scene available. An independent 3D comparison uses a common physical scale for its objects; sample dimensions and unresolved objects are explicitly described. Sources and modeling notes remain part of each scientific record.

Dragging orbits the scene. With the world canvas focused, `+` or Enter follows the preferred child, `−` or Backspace goes outward, and Home returns to the landscape. Browser back/forward preserves the selected world path. The molecular laboratory has its own shortcuts below.

## Explore the molecular laboratory

The following spatial-volume features belong to `/lab`; existing molecule/focus links continue to open the laboratory.

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

Laboratory keyboard: `R` return to the object, `L` annotations, `+` / `−` named zoom, `/` search, Escape close the explanation or return to the object. Native dialogs use Escape to close.

## Development

Node 20.19+ or Node 22.12+.

```sh
npm ci
npm run dev
npm run build -- --outDir .next-dist
```

Vite listens on `127.0.0.1:3017`. Production is served statically by Caddy from `dist/`. All geometry and fonts are local; there is no backend or database.

To build without changing the live site:

```sh
npm run build -- --outDir .next-dist
```

`src/AtlasApplication.tsx` selects the world or laboratory route. In `src/world/`, `data.ts` holds scientific records, `WorldAtlas.tsx` owns navigation, `WorldScene.tsx` keeps the main Three.js renderer alive, `models.ts` builds procedural geometry, `WorldUI.tsx` provides the learning interface, and `WorldComparison.tsx` renders the separate comparison. `layout.ts` keeps floating local frames and records `modelAnchors` so visible parts, labels and camera entry points agree. Transforming through a common ancestor preserves precision without adding atomic offsets to landscape coordinates.

World picking uses scientific identities: organelle type, constituent type, atomic number and quark flavor. Parent models that already contain a drawn constituent do not need a second overlapping copy. Each clicked up/down quark has a matching explanation; leaving an atomic branch restores its actual material or biological context. The procedural models are teaching representations, not complete physical simulations.

In the laboratory, `src/MatterVolume.ts` streams deterministic, jittered molecular cells inside the vessel (or the CO₂ bubbles). Instanced meshes share geometry/materials and display bonded atoms across a bounded, spatially distributed sample. Only the active graph reveals interiors; neighboring molecules disappear once an atom is entered. Far points represent occupied volumes, not individual molecules. Picking promotes a cell into the detailed graph at the same position and orientation. Cell addresses survive language changes and shared links; active instance bounds are invalidated when cells move through the render window. Depth fading and a bounded working set keep the view legible. No full physical simulation runs in the browser.

`src/continuum.ts` defines the laboratory’s persistent graph and current navigation target. `src/Scene.tsx` constructs it once per molecule. Child positions are fixed; opening envelopes changes opacity without moving their contents or enlarging their radii. A floating origin at the active molecular cell and adaptive near/far camera planes preserve precision from the vessel down to nuclei. Cursor zoom follows the constituent’s depth, and scene annotations forward wheel events so labels cannot block exploration. Camera fitting targets the selected constituent's center and bounds, while a stable branch preference determines the next destination. Layer thresholds use camera-to-object distance and scale with the available viewport. A small hysteresis keeps layer boundaries stable.

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

World scenarios share `scripts/world-content.mjs`. Its `assertWorldContent(locale)` loads the TypeScript registry and checks both language fields, complete ancestry, direct-child links, source URLs, model dispatch coverage, isotope/ion metadata, correct up/down targets, and scientific distinctions such as the absence of a cellular nucleus in mature red cells. It also validates every trail transition, quiz and three-step mechanism. Main world browser assertions select `canvas[data-world-scene]`; the comparison is a separate canvas. These checks describe the verification requirements, not a claim about a particular release’s validation status.

The size-reference suite checks the actual rendered ruler against SI dimensions, fixed radii, nuclear containment, the atom-to-nucleus scale gap, 3D comparison ratios and manual reference selection, distant cell coordinates, continuous wheel zoom and responsive lesson layouts in both languages. Run it with `node scripts/test-matrix.mjs size-reference`.

The volume suite checks distinct off-center wheel paths, actual picking after streaming to another region, wheel-only revelation of quarks, all three materials to quarks and back, renderer identity, spatial URL persistence, language changes, bounded draw calls, small/mobile/landscape layouts and touch pinch.

The dedicated language suite checks both switching directions, saved preference and link precedence, live graph/renderer/lesson preservation, gallery and comparison texture updates, responsive flag access, unavailable storage and translated graphics fallbacks. Set `CHROMIUM_PATH` if needed, or install Chromium with `npx playwright install chromium`.

The rapid-navigation suite uses normal motion to check batched clicks, actual seven-click bursts, mid-flight reversal, endpoint clamping, keyboard repeat, remembered siblings and mobile behavior. The main browser suite checks the named inward/outward destination chain, disabled endpoint buttons, a pointed sibling remaining selected, exact ray picking, centered camera targets after orbiting, wheel reversal, mobile and landscape layouts, pinch targeting a hydrogen atom, absence of the gauge, persistent scene identity, photons, search, themes, shared URLs and graph composition totals. Screenshots are saved to `artifacts/navigation-*.png`.

## Scientific conventions

The world distinguishes a contained structure, a chemical constituent and a selected sample. `sizeMeters` describes the largest characteristic extent of the depicted specimen or segment, with a note explaining that choice. A 10 nm DNA excerpt is not an entire chromosome, a membrane patch’s width is not its thickness, and the distant cloud is not physically as small as the nearby glass. Biological dimensions vary; selected windows and nominal examples are labeled accordingly. The world’s sources and interpretation notes are in [src/world/science.md](src/world/science.md).

The models use explanatory colors, simplified anatomy, polymer connectivity and protein folds. They do not claim to be microscopy, complete experimental molecular coordinates, or anatomically exhaustive reconstructions. Quartz is an extended network rather than separate SiO₂ molecules; a cellulose residue is not free glucose; plant nuclei do not inherit a human chromosome count. Elementary-particle markers have no assigned diameter and no invented smaller interior. No curriculum certification or institutional endorsement is claimed.

The laboratory shares one dimensional calibration from the roughly 11 cm vessel to molecular bond lengths and conventional atomic/nuclear radii. Opening a nucleus does not enlarge it: the camera traverses the real size gap. This remains an illustrative model, not a quantum simulation. Its dimensions, approximations and primary sources are documented in [SCIENCE.md](SCIENCE.md). Neighboring molecules and volume specks are illustrative samples, never a count of all molecules present. Water and methane volumes have no artificial boundary or membrane. The CO₂ bubbles have gas–liquid interfaces. The sparkling-water route follows the CO₂ in the bubble while the surrounding liquid contains water.

Within a molecule, spheres and envelopes are visual conventions. Atomic envelopes use covalent radii and nuclei use approximate nuclear radii; clouds do not compute molecular orbitals. Electron and quark markers have no assigned physical diameter and do not show classical trajectories. The photon lesson uses an isolated-atom, two-level schematic; molecular energy levels differ. Its steps do not represent elapsed physical time.

The nuclear links, intermolecular dashed lines and gluon curves are symbolic. Gas trajectories are slowed, simplified wall-collision illustrations. Three valence quarks omit full quark–gluon dynamics and virtual pairs; quarks remain confined. The Higgs dots represent a field, not individual bosons, a fluid or friction. The lesson distinguishes elementary-particle mass from the strong-interaction contribution that dominates proton mass.

Sources are linked in the scientific records and inspector, including OpenStax, NIH/NCBI, RCSB PDB, USDA Forest Products Laboratory, NOAA, USGS, NIST, CERN, the Royal Society of Chemistry and PubChem. All 3D geometry is procedural and local. Human Atlas inspiration is credited under its MIT license (`public/licenses/human-atlas.txt`); Model X Studio is a visual reference. No automotive or anatomy assets are reused. DM Sans uses the SIL Open Font License.

Local `deploy/` configuration, credentials, private backups, generated releases and test artifacts are excluded from the public repository. Production builds must be staged in `.next-dist` and verified before replacing the live `dist`.
