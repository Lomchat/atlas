# Atlas contributor instructions

Atlas is a "Powers of Ten" journey: one continuous zoom from quarks to the observable Universe, drawn as vivid, playful 3D illustrations (think Kurzgesagt). The visitor starts in a small park diorama and dives into a person, a tree or a pond, or zooms out to Earth, the Solar System and the galaxies. Every inward journey ends in an atom, its nucleus, a proton and a quark. It is built for curiosity: short, accurate texts, "Did you know?" facts, hotspots, a guided tour and a scale ruler that always shows where you are.

## Architecture

- `src/levels/` holds pure data (no Three.js): `types.ts`, `index.ts` (graph helpers) and `data/*.ts`, one file per journey. `data/matter.ts` generates the atom → almost nothing → nucleus → proton → quark chain for each element. Node test scripts import this registry directly through type stripping, so keep explicit `.ts` import extensions there.
- A level has an `id` (stable URL `?at=`), a `parent`, a `size` in metres (largest extent of the subject), optional `frame` (home view extent ÷ size, default 1.5), `view` (home pitch/yaw), `anchor` (where it sits inside its parent, in the parent's local units), `theme` colours, and bilingual content: `title`, `short`, `compare`, `hook`, `facts`, `hotspots`, `source`.
- `src/levels/scenes/` holds one lazily loaded builder per scene key (`scenes/index.ts`). A module that fails to load or build falls back to `placeholder.ts` without breaking navigation. Shared props live in `scenes/common/`.
- `src/engine/Atlas.ts` is the infinite-zoom engine: the visitor's position is `z = log10(view extent in m)` plus a root-to-leaf path. Levels are rendered in the frame of the current level (floating origin), largest first, each in its own scene; partially transparent levels are cross-faded through render targets. `src/engine/kit.ts` is the illustrated style kit (toon/halo/glow/points/line materials, blobs, tubes, canvas textures) and tracks every GPU resource for disposal.
- `src/App.tsx` and `src/ui/` are the interface: level card, controls (zoom out / guided tour / dive, branch choice), scale ruler, floating labels for children and hotspots, intro, about, language flags. The engine is created once; language changes never rebuild it.

## Languages are a permanent product requirement

The app supports English (`en`) and French (`fr`). Every user-facing change must ship in both languages in the same commit: visible copy, accessibility labels, tooltips, notices, errors, document metadata and scientific texts.

- UI messages live in `src/locales/en.json` and `src/locales/fr.json` with identical keys and placeholders; the English text is the key. Use `t(key, params)` from `src/i18n.ts`. Never concatenate sentence fragments whose grammar depends on the language.
- Level content in `src/levels/data/*.ts` uses required `Bilingual { en, fr }` pairs, read with `tr()`. French is written naturally (not translated word for word) and addresses the visitor as « tu ». Proper names, formulae and units may stay literal.
- Locale order: valid `?lang=`, saved `atlas-language`, browser language, then English. Shared URLs include the language. Storage failures must stay harmless. Switching language keeps the current level, zoom and branch, and never remounts the renderer. No text is painted into 3D.
- CSS targets classes or `data-*` attributes, never translated `aria-label` values.

## Every test runs in English and French

Use one parameterised scenario with the same assertions in both languages.

- Browser suites are `scripts/verify-<feature>.mjs`; `scripts/test-matrix.mjs` discovers them and runs each in `en` and `fr`. `npm test` is the full bilingual gate; `npm run test:<feature>` runs one suite in both languages.
- Suites import `locale`, `browserLocale`, `text`, `artifact` and `assertLocale` from `scripts/locale-fixture.mjs`, set the Playwright locale to `browserLocale`, assert the document language and resolve accessible names with `text(...)` or `tr(...)`. Use stable level ids and `data-*` attributes for navigation. Store screenshots with `artifact(name)`.
- `scripts/check-catalogs.mjs` runs before every matrix: catalog parity, placeholders, untranslated JSX/labels, and the level registry (bilingual fields, unique ids, decreasing sizes along every path, anchors, sources, hotspots). Never silence a missing translation or skip the French run.
- Before publishing: `npm run build -- --outDir .next-dist`, `npm test`, `git diff --check`.

## Writing a scene

A scene builder receives `{ kit, level, params, children, quality }` and returns `{ root, env?, update?, dispose? }`.

- **Units and axes.** 10 local units = `level.size`; the subject is centred on the origin, spans about ±5 units and faces +Z (the camera looks along −Z). +Y is up. The home orientation comes from `level.view`. At the home view about `10 × frame` units fit across the smaller side of the free viewport. Keep the subject within ±6 units of depth and surroundings within ±15; the engine flattens very magnified levels.
- **Children are drawn by their own scenes**, on top of this level, at their anchor, scaled by `child.size / level.size` (see `children[].at`, `.ratio`, `.radius`). Do not draw a second copy of a child; shape the parent so the child sits naturally there (a socket, a matching colour, a gap). A child anchor should be on the side facing the camera. Siblings not being entered fade out.
- **Surroundings** (neighbouring cells, stars, molecules, a patch of ground) go in `env` with `{ env: true }` materials: they fade in as the visitor arrives and fade out when the level is seen from its parent. The engine fades the whole parent out while diving into a child (progress 0.45–0.86), and fades the child in when it is larger than ~0.5 % of the view.
- **Frame data.** `update()` receives `time`, `dt`, `immersion`, `alpha`, `current`, `extent` (the current view width in this level's units, about `10 × frame` at home: use it to keep sparks a constant size on screen or to simplify when seen from the parent) and `reducedMotion` (keep animation calm). Additive blending adds light without adding coverage, so glows stay correct when a level is cross-faded.
- **Style.** Vivid, saturated colours; clean rounded silhouettes; `kit.toon` two-tone shading with violet-tinted shadows and a rim light; `kit.glow`/`kit.halo` for anything luminous; `kit.points` for dust, stars and crowds. No photorealism, no noisy textures, no black outlines. Strong contrast against the level's theme gradient. Something should always move gently (drift, pulse, flow, rotate) — use `time` from `update`, keep loops smooth, and keep work cheap.
- **Budget.** Aim for < 60 draw calls and < 150k triangles per level; use `InstancedMesh` or `kit.points` for repeated elements and `kit.count(n)` to reduce counts on low-end devices. Use `rng(seed)` from the kit, never `Math.random`, so screenshots and tests are deterministic.
- **Resources.** Create geometries, materials and textures through the kit (`kit.geometry()`, `kit.track()`), so `kit.dispose()` frees them. Never create a renderer, scene, camera or DOM node in a builder.
- **Hotspots** (`level.hotspots`) are positioned in local units on visible, camera-facing parts of the model, with short bilingual labels and one-sentence texts.
- **Checking a scene.** With the dev server on `127.0.0.1:3017` (`ATLAS_HMR=0 npx vite --host 127.0.0.1 --port 3017`), run `node scripts/shoot.mjs --at <id>[,<id>] [--offset -0.3,-0.7] [--lang fr] [--ui 1] [--size 390x844]` and look at the PNGs. Negative offsets (decades) show the dive into the level's child; check both directions of every transition you touch.

## Science

Sizes are real (SI, metres) and must stay consistent: each level is smaller than its parent. Shapes are simplified and colours chosen for legibility, and the About dialog says so; do not claim that an illustration is a measurement. Keep texts short, concrete and correct; prefer understatement to a dubious superlative, and cite a reliable source for each level. Critical distinctions: mature red blood cells have no nucleus and no DNA; plant cells have a wall, a vacuole and chloroplasts, and leaf chlorophyll holds magnesium where heme holds iron; electrons and quarks have no measured size (the quark level shows a view frame, not a diameter); electron clouds are probability clouds, not orbits; quarks are never isolated.

## Workspace and publication

The live static site is https://atlas.chalco.website, served from `dist/`. Build into `.next-dist` and keep the live `dist` untouched until verification finishes. Do not edit source or rebuild while browser suites run.

The public repository is https://github.com/Lomchat/atlas. `deploy/` is local server configuration and must stay ignored and out of Git history. Do not commit credentials, private backups, generated releases or test artefacts. Keep third-party licences (`public/licenses/`) in step with what is actually bundled.
