import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import {
  locale,
  browserLocale,
  text,
  artifact,
  assertLocale,
} from "./locale-fixture.mjs";
import { loadWorldContent } from "./world-content.mjs";
import { assertAnatomyParts } from "./anatomy-parts.mjs";

assertAnatomyParts(locale);
const { WORLD_NODES: nodes, worldPath } = loadWorldContent();
const base = process.env.ATLAS_URL || "http://127.0.0.1:3017";
const opposite = locale === "en" ? "fr" : "en";
const manifest = JSON.parse(
  fs.readFileSync(
    new URL("../public/models/bodyparts3d/manifest.json", import.meta.url),
    "utf8",
  ),
);
const versions = [
  ...new Set(
    Object.values(manifest.assets).map((asset) => asset.version || "4.0"),
  ),
].sort();
const source = `BodyParts3D ${versions.join(" + ")}`;
const vein = "human/vein";
const segment = "human/vein/segment";
const blood = "human/vein/blood";
const modeRoutes = {
  organs: [
    "heart",
    "lungs",
    "brain",
    "vein",
    "liver",
    "kidneys",
    "stomach",
    "intestines",
  ],
  skeleton: ["femur"],
  muscles: ["muscle"],
  surface: ["skin"],
};
const modeLabels = {
  organs: "Show the organs and vessels",
  skeleton: "Show the skeleton",
  muscles: "Show the muscles",
  surface: "Show the body surface",
};
const nextInMode = {
  organs: vein,
  skeleton: "human/femur",
  muscles: "human/muscle",
  surface: "human/skin",
};
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
});
const errors = [];
const resources = new Set();
context.on("page", (page) => {
  page.setDefaultTimeout(25000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    const path = new URL(response.url()).pathname;
    if (
      path.startsWith("/models/bodyparts3d/") &&
      path.endsWith(".glb") &&
      response.ok()
    )
      resources.add(path);
  });
});
const page = await context.newPage();
const scene = (target = page) => target.locator("canvas[data-world-scene]");
const action = (name, target = page) =>
  target.locator(`[data-action="${name}"]`);
const modeButton = (mode, target = page) =>
  target.locator(`[data-action="anatomy-mode"][data-mode="${mode}"]`);
const routeButton = (id, target = page) =>
  target.locator(`[data-action="anatomy-enter"][data-node="${id}"]`);
function url(id) {
  const address = new URL(base);
  address.search = "";
  address.searchParams.set("lang", locale);
  address.searchParams.set("world", id);
  address.searchParams.set("diagnostics", "1");
  return address.href;
}
const settle = (id, target = page) =>
  target.waitForFunction((id) => {
    const canvas = document.querySelector("canvas[data-world-scene]");
    return (
      canvas?.dataset.selected === id &&
      canvas.dataset.transitioning === "false"
    );
  }, id);
const anatomyReady = (target = page) =>
  target.waitForFunction(
    () =>
      document.querySelector("canvas[data-world-scene]")?.dataset
        .anatomyStatus === "ready",
  );
const snapshot = (target = page) =>
  scene(target).evaluate((canvas) => ({
    renderer: canvas.dataset.worldScene,
    marker: canvas.dataset.anatomyTestIdentity,
    selected: canvas.dataset.selected,
    mode: canvas.dataset.anatomyMode,
    distance: Number(canvas.dataset.cameraDistance),
    metersPerPixel: Number(canvas.dataset.metersPerPixel),
    anchors: canvas.dataset.selectedAnchors,
  }));
async function assertLayer(mode, target = page) {
  const expected = [
    "human",
    ...modeRoutes[mode].map((id) => `human/${id}`),
  ].sort();
  await target.waitForFunction(
    ({ mode, expected }) => {
      const canvas = document.querySelector("canvas[data-world-scene]");
      return (
        canvas?.dataset.anatomyMode === mode &&
        JSON.stringify(JSON.parse(canvas.dataset.visibleIds || "[]").sort()) ===
          JSON.stringify(expected)
      );
    },
    { mode, expected },
  );
  assert.equal(
    await modeButton(mode, target).getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await target
      .locator('[data-action="anatomy-mode"][aria-pressed="true"]')
      .count(),
    1,
  );
  const visibleLabels = await target
    .locator(".world-object-label:visible")
    .evaluateAll((items) => items.map((item) => item.dataset.worldNode));
  assert.ok(
    visibleLabels.every((id) => expected.includes(id)),
    "Hidden systems expose no scene labels",
  );
  await target.waitForFunction((expected) => {
    const targets = JSON.parse(
      document.querySelector("canvas[data-world-scene]").dataset.pickTargets ||
        "[]",
    );
    return targets.every((target) => expected.includes(target.id));
  }, expected);
}
async function chooseMode(mode, target = page) {
  await modeButton(mode, target).click();
  await assertLayer(mode, target);
  assert.equal(
    await action("world-in", target).getAttribute("data-target"),
    nextInMode[mode],
    "Named inward navigation follows the selected anatomical layer",
  );
}
async function assertSource(id, target = page) {
  await settle(id, target);
  await anatomyReady(target);
  const version =
    id === "human"
      ? versions.join(" + ")
      : manifest.assets[id.split("/").pop()].version || "4.0";
  assert.equal(
    await scene(target).getAttribute("data-model-source"),
    `BodyParts3D ${version}`,
  );
}
async function exposed(locator, target = page) {
  await locator.scrollIntoViewIfNeeded();
  const available = await locator.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const hit = document.elementFromPoint(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    return (
      bounds.x >= 0 &&
      bounds.y >= 0 &&
      bounds.right <= innerWidth + 1 &&
      bounds.bottom <= innerHeight + 1 &&
      element.contains(hit)
    );
  });
  assert.ok(
    available,
    `The ${await locator.getAttribute("data-action")} control is visible and receives pointer input at ${target.viewportSize().width}px`,
  );
}

try {
  await page.goto(url("human"));
  await assertLocale(page);
  await assertSource("human");
  await assertLayer("organs");
  assert.ok(
    resources.size >= 6,
    "The anatomical view loads several real GLB surface assets",
  );
  await scene().evaluate((canvas) => {
    canvas.dataset.anatomyTestIdentity = "anatomy-persistent-renderer";
  });
  const initial = await snapshot();
  const ratios = JSON.parse(await scene().getAttribute("data-child-ratios"));
  for (const id of nodes.human.children) {
    assert.ok(
      Math.abs(ratios[id] - nodes[id].sizeMeters / nodes.human.sizeMeters) <
        1e-9,
      `${id} keeps its physical extent relative to the body`,
    );
  }

  // Attribution is a reachable part of the viewer, with actual source and license links.
  const attribution = page.locator(".anatomy-attribution");
  await attribution.locator("summary").click();
  assert.equal(
    await attribution
      .getByRole("link", { name: text("Anatomical data source"), exact: true })
      .getAttribute("href"),
    "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html",
  );
  assert.equal(
    await attribution
      .getByRole("link", { name: text("CC BY 4.0 license"), exact: true })
      .getAttribute("href"),
    "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html",
  );
  assert.equal(
    await attribution.locator(".anatomy-credit").innerText(),
    text(
      "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.",
    ),
  );
  await attribution.locator("summary").click();

  // A layer changes visible/pickable structures without resetting the body or camera.
  for (const mode of ["skeleton", "muscles", "surface", "organs"]) {
    assert.equal(
      await modeButton(mode).getAttribute("aria-label"),
      text(modeLabels[mode]),
    );
    await chooseMode(mode);
    const current = await snapshot();
    assert.equal(current.renderer, initial.renderer);
    assert.equal(current.marker, initial.marker);
    assert.equal(current.selected, "human");
    assert.ok(Math.abs(current.distance - initial.distance) < 1e-8);
  }
  await page.screenshot({ path: artifact("anatomy-organs.png") });

  // The real mesh is picked: no label button or direct state mutation substitutes for it.
  await page.waitForFunction(() =>
    JSON.parse(
      document.querySelector("canvas[data-world-scene]").dataset.pickTargets ||
        "[]",
    ).some((target) => target.id === "human/heart"),
  );
  const heart = await scene().evaluate((canvas) =>
    JSON.parse(canvas.dataset.pickTargets).find(
      (target) => target.id === "human/heart",
    ),
  );
  assert.equal(
    await page.evaluate(
      ({ x, y }) =>
        document.elementFromPoint(x, y)?.matches("canvas[data-world-scene]"),
      heart,
    ),
    true,
  );
  await page.mouse.click(heart.x, heart.y);
  await assertSource("human/heart");
  assert.deepEqual(
    JSON.parse(await scene().getAttribute("data-visible-ids")).sort(),
    [
      "human/heart",
      ...nodes["human/heart"].children.filter((id) => !nodes[id].spatialOnly),
    ].sort(),
    "Entering the heart removes the surrounding anatomical systems",
  );
  const heartEntry = JSON.parse(
    await scene().getAttribute("data-spatial-context"),
  ).entries.find((entry) => entry.childId === "human/heart");
  assert.equal(
    heartEntry.kind,
    "surface",
    "A source organ keeps its original position when its surface is selected",
  );
  assert.ok(
    heartEntry.point.every(
      (value, index) => Math.abs(value - heart.point[index]) < 1e-7,
    ),
    "The mesh pick supplies the actual entry origin",
  );
  await action("world-out").click();
  await assertSource("human");
  await assertLayer("organs");
  assert.equal(
    await action("world-in").getAttribute("data-target"),
    "human/heart",
    "Returning to the body remembers the organ entered",
  );

  // Bone and muscle are separate real surfaces, reachable by named zoom and direct choice.
  await chooseMode("skeleton");
  await action("world-in").click();
  await assertSource("human/femur");
  await action("world-out").click();
  await assertSource("human");
  const namedReturn = await scene().evaluate((canvas) => ({
    entries: JSON.parse(canvas.dataset.spatialContext).entries,
    target: JSON.parse(canvas.dataset.cameraPose).target,
  }));
  assert.equal(
    namedReturn.entries.some(
      (entry) =>
        entry.childId === "human/heart" ||
        entry.childId.startsWith("human/heart/"),
    ),
    false,
    "A named bone return does not retain an unrelated picked heart origin",
  );
  assert.ok(
    namedReturn.target.every((value) => Math.abs(value) < 1e-7),
    "Without a picked bone origin, returning frames the body at its center",
  );
  await assertLayer("skeleton");
  await chooseMode("muscles");
  await routeButton("human/muscle").click();
  await assertSource("human/muscle");
  await action("world-out").click();
  await assertSource("human");
  await assertLayer("muscles");

  // Switching either language direction keeps the layer, camera and original canvas.
  const beforeLanguage = await snapshot();
  const description = await page
    .locator(".anatomy-mode-description")
    .innerText();
  await page.locator(`[data-language-switch="${opposite}"]`).click();
  await page.waitForFunction(
    (language) => document.documentElement.lang === language,
    opposite,
  );
  await assertLayer("muscles");
  assert.notEqual(
    await page.locator(".anatomy-mode-description").innerText(),
    description,
  );
  const afterLanguage = await snapshot();
  assert.deepEqual(
    afterLanguage,
    beforeLanguage,
    "Translating anatomy preserves scene identity, layer, viewpoint and picked origin",
  );
  await page.locator(`[data-language-switch="${locale}"]`).click();
  await assertLocale(page);
  assert.deepEqual(await snapshot(), beforeLanguage);

  // The complete vein, a short wall specimen and the blood are distinct levels.
  await chooseMode("organs");
  await routeButton(vein).click();
  await assertSource(vein);
  assert.ok(nodes[vein].sizeMeters > nodes[segment].sizeMeters);
  assert.equal(nodes[segment].relation, "sample");
  assert.equal(nodes[segment].sizeMeters, 0.04);
  assert.equal(await action("world-in").getAttribute("data-target"), segment);
  await action("world-in").click();
  await settle(segment);
  assert.equal(
    await scene().getAttribute("data-model-source"),
    "procedural",
    "The explanatory vessel section is distinguished from the source anatomy surface",
  );
  assert.equal(await action("world-in").getAttribute("data-target"), blood);
  await action("world-in").click();
  await settle(blood);
  assert.deepEqual(
    JSON.parse(await scene().getAttribute("data-visible-ids")).sort(),
    [
      blood,
      ...nodes[blood].children.filter((id) => !nodes[id].spatialOnly),
    ].sort(),
  );
  assert.equal((await snapshot()).renderer, initial.renderer);

  // Old shared blood URLs retain their address but now return through the sampled section.
  await page.goto(url(blood));
  await assertLocale(page);
  await settle(blood);
  assert.equal(new URL(page.url()).searchParams.get("world"), blood);
  assert.deepEqual(
    await action("world-breadcrumb").evaluateAll((items) =>
      items.map((item) => item.dataset.node),
    ),
    worldPath(blood),
  );
  for (const parent of [segment, vein, "human"]) {
    await action("world-out").click();
    await settle(parent);
  }
  await assertSource("human");
  await page.close();

  // On a phone, the scene starts clear; one named control exposes all four layers.
  const phone = await context.newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto(url("human"));
  await assertLocale(phone);
  await assertSource("human", phone);
  assert.equal(await phone.locator(".world-inspector").count(), 0);
  await exposed(action("world-toggle-inspector", phone), phone);
  await action("world-toggle-inspector", phone).click();
  assert.equal(await action("anatomy-mode", phone).count(), 4);
  for (const mode of ["organs", "skeleton", "muscles", "surface"]) {
    await exposed(modeButton(mode, phone), phone);
    await chooseMode(mode, phone);
  }
  await phone.screenshot({ path: artifact("anatomy-mobile-controls.png") });
  await exposed(routeButton("human/skin", phone), phone);
  await routeButton("human/skin", phone).click();
  await settle("human/skin", phone);
  await action("world-out", phone).click();
  await assertSource("human", phone);
  await assertLayer("surface", phone);
  if (await phone.locator(".world-inspector").count())
    await action("world-fold-inspector", phone).click();
  assert.equal(await phone.locator(".world-inspector").count(), 0);
  await phone.close();

  // Failed model downloads leave navigation usable and can recover without reloading the app.
  const failure = await context.newPage();
  let blocked = 0;
  const assetPattern = "**/models/bodyparts3d/**";
  const rejectAsset = (route) => {
    // In Vite, the manifest is also imported as a JS module from /public/.
    // Block runtime asset fetches, not application modules or the page itself.
    if (
      new URL(route.request().url()).pathname.startsWith("/models/bodyparts3d/")
    ) {
      blocked++;
      return route.abort("failed");
    }
    return route.continue();
  };
  await failure.route(assetPattern, rejectAsset);
  await failure.goto(url("human"));
  await assertLocale(failure);
  await settle("human", failure);
  await failure.waitForFunction(
    () =>
      document.querySelector("canvas[data-world-scene]")?.dataset
        .anatomyStatus === "error",
  );
  assert.ok(blocked > 0);
  assert.equal(
    await failure.locator(".anatomy-load-status p").innerText(),
    text(
      "The anatomical model could not load. Exploration links remain available.",
    ),
  );
  assert.equal(await routeButton("human/heart", failure).isEnabled(), true);
  assert.equal(await modeButton("skeleton", failure).isEnabled(), true);
  const failedRenderer = await scene(failure).getAttribute("data-world-scene");
  await failure.unroute(assetPattern, rejectAsset);
  await action("anatomy-retry", failure).click();
  await assertSource("human", failure);
  assert.equal(
    await scene(failure).getAttribute("data-world-scene"),
    failedRenderer,
    "Retry keeps the renderer alive",
  );
  assert.equal(await action("anatomy-retry", failure).count(), 0);
  assert.equal(await failure.locator(".anatomy-load-status").innerText(), "");
  await failure.close();
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    artifact("anatomy.json"),
    JSON.stringify(
      {
        locale,
        source,
        assetsLoaded: resources.size,
        blockedRequests: blocked,
        modes: Object.keys(modeRoutes),
        passed: true,
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS [${locale}] anatomy: source surfaces, four layers, mesh picking, anatomical routes, translation, phone controls and download recovery`,
  );
} finally {
  await browser.close();
}
