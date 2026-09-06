import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
const base = process.env.ATLAS_URL || "http://127.0.0.1:3017";
const executable =
  process.env.CHROMIUM_PATH ||
  "/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";
const browser = await chromium.launch({
  ...(fs.existsSync(executable) ? { executablePath: executable } : {}),
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const context = await browser.newContext({
    viewport: { width: 1366, height: 960 },
    reducedMotion: "reduce",
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
const label = (id) => p.locator(`.atom-label[data-node="${id}"]`);
const shot = (name) => p.screenshot({ path: `artifacts/adaptive-${name}.png` });
const settle = () => p.waitForTimeout(650);
const value = async (id, key) =>
  Number(await label(id).getAttribute(`data-${key}`));
const reveal = (id, wanted) =>
  p.waitForFunction(
    ({ id, wanted }) =>
      Math.abs(
        Number(
          document.querySelector(`.atom-label[data-node="${id}"]`)?.dataset
            .reveal,
        ) - wanted,
      ) < 0.01,
    { id, wanted },
  );
const countIs = (n) =>
  p.waitForFunction(
    (n) => Number(document.querySelector("canvas")?.dataset.visibleNodes) === n,
    n,
  );
async function zoom(n) {
  for (let i = 0; i < Math.abs(n); i++) {
    await p
      .getByRole("button", { name: n > 0 ? "Zoomer" : "Dézoomer", exact: true })
      .click();
    await p.waitForTimeout(100);
  }
  await settle();
}
async function search(text) {
  await p.getByRole("button", { name: "Rechercher", exact: true }).click();
  await p
    .getByRole("textbox", { name: "Rechercher un constituant" })
    .fill(text);
  await p.locator(".search-results>button").first().click();
  await settle();
}
async function reset() {
  await p.getByRole("button", { name: "Tout rassembler", exact: true }).click();
  await countIs(3);
  await settle();
}
try {
  await p.goto(base, { waitUntil: "networkidle" });
  await countIs(3);
  await settle();
  const canvas = p.locator("canvas"),
    identity = await canvas.getAttribute("data-scene-id");
  assert.ok(identity);
  await shot("atoms");
  // Zoom alone opens the hierarchy; reversing the same movement restores shells.
  await zoom(4);
  await reveal(nucleus, 1);
  await reveal(quark, 0);
  assert.ok((await value(atom, "open")) > 0.5);
  await shot("zoom-nucleus");
  await zoom(5);
  await p.waitForFunction(() =>
    [...document.querySelectorAll('.atom-label[data-node*="/up-"]')].some(
      (e) => Number(e.dataset.reveal) > 0.5,
    ),
  );
  assert.equal(
    await p.getByRole("slider", { name: "Déplier l’ensemble" }).inputValue(),
    "0",
  );
  assert.equal(await canvas.getAttribute("data-scene-id"), identity);
  await shot("zoom-quarks");
  await zoom(-9);
  await countIs(3);
  await reveal(nucleus, 0);
  await reveal(quark, 0);
  await shot("zoom-back");
  // Real wheel gestures also reveal details without a scene or page change.
  const at = await label(atom).evaluate((e) => ({
    x: Number(e.dataset.anchorX),
    y: Number(e.dataset.anchorY),
  }));
  await p.mouse.move(at.x, at.y);
  for (let i = 0; i < 8; i++) {
    await p.mouse.wheel(0, -450);
    await p.waitForTimeout(100);
  }
  await reveal(nucleus, 1);
  assert.equal(await canvas.getAttribute("data-scene-id"), identity);
  await shot("wheel");
  await reset();
  // Explicit opening remains independent, and an unreadably small branch is approached.
  const point = await label(atom).evaluate((e) => ({
    x: Number(e.dataset.anchorX),
    y: Number(e.dataset.anchorY),
  }));
  await p.mouse.click(point.x, point.y);
  await reveal(nucleus, 1);
  await reveal("atom-1/nucleus", 0);
  await reveal(quark, 0);
  await settle();
  await label(nucleus).click();
  await reveal(proton, 1);
  await settle();
  await p.locator(`[data-tree-node="${proton}"] .tree-name`).click();
  await reveal(quark, 1);
  await settle();
  assert.equal(await canvas.getAttribute("data-focus"), proton);
  assert.ok(
    (await p.locator(".breadcrumb").textContent()).includes("Proton 1"),
  );
  assert.equal(await canvas.getAttribute("data-scene-id"), identity);
  await shot("branch-quarks");
  await p.getByRole("button", { name: "Refermer ce constituant" }).click();
  await reveal(quark, 0);
  await reveal(proton, 1);
  await reset();
  // Full expansion is an intent, not permission to draw microscopic quarks everywhere.
  await p.getByRole("button", { name: "Tout déplier", exact: true }).click();
  await settle();
  await reveal(quark, 0);
  assert.equal(await p.locator(".atom-label").count(), 88);
  assert.ok(Number(await canvas.getAttribute("data-visible-nodes")) < 88);
  await shot("expanded-overview");
  await search("proton 1");
  await reveal(quark, 1);
  await shot("expanded-close");
  await zoom(-12);
  await reveal(quark, 0);
  assert.equal(
    await p.getByRole("slider", { name: "Déplier l’ensemble" }).inputValue(),
    "100",
  );
  await shot("expanded-far");
  await p
    .getByRole("button", { name: "Approcher sans perdre le contexte" })
    .click();
  await reveal(quark, 1);
  // Search, photons, theme and display options still use the same scene.
  await search("électron 1");
  await reveal("atom-0/electron-0", 1);
  await p.getByRole("button", { name: "Envoyer un photon" }).click();
  await p.waitForFunction(
    () =>
      document
        .querySelector(".event-status")
        ?.textContent.includes("Énergie absorbée"),
    null,
    { timeout: 30000 },
  );
  await p.waitForFunction(
    () =>
      document
        .querySelector(".event-status")
        ?.textContent.includes("Transition terminée"),
    null,
    { timeout: 30000 },
  );
  await p.getByRole("button", { name: "Mode clair", exact: true }).click();
  await settle();
  assert.equal(await p.locator("html").getAttribute("data-theme"), "light");
  await shot("light");
  assert.equal(await canvas.getAttribute("data-scene-id"), identity);
  await p.getByRole("switch", { name: "Annotations", exact: true }).click();
  await settle();
  assert.equal(await p.locator(".atom-label:visible").count(), 0);
  await p.getByRole("button", { name: "Mode sombre", exact: true }).click();
  await reset();
  assert.equal(await p.locator(".event-status").count(), 0);
  // Mobile thresholds scale with the available scene, not the desktop pixel width.
  for (const [width, height] of [
    [390, 844],
    [320, 568],
  ]) {
    await p.setViewportSize({ width, height });
    await p.goto(base, { waitUntil: "networkidle" });
    await countIs(3);
    await settle();
    await zoom(5);
    await reveal(nucleus, 1);
    assert.equal(await p.locator(".detail-panel:visible").count(), 0);
    await shot(`${width}-zoom`);
    await zoom(-5);
    await countIs(3);
    await p.getByRole("button", { name: "Tout déplier", exact: true }).click();
    await settle();
    await reveal(quark, 0);
    await p.getByRole("button", { name: "Afficher la composition" }).click();
    await p.locator(`[data-tree-node="${proton}"] .tree-name`).click();
    await reveal(quark, 1);
    await settle();
    assert.equal(await p.locator(".tree-panel:visible").count(), 0);
    await shot(`${width}-quarks`);
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  await p.setViewportSize({ width: 1366, height: 960 });
  await p.goto(
    base +
      "/?depth=100&focus=atom-0%2Fnucleus%2Fproton-0&node=atom-0%2Fnucleus%2Fproton-0",
    { waitUntil: "networkidle" },
  );
  await reveal(quark, 1);
  for (const [molecule, total, atoms] of [
    ["co2", 204, 3],
    ["methane", 84, 5],
  ]) {
    await p
      .getByRole("combobox", { name: "Choisir une molécule" })
      .selectOption(molecule);
    await countIs(atoms);
    assert.equal(await p.locator(".atom-label").count(), total);
    await p.getByRole("button", { name: "Tout déplier", exact: true }).click();
    await settle();
    assert.ok(
      Number(await p.locator("canvas").getAttribute("data-visible-nodes")) <
        total,
    );
    await reveal(quark, 0);
    await shot(molecule);
  }
  await p.goto(
    base + "/?molecule=__proto__&depth=NaN&open=not-a-node&focus=constructor",
    { waitUntil: "networkidle" },
  );
  await countIs(3);
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  console.log(
    "PASS: zoom-driven layers and reverse collapse; real wheel navigation; size-gated full expansion; close/far focused branches; real ray picking; independent manual opening; same canvas; photon; search; theme; mobile adaptive detail; shared links; molecule composition totals; no browser/request errors.",
  );
} catch (e) {
  await shot("failure");
  console.error(e);
  console.error({ errors, failures, url: p.url() });
  process.exitCode = 1;
} finally {
  await browser.close();
}
