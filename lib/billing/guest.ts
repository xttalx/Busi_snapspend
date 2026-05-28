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
    .maybeSingle();

  return data?.status === "paid";
}

export async function markGuestSessionPaid(
  admin: SupabaseClient,
  guestToken: string,
  documentId: string,
  orderId: string,
  transactionId?: string
) {
  const patch = {
    status: "paid",
    ls_order_id: orderId,
    updated_at: new Date().toISOString(),
  };

  if (transactionId) {
    await admin.from("guest_download_sessions").update(patch).eq("id", transactionId);
  }
  await admin
    .from("guest_download_sessions")
    .update(patch)
    .eq("guest_token", guestToken)
    .eq("document_id", documentId);
}
