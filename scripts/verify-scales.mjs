import {
  locale,
  browserLocale,
  text,
  stepName,
  artifact,
  assertLocale,
} from "./locale-fixture.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
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
const page = await browser.newPage({
  locale: browserLocale,
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
page.setDefaultTimeout(25000);
const errors = [];
page.on("pageerror", (e) => {
  errors.push(e.message);
  console.log("PAGE ERROR", e.message);
});
const c = () => page.locator("canvas[data-scene-id]");
const ready = (id) =>
  page.waitForFunction((id) => {
    const c = document.querySelector("canvas[data-scene-id]");
    return c?.dataset.viewpoint === id && c?.dataset.transitioning === "false";
  }, id);
const nav = (d) => page.locator(`.zoom-navigation [data-direction="${d}"]`);
const shot = (n) => page.screenshot({ path: artifact(`scales-${n}.png`) });
const goto = async (molecule, focus = "") => {
  await page.goto(
    `${base}/?molecule=${molecule}${focus ? "&focus=" + encodeURIComponent(focus) : ""}`,
    { waitUntil: "networkidle" },
  );
  await assertLocale(page);
  await ready(focus || "sample");
};
fs.mkdirSync("artifacts", { recursive: true });
try {
  for (const molecule of ["water", "co2", "methane"]) {
    await goto(molecule);
    const identity = await c().getAttribute("data-scene-id");
    await shot(molecule + "-sample");
    const route = [
      "sample",
      "portion",
      "neighborhood",
      "molecule",
      "atom-0",
      "atom-0/nucleus",
      "atom-0/nucleus/proton-0",
      "atom-0/nucleus/proton-0/up-0",
    ];
    for (const target of route.slice(1)) {
      assert.equal(await nav("in").getAttribute("data-target"), target);
      await nav("in").click();
      await ready(target);
      if (["portion", "neighborhood", "molecule"].includes(target))
        await shot(molecule + "-" + target);
    }
    assert.equal(await nav("in").isDisabled(), true);
    for (const target of route.slice(0, -1).reverse()) {
      assert.equal(await nav("out").getAttribute("data-target"), target);
      await nav("out").click();
      await ready(target);
    }
    assert.equal(await nav("out").isDisabled(), true);
    assert.equal(await c().getAttribute("data-scene-id"), identity);
    await page.locator(".context-interaction").click();
    await ready("neighborhood");
    assert.equal(
      await c().getAttribute("data-interaction"),
      molecule === "water" ? "cohesion" : "motion",
    );
    for (let phase = 0; phase < 3; phase++) {
      await page.getByRole("button", { name: stepName(phase + 1) }).click();
      await page.waitForFunction(
        (p) => document.querySelector("canvas")?.dataset.phase === String(p),
        phase,
      );
    }
    await shot(molecule + "-interaction");
    await page.getByRole("button", { name: text("Close explanation") }).click();
    await page.getByRole("button", { name: text("Choose a molecule") }).click();
    await page.locator(".molecule-preview canvas").waitFor();
    await shot(molecule + "-gallery");
    await page.keyboard.press("Escape");
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await goto("water", "molecule");
  const wheelLevels = new Set();
  await page.mouse.move(700, 570);
  for (let i = 0; i < 40; i++) {
    await page.mouse.wheel(0, 350);
    await page.waitForTimeout(100);
    wheelLevels.add(await c().getAttribute("data-viewpoint"));
    if (wheelLevels.has("sample")) break;
  }
  for (const level of ["neighborhood", "portion", "sample"])
    assert.ok(wheelLevels.has(level), `wheel outward reveals ${level}`);
  for (let i = 0; i < 40; i++) {
    await page.mouse.wheel(0, -350);
    await page.waitForTimeout(100);
    if ((await c().getAttribute("data-scale")) === "molecule") break;
  }
  assert.equal(await c().getAttribute("data-scale"), "molecule");
  for (const [focus, type] of [
    ["molecule", "bonds"],
    ["atom-0", "photon"],
    ["atom-0/nucleus", "nuclear"],
    ["atom-0/nucleus/proton-0", "strong"],
    ["atom-0/electron-0", "higgs"],
  ]) {
    await goto("water", focus);
    await page.locator(".context-interaction").click();
    await page.waitForFunction(
      (t) => document.querySelector("canvas")?.dataset.interaction === t,
      type,
    );
    const before = await c().screenshot();
    await page.getByRole("button", { name: stepName(2) }).click();
    await page.waitForFunction(
      () => document.querySelector("canvas")?.dataset.phase === "1",
    );
    const after = await c().screenshot();
    assert.equal(before.equals(after), false, `${type} visibly changes scene`);
    await shot(type);
    await page.getByRole("button", { name: stepName(3) }).click();
    assert.ok(await page.locator(".lesson-copy p").textContent());
    await page
      .getByRole("button", { name: text("Restart from the beginning") })
      .click();
    await nav("out").click();
    assert.equal(await page.locator(".lesson-panel").count(), 0);
  }
  for (const [name, width, height] of [
    ["mobile", 390, 844],
    ["small", 320, 568],
    ["landscape", 844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await goto("water");
    await shot(name + "-sample");
    await page.locator(".context-interaction").click();
    await ready("neighborhood");
    await shot(name + "-lesson");
    const close = await page
      .getByRole("button", { name: text("Close explanation") })
      .boundingBox();
    assert.ok(
      close.x >= 0 &&
        close.x + close.width <= width &&
        close.y >= 0 &&
        close.y + close.height <= height,
    );
    await page.getByRole("button", { name: stepName(2) }).click();
    assert.ok(
      await page
        .locator(".lesson-panel")
        .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    );
    await page.getByRole("button", { name: text("Close explanation") }).click();
    await page.getByRole("button", { name: text("Choose a molecule") }).click();
    await shot(name + "-gallery");
    await page.keyboard.press("Escape");
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await goto("water", "atom-0");
  await page.locator(".context-interaction").click();
  await ready("atom-0");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".lesson-panel").count(), 0);
  await ready("atom-0");
  assert.deepEqual(errors, []);
  console.log(
    "PASS scales: all 3 complete routes in both directions, persistent renderer, every contextual interaction/step, visible effects, galleries, mobile/small/landscape, no page errors",
  );
} finally {
  await browser.close();
}
