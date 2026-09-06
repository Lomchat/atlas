# Matière Atlas

https://atlas.chalco.website

An interactive French-language Three.js atlas of matter, from familiar objects to valence quarks. The neutral studio and camera-led exploration are inspired by Human Atlas and Model X Studio.

## Explore

- Start with a glass of water, a glass of sparkling water or a methane flask. The collection dialog shows the large object in 3D, with a small molecular illustration and the path between them. Browsing and cancelling preserve the current exploration; entering a different material starts at its object.
- Shared procedural object models use rounded vessel walls, blue/turquoise water and menisci, outlined bubbles, and a cobalt glass flask with a ribbed copper cap and a curved printed label. Scale-independent optical edges keep transparent surfaces readable in the scene and gallery; geometries, materials and label textures are released together.
- One camera follows object → sampled volume / CO₂ bubble → molecular neighborhood → one molecule → atom → nucleus → nucleon → quark. The reverse path remains available throughout. Surrounding representations fade with the actual camera scale. An anchored marker connects each large level with the next smaller volume.
- The exploration button inside the scene continues through every scale to the quarks, shares the current named destination and supports rapid repeated clicks. Elementary particles show an explicit endpoint.
- The two top buttons name their destinations. Repeated clicks immediately update the requested destination, including a reversal during a flight. Macro transitions interpolate distance logarithmically; all button flights last 300 ms with no animation queue. Reduced motion snaps to the destination.
- Wheel and pinch remain available. At macroscopic scales, wheel zoom stays centered on the sampled volume. Within the molecule, pointer targeting, remembered branches, fixed child coordinates and adaptive layers remain active.
- Contextual explanations connect an observable effect to its meaning: attractions between water molecules, gas motion and wall collisions, covalent bonds, nuclear cohesion, gluon exchanges, photon absorption/emission, and the Higgs field. Each has three user-controlled moments, a legend, a limitation and a scientific source. Animations loop within the selected moment: moving photons, energy halos, traveling highlights, gas trails and water motion. Pause freezes the animation clock; replay restarts the current moment. Reduced motion uses static diagrams. The 440 px desktop explanation panel uses 15 px body text, and camera framing reserves its actual width. Photon energy levels are shown alongside the 3D representation.
- The macro objects, molecular neighbors and selected microscopic hierarchy share one renderer. Water, carbon dioxide and methane retain their 88, 204 and 84 microscopic nodes excluding the molecule. The three outer nodes describe sampled scales, not actual counts of molecules.
- Search, theme selection, orbit, annotations, sharing and the composition tree remain available. There is no unfolding gauge.

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

`src/continuum.ts` defines the persistent graph and the current navigation target. `src/Scene.tsx` constructs it once per molecule. Child positions are fixed; opening envelopes does not move their contents. Camera fitting targets the selected constituent's center and bounds, while a stable branch preference determines the next destination. Layer thresholds use camera-to-object distance and scale with the available viewport. A small hysteresis keeps layer boundaries stable.

## Verification

```sh
npm test
npm run test:rapid
npm run test:picker
npm run test:scales
npm run test:experience
ATLAS_URL=https://atlas.chalco.website npm test
```

The local suite expects `npm run dev` to be running. Set `CHROMIUM_PATH` if needed, or install Chromium with `npx playwright install chromium`.

The rapid-navigation suite uses normal motion to check batched clicks, actual seven-click bursts, mid-flight reversal, endpoint clamping, keyboard repeat, remembered siblings and mobile behavior. The main browser suite checks the named inward/outward destination chain, disabled endpoint buttons, a pointed sibling remaining selected, exact ray picking, centered camera targets after orbiting, wheel reversal, mobile and landscape layouts, pinch targeting a hydrogen atom, absence of the gauge, persistent scene identity, photons, search, themes, shared URLs and graph composition totals. Screenshots are saved to `artifacts/navigation-*.png`.

## Scientific conventions

The scale chain is a schematic composition diagram, not a literal geometric scale model or a quantum simulation. Intermediate sizes are adapted to make the transitions readable. Neighboring molecules and volume specks are illustrative samples, never a count of all molecules present. The highlighted water volume and methane volume are conceptual samples without a physical membrane; the CO₂ bubble has a real gas–liquid interface. The sparkling-water route follows the CO₂ in the bubble while the surrounding liquid contains water.

Within a molecule, spheres and envelopes are visual conventions. Nuclei are enlarged; clouds do not compute molecular orbitals. Electron markers identify constituents, not classical trajectories. The photon lesson uses an isolated-atom, two-level schematic; molecular energy levels differ. Its steps do not represent elapsed physical time.

The nuclear links, intermolecular dashed lines and gluon curves are symbolic. Gas trajectories are slowed, simplified wall-collision illustrations. Three valence quarks omit full quark–gluon dynamics and virtual pairs; quarks remain confined. The Higgs dots represent a field, not individual bosons, a fluid or friction. The lesson distinguishes elementary-particle mass from the strong-interaction contribution that dominates proton mass.

Sources are linked in each explanation and the inspector: OpenStax Chemistry 2e, CERN and PubChem. All 3D geometry is procedural and local. Human Atlas inspiration is credited under its MIT license (`public/licenses/human-atlas.txt`); Model X Studio is a visual reference. No automotive or anatomy assets are reused. DM Sans uses the SIL Open Font License.
