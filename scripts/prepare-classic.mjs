/**
 * Syncs the classic Marten Bookkeeping bundle into public/classic/ for PWA + Vercel deploy.
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const classicDir = join(root, "public", "classic");

const copyList = [
  "app.jsx",
  "api.js",
  "auth.jsx",
  "landing.jsx",
  "billing.jsx",
  "invoice-lite.jsx",
  "data.js",
  "documents.jsx",
  "icons.jsx",
  "screens-1.jsx",
  "screens-2.jsx",
  "styles.css",
  "supabase.js",
  "tweaks-panel.jsx",
  "supabase-config.example.js",
];

mkdirSync(classicDir, { recursive: true });

for (const file of copyList) {
  const src = join(root, file);
  if (existsSync(src)) {
    copyFileSync(src, join(classicDir, file));
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const localConfig = join(root, "supabase-config.js");

if (url && anonKey) {
  const body = `window.SUPABASE_CONFIG = {
  url: ${JSON.stringify(url)},
  anonKey: ${JSON.stringify(anonKey)},
};
`;
  writeFileSync(join(classicDir, "supabase-config.js"), body);
  console.log("Wrote public/classic/supabase-config.js from environment variables.");
} else if (existsSync(localConfig)) {
  copyFileSync(localConfig, join(classicDir, "supabase-config.js"));
  console.log("Copied local supabase-config.js to public/classic/.");
} else {
  console.warn(
    "No Supabase credentials found. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel, or add supabase-config.js locally."
  );
}

console.log("Classic app files synced to public/classic/.");
