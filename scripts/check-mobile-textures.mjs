import assert from "node:assert/strict";
import fs from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const { chromium } = await import(
  pathToFileURL(
    join(
      tmpdir(),
      "biodigital-browser-tools/node_modules/playwright/index.mjs",
    ),
  ).href
);
const browser = await chromium.launch({
  executablePath:
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  // A mobile viewport alone still exposes the desktop GPU's texture extensions.
  await context.addInitScript(() => {
    for (const Constructor of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const getExtension = Constructor.prototype.getExtension;
      Constructor.prototype.getExtension = function (name) {
        if (/s3tc/i.test(name)) return null;
        return getExtension.call(this, name);
      };
      const getSupportedExtensions =
        Constructor.prototype.getSupportedExtensions;
      Constructor.prototype.getSupportedExtensions = function () {
        return (
          getSupportedExtensions
            .call(this)
            ?.filter((name) => !/s3tc/i.test(name)) ?? []
        );
      };
    }
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("http://localhost:3000/view", { waitUntil: "networkidle" });
  if (await page.getByRole("button", { name: "Close signup message" }).count())
    await page.getByRole("button", { name: "Close signup message" }).click();
  await page
    .locator(".bd-loading")
    .waitFor({ state: "hidden", timeout: 30000 });
  await page.waitForTimeout(1000);
  const screenshot = await page.locator("canvas").screenshot();
  const { data, info } = await sharp(screenshot)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let redPixels = 0;
  for (let i = 0; i < data.length; i += info.channels)
    if (
      data[i] > 80 &&
      data[i] > data[i + 1] * 1.25 &&
      data[i] > data[i + 2] * 1.2
    )
      redPixels++;
  const result = {
    s3tcDisabled: true,
    redPixels,
    errors: [...new Set(errors)],
  };
  await page.screenshot({
    path: "docs/design-references/biodigital/mobile-no-s3tc-after.png",
  });
  fs.writeFileSync(
    "docs/research/biodigital/mobile-textures-after.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  assert.ok(
    redPixels > 5000,
    "Respiratory anatomy must render red without S3TC support",
  );
  assert.deepEqual(
    errors,
    [],
    "Mobile rendering must not log WebGL or texture errors",
  );
  await page.route("**/respiratory-color.png", (route) => route.abort());
  await page.reload({ waitUntil: "networkidle" });
  if (await page.getByRole("button", { name: "Close signup message" }).count())
    await page.getByRole("button", { name: "Close signup message" }).click();
  await page
    .locator(".bd-model-error")
    .waitFor({ state: "visible", timeout: 10000 });
  assert.equal(
    await page.locator(".bd-loading").count(),
    0,
    "Failed texture load must not leave a loading spinner",
  );
  console.log("Missing-texture error handling passed.");
} finally {
  await browser.close();
}
