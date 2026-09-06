import { chromium } from "playwright";
const b = await chromium.launch({
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
try {
  const p = await b.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await p.goto(process.env.ATLAS_URL || "http://127.0.0.1:3017", {
    waitUntil: "networkidle",
  });
  for (let i = 0; i < 5; i++) {
    await p.waitForTimeout(750);
    await p.screenshot({ path: `artifacts/navigation-preview-${i}.png` });
    if (i < 4) {
      const button = p.locator('.zoom-navigation [data-direction="in"]'),
        target = await button.getAttribute("data-target");
      await button.click();
      await p.waitForFunction(
        (id) => document.querySelector("canvas")?.dataset.viewpoint === id,
        target,
      );
    }
  }
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(750);
  await p.screenshot({ path: "artifacts/navigation-preview-mobile.png" });
} finally {
  await b.close();
}
