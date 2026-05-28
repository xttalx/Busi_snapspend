import { getUserFromRequest, unauthorized, badRequest } from "@/lib/billing/auth";
import { isBillingConfigured } from "@/lib/billing/config";
import { getCustomerPortalUrl } from "@/lib/billing/lemonsqueezy";
import { getSupabaseAdmin } from "@/lib/billing/supabase-admin";

/** Lemon Squeezy customer portal — manage subscription & payment method. */
export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return unauthorized();
  if (!isBillingConfigured()) return badRequest("Billing is not configured.");

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("billing_profiles")
    .select("ls_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.ls_customer_id) {
    return badRequest("No billing profile found. Complete checkout first.");
  }

  const portalUrl = await getCustomerPortalUrl(profile.ls_customer_id);
  return Response.json({ portalUrl });
}
