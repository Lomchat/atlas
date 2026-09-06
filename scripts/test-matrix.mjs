import { readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { checkCatalogs } from "./check-catalogs.mjs";

checkCatalogs();
const all = readdirSync(new URL(".", import.meta.url))
  .filter((name) => /^verify(?:-.*)?\.mjs$/.test(name))
  .sort();
const requested = process.argv.slice(2);
const suites = requested.length
  ? requested.map((name) =>
      name === "navigation" ? "verify.mjs" : `verify-${name}.mjs`,
    )
  : all;
for (const suite of suites)
  assert.ok(all.includes(suite), `Unknown suite: ${suite}`);
mkdirSync("artifacts", { recursive: true });
const results = [];
function run(suite, locale) {
  return new Promise((resolve) => {
    console.log(`\n[${locale}] ${suite}`);
    const child = spawn(
      process.execPath,
      [new URL(suite, import.meta.url).pathname],
      {
        stdio: "inherit",
        env: { ...process.env, ATLAS_LOCALE: locale },
      },
    );
    child.on("error", (error) => {
      results.push({ suite, locale, error: error.message });
      resolve(false);
    });
    child.on("exit", (code) => {
      results.push({ suite, locale, code });
      resolve(code === 0);
    });
  });
}
let passed = true;
// At most two software-WebGL browsers at once: the same scenario in both languages.
for (const suite of suites) {
  const pair = await Promise.all([run(suite, "en"), run(suite, "fr")]);
  passed = pair.every(Boolean) && passed;
}
writeFileSync(
  "artifacts/test-matrix.json",
  JSON.stringify({ passed, results }, null, 2),
);
console.log(
  `\n${passed ? "PASS" : "FAIL"}: ${suites.length} suites × 2 languages (${results.length} runs)`,
);
process.exitCode = passed ? 0 : 1;
