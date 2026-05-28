import { badRequest } from "@/lib/billing/auth";
import { BILLING, getLemonConfig, getSiteUrl, isBillingConfigured } from "@/lib/billing/config";
import { createGuestToken } from "@/lib/billing/guest";
import { createCheckout } from "@/lib/billing/lemonsqueezy";
import { getSupabaseAdmin } from "@/lib/billing/supabase-admin";

type GuestCheckoutBody = {
  documentId?: string;
  guestToken?: string;
  email?: string;
};

/** Start pay-per-download checkout for anonymous invoice generator (no login). */
export async function POST(request: Request) {
  if (!isBillingConfigured()) {
    return badRequest("Billing is not configured on this server.");
  }

  const body = (await request.json()) as GuestCheckoutBody;
  const documentId = body.documentId?.trim();
  if (!documentId) return badRequest("documentId is required.");

  const guestToken = body.guestToken?.trim() || createGuestToken();
  const admin = getSupabaseAdmin();
  const cfg = getLemonConfig();
  const site = getSiteUrl();

  const { data: session, error: sessionErr } = await admin
    .from("guest_download_sessions")
    .upsert(
      {
        guest_token: guestToken,
        document_id: documentId,
        document_type: "invoice",
        amount_cents: BILLING.payPerDownloadCents,
        currency: BILLING.currency,
        status: "pending",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "guest_token,document_id,document_type" }
    )
    .select("id")
    .single();

  if (sessionErr || !session) {
    console.error(sessionErr);
    return Response.json({ error: "Could not start checkout." }, { status: 500 });
  }

  const redirectUrl = `${site}/invoice?billing=download_ready&guest_token=${encodeURIComponent(guestToken)}&document_id=${encodeURIComponent(documentId)}`;

  const checkoutUrl = await createCheckout({
    variantId: cfg.variantPayPerDownload,
    email: body.email?.trim() || "",
    userId: guestToken,
    redirectUrl,
    custom: {
      is_guest: "true",
      guest_token: guestToken,
      document_type: "invoice",
      document_id: documentId,
      transaction_id: session.id,
    },
  });

  return Response.json({ checkoutUrl, guestToken, transactionId: session.id });
}
