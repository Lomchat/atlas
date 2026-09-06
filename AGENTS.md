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
