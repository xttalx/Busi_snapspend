# Marten Bookkeeping — Paid Tier Setup (Lemon Squeezy)

This guide walks through enabling **Pro Monthly** ($39.39 CAD/mo) and **Pay-per-download** ($11.39 CAD per invoice/paystub PDF).

## Architecture

| Layer | Role |
|--------|------|
| **Supabase** | `billing_profiles`, `subscriptions`, `download_transactions`, `download_entitlements` |
| **Next.js API** | `/api/billing/*` — checkout, status, download authorization, webhooks |
| **Lemon Squeezy** | Subscriptions, one-time charges, customer portal, card capture |
| **Classic app** | `billing.jsx` — pricing UI, paywall, onboarding, settings |

## Step 1 — Run database migration

In **Supabase → SQL Editor**, run:

1. `supabase/schema.sql` (if not already applied)
2. `supabase/billing.sql`
3. `supabase/guest_billing.sql` (anonymous pay-per-download at `/invoice`)

## Step 2 — Create Lemon Squeezy products

In [Lemon Squeezy](https://app.lemonsqueezy.com):

### Pro Monthly (subscription)

- Product: **Marten Bookkeeping Pro**
- Price: **$39.39 CAD / month**, recurring
- Copy the **Variant ID** → `LEMONSQUEEZY_VARIANT_PRO_MONTHLY`

### Pay per download (one-time)

- Product: **Document download**
- Price: **$11.39 CAD**, single payment
- Copy the **Variant ID** → `LEMONSQUEEZY_VARIANT_PAY_PER_DOWNLOAD`
- Used by the public **invoice generator** at `/invoice` (no login) and by signed-in users downloading individual PDFs.

### Card setup at signup (optional — legacy pay-per-download accounts)

Create a **$0** (or $0.01) one-time product used only to collect a card when users choose pay-per-download:

- Product: **Payment method setup**
- Price: **$0 CAD** (or minimal amount if $0 is not allowed)
- Copy the **Variant ID** → `LEMONSQUEEZY_VARIANT_CARD_SETUP`

If you skip this, pay-per-download signup uses the download variant instead.

## Step 3 — Webhook

1. Lemon Squeezy → **Settings → Webhooks**
2. URL: `https://YOUR_DOMAIN/api/billing/webhook`
3. Signing secret → `LEMONSQUEEZY_WEBHOOK_SECRET`
4. Subscribe to events:
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `subscription_expired`
   - `subscription_resumed`
   - `order_created`

## Step 4 — Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=
LEMONSQUEEZY_VARIANT_PRO_MONTHLY=
LEMONSQUEEZY_VARIANT_PAY_PER_DOWNLOAD=
LEMONSQUEEZY_VARIANT_CARD_SETUP=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=https://martenbooks.com
```

On **Vercel**, add the same variables (including `SUPABASE_SERVICE_ROLE_KEY` — server only, never expose to the browser).

## Step 5 — Deploy & test

```bash
npm run dev
```

### Test flows

1. **Sign up** → billing onboarding → choose Pro or Pay-per-download → complete Lemon Squeezy checkout
2. **Pro user** → Invoices → Download PDF → no charge
3. **Pay-per-download user** → Download → paywall → pay $11.39 → redirect back → PDF downloads
4. **Settings → Billing & plan** → Upgrade / Manage billing (customer portal)

## User flows (summary)

```
Signup → BillingOnboarding (card required)
  ├─ Pro → LS subscription checkout → unlimited downloads
  └─ Pay-per-download → LS card setup checkout → $11.39 per PDF download

Download invoice/paystub
  ├─ Pro active → download immediately
  ├─ Entitlement exists → download immediately
  └─ Else → Paywall → LS checkout $11.39 → webhook → entitlement → download
```

## API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/billing/status` | Current plan, subscription, payment on file |
| POST | `/api/billing/checkout` | Body: `{ plan: "pro" \| "pay_per_download" \| "card_setup" }` |
| POST | `/api/billing/download` | Body: `{ documentType, documentId }` — authorize or return checkout URL |
| GET | `/api/billing/portal` | Lemon Squeezy customer portal URL |
| POST | `/api/billing/webhook` | Lemon Squeezy events (server only) |

All authenticated routes require `Authorization: Bearer <supabase_access_token>`.

## Stripe alternative

The same database schema works with Stripe. Replace `lib/billing/lemonsqueezy.ts` with Stripe Checkout + Customer Portal and map webhooks to the same tables. The classic app only talks to `/api/billing/*`.

## Troubleshooting

- **Downloads work without billing** — env vars missing; billing is disabled and downloads are allowed (dev mode).
- **Webhook 401** — check `LEMONSQUEEZY_WEBHOOK_SECRET` matches Lemon Squeezy.
- **Checkout missing user** — ensure `checkout_data.custom.user_id` is passed (handled by API).
- **Payment succeeded but no download** — verify `order_created` webhook and `download_entitlements` row for that document.
