# Matière Atlas

An interactive, French-language 3D atlas of matter. Built with React, TypeScript and Three.js, inspired by the full-screen studio, floating controls and exploded exploration of ashemag’s Human Atlas and Model X Studio.

Public site: https://atlas.chalco.website

## Explore

- Water, carbon dioxide and methane, with independently selectable atoms and bonds.
- Hydrogen-1, carbon-12 and oxygen-16: illustrative electron clouds and nucleus inspection.
- Exploded nuclei with individually selectable protons and neutrons.
- Proton / neutron valence-quark composition and symbolic gluon interactions.
- A playable hydrogen photon absorption / excitation / emission sequence, plus gluon and Higgs illustrations.
- Ray-based 3D selection, isolation, smooth exploded views, orbit, zoom, rotation, annotations, light/dark mode, searchable catalog and shareable subject URLs.
- Responsive mobile controls, keyboard shortcuts and reduced-motion support.

## Development

Node 20.19+ or Node 22.12+.

```sh
npm ci
npm run dev
npm run build
```

Vite listens on `127.0.0.1:3017`. `dist/` is a static production build. Fonts and geometry are local; there is no backend, account, external API or database requirement.

## Verification

```sh
npm test
```

The browser suite expects a running app at `http://127.0.0.1:3017`; override with `ATLAS_URL`. Set `CHROMIUM_PATH` if needed or install Chromium with `npx playwright install chromium`. It checks actual mesh picking, exploded positions, isolation, constituent counts across scales, neutron composition, photon playback, catalog search, theme, keyboard behavior, invalid URL values and mobile / landscape layouts. Screenshots are written to `artifacts/`.

## Scientific conventions

This is an educational visualization, not a quantum-mechanical simulation. Electron clouds are illustrative point distributions, not calculated orbitals; electron markers are selectable bookkeeping symbols, not trajectories. Atomic nuclei are enlarged. The molecular-to-atomic transition switches to an isolated-atom model. Nuclear spheres and separated quarks are schematic: quarks are confined, and the three displayed valence quarks do not show the full quark–gluon dynamics. Interaction scenes do not imply that photons or Higgs bosons are smaller components inside electrons.

The photon scene illustrates the hydrogen n=1 / n=2 transition (approximately 10.2 eV, 121.6 nm). Sizes, times and wave shapes are illustrative. The Higgs field is represented by a symbolic surface.

Sources are linked inside the app: CERN, OpenStax Chemistry 2e, PubChem. Each selection includes context and a source. The About dialog explains limitations and credits.

## Credits

Human Atlas (ashemag, MIT): adapted layout and camera-framing principles; original notice in `public/licenses/human-atlas.txt`.
Model X Studio (ashemag): visual / interaction reference; no automotive assets are reused.
All matter geometry is generated in this project. DM Sans is distributed under the SIL Open Font License (`public/licenses/dm-sans.txt`).
