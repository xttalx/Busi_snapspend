/**
 * Generates PWA icons into public/icons/.
 * Run: npm run icons:pwa
 */
import sharp from "sharp";
import { mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../public/icons");
const copper = { r: 184, g: 68, b: 42 };
const paper = { r: 251, g: 247, b: 239 };

async function solidPng(width, height, background, filename) {
  await sharp({
    create: { width, height, channels: 3, background },
  })
    .png()
    .toFile(join(outDir, filename));
}

async function brandedIcon(size, filename) {
  const mark = Math.round(size * 0.42);
  const pad = Math.round((size - mark) / 2);
  const svg = `<svg width="${mark}" height="${mark}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" rx="${Math.round(mark * 0.18)}" fill="rgb(251,247,239)"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
      font-family="Georgia, serif" font-size="${Math.round(mark * 0.52)}" fill="rgb(184,68,42)">S</text>
  </svg>`;
  await sharp({
    create: { width: size, height: size, channels: 4, background: { ...copper, alpha: 1 } },
  })
    .composite([{ input: Buffer.from(svg), left: pad, top: pad }])
    .png()
    .toFile(join(outDir, filename));
}

async function maskable512() {
  const size = 512;
  const inner = 340;
  const pad = (size - inner) / 2;
  const svg = `<svg width="${inner}" height="${inner}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" rx="64" fill="rgb(184,68,42)"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
      font-family="Georgia, serif" font-size="180" fill="rgb(251,247,239)">S</text>
  </svg>`;
  await sharp({
    create: { width: size, height: size, channels: 4, background: { ...copper, alpha: 1 } },
  })
    .composite([{ input: Buffer.from(svg), left: Math.round(pad), top: Math.round(pad) }])
    .png()
    .toFile(join(outDir, "icon-maskable-512.png"));
}

await mkdir(outDir, { recursive: true });
await brandedIcon(192, "icon-192.png");
await brandedIcon(512, "icon-512.png");
await maskable512();
await solidPng(180, 180, paper, "apple-touch-icon.png");
console.log("Wrote PWA icons to public/icons/");
