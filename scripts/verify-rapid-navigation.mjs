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
const base = process.env.ATLAS_URL || "http://127.0.0.1:3017",
  executable =
    process.env.CHROMIUM_PATH ||
    "/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";
const browser = await chromium.launch({
  ...(fs.existsSync(executable) ? { executablePath: executable } : {}),
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
  }),
  errors = [];
p.setDefaultTimeout(20000);
p.on("pageerror", (e) => errors.push(e.message));
const root = "sample",
  atom = "atom-0",
  nucleus = atom + "/nucleus",
  proton = nucleus + "/proton-0",
  quark = proton + "/up-0";
const settle = (id) =>
  p.waitForFunction((id) => {
    const c = document.querySelector("canvas[data-scene-id]");
    return c?.dataset.viewpoint === id && c?.dataset.transitioning === "false";
  }, id);
const requested = (id) =>
  p.waitForFunction(
    (id) =>
      (new URLSearchParams(location.search).get("focus") || "sample") === id,
    id,
  );
const burst = (direction, count) =>
  p.evaluate(
    ({ direction, count }) => {
      const b = document.querySelector(`[data-direction="${direction}"]`);
      for (let i = 0; i < count; i++) b.click();
    },
    { direction, count },
  );
try {
  for (const [width, height] of [
    [1440, 1000],
    [390, 844],
  ]) {
    await p.setViewportSize({ width, height });
    await p.goto(base, { waitUntil: "networkidle" });
    await assertLocale(p);
    await settle(root);
    const identity = await p
      .locator("canvas[data-scene-id]")
      .getAttribute("data-scene-id");
    // Many events in one task exercise stale render snapshots and React batching.
    await burst("in", 5);
    await requested(nucleus);
    assert.equal(await p.locator('[data-direction="in"]').isDisabled(), false);
    assert.equal(
      await p.locator('[data-direction="out"]').getAttribute("data-target"),
      atom,
    );
    await burst("in", 12);
    await requested(quark);
    await settle(quark);
    assert.equal(await p.locator('[data-direction="in"]').isDisabled(), true);
    await burst("out", 12);
    await requested(root);
    await settle(root);
    assert.equal(await p.locator('[data-direction="out"]').isDisabled(), true);
    // Actual rapid mouse clicks, without waiting for each camera transition.
    await p
      .locator('[data-direction="in"]')
      .click({ clickCount: 7, delay: 25 });
    await requested(quark);
    await settle(quark);
    await p
      .locator('[data-direction="out"]')
      .click({ clickCount: 7, delay: 25 });
    await requested(root);
    await settle(root);
    // Reverse while the inward camera movement is still running.
    await burst("in", 6);
    await requested(proton);
    await p.waitForTimeout(40);
    await burst("out", 2);
    await requested(atom);
    await settle(atom);
    assert.equal(
      await p.locator('[data-direction="out"]').getAttribute("data-target"),
      "molecule",
    );
    await p.waitForTimeout(800);
    assert.equal(
      await p.locator("canvas[data-scene-id]").getAttribute("data-viewpoint"),
      atom,
      "no queued flights replay after the last click",
    );
    await burst("out", 12);
    await requested(root);
    await settle(root);
    // Rapid key repeat uses the same destination-relative navigation.
    await p.evaluate(() => {
      for (let i = 0; i < 7; i++)
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "+" }));
    });
    await requested(quark);
    await settle(quark);
    await p.evaluate(() => {
      for (let i = 0; i < 7; i++)
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "-" }));
    });
    await requested(root);
    await settle(root);
    assert.equal(
      await p.locator("canvas[data-scene-id]").getAttribute("data-scene-id"),
      identity,
    );
    await p.screenshot({ path: artifact(`rapid-navigation-${width}.png`) });
  }
  // Returning then re-entering remembers a non-default branch during a burst.
  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.goto(
    base +
      "/?focus=atom-0%2Fnucleus%2Fneutron-2&node=atom-0%2Fnucleus%2Fneutron-2",
    { waitUntil: "networkidle" },
  );
  await settle(nucleus + "/neutron-2");
  await burst("out", 1);
  await requested(nucleus);
  await burst("in", 1);
  await requested(nucleus + "/neutron-2");
  await settle(nucleus + "/neutron-2");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: normal-motion rapid click bursts, actual seven-click bursts, immediate labels and enabled controls, endpoint clamping, mid-flight reversal, no animation queue, key repeat, remembered sibling, mobile and persistent renderer.",
  );
} catch (e) {
  await p.screenshot({ path: artifact("rapid-navigation-failure.png") });
  console.error(e);
  console.error({ url: p.url(), errors });
  process.exitCode = 1;
} finally {
  await browser.close();
}
