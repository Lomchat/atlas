import fs from "node:fs";
import assert from "node:assert/strict";
import ts from "typescript";

const placeholders = (value) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

/** UI catalogs: identical keys, non-empty values, matching placeholders. */
function checkMessages() {
  const en = JSON.parse(fs.readFileSync(new URL("../src/locales/en.json", import.meta.url)));
  const fr = JSON.parse(fs.readFileSync(new URL("../src/locales/fr.json", import.meta.url)));
  assert.deepEqual(Object.keys(en).sort(), Object.keys(fr).sort(), "Both languages must contain exactly the same keys");
  for (const key of Object.keys(en))
    for (const [locale, catalog] of Object.entries({ en, fr })) {
      assert.ok(catalog[key].trim(), `${locale}: empty translation for ${key}`);
      assert.deepEqual(placeholders(catalog[key]), placeholders(en[key]), `${locale}: mismatched placeholders for ${key}`);
    }
  return en;
}

/** Source scan: no untranslated JSX text, no literal accessible labels, no unknown t() keys. */
function checkSources(en) {
  const literalText = new Set(["Atlas", "English", "Français"]);
  for (const file of fs
    .readdirSync(new URL("../src", import.meta.url), { recursive: true })
    .filter((name) => /\.tsx?$/.test(name))) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const visit = (node) => {
      if (ts.isJsxText(node) && /\p{L}/u.test(node.text))
        assert.ok(literalText.has(node.text.trim()), `${file}: user-facing JSX text must use t(): ${node.text.trim()}`);
      if (
        ts.isJsxAttribute(node) &&
        ["aria-label", "label", "title", "placeholder", "alt"].includes(node.name.getText(source)) &&
        node.initializer &&
        ts.isStringLiteral(node.initializer)
      )
        assert.fail(`${file}: ${node.name.getText(source)} must use a translated message`);
      if (ts.isCallExpression(node) && node.expression.getText(source) === "t" && ts.isStringLiteral(node.arguments[0]))
        assert.ok(Object.hasOwn(en, node.arguments[0].text), `${file}: missing catalog key "${node.arguments[0].text}"`);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
}

/** Test suites must be bilingual. */
function checkSuites() {
  for (const file of fs.readdirSync(new URL(".", import.meta.url)).filter((name) => /^verify(?:-.*)?\.mjs$/.test(name))) {
    const code = fs.readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(code, /from ["']\.\/locale-fixture\.mjs["']/, `${file}: use the bilingual test fixture`);
    assert.match(code, /locale:\s*browserLocale/, `${file}: set the browser language`);
    assert.match(code, /await assertLocale\(/, `${file}: assert the scenario language`);
  }
}

const HEX = /^#[0-9a-f]{6}$/i;
const finite = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);

/** A bilingual record: both languages, finished, without stray spaces. */
function bilingual(id, field, value) {
  assert.ok(value && typeof value === "object", `${id}: missing ${field}`);
  for (const locale of ["en", "fr"]) {
    assert.equal(typeof value[locale], "string", `${id}: ${field}.${locale} must be text`);
    assert.ok(value[locale].trim(), `${id}: empty ${field}.${locale}`);
    assert.doesNotMatch(value[locale], /\b(TODO|TBD|lorem|draft)\b|\[brouillon\]/i, `${id}: unfinished ${field}.${locale}`);
    assert.doesNotMatch(value[locale], /\s{2,}|^\s|\s$/, `${id}: stray spaces in ${field}.${locale}`);
  }
  assert.ok(!(value.fr === value.en && value.en.length > 12), `${id}: ${field} looks untranslated`);
}

/** The level registry: structure, sizes, anchors and bilingual content. */
async function checkLevels() {
  const { LEVELS, byId, childrenOf, homeZ, pathThrough, HOME_ID } = await import("../src/levels/index.ts");
  const sceneKeys = new Set(
    [...fs.readFileSync(new URL("../src/levels/scenes/index.ts", import.meta.url), "utf8").matchAll(/^\s*(\w+):\s*\(\)\s*=>\s*import\(/gm)].map(
      (match) => match[1],
    ),
  );
  assert.equal(byId.size, LEVELS.length, "Level ids must be unique");
  const roots = LEVELS.filter((level) => level.parent === null);
  assert.equal(roots.length, 1, "Exactly one root level");
  assert.ok(byId.has(HOME_ID), "The home level exists");
  for (const level of LEVELS) {
    const id = level.id;
    assert.match(id, /^[a-z0-9-]+$/, `${id}: ids are lowercase and URL-safe`);
    assert.ok(sceneKeys.has(level.scene), `${id}: unknown scene "${level.scene}"`);
    assert.ok(Number.isFinite(level.size) && level.size > 0, `${id}: size must be positive`);
    for (const key of ["top", "bottom", "accent", "dust"]) assert.match(level.theme[key], HEX, `${id}: theme.${key}`);
    for (const field of ["title", "short", "compare", "hook"]) bilingual(id, field, level[field]);
    if (level.sizeText) bilingual(id, "sizeText", level.sizeText);
    assert.ok(level.facts.length >= 1, `${id}: at least one fact`);
    level.facts.forEach((fact, k) => bilingual(id, `facts[${k}]`, fact));
    assert.match(level.source.url, /^https:\/\//, `${id}: source must be an https link`);
    assert.ok(level.source.label.trim(), `${id}: source label`);
    const hotspotIds = new Set();
    for (const hotspot of level.hotspots ?? []) {
      assert.ok(!hotspotIds.has(hotspot.id), `${id}: duplicate hotspot ${hotspot.id}`);
      hotspotIds.add(hotspot.id);
      assert.ok(finite(hotspot.at), `${id}: hotspot ${hotspot.id} position`);
      bilingual(id, `hotspot ${hotspot.id} label`, hotspot.label);
      bilingual(id, `hotspot ${hotspot.id} text`, hotspot.text);
    }
    if (level.parent !== null) {
      const parent = byId.get(level.parent);
      assert.ok(parent, `${id}: unknown parent ${level.parent}`);
      assert.ok(level.size < parent.size, `${id} must be smaller than its parent ${parent.id}`);
      assert.ok(homeZ(level) < homeZ(parent) - 0.15, `${id}: home view too close to its parent's (${parent.id})`);
      assert.ok(level.anchor && finite(level.anchor.at), `${id}: anchor position`);
      assert.ok(level.anchor.at.every((v) => Math.abs(v) <= 40), `${id}: anchor far outside its parent`);
      if (level.anchor.rotate) assert.ok(finite(level.anchor.rotate), `${id}: anchor rotation`);
    }
    const children = childrenOf(id);
    if (children.length > 1)
      assert.ok(children.filter((child) => child.primary).length === 1, `${id}: exactly one primary child among several`);
  }
  // Every leaf is reachable from the root through a strictly shrinking path.
  for (const leaf of LEVELS.filter((level) => !childrenOf(level.id).length)) {
    const path = pathThrough(leaf.id);
    assert.equal(path[0].parent, null, `${leaf.id}: path must start at the root`);
    for (let k = 1; k < path.length; k++) assert.ok(homeZ(path[k]) < homeZ(path[k - 1]), `${leaf.id}: path not shrinking at ${path[k].id}`);
  }
  return LEVELS.length;
}

/** The computing lessons: chapters, steps, scenes, interactive layers and bilingual content. */
async function checkLessons() {
  const { LESSONS, lessonById, COMPUTING_HOME, isReady } = await import("../src/computing/index.ts");
  const ORDER = {
    bits: (await import("../src/computing/logic/bits.ts")).BITS_STEPS,
    gates: (await import("../src/computing/logic/gates.ts")).GATES_STEPS,
    inside: (await import("../src/computing/logic/inside.ts")).INSIDE_STEPS,
    keys: (await import("../src/computing/logic/keys.ts")).KEYS_STEPS,
    llm: (await import("../src/computing/logic/llm.ts")).LLM_STEPS,
    neurons: (await import("../src/computing/logic/neurons.ts")).NEURONS_STEPS,
  };
  const keysOf = (file) =>
    new Set(
      [...fs.readFileSync(new URL(file, import.meta.url), "utf8").matchAll(/^\s*(\w+):\s*(?:\(\)\s*=>\s*import\(|\w+Ui\b)/gm)].map(
        (match) => match[1],
      ),
    );
  const scenes = keysOf("../src/computing/scenes/index.ts");
  const interactive = keysOf("../src/computing/ui/lessons/index.ts");
  assert.equal(lessonById.size, LESSONS.length, "Lesson ids must be unique");
  assert.ok(scenes.has(COMPUTING_HOME.scene), "the chapter map has a scene");
  for (const key of ["top", "bottom", "accent", "dust"]) assert.match(COMPUTING_HOME.theme[key], HEX, `chapter map theme.${key}`);
  LESSONS.forEach((lesson, k) => {
    const id = lesson.id;
    assert.match(id, /^[a-z0-9-]+$/, `${id}: ids are lowercase and URL-safe`);
    assert.equal(lesson.number, k + 1, `${id}: chapters are numbered 1, 2, 3… in order`);
    for (const key of ["top", "bottom", "accent", "dust"]) assert.match(lesson.theme[key], HEX, `${id}: theme.${key}`);
    for (const field of ["title", "short", "teaser"]) bilingual(id, field, lesson[field]);
    if (lesson.status === "soon") return;
    assert.equal(lesson.status, "ready", `${id}: status is ready or soon`);
    assert.ok(isReady(lesson), `${id}: a ready chapter has steps`);
    assert.ok(scenes.has(lesson.scene), `${id}: unknown scene "${lesson.scene}"`);
    assert.ok(interactive.has(id), `${id}: register its interactive layer in ui/lessons/index.ts`);
    assert.match(lesson.source?.url ?? "", /^https:\/\//, `${id}: source must be an https link`);
    const stepIds = new Set();
    for (const step of lesson.steps) {
      const where = `${id}/${step.id}`;
      assert.match(step.id, /^[a-z0-9-]+$/, `${where}: step ids are lowercase and URL-safe`);
      assert.ok(!stepIds.has(step.id), `${where}: duplicate step`);
      stepIds.add(step.id);
      for (const field of ["title", "text", "example"]) bilingual(where, field, step[field]);
      assert.deepEqual(placeholders(step.example.fr), placeholders(step.example.en), `${where}: the example has the same {values} in both languages`);
      if (step.try) bilingual(where, "try", step.try);
      assert.ok(step.facts.length >= 1, `${where}: at least one fact`);
      step.facts.forEach((fact, f) => bilingual(where, `facts[${f}]`, fact));
      for (const label of step.labels ?? []) {
        assert.match(label.anchor, /^[a-z0-9-]+$/, `${where}: label anchor`);
        bilingual(where, `label ${label.anchor}`, label.text);
      }
      if (step.source) assert.match(step.source.url, /^https:\/\//, `${where}: source must be an https link`);
      if (step.theme) for (const key of ["top", "bottom", "accent", "dust"]) assert.match(step.theme[key], HEX, `${where}: theme.${key}`);
    }
  });
  // Each lesson scene lays its steps out in the order of its logic module.
  for (const [id, order] of Object.entries(ORDER))
    assert.deepEqual(lessonById.get(id).steps.map((step) => step.id), [...order], `${id}: steps match its logic module`);
  return LESSONS.length;
}

export async function checkCatalogs() {
  const en = checkMessages();
  checkSources(en);
  checkSuites();
  const count = await checkLevels();
  const lessons = await checkLessons();
  console.log(
    `PASS catalogs and registry: ${Object.keys(en).length} messages, ${count} levels and ${lessons} chapters in English and French`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) await checkCatalogs();
