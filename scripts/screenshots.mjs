import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath:
    "/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome",
  headless: true,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE", m.text());
});
await page.goto("http://127.0.0.1:3017", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
await page.screenshot({ path: "artifacts/desktop-water.png" });
for (const level of ["atom", "nucleus", "quarks", "interaction"]) {
  await page.goto("http://127.0.0.1:3017/?level=" + level, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `artifacts/desktop-${level}.png` });
}
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://127.0.0.1:3017", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.screenshot({ path: "artifacts/mobile-water.png" });
console.log("screenshots complete");
await browser.close();
