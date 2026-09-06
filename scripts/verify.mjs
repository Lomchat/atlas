import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
const base = process.env.ATLAS_URL || "http://127.0.0.1:3017";
const executable =
  process.env.CHROMIUM_PATH ||
  "/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome";
const b = await chromium.launch({
  ...(fs.existsSync(executable) ? { executablePath: executable } : {}),
  headless: true,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const context = await b.newContext({
  viewport: { width: 1280, height: 900 },
  reducedMotion: "reduce",
});
const p = await context.newPage();
const errors = [],
  badRequests = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
p.on("response", (r) => {
  if (r.status() >= 400 && r.url().startsWith(base))
    badRequests.push(`${r.status()} ${r.url()}`);
});
const settle = () => p.waitForTimeout(600);
const shot = (name) => p.screenshot({ path: `artifacts/test-${name}.png` });
async function open(path = "") {
  await p.goto(base + path, { waitUntil: "networkidle" });
  await p.locator("canvas").waitFor();
  await settle();
}
async function setExplode(n) {
  const range = p.getByRole("slider", { name: "Décomposer la matière" });
  await range.focus();
  await range.press(n === 100 ? "End" : "Home");
  await settle();
  assert.equal(await range.inputValue(), String(n));
}
async function labelPosition(id) {
  return p
    .locator(`[data-piece="${id}"]`)
    .evaluate((el) => ({
      x: Number(el.dataset.anchorX),
      y: Number(el.dataset.anchorY),
    }));
}
try {
  await open();
  assert.match(await p.title(), /Matière Atlas/);
  assert.equal(await p.locator(".constituent").count(), 3);
  await shot("desktop");
  const assembled = await labelPosition("atom-1");
  await setExplode(100);
  const apart = await labelPosition("atom-1");
  assert.ok(
    Math.hypot(apart.x - assembled.x, apart.y - assembled.y) > 20,
    "explosion moves atoms",
  );
  await shot("exploded");
  await p.getByRole("button", { name: "Réinitialiser", exact: true }).click();
  await settle();
  const oxygen = await labelPosition("atom-0");
  await p.mouse.click(oxygen.x, oxygen.y);
  await p.locator(".detail-panel h2").filter({ hasText: "Oxygène" }).waitFor();
  assert.equal(await p.locator(".detail-kicker").textContent(), "SÉLECTION");
  await p.getByRole("button", { name: "Isoler ce constituant" }).click();
  await settle();
  assert.equal(await p.locator(".atom-label:visible").count(), 1);
  await shot("isolated");
  await p.getByRole("button", { name: "Explorer cet atome" }).click();
  await settle();
  assert.ok(p.url().includes("level=atom"));
  assert.equal(await p.locator(".constituent").count(), 9);
  assert.match(
    await p.locator(".detail-title-row h2").textContent(),
    /Oxygène/,
  );
  await shot("atom");
  await p
    .getByRole("button", { name: "Entrer dans le noyau", exact: true })
    .click();
  await settle();
  assert.equal(await p.locator(".constituent").count(), 16);
  await setExplode(100);
  await shot("nucleus");
  await p.locator(".constituent").filter({ hasText: "Neutron 1" }).click();
  await p.getByRole("button", { name: "Voir les quarks" }).click();
  await settle();
  assert.ok(p.url().includes("nucleon=neutron"));
  assert.equal(
    await p.locator(".constituent").filter({ hasText: "Quark down" }).count(),
    2,
  );
  await shot("quarks");
  await p
    .getByRole("button", { name: "Découvrir les interactions", exact: true })
    .click();
  await settle();
  await shot("photon");
  await p
    .getByRole("button", { name: "Jouer la transition photonique" })
    .click();
  await p
    .getByRole("button", { name: "Mettre la transition en pause" })
    .waitFor();
  await p.waitForFunction(
    () =>
      document
        .querySelector(".photon-status")
        ?.textContent.includes("Atome excité"),
    {},
    { timeout: 45000 },
  );
  await shot("photon-excited");
  await p.waitForFunction(
    () =>
      document
        .querySelector(".photon-status")
        ?.textContent.includes("État fondamental"),
    {},
    { timeout: 45000 },
  );
  assert.equal(
    await p.getByRole("button", { name: "Rejouer la transition" }).count(),
    1,
  );
  await p.locator(".constituent").filter({ hasText: "Gluon" }).click();
  await settle();
  await shot("gluon");
  await p.locator(".constituent").filter({ hasText: "Higgs" }).click();
  await settle();
  await shot("higgs");
  await p.getByRole("button", { name: "Rechercher", exact: true }).click();
  await p
    .getByRole("textbox", { name: "Rechercher dans l’atlas" })
    .fill("méthane");
  await p.locator(".search-results button").click();
  await settle();
  assert.ok(p.url().includes("molecule=methane"));
  assert.equal(await p.locator(".constituent").count(), 5);
  await shot("methane");
  await p
    .getByRole("combobox", { name: "Choisir une molécule" })
    .selectOption("co2");
  await settle();
  assert.equal(await p.locator(".constituent").count(), 3);
  await p.getByRole("button", { name: "Passer en mode clair" }).click();
  await settle();
  assert.equal(await p.locator("html").getAttribute("data-theme"), "light");
  await shot("light-co2");
  await p.getByRole("switch", { name: "Annotations", exact: true }).click();
  await settle();
  assert.equal(await p.locator(".atom-label:visible").count(), 0);
  await p.getByRole("button", { name: "À propos de l’atlas" }).click();
  await p.getByRole("dialog").waitFor();
  await p.keyboard.press("Escape");
  assert.equal(await p.getByRole("dialog").count(), 0);
  await p.keyboard.press("1");
  await settle();
  // Invalid shared query values safely fall back to a valid model.
  await open("/?molecule=__proto__&element=constructor&level=unknown");
  assert.equal(await p.locator(".constituent").count(), 3);
  await p.getByRole("button", { name: "Passer en mode sombre" }).click();
  await settle();
  for (const [w, h] of [
    [390, 844],
    [320, 568],
    [844, 390],
  ]) {
    await p.setViewportSize({ width: w, height: h });
    await open();
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      "no horizontal overflow",
    );
    await shot(`${w}x${h}`);
    if (w < 768) {
      await p.getByRole("button", { name: "Ouvrir les échelles" }).click();
      await p
        .locator(".level-row")
        .filter({ has: p.locator("strong", { hasText: /^Atome$/ }) })
        .click();
      await settle();
      assert.ok(p.url().includes("level=atom"));
      await p.getByRole("button", { name: "Afficher les détails" }).click();
      await p.locator(".detail-panel.mobile-open").waitFor();
      await shot(`${w}-details`);
      await p
        .getByRole("button", { name: "Entrer dans le noyau", exact: true })
        .click();
      await settle();
      assert.ok(p.url().includes("level=nucleus"));
      await setExplode(100);
      await shot(`${w}-nucleus`);
    }
  }
  assert.deepEqual(errors, [], "no browser errors");
  assert.deepEqual(badRequests, [], "no failed app requests");
  console.log(
    "PASS: ray picking, explosion, isolation, all scales, photon timeline, search, molecule selection, theme, annotations, modal keyboard, invalid URL handling, desktop + 390/320 px mobile + landscape.",
  );
} catch (e) {
  await shot("failure");
  console.error(e);
  console.error({ errors, badRequests, url: p.url() });
  process.exitCode = 1;
} finally {
  await b.close();
}
