/**
 * Every panel stays reachable and readable on desktop, phone and short
 * landscape screens; dialogs and hotspots open and close properly.
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
  settledOn,
  text,
  tr,
  watchConsole,
} from "./locale-fixture.mjs";

const { level, LEVELS } = levels;
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1180, height: 700 },
  { name: "phone", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "landscape", width: 844, height: 390, isMobile: true, hasTouch: true },
];
const withHotspots = LEVELS.find((l) => (l.hotspots ?? []).length > 0);

const browser = await launch();
try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      locale: browserLocale,
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile ?? false,
      hasTouch: viewport.hasTouch ?? false,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const problems = watchConsole(page);
    const inside = async (selector, label) => {
      const box = await page.locator(selector).first().boundingBox();
      assert.ok(box, `${viewport.name}: ${label} is rendered`);
      assert.ok(
        box.x >= -1 && box.y >= -1 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1,
        `${viewport.name}: ${label} fits the screen (${JSON.stringify(box)})`,
      );
      return box;
    };

    // Welcome screen.
    await page.goto(`${base}/?lang=${locale}&intro=1`);
    await assertLocale(page);
    const intro = page.getByRole("dialog", { name: text("From quarks to the cosmos") });
    await intro.waitFor();
    const choice = intro.locator('[data-level="pond"]');
    await choice.scrollIntoViewIfNeeded();
    await page.screenshot({ path: artifact(`layout-${viewport.name}-intro.png`) });
    await choice.click();
    await settledOn(page, "pond");

    // A deep level with every panel.
    await page.goto(`${base}/?lang=${locale}&at=cell&intro=0`);
    await settledOn(page, "cell");
    await assertLocale(page);
    await inside(".card", "level card");
    await inside(".controls-row", "zoom controls");
    await inside(".topbar-actions", "language, share and about");
    await inside(".ruler-marker", "scale ruler marker");
    const title = await inside(".card-title", "title");
    const hook = await inside(".card-hook", "explanation");
    assert.ok(hook.y > title.y, `${viewport.name}: the explanation follows the title`);
    assert.equal((await page.locator(".card-title").innerText()).trim(), tr(level("cell").title));
    const overflow = await page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `${viewport.name}: no horizontal overflow`);
    const toggle = page.locator(".card-toggle");
    if (await toggle.count()) {
      assert.equal((await toggle.innerText()).trim(), text("Did you know?"));
      await toggle.click();
    }
    await page.locator(".card-fact-text").scrollIntoViewIfNeeded();
    await inside(".card-fact-text", "fact");
    await page.screenshot({ path: artifact(`layout-${viewport.name}-cell.png`) });

    // A long press on touch screens previews the destination without zooming.
    if (viewport.hasTouch) {
      const dive = page.locator('[data-action="in"]');
      await dive.dispatchEvent("pointerdown", { pointerType: "touch", isPrimary: true, pointerId: 7 });
      const tip = page.getByRole("tooltip");
      await tip.waitFor({ timeout: 3000 });
      assert.ok((await tip.innerText()).includes(tr(level("nucleus").teaser)), `${viewport.name}: long-press preview`);
      await inside("#level-tip", "destination preview");
      await dive.dispatchEvent("pointerup", { pointerType: "touch", isPrimary: true, pointerId: 7 });
      await page.waitForTimeout(300);
      assert.equal(await page.locator("canvas[data-atlas-scene]").getAttribute("data-level"), "cell", "a preview does not zoom");
      await page.locator(".card-title").click();
      await tip.waitFor({ state: "detached" });
    }

    // About dialog opens and closes with Escape.
    await page.locator('[data-action="about"]').click();
    const about = page.getByRole("dialog", { name: text("About Atlas") });
    await about.waitFor();
    await inside(".dialog", "about dialog");
    await page.keyboard.press("Escape");
    assert.equal(await about.count(), 0, `${viewport.name}: Escape closes the dialog`);

    // A hotspot opens a readable popover.
    if (withHotspots) {
      await page.goto(`${base}/?lang=${locale}&at=${withHotspots.id}&intro=0`);
      await settledOn(page, withHotspots.id);
      const hotspot = withHotspots.hotspots[0];
      await page.waitForFunction(
        (id) => document.querySelector(`.target-hotspot:has([data-hotspot="${id}"])`)?.getAttribute("data-visible") === "1",
        hotspot.id,
      );
      const dot = page.locator(`[data-hotspot="${hotspot.id}"]`);
      assert.equal(await dot.getAttribute("aria-label"), tr(hotspot.label));
      await dot.click();
      const popover = page.getByRole("dialog", { name: tr(hotspot.label) });
      await popover.waitFor();
      assert.ok((await popover.innerText()).includes(tr(hotspot.text)));
      await page.screenshot({ path: artifact(`layout-${viewport.name}-hotspot.png`) });
      await popover.getByRole("button", { name: text("Close") }).click();
      assert.equal(await popover.count(), 0);
    }

    assert.deepEqual(problems, [], `${viewport.name}: no errors`);
    await context.close();
  }
  console.log(`PASS [${locale}] layout: ${VIEWPORTS.map((v) => v.name).join(", ")}`);
} finally {
  await browser.close();
}
