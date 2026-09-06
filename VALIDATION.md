# Validation — 6 September 2026 — continuous hierarchy

Production: https://atlas.chalco.website

- TypeScript checking and the production build passed. The build was staged separately, then exchanged atomically with the live directory; the previous version is retained in `releases/`. Existing asset hashes were preserved for clients already loading the old document.
- The complete Playwright suite passed both locally and against the public HTTPS site, with no browser errors or failed application requests: persistent canvas identity, actual ray picking, independent atom/nucleus/nucleon opening, nested quark visibility, parent collapse, continuous global expansion, focus with surrounding context, photon absorption/emission in the same scene, theme changes without remounting, search, shared hierarchy URLs, invalid query handling and all three molecules.
- Fully expanded constituent counts excluding the molecule root: water 88, carbon dioxide 204, methane 84. These include atoms, nuclei, nucleons, electrons and valence quarks at their respective nesting levels.
- Mobile checks at 390 × 844 and 320 × 568 verify direct opening without a covering details drawer, tree-based opening and full expansion. Desktop checks use 1366 × 960.
- A separate check with normal motion at 1440 × 1000 passed: intermediate opening values, automatic unfolding, pause, persistent scene identity and no page errors. The main suite uses reduced motion for deterministic geometry assertions.
- The interface uses a neutral charcoal palette and a light theme. Screenshots of the assembled molecule, nested expansion, individual branches, focused quarks and mobile layouts are in `artifacts/continuum-*.png`.
- HTTPS returns 200; HTTP redirects to HTTPS. Caddy serves `/srv/explode/dist` without an application process.

Browser checks use headless Chromium with software WebGL. They verify behavior and layout, not physical-device frame rates or actual touchscreen hardware. Geometry is a schematic composition model, not a quantum simulation.
