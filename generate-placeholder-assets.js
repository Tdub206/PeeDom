#!/usr/bin/env node
/**
 * generate-placeholder-assets.js
 *
 * Creates the required native asset files if they don't already exist.
 * expo prebuild fails without: assets/icon.png, assets/splash.png, assets/adaptive-icon.png
 *
 * These are solid-color placeholders — replace them with real artwork before
 * submitting to any app store.
 *
 * Usage:
 *   node generate-placeholder-assets.js
 */

const fs   = require('fs');
const path = require('path');

// Minimal valid PNG files (1x1 pixel, various colors) encoded as base64
// Generated with: python3 -c "import base64,struct,zlib; ..."
// Color: #2563EB (Pee-Dom primary blue)

function buildPng(width, height, r, g, b) {
  // PNG signature
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);

  // IHDR chunk
  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const crcData = Buffer.concat([typeBytes, data]);
    const crc = Buffer.alloc(4);
    crc.writeInt32BE(crc32(crcData), 0);
    return Buffer.concat([len, typeBytes, data, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8]  = 8;  // bit depth
  ihdr[9]  = 2;  // color type: RGB
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // Build raw image data: one row filter byte + RGB * width per row
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const base = y * rowSize;
    raw[base] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      raw[base + 1 + x * 3 + 0] = r;
      raw[base + 1 + x * 3 + 1] = g;
      raw[base + 1 + x * 3 + 2] = b;
    }
  }

  const zlib = require('zlib');
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const idat = compressed;
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', iend),
  ]);
}

// Simple CRC32 implementation for PNG chunks
function crc32(buf) {
  const table = makeCrcTable();
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) | 0;
}

let _crcTable = null;
function makeCrcTable() {
  if (_crcTable) return _crcTable;
  _crcTable = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    _crcTable[n] = c;
  }
  return _crcTable;
}

// ── Asset definitions ──────────────────────────────────────────────────────────

const ASSETS = [
  {
    path: 'assets/icon.png',
    width: 1024,
    height: 1024,
    r: 37, g: 99, b: 235,   // #2563EB
    description: 'App icon (1024x1024)',
  },
  {
    path: 'assets/splash.png',
    width: 1284,
    height: 2778,
    r: 255, g: 255, b: 255, // #FFFFFF
    description: 'Splash screen (1284x2778)',
  },
  {
    path: 'assets/adaptive-icon.png',
    width: 1024,
    height: 1024,
    r: 37, g: 99, b: 235,   // #2563EB
    description: 'Adaptive icon foreground (1024x1024)',
  },
  {
    path: 'assets/favicon.png',
    width: 48,
    height: 48,
    r: 37, g: 99, b: 235,
    description: 'Web favicon (48x48)',
  },
];

// ── Generate ───────────────────────────────────────────────────────────────────

const assetsDir = path.join(process.cwd(), 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
  console.log('Created assets/ directory');
}

let created = 0;
let skipped = 0;

for (const asset of ASSETS) {
  const fullPath = path.join(process.cwd(), asset.path);
  if (fs.existsSync(fullPath)) {
    console.log(`  SKIP  ${asset.path} (already exists)`);
    skipped++;
    continue;
  }

  const png = buildPng(asset.width, asset.height, asset.r, asset.g, asset.b);
  fs.writeFileSync(fullPath, png);
  console.log(`  CREATE ${asset.path} — ${asset.description}`);
  created++;
}

console.log('');
if (created > 0) {
  console.log(`Generated ${created} placeholder asset(s).`);
  console.log('Replace these with real artwork before submitting to any app store.');
} else {
  console.log(`All assets already exist (${skipped} skipped).`);
}
