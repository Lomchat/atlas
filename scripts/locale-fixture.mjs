import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";

export const locale = process.env.ATLAS_LOCALE;
assert.ok(
  ["en", "fr"].includes(locale),
  "Run tests through npm test or npm run test:<suite>; both languages are required.",
);
export const other = locale === "fr" ? "en" : "fr";
export const browserLocale = locale === "fr" ? "fr-FR" : "en-GB";
export const base = (process.env.ATLAS_URL || "http://127.0.0.1:3017").replace(/\/$/, "");

const catalogs = Object.fromEntries(
  ["en", "fr"].map((code) => [
    code,
    JSON.parse(fs.readFileSync(new URL(`../src/locales/${code}.json`, import.meta.url))),
  ]),
);

/** A UI message in the scenario's language (or `language`). */
export function text(key, params = {}, language = locale) {
  const catalog = catalogs[language];
  assert.ok(Object.hasOwn(catalog, key), `Missing ${language} test label: ${key}`);
  return catalog[key].replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.hasOwn(params, name) ? String(params[name]) : placeholder,
  );
}

/** A bilingual registry value in the scenario's language (or `language`). */
export const tr = (bilingual, language = locale) => bilingual[language];

/** The level registry, loaded straight from the TypeScript sources. */
export const levels = await import("../src/levels/index.ts");

export const artifact = (name) => {
  fs.mkdirSync("artifacts", { recursive: true });
  return `artifacts/${locale}-${name}`;
};

export async function assertLocale(page, language = locale) {
  assert.equal(
    await page.locator("html").getAttribute("lang"),
    language,
    "Scenario must actually run in its assigned language",
  );
}

export const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Software WebGL browser shared by the suites. */
export function launch() {
  return chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      "/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
    args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
}

/** The main 3D view. */
export const scene = (page) => page.locator("canvas[data-atlas-scene]");

/** Wait until the view rests on `id` with every visible scene built. */
export async function settledOn(page, id, timeout = 30000) {
  await page.waitForFunction(
    (expected) => {
      const canvas = document.querySelector("canvas[data-atlas-scene]");
      return (
        canvas?.dataset.level === expected &&
        canvas.dataset.moving === "0" &&
        canvas.dataset.ready === "1"
      );
    },
    id,
    { timeout },
  );
}

/** Collect page errors and warnings emitted by failing scenes. */
export function watchConsole(page) {
  const problems = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" || /failed to (build|load)|update failed/.test(message.text()))
      problems.push(`${message.type()}: ${message.text()}`);
  });
  return problems;
}
