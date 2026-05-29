import { badRequest } from "@/lib/billing/auth";
import { isBillingConfigured } from "@/lib/billing/config";
import {
  getGuestDownloadState,
  markGuestSessionDownloaded,
} from "@/lib/billing/guest";
import { getSupabaseAdmin } from "@/lib/billing/supabase-admin";
import { isStripeGuestConfigured } from "@/lib/billing/stripe";

function isGuestCheckoutConfigured(): boolean {
  return isStripeGuestConfigured() || isBillingConfigured();
}

/** Record that the paid guest invoice PDF was downloaded (one per payment). */
export async function POST(request: Request) {
  if (!isGuestCheckoutConfigured()) {
    return Response.json({ ok: true, billingDisabled: true });
  }

  const body = (await request.json()) as {
    guestToken?: string;
    documentId?: string;
  };

  const guestToken = body.guestToken?.trim();
  const documentId = body.documentId?.trim();
  if (!guestToken || !documentId) {
    return badRequest("guestToken and documentId are required.");
  }

  const admin = getSupabaseAdmin();
  const state = await getGuestDownloadState(admin, guestToken, documentId);

  if (!state.paid) {
    return Response.json({ error: "Payment not found for this invoice." }, { status: 403 });
  }

  if (state.downloaded) {
    return Response.json({ ok: true, alreadyDownloaded: true });
  }

  await markGuestSessionDownloaded(admin, guestToken, documentId);
  return Response.json({ ok: true });
}
