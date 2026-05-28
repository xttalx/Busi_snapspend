import { getUserFromRequest, unauthorized, badRequest } from "@/lib/billing/auth";
import { BILLING, getSiteUrl, isBillingConfigured } from "@/lib/billing/config";
import { createCheckout } from "@/lib/billing/lemonsqueezy";
import { getBillingStatus, hasDownloadEntitlement } from "@/lib/billing/status";
import { getSupabaseAdmin } from "@/lib/billing/supabase-admin";
import { getLemonConfig } from "@/lib/billing/config";

type DownloadBody = {
  documentType?: "invoice" | "paystub";
  documentId?: string;
};

/**
 * Authorize a document download.
 * Pro subscribers → allowed immediately.
 * Pay-per-download → allowed if entitlement exists, else returns checkout URL.
 */
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return unauthorized();

  const body = (await request.json()) as DownloadBody;
  const documentType = body.documentType;
  const documentId = body.documentId;

  if (!documentType || !documentId || !["invoice", "paystub"].includes(documentType)) {
    return badRequest("documentType (invoice|paystub) and documentId are required.");
  }

  if (!isBillingConfigured()) {
    return Response.json({ allowed: true, reason: "billing_disabled" });
  }

  const admin = getSupabaseAdmin();
  const status = await getBillingStatus(admin, user.id);

  if (status.proActive) {
    return Response.json({ allowed: true, reason: "pro_subscription" });
  }

  if (!status.paymentMethodOnFile) {
    return Response.json({
      allowed: false,
      reason: "payment_required",
      needsCardSetup: true,
      message: "Add a payment method in Settings before downloading.",
    });
  }

  const entitled = await hasDownloadEntitlement(admin, user.id, documentType, documentId);
  if (entitled) {
    return Response.json({ allowed: true, reason: "already_purchased" });
  }

  const { data: tx, error: txErr } = await admin
    .from("download_transactions")
    .insert({
      user_id: user.id,
      document_type: documentType,
      document_id: documentId,
      amount_cents: BILLING.payPerDownloadCents,
      currency: BILLING.currency,
      status: "pending",
    })
    .select("id")
    .single();

  if (txErr || !tx) {
    console.error(txErr);
    return Response.json({ error: "Could not start download purchase." }, { status: 500 });
  }

  const cfg = getLemonConfig();
  const site = getSiteUrl();
  const checkoutUrl = await createCheckout({
    variantId: cfg.variantPayPerDownload,
    email: user.email || "",
    userId: user.id,
    redirectUrl: `${site}/?billing=download_ready&document_type=${documentType}&document_id=${encodeURIComponent(documentId)}`,
    custom: {
      document_type: documentType,
      document_id: documentId,
      transaction_id: tx.id,
    },
  });

  return Response.json({
    allowed: false,
    reason: "payment_required",
    checkoutUrl,
    amount: BILLING.payPerDownload,
    currency: BILLING.currency,
    transactionId: tx.id,
  });
}
