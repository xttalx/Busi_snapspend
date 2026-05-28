import { badRequest } from "@/lib/billing/auth";
import { isBillingConfigured } from "@/lib/billing/config";
import { isGuestDownloadPaid } from "@/lib/billing/guest";
import { getSupabaseAdmin } from "@/lib/billing/supabase-admin";

/** Check if a guest invoice download has been paid for (no login). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const guestToken = searchParams.get("guest_token")?.trim();
  const documentId = searchParams.get("document_id")?.trim();

  if (!guestToken || !documentId) {
    return badRequest("guest_token and document_id are required.");
  }

  if (!isBillingConfigured()) {
    return Response.json({ allowed: true, reason: "billing_disabled" });
  }

  const admin = getSupabaseAdmin();
  const allowed = await isGuestDownloadPaid(admin, guestToken, documentId);

  return Response.json({ allowed, reason: allowed ? "paid" : "pending" });
}
