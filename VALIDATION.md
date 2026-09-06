# Validation — 6 September 2026 — named zoom navigation

Production: https://atlas.chalco.website

## Behavior

- The unfolding gauge, full-expansion controls and automatic unfolding mode have been removed.
- Exactly two main navigation buttons name the outward parent and inward child. They follow molecule → atom → nucleus → nucleon → elementary particle, with the same path back. Endpoint buttons are disabled with an explicit label.
- Pointing at a visible sibling changes the inward destination, which remains selected when moving the pointer to the button. Clicking an object, its label or a tree entry targets that exact constituent.
- Child coordinates remain fixed throughout exploration. Camera fitting uses the selected object's center and bounds. Readability uses camera-to-object distance instead of projected depth, with hysteresis and one targeted branch. Orbiting no longer shifts the annotation coordinates behind the camera update.
- Wheel and pinch navigation remain available. A pinch over a hydrogen atom follows that branch instead of the default oxygen branch.
- The underlying graph retains 88 (water), 204 (carbon dioxide) and 84 (methane) nodes excluding the root. Only the readable hierarchy is displayed, in the same renderer.

## Checks

- TypeScript and production build passed. The build is staged outside the live directory before an atomic directory exchange. Older releases and hashed assets remain available.
- The complete local Playwright suite passed: named inward/outward chain; elementary and overview endpoints; no gauge; remembered sibling choice; actual mesh picking; centered targets after orbit; wheel progression and reversal; photon exchange; search; themes; shared focus; invalid URLs; all molecule graph totals; persistent renderer; no browser errors or failed application requests.
- Layout and navigation passed at 1440 × 1000, 390 × 844, 320 × 568 and 844 × 390. Mobile composition selection closes the drawer. A two-touch gesture was injected through Chromium's touch input protocol to verify hydrogen pinch targeting.
- A separate normal-motion check passed both locally and on the public HTTPS site: named camera destinations, stable centered targets after transitions, outward navigation and persistent renderer identity.
- Screenshots are in `artifacts/navigation-*.png`. Production is served statically by Caddy from `/srv/explode/dist`.

Checks use headless Chromium and software WebGL. Touch events are emulated; these tests do not measure physical-device frame rates or touchscreen hardware. The geometry remains a schematic composition model, not a quantum simulation.
