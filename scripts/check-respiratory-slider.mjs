import fs from "node:fs";
import assert from "node:assert/strict";
import sharp from "sharp";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
const layers = JSON.parse(
  fs.readFileSync(
    "src/components/sites/biodigital/respiratory-layers.json",
    "utf8",
  ),
);
const source = JSON.parse(
  fs.readFileSync("docs/research/biodigital/slider-visible-names.json", "utf8"),
);
for (let stage = 0; stage <= 4; stage++)
  assert.deepEqual(
    Object.keys(layers)
      .filter((name) => layers[name] <= stage)
      .sort(),
    source[stage].sort(),
  );
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
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:3000/view", { waitUntil: "networkidle" });
  await page.locator(".bd-loading").waitFor({ state: "hidden" });
  await page
    .getByRole("button", { name: "Anatomy Layers", exact: true })
    .click();
  const slider = page.getByRole("slider", {
    name: "Respiratory System layer slider",
    exact: true,
  });
  assert.equal(await slider.getAttribute("max"), "4");
  assert.equal(await slider.getAttribute("step"), "1");
  const images = [];
  const red = [];
  for (const stage of [4, 3, 2, 1, 0]) {
    await slider.fill(String(stage));
    await page.waitForTimeout(350);
    const png = await page.locator("canvas").screenshot();
    images.push(png.toString("base64"));
    const { data, info } = await sharp(png)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let count = 0;
    // Exclude the bottom attribution logo, whose red mark is a DOM overlay.
    for (let i = 0; i < info.width * (info.height - 80) * info.channels; i += info.channels)
      if (
        (i / info.channels) % info.width > 100 &&
        (i / info.channels) % info.width < info.width - 100 &&
        data[i] > 80 &&
        data[i] > data[i + 1] * 1.25 &&
        data[i] > data[i + 2] * 1.2
      )
        count++;
    red.push(count);
    await page.screenshot({
      path: `docs/design-references/biodigital/local-respiratory-${stage}.png`,
    });
  }
  assert.equal(new Set(images).size, 5);
  assert.ok(red[0] > red[1]);
  assert.equal(red[4], 0);
  await page
    .getByRole("button", { name: "Show Respiratory System Layer" })
    .click();
  assert.equal(await slider.inputValue(), "4");
  await slider.focus();
  await page.keyboard.press("ArrowLeft");
  assert.equal(await slider.inputValue(), "3");
  await page
    .getByRole("button", { name: "Return to Starting Position" })
    .click();
  assert.equal(await slider.inputValue(), "4");
  await page.setViewportSize({ width: 390, height: 844 });
  await slider.fill("3");
  assert.equal(await slider.inputValue(), "3");
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "docs/research/biodigital/slider-check.json",
    JSON.stringify(
      {
        sourceMembershipMatched: true,
        distinctStages: 5,
        redPixelsByStage4to0: red,
        keyboard: true,
        toggle: true,
        reset: true,
        mobile: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "Source-matched slider stages, rendering, keyboard, toggle, reset and mobile checks passed.",
  );
} finally {
  await browser.close();
}
