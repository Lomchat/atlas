# Matière Atlas

https://atlas.chalco.website

An interactive French-language 3D atlas of matter. A single molecule stays in the same Three.js scene while its actual hierarchy unfolds: atoms contain nuclei and electrons; nuclei contain protons and neutrons; nucleons contain valence quarks. The neutral charcoal studio is inspired by Human Atlas and Model X Studio.

## Explore

- Two buttons at the top name the next inward destination and the outward parent. They remain usable during camera motion: repeated clicks immediately advance the requested destination, and changing direction retargets from the current camera position. Transitions use a 300 ms wall-clock easing instead of queuing animations. They move the camera through the same scene: molecule → atom → nucleus → nucleon → quark, with the reverse route always available.
- Point at a different visible child to choose it as the inward destination. That choice stays in place when moving to the button. Clicking a constituent or a composition-tree entry approaches that exact object.
- Wheel and pinch gestures also reveal successive layers. Geometry stays at fixed local coordinates, and detail uses camera distance rather than projected depth. Only the targeted branch opens automatically; its surroundings remain as faint context.
- Elementary particles have no deeper destination; the inward button indicates that limit. The outward button is disabled at the molecule overview.
- There is no unfolding gauge, automatic unfolding animation or separate expansion mode.
- Orbit, return to the molecule, toggle annotations and envelopes, or change the theme. Search, a photon exchange and the illustrative Higgs field remain available.
- Water, carbon dioxide and methane contain 88, 204 and 84 nested graph nodes excluding the root; only readable layers are displayed. A focused constituent can be shared via its URL.

Keyboard: `R` reset, `L` annotations, `+` / `−` move to the named destination, `/` search, Escape return to the molecule.

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
ATLAS_URL=https://atlas.chalco.website npm test
```

The local suite expects `npm run dev` to be running. Set `CHROMIUM_PATH` if needed, or install Chromium with `npx playwright install chromium`.

The rapid-navigation suite uses normal motion to check batched clicks, actual quadruple clicks, mid-flight reversal, endpoint clamping, keyboard repeat, remembered siblings and mobile behavior. The main browser suite checks the named inward/outward destination chain, disabled endpoint buttons, a pointed sibling remaining selected, exact ray picking, centered camera targets after orbiting, wheel reversal, mobile and landscape layouts, pinch targeting a hydrogen atom, absence of the gauge, persistent scene identity, photons, search, themes, shared URLs and graph composition totals. Screenshots are saved to `artifacts/navigation-*.png`.

## Scientific conventions

This is a composition diagram, not a quantum simulation. Spheres and envelopes are visual conventions, not hard physical walls. Nuclei and their contents are enlarged. Clouds illustrate electron distributions rather than computed orbitals; electron markers are selectable symbols, not physical trajectories. The molecular representation uses simplified isolated-atom properties to explain composition.

Quarks are confined. Three displayed valence quarks omit the full quark–gluon dynamics, and the connecting curves are not physical wires. Photon animations illustrate energy exchange with arbitrary visual times and paths. The Higgs field is a conceptual surface. Neither interaction is presented as another component inside the electron.

Scientific sources are linked in the interface: CERN, OpenStax Chemistry 2e and PubChem. Geometry is original to this project. Human Atlas layout/camera inspiration is credited under its MIT license (`public/licenses/human-atlas.txt`); Model X Studio is a visual reference. No automotive or anatomy assets are reused. DM Sans is distributed under the SIL Open Font License.
