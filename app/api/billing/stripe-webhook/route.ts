import { markGuestSessionPaid } from "@/lib/billing/guest";
import { getSupabaseAdmin } from "@/lib/billing/supabase-admin";
import { isStripeGuestConfigured, verifyStripeWebhook } from "@/lib/billing/stripe";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStripeGuestConfigured()) {
    return Response.json({ error: "Stripe not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = verifyStripeWebhook(rawBody, signature);
  } catch (err) {
    console.error("Stripe webhook signature failed:", err);
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return Response.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.metadata?.is_guest !== "true") {
    return Response.json({ received: true });
  }

  const guestToken = session.metadata.guest_token;
  const documentId = session.metadata.document_id;
  const transactionId = session.metadata.transaction_id;

  if (!guestToken || !documentId) {
    return Response.json({ error: "Missing guest metadata." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  await markGuestSessionPaid(
    admin,
    guestToken,
    documentId,
    session.id,
    transactionId || undefined,
    session.id
  );

  return Response.json({ received: true });
}
