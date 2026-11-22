// Extract the geometry delivered to the public viewer into an editable local asset.
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
  page.on("pageerror", (error) => console.log("SOURCE ERROR", error.message));
  await page.addInitScript(() => {
    const ids = new WeakMap();
    let nextId = 1;
    const id = (object) => {
      if (!ids.has(object)) ids.set(object, nextId++);
      return ids.get(object);
    };
    const buffers = new Map();
    const meshes = new Map();
    window.__assetExport = () => ({
      buffers: Array.from(buffers.entries()),
      meshes: Array.from(meshes.values()),
    });
    const proto = WebGL2RenderingContext.prototype;
    const original = proto.drawElements;
    proto.drawElements = function (mode, count, type, offset) {
      const gl = this; // eslint-disable-line @typescript-eslint/no-this-alias -- Preserve the WebGL receiver inside the read helper.
      try {
        if (mode === gl.TRIANGLES && count > 30) {
          const program = gl.getParameter(gl.CURRENT_PROGRAM);
          const indexBuffer = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
          const matrixLocation = gl.getUniformLocation(program, "modelMatrix");
          const matrix = matrixLocation
            ? Array.from(gl.getUniform(program, matrixLocation))
            : [];
          const key =
            id(indexBuffer) +
            ":" +
            count +
            ":" +
            offset +
            ":" +
            matrix.join(",");
          if (!meshes.has(key)) {
            const uniforms = {};
            for (
              let i = 0;
              i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
              i++
            ) {
              const u = gl.getActiveUniform(program, i);
              if (
                !/decode|modelMatrix|baseColor$|opacity$|TextureBlend|textureSampler0/.test(
                  u.name,
                )
              )
                continue;
              const v = gl.getUniform(
                program,
                gl.getUniformLocation(program, u.name),
              );
              uniforms[u.name] = ArrayBuffer.isView(v) ? Array.from(v) : v;
            }
            const read = (target, buffer) => {
              const bufferId = id(buffer);
              if (!buffers.has(bufferId)) {
                const data = new Uint8Array(
                  gl.getBufferParameter(target, gl.BUFFER_SIZE),
                );
                gl.getBufferSubData(target, 0, data);
                let binary = "";
                for (let j = 0; j < data.length; j += 8192)
                  binary += String.fromCharCode(...data.subarray(j, j + 8192));
                buffers.set(bufferId, btoa(binary));
              }
              return bufferId;
            };
            const index = read(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            const previous = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
            const attrs = {};
            for (
              let i = 0;
              i < gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
              i++
            ) {
              const attr = gl.getActiveAttrib(program, i);
              if (!["position", "texcoord"].includes(attr.name)) continue;
              const loc = gl.getAttribLocation(program, attr.name);
              const buffer = gl.getVertexAttrib(
                loc,
                gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING,
              );
              if (!buffer) continue;
              gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
              attrs[attr.name] = {
                buffer: read(gl.ARRAY_BUFFER, buffer),
                size: gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_SIZE),
                type: gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_TYPE),
                stride: gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_STRIDE),
                offset: gl.getVertexAttribOffset(
                  loc,
                  gl.VERTEX_ATTRIB_ARRAY_POINTER,
                ),
              };
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, previous);
            if (attrs.position)
              meshes.set(key, {
                key,
                count,
                type,
                offset,
                index,
                attrs,
                uniforms,
              });
          }
        }
      } catch (error) {
        window.__captureError = String(error);
      }
      return original.call(gl, mode, count, type, offset);
    };
  });
  await page.goto(
    "https://human.biodigital.com/view?id=production/femaleAdult/female_system_respiratory_20&lang=en",
    { waitUntil: "domcontentloaded", timeout: 60000 },
  );
  await page.waitForTimeout(45000);
  fs.writeFileSync(
    "docs/research/biodigital/model-raw.json",
    JSON.stringify(await page.evaluate(() => window.__assetExport())),
  );
  console.log("Public mesh data captured");
  console.log(
    "CAPTURE ERROR",
    await page.evaluate(() => window.__captureError),
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  const states = {};
  for (const [name, selector] of [
    ["Selection Tools", "viewToolsButton"],
    ["Anatomy Layers", "viewLayersButton"],
    ["Anatomy Search", "viewSearchButton"],
    ["Draw", "viewDrawButton"],
    ["More Options", "viewMenuButton"],
  ]) {
    try {
      await page.locator(`[data-test="${selector}"]`).click({ timeout: 3000 });
      await page.waitForTimeout(300);
      states[name] = await page.locator("body").innerText();
      fs.writeFileSync(
        "docs/research/biodigital/states.json",
        JSON.stringify(states, null, 2),
      );
      await page.screenshot({
        path:
          "docs/design-references/biodigital/source-" +
          name.toLowerCase().replaceAll(" ", "-") +
          ".png",
      });
      await page.keyboard.press("Escape");
      if (["Anatomy Layers", "Anatomy Search"].includes(name))
        await page
          .locator(`[data-test="${selector}"]`)
          .click({ timeout: 3000 });
      if (name === "Draw")
        await page
          .getByRole("button", { name: /Done|Exit Draw/ })
          .first()
          .click({ timeout: 2000 })
          .catch(() => {});
    } catch (e) {
      console.log(name, e.message.slice(0, 100));
    }
  }
  console.log(
    "MESHES",
    JSON.parse(fs.readFileSync("docs/research/biodigital/model-raw.json"))
      .meshes.length,
  );
  await browser.close();
})();
