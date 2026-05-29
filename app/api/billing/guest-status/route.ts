import { badRequest } from "@/lib/billing/auth";
import { isBillingConfigured } from "@/lib/billing/config";
import { getGuestDownloadState, markGuestSessionPaid } from "@/lib/billing/guest";
import { getSupabaseAdmin } from "@/lib/billing/supabase-admin";
import { isStripeGuestConfigured, verifyGuestStripeSession } from "@/lib/billing/stripe";

function isGuestCheckoutConfigured(): boolean {
  return isStripeGuestConfigured() || isBillingConfigured();
}

/** Check if a guest may download (paid once, not yet downloaded). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const guestToken = searchParams.get("guest_token")?.trim();
  const documentId = searchParams.get("document_id")?.trim();
  const sessionId = searchParams.get("session_id")?.trim();

  if (!guestToken || !documentId) {
    return badRequest("guest_token and document_id are required.");
  }

  if (!isGuestCheckoutConfigured()) {
    return Response.json({
      allowed: true,
      paid: true,
      downloaded: false,
      reason: "billing_disabled",
    });
  }

  const admin = getSupabaseAdmin();
  let resolvedGuest = guestToken;
  let resolvedDoc = documentId;

  let state = await getGuestDownloadState(admin, guestToken, documentId);

  if (!state.allowed && sessionId && isStripeGuestConfigured()) {
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
        resolvedGuest = verified.guestToken;
        resolvedDoc = verified.documentId;
        state = await getGuestDownloadState(admin, resolvedGuest, resolvedDoc);
      }
    } catch (err) {
      console.error("Stripe session verify failed:", err);
    }
  }

  const reason = state.allowed
    ? "ready"
    : state.downloaded
      ? "already_downloaded"
      : "pending";

  return Response.json({
    allowed: state.allowed,
    paid: state.paid,
    downloaded: state.downloaded,
    reason,
    guestToken: state.paid ? resolvedGuest : undefined,
    documentId: state.paid ? resolvedDoc : undefined,
  });
}
