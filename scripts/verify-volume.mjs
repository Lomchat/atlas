import { laboratoryBase } from "./locale-fixture.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import {
  locale,
  browserLocale,
  artifact,
  assertLocale,
} from "./locale-fixture.mjs";
const base = laboratoryBase;
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
  hasTouch: true,
});
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const canvas = page.locator("canvas[data-scene-id]");
const data = () => canvas.evaluate((e) => ({ ...e.dataset }));
const ready = () =>
  page.waitForFunction(
    () =>
      document.querySelector("canvas[data-scene-id]")?.dataset.transitioning ===
      "false",
  );
async function open(query = "") {
  await page.goto(`${base}/?lang=${locale}&${query}`, {
    waitUntil: "networkidle",
  });
  await ready();
  await assertLocale(page);
}
fs.mkdirSync("artifacts", { recursive: true });
try {
  const sites = [];
  for (const x of [610, 720]) {
    await open();
    const identity = (await data()).sceneId;
    await page.mouse.move(x, 650);
    for (let i = 0; i < 65 && (await data()).scale !== "neighborhood"; i++) {
      await page.mouse.wheel(0, -650);
      await page.waitForTimeout(180);
    }
    for (
      let i = 0;
      i < 12 && Number((await data()).cameraDistance) > 160;
      i++
    ) {
      await page.mouse.wheel(0, -250);
      await page.waitForTimeout(180);
    }
    const result = await data();
    console.log(
      "free zoom",
      locale,
      x,
      result.site,
      result.scale,
      result.volumeMolecules,
    );
    assert.equal(result.scale, "neighborhood");
    assert.ok(
      Number(result.volumeMolecules) > 20,
      "Molecules populate the chosen region",
    );
    assert.notEqual(
      result.site,
      "0,0,0",
      "Zoom follows a non-central point in the liquid",
    );
    assert.equal(result.sceneId, identity);
    sites.push(result.site);
    await page.screenshot({ path: artifact(`volume-free-${x}.png`) });
  }
  assert.notEqual(
    sites[0],
    sites[1],
    "Different points in water lead to different molecular locations",
  );
  // Continue from the streamed region reached by wheel, not a fresh origin.
  let aimed;
  for (const candidate of JSON.parse((await data()).volumeTargets)) {
    await page.mouse.move(candidate.x, candidate.y);
    await page.waitForTimeout(90);
    const hover = await data();
    if (hover.hoverSite && /^atom-\d+$/.test(hover.hoverNode || "")) {
      aimed = { ...candidate, site: hover.hoverSite, node: hover.hoverNode };
      break;
    }
  }
  assert.ok(aimed, "Streamed molecules remain pickable far from the origin");
  await page.mouse.move(aimed.x, aimed.y);
  await page.mouse.wheel(0, -120);
  await page.waitForFunction(
    (site) =>
      document.querySelector("canvas[data-scene-id]")?.dataset.site === site,
    aimed.site,
  );
  const streamedScene = (await data()).sceneId;
  for (const node of [
    aimed.node,
    `${aimed.node}/nucleus`,
    `${aimed.node}/nucleus/proton-0`,
  ]) {
    const label = page.locator(`.atom-label[data-node="${node}"]`);
    for (
      let i = 0;
      i < 80 && Number(await label.getAttribute("data-open")) < 0.7;
      i++
    ) {
      const anchor = await label.evaluate((e) => ({
        x: Number(e.dataset.anchorX),
        y: Number(e.dataset.anchorY),
      }));
      const viewport = JSON.parse(
        await page
          .locator("canvas[data-scene-id]")
          .getAttribute("data-viewport"),
      );
      assert.ok(
        anchor.x > viewport.left &&
          anchor.x < viewport.right &&
          anchor.y > viewport.top &&
          anchor.y < viewport.bottom,
        "Target stays inside the exploration area",
      );
      await page.mouse.move(anchor.x, anchor.y);
      await page.mouse.wheel(0, -180);
      await page.waitForTimeout(150);
    }
    assert.ok(
      Number(await label.getAttribute("data-open")) >= 0.7,
      `Wheel reveals ${node}`,
    );
  }
  assert.ok(
    Number(
      await page
        .locator(`.atom-label[data-node="${aimed.node}/nucleus/proton-0/up-0"]`)
        .getAttribute("data-reveal"),
    ) > 0.45,
  );
  assert.equal((await data()).site, aimed.site);
  assert.equal((await data()).sceneId, streamedScene);
  assert.ok(
    Number((await data()).drawCalls) < 350,
    "Instancing keeps draw calls bounded",
  );
  await page.screenshot({ path: artifact("volume-wheel-quarks.png") });
  for (const molecule of ["water", "co2", "methane"]) {
    await open(`molecule=${molecule}&focus=neighborhood`);
    const identity = (await data()).sceneId;
    assert.ok(Number((await data()).volumeMolecules) > 20);
    const candidates = JSON.parse((await data()).volumeTargets);
    let picked;
    for (const candidate of candidates) {
      await page.mouse.move(candidate.x, candidate.y);
      await page.waitForTimeout(90);
      const hover = (await data()).hoverSite;
      if (hover && hover !== "0,0,0") {
        picked = { ...candidate, site: hover };
        break;
      }
    }
    assert.ok(picked, `${molecule}: a neighboring molecule is ray-pickable`);
    await page.mouse.click(picked.x, picked.y);
    await page.waitForFunction(
      (site) =>
        document.querySelector("canvas[data-scene-id]")?.dataset.site === site,
      picked.site,
    );
    await ready();
    assert.equal((await data()).site, picked.site);
    assert.equal(
      (await data()).sceneId,
      identity,
      "Picking a neighbor retains the renderer",
    );
    // Every selected molecule supports the complete inner hierarchy.
    for (
      let i = 0;
      i < 8 &&
      !(await data()).viewpoint.includes("/up-") &&
      !(await data()).viewpoint.includes("/down-");
      i++
    ) {
      const button = page.locator('.zoom-navigation [data-direction="in"]');
      const target = await button.getAttribute("data-target");
      await button.click();
      await page.waitForFunction((target) => {
        const c = document.querySelector("canvas[data-scene-id]");
        return (
          c?.dataset.viewpoint === target && c.dataset.transitioning === "false"
        );
      }, target);
    }
    // No surrounding nuclei or atoms survive inside the selected particle.
    const isolated = await data();
    assert.equal(isolated.volumeMolecules, "0");
    const allowed = JSON.parse(isolated.allowedNodes);
    const revealed = await page
      .locator(".atom-label")
      .evaluateAll((es) =>
        es.filter((e) => +e.dataset.reveal > 0.45).map((e) => e.dataset.node),
      );
    assert.deepEqual(revealed.sort(), allowed.sort());
    for (const id of revealed) {
      const particle = page.locator(`.atom-label[data-node="${id}"]`);
      assert.ok(
        (await particle.getAttribute("aria-label")).length > 5,
        "Every shown particle is identified and selectable",
      );
    }
    const leaf = await data();
    assert.match(leaf.viewpoint, /\/(up|down)-/);
    assert.equal(leaf.site, picked.site);
    await page.screenshot({ path: artifact(`volume-${molecule}-quark.png`) });
    const other = locale === "fr" ? "en" : "fr";
    await page.locator(`.identity [data-language-switch="${other}"]`).click();
    assert.equal((await data()).site, picked.site);
    assert.equal((await data()).cameraDistance, leaf.cameraDistance);
    await page.locator(`.identity [data-language-switch="${locale}"]`).click();
    assert.equal(new URL(page.url()).searchParams.get("site"), picked.site);
    const address = page.url();
    await page.reload({ waitUntil: "networkidle" });
    await ready();
    assert.equal(
      (await data()).site,
      picked.site,
      "Shared address restores the molecule",
    );
    assert.equal((await data()).viewpoint, leaf.viewpoint);
    assert.equal(page.url(), address);
    for (let i = 0; i < 8 && (await data()).viewpoint !== "sample"; i++) {
      const button = page.locator('.zoom-navigation [data-direction="out"]');
      const target = await button.getAttribute("data-target");
      await button.click();
      await page.waitForFunction((target) => {
        const c = document.querySelector("canvas[data-scene-id]");
        return (
          c?.dataset.viewpoint === target && c.dataset.transitioning === "false"
        );
      }, target);
    }
    assert.equal((await data()).viewpoint, "sample");
    assert.equal(
      (await data()).site,
      picked.site,
      "Returning to the vessel remembers the explored region",
    );
  }
  for (const [width, height] of [
    [390, 844],
    [320, 568],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await open("focus=neighborhood&site=20,-20,0");
    assert.ok(Number((await data()).volumeMolecules) > 10);
    await page.screenshot({ path: artifact(`volume-${width}.png`) });
    for (const language of ["fr", "en"]) {
      const box = await page
        .locator(`.identity [data-language-switch="${language}"]`)
        .boundingBox();
      assert.ok(
        box &&
          box.x >= 0 &&
          box.x + box.width <= width &&
          box.y >= 0 &&
          box.y + box.height <= height,
      );
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await open("focus=neighborhood&site=20,-20,0");
  const beforePinch = await data();
  const cdp = await page.context().newCDPSession(page);
  for (let i = 0; i <= 8; i++) {
    const distance = 20 + i * 8;
    await cdp.send("Input.dispatchTouchEvent", {
      type: i === 0 ? "touchStart" : "touchMove",
      touchPoints: [
        { id: 1, x: 177 - distance, y: 450 },
        { id: 2, x: 177 + distance, y: 450 },
      ],
    });
    await page.waitForTimeout(70);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForFunction(
    (distance) =>
      Number(
        document.querySelector("canvas[data-scene-id]")?.dataset.cameraDistance,
      ) <
      distance * 0.7,
    Number(beforePinch.cameraDistance),
  );
  assert.equal((await data()).sceneId, beforePinch.sceneId);
  await cdp.detach();
  await open("site=100000000000000000000,0,0");
  assert.equal((await data()).site, "0,0,0");
  assert.deepEqual(errors, []);
  console.log(
    `PASS ${locale}: arbitrary liquid locations, selectable neighboring molecules, all three materials to quarks, spatial persistence and language changes`,
  );
} finally {
  await browser.close();
}
