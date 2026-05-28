import crypto from "crypto";
import { getLemonConfig, getSiteUrl } from "./config";

type CheckoutParams = {
  variantId: string;
  email: string;
  userId: string;
  redirectUrl?: string;
  custom?: Record<string, string>;
};

type LemonCheckoutResponse = {
  data?: {
    attributes?: {
      url?: string;
    };
  };
};

/** Create a Lemon Squeezy hosted checkout session. */
export async function createCheckout(params: CheckoutParams): Promise<string> {
  const cfg = getLemonConfig();
  const redirectUrl = params.redirectUrl || `${getSiteUrl()}/?billing=success`;

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email: params.email,
          custom: {
            user_id: params.userId,
            ...params.custom,
          },
        },
        product_options: {
          redirect_url: redirectUrl,
        },
      },
      relationships: {
        store: { data: { type: "stores", id: cfg.storeId } },
        variant: { data: { type: "variants", id: params.variantId } },
      },
    },
  };

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as LemonCheckoutResponse & { errors?: unknown };
  if (!res.ok) {
    console.error("Lemon Squeezy checkout error:", json);
    throw new Error("Could not create checkout session.");
  }

  const url = json.data?.attributes?.url;
  if (!url) throw new Error("Checkout URL missing from Lemon Squeezy response.");
  return url;
}

/** Customer portal for subscription management (cancel, update card). */
export async function getCustomerPortalUrl(customerId: string): Promise<string> {
  const cfg = getLemonConfig();
  const res = await fetch(
    `https://api.lemonsqueezy.com/v1/customers/${customerId}`,
    {
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
    }
  );

  const json = (await res.json()) as {
    data?: { attributes?: { urls?: { customer_portal?: string } } };
  };
  if (!res.ok) {
    console.error("Lemon Squeezy customer error:", json);
    throw new Error("Could not load customer portal.");
  }

  const portal = json.data?.attributes?.urls?.customer_portal;
  if (!portal) throw new Error("Customer portal URL not available.");
  return portal;
}

/** Verify webhook signature (X-Signature header). */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = getLemonConfig().webhookSecret;
  if (!signature) return false;

  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}
