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
const context = await browser.newContext({
  locale: browserLocale,
  reducedMotion: "reduce",
  viewport: { width: 1400, height: 900 },
});
const errors = [];
const page = await context.newPage();
page.setDefaultTimeout(16000);
page.on("pageerror", (error) => errors.push(error.message));
const base = process.env.ATLAS_URL || "http://127.0.0.1:3017";
const RBC = "human/vein/blood/red-cell";
const HEMOGLOBIN = `${RBC}/hemoglobin`;
const WBC = "human/vein/blood/white-cell";
const query = { en: "red blood cell", fr: "globule rouge" }[locale];
const naturalQuestion = {
  en: "What is a red blood cell made of?",
  fr: "De quoi est composé un globule rouge ?",
}[locale];
const opposite = locale === "en" ? "fr" : "en";
function url(node = "world") {
  const address = new URL(base);
  address.search = "";
  address.searchParams.set("lang", locale);
  address.searchParams.set("world", node);
  return address.href;
}
const action = (name, scope = page) => scope.locator(`[data-action="${name}"]`);
const settle = (id, target = page) =>
  target.waitForFunction((id) => {
    const canvas = document.querySelector("canvas[data-world-scene]");
    return (
      canvas?.dataset.selected === id &&
      canvas.dataset.transitioning === "false"
    );
  }, id);

try {
  await page.goto(url());
  await assertLocale(page);
  await settle("world");
  const renderer = await page
    .locator("canvas[data-world-scene]")
    .getAttribute("data-world-scene");
  const navigation = await page.locator(".world-navigation").boundingBox();
  assert.ok(
    navigation.height <= 70 && navigation.y >= 790,
    "Named controls stay compact at the bottom of the viewport",
  );
  assert.equal(
    await page.locator("[data-language-switch]").count(),
    2,
    "Both language flags are immediately visible",
  );

  // Search leads to the exact cell and exposes its place in the larger body.
  await action("world-search").click();
  assert.equal(
    await page
      .locator("[data-action='world-search-input']")
      .evaluate((input) => document.activeElement === input),
    true,
    "Discovery focuses the search field",
  );
  await action("world-search-input").fill(query);
  const result = page.locator(`.world-search-results [data-node="${RBC}"]`);
  await result.waitFor({ state: "visible" });
  await action("world-search-input").fill(naturalQuestion);
  await result.waitFor({ state: "visible" });
  assert.ok(
    (await result.locator(".world-result-question").innerText()).length > 15,
    "Natural-language questions lead to a real scientific question",
  );
  assert.ok(
    (await result.locator("small").innerText()).includes("›"),
    "Search results show their ancestry",
  );
  await page.screenshot({ path: artifact("world-interface-search.png") });
  await result.click();
  await settle(RBC);
  assert.equal(
    await page
      .locator("canvas[data-world-scene]")
      .getAttribute("data-world-scene"),
    renderer,
    "Discovering a node preserves the 3D renderer",
  );
  assert.ok(
    (await page.locator(".world-description").innerText()).length > 70,
    "The explanation contains meaningful scientific copy",
  );
  assert.equal(
    await page
      .locator(".world-inspector [data-action='world-enter-child']")
      .count(),
    2,
    "A mature red cell exposes hemoglobin and membrane, with no invented nucleus",
  );
  await page.locator(".world-sources summary").click();
  const links = await page
    .locator(".world-sources a")
    .evaluateAll((items) =>
      items.map((link) => ({ href: link.href, title: link.textContent })),
    );
  assert.ok(
    links.length > 0 &&
      links.every(
        (link) =>
          link.href.startsWith("https://") && link.title.trim().length > 5,
      ),
    "The explanation links named scientific sources",
  );
  await action("world-reveal-answer").click();
  assert.equal(
    await action("world-reveal-answer").getAttribute("aria-expanded"),
    "true",
  );
  assert.ok(
    (await page.locator(".world-question-card p").innerText()).length > 45,
    "The question reveals an explanation",
  );

  // The notebook saves actual routes and survives a refresh.
  await action("world-save-place").click();
  assert.equal(
    await action("world-save-place").getAttribute("aria-pressed"),
    "true",
  );
  await action("world-notebook").click();
  assert.equal(
    await page.locator(`.world-notebook-list [data-node="${RBC}"]`).count(),
    2,
    "Saved and recently explored sections both contain the current route",
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await action("world-notebook").evaluate(
      (button) => button === document.activeElement,
    ),
    true,
    "Closing discovery restores focus",
  );
  await page.reload();
  await settle(RBC);
  assert.equal(
    await action("world-save-place").getAttribute("aria-pressed"),
    "true",
    "Saved places persist on this device",
  );

  // Wrong answers teach without awarding an understood idea; correct answers do.
  await action("world-open-quiz").click();
  await page
    .locator('[data-action="world-quiz-answer"][data-answer="1"]')
    .click();
  assert.ok(
    (await page.locator(".world-quiz-feedback").innerText()).length > 90,
  );
  assert.equal(
    await page
      .locator('.world-quiz-options [data-answer="0"]')
      .evaluate((button) => button.classList.contains("correct")),
    true,
  );
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("atlas-world-notebook-v1")).understood
          .length,
    ),
    0,
  );
  await action("world-next-quiz").click();
  await page
    .locator('[data-action="world-quiz-answer"][data-answer="1"]')
    .click();
  assert.ok(
    (await page.locator(".world-quiz-feedback").innerText()).includes(
      text("Exactly!"),
    ),
  );
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("atlas-world-notebook-v1")).understood
          .length,
    ),
    1,
  );
  await page.keyboard.press("Escape");

  // A trail keeps every parent-child step, and repeated input advances immediately.
  await action("world-search").click();
  await action("world-tab-journeys").click();
  await page
    .locator('[data-action="world-choose-trail"][data-trail="red-cell"]')
    .click();
  await settle("world");
  const targets = [
    "human",
    "human/vein",
    "human/vein/blood",
    RBC,
    HEMOGLOBIN,
    `${HEMOGLOBIN}/heme`,
    `${HEMOGLOBIN}/heme/iron`,
  ];
  for (const id of targets) {
    assert.equal(await action("world-in").getAttribute("data-target"), id);
    await action("world-in").click();
    await page.waitForFunction(
      (id) =>
        document.querySelector(".world-atlas")?.dataset.selectedWorld === id,
      id,
    );
  }
  await settle(targets.at(-1));
  assert.ok(
    (await page.locator(".world-trail.complete").textContent()).includes(
      text("Trail completed"),
    ),
  );
  await action("world-leave-trail").click();

  // Explanation phase, pause state and renderer identity survive a language switch.
  await action("world-search").click();
  await action("world-tab-journeys").click();
  await page
    .locator(
      '[role="dialog"] [data-action="world-open-mechanism"][data-mechanism="oxygen-transfer"]',
    )
    .click();
  await settle(HEMOGLOBIN);
  const mechanism = page.locator(".world-mechanism-panel");
  await page
    .locator('[data-action="world-mechanism-step"][data-step="2"]')
    .click();
  assert.equal(await mechanism.getAttribute("data-phase"), "2");
  assert.equal(await mechanism.getAttribute("data-playing"), "false");
  const beforeCopy = await page
    .locator(".world-mechanism-explanation p")
    .innerText();
  const beforeRenderer = await page
    .locator("canvas[data-world-scene]")
    .getAttribute("data-world-scene");
  await page.locator(`[data-language-switch="${opposite}"]`).click();
  assert.notEqual(
    await page.locator(".world-mechanism-explanation p").innerText(),
    beforeCopy,
    "Every phase translates in place",
  );
  assert.equal(await mechanism.getAttribute("data-phase"), "2");
  assert.equal(await mechanism.getAttribute("data-playing"), "false");
  assert.equal(
    await page
      .locator("canvas[data-world-scene]")
      .getAttribute("data-world-scene"),
    beforeRenderer,
  );
  await page.locator(`[data-language-switch="${locale}"]`).click();
  await assertLocale(page);

  // A modal remains above an active explanatory diagram, including its hit targets.
  await action("world-search").click();
  const searchBox = await action("world-search-input").boundingBox();
  assert.ok(searchBox.width > 100 && searchBox.height > 0);
  const modalStack = await page.evaluate(
    ({ x, y }) => ({
      target: document.elementFromPoint(x, y)?.getAttribute("data-action"),
      ui: Number(getComputedStyle(document.querySelector(".world-ui")).zIndex),
      diagram: Number(
        getComputedStyle(
          document.querySelector(".world-atlas > .world-mechanism-visual"),
        ).zIndex,
      ),
    }),
    {
      x: searchBox.x + searchBox.width / 2,
      y: searchBox.y + searchBox.height / 2,
    },
  );
  assert.equal(modalStack.target, "world-search-input");
  assert.ok(
    modalStack.ui > modalStack.diagram,
    "The modal paints above the explanatory diagram",
  );
  await page.keyboard.press("Escape");

  // Focusing restores canvas input and pauses the hidden lesson without losing its phase.
  await action("world-mechanism-play").click();
  assert.equal(await mechanism.getAttribute("data-playing"), "true");
  await action("world-focus").click();
  await page.waitForFunction(
    () => document.querySelector(".world-atlas")?.dataset.mechanism === "false",
  );
  assert.equal(await mechanism.count(), 0);
  assert.equal(
    await page.locator(".world-mechanism-visual:visible").count(),
    0,
  );
  assert.equal(
    await page
      .locator(".world-scene")
      .evaluate((scene) => getComputedStyle(scene).pointerEvents),
    "auto",
  );
  const beforeFocusWheel = await page
    .locator("canvas[data-world-scene]")
    .getAttribute("data-camera-distance");
  await page.mouse.move(980, 495);
  await page.mouse.wheel(0, -20);
  await page.waitForFunction(
    (before) =>
      document.querySelector("canvas[data-world-scene]")?.dataset
        .cameraDistance !== before,
    beforeFocusWheel,
  );
  assert.equal(
    await page.locator(".world-atlas").getAttribute("data-selected-world"),
    HEMOGLOBIN,
  );
  await action("world-focus").click();
  await mechanism.waitFor({ state: "visible" });
  assert.equal(await mechanism.getAttribute("data-phase"), "2");
  assert.equal(await mechanism.getAttribute("data-playing"), "false");
  await action("world-mechanism-replay").click();
  assert.equal(await mechanism.getAttribute("data-phase"), "0");
  assert.equal(await mechanism.getAttribute("data-playing"), "true");
  await action("world-mechanism-play").click();
  assert.equal(await mechanism.getAttribute("data-playing"), "false");
  await page.screenshot({ path: artifact("world-interface-mechanism.png") });
  await action("world-close-mechanism").click();

  // Dismissing the backdrop must consume its complete pointer gesture.
  await page.locator("canvas[data-world-scene]").evaluate((canvas) => {
    canvas.dataset.modalPointerUps = "0";
    canvas.addEventListener(
      "pointerup",
      () => {
        canvas.dataset.modalPointerUps = String(
          Number(canvas.dataset.modalPointerUps) + 1,
        );
      },
      { once: true },
    );
  });
  await action("world-search").click();
  const dialogBox = await page.locator('[role="dialog"]').boundingBox();
  await page.mouse.click(dialogBox.x - 18, dialogBox.y + dialogBox.height / 2);
  assert.equal(await page.locator('[role="dialog"]').count(), 0);
  assert.equal(
    await page
      .locator("canvas[data-world-scene]")
      .getAttribute("data-modal-pointer-ups"),
    "0",
    "Dismissal does not send pointerup into the underlying scene",
  );
  assert.equal(
    await page.locator(".world-atlas").getAttribute("data-selected-world"),
    HEMOGLOBIN,
  );

  // Shared routes remember the selected sibling before the first local navigation.
  await page.goto(url(WBC));
  await assertLocale(page);
  await settle(WBC);
  await action("world-out").click();
  await settle("human/vein/blood");
  assert.equal(await action("world-in").getAttribute("data-target"), WBC);
  await action("world-in").click();
  await settle(WBC);

  // The canvas keyboard follows the same guided destination as the named button.
  await action("world-search").click();
  await action("world-tab-journeys").click();
  await page
    .locator('[data-action="world-choose-trail"][data-trail="wood"]')
    .click();
  await settle("world");
  assert.equal(await action("world-in").getAttribute("data-target"), "tree");
  await page.locator("canvas[data-world-scene]").focus();
  await page.keyboard.press("Enter");
  await settle("tree");
  await action("world-leave-trail").click();

  // Touch layouts retain a large scene on arrival and make explanations optional.
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 744, height: 900 },
    { width: 844, height: 390 },
  ]) {
    const phone = await context.newPage({ viewport });
    await phone.setViewportSize(viewport);
    phone.on("pageerror", (error) => errors.push(error.message));
    await phone.goto(url(RBC));
    await assertLocale(phone);
    await settle(RBC, phone);
    assert.equal(
      await phone.locator(".world-inspector").count(),
      0,
      "The mobile scene starts without a large reading panel",
    );
    const nav = await phone.locator(".world-navigation").boundingBox();
    assert.ok(
      nav.x >= 0 &&
        nav.x + nav.width <= viewport.width + 1 &&
        nav.y + nav.height <= viewport.height,
    );
    const scale = await phone.locator(".world-scale").boundingBox();
    assert.ok(
      scale.x >= 0 && scale.y >= 0 && scale.y + scale.height < nav.y,
      "Physical comparison stays above the navigation",
    );
    await action("world-toggle-inspector", phone).click();
    const explanation = await phone.locator(".world-description").boundingBox();
    const panel = await phone.locator(".world-inspector").boundingBox();
    assert.ok(
      explanation.y >= panel.y && explanation.y < panel.y + panel.height - 30,
      "The first explanation begins inside the visible reading panel",
    );
    await phone.screenshot({
      path: artifact(
        `world-interface-mobile-${viewport.width}x${viewport.height}.png`,
      ),
    });
    await action("world-fold-inspector", phone).click();
    await action("world-search", phone).click();
    await action("world-search-input", phone).fill(query);
    const mobileResult = phone.locator(
      `.world-search-results [data-node="${RBC}"]`,
    );
    await mobileResult.waitFor({ state: "visible" });
    await phone.keyboard.press("Escape");
    assert.equal(await phone.locator('[role="dialog"]').count(), 0);
    await action("world-search", phone).click();
    await action("world-tab-journeys", phone).click();
    await phone
      .locator(
        '[role="dialog"] [data-action="world-open-mechanism"][data-mechanism="oxygen-transfer"]',
      )
      .click();
    await settle(HEMOGLOBIN, phone);
    await phone
      .locator('[data-action="world-mechanism-step"][data-step="1"]')
      .click();
    const teachingPanel = await phone
      .locator(".world-mechanism-panel")
      .boundingBox();
    const teachingCopy = await phone
      .locator(".world-mechanism-explanation p")
      .boundingBox();
    assert.ok(
      teachingCopy.y >= teachingPanel.y &&
        teachingCopy.y < teachingPanel.y + teachingPanel.height - 15,
      "The active phase explanation starts inside the touch reading panel",
    );
    assert.equal(
      await phone.locator(".world-mechanism-panel").getAttribute("data-phase"),
      "1",
    );
    const inlineDiagram = phone.locator(
      ".world-inline-mechanism .world-mechanism-visual",
    );
    assert.equal(
      await inlineDiagram.count(),
      1,
      "The touch/tablet diagram lives inside the reading panel",
    );
    assert.equal(
      await phone.locator(".world-atlas > .world-mechanism-visual").isVisible(),
      false,
      "No floating duplicate covers the reference",
    );
    const inlineSvg = inlineDiagram.locator("svg");
    await inlineSvg.scrollIntoViewIfNeeded();
    const svgBox = await inlineSvg.boundingBox();
    const referenceBox = await phone.locator(".world-scale").boundingBox();
    const overlaps =
      svgBox.x < referenceBox.x + referenceBox.width &&
      svgBox.x + svgBox.width > referenceBox.x &&
      svgBox.y < referenceBox.y + referenceBox.height &&
      svgBox.y + svgBox.height > referenceBox.y;
    assert.equal(
      overlaps,
      false,
      "The visible inline diagram never overlaps the permanent physical reference",
    );
    await phone.screenshot({
      path: artifact(
        `world-interface-mobile-mechanism-${viewport.width}x${viewport.height}.png`,
      ),
    });
    await action("world-close-mechanism", phone).click();
    await phone.close();
  }

  assert.deepEqual(
    errors,
    [],
    "The entire bilingual interface scenario has no uncaught errors",
  );
  console.log(
    `PASS [${locale}] World interface: search, sources, notebook, quiz, guided route, animated explanation, language preservation, modal/focus regressions and four touch/tablet layouts`,
  );
} finally {
  await browser.close();
}
