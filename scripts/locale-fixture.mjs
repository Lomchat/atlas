import fs from "node:fs";
import assert from "node:assert/strict";

export const locale = process.env.ATLAS_LOCALE;
assert.ok(
  ["en", "fr"].includes(locale),
  "Run tests through npm test or npm run test:<suite>; both languages are required.",
);
export const browserLocale = locale === "fr" ? "fr-FR" : "en-GB";
const catalog = JSON.parse(
  fs.readFileSync(new URL(`../src/locales/${locale}.json`, import.meta.url)),
);
export function text(key, params = {}) {
  assert.ok(
    Object.hasOwn(catalog, key),
    `Missing ${locale} test label: ${key}`,
  );
  return catalog[key].replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.hasOwn(params, name) ? String(params[name]) : placeholder,
  );
}
export const stepName = (number) =>
  new RegExp(
    "^" +
      text("Step {number}: {title}", { number, title: "" }).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      ),
  );
export const artifact = (name) => `artifacts/${locale}-${name}`;
export async function assertLocale(page) {
  assert.equal(
    await page.locator("html").getAttribute("lang"),
    locale,
    "Scenario must actually run in its assigned language",
  );
}
