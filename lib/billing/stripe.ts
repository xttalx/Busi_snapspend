import Stripe from "stripe";
import { BILLING, getSiteUrl, requireEnv } from "./config";

let client: Stripe | null = null;

export function isStripeGuestConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
      apiVersion: "2026-05-27.dahlia",
    });
  }
  return client;
}

type GuestCheckoutParams = {
  guestToken: string;
  documentId: string;
  transactionId: string;
  email?: string;
};

/** One-time Stripe Checkout for anonymous invoice PDF download. */
export async function createGuestStripeCheckout(
  params: GuestCheckoutParams
): Promise<{ checkoutUrl: string; sessionId: string }> {
  const stripe = getStripe();
  const site = getSiteUrl();
  const successUrl =
    `${site}/invoice?billing=download_ready` +
    `&guest_token=${encodeURIComponent(params.guestToken)}` +
    `&document_id=${encodeURIComponent(params.documentId)}` +
    `&session_id={CHECKOUT_SESSION_ID}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: params.email || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: BILLING.currency.toLowerCase(),
          unit_amount: BILLING.payPerDownloadCents,
          product_data: {
            name: "Invoice PDF download",
            description: "Marten Bookkeeping — pay per download",
          },
        },
      },
    ],
    metadata: {
      is_guest: "true",
      guest_token: params.guestToken,
      document_id: params.documentId,
      transaction_id: params.transactionId,
    },
    success_url: successUrl,
    cancel_url: `${site}/invoice?canceled=1`,
  });

  if (!session.url) throw new Error("Stripe checkout URL missing.");
  return { checkoutUrl: session.url, sessionId: session.id };
}

/** Confirm payment from success redirect when webhook has not fired yet. */
export async function verifyGuestStripeSession(sessionId: string): Promise<{
  paid: boolean;
  guestToken?: string;
  documentId?: string;
  transactionId?: string;
}> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return { paid: false };
  }

  const meta = session.metadata || {};
  return {
    paid: true,
    guestToken: meta.guest_token,
    documentId: meta.document_id,
    transactionId: meta.transaction_id,
  };
}

export function verifyStripeWebhook(rawBody: string, signature: string | null): Stripe.Event {
  const secret = requireEnv("STRIPE_WEBHOOK_SECRET");
  if (!signature) throw new Error("Missing Stripe signature.");
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}
