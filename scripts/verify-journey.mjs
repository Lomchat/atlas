/**
 * The core journey, in the scenario's language: intro choice, diving level by
 * level down to the quark, going home, switching branch, floating labels, the
 * scale ruler, wheel and keyboard zoom, the guided tour and old links.
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
  text,
  tr,
  watchConsole,
} from "./locale-fixture.mjs";

const { level, pathThrough, HOME_ID } = levels;
const browser = await launch();
try {
  const context = await browser.newContext({
    locale: browserLocale,
    viewport: { width: 1366, height: 850 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const problems = watchConsole(page);
  const title = () => page.locator(".card-title").innerText();
  const expectLevel = async (id) => {
    await settledOn(page, id);
    assert.equal((await title()).trim(), tr(level(id).title), `card title for ${id}`);
    assert.equal(await scene(page).getAttribute("data-fallback"), "0", `${id} must not use the placeholder scene`);
    assert.equal(new URL(page.url()).searchParams.get("at"), id, `address bar follows ${id}`);
    assert.equal(new URL(page.url()).searchParams.get("lang"), locale, "address bar keeps the language");
  };

  // First visit: the welcome screen offers starting points.
  await page.goto(`${base}/?lang=${locale}`);
  await assertLocale(page);
  assert.equal(await page.title(), text("Atlas — From quarks to the cosmos"));
  const intro = page.getByRole("dialog", { name: text("From quarks to the cosmos") });
  await intro.waitFor();
  await page.screenshot({ path: artifact("journey-intro.png") });
  await intro.locator('[data-level="person"]').click();
  await expectLevel("person");
  assert.equal(await intro.count(), 0, "the welcome screen closes");

  // Before zooming, hovering a control previews the destination.
  const tip = page.getByRole("tooltip");
  await page.locator('[data-action="in"]').hover();
  await tip.waitFor();
  const preview = await tip.innerText();
  assert.ok(preview.includes(tr(level("hand").title)), "the preview names the destination");
  assert.ok(preview.includes(tr(level("hand").teaser)), "the preview explains what it is");
  assert.ok(
    preview.includes(text("Zoom in {factor}", { factor: "" }).trim()),
    "the preview says how far the zoom goes",
  );
  assert.equal(await page.locator('[data-action="in"]').getAttribute("aria-describedby"), "level-tip");
  await page.locator(`.ruler-stop[data-level="universe"]`).hover();
  await page.waitForFunction((title) => document.querySelector("#level-tip")?.textContent?.includes(title), tr(level("universe").title));
  assert.ok((await tip.innerText()).includes(text("Zoom out {factor}", { factor: "" }).trim()));
  await page.mouse.move(5, 400);
  await tip.waitFor({ state: "detached" });

  // The logo brings the welcome screen back; Escape closes it.
  await page.locator('[data-action="intro"]').click();
  await intro.waitFor();
  await page.keyboard.press("Escape");
  await intro.waitFor({ state: "detached" });

  // Dive all the way down the body path with the dive button.
  const path = pathThrough("person");
  const dive = page.locator('[data-action="in"]');
  for (let k = path.findIndex((l) => l.id === "person") + 1; k < path.length; k++) {
    const next = path[k];
    assert.equal(
      await dive.getAttribute("aria-label"),
      text("Dive into {name}", { name: tr(next.short) }),
      `the dive button names ${next.id}`,
    );
    await dive.click();
    await expectLevel(next.id);
    assert.equal(await page.locator(`.ruler-stop[data-level="${next.id}"]`).getAttribute("data-current"), "true");
    if (["hand", "cell", "dna", "c-atom", "c-quark"].includes(next.id))
      await page.screenshot({ path: artifact(`journey-${next.id}.png`) });
  }
  // Nothing smaller is known: the journey ends with a way back.
  assert.equal(await dive.count(), 0, "nothing is smaller than the quark here");
  const restart = page.locator('[data-action="restart"]');
  assert.equal(await restart.getAttribute("aria-label"), text("End of this journey: back to the park"));
  await restart.click();
  await expectLevel(HOME_ID);

  // Home (key) returns to the park from anywhere.
  await page.locator(`.ruler-stop[data-level="dna"]`).click();
  await expectLevel("dna");
  await page.keyboard.press("Home");
  await expectLevel(HOME_ID);

  // Choosing another branch, then zooming back out.
  await page.locator(`.branches [data-level="tree"]`).click();
  await expectLevel("tree");
  await page.locator('[data-action="out"]').click();
  await expectLevel(HOME_ID);
  assert.equal(await page.locator(`.branches [data-level="tree"]`).getAttribute("aria-pressed"), "true");

  // A floating label dives into its object.
  const pondLabel = page.locator(`.target-child [data-level="pond"]`);
  await page.waitForFunction(() =>
    document.querySelector('.target-child:has([data-level="pond"])')?.getAttribute("data-visible") === "1",
  );
  assert.equal(await pondLabel.getAttribute("aria-label"), text("Dive into {name}", { name: tr(level("pond").short) }));
  await pondLabel.click();
  await expectLevel("pond");

  // The scale ruler reaches the other end of the Universe.
  await page.locator(`.ruler-stop[data-level="universe"]`).click();
  await expectLevel("universe");
  await page.screenshot({ path: artifact("journey-universe.png") });

  // Wheel zoom rests on the next level in the direction of travel.
  const box = await scene(page).boundingBox();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.45);
  await page.mouse.wheel(0, -260);
  await expectLevel("laniakea");
  // Keyboard: down dives, up zooms out.
  await page.keyboard.press("ArrowDown");
  await expectLevel("local-group");
  await page.keyboard.press("ArrowUp");
  await expectLevel("laniakea");

  // The guided tour moves on by itself and can be paused.
  const tour = page.locator('[data-action="tour"]');
  assert.equal(await tour.getAttribute("aria-label"), text("Start the guided tour"));
  await tour.click();
  assert.equal(await tour.getAttribute("aria-pressed"), "true");
  await expectLevel("local-group");
  await tour.click();
  assert.equal(await tour.getAttribute("aria-pressed"), "false");

  // Old links and invalid ids open sensible places.
  await page.goto(`${base}/lab?lang=${locale}`);
  await expectLevel("water-molecules");
  await page.goto(`${base}/?world=human/heart&lang=${locale}`);
  await expectLevel("person");
  await page.goto(`${base}/?at=not-a-level&lang=${locale}&intro=0`);
  await expectLevel(HOME_ID);

  assert.deepEqual(problems, [], "no errors or failing scenes");
  console.log(`PASS [${locale}] journey: intro, ${path.length} levels, branches, labels, ruler, wheel, keys, tour, old links`);
} finally {
  await browser.close();
}
