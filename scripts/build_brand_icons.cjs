// Raster exports are generated from the original, font-free SVG.
// Run with Node.js and sharp installed: node scripts/build_brand_icons.cjs
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
(async () => {
  const source = path.join(root, 'public/brand/hrtoolkit-mark.svg');
  for (const [size, name] of [[180, 'apple-touch-icon.png'], [512, 'hrtoolkit-mark-512.png']]) {
    await sharp(source, {density: 384}).resize(size, size).png().toFile(path.join(root, 'public/brand', name));
  }
  const sizes = [16, 32, 48, 256];
  const images = await Promise.all(sizes.map(size => sharp(source, {density: 384}).resize(size, size).png().toBuffer()));
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((size, i) => {
    const at = 6 + i * 16;
    header[at] = header[at + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(images[i].length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += images[i].length;
  });
  await fs.writeFile(path.join(root, 'public/favicon.ico'), Buffer.concat([header, ...images]));
  console.log('Brand icons exported: SVG master, ICO 16/32/48/256, PNG 180/512.');
})().catch(error => { console.error(error); process.exitCode = 1; });
