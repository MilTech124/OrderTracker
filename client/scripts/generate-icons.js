// Generuje placeholderowe ikony PWA (mapowa pinezka na tle marki #4f46e5).
// Czysty Node: własny encoder PNG + zlib. Uruchom: node scripts/generate-icons.js
import zlib from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');
mkdirSync(PUBLIC, { recursive: true });

// --- kolory marki ---
const BG = [79, 70, 229]; // #4f46e5
const WHITE = [255, 255, 255];

// --- CRC32 (tablica) ---
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // scanlines z filtrem 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- rysowanie pinezki (supersampling 3x dla wygładzenia) ---
function drawIcon(size, scale = 1) {
  const SS = 3;
  const N = size * SS;
  const buf = Buffer.alloc(N * N * 4);

  // geometria pinezki (w przestrzeni 0..1), przeskalowana współczynnikiem `scale`
  const cx = 0.5, cy = 0.42, r = 0.24 * scale;
  const apexY = 0.82;
  const baseY = cy + r * 0.45;
  const baseHalf = r * 0.62;
  const holeR = r * 0.42;

  // wyśrodkowanie po przeskalowaniu (maskable: mniejszy, w bezpiecznej strefie)
  const off = (1 - scale) * 0.0; // pin już wyśrodkowany w pionie wokół ~0.5

  const inCircle = (x, y, ox, oy, rad) => {
    const dx = x - ox, dy = y - oy;
    return dx * dx + dy * dy <= rad * rad;
  };
  const inTriangle = (x, y) => {
    if (y < cy || y > apexY) return false;
    const t = (y - cy) / (apexY - cy); // 0 u góry, 1 w wierzchołku
    const half = baseHalf * (1 - t);
    return Math.abs(x - cx) <= half;
  };

  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      const x = px / N;
      const y = py / N + off;
      let color = BG;
      const head = inCircle(x, y, cx, cy, r);
      const tail = inTriangle(x, y);
      if (head || tail) {
        color = WHITE;
        if (inCircle(x, y, cx, cy, holeR)) color = BG;
      }
      const i = (py * N + px) * 4;
      buf[i] = color[0];
      buf[i + 1] = color[1];
      buf[i + 2] = color[2];
      buf[i + 3] = 255;
    }
  }

  // downsample SSxSS -> 1
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r0 = 0, g0 = 0, b0 = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * N + (x * SS + sx)) * 4;
          r0 += buf[i]; g0 += buf[i + 1]; b0 += buf[i + 2];
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      out[o] = Math.round(r0 / n);
      out[o + 1] = Math.round(g0 / n);
      out[o + 2] = Math.round(b0 / n);
      out[o + 3] = 255;
    }
  }
  return encodePNG(size, size, out);
}

const targets = [
  ['pwa-192x192.png', 192, 1],
  ['pwa-512x512.png', 512, 1],
  ['maskable-512x512.png', 512, 0.7], // mniejszy pin = bezpieczna strefa
  ['apple-touch-icon-180x180.png', 180, 1],
  ['favicon-32x32.png', 32, 1],
];
for (const [name, size, scale] of targets) {
  writeFileSync(join(PUBLIC, name), drawIcon(size, scale));
  console.log('✓', name);
}
console.log('Gotowe — ikony w client/public/');
