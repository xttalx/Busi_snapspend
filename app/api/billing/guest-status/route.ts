import { badRequest } from "@/lib/billing/auth";
import { isBillingConfigured } from "@/lib/billing/config";
import { isGuestDownloadPaid, markGuestSessionPaid } from "@/lib/billing/guest";
import { getSupabaseAdmin } from "@/lib/billing/supabase-admin";
import { isStripeGuestConfigured, verifyGuestStripeSession } from "@/lib/billing/stripe";

function isGuestCheckoutConfigured(): boolean {
  return isStripeGuestConfigured() || isBillingConfigured();
}

/** Check if a guest invoice download has been paid for (no login). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const guestToken = searchParams.get("guest_token")?.trim();
  const documentId = searchParams.get("document_id")?.trim();
  const sessionId = searchParams.get("session_id")?.trim();

  if (!guestToken || !documentId) {
    return badRequest("guest_token and document_id are required.");
  }

  if (!isGuestCheckoutConfigured()) {
    return Response.json({ allowed: true, reason: "billing_disabled" });
  }

  const admin = getSupabaseAdmin();
  let allowed = await isGuestDownloadPaid(admin, guestToken, documentId);

  let resolvedGuest = guestToken;
  let resolvedDoc = documentId;

  if (!allowed && sessionId && isStripeGuestConfigured()) {
    try {
      const verified = await verifyGuestStripeSession(sessionId);
      if (verified.paid && verified.guestToken && verified.documentId) {
        await markGuestSessionPaid(
          admin,
          verified.guestToken,
          verified.documentId,
          sessionId,
          verified.transactionId,
          sessionId
        );
        allowed = true;
        resolvedGuest = verified.guestToken;
        resolvedDoc = verified.documentId;
      }
    } catch (err) {
      console.error("Stripe session verify failed:", err);
    }
  }

  return Response.json({
    allowed,
    reason: allowed ? "paid" : "pending",
    guestToken: allowed ? resolvedGuest : undefined,
    documentId: allowed ? resolvedDoc : undefined,
  });
}
