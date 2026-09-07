import {
  locale,
  browserLocale,
  text,
  stepName,
  artifact,
  assertLocale,
} from "./locale-fixture.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
const base = process.env.ATLAS_URL || "http://127.0.0.1:3017",
  executable =
    process.env.CHROMIUM_PATH ||
    "/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";
const b = await chromium.launch({
  ...(fs.existsSync(executable) ? { executablePath: executable } : {}),
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const context = await b.newContext({
    locale: browserLocale,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    hasTouch: true,
  }),
  p = await context.newPage(),
  errors = [],
  failures = [];
p.setDefaultTimeout(20000);
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
p.on("response", (r) => {
  if (r.url().startsWith(base) && r.status() >= 400)
    failures.push(`${r.status()} ${r.url()}`);
});
const atom = "atom-0",
  nucleus = atom + "/nucleus",
  proton = nucleus + "/proton-0",
  quark = proton + "/up-0";
const nav = (d) => p.locator(`.zoom-navigation [data-direction="${d}"]`),
  label = (id) => p.locator(`.atom-label[data-node="${id}"]`),
  settle = () => p.waitForTimeout(650),
  shot = (name) => p.screenshot({ path: artifact(`navigation-${name}.png`) });
const view = (id) =>
  p.waitForFunction(
    (id) =>
      document.querySelector("canvas[data-scene-id]")?.dataset.viewpoint === id,
    id,
  );
const reveal = (id, v) =>
  p.waitForFunction(
    ({ id, v }) =>
      Math.abs(
        Number(
          document.querySelector(`.atom-label[data-node="${id}"]`)?.dataset
            .reveal,
        ) - v,
      ) < 0.02,
    { id, v },
  );
const anchor = (id) =>
  label(id).evaluate((e) => ({
    x: Number(e.dataset.anchorX),
    y: Number(e.dataset.anchorY),
  }));
async function ready() {
  await p.waitForFunction(() =>
    document.querySelector(".zoom-navigation button:not(:disabled)"),
  );
  await settle();
}
async function move(direction, target) {
  assert.equal(await nav(direction).getAttribute("data-target"), target);
  assert.ok(
    (await nav(direction).getAttribute("aria-label")).startsWith(
      text(direction === "in" ? "Zoom in to {name}" : "Zoom out to {name}", {
        name: "",
      }),
    ),
  );
  await nav(direction).click();
  await view(target);
  await ready();
  assert.equal(
    await p.locator("canvas[data-scene-id]").getAttribute("data-viewpoint"),
    target,
  );
}
async function home() {
  await p
    .getByRole("button", {
      name: text("Return to the whole object"),
      exact: true,
    })
    .click();
  await view("sample");
  for (const target of ["portion", "neighborhood", "molecule"])
    await move("in", target);
  await ready();
}
async function search(term) {
  await p.getByRole("button", { name: text("Search"), exact: true }).click();
  await p
    .getByRole("textbox", { name: text("Search for a constituent") })
    .fill(term);
  await p.locator(".search-results>button").first().click();
  await ready();
}
try {
  await p.goto(base + "/?focus=molecule", { waitUntil: "networkidle" });
  await assertLocale(p);
  await view("molecule");
  await ready();
  const identity = await p
    .locator("canvas[data-scene-id]")
    .getAttribute("data-scene-id");
  assert.equal(await p.getByRole("slider").count(), 0);
  assert.equal(await p.locator(".bottom-dock").count(), 0);
  assert.equal(await p.locator(".zoom-navigation button").count(), 2);
  assert.equal(await nav("out").isDisabled(), false);
  await shot("overview");
  for (const id of [atom, nucleus, proton, quark]) {
    await move("in", id);
    const pos = await anchor(id);
    assert.ok(
      pos.x > 300 && pos.x < 1115 && pos.y > 260 && pos.y < 905,
      "destination centered in unobstructed scene",
    );
    assert.equal(
      await p.locator("canvas[data-scene-id]").getAttribute("data-scene-id"),
      identity,
    );
    if (id === atom) {
      await reveal(nucleus, 1);
      await reveal(proton, 0);
    }
    if (id === nucleus) {
      await reveal(proton, 1);
      await reveal(quark, 0);
      assert.ok(
        (await p.locator(".atom-label:visible").count()) <= 16,
        "Every nucleon has an identifiable compact annotation",
      );
    }
    if (id === proton) {
      await reveal(quark, 1);
      // Fixed dimensions persist even while surrounding nucleons are hidden.
      await reveal(nucleus + "/proton-1", 0);
      assert.equal(
        await label(nucleus + "/proton-1").getAttribute("data-radius-meters"),
        await label(proton).getAttribute("data-radius-meters"),
      );
      assert.equal(await nav("in").getAttribute("data-target"), quark);
    }
    await shot(id.split("/").at(-1));
  }
  assert.equal(await nav("in").isDisabled(), true);
  assert.ok(
    (await nav("in").innerText()).includes(text("ELEMENTARY PARTICLE")),
  );
  for (const id of [proton, nucleus, atom, "molecule"]) await move("out", id);
  assert.equal(await nav("out").isDisabled(), false);
  assert.equal(
    await p.locator("canvas[data-scene-id]").getAttribute("data-visible-nodes"),
    "3",
  );
  // A pointed sibling remains the named destination after moving to the button.
  await label("atom-1").hover();
  await p.waitForFunction(
    () =>
      document.querySelector('[data-direction="in"]').dataset.target ===
      "atom-1",
  );
  await nav("in").hover();
  await settle();
  assert.equal(await nav("in").getAttribute("data-target"), "atom-1");
  await move("in", "atom-1");
  await move("in", "atom-1/nucleus");
  await reveal("atom-1/nucleus/proton-0", 1);
  await reveal("atom-0/nucleus", 0);
  assert.equal(
    await nav("out").getAttribute("data-target"),
    "atom-1",
    "Only the entered atom is visible, with its exact parent preserved",
  );
  await home();
  // Ray picking reaches the exact atom, and orbiting keeps its camera target centered.
  const at = await anchor(atom);
  await p.mouse.click(at.x, at.y);
  await view(atom);
  await ready();
  const before = await anchor(atom);
  await p.mouse.move(975, 700);
  await p.mouse.down();
  await p.mouse.move(1030, 750, { steps: 12 });
  await p.mouse.up();
  await settle();
  const after = await anchor(atom);
  assert.ok(Math.hypot(before.x - after.x, before.y - after.y) < 3);
  await reveal(nucleus, 1);
  await reveal(proton, 0);
  await home();
  // Real wheel navigation follows the pointed branch and reverses to its outer shells.
  const pos = await anchor(atom);
  await p.mouse.move(pos.x, pos.y);
  for (let i = 0; i < 12; i++) {
    await p.mouse.wheel(0, -220);
    await p.waitForTimeout(160);
    if (
      (await p
        .locator("canvas[data-scene-id]")
        .getAttribute("data-viewpoint")) === atom
    )
      break;
  }
  await settle();
  assert.ok(
    (
      await p.locator("canvas[data-scene-id]").getAttribute("data-viewpoint")
    ).startsWith(atom),
  );
  await reveal(nucleus, 1);
  await shot("wheel");
  for (let i = 0; i < 10; i++) {
    await p.mouse.wheel(0, 500);
    await p.waitForTimeout(130);
  }
  await p.waitForFunction(
    () =>
      !document
        .querySelector("canvas[data-scene-id]")
        ?.dataset.viewpoint?.startsWith("atom-"),
  );
  await reveal(nucleus, 0);
  await home();
  // Search, photon exchange, themes and the graph all remain in the same renderer.
  await search(text("Electron {number}", { number: 1 }).toLowerCase());
  await view("atom-0/electron-0");
  assert.equal(await nav("in").isDisabled(), true);
  await p.getByRole("button", { name: text("Understand the photon") }).click();
  await view(atom);
  await p.getByRole("button", { name: stepName(2) }).click();
  await p.getByRole("button", { name: stepName(3) }).click();
  await p.getByRole("button", { name: text("Close explanation") }).click();
  await p
    .getByRole("button", { name: text("Light mode"), exact: true })
    .click();
  await settle();
  assert.equal(await p.locator("html").getAttribute("data-theme"), "light");
  assert.equal(
    await p.locator("canvas[data-scene-id]").getAttribute("data-scene-id"),
    identity,
  );
  await shot("light");
  await p.getByRole("button", { name: text("Dark mode"), exact: true }).click();
  await p
    .getByRole("switch", { name: text("Annotations"), exact: true })
    .click();
  await settle();
  assert.equal(await p.locator(".atom-label:visible").count(), 0);
  await p.keyboard.press("r");
  await view("sample");
  await home();
  await ready();
  for (const [width, height] of [
    [390, 844],
    [320, 568],
    [844, 390],
  ]) {
    await p.setViewportSize({ width, height });
    await p.goto(base + "/?focus=molecule", { waitUntil: "networkidle" });
    await view("molecule");
    await ready();
    const box = await p.locator(".zoom-navigation").boundingBox();
    assert.ok(
      box.x >= 0 &&
        box.x + box.width <= width &&
        box.y + box.height < height - 200,
    );
    for (const id of [atom, nucleus, proton, quark]) await move("in", id);
    assert.equal(await nav("in").isDisabled(), true);
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await shot(`${width}-leaf`);
    for (const id of [proton, nucleus, atom, "molecule"]) await move("out", id);
    if (width < 768) {
      await p.getByRole("button", { name: text("Show composition") }).click();
      await p.locator('[data-tree-node="atom-1"] .tree-name').click();
      await view("atom-1");
      await ready();
      assert.equal(await p.locator(".tree-panel:visible").count(), 0);
      await home();
    }
  }
  // Pinching toward a hydrogen atom must use that branch, not the default oxygen.
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto(base + "/?focus=molecule", { waitUntil: "networkidle" });
  await ready();
  const h = await anchor("atom-1"),
    cdp = await context.newCDPSession(p);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: h.x - 5, y: h.y, id: 1 },
      { x: h.x + 5, y: h.y, id: 2 },
    ],
  });
  for (let i = 1; i <= 8; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: h.x - 5 - i * 5, y: h.y, id: 1 },
        { x: h.x + 5 + i * 5, y: h.y, id: 2 },
      ],
    });
    await p.waitForTimeout(100);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await settle();
  await reveal("atom-1/nucleus", 1);
  assert.ok(
    (
      await p.locator("canvas[data-scene-id]").getAttribute("data-viewpoint")
    ).startsWith("atom-1"),
  );
  await shot("pinch-hydrogen");
  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.goto(
    base +
      "/?focus=atom-0%2Fnucleus%2Fproton-0&node=atom-0%2Fnucleus%2Fproton-0",
    { waitUntil: "networkidle" },
  );
  await view(proton);
  await ready();
  await reveal(quark, 1);
  for (const [molecule, total, atoms] of [
    ["co2", 204, 3],
    ["methane", 84, 5],
  ]) {
    await p.getByRole("button", { name: text("Choose a molecule") }).click();
    await p.locator(`[data-molecule-choice="${molecule}"]`).click();
    await p.locator("[data-molecule-enter]").click();
    await view("sample");
    await home();
    await ready();
    assert.equal(await p.locator(".atom-label").count(), total);
    assert.equal(
      await p
        .locator("canvas[data-scene-id]")
        .getAttribute("data-visible-nodes"),
      String(atoms),
    );
    await move("in", atom);
    await shot(molecule);
  }
  await p.goto(
    base + "/?molecule=__proto__&depth=100&open=atom-0&focus=constructor",
    { waitUntil: "networkidle" },
  );
  await view("sample");
  await home();
  await ready();
  assert.equal(
    await p.locator("canvas[data-scene-id]").getAttribute("data-visible-nodes"),
    "3",
  );
  assert.equal(await p.getByRole("slider").count(), 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  console.log(
    "PASS: two named destinations; exact ancestor/child chain; end states; stable pointed choices; centered targets and orbit; wheel reversal; mobile/landscape navigation; hydrogen pinch targeting; no gauge; search/photon/theme/share; all molecules; persistent renderer; no browser/request errors.",
  );
} catch (e) {
  await shot("failure");
  console.error(e);
  console.error({ url: p.url(), errors, failures });
  process.exitCode = 1;
} finally {
  await b.close();
}
