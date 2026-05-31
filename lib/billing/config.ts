/** Billing constants — pay-per-download is 9.99 CAD (999 cents). Update Lemon Squeezy variant to match. */
export const BILLING = {
  currency: "CAD",
  proMonthly: 39.39,
  payPerDownload: 9.99,
  proMonthlyCents: 3939,
  payPerDownloadCents: 999,
} as const;

export type BillingPlan = "none" | "pro" | "pay_per_download";
export type DocumentType = "invoice" | "paystub";

const DEFAULT_SITE_URL = "https://martenbooks.com";

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  // Do not use VERCEL_URL — it exposes the legacy repo hostname (busi-snapspend.vercel.app).
  if (process.env.NODE_ENV === "production") {
    return DEFAULT_SITE_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function getLemonConfig() {
  return {
    apiKey: requireEnv("LEMONSQUEEZY_API_KEY"),
    storeId: requireEnv("LEMONSQUEEZY_STORE_ID"),
    webhookSecret: requireEnv("LEMONSQUEEZY_WEBHOOK_SECRET"),
    variantProMonthly: requireEnv("LEMONSQUEEZY_VARIANT_PRO_MONTHLY"),
    variantPayPerDownload: requireEnv("LEMONSQUEEZY_VARIANT_PAY_PER_DOWNLOAD"),
    /** Optional $0 checkout variant to capture card at signup for pay-per-download users */
    variantCardSetup: process.env.LEMONSQUEEZY_VARIANT_CARD_SETUP || "",
  };
}

export function isBillingConfigured(): boolean {
  return Boolean(
    process.env.LEMONSQUEEZY_API_KEY &&
      process.env.LEMONSQUEEZY_STORE_ID &&
      process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY &&
      process.env.LEMONSQUEEZY_VARIANT_PAY_PER_DOWNLOAD &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
