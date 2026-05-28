import type { SupabaseClient } from "@supabase/supabase-js";
import { BILLING, type BillingPlan } from "./config";

export type BillingStatus = {
  configured: boolean;
  plan: BillingPlan;
  paymentMethodOnFile: boolean;
  proActive: boolean;
  subscriptionStatus: string | null;
  renewsAt: string | null;
  endsAt: string | null;
  lsCustomerId: string | null;
  pricing: typeof BILLING;
};

const ACTIVE_SUB_STATUSES = new Set(["active", "on_trial", "past_due"]);

export async function getBillingStatus(
  admin: SupabaseClient,
  userId: string
): Promise<BillingStatus> {
  const base: BillingStatus = {
    configured: true,
    plan: "none",
    paymentMethodOnFile: false,
    proActive: false,
    subscriptionStatus: null,
    renewsAt: null,
    endsAt: null,
    lsCustomerId: null,
    pricing: BILLING,
  };

  const { data: profile } = await admin
    .from("billing_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile) {
    base.plan = profile.plan as BillingPlan;
    base.paymentMethodOnFile = profile.payment_method_on_file;
    base.lsCustomerId = profile.ls_customer_id;
  }

  const { data: sub } = await admin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sub) {
    base.subscriptionStatus = sub.status;
    base.renewsAt = sub.renews_at;
    base.endsAt = sub.ends_at;
    base.proActive = ACTIVE_SUB_STATUSES.has(sub.status);
    if (base.proActive) base.plan = "pro";
  }

  return base;
}

export async function hasDownloadEntitlement(
  admin: SupabaseClient,
  userId: string,
  documentType: string,
  documentId: string
): Promise<boolean> {
  const { data } = await admin
    .from("download_entitlements")
    .select("id")
    .eq("user_id", userId)
    .eq("document_type", documentType)
    .eq("document_id", documentId)
    .maybeSingle();
  return Boolean(data);
}
