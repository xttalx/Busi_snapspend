/* Pay-per-download — invoice-only: fill form → preview → pay to download */
function InvoiceLiteScreen({ state, dispatch, business, toast, billingStatus, refreshBilling, onSignOut, params }) {
  const brand = window.SEED?.BRAND_NAME || "Marten Bookkeeping";
  const invoicePreviewRef = React.useRef(null);
  const [mode, setMode] = React.useState("edit");
  const [paywall, setPaywall] = React.useState({ open: false, checkoutUrl: null });
  const [paywallBusy, setPaywallBusy] = React.useState(false);

  const LITE_CLIENT_ID = "lite-client";
  const LITE_INVOICE_ID = "lite-invoice";

  React.useEffect(() => {
    const hasClient = state.clients.some((c) => c.id === LITE_CLIENT_ID);
    const hasInvoice = state.invoices.some((i) => i.id === LITE_INVOICE_ID);
    const today = new Date();
    const due = new Date(today.getTime() + 30 * 86400000);

    if (!hasClient) {
      dispatch({
        type: "ADD_CLIENT",
        client: {
          id: LITE_CLIENT_ID,
          name: "",
          contact: "",
          email: "",
          phone: "",
          address: "",
          country: business?.country || "Canada",
          taxId: "",
          notes: "",
          since: today.toISOString().slice(0, 7),
        },
      });
    }

    if (!hasInvoice) {
      dispatch({
        type: "ADD_INVOICE",
        invoice: {
          id: LITE_INVOICE_ID,
          number: "INV-0001",
          clientId: LITE_CLIENT_ID,
          date: today.toISOString().slice(0, 10),
          due: due.toISOString().slice(0, 10),
          status: "draft",
          items: [{ desc: "", sub: "", qty: 1, rate: 0 }],
          taxRate: business?.taxRate || 0,
          notes: business?.invoiceFooter || "",
          createdAt: new Date().toISOString(),
          statusHistory: [],
        },
      });
    }
  }, []);

  const inv = state.invoices.find((i) => i.id === LITE_INVOICE_ID);
  const client = state.clients.find((c) => c.id === LITE_CLIENT_ID);

  const updateClient = (patch) => {
    if (!client) return;
    dispatch({ type: "UPDATE_CLIENT", client: { ...client, ...patch } });
  };

  const updateInvoice = (patched) => {
    if (!inv) return;
    dispatch({ type: "UPDATE_INVOICE", invoice: patched });
  };

  const runDownload = async () => {
    if (window.MartenBilling?.validateInvoiceCheckout) {
      const validation = window.MartenBilling.validateInvoiceCheckout({
        business,
        client,
        invoice: inv,
      });
      if (!validation.ok) {
        toast(validation.message);
        if (validation.issues?.length > 1) {
          console.info(
            "Invoice validation:",
            validation.issues.map((i) => `${i.label}: ${i.message}`).join("; ")
          );
        }
        setMode("edit");
        return;
      }
    } else if (!inv || !client?.name?.trim()) {
      toast("Add your client's name before downloading.");
      setMode("edit");
      return;
    }
    if (mode !== "preview") {
      setMode("preview");
      await new Promise((r) => setTimeout(r, 220));
    }
    await window.downloadInvoicePdf({ invoice: inv, element: invoicePreviewRef.current });
    toast("Invoice PDF downloaded.");
    if (refreshBilling) refreshBilling();
  };

  const handleDownload = async () => {
    if (!inv) return;
    if (window.MartenBilling?.validateInvoiceCheckout) {
      const validation = window.MartenBilling.validateInvoiceCheckout({
        business,
        client,
        invoice: inv,
      });
      if (!validation.ok) {
        toast(validation.message);
        if (validation.issues?.length > 1) {
          console.info(
            "Invoice validation:",
            validation.issues.map((i) => `${i.label}: ${i.message}`).join("; ")
          );
        }
        setMode("edit");
        return;
      }
    }
    try {
      if (!window.MartenBilling || billingStatus?.billingDisabled) {
        await runDownload();
        return;
      }
      const auth = await window.MartenBilling.authorizeDownload("invoice", inv.id);
      if (auth.allowed) {
        await runDownload();
        return;
      }
      if (auth.needsCardSetup) {
        toast("Add a payment method first (refresh after checkout).");
        return;
      }
      if (auth.checkoutUrl) {
        setPaywall({ open: true, checkoutUrl: auth.checkoutUrl });
        return;
      }
      toast("Could not authorize download.");
    } catch (e) {
      toast(e.message || "Download failed.");
    }
  };

  React.useEffect(() => {
    if (!params?.billingDownload || !inv?.id) return;
    const pending = window.__pendingBillingDownload;
    if (pending && pending.documentId === inv.id) {
      delete window.__pendingBillingDownload;
      handleDownload();
    }
  }, [params?.billingDownload, inv?.id]);

  if (!inv || !client) {
    return <div className="invoice-lite-loading">Preparing invoice…</div>;
  }

  const dlPrice = window.MartenBilling?.formatPayPerDownload
    ? window.MartenBilling.formatPayPerDownload()
    : new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(
        window.SEED?.BILLING?.payPerDownload ?? 9.99
      );

  return (
    <div className="invoice-lite">
      <header className="invoice-lite-header">
        <div className="invoice-lite-brand">
          <BrandLogo size={40} showName name={brand} />
          <span className="invoice-lite-tag">Pay per download</span>
        </div>
        <div className="invoice-lite-header-actions">
          <button type="button" className="btn sm ghost" onClick={async () => {
            try {
              const url = await window.MartenBilling.startCheckout("pro");
              window.location.href = url;
            } catch (e) {
              toast(e.message || "Could not start upgrade.");
            }
          }}>
            Upgrade to Pro
          </button>
          {onSignOut && (
            <button type="button" className="btn sm ghost" onClick={onSignOut}>Sign out</button>
          )}
        </div>
      </header>

      <main className="invoice-lite-main">
        <div className="invoice-lite-intro">
          <h1>Create your invoice</h1>
          <p>Fill in the form, preview your invoice, then download the PDF for {dlPrice} (CAD).</p>
        </div>

        <div className="invoice-lite-steps">
          <button
            type="button"
            className={"btn sm " + (mode === "edit" ? "" : "ghost")}
            onClick={() => setMode("edit")}
          >
            1. Fill form
          </button>
          <button
            type="button"
            className={"btn sm " + (mode === "preview" ? "" : "ghost")}
            onClick={() => {
              if (!client.name?.trim()) {
                toast("Enter client name before preview.");
                return;
              }
              setMode("preview");
            }}
          >
            2. Preview
          </button>
          <button type="button" className="btn primary sm" onClick={handleDownload}>
            <Icon name="download" size={13} /> 3. Download PDF
          </button>
        </div>

        {mode === "edit" ? (
          <div className="invoice-lite-form">
            <section className="invoice-lite-section">
              <h2 className="invoice-lite-section-title">Your business</h2>
              <p className="help">Shown on the invoice header. Update anytime in a Pro workspace.</p>
              <div className="field">
                <label>Business name</label>
                <input className="input" value={business?.name || ""} disabled style={{ opacity: 0.7 }} />
              </div>
            </section>

            <section className="invoice-lite-section">
              <h2 className="invoice-lite-section-title">Bill to (client)</h2>
              <div className="field">
                <label>Client / company name</label>
                <input
                  className="input"
                  value={client.name}
                  onChange={(e) => updateClient({ name: e.target.value })}
                  placeholder="Acme Studio Inc."
                />
              </div>
              <div className="row-2">
                <div className="field">
                  <label>Contact</label>
                  <input
                    className="input"
                    value={client.contact || ""}
                    onChange={(e) => updateClient({ contact: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input
                    className="input"
                    type="email"
                    value={client.email || ""}
                    onChange={(e) => updateClient({ email: e.target.value })}
                  />
                </div>
              </div>
              <div className="field">
                <label>Address</label>
                <textarea
                  className="textarea"
                  value={client.address || ""}
                  onChange={(e) => updateClient({ address: e.target.value })}
                  rows={2}
                />
              </div>
            </section>

            <section className="invoice-lite-section">
              <h2 className="invoice-lite-section-title">Invoice details</h2>
              <InvoiceEditor
                invoice={inv}
                clients={[{ id: LITE_CLIENT_ID, name: client.name || "Client" }]}
                onChange={updateInvoice}
              />
            </section>
          </div>
        ) : (
          <div className="invoice-lite-preview">
            <div ref={invoicePreviewRef}>
              <InvoiceDocument invoice={inv} client={client} business={business} />
            </div>
            <div className="invoice-lite-preview-actions">
              <button type="button" className="btn" onClick={() => setMode("edit")}>
                <Icon name="edit" size={13} /> Edit form
              </button>
              <button type="button" className="btn primary" onClick={handleDownload}>
                <Icon name="download" size={13} /> Download PDF · {dlPrice}
              </button>
            </div>
          </div>
        )}
      </main>

      <PaywallModal
        open={paywall.open}
        onClose={() => setPaywall({ open: false, checkoutUrl: null })}
        documentType="invoice"
        documentId={inv.id}
        busy={paywallBusy}
        onProceed={() => {
          if (!paywall.checkoutUrl) return;
          setPaywallBusy(true);
          window.location.href = paywall.checkoutUrl;
        }}
      />
    </div>
  );
}

function PayPerDownloadSetup({ email, toast }) {
  const price = window.MartenBilling?.formatPayPerDownload
    ? window.MartenBilling.formatPayPerDownload()
    : new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(
        window.SEED?.BILLING?.payPerDownload ?? 9.99
      );
  const [busy, setBusy] = React.useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const url = await window.MartenBilling.startCheckout("card_setup");
      window.location.href = url;
    } catch (e) {
      toast(e.message || "Could not start checkout.");
      setBusy(false);
    }
  };

  return (
    <div className="billing-onboarding">
      <div className="billing-onboarding-inner">
        <p className="landing-kicker">Pay per download</p>
        <h1>Add your card to continue</h1>
        <p className="billing-onboarding-lead">
          You&apos;ll create one invoice at a time: fill the form, preview it, then download the PDF for {price} each time.
          {email ? <> Signed in as <b>{email}</b>.</> : null}
        </p>
        <ul className="pricing-features" style={{ marginBottom: 20 }}>
          <li><Icon name="check" size={14} /> Invoice builder only — no full workspace</li>
          <li><Icon name="check" size={14} /> Pay {price} per PDF download</li>
          <li><Icon name="check" size={14} /> Upgrade to Pro anytime for unlimited access</li>
        </ul>
        <button type="button" className="btn primary pricing-cta" onClick={start} disabled={busy}>
          {busy ? "Redirecting…" : "Add card & continue"}
        </button>
        <p className="auth-footnote">Secure checkout via Lemon Squeezy.</p>
      </div>
    </div>
  );
}

window.InvoiceLiteScreen = InvoiceLiteScreen;
window.PayPerDownloadSetup = PayPerDownloadSetup;
