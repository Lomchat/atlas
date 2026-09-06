# Validation — 6 September 2026 — zoom-adaptive detail

Production: https://atlas.chalco.website

## Behavior

- A constituent's projected size now controls which layer is drawn. Zooming in progressively opens atoms, nuclei and nucleons; zooming out restores their envelopes.
- Manual expansion is also gated by readability. A fully unfolded overview no longer displays microscopic quarks. Clicking a branch that is too small approaches it, and explicitly closing a branch remains respected.
- The central branch stays prominent while surrounding structures fade. The inspector, breadcrumb, labels and displayed-constituent count follow the visible detail.
- Total graph sizes remain 88 (water), 204 (carbon dioxide), and 84 (methane), excluding the molecule root. These are composition totals, not counts that must all be rendered simultaneously.
- Deep zoom remains available. The near clipping plane adapts to camera distance, and wheel changes invalidate the rendered frame even for tiny movements.

## Checks

- TypeScript and the production build passed. The new bundle was built separately and deployed with an atomic directory exchange. Previous versions are retained in `releases/`; older asset hashes remain available for clients loading an earlier document.
- The Playwright suite passed locally and against the public HTTPS site, without browser errors or failed application requests: zoom alone reveals layers; reversing the movement restores three closed atoms; actual wheel events open contents; microscopic detail disappears from fully expanded and distant focused views; approaching restores it; branch opening/closing, actual ray picking, search, photon absorption/emission, theme and shared links still work without recreating the canvas.
- Mobile checks at 390 × 844 and 320 × 568 passed: zoom-driven layers, reverse collapse, detail suppression in the overview, and approaching a quark-containing branch without a covering drawer. Desktop checks use 1366 × 960.
- The suite checks composition totals, molecule changes, invalid URL values, browser errors and failed application requests.
- A separate check at 1440 × 1000 with normal motion passed locally and on the public site: intermediate opening values, stable detail after the camera settles, reverse collapse, persistent canvas identity and no page errors.
- Screenshots are in `artifacts/adaptive-*.png`. Caddy serves `/srv/explode/dist` over HTTPS.

Browser checks use headless Chromium with software WebGL. They verify behavior and layout, not physical-device frame rates or actual touchscreen hardware. Geometry remains a schematic composition model, not a quantum simulation.
