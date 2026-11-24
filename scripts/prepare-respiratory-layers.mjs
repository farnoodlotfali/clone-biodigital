import fs from "node:fs";
import assert from "node:assert/strict";
const raw = JSON.parse(
  fs.readFileSync("docs/research/biodigital/model-named-raw.json", "utf8"),
);
const states = JSON.parse(
  fs.readFileSync("docs/research/biodigital/slider-states.json", "utf8"),
);
const key = (m) => JSON.stringify([m.count, m.decodePositions, m.modelMatrix]);
const stages = {};
const visible = {};
for (const state of states) {
  const keys = new Set(state.meshes.map(key));
  visible[state.value] = raw.meshes
    .filter((mesh) => keys.has(key({ count: mesh.count, ...mesh.uniforms })))
    .map((mesh) => mesh.displayName);
  assert.equal(
    visible[state.value].length,
    keys.size,
    "Every captured draw must match a named mesh",
  );
}
assert.equal(visible[4].length, 87);
assert.equal(visible[0].length, 10);
for (const name of visible[4]) {
  for (let stage = 0; stage <= 4; stage++) {
    if (visible[stage].includes(name)) {
      stages[name] = stage;
      break;
    }
  }
}
for (let stage = 1; stage <= 4; stage++)
  assert.ok(
    visible[stage - 1].every((name) => visible[stage].includes(name)),
    "Layer stages must be cumulative",
  );
fs.writeFileSync(
  "src/components/sites/biodigital/respiratory-layers.json",
  JSON.stringify(stages, null, 2),
);
fs.writeFileSync(
  "docs/research/biodigital/slider-visible-names.json",
  JSON.stringify(visible, null, 2),
);
