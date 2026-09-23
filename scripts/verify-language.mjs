/**
 * Switching language in both directions keeps the place, the zoom and the
 * renderer; the choice persists; ?lang= wins; storage failures are harmless.
 */
import assert from "node:assert/strict";
import {
  artifact,
  assertLocale,
  base,
  browserLocale,
  launch,
  levels,
  locale,
  other,
  scene,
  settledOn,
  text,
  tr,
  watchConsole,
} from "./locale-fixture.mjs";

const { level } = levels;
const browser = await launch();
try {
  const context = await browser.newContext({
    locale: browserLocale,
    viewport: { width: 1280, height: 820 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const problems = watchConsole(page);
  const place = "nucleosome";
  await page.goto(`${base}/?lang=${locale}&at=${place}&intro=0`);
  await settledOn(page, place);
  await assertLocale(page);

  const snapshot = () =>
    page.evaluate(() => {
      const canvas = document.querySelector("canvas[data-atlas-scene]");
      return { level: canvas.dataset.level, z: Number(canvas.dataset.z), probe: canvas.__probe ?? null };
    });
  await page.evaluate(() => (document.querySelector("canvas[data-atlas-scene]").__probe = "same-renderer"));
  const before = await snapshot();

  for (const [from, to] of [
    [locale, other],
    [other, locale],
  ]) {
    await page.locator(`[data-language-switch="${to}"]`).click();
    await assertLocale(page, to);
    assert.equal(await page.title(), text("Atlas — From quarks to the cosmos", {}, to));
    assert.equal((await page.locator(".card-title").innerText()).trim(), tr(level(place).title, to));
    assert.equal(
      await page.locator('[data-action="in"]').getAttribute("aria-label"),
      text("Dive into {name}", { name: tr(level("dna").short, to) }, to),
    );
    assert.equal(
      await page.locator(`[data-language-switch="${to}"]`).getAttribute("aria-pressed"),
      "true",
      `the ${to} flag is pressed`,
    );
    assert.equal(
      await page.locator(`[data-language-switch="${from}"]`).getAttribute("aria-pressed"),
      "false",
    );
    const after = await snapshot();
    assert.equal(after.level, before.level, "the place is unchanged");
    assert.ok(Math.abs(after.z - before.z) < 0.002, "the zoom is unchanged");
    assert.equal(after.probe, "same-renderer", "the renderer is not rebuilt");
    assert.equal(new URL(page.url()).searchParams.get("lang"), to);
    assert.equal(new URL(page.url()).searchParams.get("at"), place);
    await page.screenshot({ path: artifact(`language-${to}.png`) });
  }

  // The other language, once chosen, is remembered…
  await page.locator(`[data-language-switch="${other}"]`).click();
  await page.goto(`${base}/?at=dna&intro=0`);
  await settledOn(page, "dna");
  await assertLocale(page, other);
  // …but an explicit ?lang= wins.
  await page.goto(`${base}/?lang=${locale}&at=dna&intro=0`);
  await settledOn(page, "dna");
  await assertLocale(page);
  assert.equal((await page.locator(".card-title").innerText()).trim(), tr(level("dna").title));

  // A fresh visitor gets the browser language.
  const fresh = await browser.newContext({ locale: browserLocale, viewport: { width: 1280, height: 820 }, reducedMotion: "reduce" });
  const freshPage = await fresh.newPage();
  await freshPage.goto(`${base}/?at=park&intro=0`);
  await settledOn(freshPage, "park");
  await assertLocale(freshPage);

  // Storage that throws must not break anything.
  const locked = await browser.newContext({ locale: browserLocale, viewport: { width: 1280, height: 820 }, reducedMotion: "reduce" });
  await locked.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  const lockedPage = await locked.newPage();
  const lockedProblems = watchConsole(lockedPage);
  await lockedPage.goto(`${base}/?at=cell`);
  await settledOn(lockedPage, "cell");
  await assertLocale(lockedPage);
  await lockedPage.locator(`[data-language-switch="${other}"]`).click();
  await assertLocale(lockedPage, other);
  assert.equal((await lockedPage.locator(".card-title").innerText()).trim(), tr(level("cell").title, other));
  assert.equal(await scene(lockedPage).getAttribute("data-level"), "cell");

  assert.deepEqual([...problems, ...lockedProblems], [], "no errors");
  console.log(`PASS [${locale}] language: both directions, same renderer and place, persistence, ?lang precedence, fallbacks`);
} finally {
  await browser.close();
}
