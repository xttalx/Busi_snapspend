import type { SupabaseClient } from "@supabase/supabase-js";
import { markGuestSessionPaid } from "./guest";
type WebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: { user_id?: string };
  };
  data?: {
    id?: string;
    attributes?: Record<string, unknown>;
    relationships?: Record<string, unknown>;
  };
};

function customUserId(payload: WebhookPayload): string | null {
  const fromMeta = payload.meta?.custom_data?.user_id;
  if (fromMeta) return String(fromMeta);
  const attrs = payload.data?.attributes as { custom_data?: { user_id?: string } } | undefined;
  return attrs?.custom_data?.user_id ? String(attrs.custom_data.user_id) : null;
}

export async function handleLemonWebhook(admin: SupabaseClient, payload: WebhookPayload) {
  const event = payload.meta?.event_name || "";
  const userId = customUserId(payload);

  switch (event) {
    case "subscription_created":
    case "subscription_updated":
    case "subscription_resumed":
      await handleSubscriptionEvent(admin, payload, userId);
      break;
    case "subscription_cancelled":
    case "subscription_expired":
      await handleSubscriptionEnded(admin, payload, userId);
      break;
    case "order_created":
      await handleOrderCreated(admin, payload, userId);
      break;
    default:
      break;
  }
}

async function handleSubscriptionEvent(
  admin: SupabaseClient,
  payload: WebhookPayload,
  userId: string | null
) {
  const attrs = payload.data?.attributes || {};
  const subId = String(payload.data?.id || "");
  if (!subId || !userId) return;

  const status = String(attrs.status || "active");
  const customerId = String(attrs.customer_id || "");
  const variantId = String(attrs.variant_id || "");
  const renewsAt = attrs.renews_at ? String(attrs.renews_at) : null;
  const endsAt = attrs.ends_at ? String(attrs.ends_at) : null;

  await admin.from("subscriptions").upsert(
    {
      id: subId,
      user_id: userId,
      status,
      plan: "pro",
      variant_id: variantId,
      renews_at: renewsAt,
      ends_at: endsAt,
      raw: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  await admin.from("billing_profiles").upsert(
    {
      user_id: userId,
      plan: "pro",
      ls_customer_id: customerId || undefined,
      payment_method_on_file: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

async function handleSubscriptionEnded(
  admin: SupabaseClient,
  payload: WebhookPayload,
  userId: string | null
) {
  const subId = String(payload.data?.id || "");
  if (!subId) return;

  const status = String(payload.data?.attributes?.status || "cancelled");
  await admin
    .from("subscriptions")
    .update({ status, raw: payload, updated_at: new Date().toISOString() })
    .eq("id", subId);

  if (userId) {
    const { data: profile } = await admin
      .from("billing_profiles")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile?.plan === "pro") {
      await admin
        .from("billing_profiles")
        .update({ plan: "pay_per_download", updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    }
  }
}

async function handleOrderCreated(
  admin: SupabaseClient,
  payload: WebhookPayload,
  userId: string | null
) {
  const attrs = payload.data?.attributes || {};
  const orderId = String(payload.data?.id || "");
  const customerId = String(attrs.customer_id || "");
  const metaCustom = (payload.meta?.custom_data || {}) as Record<string, unknown>;
  const attrCustom = (attrs.custom_data || attrs.first_order_item || {}) as Record<string, unknown>;
  const custom = { ...metaCustom, ...attrCustom } as {
    user_id?: string;
    guest_token?: string;
    is_guest?: string | boolean;
    document_type?: string;
    document_id?: string;
    transaction_id?: string;
  };

  const isGuest = custom.is_guest === "true" || custom.is_guest === true;
  const guestToken = custom.guest_token ? String(custom.guest_token) : null;
  const documentId = custom.document_id ? String(custom.document_id) : null;

  if (isGuest && guestToken && documentId && orderId) {
    await markGuestSessionPaid(
      admin,
      guestToken,
      documentId,
      orderId,
      custom.transaction_id ? String(custom.transaction_id) : undefined
    );
    return;
  }

  const uid = userId || (custom.user_id ? String(custom.user_id) : null);
  if (!uid || !orderId) return;

  const documentType = custom.document_type;
  const documentIdGuest = custom.document_id;
  const transactionId = custom.transaction_id;

  if (transactionId) {
    await admin
      .from("download_transactions")
      .update({
        status: "paid",
        ls_order_id: orderId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId)
      .eq("user_id", uid);
  }

  if (documentType && documentIdGuest) {
    await admin.from("download_entitlements").upsert(
      {
        user_id: uid,
        document_type: documentType,
        document_id: documentIdGuest,
        transaction_id: transactionId || null,
      },
      { onConflict: "user_id,document_type,document_id" }
    );
  }

  const profilePatch: Record<string, unknown> = {
    user_id: uid,
    ls_customer_id: customerId || null,
    payment_method_on_file: true,
    updated_at: new Date().toISOString(),
  };
  if (documentType) {
    profilePatch.plan = "pay_per_download";
  }

  const { data: existing } = await admin
    .from("billing_profiles")
    .select("plan")
    .eq("user_id", uid)
    .maybeSingle();

  if (!existing) {
    profilePatch.plan = profilePatch.plan || "pay_per_download";
  } else if (!documentType && existing.plan === "none") {
    profilePatch.plan = "pay_per_download";
  }

  await admin.from("billing_profiles").upsert(profilePatch, { onConflict: "user_id" });
}
