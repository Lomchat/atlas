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
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const open = () =>
  page.getByRole("button", { name: "Choose a molecule" }).click();
const canvas = () => page.locator("canvas[data-scene-id]");
const preview = () => page.locator(".molecule-preview canvas");
const ready = (id) =>
  page.waitForFunction(
    (id) =>
      document.querySelector("canvas[data-scene-id]")?.dataset.viewpoint ===
        id &&
      document.querySelector("canvas[data-scene-id]")?.dataset.transitioning ===
        "false",
    id,
  );
fs.mkdirSync("artifacts", { recursive: true });
try {
  await page.goto(base + "/?focus=atom-0%2Fnucleus&node=atom-0%2Fnucleus", {
    waitUntil: "networkidle",
  });
  await ready("atom-0/nucleus");
  const identity = await canvas().getAttribute("data-scene-id"),
    url = page.url();
  await open();
  assert.equal(await page.getByRole("dialog").count(), 1);
  await preview().waitFor();
  await page.locator('[data-molecule-choice="methane"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector(".molecule-preview canvas")?.dataset
        .moleculePreview === "methane",
  );
  assert.equal(page.url(), url);
  assert.equal(await canvas().getAttribute("data-scene-id"), identity);
  await page.screenshot({ path: "artifacts/picker-desktop.png" });
  const beforeRotation = await preview().screenshot();
  const area = await preview().boundingBox();
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    area.x + area.width / 2 + 90,
    area.y + area.height / 2 + 35,
    { steps: 6 },
  );
  await page.mouse.up();
  assert.equal(
    beforeRotation.equals(await preview().screenshot()),
    false,
    "Dragging rotates the preview",
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(await page.locator("canvas").count(), 1);
  assert.equal(await canvas().getAttribute("data-viewpoint"), "atom-0/nucleus");
  assert.equal(
    await page
      .getByRole("button", { name: "Choose a molecule" })
      .evaluate((e) => document.activeElement === e),
    true,
  );
  await open();
  await page.locator("[data-molecule-enter]").click();
  assert.equal(page.url(), url);
  assert.equal(await canvas().getAttribute("data-scene-id"), identity);
  await open();
  await page.mouse.click(4, 4);
  assert.equal(await page.getByRole("dialog").count(), 0);
  await open();
  await page.locator('[data-molecule-choice="co2"]').focus();
  await page.keyboard.press("Space");
  assert.equal(
    await page
      .locator('[data-molecule-choice="co2"]')
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.locator("[data-molecule-enter]").click();
  await ready("sample");
  assert.equal(new URL(page.url()).searchParams.get("molecule"), "co2");
  assert.equal(await canvas().getAttribute("data-scale"), "sample");
  for (const [name, width, height] of [
    ["mobile", 390, 844],
    ["small", 320, 568],
    ["landscape", 844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await open();
    await preview().waitFor();
    const bounds = await page.locator("[data-molecule-enter]").boundingBox();
    assert.ok(
      bounds.y >= 0 && bounds.y + bounds.height <= height,
      `CTA visible ${name}`,
    );
    assert.ok(
      await page
        .locator(".picker-body")
        .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
      `No horizontal overflow ${name}`,
    );
    await page.screenshot({ path: `artifacts/picker-${name}.png` });
    await page.locator('[data-molecule-choice="methane"]').click();
    await page.locator("[data-molecule-enter]").click();
    await ready("sample");
    assert.equal(new URL(page.url()).searchParams.get("molecule"), "methane");
    assert.equal(await page.locator("canvas").count(), 1);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Light mode", exact: true }).click();
  await open();
  await page.screenshot({ path: "artifacts/picker-light.png" });
  await page.getByRole("button", { name: "Close dialog" }).click();
  assert.deepEqual(errors, []);
  console.log(
    "PASS molecule picker: previews, browsing/resume preserves focus, commit, Escape/backdrop/focus restoration, keyboard, mobile/landscape CTA, light theme, renderer cleanup",
  );
} finally {
  await browser.close();
}
