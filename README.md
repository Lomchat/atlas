# Matière Atlas

https://atlas.chalco.website

An interactive French-language 3D atlas of matter. A single molecule stays in the same Three.js scene while its actual hierarchy unfolds: atoms contain nuclei and electrons; nuclei contain protons and neutrons; nucleons contain valence quarks. The neutral charcoal studio is inspired by Human Atlas and Model X Studio.

## Explore

- Click an atom, nucleus or nucleon to reveal its contents in place. Each branch can be opened or closed independently.
- Drag the global slider to unfold the entire hierarchy continuously, or play its animation.
- Double-click / approach a constituent to zoom into it. Context remains visible as ghosted surrounding structures; breadcrumbs and the composition tree preserve ancestry.
- Reassemble the molecule, orbit, zoom, toggle annotations and envelopes, or switch light / dark mode without rebuilding the scene.
- Observe a photon exchange or display an illustrative Higgs field in the same scene. Gluon curves appear inside opened nucleons.
- Search the constituents of the current molecule and share its exact open branches, selection and focus via URL.
- Water, carbon dioxide and methane. Respectively 88, 204 and 84 nested constituents excluding the molecule root; electrons and valence quarks are counted individually.

Keyboard: `R` reassemble, `L` annotations, Space animate/pause, `/` search, Escape return to the full molecule.

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

`src/continuum.ts` defines the persistent composition graph, ancestor paths and expansion state. `src/Scene.tsx` builds that graph once per molecule and interpolates its existing objects. Only changing the molecule recreates the renderer; opening nodes, scrubbing, focusing, changing theme and playing interactions do not.

## Verification

```sh
npm test
ATLAS_URL=https://atlas.chalco.website npm test
```

The local suite expects `npm run dev` to be running. Set `CHROMIUM_PATH` if needed, or install Chromium with `npx playwright install chromium`.

The browser suite checks persistent canvas identity, actual ray picking, independent branch opening, parent/child visibility, collapse, continuous global scrubbing, context-preserving focus, photon interaction in the same scene, theme changes without remounting, shared hierarchy URLs, mobile direct manipulation, constituent totals for all molecules and invalid URL handling. Screenshots are saved to `artifacts/`.

## Scientific conventions

This is a composition diagram, not a quantum simulation. Spheres and envelopes are visual conventions, not hard physical walls. Nuclei and their contents are enlarged. Clouds illustrate electron distributions rather than computed orbitals; electron markers are selectable symbols, not physical trajectories. The molecular representation uses simplified isolated-atom properties to explain composition.

Quarks are confined. Three displayed valence quarks omit the full quark–gluon dynamics, and the connecting curves are not physical wires. Photon animations illustrate energy exchange with arbitrary visual times and paths. The Higgs field is a conceptual surface. Neither interaction is presented as another component inside the electron.

Scientific sources are linked in the interface: CERN, OpenStax Chemistry 2e and PubChem. Geometry is original to this project. Human Atlas layout/camera inspiration is credited under its MIT license (`public/licenses/human-atlas.txt`); Model X Studio is a visual reference. No automotive or anatomy assets are reused. DM Sans is distributed under the SIL Open Font License.
