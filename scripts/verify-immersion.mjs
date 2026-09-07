import { laboratoryBase } from "./locale-fixture.mjs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import {
  locale,
  browserLocale,
  text,
  artifact,
  assertLocale,
} from "./locale-fixture.mjs";
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
  viewport: { width: 1440, height: 1000 },
  locale: browserLocale,
  reducedMotion: "no-preference",
});
page.setDefaultTimeout(25000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = laboratoryBase;
const canvas = page.locator("canvas[data-scene-id]");
const settle = (id) =>
  page.waitForFunction((id) => {
    const c = document.querySelector("canvas[data-scene-id]");
    return c?.dataset.viewpoint === id && c.dataset.transitioning === "false";
  }, id);
async function flight(direction, target) {
  const frames = await page.evaluate(
    (direction) =>
      new Promise((resolve, reject) => {
        const c = document.querySelector("canvas[data-scene-id]"),
          frames = [];
        let started = false;
        const end = performance.now() + 18000;
        document.querySelector(`[data-direction="${direction}"]`).click();
        function frame() {
          const d = c.dataset;
          if (d.transitioning === "true") started = true;
          if (started)
            frames.push({
              progress: +d.flightProgress,
              distance: +d.cameraDistance,
              ghosts: JSON.parse(d.departureNodes || "[]"),
              transitioning: d.transitioning,
            });
          if (started && d.transitioning === "false") resolve(frames);
          else if (performance.now() > end)
            reject(new Error("Flight did not finish"));
          else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }),
    direction,
  );
  await settle(target);
  assert.ok(
    frames.some(
      (f) => f.progress > 0.03 && f.progress < 0.85 && f.ghosts.length > 0,
    ),
    "Departure geometry remains visible during travel",
  );
  assert.ok(
    new Set(frames.map((f) => f.distance)).size >= 3,
    "The camera travels through intermediate distances",
  );
  assert.deepEqual(
    JSON.parse(await canvas.getAttribute("data-departure-nodes")),
    [],
    "Departure surfaces disappear at arrival",
  );
  return frames;
}
try {
  await page.goto(`${base}/?lang=${locale}&focus=molecule`, {
    waitUntil: "networkidle",
  });
  await assertLocale(page);
  await settle("molecule");
  const identity = await canvas.getAttribute("data-scene-id");
  const viewport = JSON.parse(await canvas.getAttribute("data-viewport"));
  assert.ok(
    viewport.top <= 112 && viewport.bottom - viewport.top >= 700,
    "Desktop scene gets most of the screen height",
  );
  const dock = await page.locator(".zoom-navigation").boundingBox();
  assert.ok(
    dock.height <= 60 && dock.y >= viewport.bottom,
    "Compact navigation does not cover the scene",
  );
  await flight("in", "atom-0");
  await flight("in", "atom-0/nucleus");
  await flight("out", "atom-0");
  await page
    .getByRole("button", { name: text("Focus on the scene"), exact: true })
    .click();
  await settle("atom-0");
  assert.ok(await page.locator(".detail-panel").isHidden());
  assert.ok(await page.locator(".tree-panel").isHidden());
  assert.ok(await page.locator(".size-reference").isVisible());
  const expanded = JSON.parse(await canvas.getAttribute("data-viewport"));
  assert.ok(
    expanded.right - expanded.left > viewport.right - viewport.left + 400,
  );
  await page.waitForFunction(() => {
    const c = document.querySelector("canvas[data-scene-id]");
    return (
      JSON.parse(c.dataset.viewport).left < 30 &&
      c.dataset.transitioning === "false"
    );
  });
  await page.screenshot({ path: artifact("immersion-focus.png") });
  await page
    .getByRole("button", { name: text("Show panels"), exact: true })
    .click();
  await settle("atom-0");
  await page
    .getByRole("button", { name: text("Close details"), exact: true })
    .click();
  assert.ok(await page.locator(".detail-panel").isHidden());
  await page.locator('[data-direction="in"]').click();
  await settle("atom-0/nucleus");
  assert.ok(
    await page.locator(".detail-panel").isHidden(),
    "Navigation respects a closed inspector",
  );
  await page
    .getByRole("button", { name: text("Show details"), exact: true })
    .click();
  assert.ok(await page.locator(".detail-panel").isVisible());
  assert.equal(await canvas.getAttribute("data-scene-id"), identity);
  // Reduced motion keeps the same final containment without a travel effect.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${base}/?lang=${locale}&focus=atom-0`, {
    waitUntil: "networkidle",
  });
  await settle("atom-0");
  await page.locator('[data-direction="in"]').click();
  await settle("atom-0/nucleus");
  assert.ok(await page.locator(".travel-reticle").isHidden());
  for (const [width, height] of [
    [390, 844],
    [320, 568],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${base}/?lang=${locale}&focus=molecule`, {
      waitUntil: "networkidle",
    });
    await settle("molecule");
    const box = await page.locator(".zoom-navigation").boundingBox();
    assert.ok(box.height <= 60 && box.y + box.height <= height - 10);
    for (const selector of [
      '[data-direction="in"]',
      '[data-direction="out"]',
      ".composition-trigger",
      ".detail-reopen",
      ".context-interaction",
      ".interaction-controls > button:nth-child(2)",
    ]) {
      assert.ok(
        await page.locator(selector).evaluate((el) => {
          const r = el.getBoundingClientRect();
          return el.contains(
            document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
          );
        }),
        `${selector} is reachable at ${width}`,
      );
    }
    await page
      .getByRole("button", { name: text("Show composition"), exact: true })
      .click();
    assert.ok(await page.locator(".tree-panel").isVisible());
    await page
      .getByRole("button", { name: text("Close composition"), exact: true })
      .click();
    assert.ok(await page.locator(".tree-panel").isHidden());
    await page.screenshot({ path: artifact(`immersion-${width}.png`) });
  }
  assert.deepEqual(errors, []);
  console.log(
    `PASS ${locale}: continuous flights, clean HUD, focus mode, responsive panel controls`,
  );
} finally {
  await browser.close();
}
