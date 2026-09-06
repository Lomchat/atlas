import {
  locale,
  browserLocale,
  text,
  stepName,
  artifact,
  assertLocale,
} from "./locale-fixture.mjs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import fs from "node:fs";
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
const p = await browser.newPage({
  locale: browserLocale,
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "no-preference",
});
p.setDefaultTimeout(25000);
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const c = () => p.locator("canvas[data-scene-id]"),
  cta = () => p.locator(".scale-anchor");
const ready = (id) =>
  p.waitForFunction((id) => {
    const c = document.querySelector("canvas");
    return c?.dataset.viewpoint === id && c?.dataset.transitioning === "false";
  }, id);
const go = async (molecule = "water", focus = "") => {
  await p.goto(
    `${base}/?molecule=${molecule}${focus ? "&focus=" + encodeURIComponent(focus) : ""}`,
    { waitUntil: "networkidle" },
  );
  await assertLocale(p);
  await ready(focus || "sample");
};
const shot = (name) =>
  p.screenshot({ path: artifact(`experience-${name}.png`) });
fs.mkdirSync("artifacts", { recursive: true });
try {
  for (const molecule of ["water", "co2", "methane"]) {
    await go(molecule);
    const scene = await c().getAttribute("data-scene-id");
    for (const target of [
      "portion",
      "neighborhood",
      "molecule",
      "atom-0",
      "atom-0/nucleus",
      "atom-0/nucleus/proton-0",
      "atom-0/nucleus/proton-0/up-0",
    ]) {
      await p.waitForFunction(
        (t) => document.querySelector(".scale-anchor")?.dataset.target === t,
        target,
      );
      assert.equal(await cta().isVisible(), true);
      await cta().click();
      await ready(target);
      if (target === "atom-0/nucleus/proton-0")
        await shot(molecule + "-proton");
    }
    assert.equal(await cta().isDisabled(), true);
    assert.ok(
      (await cta().textContent()).includes(text("elementary particle")),
    );
    assert.equal(await c().getAttribute("data-scene-id"), scene);
  }
  await go();
  await p.evaluate(() => {
    for (let i = 0; i < 9; i++) document.querySelector(".scale-anchor").click();
  });
  await ready("atom-0/nucleus/proton-0/up-0");
  for (const [molecule, focus, type] of [
    ["water", "sample", "cohesion"],
    ["methane", "sample", "motion"],
    ["water", "molecule", "bonds"],
    ["water", "atom-0", "photon"],
    ["water", "atom-0/nucleus", "nuclear"],
    ["water", "atom-0/nucleus/proton-0", "strong"],
    ["water", "atom-0/electron-0", "higgs"],
  ]) {
    await go(molecule, focus);
    await p.locator(".context-interaction").click();
    await p.getByRole("button", { name: stepName(2) }).click();
    await p.waitForFunction(
      () =>
        document.querySelector("canvas")?.dataset.transitioning === "false" &&
        Number(document.querySelector("canvas")?.dataset.animationTime) > 1.1,
    );
    const before = await c().screenshot();
    await p.waitForTimeout(550);
    const after = await c().screenshot();
    assert.equal(
      before.equals(after),
      false,
      `${type} animates while staying on the same phase`,
    );
    assert.equal(await c().getAttribute("data-phase"), "1");
    await p.getByRole("button", { name: text("Pause animation") }).click();
    await p.waitForTimeout(100);
    const time = await c().getAttribute("data-animation-time");
    await p.waitForTimeout(350);
    assert.equal(
      await c().getAttribute("data-animation-time"),
      time,
      `${type} paused`,
    );
    await shot(type);
    const panel = await p.locator(".lesson-panel").boundingBox();
    assert.ok(panel.width >= 430);
    assert.ok(
      await p
        .locator(".lesson-copy p")
        .evaluate((e) => parseFloat(getComputedStyle(e).fontSize) >= 15),
    );
    await p.getByRole("button", { name: text("Replay animation") }).click();
    await p.waitForFunction(
      (t) =>
        Number(document.querySelector("canvas")?.dataset.animationTime) <
        Number(t),
      time,
    );
    await p.getByRole("button", { name: text("Close explanation") }).click();
  }
  for (const [name, width, height] of [
    ["mobile", 390, 844],
    ["small", 320, 568],
    ["landscape", 844, 390],
  ]) {
    await p.setViewportSize({ width, height });
    await go("water", "atom-0/nucleus/proton-0");
    await cta().click();
    await ready("atom-0/nucleus/proton-0/up-0");
    await shot(name + "-quark");
    const button = await cta().boundingBox();
    assert.ok(button.y >= 0 && button.y + button.height <= height);
    await go();
    await p.locator(".context-interaction").click();
    await p.getByRole("button", { name: stepName(2) }).click();
    await p.waitForFunction(
      () => document.querySelector("canvas")?.dataset.transitioning === "false",
    );
    await shot(name + "-lesson");
    assert.ok(
      await p
        .locator(".lesson-panel")
        .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    );
    assert.ok(
      await p
        .locator(".lesson-copy p")
        .evaluate((e) => parseFloat(getComputedStyle(e).fontSize) >= 12.5),
    );
    await p.getByRole("button", { name: text("Pause animation") }).click();
    await p.getByRole("button", { name: text("Close explanation") }).click();
  }
  await p.setViewportSize({ width: 1440, height: 1000 });
  await go("water", "atom-1/nucleus/proton-0/down-2");
  await p.locator('[data-direction="out"]').click();
  await ready("atom-1/nucleus/proton-0");
  await p.waitForFunction(
    () =>
      document.querySelector(".scale-anchor")?.dataset.target ===
      "atom-1/nucleus/proton-0/down-2",
  );
  await cta().click();
  await ready("atom-1/nucleus/proton-0/down-2");
  await p.emulateMedia({ reducedMotion: "reduce" });
  await go("water", "atom-0");
  await p.locator(".context-interaction").click();
  await p.getByRole("button", { name: stepName(2) }).click();
  assert.equal(
    await p.getByRole("button", { name: text("Pause animation") }).isDisabled(),
    true,
  );
  const time = await c().getAttribute("data-animation-time");
  await p.waitForTimeout(350);
  assert.equal(await c().getAttribute("data-animation-time"), time);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: scene CTA to quarks for all materials and bursts; seven animated lessons; pause/replay; large readable panel; mobile/landscape; reduced motion; stable renderer",
  );
} finally {
  await browser.close();
}
