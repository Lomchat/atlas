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
const other = locale === "en" ? "fr" : "en";
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
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const canvas = () => page.locator("canvas[data-scene-id]");
const ready = (target) =>
  page.waitForFunction((target) => {
    const c = document.querySelector("canvas[data-scene-id]");
    return (
      c?.dataset.viewpoint === target && c.dataset.transitioning === "false"
    );
  }, target);
const change = async (value) => {
  await page
    .locator(`[data-language-switch="${value}"]:visible`)
    .last()
    .click();
  await page.waitForFunction(
    (value) =>
      document.documentElement.lang === value &&
      document.querySelector("canvas[data-scene-id]")?.dataset.locale === value,
    value,
  );
};
fs.mkdirSync("artifacts", { recursive: true });
try {
  await page.goto(`${base}/?molecule=methane&focus=atom-1`, {
    waitUntil: "networkidle",
  });
  await ready("atom-1");
  await assertLocale(page);
  assert.equal(
    await page.locator("h1").innerText(),
    locale === "fr" ? "Matière Atlas02" : "Matter Atlas02",
  );
  const assertFlags = async (active) => {
    const picker = page.locator(".language-picker:visible").last();
    assert.equal(await picker.locator("select").count(), 0);
    assert.equal(await picker.getByRole("button").count(), 2);
    for (const language of ["fr", "en"]) {
      const button = picker.locator(`[data-language-switch="${language}"]`);
      assert.equal(await button.isVisible(), true);
      assert.equal(
        await button.getAttribute("aria-pressed"),
        String(language === active),
      );
      assert.equal(
        await button.locator(`[data-language-flag="${language}"]`).isVisible(),
        true,
      );
    }
  };
  await assertFlags(locale);
  const identity = await canvas().getAttribute("data-scene-id");
  const distance = await canvas().getAttribute("data-camera-distance");
  const nameBefore = await page.locator(".detail-panel h2").innerText();
  await page
    .locator(".size-reference")
    .getByRole("button", { name: text("Hair"), exact: true })
    .click();
  const comparison = page.locator("canvas[data-comparison-scene]");
  await comparison.evaluate((e) => {
    e.dataset.testIdentity = "persistent-comparison";
  });
  // Both native buttons work from the keyboard without moving the scene.
  await page.locator(`.identity [data-language-switch="${other}"]`).focus();
  await page.keyboard.press("Enter");
  await assertFlags(other);
  await page.locator(`.identity [data-language-switch="${locale}"]`).focus();
  await page.keyboard.press("Space");
  await assertFlags(locale);
  await change(other);
  await assertFlags(other);
  assert.equal(await canvas().getAttribute("data-scene-id"), identity);
  assert.equal(await canvas().getAttribute("data-camera-distance"), distance);
  assert.equal(await canvas().getAttribute("data-viewpoint"), "atom-1");
  assert.equal(
    await comparison.getAttribute("data-test-identity"),
    "persistent-comparison",
  );
  assert.equal(
    await page.locator(".size-reference").getAttribute("data-reference"),
    "hair",
  );
  assert.notEqual(
    await page.locator(".detail-panel h2").innerText(),
    nameBefore,
  );
  assert.match(
    await page.locator(".description").innerText(),
    other === "fr" ? /hydrogène/ : /hydrogen/,
  );
  assert.equal(new URL(page.url()).searchParams.get("focus"), "atom-1");
  assert.equal(new URL(page.url()).searchParams.get("molecule"), "methane");
  assert.equal(new URL(page.url()).searchParams.get("lang"), other);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("atlas-language")),
    other,
  );
  await page.locator(".context-interaction").click();
  await page.locator(".lesson-steps button").nth(1).click();
  await page.waitForFunction(
    () =>
      document.querySelector("canvas[data-scene-id]")?.dataset.phase === "1",
  );
  const phase = await canvas().getAttribute("data-phase");
  const lessonBefore = await page.locator(".lesson-panel h2").innerText();
  await change(locale);
  assert.equal(await canvas().getAttribute("data-phase"), phase);
  assert.equal(await canvas().getAttribute("data-interaction"), "photon");
  assert.notEqual(
    await page.locator(".lesson-panel h2").innerText(),
    lessonBefore,
  );
  assert.equal(await canvas().getAttribute("data-scene-id"), identity);
  await page.screenshot({ path: artifact("language-lesson.png") });
  await page.getByRole("button", { name: text("Close explanation") }).click();
  await page.getByRole("button", { name: text("Choose a molecule") }).click();
  await page.locator('[data-molecule-choice="methane"]').click();
  const preview = page.locator(".molecule-preview canvas");
  const previewHandle = await preview.elementHandle();
  const before = await preview.screenshot();
  await change(other);
  await assertFlags(other);
  assert.equal(
    await previewHandle.evaluate((el) => el.isConnected),
    true,
    "Preview renderer survives language change",
  );
  assert.equal(await preview.getAttribute("data-molecule-preview"), "methane");
  assert.equal(await preview.getAttribute("data-locale"), other);
  assert.equal(
    before.equals(await preview.screenshot()),
    false,
    "Printed flask label changes language",
  );
  await page.screenshot({ path: artifact("language-gallery-switched.png") });
  await change(locale);
  await page.keyboard.press("Escape");
  assert.equal(await canvas().getAttribute("data-scene-id"), identity);
  // Saved preference is used without lang; explicit links override it.
  await page.goto(`${base}/?focus=portion`, { waitUntil: "networkidle" });
  await ready("portion");
  await assertLocale(page);
  await page.goto(`${base}/?lang=${other}&focus=portion`, {
    waitUntil: "networkidle",
  });
  await ready("portion");
  assert.equal(await page.locator("html").getAttribute("lang"), other);
  await page.goto(`${base}/?lang=invalid&focus=portion`, {
    waitUntil: "networkidle",
  });
  await ready("portion");
  await assertLocale(page);
  for (const [width, height] of [
    [390, 844],
    [320, 568],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${base}/?lang=${locale}`, { waitUntil: "networkidle" });
    await ready("sample");
    await page.locator(".context-interaction").click();
    await ready("neighborhood");
    await change(other);
    await change(locale);
    await assertFlags(locale);
    const flag = await page.locator(".identity .language-picker").boundingBox();
    assert.ok(
      flag &&
        flag.x >= 0 &&
        flag.y >= 0 &&
        flag.x + flag.width <= width &&
        flag.y + flag.height <= height,
    );
    await page.screenshot({ path: artifact(`language-${width}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(`${base}/?lang=${locale}&focus=atom-0`, {
    waitUntil: "networkidle",
  });
  await ready("atom-0");
  await page.locator(".context-interaction").click();
  await page.locator(".lesson-steps button").nth(1).click();
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector("canvas[data-scene-id]")?.dataset.animationTime,
      ) > 0.3,
  );
  await page.getByRole("button", { name: text("Pause animation") }).click();
  await page.waitForTimeout(100);
  const pausedTime = await canvas().getAttribute("data-animation-time");
  await change(other);
  await page.waitForTimeout(200);
  assert.equal(
    await canvas().getAttribute("data-animation-time"),
    pausedTime,
    "Changing language preserves a paused animation",
  );
  assert.equal(await canvas().getAttribute("data-phase"), "1");
  await change(locale);
  // Error UI remains translated, including a switch after WebGL context loss.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() =>
    document
      .querySelector("canvas[data-scene-id]")
      .dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
  );
  await page
    .getByRole("button", { name: text("Reload"), exact: true })
    .waitFor();
  await change(other);
  assert.equal(
    await page.locator(".scene-error strong").innerText(),
    other === "fr" ? "La scène 3D est en pause." : "The 3D scene is paused.",
  );
  const blocked = await browser.newPage({ locale: browserLocale });
  await blocked.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  await blocked.goto(base, { waitUntil: "networkidle" });
  await assertLocale(blocked);
  await blocked.locator(`[data-language-switch="${other}"]:visible`).click();
  assert.equal(await blocked.locator("html").getAttribute("lang"), other);
  await blocked.close();
  // The new comparison has its own methane texture, updated without remounting.
  await page.goto(`${base}/?lang=${locale}&molecule=methane&focus=sample`, {
    waitUntil: "networkidle",
  });
  await ready("sample");
  const comparisonTexture = page.locator("canvas[data-comparison-scene]");
  await comparisonTexture.evaluate((e) => {
    e.dataset.testIdentity = "same-texture-renderer";
  });
  const textureBefore = await comparisonTexture.screenshot();
  await change(other);
  await page.waitForFunction(
    (language) =>
      document.querySelector("canvas[data-comparison-scene]")?.dataset
        .locale === language,
    other,
  );
  assert.equal(
    await comparisonTexture.getAttribute("data-test-identity"),
    "same-texture-renderer",
  );
  assert.equal(
    textureBefore.equals(await comparisonTexture.screenshot()),
    false,
    "Comparison flask texture changes language in place",
  );
  await change(locale);
  await assertLocale(page);
  assert.deepEqual(errors, []);
  console.log(
    `PASS ${locale}: two visible flag buttons, active state and keyboard access, live state and texture preservation, URL/storage/browser precedence, responsive access and translated fallbacks`,
  );
} finally {
  await browser.close();
}
