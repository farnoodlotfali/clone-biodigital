import fs from "node:fs";
import assert from "node:assert/strict";

const html = fs.readFileSync("src/components/sites/biodigital/a.html", "utf8");
const scene = JSON.parse(
  fs.readFileSync("docs/research/biodigital/model-named-raw.json", "utf8"),
);
const catalog = html
  .split(/<app-tree-nested-node\b/)
  .slice(1)
  .map((block) => {
    const id = block.match(/data-id="([^"]+)"/)[1];
    const name = block
      .match(/data-test="treeNodeLabel"[\s\S]*?<span>([^<]+)<\/span/)[1]
      .trim();
    const latin =
      block.match(/class="[^"]*italic[^"]*"[^>]*>\s*([^<]+)/)?.[1].trim() || "";
    const keys = scene.meshes
      .filter((mesh) =>
        mesh.path.some((part) => part.toLowerCase() === name.toLowerCase()),
      )
      .map((mesh) => mesh.key);
    assert.ok(keys.length, `No verified source mesh mapping for ${name}`);
    return { id, name, latin, keys, requested: true };
  });
assert.equal(catalog.length, 18);
const names = new Set(
  scene.meshes.flatMap((mesh) =>
    mesh.path.slice(
      mesh.path.findIndex((part) => part.endsWith(" system")) + 1,
    ),
  ),
);
for (const name of [...names].sort()) {
  if (catalog.some((structure) => structure.name === name)) continue;
  catalog.push({
    id: `source-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`,
    name,
    latin: "",
    requested: false,
    keys: scene.meshes
      .filter((mesh) => mesh.path.includes(name))
      .map((mesh) => mesh.key),
  });
}
fs.writeFileSync(
  "src/components/sites/biodigital/anatomy-catalog.json",
  JSON.stringify(catalog, null, 2),
);
console.log(
  `Prepared ${catalog.length} source-verified anatomy structures, including all 18 requested structures.`,
);
