#!/usr/bin/env node
/**
 * Development screenshots of any level or transition.
 *
 *   node scripts/shoot.mjs --at cell,nucleus --lang fr --out /tmp/shots
 *   node scripts/shoot.mjs --at cell --offset -0.6      # partway into the child
 *   node scripts/shoot.mjs --at park --ui 1 --size 390x844
 *
 * Options: --at (comma-separated level ids), --offset (decades from the home
 * view, negative = deeper; comma-separated values are combined with every id),
 * --lang (en|fr, default en), --size (WxH, default 1280x800), --ui (0|1,
 * default 0), --freeze (animation time, default 1.5), --wait (ms after ready,
 * default 400), --out (directory, default /tmp/atlas-shots), --url.
 * Prints the file paths and any console errors.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, value, index, all) => {
    if (value.startsWith("--")) pairs.push([value.slice(2), all[index + 1]]);
    return pairs;
  }, []),
);
const base = (args.url || process.env.ATLAS_URL || "http://127.0.0.1:3017").replace(/\/$/, "");
const ids = (args.at || "park").split(",");
const offsets = (args.offset ?? "0").split(",").map(Number);
const lang = args.lang || "en";
const [width, height] = (args.size || "1280x800").split("x").map(Number);
const out = args.out || "/tmp/atlas-shots";
const ui = args.ui ?? "0";
const freeze = args.freeze ?? "1.5";
const wait = Number(args.wait ?? 400);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    "/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width, height },
    locale: lang === "fr" ? "fr-FR" : "en-GB",
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning")
      errors.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  for (const id of ids) {
    for (const offset of offsets) {
      const url = `${base}/?lang=${lang}&at=${id}&intro=0&ui=${ui}&freeze=${freeze}&offset=${offset}`;
      await page.goto(url, { waitUntil: "load" });
      await page
        .waitForFunction(() => document.querySelector("canvas[data-atlas-scene]")?.dataset.ready === "1", null, {
          timeout: 20000,
        })
        .catch(() => errors.push(`timeout waiting for ${id} to be ready`));
      await page.waitForTimeout(wait);
      const file = `${out}/${id}${offset ? `_${offset}` : ""}${ui === "1" ? "_ui" : ""}_${lang}_${width}x${height}.png`;
      await page.screenshot({ path: file });
      console.log(file);
    }
  }
  if (errors.length) console.log("\nConsole:\n" + [...new Set(errors)].join("\n"));
} finally {
  await browser.close();
}
