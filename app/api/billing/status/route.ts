import { getUserFromRequest, unauthorized } from "@/lib/billing/auth";
import { isBillingConfigured } from "@/lib/billing/config";
import { BILLING } from "@/lib/billing/config";
import { getBillingStatus } from "@/lib/billing/status";
import { getSupabaseAdmin } from "@/lib/billing/supabase-admin";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return unauthorized();

  if (!isBillingConfigured()) {
    return Response.json({
      configured: false,
      plan: "none",
      paymentMethodOnFile: true,
      proActive: false,
      subscriptionStatus: null,
      renewsAt: null,
      endsAt: null,
      lsCustomerId: null,
      pricing: BILLING,
      billingDisabled: true,
    });
  }

  const admin = getSupabaseAdmin();
  const status = await getBillingStatus(admin, user.id);
  return Response.json(status);
}
