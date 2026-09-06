# Validation — 6 September 2026 — continuous scales and explained interactions

Production: https://atlas.chalco.website

## Current behavior

- All three materials have an eight-level named route: object → sampled volume or CO₂ bubble → molecular neighborhood → molecule → atom → nucleus → nucleon → valence quark. The root is now the object. Deep links to existing molecular constituents remain valid.
- The same renderer contains the three outer representations and the original microscopic graph. A central marker links the sampled regions. Visibility follows the camera's framed scale, with overlapping fades. Macro wheel zoom stays centered; microscopic pointer targeting, orbit and pinch remain available.
- The two navigation buttons accept repeated requests during their 300 ms transitions. Large scale changes interpolate camera distance logarithmically. New requests replace the current destination, including a mid-flight reversal. Reduced motion snaps to the requested view.
- The collection dialog presents the macroscopic object in a draggable 3D preview, illustrated object choices and a miniature molecule. Browsing, cancellation and resuming preserve the main renderer and focused constituent. Entering another material starts at the object. Preview GPU resources are disposed on close.
- Seven contextual explanations provide three user-controlled moments, observable 3D effects, legends, interpretation and linked scientific sources: water cohesion, gas motion, chemical bonds, nuclear cohesion, strong interaction, photon energy exchange and the Higgs field. The photon lesson includes an energy-level diagram. No timed explanatory sequence expires before it can be read. Navigating with the named controls exits the lesson; Escape closes it while retaining the current scale.
- All macro counts are illustrative samples. The inspector distinguishes the conceptual water/methane sample boundary from the CO₂ gas–water interface. Intermolecular attractions, chemical bonds, nuclear links and gluon curves are identified separately. Higgs markers are symbolic field markers, not individual bosons or a viscous medium.

## Local checks

- TypeScript, staged Vite production build and `git diff --check` passed.
- The full existing navigation suite passed after adapting its molecule-overview setup to the added outer levels: exact inward/outward ancestry, pointed sibling choice, ray picking, camera centering after orbit, wheel reversal, hydrogen pinch targeting, all three microscopic graph totals, search, photon explanation controls, themes, sharing, invalid URLs, absence of the unfolding gauge, persistent renderer and no browser errors or failed application requests.
- The normal-motion rapid-navigation suite passed at 1440 × 1000 and 390 × 844: batched events, actual seven-click bursts across the entire route, endpoint clamping, direction reversal, no queued flights, keyboard repeat and remembered non-default branches.
- The collection suite passed after changing the preview to macro objects: real drag, choice browsing without resetting the main focus, resuming, explicit commit, native dialog Escape/backdrop dismissal and focus restoration, keyboard selection, renderer cleanup, light mode and usable confirmation buttons at 1440 × 1000, 390 × 844, 320 × 568 and 844 × 390.

Screenshots are saved under `artifacts/scales-*.png`, `artifacts/picker-*.png` and `artifacts/navigation-*.png`. Verification uses headless Chromium with software WebGL; touch gestures are emulated. These checks do not measure hardware touchscreen performance or validate a physical simulation.

- The dedicated scale/interaction suite passed locally: all three routes from object to quark and back, stable renderer identity, manual wheel traversal through neighborhood/volume/object and back, every contextual lesson and its three phases, visible pixel changes in the 3D scene for the five microscopic lessons, gallery previews, mobile/landscape layouts, and Escape closing an explanation without changing the focused atom. No page errors occurred.
- A final targeted 320 × 568 check verified that all three explanation paragraphs fit above the sticky controls after the compact-header adjustment. The final screenshots were visually inspected, including the smaller Higgs markers and the object/molecule gallery layout.

## Deployment

The final production build was staged outside the live directory and deployed by atomic directory exchange. The prior version is retained at `releases/before-continuous-scales-20260906T105416Z`. Caddy serves the new `index-CRWpTIfV.js` and `index-BSXBvkCk.css` assets; HTTPS retrieval succeeded. No server configuration change was needed.

The full scale/interaction suite also passed against the public HTTPS deployment, including all three routes, macro wheel traversal, every contextual lesson, all gallery previews, mobile/landscape layouts, persistent renderer identity and no page errors.
