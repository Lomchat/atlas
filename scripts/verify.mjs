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
p.setDefaultTimeout(15000);
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
p.on("response", (r) => {
  if (r.url().startsWith(base) && r.status() >= 400)
    failures.push(`${r.status()} ${r.url()}`);
});
const shot = (name) =>
  p.screenshot({ path: `artifacts/continuum-${name}.png` });
const settle = () => p.waitForTimeout(500);
const label = (id) => p.locator(`.atom-label[data-node="${id}"]`);
const number = async (id, key) =>
  Number(await label(id).getAttribute(`data-${key}`));
const reveal = async (id, value) =>
  p.waitForFunction(
    ({ id, value }) =>
      Math.abs(
        Number(
          document
            .querySelector(`[data-node="${id}"]`)
            ?.getAttribute("data-reveal"),
        ) - value,
      ) < 0.01,
    { id, value },
  );
async function treePick(id) {
  await p.locator(`[data-tree-node="${id}"] .tree-name`).click();
  await settle();
}
try {
  await p.goto(base, { waitUntil: "networkidle" });
  await settle();
  const canvas = p.locator("canvas"),
    identity = await canvas.getAttribute("data-scene-id");
  assert.ok(identity);
  assert.equal(await canvas.getAttribute("data-visible-nodes"), "3");
  await shot("closed");
  // Open the actual atom by ray picking, without changing scene or canvas.
  const at = await label("atom-0").evaluate((el) => ({
    x: Number(el.dataset.anchorX),
    y: Number(el.dataset.anchorY),
  }));
  await p.mouse.click(at.x, at.y);
  await reveal("atom-0/nucleus", 1);
  assert.equal(await number("atom-0", "open"), 1);
  assert.equal(await number("atom-1", "open"), 0);
  await reveal("atom-1/nucleus", 0);
  await reveal("atom-0/nucleus/proton-0", 0);
  assert.equal(await canvas.getAttribute("data-scene-id"), identity);
  await shot("one-atom-open");
  const nucleus = "atom-0/nucleus",
    proton = nucleus + "/proton-0",
    q = proton + "/up-0";
  await label(nucleus).click();
  await reveal(proton, 1);
  await reveal(q, 0);
  await treePick(proton);
  await reveal(q, 1);
  await reveal(proton + "/up-1", 1);
  await reveal(proton + "/down-2", 1);
  await reveal(nucleus + "/proton-1/up-0", 0);
  assert.equal(await canvas.getAttribute("data-scene-id"), identity);
  await shot("one-proton-open");
  await p
    .getByRole("button", { name: "Approcher sans perdre le contexte" })
    .click();
  await p.waitForFunction(
    (id) => document.querySelector("canvas")?.getAttribute("data-focus") === id,
    proton,
  );
  assert.equal(await canvas.getAttribute("data-focus"), proton);
  await shot("focused-proton");
  assert.equal(await canvas.getAttribute("data-scene-id"), identity);
  assert.ok(
    (await p.locator(".breadcrumb").textContent()).includes("Proton 1"),
  );
  await reveal("atom-1", 1);
  // Collapsing the selected parent hides its descendants, not neighboring branches.
  await p.getByRole("button", { name: "Refermer ce constituant" }).click();
  await reveal(q, 0);
  await reveal(proton, 1);
  await reveal(nucleus + "/proton-1", 1);
  const slider = p.getByRole("slider", { name: "Déplier l’ensemble" });
  await slider.focus();
  await slider.press("End");
  await reveal(q, 1);
  await p.waitForFunction(
    () =>
      document.querySelector("canvas")?.getAttribute("data-visible-nodes") ===
      "88",
  );
  assert.equal(await canvas.getAttribute("data-scene-id"), identity);
  await shot("all-nested");
  await slider.press("Home");
  await p.waitForFunction(
    () =>
      document.querySelector("canvas")?.getAttribute("data-visible-nodes") ===
      "3",
  );
  await shot("reassembled");
  // A continuous scrub reveals the nucleus before its quarks, in the same model.
  const r = await slider.boundingBox();
  await slider.click({ position: { x: r.width * 0.5, y: r.height / 2 } });
  await reveal(nucleus, 1);
  assert.ok((await number(proton, "reveal")) < 0.3);
  await reveal(q, 0);
  assert.equal(await canvas.getAttribute("data-scene-id"), identity);
  await shot("mid-scrub");
  await p.getByRole("button", { name: "Rechercher", exact: true }).click();
  await p
    .getByRole("textbox", { name: "Rechercher un constituant" })
    .fill("électron 1");
  await p.locator(".search-results>button").first().click();
  await p.waitForFunction(
    () =>
      document.querySelector("canvas")?.getAttribute("data-focus") ===
      "atom-0/electron-0",
  );
  assert.equal(await canvas.getAttribute("data-focus"), "atom-0/electron-0");
  await reveal("atom-0/electron-0", 1);
  assert.equal(await canvas.getAttribute("data-scene-id"), identity);
  await p.getByRole("button", { name: "Envoyer un photon" }).click();
  await p.waitForFunction(
    () =>
      document
        .querySelector(".event-status")
        ?.textContent.includes("Énergie absorbée"),
    {},
    { timeout: 30000 },
  );
  await shot("photon");
  await p.waitForFunction(
    () =>
      document
        .querySelector(".event-status")
        ?.textContent.includes("Transition terminée"),
    {},
    { timeout: 30000 },
  );
  assert.equal(await canvas.getAttribute("data-scene-id"), identity);
  await p.getByRole("button", { name: "Mode clair", exact: true }).click();
  await settle();
  assert.equal(await canvas.getAttribute("data-scene-id"), identity);
  assert.equal(await p.locator("html").getAttribute("data-theme"), "light");
  await shot("light");
  await p.getByRole("button", { name: "Mode sombre", exact: true }).click();
  await p
    .getByRole("button", { name: "Revoir toute la molécule", exact: true })
    .first()
    .click();
  await p.getByRole("switch", { name: "Annotations", exact: true }).click();
  await settle();
  assert.equal(await p.locator(".atom-label:visible").count(), 0);
  await p.getByRole("button", { name: "Tout rassembler", exact: true }).click();
  await settle();
  assert.equal(await canvas.getAttribute("data-visible-nodes"), "3");
  assert.equal(await p.locator(".event-status").count(), 0);
  // Mobile opens branches directly without a detail sheet covering the model.
  for (const [width, height] of [
    [390, 844],
    [320, 568],
  ]) {
    await p.setViewportSize({ width, height });
    await p.goto(base, { waitUntil: "networkidle" });
    await settle();
    await shot(`${width}-closed`);
    await label("atom-0").click();
    await reveal(nucleus, 1);
    assert.equal(await p.locator(".detail-panel:visible").count(), 0);
    await shot(`${width}-open`);
    await p.getByRole("button", { name: "Afficher la composition" }).click();
    await p.locator(`[data-tree-node="${nucleus}"] .tree-name`).click();
    await reveal(proton, 1);
    assert.equal(await p.locator(".tree-panel:visible").count(), 0);
    await p.getByRole("button", { name: "Tout déplier" }).click();
    await reveal(q, 1);
    await shot(`${width}-all`);
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
  }
  await p.setViewportSize({ width: 1366, height: 960 });
  await p.goto(
    base +
      "/?depth=100&focus=atom-0%2Fnucleus%2Fproton-2&node=atom-0%2Fnucleus%2Fproton-2",
    { waitUntil: "networkidle" },
  );
  await settle();
  await shot("shared-focus");
  assert.equal(
    await p.locator("canvas").getAttribute("data-focus"),
    "atom-0/nucleus/proton-2",
  );
  await p
    .getByRole("combobox", { name: "Choisir une molécule" })
    .selectOption("co2");
  await settle();
  assert.equal(
    await p.locator("canvas").getAttribute("data-visible-nodes"),
    "3",
  );
  await p.getByRole("button", { name: "Tout déplier" }).click();
  await settle();
  assert.equal(
    await p.locator("canvas").getAttribute("data-visible-nodes"),
    "204",
  );
  await shot("co2");
  await p
    .getByRole("combobox", { name: "Choisir une molécule" })
    .selectOption("methane");
  await settle();
  assert.equal(
    await p.locator("canvas").getAttribute("data-visible-nodes"),
    "5",
  );
  await p.getByRole("button", { name: "Tout déplier" }).click();
  await settle();
  assert.equal(
    await p.locator("canvas").getAttribute("data-visible-nodes"),
    "84",
  );
  await shot("methane");
  await p.goto(
    base + "/?molecule=__proto__&depth=NaN&open=not-a-node&focus=constructor",
    { waitUntil: "networkidle" },
  );
  await settle();
  assert.equal(
    await p.locator("canvas").getAttribute("data-visible-nodes"),
    "3",
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  console.log(
    "PASS: persistent scene identity; local ray opening; atom/nucleus/nucleon/quark containment; independent branches; collapse; continuous global scrub; context-preserving focus; photon in same scene; theme in same scene; shared hierarchy; mobile direct opening; all molecule counts; no browser or request errors.",
  );
} catch (e) {
  await shot("failure");
  console.error(e);
  console.error({ errors, failures, url: p.url() });
  process.exitCode = 1;
} finally {
  await browser.close();
}
