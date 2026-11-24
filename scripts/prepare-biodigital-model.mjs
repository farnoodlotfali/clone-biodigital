import fs from "node:fs";
import { BufferGeometry, BufferAttribute, Matrix4, Vector3 } from "three";
const named =
  !process.argv.includes("--legacy") &&
  fs.existsSync("docs/research/biodigital/model-named-raw.json");
const raw = JSON.parse(
  fs.readFileSync(
    named
      ? "docs/research/biodigital/model-named-raw.json"
      : "docs/research/biodigital/model-raw.json",
    "utf8",
  ),
);
const catalog = named
  ? JSON.parse(
      fs.readFileSync(
        "src/components/sites/biodigital/anatomy-catalog.json",
        "utf8",
      ),
    )
  : [];
const buffers = new Map(
  raw.buffers.map(([id, base64]) => [id, Buffer.from(base64, "base64")]),
);
const types = {
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array,
};
const encode = (array) =>
  Buffer.from(array.buffer, array.byteOffset, array.byteLength).toString(
    "base64",
  );
const meshes = raw.meshes.map((mesh, meshIndex) => {
  const p = mesh.attrs.position;
  const buffer = buffers.get(p.buffer);
  const Type = types[p.type];
  const values = new Type(
    buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ),
  );
  const stride = p.stride ? p.stride / Type.BYTES_PER_ELEMENT : p.size;
  const length = Math.floor(
    (values.length - p.offset / Type.BYTES_PER_ELEMENT) / stride,
  );
  const positions = new Float32Array(length * 3);
  const decode = new Matrix4().fromArray(
    mesh.uniforms.decodePositions || new Matrix4().elements,
  );
  const model = new Matrix4().fromArray(mesh.uniforms.modelMatrix);
  const point = new Vector3();
  for (let i = 0; i < length; i++) {
    const offset = i * stride + p.offset / Type.BYTES_PER_ELEMENT;
    point
      .fromArray(values, offset)
      .applyMatrix4(decode)
      .applyMatrix4(model)
      .toArray(positions, i * 3);
  }
  const indexBuffer = buffers.get(mesh.index);
  const Index = types[mesh.type];
  const indices = new Index(
    indexBuffer.buffer.slice(
      indexBuffer.byteOffset + mesh.offset,
      indexBuffer.byteOffset +
        mesh.offset +
        mesh.count * Index.BYTES_PER_ELEMENT,
    ),
  );
  // Mirrored model matrices reverse the face winding.
  if (model.determinant() < 0)
    for (let i = 0; i < indices.length; i += 3) {
      const value = indices[i];
      indices[i] = indices[i + 2];
      indices[i + 2] = value;
    }
  let uvs;
  if (mesh.attrs.texcoord) {
    const a = mesh.attrs.texcoord;
    const uvBuffer = buffers.get(a.buffer);
    const UvType = types[a.type];
    const rawUv = new UvType(
      uvBuffer.buffer.slice(
        uvBuffer.byteOffset,
        uvBuffer.byteOffset + uvBuffer.byteLength,
      ),
    );
    uvs = new Float32Array(length * 2);
    const d = mesh.uniforms.decodeUVs || [1, 0, 0, 0, 1, 0, 0, 0, 1];
    for (let i = 0; i < length; i++) {
      const o =
        i * (a.stride ? a.stride / UvType.BYTES_PER_ELEMENT : a.size) +
        a.offset / UvType.BYTES_PER_ELEMENT;
      uvs[i * 2] = rawUv[o] * d[0] + d[6];
      uvs[i * 2 + 1] = 1 - (rawUv[o + 1] * d[4] + d[7]);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeBoundingBox();
  const center = geometry.boundingBox.getCenter(new Vector3());
  const size = geometry.boundingBox.getSize(new Vector3());
  const textured = mesh.uniforms.baseColorTextureBlendFactor0 === 1;
  const isSkin =
    !textured && (size.y > 0.2 || (center.y > 1.66 && size.x > 0.025));
  let name = "Respiratory structure";
  if (isSkin) name = size.y > 1 ? "Body surface" : "Body surface detail";
  else if (center.y < 1.45 && size.y > 0.1 && size.x > 0.05)
    name = center.x > 0 ? "Left lung" : "Right lung";
  else if (center.y > 1.65) name = "Nasal cavity and sinuses";
  else if (center.y > 1.56) name = "Pharynx";
  else if (center.y > 1.47) name = "Larynx";
  else if (size.y > size.x * 1.5) name = "Trachea";
  else name = "Bronchi";
  name = mesh.displayName || name;
  console.log(
    meshIndex,
    name,
    "center",
    center.toArray().map((v) => v.toFixed(3)),
    "size",
    size.toArray().map((v) => v.toFixed(3)),
    textured ? "atlas" : "surface",
  );
  return {
    sourceKey: mesh.key,
    structureIds: catalog
      .filter((structure) => structure.keys.includes(mesh.key))
      .map((structure) => structure.id),
    name,
    layer: isSkin ? "skin" : "respiratory",
    textured,
    positions: encode(positions),
    indices: encode(new Uint32Array(indices)),
    uvs: uvs ? encode(uvs) : undefined,
  };
});
fs.writeFileSync(
  "public/sites/biodigital/anatomy.json",
  JSON.stringify({
    attribution:
      "BioDigital, a division of Anatomage. Extracted from the publicly loaded Female Respiratory System viewer for this local reference implementation.",
    meshes,
  }),
);
