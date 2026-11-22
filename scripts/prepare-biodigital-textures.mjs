import fs from "node:fs/promises";
import assert from "node:assert/strict";
import sharp from "sharp";
import { DDSLoader } from "three/addons/loaders/DDSLoader.js";
import { RGB_S3TC_DXT1_Format } from "three";

// Decode the existing source BC1 atlases at build time. Mobile GPUs need not
// support S3TC, and do not need to download a runtime decoder or DDS files.
function decodeBC1(data, width, height) {
  const pixels = new Uint8Array(width * height * 4);
  const rgb565 = (value) => [
    (((value >> 11) & 31) * 255) / 31,
    (((value >> 5) & 63) * 255) / 63,
    ((value & 31) * 255) / 31,
    255,
  ];
  const blocksWide = Math.ceil(width / 4);
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const offset = ((y / 4) * blocksWide + x / 4) * 8;
      const a = data[offset] | (data[offset + 1] << 8);
      const b = data[offset + 2] | (data[offset + 3] << 8);
      const palette = [rgb565(a), rgb565(b)];
      palette.push(
        a > b
          ? palette[0].map((v, i) =>
              i === 3 ? 255 : (2 * v + palette[1][i]) / 3,
            )
          : palette[0].map((v, i) => (i === 3 ? 255 : (v + palette[1][i]) / 2)),
      );
      palette.push(
        a > b
          ? palette[0].map((v, i) =>
              i === 3 ? 255 : (v + 2 * palette[1][i]) / 3,
            )
          : [0, 0, 0, 0],
      );
      const selectors =
        (data[offset + 4] |
          (data[offset + 5] << 8) |
          (data[offset + 6] << 16) |
          (data[offset + 7] << 24)) >>>
        0;
      for (let py = 0; py < 4 && y + py < height; py++)
        for (let px = 0; px < 4 && x + px < width; px++) {
          const color = palette[(selectors >>> (2 * (py * 4 + px))) & 3];
          pixels.set(color.map(Math.round), ((y + py) * width + x + px) * 4);
        }
    }
  }
  return pixels;
}

const loader = new DDSLoader();
for (const name of ["color", "normal", "roughness"]) {
  const input = await fs.readFile(
    `public/sites/biodigital/respiratory-${name}.dds`,
  );
  const texture = loader.parse(
    input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength),
    false,
  );
  assert.equal(
    texture.format,
    RGB_S3TC_DXT1_Format,
    "Only BC1 source textures are supported",
  );
  const pixels = decodeBC1(
    texture.mipmaps[0].data,
    texture.width,
    texture.height,
  );
  const output = `public/sites/biodigital/respiratory-${name}.png`;
  await sharp(pixels, {
    raw: { width: texture.width, height: texture.height, channels: 4 },
  })
    .removeAlpha()
    .resize({
      width: 1024,
      height: 1024,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 9 })
    .toFile(output);
  console.log(output);
}
