/**
 * Generates PWA icons from public/icons/logo.png (or logo-source.png).
 * Run: npm run icons:pwa
 */
import sharp from "sharp";
import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../public/icons");
const sourceCandidates = [
  join(outDir, "logo.png"),
  join(outDir, "logo-source.png"),
];

const source = sourceCandidates.find((p) => existsSync(p));
if (!source) {
  console.error("Missing public/icons/logo.png — add your app icon first.");
  process.exit(1);
}

async function resize(size, filename, options = {}) {
  let pipeline = sharp(source).resize(size, size, {
    fit: "contain",
    background: options.background || { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (options.extend) {
    const pad = Math.round(size * options.extend);
    pipeline = sharp(source)
      .resize(size - pad * 2, size - pad * 2, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: pad,
        bottom: pad,
        left: pad,
        right: pad,
        background: options.background || { r: 178, g: 78, b: 56, alpha: 1 },
      });
  }
  await pipeline.png().toFile(join(outDir, filename));
}

await mkdir(outDir, { recursive: true });
await resize(192, "icon-192.png");
await resize(512, "icon-512.png");
await resize(512, "icon-maskable-512.png", {
  extend: 0.12,
  background: { r: 178, g: 78, b: 56, alpha: 1 },
});
await resize(180, "apple-touch-icon.png");
console.log("Wrote PWA icons from", source);
