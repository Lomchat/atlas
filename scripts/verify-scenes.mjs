/**
 * Every level opens directly from its link, builds its own scene (never the
 * placeholder), shows its card in the scenario's language and raises no error.
 * Also checks one mid-dive frame into each level's primary child.
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
  scene,
  settledOn,
  tr,
  watchConsole,
} from "./locale-fixture.mjs";

const { LEVELS, primaryChild } = levels;
const browser = await launch();
try {
  const context = await browser.newContext({
    locale: browserLocale,
    viewport: { width: 960, height: 600 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const problems = watchConsole(page);
  for (const level of LEVELS) {
    await page.goto(`${base}/?lang=${locale}&at=${level.id}&intro=0&freeze=2`);
    await settledOn(page, level.id);
    await assertLocale(page);
    assert.equal(await scene(page).getAttribute("data-fallback"), "0", `${level.id} must have its own scene`);
    assert.equal((await page.locator(".card-title").innerText()).trim(), tr(level.title), `${level.id} card`);
    await page.screenshot({ path: artifact(`scene-${level.id}.png`) });
    const child = primaryChild(level.id);
    if (child) {
      await page.goto(`${base}/?lang=${locale}&at=${level.id}&intro=0&freeze=2&ui=0&offset=-0.55`);
      await page.waitForFunction(() => document.querySelector("canvas[data-atlas-scene]")?.dataset.ready === "1");
      assert.equal(await scene(page).getAttribute("data-fallback"), "0", `${level.id} → ${child.id} transition`);
    }
    assert.deepEqual(problems, [], `${level.id}: no errors`);
  }
  console.log(`PASS [${locale}] scenes: ${LEVELS.length} levels and their dives`);
} finally {
  await browser.close();
}
