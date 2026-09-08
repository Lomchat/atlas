# Matter Atlas

[Explore the atlas](https://atlas.chalco.website) · [GitHub](https://github.com/Lomchat/atlas)

An interactive English/French Three.js atlas, from a familiar landscape to organs, cells, molecules and elementary particles. The visual studio and camera-led exploration are inspired by Human Atlas and Model X Studio.

The default route opens the World Atlas: 204 connected scientific views across the human body, a tree, a glass of water, a cloud, a rock and a mushroom. The original molecular laboratory remains available at [`/lab`](https://atlas.chalco.website/lab).

## Languages

Choose English or French using the two visible flag buttons. Language changes preserve the current world object, ancestor path and camera. In the laboratory they preserve the molecule, zoom, orbit, lesson and gallery selection. UI, scientific explanations and accessibility labels update in place; the laboratory’s flask label also updates without rebuilding its renderer.

A valid `?lang=en` or `?lang=fr` link takes priority over a saved preference, then the browser language; other browser languages default to English. World links include the selected `world` node ID. Laboratory links retain their scale and molecular `site=x,y,z` address. Shared links include the language.

UI messages live in `src/locales/en.json` and `src/locales/fr.json` and use the typed `t()` helper. Structured scientific records in `src/world/data.ts` use required `Bilingual { en, fr }` pairs, validated by the same content guard in both locale runs. This explicit registry exception does not apply to ordinary UI strings, and neither path relies on silently falling back to English.

Read [AGENTS.md](AGENTS.md) before contributing: every feature and every test must support both languages.

## Explore the world

- Choose an object in the landscape, click its labeled structures and follow the named inward/outward destinations. A persistent scene carries the camera between local scales. The composition map, search and guided trails provide alternative ways to reach a question without requiring precise 3D aiming.
- Switch among the body surface, organs and vessels, skeleton, and muscles. Anatomical surfaces come from BodyParts3D 4.0, supplemented by official 4.3 lung surfaces, with selectable heart, lungs, brain, liver, kidneys, stomach, intestines, femur, left biceps and left cephalic vein. Systems load when needed; the renderer and viewpoint persist across layer and language changes.
- Follow **human → left cephalic vein → sampled 4 cm vessel section → blood → mature red cell → hemoglobin → heme → iron → atomic nucleus → nucleon → quark**. The neighboring white-cell route leads through its cellular nucleus, chromatin, nucleosomes, DNA and nucleotides. A mature human red cell has no cellular nucleus or DNA branch.
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

Vite listens on `127.0.0.1:3017`. Production is served statically by Caddy from `dist/`. Fonts, procedural models and adapted anatomical GLBs are served locally; there is no backend or database. Anatomical files load on demand from `public/models/bodyparts3d/`, rather than from an external model service.

To build without changing the live site:

```sh
npm run build -- --outDir .next-dist
```

`src/AtlasApplication.tsx` selects the world or laboratory route. In `src/world/`, `data.ts` holds scientific records, `WorldAtlas.tsx` owns navigation, `WorldScene.tsx` keeps the main Three.js renderer alive, `models.ts` dispatches procedural geometry, `mineralModels.ts` separates mineral and cellulose scales, `anatomyModels.ts` loads source anatomy for both the main scene and comparison, `WorldUI.tsx` provides the learning interface, and `WorldComparison.tsx` renders the separate comparison. `layout.ts` keeps floating local frames and records `modelAnchors` so visible parts, labels and camera entry points agree. Transforming through a common ancestor preserves precision without adding atomic offsets to landscape coordinates.

World picking uses scientific identities: organelle type, constituent type, atomic number and quark flavor. Parent models that already contain a drawn constituent do not need a second overlapping copy. Each clicked up/down quark has a matching explanation; leaving an atomic branch restores its actual material or biological context. The procedural models are teaching representations, not complete physical simulations. Anatomical placeholders reserve exact source landmarks while assets load, so they do not add duplicate organs. Hidden systems remain unpickable; failed downloads expose a translated retry action. Late loads and departing models release their GPU resources without rebuilding the renderer.

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
node scripts/test-matrix.mjs anatomy
node scripts/mineral-models.mjs # Model/content assertions in both languages
ATLAS_URL=https://atlas.chalco.website npm test
```

The local suites expect `npm run dev` to be running. `scripts/test-matrix.mjs` automatically discovers all `verify*.mjs` suites and runs the same scenarios in both locales. It first checks identical catalog keys, nonempty translations and matching placeholders. Results are recorded in `artifacts/test-matrix.json`; screenshots use `en-` and `fr-` prefixes. New tests must use `scripts/locale-fixture.mjs` and assert the actual document language. A single-locale diagnostic run does not satisfy the bilingual gate.

World scenarios share `scripts/world-content.mjs`. Its `assertWorldContent(locale)` loads the TypeScript registry and checks both language fields, complete ancestry, direct-child links, source URLs, model dispatch coverage, isotope/ion metadata, correct up/down targets, and scientific distinctions such as the absence of a cellular nucleus in mature red cells. It also validates every trail transition, quiz and three-step mechanism. Main world browser assertions select `canvas[data-world-scene]`; the comparison is a separate canvas. These checks describe the verification requirements, not a claim about a particular release’s validation status.

`scripts/verify-anatomy.mjs` covers source identification, the four anatomical layers, visible-part picking, source-derived dimensions and anchors, anatomical return paths, language changes, phone controls and download/retry behavior. It runs through the same bilingual matrix. `scripts/mineral-models.mjs` supplies `assertMineralModels(locale)` to the world suite: it checks distinct grain/network and fibril/chain representations, quartz coordination and SI bond lengths, element-specific picking, bounded draw calls and resource disposal. Its standalone command runs the identical assertions in English and French. These are test scopes, not release validation results.

The size-reference suite checks the actual rendered ruler against SI dimensions, fixed radii, nuclear containment, the atom-to-nucleus scale gap, 3D comparison ratios and manual reference selection, distant cell coordinates, continuous wheel zoom and responsive lesson layouts in both languages. Run it with `node scripts/test-matrix.mjs size-reference`.

The volume suite checks distinct off-center wheel paths, actual picking after streaming to another region, wheel-only revelation of quarks, all three materials to quarks and back, renderer identity, spatial URL persistence, language changes, bounded draw calls, small/mobile/landscape layouts and touch pinch.

The dedicated language suite checks both switching directions, saved preference and link precedence, live graph/renderer/lesson preservation, gallery and comparison texture updates, responsive flag access, unavailable storage and translated graphics fallbacks. Set `CHROMIUM_PATH` if needed, or install Chromium with `npx playwright install chromium`.

The rapid-navigation suite uses normal motion to check batched clicks, actual seven-click bursts, mid-flight reversal, endpoint clamping, keyboard repeat, remembered siblings and mobile behavior. The main browser suite checks the named inward/outward destination chain, disabled endpoint buttons, a pointed sibling remaining selected, exact ray picking, centered camera targets after orbiting, wheel reversal, mobile and landscape layouts, pinch targeting a hydrogen atom, absence of the gauge, persistent scene identity, photons, search, themes, shared URLs and graph composition totals. Screenshots are saved to `artifacts/navigation-*.png`.

## Scientific conventions

The world distinguishes a contained structure, a chemical constituent and a selected sample. `sizeMeters` describes the largest characteristic extent of the depicted specimen or segment, with a note explaining that choice. A 10 nm DNA excerpt is not an entire chromosome, a membrane patch’s width is not its thickness, and the distant cloud is not physically as small as the nearby glass. Biological dimensions vary; selected windows and nominal examples are labeled accordingly. The world’s sources and interpretation notes are in [src/world/science.md](src/world/science.md).

The body uses simplified surfaces adapted from an anatomical reference dataset; cells, protein folds and most molecular structures remain procedural teaching diagrams. These surfaces do not provide microscopy of their interior or represent every person’s anatomy. The quartz network is a separate exception: its atom centers derive from published crystallographic coordinates, while its colors, sphere sizes and tetrahedral faces remain explanatory. Quartz is an extended network rather than separate SiO₂ molecules; a cellulose residue is not free glucose; plant nuclei do not inherit a human chromosome count. Elementary-particle markers have no assigned diameter and no invented smaller interior. No curriculum certification or institutional endorsement is claimed.

The laboratory shares one dimensional calibration from the roughly 11 cm vessel to molecular bond lengths and conventional atomic/nuclear radii. Opening a nucleus does not enlarge it: the camera traverses the real size gap. This remains an illustrative model, not a quantum simulation. Its dimensions, approximations and primary sources are documented in [SCIENCE.md](SCIENCE.md). Neighboring molecules and volume specks are illustrative samples, never a count of all molecules present. Water and methane volumes have no artificial boundary or membrane. The CO₂ bubbles have gas–liquid interfaces. The sparkling-water route follows the CO₂ in the bubble while the surrounding liquid contains water.

Within a molecule, spheres and envelopes are visual conventions. Atomic envelopes use covalent radii and nuclei use approximate nuclear radii; clouds do not compute molecular orbitals. Electron and quark markers have no assigned physical diameter and do not show classical trajectories. The photon lesson uses an isolated-atom, two-level schematic; molecular energy levels differ. Its steps do not represent elapsed physical time.

The nuclear links, intermolecular dashed lines and gluon curves are symbolic. Gas trajectories are slowed, simplified wall-collision illustrations. Three valence quarks omit full quark–gluon dynamics and virtual pairs; quarks remain confined. The Higgs dots represent a field, not individual bosons, a fluid or friction. The lesson distinguishes elementary-particle mass from the strong-interaction contribution that dominates proton mass.

Sources are linked in the scientific records and inspector, including OpenStax, NIH/NCBI, RCSB PDB, USDA Forest Products Laboratory, NOAA, USGS, NIST, CERN, the Royal Society of Chemistry and PubChem. Human Atlas inspiration is credited under its MIT license (`public/licenses/human-atlas.txt`); Model X Studio is a visual reference. DM Sans uses the SIL Open Font License.

## Anatomical assets and attribution

**BodyParts3D 4.0 assets:** BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International

**BodyParts3D 4.3 lung surfaces:** BodyParts3D, © The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan

Of the 14 locally hosted anatomical GLBs, 13 derive from the official [BodyParts3D 4.0 archive](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html). `lungs.glb` uses 18 named segmental parenchyma meshes, FJ6595–FJ6612, from the official BodyParts3D 4.3 viewer. The 4.0 heart includes its original ventricular wall, FJ2428 / FMA13884, which the compound-organ mapping alone omits. These are selected source surfaces; no synthetic outer envelope replaces them.

The 4.0 archive derivatives use the [current official CC BY 4.0 terms](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html), updated 27 February 2025. The separate 4.3 lung adaptation retains **CC BY-SA 2.1 Japan**, as stated by the [official viewer](https://lifesciencedb.jp/bp3d/info_en/index.html#License). The archive's newer terms are not assumed to relicense that separate distribution. Preserve both bundled licenses—[CC BY 4.0](public/models/bodyparts3d/LICENSE-CC-BY-4.0.txt) and [CC BY-SA 2.1 Japan](public/models/bodyparts3d/LICENSE-CC-BY-SA-2.1-JP.html)—and the attribution/version for each asset. The [asset README](public/models/bodyparts3d/README.md), [manifest](public/models/bodyparts3d/manifest.json) and [provenance](public/models/bodyparts3d/provenance.json) record the sources, adaptations and historical archive-header differences.

`scripts/convert-bodyparts3d.py` reproduces the selected, simplified GLBs from the checked archive, official viewer supplement and organ-part records. One shared transform converts source millimeters into the body frame; no organ is repositioned or independently resized. Source coverage is partial, and explanatory labels identify selected views. The reference body is not a population average or diagnostic reconstruction. Entering a source surface opens a separate microscopic teaching sample: the 4 cm vessel section is roughly 3 mm across, shows a uniform red blood volume, and reveals individual cells only at a smaller scale. See the asset README for reproduction instructions and the science notes for these distinctions.

The material route also distinguishes what each scale depicts: an 8 mm faceted quartz grain opens into a roughly 1.74 nm excerpt of the α-quartz network; a 30 nm cellulose microfibril segment opens into one 8 nm chain segment. Quartz coordinates use the [IUCr 298 K structure tables](https://journals.iucr.org/j/issues/2022/04/00/te5094/). The finite network cuts a continuous crystal. Cellulose packing, ring outlines and omitted side groups remain explicitly schematic; the illustrated chain count is not universal.

Local `deploy/` configuration, credentials, private backups, generated releases and test artifacts are excluded from the public repository. Production builds must be staged in `.next-dist` and verified before replacing the live `dist`.
