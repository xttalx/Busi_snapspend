/* Billing — Lemon Squeezy paywall, pricing, subscription management */
(function () {
  const PRICING = window.SEED?.BILLING || {
    currency: "CAD",
    proMonthly: 39.39,
    payPerDownload: 11.39,
  };

  async function getAccessToken() {
    const sb = window.MartenSupabase?.getClient?.();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data?.session?.access_token || null;
  }

  async function billingFetch(path, options = {}) {
    const token = await getAccessToken();
    if (!token) throw new Error("Not signed in.");

    const res = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Billing request failed.");
    return json;
  }

  const MartenBilling = {
    PRICING,

    async getStatus() {
      return billingFetch("/api/billing/status");
    },

    async startCheckout(plan) {
      const { checkoutUrl } = await billingFetch("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      return checkoutUrl;
    },

    async getPortalUrl() {
      const { portalUrl } = await billingFetch("/api/billing/portal");
      return portalUrl;
    },

    /** Returns { allowed, checkoutUrl?, needsCardSetup?, message? } */
    async authorizeDownload(documentType, documentId) {
      return billingFetch("/api/billing/download", {
        method: "POST",
        body: JSON.stringify({ documentType, documentId }),
      });
    },

    formatMoney(amount) {
      return new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: PRICING.currency || "CAD",
      }).format(amount);
    },

    isProActive(status) {
      return Boolean(status?.proActive);
    },

    needsPaymentSetup(status) {
      if (status?.billingDisabled) return false;
      return Boolean(status?.configured && !status?.paymentMethodOnFile);
    },
  };

  window.MartenBilling = MartenBilling;

  /* ---------- Pricing cards (landing + upgrade) ---------- */
  function PricingCards({ onSelectPlan, compact = false, currentPlan = null }) {
    const proPrice = MartenBilling.formatMoney(PRICING.proMonthly);
    const dlPrice = MartenBilling.formatMoney(PRICING.payPerDownload);

    return (
      <div className={"pricing-grid " + (compact ? "compact" : "")}>
        <article className={"pricing-card " + (currentPlan === "pro" ? "current" : "")}>
          <p className="pricing-kicker">Best value</p>
          <h3>Pro Monthly</h3>
          <p className="pricing-amount">
            {proPrice}<span>/month</span>
          </p>
          <ul className="pricing-features">
            <li><Icon name="check" size={14} /> Unlimited invoice &amp; paystub downloads</li>
            <li><Icon name="check" size={14} /> Full workspace — expenses, payroll, reports</li>
            <li><Icon name="check" size={14} /> Cancel anytime from Settings</li>
          </ul>
          {onSelectPlan && (
            <button type="button" className="btn primary pricing-cta" onClick={() => onSelectPlan("pro")}>
              {currentPlan === "pro" ? "Current plan" : "Subscribe to Pro"}
            </button>
          )}
        </article>

        <article className={"pricing-card " + (currentPlan === "pay_per_download" ? "current" : "")}>
          <p className="pricing-kicker">Flexible</p>
          <h3>Pay per download</h3>
          <p className="pricing-amount">
            {dlPrice}<span>/download</span>
          </p>
          <ul className="pricing-features">
            <li><Icon name="check" size={14} /> Card required at signup</li>
            <li><Icon name="check" size={14} /> Pay only when you export a PDF</li>
            <li><Icon name="check" size={14} /> Upgrade to Pro anytime</li>
          </ul>
          {onSelectPlan && (
            <button type="button" className="btn pricing-cta" onClick={() => onSelectPlan("pay_per_download")}>
              {currentPlan === "pay_per_download" ? "Current plan" : "Choose pay per download"}
            </button>
          )}
        </article>
      </div>
    );
  }

  /* ---------- Paywall modal (per-download charge) ---------- */
  function PaywallModal({ open, onClose, documentType, documentId, onProceed, busy }) {
    if (!open) return null;
    const label = documentType === "paystub" ? "pay statement" : "invoice";
    const price = MartenBilling.formatMoney(PRICING.payPerDownload);

    return (
      <>
        <div className="modal-scrim" onClick={onClose}></div>
        <div className="modal billing-modal">
          <div className="modal-head">
            <div>
              <div className="kicker">Download</div>
              <h3>Export this {label}?</h3>
              <p className="modal-sub">
                Pro members download free. On the pay-per-download plan, each PDF export is {price} (CAD).
              </p>
            </div>
            <button type="button" className="iconbtn" onClick={onClose} aria-label="Close">
              <Icon name="close" />
            </button>
          </div>
          <div className="modal-body">
            <div className="billing-paywall-price">
              <span className="billing-paywall-label">Due now</span>
              <strong>{price}</strong>
            </div>
            <p className="help" style={{ margin: 0 }}>
              You&apos;ll complete payment securely via Lemon Squeezy, then your download starts automatically.
            </p>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="button" className="btn primary" onClick={onProceed} disabled={busy}>
              {busy ? "Redirecting…" : <>Pay {price} &amp; download</>}
            </button>
          </div>
        </div>
      </>
    );
  }

  /* ---------- Upgrade modal ---------- */
  function UpgradeModal({ open, onClose, billingStatus, toast }) {
    const [busy, setBusy] = React.useState(null);

    if (!open) return null;

    const start = async (plan) => {
      setBusy(plan);
      try {
        const url = await MartenBilling.startCheckout(plan);
        window.location.href = url;
      } catch (e) {
        toast(e.message || "Could not start checkout.");
        setBusy(null);
      }
    };

    return (
      <>
        <div className="modal-scrim" onClick={onClose}></div>
        <div className="modal billing-modal billing-modal-wide">
          <div className="modal-head">
            <div>
              <div className="kicker">Plans</div>
              <h3>Upgrade your workspace</h3>
              <p className="modal-sub">Choose unlimited Pro downloads or keep paying per export.</p>
            </div>
            <button type="button" className="iconbtn" onClick={onClose}><Icon name="close" /></button>
          </div>
          <div className="modal-body">
            <PricingCards
              onSelectPlan={start}
              compact
              currentPlan={billingStatus?.proActive ? "pro" : billingStatus?.plan}
            />
          </div>
        </div>
      </>
    );
  }

  /* ---------- Post-signup: card required ---------- */
  function BillingOnboarding({ email, onComplete, toast }) {
    const [busy, setBusy] = React.useState(null);

    const start = async (plan) => {
      setBusy(plan);
      try {
        const checkoutPlan = plan === "pro" ? "pro" : "card_setup";
        const url = await MartenBilling.startCheckout(checkoutPlan);
        window.location.href = url;
      } catch (e) {
        toast(e.message || "Could not start checkout.");
        setBusy(null);
      }
    };

    return (
      <div className="billing-onboarding">
        <div className="billing-onboarding-inner">
          <p className="landing-kicker">One more step</p>
          <h1>Add your payment method</h1>
          <p className="billing-onboarding-lead">
            Choose how you&apos;d like to pay. A card is required for all accounts — even pay-per-download users.
            {email ? <> Signed in as <b>{email}</b>.</> : null}
          </p>
          <PricingCards onSelectPlan={start} currentPlan={null} />
          <p className="auth-footnote">
            Payments are processed securely by Lemon Squeezy. You can change or cancel your plan in Settings.
          </p>
          {onComplete && (
            <button type="button" className="btn ghost" style={{ marginTop: 16 }} onClick={onComplete}>
              Skip for now (downloads disabled)
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ---------- Settings: subscription management ---------- */
  function BillingSettings({ billingStatus, onRefresh, toast }) {
    const [busy, setBusy] = React.useState(false);
    const [upgradeOpen, setUpgradeOpen] = React.useState(false);

    if (billingStatus?.billingDisabled) {
      return (
        <div className="billing-settings-card">
          <p className="help">Billing is not configured on this server.</p>
        </div>
      );
    }

    const planLabel =
      billingStatus?.proActive ? "Pro Monthly (active)"
      : billingStatus?.plan === "pay_per_download" ? "Pay per download"
      : "No plan selected";

    const openPortal = async () => {
      setBusy(true);
      try {
        const url = await MartenBilling.getPortalUrl();
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (e) {
        toast(e.message || "Could not open billing portal.");
      } finally {
        setBusy(false);
      }
    };

    return (
      <>
        <div className="billing-settings-card">
          <div className="billing-settings-row">
            <div>
              <div className="kicker">Current plan</div>
              <strong className="billing-plan-name">{planLabel}</strong>
              {billingStatus?.proActive && billingStatus?.renewsAt && (
                <p className="help">Renews {new Date(billingStatus.renewsAt).toLocaleDateString()}</p>
              )}
              {billingStatus?.subscriptionStatus && !billingStatus?.proActive && (
                <p className="help">Subscription status: {billingStatus.subscriptionStatus}</p>
              )}
            </div>
            <div className="billing-settings-actions">
              {!billingStatus?.proActive && (
                <button type="button" className="btn primary" onClick={() => setUpgradeOpen(true)}>
                  Upgrade to Pro
                </button>
              )}
              {billingStatus?.paymentMethodOnFile && (
                <button type="button" className="btn" onClick={openPortal} disabled={busy}>
                  Manage billing
                </button>
              )}
              <button type="button" className="btn ghost" onClick={onRefresh} disabled={busy}>
                Refresh status
              </button>
            </div>
          </div>
          {!billingStatus?.paymentMethodOnFile && (
            <div className="auth-message" style={{ marginTop: 14 }}>
              Add a payment method to enable PDF downloads.
            </div>
          )}
          {billingStatus?.plan === "pay_per_download" && !billingStatus?.proActive && (
            <p className="help" style={{ marginTop: 12, marginBottom: 0 }}>
              Each invoice or paystub download is {MartenBilling.formatMoney(PRICING.payPerDownload)} CAD.
            </p>
          )}
        </div>
        <UpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          billingStatus={billingStatus}
          toast={toast}
        />
      </>
    );
  }

  window.PricingCards = PricingCards;
  window.PaywallModal = PaywallModal;
  window.UpgradeModal = UpgradeModal;
  window.BillingOnboarding = BillingOnboarding;
  window.BillingSettings = BillingSettings;
})();
