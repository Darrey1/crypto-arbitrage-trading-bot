import sharp from '../node_modules/sharp/lib/index.js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(__dirname, '../src/app');

// SVG matching the provided image: light pale yellow rounded square with dark pulse waveform
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" rx="22" ry="22" fill="#F0D878"/>
  <polyline
    points="10,50 28,50 35,32 42,68 49,38 54,58 60,50 90,50"
    fill="none"
    stroke="#1A1A1A"
    stroke-width="6"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>`;

const svgBuffer = Buffer.from(svgIcon);

// Build PNG buffers at required sizes using sharp
async function generatePng(size) {
  return sharp(svgBuffer, { density: 300 })
    .resize(size, size)
    .png()
    .toBuffer();
}

// Pack multiple PNG buffers into a .ico file
function createIco(pngBuffers, sizes) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const entrySize = 16;
  const dataOffset = headerSize + entrySize * count;

  const offsets = [];
  let currentOffset = dataOffset;
  for (const buf of pngBuffers) {
    offsets.push(currentOffset);
    currentOffset += buf.length;
  }

  const totalSize = currentOffset;
  const ico = Buffer.alloc(totalSize);

  // ICONDIR header
  ico.writeUInt16LE(0, 0);      // reserved
  ico.writeUInt16LE(1, 2);      // type: 1 = ICO
  ico.writeUInt16LE(count, 4);  // image count

  // ICONDIRENTRY for each image
  for (let i = 0; i < count; i++) {
    const base = headerSize + i * entrySize;
    const size = sizes[i] >= 256 ? 0 : sizes[i]; // 0 means 256 in ICO format
    ico.writeUInt8(size, base);         // width
    ico.writeUInt8(size, base + 1);     // height
    ico.writeUInt8(0, base + 2);        // color count (0 = truecolor)
    ico.writeUInt8(0, base + 3);        // reserved
    ico.writeUInt16LE(1, base + 4);     // color planes
    ico.writeUInt16LE(32, base + 6);    // bits per pixel
    ico.writeUInt32LE(pngBuffers[i].length, base + 8);  // bytes in resource
    ico.writeUInt32LE(offsets[i], base + 12);           // offset of image data
  }

  // Copy PNG data
  for (let i = 0; i < count; i++) {
    pngBuffers[i].copy(ico, offsets[i]);
  }

  return ico;
}

async function main() {
  const icoSizes = [16, 32, 48];
  const pngBuffers = await Promise.all(icoSizes.map(generatePng));

  // Write favicon.ico
  const ico = createIco(pngBuffers, icoSizes);
  writeFileSync(`${appDir}/favicon.ico`, ico);
  console.log('✓ favicon.ico written');

  // Write icon.png (192x192) — used by Next.js App Router for <link rel="icon">
  const icon192 = await generatePng(192);
  writeFileSync(`${appDir}/icon.png`, icon192);
  console.log('✓ icon.png (192×192) written');

  // Write apple-icon.png (180x180) — Apple touch icon
  const apple180 = await generatePng(180);
  writeFileSync(`${appDir}/apple-icon.png`, apple180);
  console.log('✓ apple-icon.png (180×180) written');

  // Write icon.svg — best quality for modern browsers
  writeFileSync(`${appDir}/icon.svg`, svgIcon);
  console.log('✓ icon.svg written');
}

main().catch((err) => { console.error(err); process.exit(1); });
