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
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  await page.addInitScript(() => {
    window.__glSamples = [];
    for (const type of ["WebGLRenderingContext", "WebGL2RenderingContext"]) {
      const proto = window[type]?.prototype;
      if (!proto) continue;
      const original = proto.drawElements;
      proto.drawElements = function (...args) {
        if (window.__glSamples.length < 160) {
          const program = this.getParameter(this.CURRENT_PROGRAM);
          const uniforms = {};
          const attributes = [];
          for (
            let i = 0;
            i < this.getProgramParameter(program, this.ACTIVE_UNIFORMS);
            i++
          ) {
            const u = this.getActiveUniform(program, i);
            const value = this.getUniform(
              program,
              this.getUniformLocation(program, u.name),
            );
            uniforms[u.name] = ArrayBuffer.isView(value)
              ? Array.from(value)
              : value;
          }
          for (
            let i = 0;
            i < this.getProgramParameter(program, this.ACTIVE_ATTRIBUTES);
            i++
          )
            attributes.push(this.getActiveAttrib(program, i).name);
          window.__glSamples.push({ args, uniforms, attributes });
        }
        return original.apply(this, args);
      };
    }
  });
  const requests = [];
  page.on("response", (response) =>
    requests.push({
      url: response.url(),
      status: response.status(),
      type: response.request().resourceType(),
    }),
  );
  await page.goto(
    "https://human.biodigital.com/view?id=production/femaleAdult/female_system_respiratory_20&lang=en",
    { waitUntil: "domcontentloaded", timeout: 60000 },
  );
  await page.waitForTimeout(30000);
  await page.screenshot({
    path: "docs/design-references/biodigital/source-desktop-1440.png",
  });
  fs.writeFileSync(
    "docs/research/biodigital/gl-samples.json",
    JSON.stringify(await page.evaluate(() => window.__glSamples)),
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: "docs/design-references/biodigital/source-desktop-open-1440.png",
  });
  const states = {};
  for (const name of [
    "Selection Tools",
    "Anatomy Layers",
    "Anatomy Search",
    "Draw",
    "More Options",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.waitForTimeout(400);
    states[name] = await page.locator("body").innerText();
    await page.screenshot({
      path:
        "docs/design-references/biodigital/source-" +
        name.toLowerCase().replaceAll(" ", "-") +
        ".png",
    });
    await page.keyboard.press("Escape");
    if (["Anatomy Layers", "Anatomy Search"].includes(name))
      await page.getByRole("button", { name, exact: true }).click();
    if (name === "Draw")
      await page
        .getByRole("button", { name: "Exit Draw", exact: true })
        .click();
  }
  fs.writeFileSync(
    "docs/research/biodigital/states.json",
    JSON.stringify(states, null, 2),
  );
  fs.writeFileSync(
    "docs/research/biodigital/desktop-dom.html",
    await page.content(),
  );
  console.log((await page.locator("body").innerText()).slice(0, 18000));
  console.log(
    "FRAMES",
    page.frames().map((f) => f.url()),
  );
  fs.writeFileSync(
    "docs/research/biodigital/network.json",
    JSON.stringify(requests, null, 2),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: "docs/design-references/biodigital/source-mobile-open-390.png",
  });
  await browser.close();
})();
