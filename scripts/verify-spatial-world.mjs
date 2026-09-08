import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { chromium } from "playwright";
import {
  locale,
  browserLocale,
  text,
  artifact,
  assertLocale,
} from "./locale-fixture.mjs";
import { assertWorldContent } from "./world-content.mjs";
import { assertSpatialModels } from "./spatial-models.mjs";
import { getPart } from "../public/models/bodyparts3d/picking.mjs";

assertSpatialModels(locale);
const registry = assertWorldContent(locale);
const { WORLD_NODES: nodes } = registry;
const parts = JSON.parse(
  fs.readFileSync(
    new URL("../public/models/bodyparts3d/parts.json", import.meta.url),
  ),
);
const sample = "human/vein-sample";
const blood = `${sample}/blood`;
const redCell = `${blood}/red-cell`;
const base = process.env.ATLAS_URL || "http://127.0.0.1:3017";
const opposite = locale === "en" ? "fr" : "en";

// Exercise the actual pure address helper, including untrusted shared URLs.
const module = { exports: {} };
const compiled = ts.transpileModule(
  fs.readFileSync(
    new URL("../src/world/sample-address.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
new Function("module", "exports", "require", compiled)(
  module,
  module.exports,
  (id) => {
    if (id === "./data") return registry;
    if (id === "../../public/models/bodyparts3d/parts.json")
      return { default: parts };
    assert.fail(
      `Unexpected dependency in the pure sample-address helper: ${id}`,
    );
  },
);
const {
  readSampleAddress,
  writeSampleAddress,
  upsertSpatialEntry,
  validateSampleAddress,
} = module.exports;
const seed = {
  parentId: "human",
  childId: sample,
  point: [0.1234567890123456, -0.2912345678901234, 0.047],
  kind: "sample",
  source: {
    assetId: "context-vessels",
    partId: "FJ2103",
    category: "vein",
    region: "left-leg",
  },
};
const empty = { v: 1, entries: [] };
const address = upsertSpatialEntry(empty, seed);
const addressURL = new URL(
  "https://atlas.chalco.website/?lang=" +
    locale +
    "&site=legacy-laboratory-site&world=" +
    sample,
);
writeSampleAddress(addressURL, address);
assert.deepEqual(
  readSampleAddress(addressURL.search),
  address,
  "Local floating-frame precision survives URL serialization",
);
assert.equal(
  addressURL.searchParams.get("site"),
  "legacy-laboratory-site",
  "World sites do not overwrite the laboratory site parameter",
);
assert.equal(addressURL.searchParams.get("lang"), locale);
assert.deepEqual(
  empty.entries,
  [],
  "Upsert does not mutate the caller's previous history entry",
);
const moved = upsertSpatialEntry(address, {
  ...seed,
  point: [-0.19, 0.09, 0.031],
});
assert.equal(moved.entries.length, 1);
assert.deepEqual(address.entries[0].point, seed.point);

// Moving the containing sample must not reuse cell origins from the old place.
const ancestorEntry = {
  parentId: "world",
  childId: "human",
  point: [0.12, 0.04, 0],
  kind: "surface",
};
const bloodEntry = {
  parentId: sample,
  childId: blood,
  point: [0.01, -0.012, 0.019],
  kind: "sample",
};
const cellEntry = {
  parentId: blood,
  childId: redCell,
  point: [0.16, 0.03, -0.11],
  kind: "instance",
};
const otherBranchEntry = {
  parentId: "tree",
  childId: "tree/wood",
  point: [-0.08, 0.12, 0],
  kind: "sample",
};
const nestedAddress = validateSampleAddress({
  v: 1,
  entries: [ancestorEntry, seed, bloodEntry, cellEntry, otherBranchEntry],
});
const originalNestedAddress = structuredClone(nestedAddress);
for (const replacement of [
  { ...seed, point: [-0.19, 0.09, 0.031] },
  { ...seed, source: { ...seed.source, partId: "FJ2145" } },
]) {
  const changed = upsertSpatialEntry(nestedAddress, replacement);
  assert.deepEqual(
    nestedAddress,
    originalNestedAddress,
    "Selecting a new site leaves the old history context immutable",
  );
  assert.equal(
    changed.entries.some(
      (entry) => entry.childId === blood || entry.childId === redCell,
    ),
    false,
    "A changed sample point or source part clears its old blood and cell origins",
  );
  assert.deepEqual(
    changed.entries.find((entry) => entry.childId === "human"),
    ancestorEntry,
    "The containing body origin survives a change of local sample",
  );
  assert.deepEqual(
    changed.entries.find((entry) => entry.childId === "tree/wood"),
    otherBranchEntry,
    "A change of anatomical sample leaves unrelated material origins intact",
  );
}
const sameSite = upsertSpatialEntry(nestedAddress, seed);
assert.deepEqual(
  sameSite.entries.filter((entry) => [blood, redCell].includes(entry.childId)),
  [bloodEntry, cellEntry],
  "Reselecting the same point and source preserves its child origins",
);
assert.deepEqual(nestedAddress, originalNestedAddress);
for (const invalid of [
  { ...seed, point: [NaN, 0, 0] },
  { ...seed, point: [Infinity, 0, 0] },
  { ...seed, point: [17, 0, 0] },
  { ...seed, point: [0, 0] },
  { ...seed, parentId: "world" },
  { ...seed, parentId: "__proto__", childId: "constructor" },
  { ...seed, kind: "unknown" },
])
  assert.deepEqual(
    validateSampleAddress({ v: 1, entries: [invalid] }),
    empty,
    "Malformed coordinates, graph edges and modes are rejected",
  );
assert.deepEqual(readSampleAddress("?sites=%7Bbroken-json"), empty);
assert.deepEqual(readSampleAddress("?sites=" + "x".repeat(30000)), empty);
assert.deepEqual(validateSampleAddress({ v: 99, entries: [seed] }), empty);
const manyEdges = Object.values(nodes)
  .filter((node) => node.parent)
  .slice(0, 70)
  .map((node) => ({
    parentId: node.parent,
    childId: node.id,
    point: [0, 0, 0],
    kind: "instance",
  }));
assert.deepEqual(
  validateSampleAddress({ v: 1, entries: manyEdges }).entries,
  manyEdges.slice(-32),
  "An address retains at most the last 32 distinct local edges",
);
const spoofed = validateSampleAddress({
  v: 1,
  entries: [
    {
      ...seed,
      source: { ...seed.source, category: "artery", region: "right-arm" },
    },
  ],
});
assert.deepEqual(
  spoofed.entries[0].source,
  seed.source,
  "Source category and region come from the official part, not URL claims",
);
for (const source of [
  { ...seed.source, assetId: "heart" },
  { ...seed.source, partId: "FJ-does-not-exist" },
]) {
  assert.equal(
    validateSampleAddress({ v: 1, entries: [{ ...seed, source }] }).entries[0]
      ?.source,
    undefined,
    "A forged anatomical identity is never displayed",
  );
}
assert.deepEqual(
  validateSampleAddress({
    v: 1,
    entries: [{ ...seed, childId: "human/artery-sample" }],
  }),
  empty,
  "A real vein source cannot be relabeled as an artery sample",
);

fs.mkdirSync("artifacts", { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    "/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome",
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const context = await browser.newContext({
  locale: browserLocale,
  reducedMotion: "reduce",
  viewport: { width: 1440, height: 1000 },
  permissions: ["clipboard-read", "clipboard-write"],
});
await context.addInitScript(() => {
  try {
    if (!localStorage.getItem("atlas-world-notebook-v1"))
      localStorage.setItem(
        "atlas-world-notebook-v1",
        JSON.stringify({
          saved: ["water/liquid/molecule"],
          visited: [],
          understood: [],
        }),
      );
  } catch {
    /* Tests also retain the app's harmless-storage-failure contract. */
  }
});
const page = await context.newPage();
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const canvas = page.locator("canvas[data-world-scene]");
const action = (name) => page.locator(`[data-action="${name}"]`);
const records = [];
function url(id) {
  const address = new URL(base);
  address.search = "";
  address.searchParams.set("world", id);
  address.searchParams.set("lang", locale);
  address.searchParams.set("diagnostics", "1");
  return address.href;
}
const settle = async (id) => {
  await page.waitForFunction((id) => {
    const canvas = document.querySelector("canvas[data-world-scene]");
    return (
      canvas?.dataset.selected === id &&
      canvas.dataset.transitioning === "false"
    );
  }, id);
  // Browser history can move between two samples of the same scientific
  // node. Wait for the rendered address as well as the node and camera.
  const expected = readSampleAddress(new URL(page.url()).search);
  await page.waitForFunction((expected) => {
    const canvas = document.querySelector("canvas[data-world-scene]");
    return (
      canvas?.dataset.transitioning === "false" &&
      canvas.dataset.spatialContext === JSON.stringify(expected)
    );
  }, expected);
};
const spatialContext = () =>
  canvas.evaluate((canvas) => JSON.parse(canvas.dataset.spatialContext));
const camera = () =>
  canvas.evaluate((canvas) => JSON.parse(canvas.dataset.cameraPose));
function matchingEntry(context, target) {
  return context.entries.find(
    (entry) =>
      entry.parentId === target.parentId && entry.childId === target.childId,
  );
}
function samePoint(actual, expected, label) {
  assert.ok(
    Array.isArray(actual) &&
      actual.length === 3 &&
      actual.every((value, index) => Math.abs(value - expected[index]) < 1e-8),
    label,
  );
}
async function assertOrigin(target) {
  const entry = matchingEntry(await spatialContext(), target);
  assert.ok(
    entry,
    "The selected material remembers the actual containing frame",
  );
  samePoint(
    entry.point,
    target.point,
    "The local sample remains at the clicked position",
  );
  assert.equal(entry.kind, target.kind);
  assert.deepEqual(entry.source, target.source);
  const parsed = readSampleAddress(new URL(page.url()).search);
  assert.deepEqual(
    matchingEntry(parsed, target),
    entry,
    "The canonical URL carries the same origin as the scene",
  );
  return entry;
}
async function target(query) {
  await page.waitForFunction((query) => {
    const entries = JSON.parse(
      document.querySelector("canvas[data-world-scene]")?.dataset
        .spatialTargets || "[]",
    );
    return entries.some(
      (entry) =>
        (!query.parentId || entry.parentId === query.parentId) &&
        (!query.childId || entry.childId === query.childId) &&
        (!query.assetId || entry.source?.assetId === query.assetId) &&
        (!query.category || entry.source?.category === query.category) &&
        (!query.regionEnd || entry.source?.region?.endsWith(query.regionEnd)),
    );
  }, query);
  const found = await canvas.evaluate(
    (canvas, query) =>
      JSON.parse(canvas.dataset.spatialTargets).find(
        (entry) =>
          (!query.parentId || entry.parentId === query.parentId) &&
          (!query.childId || entry.childId === query.childId) &&
          (!query.assetId || entry.source?.assetId === query.assetId) &&
          (!query.category || entry.source?.category === query.category) &&
          (!query.regionEnd || entry.source?.region?.endsWith(query.regionEnd)),
      ),
    query,
  );
  assert.equal(
    await page.evaluate(
      ({ x, y }) =>
        document.elementFromPoint(x, y)?.matches("canvas[data-world-scene]"),
      found,
    ),
    true,
    "The target is on the actual scene, outside labels and UI locators",
  );
  return found;
}
async function enter(hit, input = "click") {
  await page.mouse.move(hit.x, hit.y);
  if (input === "wheel") await page.mouse.wheel(0, -900);
  else await page.mouse.click(hit.x, hit.y);
  await settle(hit.childId);
  await assertOrigin(hit);
}
async function returnTo(id) {
  for (let i = 0; i < 12; i++) {
    const current = await canvas.getAttribute("data-selected");
    if (current === id) return;
    assert.ok(
      nodes[current]?.parent,
      `There is a real outward path from ${current} to ${id}`,
    );
    await action("world-out").click();
    await settle(nodes[current].parent);
  }
  assert.fail(`Outward navigation did not reach ${id}`);
}
async function readBlood(hit) {
  assert.equal(
    hit.childId,
    sample,
    "A context vessel opens a local vein sample, not the named left cephalic vein",
  );
  assert.equal(nodes[sample].relation, "sample");
  for (const id of [blood, redCell]) {
    await page
      .locator(
        `.world-inspector [data-action="world-enter-child"][data-node="${id}"]`,
      )
      .click();
    await settle(id);
    await assertOrigin(hit);
  }
  assert.equal(nodes[redCell].model, "redBloodCell");
  assert.deepEqual(
    JSON.parse(await canvas.getAttribute("data-visible-ids")).sort(),
    [redCell, ...nodes[redCell].children].sort(),
    "Inside one red cell, surrounding anatomical structures are gone",
  );
  assert.equal(
    await page
      .locator(".world-local-origin")
      .getAttribute("data-spatial-region"),
    hit.source.region,
  );
  assert.equal(
    await page.locator(".world-local-origin").getAttribute("data-spatial-part"),
    hit.source.partId,
  );
}

async function assertParentSite(entry, mode) {
  await settle("human");
  await page.waitForFunction((mode) => {
    const canvas = document.querySelector("canvas[data-world-scene]");
    return (
      canvas?.dataset.anatomyMode === mode &&
      canvas.dataset.anatomyStatus === "ready"
    );
  }, mode);
  await assertOrigin(entry);
  samePoint(
    (await camera()).target,
    entry.point,
    "A restored body view focuses its saved local point",
  );
  assert.equal(
    await page
      .locator(`[data-action="anatomy-mode"][data-mode="${mode}"]`)
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await action("world-in").getAttribute("data-target"),
    entry.childId,
    "The restored body's inward navigation follows its saved anatomical location",
  );
}

try {
  await page.goto(url("human"));
  await assertLocale(page);
  await settle("human");
  await page.waitForFunction(
    () =>
      document.querySelector("canvas[data-world-scene]")?.dataset
        .anatomyStatus === "ready",
  );
  const renderer = await canvas.getAttribute("data-world-scene");
  assert.equal(
    await page.locator(`.anatomy-controls [data-node="${sample}"]`).count(),
    0,
    "Unvisited spatial samples do not appear as fixed anatomical organ choices",
  );
  const arm = await target({
    parentId: "human",
    childId: sample,
    assetId: "context-vessels",
    category: "vein",
    regionEnd: "arm",
  });
  const armPart = getPart(parts, arm.source.partId);
  assert.ok(
    armPart?.region.endsWith("arm") && armPart.category === "vein",
    "The arm vessel identity comes from source metadata",
  );
  await enter(arm);
  await readBlood(arm);
  await action("world-save-place").click();
  assert.equal(
    await action("world-save-place").getAttribute("aria-pressed"),
    "true",
  );
  const armContext = await spatialContext();
  await page.screenshot({ path: artifact("spatial-world-arm-red-cell.png") });
  await returnTo("human");
  await assertOrigin(arm);
  assert.equal(
    await action("world-in").getAttribute("data-target"),
    sample,
    "Named and keyboard navigation can reenter the sampled place after returning",
  );
  await action("world-reset").click();

  const leg = await target({
    parentId: "human",
    childId: sample,
    assetId: "context-vessels",
    category: "vein",
    regionEnd: "leg",
  });
  const legPart = getPart(parts, leg.source.partId);
  assert.ok(
    legPart?.region.endsWith("leg") && legPart.category === "vein",
    "The leg vessel is a source-identified vein",
  );
  assert.notEqual(leg.source.partId, arm.source.partId);
  assert.notEqual(
    leg.source.partId,
    "FJ2220",
    "A leg hit cannot claim to be the left cephalic vein",
  );
  assert.ok(
    Math.hypot(...leg.point.map((value, index) => value - arm.point[index])) >
      0.15,
    "The tested sites are physically separated in the body, not neighboring screen locators",
  );
  await enter(leg, "wheel");
  await readBlood(leg);
  assert.equal(
    await action("world-save-place").getAttribute("aria-pressed"),
    "false",
    "A saved red cell in the arm is a different place from a red cell in the leg",
  );
  const legContext = await spatialContext();
  assert.equal(await canvas.getAttribute("data-world-scene"), renderer);

  // The bookmark changes the origin even though the scientific node ID stays identical.
  await action("world-notebook").click();
  const savedCell = page.locator(
    `.world-notebook-list [data-saved-address="true"][data-node="${redCell}"]`,
  );
  assert.equal(await savedCell.count(), 1);
  assert.ok(
    (await savedCell.innerText()).includes(
      text("Saved with its selected point"),
    ),
  );
  assert.ok(
    await page
      .locator('.world-notebook-list [data-node="water/liquid/molecule"]')
      .count(),
    "Old string-only notebook entries survive migration",
  );
  await savedCell.click();
  await settle(redCell);
  await assertOrigin(arm);
  await page.goBack();
  await settle(redCell);
  await assertOrigin(leg);
  assert.deepEqual(
    await spatialContext(),
    legContext,
    "Browser Back restores the other site of the same scientific node",
  );
  await page.goForward();
  await settle(redCell);
  await assertOrigin(arm);

  const beforeLocale = {
    context: await spatialContext(),
    camera: await camera(),
    renderer: await canvas.getAttribute("data-world-scene"),
  };
  await page.locator(`[data-language-switch="${opposite}"]`).click();
  await page.waitForFunction(
    (language) => document.documentElement.lang === language,
    opposite,
  );
  assert.deepEqual(await spatialContext(), beforeLocale.context);
  assert.deepEqual(await camera(), beforeLocale.camera);
  assert.equal(
    await canvas.getAttribute("data-world-scene"),
    beforeLocale.renderer,
  );
  await page.locator(`[data-language-switch="${locale}"]`).click();
  await assertLocale(page);
  await assertOrigin(arm);

  await action("world-share").click();
  const shareModal = page.locator(".world-share-modal input");
  const shared = (await shareModal.count())
    ? await shareModal.inputValue()
    : await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(new URL(shared).searchParams.get("lang"), locale);
  assert.deepEqual(
    matchingEntry(readSampleAddress(new URL(shared).search), arm),
    matchingEntry(armContext, arm),
  );
  if (await shareModal.count()) await page.keyboard.press("Escape");
  await page.reload();
  await assertLocale(page);
  await settle(redCell);
  await assertOrigin(arm);
  assert.equal(
    await action("world-save-place").getAttribute("aria-pressed"),
    "true",
  );
  await action("world-return-to-origin").click();
  await settle("human");
  await assertOrigin(arm);
  samePoint(
    (await camera()).target,
    arm.point,
    "Returning directly from the red cell focuses the original body point before any reset",
  );

  // Each ordinary world material is reachable at an actual sampled location.
  for (const id of [
    "world/soil",
    "world/air",
    "world/liquid-sample",
    "world/table-wood",
  ]) {
    await page.goto(url("world"));
    await assertLocale(page);
    await settle("world");
    const hit = await target({ parentId: "world", childId: id });
    assert.equal(hit.kind, "sample");
    assert.equal(nodes[id].relation, "sample");
    await enter(hit);
    assert.equal(
      await page
        .locator(".world-local-origin")
        .getAttribute("data-spatial-kind"),
      "sample",
    );
    assert.ok(
      (await page.locator(".world-local-origin").innerText()).includes(
        text("Local sample"),
      ),
    );
    await action("world-out").click();
    await settle("world");
    await assertOrigin(hit);
    await action("world-reset").click();
    const again = await target({ parentId: "world", childId: id });
    await enter(again, "wheel");
    await assertOrigin(again);
    records.push({ id, click: hit.point, wheel: again.point });
  }

  // A shared parent body view restores its system and point, not just its node ID.
  const parentSites = [];
  const sourceParts = Object.keys(parts.parts)
    .map((id) => getPart(parts, id))
    .filter(Boolean);
  for (const [category, mode, assetId] of [
    ["bone", "skeleton", "context-skeleton"],
    ["muscle", "muscles", "context-muscles"],
  ]) {
    const part = sourceParts.find(
      (part) =>
        part.assetId === assetId &&
        part.category === category &&
        part.region.endsWith("leg"),
    );
    assert.ok(
      part,
      "The parent-view regression uses a real source structure in the leg",
    );
    const entry = {
      parentId: "human",
      childId: `human/${category}-sample`,
      point: part.center,
      kind: "sample",
      source: {
        assetId: part.assetId,
        partId: part.partId,
        category: part.category,
        region: part.region,
      },
    };
    parentSites.push({ entry, mode });
    const parentURL = new URL(url("human"));
    writeSampleAddress(parentURL, { v: 1, entries: [entry] });
    await page.goto(parentURL.href);
    await assertLocale(page);
    await assertParentSite(entry, mode);
    if (category === "bone") {
      await action("world-save-place").click();
      assert.equal(
        await action("world-save-place").getAttribute("aria-pressed"),
        "true",
      );
    }
  }
  const parentRenderer = await canvas.getAttribute("data-world-scene");
  await action("world-notebook").click();
  await page
    .locator(
      '.world-notebook-list [data-saved-address="true"][data-node="human"]',
    )
    .click();
  await assertParentSite(parentSites[0].entry, parentSites[0].mode);
  await page.goBack();
  await assertParentSite(parentSites[1].entry, parentSites[1].mode);
  await page.goForward();
  await assertParentSite(parentSites[0].entry, parentSites[0].mode);
  assert.equal(
    await canvas.getAttribute("data-world-scene"),
    parentRenderer,
    "Restoring parent views across anatomical systems keeps the same renderer",
  );

  // A newer heart surface takes precedence over an earlier vein-sample origin.
  const heartPart = getPart(parts, "FJ2428");
  assert.equal(heartPart?.assetId, "heart");
  const latestSurface = {
    parentId: "human",
    childId: "human/heart",
    point: heartPart.center,
    kind: "surface",
    source: {
      assetId: heartPart.assetId,
      partId: heartPart.partId,
      category: heartPart.category,
      region: heartPart.region,
    },
  };
  const competingURL = new URL(url("human"));
  writeSampleAddress(
    competingURL,
    upsertSpatialEntry(armContext, latestSurface),
  );
  await page.goto(competingURL.href);
  await assertLocale(page);
  await assertParentSite(latestSurface, "organs");
  assert.equal(
    await page
      .locator(".world-local-origin")
      .getAttribute("data-spatial-child"),
    "human/heart",
  );
  assert.equal(
    await page.locator(".world-local-origin").getAttribute("data-spatial-kind"),
    "surface",
  );
  assert.ok(
    (await page.locator(".world-local-origin-heading").innerText()).includes(
      text("Selected point"),
    ),
    "The origin card describes the current surface, not the older sampled vein",
  );

  // Returning through an older named branch makes that branch current again.
  await action("world-toggle-map").click();
  await page
    .locator(`[data-action="world-map-place"][data-node="${sample}"]`)
    .click();
  await settle(sample);
  const sampleViewport = JSON.parse(await canvas.getAttribute("data-viewport"));
  const outwardPoint = {
    x: sampleViewport.left + sampleViewport.width / 2,
    y: sampleViewport.top + sampleViewport.height / 2,
  };
  assert.equal(
    await page.evaluate(
      ({ x, y }) =>
        document.elementFromPoint(x, y)?.matches("canvas[data-world-scene]"),
      outwardPoint,
    ),
    true,
  );
  await page.mouse.move(outwardPoint.x, outwardPoint.y);
  await page.mouse.wheel(0, 900);
  await assertParentSite(arm, "organs");
  assert.equal(
    await page
      .locator(".world-local-origin")
      .getAttribute("data-spatial-child"),
    sample,
    "Ordinary return promotes the branch actually left over a different recent surface",
  );

  // The origin survives a shared deep link and stays reachable in a phone inspector.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(shared);
  await assertLocale(page);
  await settle(redCell);
  await assertOrigin(arm);
  assert.equal(await page.locator(".world-inspector").count(), 0);
  await action("world-toggle-inspector").click();
  const origin = page.locator(".world-local-origin");
  await origin.scrollIntoViewIfNeeded();
  const bounds = await origin.boundingBox();
  assert.ok(
    bounds.x >= 0 &&
      bounds.x + bounds.width <= 391 &&
      bounds.y >= 0 &&
      bounds.y + bounds.height <= 844,
    "The local-origin explanation fits the phone reading panel",
  );
  const returnButton = action("world-return-to-origin");
  assert.equal(
    await returnButton.evaluate((button) => {
      const r = button.getBoundingClientRect();
      return button.contains(
        document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
      );
    }),
    true,
  );
  await page.screenshot({ path: artifact("spatial-world-mobile-origin.png") });
  await returnButton.click();
  await settle("human");
  await assertOrigin(arm);

  const malformed = new URL(url("human"));
  malformed.searchParams.set("sites", "{broken");
  await page.goto(malformed.href);
  await assertLocale(page);
  await settle("human");
  assert.deepEqual(
    await spatialContext(),
    empty,
    "Malformed locations fall back to normal exploration without crashing",
  );
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    artifact("spatial-world.json"),
    JSON.stringify(
      {
        locale,
        passed: true,
        arm: arm.source,
        leg: leg.source,
        records,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS [${locale}] spatial world: independent anatomical sites, material hits, exact origins, bookmarks, language, history and shared URLs`,
  );
} catch (error) {
  // Capture the failed view before the renderer and page are closed. Artifact
  // failures must never replace the original assertion or browser exception.
  const captures = await Promise.allSettled([
    page.screenshot({
      path: artifact("spatial-world-failure.png"),
      timeout: 6000,
    }),
    page.evaluate(() => ({
      documentLanguage: document.documentElement.lang,
      scene: { ...document.querySelector("canvas[data-world-scene]")?.dataset },
      atlas: { ...document.querySelector(".world-atlas")?.dataset },
      origin: document.querySelector(".world-local-origin")?.textContent,
      inwardTarget: document
        .querySelector('[data-action="world-in"]')
        ?.getAttribute("data-target"),
    })),
  ]);
  try {
    fs.writeFileSync(
      artifact("spatial-world-failure.json"),
      JSON.stringify(
        {
          locale,
          error:
            error instanceof Error
              ? { name: error.name, message: error.message, stack: error.stack }
              : String(error),
          url: page.url(),
          viewport: page.viewportSize(),
          diagnostics:
            captures[1].status === "fulfilled"
              ? captures[1].value
              : { captureError: String(captures[1].reason) },
          screenshotError:
            captures[0].status === "rejected"
              ? String(captures[0].reason)
              : undefined,
          records,
          errors,
        },
        null,
        2,
      ),
    );
  } catch {
    /* Preserve the original failure if the artifact directory is unavailable. */
  }
  throw error;
} finally {
  await browser.close();
}
