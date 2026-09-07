# Matter Atlas contributor instructions

## Languages are a permanent product requirement

The app supports English (`en`) and French (`fr`). Every user-facing change must ship in both languages in the same commit. This includes visible copy, accessibility labels, tooltips, notices, empty/error states, document metadata, scientific explanations, generated descriptions and text painted into 3D textures.

- Put messages in `src/locales/en.json` and `src/locales/fr.json`, with identical keys and interpolation placeholders. English source messages are the typed message IDs; use `t(key, params)` from `src/i18n.ts`. Do not concatenate sentence fragments when grammar depends on language. Proper names, formulae and language endonyms may stay literal.
- `useLocale()` subscribes React components. The locale order is a valid `?lang=` parameter, a saved `atlas-language` preference, the browser language, then English. Shared URLs include the selected locale. Storage failure must remain harmless.
- Data/content getters resolve translations when read. Keep the matter graph, constituent IDs, geometry, colors and navigation state independent of language. Switching language must preserve the current molecule, camera/orbit/zoom, selected branch, open lesson and its phase/pause state, and any gallery selection.
- Three.js labels, canvas accessibility labels and the flask texture must update in place; do not remount the renderer to change language. Dispose generated GPU resources normally.
- CSS must use classes or stable `data-action` attributes, never translated `aria-label` values.

## Every test must have an English and French equivalent

Use one parameterized scenario with the same assertions in both locales, not separately maintained copies. This requirement applies to every new or changed test, including navigation, visual/layout, accessibility, animation and fallback/error tests. A pass in only one language is incomplete.

- Add browser suites as `scripts/verify-<feature>.mjs`. `scripts/test-matrix.mjs` discovers every `verify*.mjs` suite automatically and executes it in both `en` and `fr`, with no locale-specific skips or weaker assertions. `npm test` is the full bilingual gate.
- Import `locale`, `browserLocale`, `text`, `stepName`, `artifact` and/or `assertLocale` from `scripts/locale-fixture.mjs`. Set the Playwright context locale to `browserLocale`, assert the actual document language, and resolve accessible-name selectors with `text(...)`. Use stable constituent IDs to test navigation. Direct scripts require an explicit `ATLAS_LOCALE`; this is for diagnosis, not a substitute for the matrix.
- Store screenshots with `artifact(name)` so French and English results never overwrite one another. Inspect relevant screens in both languages, including mobile where text length changes the layout.
- `scripts/check-catalogs.mjs` checks key completeness, nonempty translations and matching interpolation placeholders before every matrix run. It also rejects untranslated JSX/accessible labels and requires every discovered suite to use the locale fixture and assert its language. Never silence missing translations with a broad fallback or skip the French run.
- `npm run test:language` specifically checks switching in both directions, persistence, URL precedence, unchanged exploration state, gallery text/texture updates, small-screen access and fallbacks. Extend it when adding another language-dependent surface.
- For focused work, `npm run test:navigation`, `test:rapid`, `test:picker`, `test:scales`, `test:experience` and `test:language` each run both languages. Before publishing changes, run `npm run build -- --outDir .next-dist`, `npm test`, and `git diff --check`. Once they pass, repeat only checks justified by subsequent changes or unresolved failures.

## Workspace and publication

The live static site is https://atlas.chalco.website. Build into `.next-dist`, never directly over the live `dist`. Preserve the running site until verification finishes. Do not edit application source or build while browser suites run: Vite reloads can invalidate those checks.

The public repository is https://github.com/Lomchat/atlas. `deploy/` is local server configuration and must remain ignored and absent from Git history. Do not add it, credentials, private backups, generated releases or test artifacts to the public repository. Preserve existing third-party credits and licenses.

## Spatial exploration invariants

`src/MatterVolume.ts` provides deterministic molecular cell positions and orientations, bounded to the actual liquid, methane flask or CO₂ bubbles. `ExplorerState.site` selects a cell; graph constituent IDs remain relative to that cell. Changing the site must preserve the renderer and move the active hierarchy to the exact position/orientation of the picked instance. Shared links preserve site, current viewpoint and locale. Reset/material changes clear the site.

Keep cursor/pinch zoom enabled at every scale. A container reveals only its direct contents: atom → nucleus/electrons, nucleus → nucleons, nucleon → quarks. Surrounding siblings and their descendants must be hidden and unpickable once entered. Wheel, pinch, clicks and named navigation share that rule, in both directions. The composition tree follows the active path. Entering a vessel bridges the empty macro-to-molecular scale range and fills the viewport with a bounded spatial sample of molecules. Never truncate a cell loop in coordinate order: distribute the rendering budget throughout the view. Distant dots represent volumes, not a claimed molecular count. The ordinary spatial layout is fixed; explicit interaction lessons animate separate explanatory diagrams around the current site. Always invalidate instanced ray bounds after streaming cells and dispose the volume’s geometry, materials and instance resources. `npm run test:volume` runs the full spatial scenario in both languages.

## Physical scale and the permanent reference

`src/physicalScale.ts` owns SI calibration, fixed radii and comparison dimensions. The 3D molecular unit is calibrated to NIST experimental bond lengths; macro model units are 4 cm. Never enlarge an envelope when opening it. The scene uses a floating origin at the active molecular cell; `MatterVolume` converts between absolute cell positions and local render coordinates. Preserve that rebasing for camera targets, flights, picking and shared locations.

`SizeReference` contains an independently framed 3D comparison: both objects share one physical scale within that panel. Keep their true dimensional ratio, label the separate scale, and disclose when one object is too small to resolve. The selectable hair, DNA and ruler references persist across language changes. `ComparisonModels.updateLanguage()` must repaint any embedded macro texture in place; the comparison renderer must survive a language switch. A second ruler measures the main camera target's meters per CSS pixel continuously; never resize that SVG with responsive CSS. Elementary particles have no assigned diameter: compare a labeled 200-pixel view frame instead. Atomic/nuclear radii are approximate conventions; particle markers, density, clouds and interaction graphics remain illustrative. Record dimension sources in `SCIENCE.md`.

Tests must explicitly select the main renderer with `canvas[data-scene-id]`; the comparison and gallery have their own canvases. Verify that only allowed constituents are revealed, hidden siblings cannot be picked, both zoom directions recover the parent, and every visible particle has an accessible label. `verify-size-reference.mjs` checks comparison ratios, main-view projection, fixed envelopes, containment, distant sites and mobile lessons in both languages.
