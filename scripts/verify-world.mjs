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
import { assertWorldContent } from "./world-content.mjs";
import { assertMineralModels } from "./mineral-models.mjs";
assertMineralModels(locale);
const {
  WORLD_NODES: nodes,
  WORLD_ROOTS: roots,
  validation,
} = assertWorldContent(locale);
const base = process.env.ATLAS_URL || "http://127.0.0.1:3017";
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
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "no-preference",
});
const page = await context.newPage();
page.setDefaultTimeout(25000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const canvas = page.locator("canvas[data-world-scene]");
const action = (name) => page.locator(`[data-action="${name}"]`);
const settle = (id) =>
  page.waitForFunction((id) => {
    const c = document.querySelector("canvas[data-world-scene]");
    return c?.dataset.selected === id && c.dataset.transitioning === "false";
  }, id);
const goto = async (id) => {
  const url = new URL(base);
  url.searchParams.set("lang", locale);
  url.searchParams.set("world", id);
  url.searchParams.set("diagnostics", "1");
  await page.goto(url.href);
  await settle(id);
};
const navigate = async (id) => {
  // Exercise the app's real searchable choice rather than mutating React state.
  await action("world-search").click();
  await action("world-search-input").fill(nodes[id].name[locale]);
  await page.locator(`.world-search-results [data-node="${id}"]`).click();
};
const records = [];
try {
  await goto("world");
  await assertLocale(page);
  const renderer = await canvas.getAttribute("data-world-scene");
  assert.equal(await page.locator(".world-object-label:visible").count(), 6);
  const labels = await page
    .locator(".world-object-label:visible")
    .evaluateAll((items) =>
      items.map((item) => {
        const r = item.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      }),
    );
  for (let i = 0; i < labels.length; i++)
    for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i],
        b = labels[j];
      assert.ok(
        a.x + a.w <= b.x ||
          b.x + b.w <= a.x ||
          a.y + a.h <= b.y ||
          b.y + b.h <= a.y,
        "World labels do not overlap",
      );
    }
  await page.screenshot({ path: artifact("world-arrival.png") });
  await page.locator('[data-world-node="human"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector("canvas[data-world-scene]")?.dataset
        .transitioning === "true",
  );
  const intermediate = await canvas.evaluate((c) => ({
    distance: Number(c.dataset.cameraDistance),
    departure: c.dataset.departure,
  }));
  assert.equal(intermediate.departure, "world");
  await settle("human");
  assert.ok(
    intermediate.distance >
      Number(await canvas.getAttribute("data-camera-distance")),
    "A real camera flight approaches the person",
  );
  assert.equal(
    await canvas.getAttribute("data-world-scene"),
    renderer,
    "Navigation retains the renderer",
  );
  assert.equal(await canvas.getAttribute("data-departure"), "");
  await page.screenshot({ path: artifact("world-human.png") });
  // Named buttons accept successive retargets immediately, through the entire branch.
  let id = "human";
  for (let i = 0; i < 12 && nodes[id].defaultChild; i++) {
    id = nodes[id].defaultChild;
    await action("world-in").click();
    await page.waitForFunction(
      (id) =>
        document
          .querySelector(".world-atlas")
          ?.getAttribute("data-selected-world") === id,
      id,
    );
  }
  await settle(id);
  assert.equal(nodes[id].model, "quark");
  assert.equal(nodes[id].sizeMeters, null);
  assert.deepEqual(JSON.parse(await canvas.getAttribute("data-visible-ids")), [
    id,
  ]);
  assert.equal(await page.locator(".world-object-label:visible").count(), 0);
  assert.equal(await canvas.getAttribute("data-world-scene"), renderer);
  await page.screenshot({ path: artifact("world-quark.png") });
  for (let i = 0; i < 15 && id !== "world"; i++) {
    id = nodes[id].parent;
    await action("world-out").click();
    await page.waitForFunction(
      (id) =>
        document
          .querySelector(".world-atlas")
          ?.getAttribute("data-selected-world") === id,
      id,
    );
  }
  await settle("world");
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const root of roots) {
    await page.locator(`[data-world-node="${root}"]`).click();
    await settle(root);
    let selected = root;
    for (let i = 0; i < 17; i++) {
      const data = await canvas.evaluate((c) => ({ ...c.dataset }));
      assert.deepEqual(
        JSON.parse(data.visibleIds).sort(),
        [
          selected,
          ...nodes[selected].children.filter(
            (id) =>
              selected !== "human" ||
              !["human/skin", "human/muscle", "human/femur"].includes(id),
          ),
        ].sort(),
        "Only the selected container and direct contents of its active layer remain",
      );
      const ratios = JSON.parse(data.childRatios);
      for (const child of nodes[selected].children) {
        if (nodes[child].sizeMeters && nodes[selected].sizeMeters)
          assert.ok(
            Math.abs(
              ratios[child] -
                nodes[child].sizeMeters / nodes[selected].sizeMeters,
            ) < 1e-9,
            "Physical child extent stays calibrated",
          );
      }
      assert.ok(Number(data.geometryCount) < 500, "GPU resources stay bounded");
      assert.ok(
        Number(data.drawCalls) < 700,
        "Only the current local branch renders",
      );
      if (!nodes[selected].defaultChild) break;
      selected = nodes[selected].defaultChild;
      await action("world-in").click();
      await settle(selected);
    }
    assert.equal(
      nodes[selected].model,
      "quark",
      `${root} has a complete route to elementary structure`,
    );
    records.push({ root, terminal: selected });
    await action("world-home").click();
    await settle("world");
  }
  const molecule = "water/liquid/molecule";
  await navigate(molecule);
  await settle(molecule);
  assert.ok(
    Number(await canvas.getAttribute("data-replica-count")) >= 100,
    "A liquid opens into a surrounding sample of equally sized molecules",
  );
  await page.screenshot({ path: artifact("world-water-molecules.png") });
  // Pick an actual hydrogen sphere in a neighbouring, rotated water molecule.
  const hydrogen = `${molecule}/hydrogen`;
  await page.waitForFunction(
    (id) =>
      JSON.parse(
        document.querySelector("canvas[data-world-scene]").dataset
          .pickTargets || "[]",
      ).some((p) => p.id === id && p.replica),
    hydrogen,
  );
  const target = await canvas.evaluate(
    (c, id) =>
      JSON.parse(c.dataset.pickTargets).find((p) => p.id === id && p.replica),
    hydrogen,
  );
  await page.mouse.click(target.x, target.y);
  await settle(hydrogen);
  const anchorKey = `${molecule}>${hydrogen}`;
  const remembered = JSON.parse(
    await canvas.getAttribute("data-selected-anchors"),
  )[anchorKey];
  assert.ok(
    remembered.every((v, i) => Math.abs(v - target.point[i]) < 1e-7),
    "The rotated instance supplies the exact entry origin",
  );
  await action("world-out").click();
  await settle(molecule);
  assert.deepEqual(
    JSON.parse(await canvas.getAttribute("data-selected-anchors"))[anchorKey],
    remembered,
    "Rebuilding the liquid preserves the chosen site",
  );
  await action("world-in").click();
  await settle(hydrogen);
  await action("world-out").click();
  await settle(molecule);
  await page.locator(`[data-world-node="${molecule}/oxygen"]`).click();
  await settle(`${molecule}/oxygen`);
  assert.equal(
    Number(await canvas.getAttribute("data-replica-count")),
    0,
    "Entering one atom removes surrounding molecules",
  );
  const before = await canvas.evaluate((c) => ({
    id: c.dataset.worldScene,
    selected: c.dataset.selected,
    distance: c.dataset.cameraDistance,
  }));
  const comparison = await page
    .locator("canvas[data-world-comparison]")
    .evaluate((c) => {
      c.dataset.identity = "comparison-persist";
      return c.dataset.ratio;
    });
  await page
    .locator(`[data-language-switch="${locale === "en" ? "fr" : "en"}"]`)
    .click();
  assert.equal(await canvas.getAttribute("data-world-scene"), before.id);
  assert.equal(await canvas.getAttribute("data-selected"), before.selected);
  assert.ok(
    Math.abs(
      Number(await canvas.getAttribute("data-camera-distance")) -
        Number(before.distance),
    ) < 1e-8,
  );
  assert.equal(
    await page
      .locator("canvas[data-world-comparison]")
      .getAttribute("data-identity"),
    "comparison-persist",
  );
  assert.equal(
    await page
      .locator("canvas[data-world-comparison]")
      .getAttribute("data-ratio"),
    comparison,
  );
  await page.locator(`[data-language-switch="${locale}"]`).click();
  await assertLocale(page);
  const nucleus = `${molecule}/oxygen/nucleus`;
  await action("world-in").click();
  await settle(nucleus);
  assert.ok(
    !JSON.parse(await canvas.getAttribute("data-visible-ids")).includes(
      `${molecule}/oxygen/electron`,
    ),
    "Electrons are outside the nucleus",
  );
  await page.goBack();
  await settle(`${molecule}/oxygen`);
  await page.goForward();
  await settle(nucleus);
  await page.screenshot({ path: artifact("world-nucleus.png") });
  // A different blood-cell instance retains its own center when returning.
  const blood = "human/vein/blood",
    redCell = `${blood}/red-cell`;
  await goto(blood);
  await page.waitForFunction(
    (id) =>
      JSON.parse(
        document.querySelector("canvas[data-world-scene]").dataset
          .pickTargets || "[]",
      ).filter((p) => p.id === id).length >= 2,
    redCell,
  );
  const redTargets = await canvas.evaluate(
    (c, id) => JSON.parse(c.dataset.pickTargets).filter((p) => p.id === id),
    redCell,
  );
  const redTarget = redTargets.at(-1);
  await page.mouse.click(redTarget.x, redTarget.y);
  await settle(redCell);
  const redAnchor = JSON.parse(
    await canvas.getAttribute("data-selected-anchors"),
  )[`${blood}>${redCell}`];
  assert.ok(redAnchor.every((v, i) => Math.abs(v - redTarget.point[i]) < 1e-7));
  await action("world-out").click();
  await settle(blood);
  assert.deepEqual(
    JSON.parse(await canvas.getAttribute("data-selected-anchors"))[
      `${blood}>${redCell}`
    ],
    redAnchor,
  );
  const proton = `${nucleus}/proton`,
    down = `${proton}/other-quark`;
  await goto(proton);
  await page.waitForFunction(
    (id) =>
      JSON.parse(
        document.querySelector("canvas[data-world-scene]").dataset
          .pickTargets || "[]",
      ).some((p) => p.id === id),
    down,
  );
  const downTarget = await canvas.evaluate(
    (c, id) => JSON.parse(c.dataset.pickTargets).find((p) => p.id === id),
    down,
  );
  await page.mouse.click(downTarget.x, downTarget.y);
  await settle(down);
  assert.equal(
    nodes[down].quarkFlavor,
    "down",
    "The clicked down marker opens its own flavor",
  );
  // Wheel input during a large atomic-to-nuclear flight cannot strand the camera.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await goto(`${molecule}/oxygen`);
  await action("world-in").click();
  await page.waitForFunction(() => {
    const c = document.querySelector("canvas[data-world-scene]");
    return (
      c.dataset.transitioning === "true" &&
      Number(c.dataset.cameraDistance) > 30
    );
  });
  await page.mouse.move(900, 700);
  await page.mouse.wheel(0, -350);
  await settle(nucleus);
  assert.ok(Number(await canvas.getAttribute("data-camera-distance")) < 5);
  await action("world-out").click();
  await settle(`${molecule}/oxygen`);
  await action("world-in").click();
  await page.waitForFunction(
    () =>
      document.querySelector("canvas[data-world-scene]").dataset
        .transitioning === "true",
  );
  await page.mouse.move(900, 700);
  await page.mouse.wheel(0, 240);
  await settle(`${molecule}/oxygen`);
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Actual canvas wheel input enters and leaves the chosen branch.
  await goto("human");
  await page.mouse.move(940, 620);
  await page.mouse.wheel(0, -900);
  await settle("human/vein");
  await page.mouse.move(940, 620);
  await page.mouse.wheel(0, 900);
  await settle("human");
  await page.setViewportSize({ width: 390, height: 844 });
  await action("world-home").click();
  await settle("world");
  await page.screenshot({ path: artifact("world-mobile.png") });
  assert.equal(
    await page.locator("body").evaluate((el) => el.scrollWidth <= innerWidth),
    true,
  );
  await action("world-laboratory").click();
  await page.locator("canvas[data-scene-id]").waitFor();
  await page.locator('[data-action="open-world"]').click();
  await settle("world");
  await assertLocale(page);
  assert.deepEqual(errors, []);
  const report = {
    suite: "world",
    locale,
    passed: true,
    validation,
    records,
    errors,
  };
  fs.writeFileSync(artifact("world.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
