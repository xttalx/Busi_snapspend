import { getUserFromRequest, unauthorized, badRequest } from "@/lib/billing/auth";
import { getLemonConfig, getSiteUrl, isBillingConfigured } from "@/lib/billing/config";
import { createCheckout } from "@/lib/billing/lemonsqueezy";
import { getSupabaseAdmin } from "@/lib/billing/supabase-admin";

type CheckoutBody = {
  plan?: "pro" | "pay_per_download" | "card_setup";
};

/** Start Lemon Squeezy checkout — Pro subscription or pay-per-download card setup at signup. */
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return unauthorized();
  if (!isBillingConfigured()) return badRequest("Billing is not configured on this server.");

  const body = (await request.json()) as CheckoutBody;
  const plan = body.plan;
  if (!plan || !["pro", "pay_per_download", "card_setup"].includes(plan)) {
    return badRequest("Invalid plan. Use pro, pay_per_download, or card_setup.");
  }

  const cfg = getLemonConfig();
  const site = getSiteUrl();
  let variantId = cfg.variantProMonthly;
  let redirectUrl = `${site}/?billing=subscription_success`;
  const custom: Record<string, string> = { signup_plan: plan };

  if (plan === "pay_per_download" || plan === "card_setup") {
    variantId = cfg.variantCardSetup || cfg.variantPayPerDownload;
    redirectUrl = `${site}/?billing=card_setup_success`;
    custom.signup_plan = "pay_per_download";
  }

  const checkoutUrl = await createCheckout({
    variantId,
    email: user.email || "",
    userId: user.id,
    redirectUrl,
    custom,
  });

  const admin = getSupabaseAdmin();
  await admin.from("billing_profiles").upsert(
    {
      user_id: user.id,
      plan: plan === "pro" ? "pro" : "pay_per_download",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return Response.json({ checkoutUrl });
}
