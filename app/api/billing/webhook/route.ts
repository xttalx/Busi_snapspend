import { verifyWebhookSignature } from "@/lib/billing/lemonsqueezy";
import { getSupabaseAdmin } from "@/lib/billing/supabase-admin";
import { handleLemonWebhook } from "@/lib/billing/webhook-handlers";

export const runtime = "nodejs";

/** Lemon Squeezy webhook — subscription + order events. */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  try {
    if (!verifyWebhookSignature(rawBody, signature)) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch (e) {
    console.error("Webhook verification failed:", e);
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    await handleLemonWebhook(admin, payload as Parameters<typeof handleLemonWebhook>[1]);
    return Response.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return Response.json({ error: "Handler failed" }, { status: 500 });
  }
}
