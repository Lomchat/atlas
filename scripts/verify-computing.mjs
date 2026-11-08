/**
 * The computing section, essentials only, in the scenario's language: the
 * switch at the top left (same renderer, place kept on both sides), the
 * chapter map, the controls of each step, language switching, links, every
 * step's scene, and a phone fit.
 */
import assert from "node:assert/strict";
import {
  artifact,
  assertLocale,
  base,
  browserLocale,
  launch,
  locale,
  other,
  scene,
  settledOn,
  text,
  tr,
  watchConsole,
} from "./locale-fixture.mjs";

const { LESSONS, lessonById, isReady } = await import("../src/computing/index.ts");
const bits = lessonById.get("bits");

/** Wait until the computing view rests on scene `key` at step `index`, with its own scene. */
async function stageOn(page, key, index = 0) {
  await page.waitForFunction(
    ([expected, k]) => {
      const c = document.querySelector("canvas[data-atlas-scene]");
      return c?.dataset.section === "computing" && c.dataset.stage === expected && c.dataset.step === String(k) && c.dataset.ready === "1" && c.dataset.moving === "0";
    },
    [key, index],
    { timeout: 30000 },
  );
  assert.equal(await scene(page).getAttribute("data-fallback"), "0", `${key} must have its own scene`);
}
const pinned = (page, selector) =>
  page.waitForFunction((s) => document.querySelector(s)?.closest(".cs-anchor")?.getAttribute("data-visible") === "1", selector);

const browser = await launch();
try {
  const context = await browser.newContext({ locale: browserLocale, viewport: { width: 1366, height: 860 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const problems = watchConsole(page);
  const title = () => page.locator(".card-title").innerText().then((v) => v.trim());
  const params = () => new URL(page.url()).searchParams;
  const probe = () => page.evaluate(() => document.querySelector("canvas[data-atlas-scene]").__probe);
  const expectStep = async (lesson, id) => {
    const index = lesson.steps.findIndex((s) => s.id === id);
    await stageOn(page, lesson.scene, index);
    assert.equal(await title(), tr(lesson.steps[index].title), `card of ${lesson.id}/${id}`);
    assert.equal(params().get("step"), id, `address bar follows ${id}`);
  };

  // The switch at the top left opens the section with the same renderer.
  await page.goto(`${base}/?lang=${locale}&at=cell&intro=0`);
  await settledOn(page, "cell");
  await assertLocale(page);
  await page.evaluate(() => (document.querySelector("canvas[data-atlas-scene]").__probe = "same-renderer"));
  const switches = page.getByRole("navigation", { name: text("Sections") });
  const toComputing = switches.getByRole("button", { name: text("Computing") });
  const toAtlas = switches.getByRole("button", { name: text("Universe") });
  const box = await page.locator(".section-switch").boundingBox();
  assert.ok(box.x < 1366 / 2 && box.y < 80, "the section switch sits at the top left");
  await toComputing.click();
  await stageOn(page, "board");
  assert.equal(await page.title(), text("Atlas — From bits to AI"));
  assert.equal(params().get("section"), "computing");

  // The chapter map lists every chapter; only ready ones open; a station opens its chapter.
  for (const lesson of LESSONS)
    assert.equal(await page.locator(`.cs-chapter[data-lesson="${lesson.id}"]`).isDisabled(), !isReady(lesson), `${lesson.id} availability`);
  await page.screenshot({ path: artifact("computing-map.png") });
  await pinned(page, 'button[data-station="bits"]');
  await page.locator('button[data-station="bits"]').click();
  await expectStep(bits, "switch");

  // Each kind of control of chapter 1 changes the scene's state.
  await pinned(page, '[data-action="flip"]');
  await page.getByRole("button", { name: text("Flip the switch") }).click();
  assert.equal((await page.locator('[data-readout="bit"]').textContent()).trim(), "0");
  await page.locator('[data-action="next"]').click();
  await expectStep(bits, "where");
  await page.locator(".card-title").click();
  await page.keyboard.press("ArrowRight");
  await expectStep(bits, "double");
  await page.locator('[data-step-stop="count"]').click();
  await expectStep(bits, "count");
  const sum = page.locator('[data-readout="sum"]');
  await pinned(page, '[data-readout="sum"]');
  assert.equal((await sum.textContent()).trim(), "00001101 = 8 + 4 + 1 = 13");
  await pinned(page, '[data-bit="0"]');
  await page.getByRole("button", { name: text("Bit worth {value}", { value: 128 }) }).click();
  await page.getByRole("button", { name: text("Add 1") }).click();
  assert.equal((await sum.textContent()).trim(), "10001110 = 128 + 8 + 4 + 2 = 142");
  await page.locator('[data-step-stop="letter"]').click();
  await expectStep(bits, "letter");
  await page.getByLabel(text("Type a character")).fill("é");
  await pinned(page, '[data-byte="1"]');
  assert.ok((await page.locator('[data-readout="code"]').textContent()).includes(text("Number {n}", { n: 233 })));
  assert.deepEqual(await page.locator(".cs-byte").allTextContents(), ["11000011", "10101001"]);
  await page.locator('[data-step-stop="color"]').click();
  await expectStep(bits, "color");
  await page.getByRole("button", { name: text("Violet") }).click();
  await pinned(page, '[data-readout="blue"]');
  assert.equal(await page.locator('[data-readout="blue"] b').textContent(), "255");

  // Another language keeps the step, the visitor's changes and the renderer.
  await page.locator(`[data-language-switch="${other}"]`).click();
  await assertLocale(page, other);
  assert.equal(await title(), tr(bits.steps.at(-1).title, other));
  assert.equal(params().get("step"), "color");
  assert.equal(await page.locator('[data-readout="blue"] b').textContent(), "255");
  await page.locator(`[data-language-switch="${locale}"]`).click();
  assert.equal(await probe(), "same-renderer");

  // Back to the Atlas and again: each side keeps its place.
  await toAtlas.click();
  await settledOn(page, "cell");
  assert.equal(params().get("at"), "cell");
  assert.equal(await page.title(), text("Atlas — From quarks to the cosmos"));
  await toComputing.click();
  await expectStep(bits, "color");
  assert.equal(await probe(), "same-renderer");

  // The end of a chapter leads to the next one through a title card.
  const gates = lessonById.get("gates");
  await page.locator('[data-action="next-lesson"]').click();
  const banner = page.getByRole("status").filter({ hasText: tr(gates.title) });
  await banner.waitFor();
  assert.ok((await banner.innerText()).includes(text("Chapter {n} complete", { n: 1 })));
  await banner.waitFor({ state: "detached" });
  await expectStep(gates, "transistor");

  // Chapter 2: a gate follows its inputs; the adder adds.
  await page.locator('[data-step-stop="and"]').click();
  await expectStep(gates, "and");
  await pinned(page, '[data-readout="output"]');
  assert.equal((await page.locator('[data-readout="output"]').textContent()).trim(), "= 1");
  await page.getByRole("button", { name: text("Input {name}", { name: "B" }) }).click();
  assert.equal((await page.locator('[data-readout="output"]').textContent()).trim(), "= 0");
  await page.locator('[data-step-stop="adder"]').click();
  await expectStep(gates, "adder");
  await page.locator('[data-preset="15+15"]').click();
  await pinned(page, '[data-readout="value-sum"]');
  assert.equal((await page.locator('[data-readout="value-sum"]').textContent()).trim(), "= 30");

  // Chapter 3: one long dive from the laptop to silicon atoms, with a true scale bar.
  const inside = lessonById.get("inside");
  await page.goto(`${base}/?lang=${locale}&section=computing&lesson=inside&step=laptop`);
  await expectStep(inside, "laptop");
  await pinned(page, '[data-readout="scale"]');
  assert.equal((await page.locator('[data-readout="scale"]').textContent()).trim(), "10 cm");
  await page.locator('[data-step-stop="atoms"]').click();
  await expectStep(inside, "atoms");
  await pinned(page, '[data-readout="scale"]');
  assert.equal((await page.locator('[data-readout="scale"]').textContent()).trim(), "500 pm");

  // Chapter 4: the clock, the exchange (same key on both sides) and RSA.
  const keys = lessonById.get("keys");
  await page.goto(`${base}/?lang=${locale}&section=computing&lesson=keys&step=clock`);
  await expectStep(keys, "clock");
  await page.getByRole("button", { name: text("Multiply by 5") }).click();
  await pinned(page, '[data-readout="power"]');
  assert.equal((await page.locator('[data-readout="power"]').textContent()).trim(), "57 → 17");
  await page.locator('[data-step-stop="shared"]').click();
  await expectStep(keys, "shared");
  await pinned(page, '[data-readout="key-alice"]');
  assert.equal((await page.locator('[data-readout="key-alice"]').textContent()).trim(), "196 → 2");
  await page.getByLabel(text("Alice’s secret")).fill("9");
  const [aliceKey, bobKey] = [await page.locator('[data-readout="key-alice"] b').textContent(), await page.locator('[data-readout="key-bob"] b').textContent()];
  assert.equal(aliceKey, bobKey, "both sides find the same key");
  await page.locator('[data-step-stop="padlock"]').click();
  await expectStep(keys, "padlock");
  await page.getByLabel(text("Message")).fill("12");
  assert.equal(await page.locator('[data-readout="unlock"] b').textContent(), "12", "Bob gets the message back");

  // Chapter 5: one neuron counts points, then learns from its mistake.
  const neuronsLesson = lessonById.get("neurons");
  await page.goto(`${base}/?lang=${locale}&section=computing&lesson=neurons&step=neuron`);
  await expectStep(neuronsLesson, "neuron");
  const umbrella = page.locator('[data-readout="umbrella"]');
  await pinned(page, '[data-readout="umbrella"]');
  assert.equal((await umbrella.textContent()).trim(), text("Yes"));
  await page.locator('[data-action="forecast"]').click();
  assert.equal((await umbrella.textContent()).trim(), text("No"));
  await page.locator('[data-step-stop="learn"]').click();
  await expectStep(neuronsLesson, "learn");
  assert.equal((await umbrella.textContent()).trim(), text("No"));
  await page.locator('[data-action="learn"]').click();
  assert.equal((await umbrella.textContent()).trim(), text("No"), "10 points: still no");
  await page.locator('[data-action="learn"]').click();
  assert.ok((await page.locator('[data-readout="total"]').textContent()).trim().endsWith("= 11"), "8 + 3 = 11");
  assert.equal((await umbrella.textContent()).trim(), text("Yes"));

  // Chapter 6: the toy tokenizer, attention and generation.
  const llm = lessonById.get("llm");
  await page.goto(`${base}/?lang=${locale}&section=computing&lesson=llm&step=tokens`);
  await expectStep(llm, "tokens");
  await page.getByLabel(text("Type a sentence")).fill("unbelievably");
  await pinned(page, '[data-token="2"]');
  assert.equal(await page.locator(".cs-token").count(), 3, "a rare word is cut into pieces");
  await page.locator('[data-step-stop="attention"]').click();
  await expectStep(llm, "attention");
  await page.locator('[data-preset="small"]').click();
  assert.ok((await page.locator('[data-weight="7"]').textContent()).startsWith("61"), "“it” now looks at the suitcase");
  await page.locator('[data-step-stop="generate"]').click();
  await expectStep(llm, "generate");
  await page.getByRole("button", { name: text("Start again") }).click();
  await page.locator('[data-action="next-token"]').click();
  await pinned(page, '[data-generated="0"]');

  // Links: unknown and unfinished chapters fall back to the map.
  for (const lesson of ["nope", ...LESSONS.filter((l) => !isReady(l)).map((l) => l.id).slice(0, 1)]) {
    await page.goto(`${base}/?lang=${locale}&section=computing&lesson=${lesson}`);
    await stageOn(page, "board");
  }

  // Every step of every ready chapter opens from its link with its own scene.
  for (const lesson of LESSONS.filter(isReady))
    for (const s of lesson.steps) {
      await page.goto(`${base}/?lang=${locale}&section=computing&lesson=${lesson.id}&step=${s.id}&freeze=2`);
      await expectStep(lesson, s.id);
      await page.screenshot({ path: artifact(`computing-${lesson.id}-${s.id}.png`) });
    }
  assert.deepEqual(problems, [], "no errors");
  await context.close();

  // Phone: a lesson step fits the screen.
  const phone = await browser.newContext({ locale: browserLocale, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const mobile = await phone.newPage();
  const mobileProblems = watchConsole(mobile);
  await mobile.goto(`${base}/?lang=${locale}&section=computing&lesson=bits&step=count`);
  await mobile.waitForFunction(() => document.querySelector("canvas[data-atlas-scene]")?.dataset.ready === "1");
  for (const selector of [".section-switch", ".topbar-actions", ".cs-dock", ".controls-row"]) {
    const r = await mobile.locator(selector).first().boundingBox();
    assert.ok(r && r.x >= -1 && r.y >= -1 && r.x + r.width <= 391 && r.y + r.height <= 845, `phone: ${selector} fits`);
  }
  await mobile.screenshot({ path: artifact("computing-phone.png") });
  assert.deepEqual(mobileProblems, [], "phone: no errors");
  console.log(`PASS [${locale}] computing: switch, map, controls, language, places kept, links, ${LESSONS.filter(isReady).length} chapter(s), phone`);
} finally {
  await browser.close();
}
