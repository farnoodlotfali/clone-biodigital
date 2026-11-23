import assert from "node:assert/strict";
import fs from "node:fs";
import { networkInterfaces, tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(
  pathToFileURL(
    join(
      tmpdir(),
      "biodigital-browser-tools/node_modules/playwright/index.mjs",
    ),
  ).href
);
const address = Object.values(networkInterfaces())
  .flat()
  .find(
    (address) =>
      address?.family === "IPv4" &&
      !address.internal &&
      address.address.startsWith("192.168."),
  )?.address;
assert.ok(
  address,
  "Connect this computer to the local Wi-Fi network before running this check",
);
const url = process.env.PREVIEW_URL || `http://${address}:3000/view`;
const baseline = process.argv.includes("--baseline");
const browser = await chromium.launch({
  executablePath:
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const failedResponses = [];
  const errors = [];
  page.on("response", (response) => {
    if (response.status() >= 400)
      failedResponses.push({ url: response.url(), status: response.status() });
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: "networkidle" });
  if (baseline) await page.waitForTimeout(2000);
  else
    await page
      .locator(".bd-loading")
      .waitFor({ state: "hidden", timeout: 30000 });
  const result = {
    url,
    loadingVisible: await page.locator(".bd-loading").isVisible(),
    canvases: await page.locator("canvas").count(),
    modelError: await page.locator(".bd-model-error").count(),
    failedResponses,
    errors,
  };
  const phase = baseline ? "before" : "after";
  fs.writeFileSync(
    `docs/research/biodigital/lan-loading-${phase}.json`,
    JSON.stringify(result, null, 2),
  );
  await page.screenshot({
    path: `docs/design-references/biodigital/lan-loading-${phase}.png`,
  });
  console.log(JSON.stringify(result));
  if (!baseline) {
    assert.equal(result.loadingVisible, false);
    assert.equal(
      result.canvases,
      1,
      "The LAN page must hydrate and create the 3D canvas",
    );
    assert.equal(result.modelError, 0);
    assert.deepEqual(failedResponses, []);
    assert.deepEqual(errors, []);
    await page
      .getByRole("button", { name: "Anatomy Search", exact: true })
      .click();
    await page.getByRole("textbox", { name: "Search anatomy" }).fill("lung");
    assert.equal(await page.locator(".bd-results button").count(), 2);
    console.log("LAN hydration, asset loading and controls passed.");
  }
} finally {
  await browser.close();
}
