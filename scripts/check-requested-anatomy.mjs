import fs from "node:fs";
import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
const catalog = JSON.parse(
  fs.readFileSync(
    "src/components/sites/biodigital/anatomy-catalog.json",
    "utf8",
  ),
);
const model = JSON.parse(
  fs.readFileSync("public/sites/biodigital/anatomy.json", "utf8"),
);
const requested = catalog.filter((structure) => structure.requested);
assert.equal(requested.length, 18);
for (const structure of requested) {
  const meshes = model.meshes.filter((mesh) =>
    mesh.structureIds.includes(structure.id),
  );
  assert.equal(
    meshes.length,
    structure.keys.length,
    `Mesh membership for ${structure.name}`,
  );
  assert.ok(meshes.length > 0);
  if (meshes.length === 1) assert.equal(meshes[0].name, structure.name);
}
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
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("http://localhost:3000/view", { waitUntil: "networkidle" });
  await page
    .locator(".bd-loading")
    .waitFor({ state: "hidden", timeout: 30000 });
  await page
    .getByRole("button", { name: "Anatomy Search", exact: true })
    .click();
  const search = page.getByRole("textbox", { name: "Search anatomy" });
  for (const structure of requested) {
    await search.fill(structure.name);
    await page
      .getByRole("button", { name: `Select ${structure.name}`, exact: true })
      .click();
    assert.equal(
      await page.locator(".bd-selected > span").innerText(),
      structure.name,
    );
    await page
      .getByRole("button", { name: `Hide ${structure.name}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: `Show ${structure.name}`, exact: true })
      .click();
  }
  const images = [];
  for (const name of [
    "Left middle ear mucosa",
    "Left superior lobe",
    "Lungs",
  ]) {
    await search.fill(name);
    const row = page.locator(
      `[data-structure-id="${catalog.find((s) => s.name === name).id}"]`,
    );
    await row.locator("summary").click();
    await row.getByRole("button", { name: "Isolate", exact: true }).click();
    await page.waitForTimeout(500);
    images.push(
      await page.locator("canvas").evaluate((canvas) => canvas.toDataURL()),
    );
    await page.screenshot({
      path: `docs/design-references/biodigital/local-isolate-${name.toLowerCase().replaceAll(" ", "-")}.png`,
    });
  }
  assert.equal(
    new Set(images).size,
    3,
    "Distinct source anatomy must produce distinct isolated geometry",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Anatomy Search", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Anatomy Search", exact: true })
    .click();
  await search.fill("plica vocalis");
  await page
    .getByRole("button", { name: "Select Left vocal fold", exact: true })
    .click();
  const row = page.locator(
    `[data-structure-id="${catalog.find((s) => s.name === "Left vocal fold").id}"]`,
  );
  await row.locator("summary").click();
  await row.getByRole("button", { name: "Isolate", exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "docs/design-references/biodigital/local-isolate-vocal-fold-mobile.png",
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "docs/research/biodigital/requested-anatomy-check.json",
    JSON.stringify(
      {
        requested: requested.length,
        total: catalog.length,
        renderedMeshes: model.meshes.length,
        exactMeshMembership: true,
        selectHideShow: true,
        distinctIsolatedGeometry: true,
        mobileLatinSearch: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "All 18 requested structures verified; desktop and mobile anatomy workflows passed.",
  );
} finally {
  await browser.close();
}
