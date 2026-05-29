/* Public invoice generator — no login: fill form → preview → pay → download */
const GUEST_DRAFT_KEY = "marten_guest_invoice_draft";
const GUEST_TOKEN_KEY = "marten_guest_token";

function guestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "g-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}

function getGuestToken() {
  try {
    let t = sessionStorage.getItem(GUEST_TOKEN_KEY);
    if (!t) {
      t = guestId();
      sessionStorage.setItem(GUEST_TOKEN_KEY, t);
    }
    return t;
  } catch (_e) {
    return guestId();
  }
}

function loadGuestDraft() {
  try {
    const raw = sessionStorage.getItem(GUEST_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_e) {
    return null;
  }
}

function saveGuestDraft(draft) {
  try {
    sessionStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(draft));
  } catch (_e) {}
}

/** Wait until the off-screen invoice preview is mounted (needed after Stripe redirect). */
function waitForPreviewElement(ref, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (ref.current) return resolve(ref.current);
      if (Date.now() - start > timeoutMs) {
        return reject(new Error("Invoice preview not ready. Click Pay & download to try again."));
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function defaultGuestWorkspace(documentId) {
  const today = new Date();
  const due = new Date(today.getTime() + 30 * 86400000);
  return {
    documentId,
    guestToken: getGuestToken(),
    business: {
      name: "",
      owner: "",
      email: "",
      address: "",
      businessNo: "",
      gstTaxId: "",
      country: "Canada",
      currency: "CAD ($)",
      terms: "Net 30",
      taxRate: 0.05,
      fy: "January",
      invoiceFooter: "",
    },
    client: {
      id: "guest-client",
      name: "",
      contact: "",
      email: "",
      phone: "",
      address: "",
      country: "Canada",
      taxId: "",
      notes: "",
      since: today.toISOString().slice(0, 7),
    },
    invoice: {
      id: documentId,
      number: "INV-0001",
      clientId: "guest-client",
      date: today.toISOString().slice(0, 10),
      due: due.toISOString().slice(0, 10),
      status: "draft",
      items: [{ desc: "", sub: "", qty: 1, rate: 0 }],
      taxRate: 0.05,
      notes: "",
      createdAt: new Date().toISOString(),
      statusHistory: [],
    },
  };
}

function GuestInvoiceApp() {
  const brand = window.SEED?.BRAND_NAME || "Marten Bookkeeping";
  const invoicePreviewRef = React.useRef(null);
  const [mode, setMode] = React.useState("edit");
  const [paywall, setPaywall] = React.useState({ open: false, checkoutUrl: null });
  const [paywallBusy, setPaywallBusy] = React.useState(false);
  const [toastMsg, setToastMsg] = React.useState(null);
  const [paidReady, setPaidReady] = React.useState(false);

  const [draft, setDraft] = React.useState(() => {
    const saved = loadGuestDraft();
    if (saved?.documentId && saved.invoice && saved.client && saved.business) {
      return { ...saved, guestToken: saved.guestToken || getGuestToken() };
    }
    const documentId = guestId();
    return defaultGuestWorkspace(documentId);
  });

  React.useEffect(() => {
    saveGuestDraft(draft);
  }, [draft]);

  const toast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const updateBusiness = (patch) => {
    setDraft((d) => ({ ...d, business: { ...d.business, ...patch } }));
  };

  const updateClient = (patch) => {
    setDraft((d) => ({ ...d, client: { ...d.client, ...patch } }));
  };

  const updateInvoice = (invoice) => {
    setDraft((d) => ({ ...d, invoice }));
  };

  const runDownload = async () => {
    const { invoice, client, business } = draft;
    if (!client.name?.trim()) {
      toast("Add your client's name before downloading.");
      setMode("edit");
      return;
    }
    if (!business.name?.trim()) {
      toast("Add your business name before downloading.");
      setMode("edit");
      return;
    }
    try {
      await waitForPreviewElement(invoicePreviewRef);
      await window.downloadInvoicePdf({ invoice, element: invoicePreviewRef.current });
      toast("Invoice PDF downloaded.");
    } catch (err) {
      console.error(err);
      toast(err?.message || "Download failed.");
      throw err;
    }
  };

  const waitForPayment = async (guestToken, documentId, stripeSessionId) => {
    if (!window.MartenBilling?.guestDownloadStatus) return false;
    for (let i = 0; i < 25; i++) {
      const status = await window.MartenBilling.guestDownloadStatus(
        guestToken,
        documentId,
        stripeSessionId
      );
      if (status.allowed) return true;
      await new Promise((r) => setTimeout(r, 2000));
    }
    return false;
  };

  const validateBeforeCheckout = () => {
    if (!window.MartenBilling?.validateInvoiceCheckout) return { ok: true };
    return window.MartenBilling.validateInvoiceCheckout({
      business: draft.business,
      client: draft.client,
      invoice: draft.invoice,
    });
  };

  const handleDownload = async () => {
    const { invoice, documentId, guestToken } = draft;
    if (!invoice) return;

    const validation = validateBeforeCheckout();
    if (!validation.ok) {
      toast(validation.message);
      setMode("edit");
      return;
    }

    try {
      if (!window.MartenBilling || !window.MartenBilling.guestCheckout) {
        await runDownload();
        return;
      }

      const status = await window.MartenBilling.guestDownloadStatus(guestToken, documentId);
      if (status.allowed) {
        setPaidReady(true);
        await runDownload();
        return;
      }

      const email = draft.business.email?.trim() || draft.client.email?.trim() || "";
      const { checkoutUrl, guestToken: token } = await window.MartenBilling.guestCheckout(
        documentId,
        guestToken,
        email
      );
      if (token && token !== guestToken) {
        setDraft((d) => ({ ...d, guestToken: token }));
        try { sessionStorage.setItem(GUEST_TOKEN_KEY, token); } catch (_e) {}
      }
      setPaywall({ open: true, checkoutUrl });
    } catch (e) {
      toast(e.message || "Download failed.");
    }
  };

  React.useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("billing") !== "download_ready") return;

    const guestToken = q.get("guest_token");
    const documentId = q.get("document_id");
    const stripeSessionId = q.get("session_id");
    if (!guestToken || !documentId) return;

    setDraft((d) => ({
      ...d,
      guestToken,
      documentId,
      invoice: d.invoice ? { ...d.invoice, id: documentId } : d.invoice,
    }));

    (async () => {
      try {
        toast("Payment received — preparing your download…");
        const ok = await waitForPayment(guestToken, documentId, stripeSessionId);
        window.history.replaceState({}, "", "/invoice");
        if (!ok) {
          toast("Payment is processing. Click Pay & download again in a moment.");
          return;
        }
        setPaidReady(true);
        setMode("preview");
        await runDownload();
      } catch (err) {
        console.error("Post-payment download failed:", err);
        window.history.replaceState({}, "", "/invoice");
        toast(err?.message || "Download failed. Click Pay & download to try again.");
      }
    })();
  }, []);

  const dlPrice = window.MartenBilling?.formatPayPerDownload
    ? window.MartenBilling.formatPayPerDownload()
    : new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(
        window.SEED?.BILLING?.payPerDownload ?? 9.99
      );

  const { invoice, client, business } = draft;

  return (
    <div className="invoice-lite">
      <header className="invoice-lite-header">
        <div className="invoice-lite-brand">
          <BrandLogo size={40} showName name={brand} />
          <span className="invoice-lite-tag">Invoice generator</span>
        </div>
        <div className="invoice-lite-header-actions">
          <a href="/" className="btn sm ghost">Full workspace (Pro)</a>
        </div>
      </header>

      <main className="invoice-lite-main">
        <div className="invoice-lite-intro">
          <h1>Create your invoice</h1>
          <p>
            No account needed. Fill in the form, preview your invoice, then pay {dlPrice} (CAD) via Stripe to download the PDF.
            {paidReady ? " Your payment is confirmed for this invoice." : null}
          </p>
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
              if (!business.name?.trim()) {
                toast("Enter your business name before preview.");
                return;
              }
              setMode("preview");
            }}
          >
            2. Preview
          </button>
          <button type="button" className="btn primary sm" onClick={handleDownload}>
            <Icon name="download" size={13} /> 3. Pay &amp; download · {dlPrice}
          </button>
        </div>

        {mode === "edit" ? (
          <div className="invoice-lite-form">
            <section className="invoice-lite-section">
              <h2 className="invoice-lite-section-title">Your business</h2>
              <p className="help">Shown on the invoice header.</p>
              <div className="field">
                <label>Business name</label>
                <input
                  className="input"
                  value={business.name}
                  onChange={(e) => updateBusiness({ name: e.target.value })}
                  placeholder="Your Studio Inc."
                />
              </div>
              <div className="row-2">
                <div className="field">
                  <label>Your name</label>
                  <input
                    className="input"
                    value={business.owner || ""}
                    onChange={(e) => updateBusiness({ owner: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input
                    className="input"
                    type="email"
                    value={business.email || ""}
                    onChange={(e) => updateBusiness({ email: e.target.value })}
                  />
                </div>
              </div>
              <div className="field">
                <label>Address</label>
                <textarea
                  className="textarea"
                  value={business.address || ""}
                  onChange={(e) => updateBusiness({ address: e.target.value })}
                  rows={2}
                />
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
                invoice={invoice}
                clients={[{ id: client.id, name: client.name || "Client" }]}
                onChange={updateInvoice}
              />
            </section>
          </div>
        ) : (
          <div className="invoice-lite-preview">
            <div>
              <InvoiceDocument invoice={invoice} client={client} business={business} />
            </div>
            <div className="invoice-lite-preview-actions">
              <button type="button" className="btn" onClick={() => setMode("edit")}>
                <Icon name="edit" size={13} /> Edit form
              </button>
              <button type="button" className="btn primary" onClick={handleDownload}>
                <Icon name="download" size={13} /> Pay &amp; download · {dlPrice}
              </button>
            </div>
          </div>
        )}
      </main>

      <PaywallModal
        open={paywall.open}
        onClose={() => setPaywall({ open: false, checkoutUrl: null })}
        documentType="invoice"
        documentId={draft.documentId}
        busy={paywallBusy}
        onProceed={() => {
          const v = validateBeforeCheckout();
          if (!v.ok) {
            toast(v.message);
            setPaywall({ open: false, checkoutUrl: null });
            setMode("edit");
            return;
          }
          if (!paywall.checkoutUrl) return;
          setPaywallBusy(true);
          window.location.href = paywall.checkoutUrl;
        }}
      />

      {/* Always mounted so PDF export works after Stripe redirect (edit mode has no visible preview). */}
      <div className="invoice-lite-pdf-source" aria-hidden="true">
        <div ref={invoicePreviewRef}>
          <InvoiceDocument invoice={invoice} client={client} business={business} />
        </div>
      </div>

      {toastMsg && (
        <div className="toast invoice-lite-toast">
          <Icon name="check" size={14} />
          {toastMsg}
        </div>
      )}
    </div>
  );
}

function isGuestInvoiceRoute() {
  const path = (window.location.pathname || "").replace(/\/$/, "");
  return path === "/invoice" || path.endsWith("/invoice");
}

window.GuestInvoiceApp = GuestInvoiceApp;
window.isGuestInvoiceRoute = isGuestInvoiceRoute;

if (isGuestInvoiceRoute()) {
  ReactDOM.createRoot(document.getElementById("root")).render(<GuestInvoiceApp />);
} else if (!window.__martenAppMounted) {
  window.__martenAppMounted = true;
  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
}
