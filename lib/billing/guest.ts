import type { SupabaseClient } from "@supabase/supabase-js";

export function createGuestToken(): string {
  return crypto.randomUUID();
}

export async function isGuestDownloadPaid(
  admin: SupabaseClient,
  guestToken: string,
  documentId: string
): Promise<boolean> {
  const { data } = await admin
    .from("guest_download_sessions")
    .select("status")
    .eq("guest_token", guestToken)
    .eq("document_id", documentId)
    .eq("document_type", "invoice")
    .maybeSingle();

  return data?.status === "paid";
}

export async function markGuestSessionPaid(
  admin: SupabaseClient,
  guestToken: string,
  documentId: string,
  orderRef: string,
  transactionId?: string,
  stripeSessionId?: string
) {
  const patch: Record<string, unknown> = {
    status: "paid",
    updated_at: new Date().toISOString(),
  };

  if (stripeSessionId) {
    patch.stripe_session_id = stripeSessionId;
  } else {
    patch.ls_order_id = orderRef;
  }

  if (transactionId) {
    await admin.from("guest_download_sessions").update(patch).eq("id", transactionId);
  }
  await admin
    .from("guest_download_sessions")
    .update(patch)
    .eq("guest_token", guestToken)
    .eq("document_id", documentId)
    .eq("document_type", "invoice");
}
