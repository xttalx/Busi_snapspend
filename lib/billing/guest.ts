import type { SupabaseClient } from "@supabase/supabase-js";

export type GuestDownloadState = {
  paid: boolean;
  downloaded: boolean;
  /** Paid and not yet downloaded — may export PDF once */
  allowed: boolean;
};

export function createGuestToken(): string {
  return crypto.randomUUID();
}

export async function getGuestDownloadState(
  admin: SupabaseClient,
  guestToken: string,
  documentId: string
): Promise<GuestDownloadState> {
  let data: { status?: string; downloaded_at?: string | null } | null = null;

  const full = await admin
    .from("guest_download_sessions")
    .select("status, downloaded_at")
    .eq("guest_token", guestToken)
    .eq("document_id", documentId)
    .eq("document_type", "invoice")
    .maybeSingle();

  if (full.error?.message?.includes("downloaded_at")) {
    const fallback = await admin
      .from("guest_download_sessions")
      .select("status")
      .eq("guest_token", guestToken)
      .eq("document_id", documentId)
      .eq("document_type", "invoice")
      .maybeSingle();
    data = fallback.data;
  } else {
    data = full.data;
  }

  const paid = data?.status === "paid";
  const downloaded = Boolean(data?.downloaded_at);
  return {
    paid,
    downloaded,
    allowed: paid && !downloaded,
  };
}

/** @deprecated Use getGuestDownloadState */
export async function isGuestDownloadPaid(
  admin: SupabaseClient,
  guestToken: string,
  documentId: string
): Promise<boolean> {
  const state = await getGuestDownloadState(admin, guestToken, documentId);
  return state.allowed;
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

export async function markGuestSessionDownloaded(
  admin: SupabaseClient,
  guestToken: string,
  documentId: string
) {
  await admin
    .from("guest_download_sessions")
    .update({
      downloaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("guest_token", guestToken)
    .eq("document_id", documentId)
    .eq("document_type", "invoice")
    .eq("status", "paid");
}
