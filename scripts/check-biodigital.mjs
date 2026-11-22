import fs from "node:fs";
import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
const { chromium } = await import(
  pathToFileURL(
    join(
      tmpdir(),
      "biodigital-browser-tools/node_modules/playwright/index.mjs",
    ),
  ).href
);
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(
    "http://127.0.0.1:3000/view?id=production/femaleAdult/female_system_respiratory_20&lang=en",
    { waitUntil: "networkidle" },
  );
  await page
    .locator(".bd-loading")
    .waitFor({ state: "hidden", timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: "docs/design-references/biodigital/local-desktop-1440.png",
  });
  await page.getByRole("button", { name: "Close signup message" }).click();
  await page.screenshot({
    path: "docs/design-references/biodigital/local-desktop-open-1440.png",
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "docs/design-references/biodigital/local-wide-1920.png",
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .getByRole("button", { name: "Anatomy Search", exact: true })
    .click();
  await page.getByRole("textbox", { name: "Search anatomy" }).fill("lung");
  assert.equal(await page.locator(".bd-results button").count(), 2);
  await page.getByRole("button", { name: "Left lung", exact: true }).click();
  assert.equal(
    await page.locator(".bd-selected > span").innerText(),
    "Left lung",
  );
  await page
    .getByRole("button", { name: "Anatomy Layers", exact: true })
    .click();
  await page
    .getByRole("slider", { name: "Skin opacity", exact: true })
    .fill("0");
  await page.screenshot({
    path: "docs/design-references/biodigital/local-layers-1440.png",
  });
  await page
    .getByRole("button", { name: "Return to Starting Position" })
    .click();
  await page.getByRole("button", { name: "Draw", exact: true }).click();
  await page.mouse.move(650, 400);
  await page.mouse.down();
  await page.mouse.move(780, 480, { steps: 15 });
  await page.mouse.up();
  assert.equal(await page.locator(".bd-drawing polyline").count(), 1);
  await page.getByRole("button", { name: "Undo stroke" }).click();
  assert.equal(await page.locator(".bd-drawing polyline").count(), 0);
  await page.getByRole("button", { name: "Exit Draw", exact: true }).click();
  await page.getByRole("button", { name: "Close Info Panel" }).click();
  const beforeOrbit = await page
    .locator("canvas")
    .evaluate((canvas) => canvas.toDataURL());
  await page.mouse.move(600, 450);
  await page.mouse.down();
  await page.mouse.move(800, 450, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  const afterOrbit = await page
    .locator("canvas")
    .evaluate((canvas) => canvas.toDataURL());
  assert.notEqual(
    beforeOrbit,
    afterOrbit,
    "Orbit drag must change the rendered anatomy",
  );
  await page.screenshot({
    path: "docs/design-references/biodigital/local-orbit-1440.png",
  });
  await page
    .getByRole("button", { name: "Return to Starting Position" })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: "docs/design-references/biodigital/local-mobile-390.png",
  });
  await page.getByRole("button", { name: "Close signup message" }).click();
  await page.getByRole("button", { name: "About this model" }).click();
  assert.equal(await page.locator(".bd-panel.mobile-open").count(), 1);
  await page.getByRole("button", { name: "Close anatomy column" }).click();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  assert.equal(overflow, false);
  await page.screenshot({
    path: "docs/design-references/biodigital/local-mobile-open-390.png",
  });
  fs.writeFileSync(
    "docs/research/biodigital/browser-check.json",
    JSON.stringify(
      {
        errors,
        mobileOverflow: overflow,
        checks: [
          "model loads",
          "signup dismisses",
          "anatomy search",
          "selection",
          "layer slider",
          "reset",
          "draw and undo",
          "orbit drag",
          "mobile info panel",
          "no mobile overflow",
        ],
      },
      null,
      2,
    ),
  );
  assert.deepEqual(errors, [], "Browser runtime must have no errors");
  console.log("Browser workflow checks passed with no runtime errors.");
  await browser.close();
})();
