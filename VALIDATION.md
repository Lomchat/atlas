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

## Persistent exploration button and animated lessons

The scene exploration button now uses the same functional navigation action as the top inward control at every scale. It follows remembered branches, accepts rapid click bursts and stays visible at elementary particles with an explicit disabled endpoint. It remains available when annotations are hidden.

All seven lessons now animate within the selected moment. A shared clock drives photon travel, excited-state halos, moving bond/nuclear/gluon highlights, gas trails and molecular motion. Pause freezes that clock; replay restarts the current moment without changing the phase. Reduced motion uses fixed diagrams. The photon excitation halo is shown only during absorption, not after returning to the initial state. Animated highlights remain schematic reading aids.

The desktop lesson panel is 440 px wide with 15 px body text, versus 292 px and 12 px previously. The ordinary desktop inspector is 320 px wide with 14 px descriptive text. Camera fitting reserves the increased panel widths. Mobile and landscape layouts use larger text, with a compact close/header arrangement on very short screens.

The full existing navigation suite passed locally, including ray picking, orbit centering, wheel reversal, hydrogen pinch, search, themes and persistent renderer. The dedicated normal-motion `npm run test:experience` suite passed locally: the scene button alone traversed all three materials to quarks, synchronous bursts clamped at the endpoint, all seven lessons visibly changed between frames while staying on the same phase, pause and replay worked, and mobile/landscape/reduced-motion behavior passed without page errors. A final targeted 320 × 568 check verified all three larger water-explanation paragraphs fit above the controls and the close button stayed accessible. Screenshots are in `artifacts/experience-*.png`.

The final build passed TypeScript and Vite checks and was deployed by atomic directory exchange. The previous version is retained at `releases/before-animated-lessons-20260906T111653Z`. The public HTTPS document serves `index-DfeblLVq.js` and `index-D7dE0_ZF.css` successfully.

The full experience suite also passed against the public HTTPS deployment, including the remembered non-default hydrogen/quark branch, seven animated lessons, pause/replay, desktop/mobile/landscape layouts, reduced motion, stable renderer and no page errors.

## Colored procedural objects

The shared macro model factory now builds rounded glass walls with a thick foot and rolled lip, separate blue/turquoise liquid surfaces and menisci, and 46 outlined bubbles for sparkling water. The methane flask uses cobalt glass, a shaped shoulder, a ribbed copper stopper, rear graduations and a curved cream CH₄ label. Coasters have colored enamel edges. The same palette is used by the gallery illustrations. Sample volumes use optical edges and colored reference points; the methane label explicitly identifies the gas as colorless.

The optical shader uses view-space normals so its appearance remains consistent between unit-sized gallery previews and the enlarged main scene. All materials fade with the existing camera-driven layers; opaque labels and coasters stop writing depth during fades. Generated label textures are disposed with each model.

TypeScript and the staged production build passed. The existing picker suite passed locally, covering preview rotation, selection/cancel/resume, focus restoration, cleanup, both themes and desktop/mobile/landscape layouts. The full scales suite passed locally: all three object-to-quark routes and their reverse, manual zoom, persistent renderer, every interaction and phase, gallery and mobile layouts, with no page errors. Final material adjustments were checked with fresh screenshots of all three objects and galleries, with no browser console or shader errors. Screenshots are under `artifacts/models-final-*.png`, `artifacts/scales-*.png` and `artifacts/picker-*.png`.

The final build was deployed by atomic directory exchange. The previous version is retained at `releases/before-colored-objects-20260906T114630Z`. Public HTTPS serves `index-Dj9S9Gxh.js`; the stylesheet is unchanged.

The picker suite also passed against the public HTTPS deployment after release, including both themes, preview rotation, selection and focus preservation, mobile/small/landscape layouts and renderer cleanup.

## English interface and public repository

All application copy is now English: document language/title/description, object and particle names, generated atom/nucleus descriptions, facts and decimal notation, seven lessons, scene labels/tooltips, gallery, printed flask label, search/empty state, About, notifications, keyboard hints, accessibility labels and graphics fallback. Responsive CSS selectors and existing browser-test locators follow the translated labels. Zero neutrons and single-nucleon descriptions use English pluralization; the About dialog now lists the implemented keyboard shortcuts.

The final TypeScript/Vite build passed, along with the collection and full scale/interaction suites. Source strings were reviewed, and English desktop/mobile gallery and lesson screenshots were visually checked. The GitHub repository is public at https://github.com/Lomchat/atlas and preserves the existing project history and third-party credits.

The full navigation suite also passed: ancestor/child traversal, ray picking, orbit centering, wheel reversal, mobile/landscape, hydrogen pinch, English search, photon controls, themes, sharing and persistent renderer, with no browser or request errors. Production was updated by atomic directory exchange; the previous release is retained at `releases/before-english-20260906T180243Z`. Public HTTPS serves `index-CFOtr1MU.js` and `index-DIdLMtXC.css`. A targeted public-browser check passed for English document metadata, About, search and its empty state, generated hydrogen copy, sharing notifications and the WebGL-loss fallback.
