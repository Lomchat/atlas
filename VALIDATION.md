# Validation — 6 September 2026

Production: https://atlas.chalco.website

- Production build and TypeScript checking passed.
- Complete Playwright interaction suite passed against the public HTTPS site: mesh ray picking, exploded positions, isolation, five exploration levels, isotope constituent counts, neutron valence-quark composition, full photon absorption/emission sequence, search, molecule switching, theme, annotations, dialog keyboard behavior, invalid shared URL values, mobile and landscape layouts.
- Viewports: 1280 × 900, 390 × 844, 320 × 568, 844 × 390. No application request failures or browser errors were recorded.
- Additional public-site check with normal motion at 1440 × 1000 passed: startup camera orientation, details panel close/reopen, automatic rotation and reset.
- HTTPS returns 200 with a valid Let's Encrypt certificate; HTTP redirects to HTTPS. Static files are served by Caddy from `/srv/explode/dist`.
- Runtime dependency audit: no reported vulnerabilities.
- Screenshots are available locally in `artifacts/`, including `live-desktop.png`.

Browser checks used headless Chromium with software WebGL. These checks verify behavior and layout, not physical-device frame rates or actual touchscreen hardware.
