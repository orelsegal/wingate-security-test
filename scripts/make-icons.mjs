/**
 * Generates the PWA icons from code so a new subject app can re-brand
 * by changing colours here instead of shipping binary design files.
 *   node scripts/make-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { Buffer } from "node:buffer";

const NAVY = [20, 40, 66];
const WHITE = [255, 255, 255];
const ACCENT = [18, 134, 107];

function canvas(size, bg) {
  const px = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    px[i * 4] = bg[0];
    px[i * 4 + 1] = bg[1];
    px[i * 4 + 2] = bg[2];
    px[i * 4 + 3] = 255;
  }
  return px;
}

function rect(px, size, x, y, w, h, color, radius = 0) {
  for (let yy = Math.max(0, y); yy < Math.min(size, y + h); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(size, x + w); xx++) {
      if (radius > 0) {
        const cx = Math.min(Math.max(xx, x + radius), x + w - radius);
        const cy = Math.min(Math.max(yy, y + radius), y + h - radius);
        const d = Math.hypot(xx - cx, yy - cy);
        if (d > radius) continue;
      }
      const i = (yy * size + xx) * 4;
      px[i] = color[0];
      px[i + 1] = color[1];
      px[i + 2] = color[2];
      px[i + 3] = 255;
    }
  }
}

function png(size, px) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

/** Mark: three rising bars — progress through the units. */
function icon(size, { padding }) {
  const px = canvas(size, NAVY);
  const inner = size - padding * 2;
  const barW = Math.round(inner * 0.2);
  const gap = Math.round(inner * 0.1);
  const baseY = padding + inner;
  const heights = [0.42, 0.66, 0.92];
  const startX = padding + Math.round((inner - (barW * 3 + gap * 2)) / 2);
  heights.forEach((h, i) => {
    const barH = Math.round(inner * h);
    rect(
      px,
      size,
      startX + i * (barW + gap),
      baseY - barH,
      barW,
      barH,
      i === 2 ? ACCENT : WHITE,
      Math.round(barW / 2),
    );
  });
  return png(size, px);
}

const targets = [
  ["public/icons/icon-192.png", 192, Math.round(192 * 0.2)],
  ["public/icons/icon-512.png", 512, Math.round(512 * 0.2)],
  ["public/icons/icon-maskable-512.png", 512, Math.round(512 * 0.3)],
  ["public/icons/apple-touch-icon.png", 180, Math.round(180 * 0.2)],
];

for (const [file, size, padding] of targets) {
  writeFileSync(file, icon(size, { padding }));
  console.log("wrote", file);
}
