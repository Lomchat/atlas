import assert from "node:assert/strict";
import { chromium } from "playwright";
import {
  locale,
  browserLocale,
  text,
  artifact,
  assertLocale,
} from "./locale-fixture.mjs";
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
page.on("pageerror", (e) => errors.push(e.message));
const canvas = page.locator("canvas[data-scene-id]");
const reference = page.locator(".size-reference");
const node = (id) => page.locator(`.atom-label[data-node="${id}"]`);
const ready = async (id) => {
  await page.waitForFunction((id) => {
    const c = document.querySelector("canvas[data-scene-id]");
    return c?.dataset.viewpoint === id && c.dataset.transitioning === "false";
  }, id);
  await page.waitForTimeout(200);
};
const navigate = async (direction, id) => {
  await page
    .locator(`.zoom-navigation [data-direction="${direction}"]`)
    .click();
  await ready(id);
};
const number = async (locator, key) =>
  Number(await locator.getAttribute("data-" + key));
async function rulerMatchesProjection() {
  const mpp = await number(reference, "meters-per-pixel");
  assert.ok(mpp > 0 && Number.isFinite(mpp));
  const ruler = reference.locator("[data-ruler-meters]");
  const meters = await number(ruler, "ruler-meters");
  const pixels = await ruler.evaluate(
    (e) => e.querySelector("path").getBBox().width * e.getScreenCTM().a,
  );
  assert.ok(
    Math.abs((pixels * mpp) / meters - 1) < 1e-6,
    "Rendered ruler pixels match physical length, without responsive CSS scaling",
  );
  const art = reference.locator(".reference-art");
  assert.ok(
    Math.abs((await art.evaluate((e) => e.getScreenCTM().a)) - 1) < 1e-6,
    "Comparison graphic uses CSS pixels one-to-one",
  );
  const width = await number(art, "object-pixels");
  assert.ok(
    Math.abs(
      (width * mpp) / (await number(reference, "reference-meters")) - 1,
    ) < 1e-6,
  );
  const box = await reference.boundingBox();
  const vp = page.viewportSize();
  assert.ok(
    box.x >= 0 &&
      box.x + box.width <= vp.width + 1 &&
      box.y >= 0 &&
      box.y < vp.height / 2 &&
      box.y + box.height < vp.height - 100,
    `Reference stays visible in upper viewport: ${JSON.stringify({ box, vp })}`,
  );
  assert.ok(
    await reference.locator("summary").evaluate((e) => {
      const r = e.getBoundingClientRect();
      return e.contains(
        document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
      );
    }),
    "Scale explanation stays reachable",
  );
}
try {
  for (const molecule of ["water", "co2", "methane"]) {
    await page.goto(
      `${base}/?lang=${locale}&molecule=${molecule}&focus=molecule`,
      { waitUntil: "networkidle" },
    );
    await assertLocale(page);
    await ready("molecule");
    const id = await canvas.getAttribute("data-scene-id");
    const atoms = await page
      .locator('.atom-label[data-node^="atom-"]')
      .evaluateAll((es) =>
        Object.fromEntries(
          es.map((e) => [e.dataset.node, Number(e.dataset.radiusMeters)]),
        ),
      );
    const atomRadius = atoms["atom-0"],
      nucleusRadius = atoms["atom-0/nucleus"];
    assert.ok(
      atomRadius / nucleusRadius > 10000,
      "Nucleus is physically thousands of times smaller than its atom",
    );
    assert.ok(atomRadius > 30e-12 && atomRadius < 80e-12);
    assert.ok(nucleusRadius > 2e-15 && nucleusRadius < 4e-15);
    const measurements = [];
    for (const target of [
      "atom-0",
      "atom-0/nucleus",
      "atom-0/nucleus/proton-0",
      "atom-0/nucleus/proton-0/up-0",
    ]) {
      await navigate("in", target);
      await rulerMatchesProjection();
      for (const key of ["atom-0", "atom-0/nucleus", "atom-0/nucleus/proton-0"])
        assert.equal(
          await number(node(key), "radius-meters"),
          atoms[key],
          "Opening never changes physical radius",
        );
      measurements.push(await number(reference, "meters-per-pixel"));
      await page.waitForFunction((target) => {
        const label = document.querySelector(
          `.atom-label[data-node="${target}"]`,
        );
        const ref = document.querySelector(".size-reference");
        return (
          Math.abs(
            (Number(label.dataset.screenSize) *
              Number(ref.dataset.metersPerPixel)) /
              (2 * Number(label.dataset.radiusMeters)) -
              1,
          ) < 0.025
        );
      }, target);
      const mpp = await number(reference, "meters-per-pixel");
      const radius = await number(node(target), "radius-meters");
      const diameterPixels = await number(node(target), "screen-size");
      assert.ok(
        Math.abs((diameterPixels * mpp) / (2 * radius) - 1) < 0.025,
        `Ruler agrees with projected object diameter at target depth: ${molecule} ${target} ratio=${(diameterPixels * mpp) / (2 * radius)}, mpp=${mpp}, px=${diameterPixels}`,
      );
      if (target === "atom-0/nucleus") {
        const containment = await page
          .locator(".atom-label")
          .evaluateAll((es) =>
            es
              .filter((e) =>
                /^atom-0\/nucleus\/(proton|neutron)-\d+$/.test(e.dataset.node),
              )
              .map(
                (e) =>
                  Number(e.dataset.parentDistance) + Number(e.dataset.radius),
              ),
          );
        const parentRadius = await number(node(target), "radius");
        assert.ok(
          containment.every((extent) => extent <= parentRadius * 1.000001),
          "Every nucleon stays inside the nucleus envelope",
        );
        await page.screenshot({
          path: artifact(`size-${molecule}-nucleus.png`),
        });
      }
    }
    assert.ok(
      measurements[0] / measurements[1] > 10000,
      "Camera crosses the real atom-to-nucleus size gap",
    );
    assert.ok(
      await reference
        .innerText()
        .then((s) =>
          s.includes(text("Particle marker · no measured diameter")),
        ),
    );
    assert.equal(await canvas.getAttribute("data-scene-id"), id);
    for (const target of [
      "atom-0/nucleus/proton-0",
      "atom-0/nucleus",
      "atom-0",
      "molecule",
    ])
      await navigate("out", target);
  }
  // Familiar references change continuously between named viewpoints.
  await page.goto(`${base}/?lang=${locale}`, { waitUntil: "networkidle" });
  await ready("sample");
  await page.mouse.move(660, 650);
  for (
    let i = 0;
    i < 50 && (await reference.getAttribute("data-reference")) !== "hair";
    i++
  ) {
    await page.mouse.wheel(0, -500);
    await page.waitForTimeout(120);
  }
  assert.equal(await reference.getAttribute("data-reference"), "hair");
  await rulerMatchesProjection();
  await page.screenshot({ path: artifact("size-hair.png") });
  // Same physical neighborhood at two distant cells: floating origin must preserve small dimensions.
  await page.goto(
    `${base}/?lang=${locale}&focus=atom-0/nucleus&site=60000000,-50000000,0`,
    { waitUntil: "networkidle" },
  );
  await ready("atom-0/nucleus");
  assert.equal(await canvas.getAttribute("data-site"), "60000000,-50000000,0");
  await rulerMatchesProjection();
  await page.reload({ waitUntil: "networkidle" });
  await ready("atom-0/nucleus");
  assert.equal(await canvas.getAttribute("data-site"), "60000000,-50000000,0");
  // Continuous wheel updates the reference even without a change of named level.
  const before = await number(reference, "meters-per-pixel");
  const anchor = await node("atom-0/nucleus").evaluate((e) => ({
    x: +e.dataset.anchorX,
    y: +e.dataset.anchorY,
  }));
  await page.mouse.move(anchor.x, anchor.y);
  await page.mouse.wheel(0, -80);
  await page.waitForFunction(
    (before) =>
      Number(document.querySelector(".size-reference").dataset.metersPerPixel) <
      before,
    before,
  );
  assert.ok((await number(reference, "meters-per-pixel")) < before);
  await rulerMatchesProjection();
  for (const [width, height] of [
    [390, 844],
    [320, 568],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${base}/?lang=${locale}&focus=atom-0/nucleus`, {
      waitUntil: "networkidle",
    });
    await ready("atom-0/nucleus");
    await rulerMatchesProjection();
    assert.ok(
      await page
        .getByRole("button", {
          name: text("Return to the whole object"),
          exact: true,
        })
        .evaluate((e) => {
          const r = e.getBoundingClientRect();
          return e.contains(
            document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
          );
        }),
      "The size reference does not cover the camera tools",
    );
    await page.locator(".context-interaction").click();
    await ready("atom-0/nucleus");
    await rulerMatchesProjection();
    if (width >= 768 && height < 520) {
      const panel = await page.locator(".lesson-panel").boundingBox();
      const refBox = await reference.boundingBox();
      assert.ok(
        refBox.x + refBox.width < panel.x,
        "Landscape reference and lesson occupy separate columns",
      );
      for (const direction of ["in", "out"])
        assert.ok(
          await page
            .locator(`.zoom-navigation [data-direction="${direction}"]`)
            .evaluate((e) => {
              const r = e.getBoundingClientRect();
              return e.contains(
                document.elementFromPoint(
                  r.x + r.width / 2,
                  r.y + r.height / 2,
                ),
              );
            }),
          "Both zoom buttons stay reachable beside the lesson",
        );
    }
    await page.screenshot({ path: artifact(`size-lesson-${width}.png`) });
    await page.getByRole("button", { name: text("Close explanation") }).click();
    await reference.locator("summary").click();
    assert.ok(
      (await reference.locator("details").getAttribute("open")) !== null,
    );
    assert.ok(
      (await reference.innerText()).includes(text("Nuclear dimensions")),
    );
    await reference.locator("summary").click();
  }
  assert.deepEqual(errors, []);
  console.log(
    `PASS ${locale}: SI projection, fixed radii, nuclear containment, real scale gaps, floating origin, responsive references and lessons`,
  );
} finally {
  await browser.close();
}
