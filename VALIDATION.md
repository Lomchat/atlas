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

## Rapid navigation

Navigation controls now remain active during movement, except at actual hierarchy endpoints. Each click resolves against the latest requested destination using a functional state update, so even multiple events in the same browser task advance separately. Previously chosen branches survive a rapid return and re-entry. Keyboard repeat and the inspector's navigation actions use the same behavior.

Camera transitions use a 300 ms wall-clock cubic easing. New requests retarget from the current camera position, without queuing intermediate flights. Manual wheel/orbit input cancels the flight. The displayed destination remains stable while the camera and detail settle.

The dedicated `npm run test:rapid` suite passed both locally and on the public HTTPS site with normal motion at 1440 × 1000 and 390 × 844: synchronous click bursts, actual quadruple mouse clicks, immediate labels and enabled buttons, excess-click endpoint clamping, reversing mid-flight, no later replay of queued motion, rapid keyboard events, remembered non-default siblings, persistent renderer and no page errors.

The complete existing navigation suite also passed after this change, including wheel reversal and hydrogen pinch targeting. TypeScript and the staged production build passed; the live site returns HTTP 200.
