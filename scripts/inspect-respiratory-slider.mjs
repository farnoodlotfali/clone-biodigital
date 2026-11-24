import fs from "node:fs";
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
const browser = await chromium.launch({
  executablePath:
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  await page.addInitScript(() => {
    window.__layerSamples = new Map();
    const original = WebGL2RenderingContext.prototype.drawElements;
    WebGL2RenderingContext.prototype.drawElements = function (...args) {
      try {
        const p = this.getParameter(this.CURRENT_PROGRAM);
        const values = { count: args[1] };
        for (const name of [
          "decodePositions",
          "modelMatrix",
          "opacity",
          "modifierValue0",
          "modifierValue1",
          "modifierValue2",
        ]) {
          const loc = this.getUniformLocation(p, name);
          if (loc) {
            const v = this.getUniform(p, loc);
            values[name] = ArrayBuffer.isView(v) ? Array.from(v) : v;
          }
        }
        window.__layerSamples.set(
          JSON.stringify([
            values.count,
            values.decodePositions,
            values.modelMatrix,
          ]),
          values,
        );
      } catch {}
      return original.apply(this, args);
    };
  });
  await page.goto(
    "https://human.biodigital.com/view?id=production/femaleAdult/female_system_respiratory_20&lang=en",
    { waitUntil: "domcontentloaded", timeout: 60000 },
  );
  await page.waitForTimeout(30000);
  await page
    .getByRole("button", { name: "Close", exact: true })
    .click({ timeout: 2000 })
    .catch(() => {});
  await page
    .getByRole("button", { name: "Anatomy Layers", exact: true })
    .click();
  const inputs = await page
    .locator("input[type=range]")
    .evaluateAll((nodes) =>
      nodes.map((n) => ({
        html: n.outerHTML,
        parent: n.parentElement.parentElement.parentElement.outerHTML.slice(
          0,
          5500,
        ),
      })),
    );
  fs.writeFileSync(
    "docs/research/biodigital/slider-inputs.json",
    JSON.stringify(inputs, null, 2),
  );
  console.log(
    inputs.map((n, i) => ({ i, html: n.html, parent: n.parent.slice(0, 600) })),
  );
  const slider = page.locator("input[type=range]").nth(4);
  console.log("SLIDER", await slider.getAttribute("aria-label"));
  const states = [];
  for (const value of ["4", "3", "2", "1", "0"]) {
    if (value !== "4")
      await page.evaluate(() => {
        window.__layerSamples = new Map();
      });
    await slider.fill(value);
    await page.waitForTimeout(800);
    await page
      .getByRole("button", { name: "Close", exact: true })
      .click({ timeout: 500 })
      .catch(() => {});
    await page.screenshot({
      path: `docs/design-references/biodigital/source-respiratory-${value}.png`,
    });
    states.push({
      value,
      meshes: await page.evaluate(() => [...window.__layerSamples.values()]),
    });
    fs.writeFileSync(
      "docs/research/biodigital/slider-states.json",
      JSON.stringify(states),
    );
  }
} finally {
  await browser.close();
}
