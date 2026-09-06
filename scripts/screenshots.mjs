import { chromium } from "playwright";
const b = await chromium.launch({
  executablePath:
    "/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome",
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const p = await b.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
p.on("pageerror", (e) => console.log("ERROR", e.message));
p.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE", m.text());
});
await p.goto("http://127.0.0.1:3017", { waitUntil: "networkidle" });
await p.waitForTimeout(1000);
await p.screenshot({ path: "artifacts/v2-closed.png" });
await p.locator('.atom-label[data-node="atom-0"]').click();
await p.waitForTimeout(700);
await p.screenshot({ path: "artifacts/v2-open-atom.png" });
await p.getByRole("slider", { name: "Déplier l’ensemble" }).focus();
await p.keyboard.press("End");
await p.waitForTimeout(1000);
await p.screenshot({ path: "artifacts/v2-full.png" });
await p.locator(".breadcrumb button").first().click();
await p.waitForTimeout(300);
await p.getByRole("button", { name: "Rechercher", exact: true }).click();
await p
  .getByRole("textbox", { name: "Rechercher un constituant" })
  .fill("proton 3");
await p.locator(".search-results>button").first().click();
await p.waitForTimeout(1200);
await p.screenshot({ path: "artifacts/v2-proton.png" });
await p.setViewportSize({ width: 390, height: 844 });
await p.goto("http://127.0.0.1:3017", { waitUntil: "networkidle" });
await p.waitForTimeout(700);
await p.screenshot({ path: "artifacts/v2-mobile.png" });
await b.close();
console.log("Previews done");
