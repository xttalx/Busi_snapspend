/* Public invoice generator — no login: fill form → preview → pay → download */
const GUEST_DRAFT_KEY = "marten_guest_invoice_draft";
const GUEST_PENDING_KEY = "marten_guest_invoice_pending";
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

function readReturnParams() {
  const q = new URLSearchParams(window.location.search);
  if (q.get("billing") !== "download_ready") return null;
  const guestToken = q.get("guest_token")?.trim();
  const documentId = q.get("document_id")?.trim();
  const stripeSessionId = q.get("session_id")?.trim() || null;
  if (!guestToken || !documentId) return null;
  return { guestToken, documentId, stripeSessionId };
}

/** Restore the invoice the user paid for — never mix with another session's draft. */
function restoreGuestDraftForPayment(guestToken, documentId) {
  try {
    const pendingRaw = sessionStorage.getItem(GUEST_PENDING_KEY);
    if (pendingRaw) {
      const pending = JSON.parse(pendingRaw);
      if (pending.guestToken === guestToken && pending.documentId === documentId && pending.draft) {
        return pending.draft;
      }
    }
    const saved = loadGuestDraft();
    if (
      saved?.documentId === documentId &&
      saved?.guestToken === guestToken &&
      saved.invoice &&
      saved.client &&
      saved.business
    ) {
      return saved;
    }
  } catch (_e) {}
  return null;
}

/** Lock draft to this checkout before leaving for Stripe / Lemon. */
function persistCheckoutDraft(draft) {
  if (!draft?.documentId || !draft?.guestToken) return;
  saveGuestDraft(draft);
  try {
    sessionStorage.setItem(
      GUEST_PENDING_KEY,
      JSON.stringify({
        guestToken: draft.guestToken,
        documentId: draft.documentId,
        draft,
        savedAt: Date.now(),
      })
    );
    sessionStorage.setItem(GUEST_TOKEN_KEY, draft.guestToken);
  } catch (_e) {}
}

function clearCheckoutPending() {
  try {
    sessionStorage.removeItem(GUEST_PENDING_KEY);
  } catch (_e) {}
}

/** Wait until the off-screen invoice preview is mounted (needed after Stripe redirect). */
function waitForPreviewElement(ref, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (ref.current) return resolve(ref.current);
      if (Date.now() - start > timeoutMs) {
        return reject(new Error("Invoice preview not ready. Click Download PDF to try again."));
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

/** Wait until React has painted invoice content into the PDF capture node. */
function waitForPreviewContent(ref, businessName, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const needle = (businessName || "").trim();
    const start = Date.now();
    const tick = () => {
      const el = ref.current;
      const shell = el?.querySelector?.(".doc-shell") || el;
      if (shell && (!needle || shell.textContent.includes(needle))) {
        return resolve(shell);
      }
      if (Date.now() - start > timeoutMs) {
        return reject(new Error("Invoice preview not ready. Click Download PDF to try again."));
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
  const [downloadBusy, setDownloadBusy] = React.useState(false);

  const returnParams = React.useMemo(() => readReturnParams(), []);
  const postPaymentStarted = React.useRef(false);
  const downloadRunId = React.useRef(0);

  const [draft, setDraft] = React.useState(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("canceled") === "1") {
      const gt = q.get("guest_token")?.trim();
      const did = q.get("document_id")?.trim();
      if (gt && did) {
        const restored = restoreGuestDraftForPayment(gt, did);
        if (restored) return restored;
      }
    }
    const returning = readReturnParams();
    if (returning) {
      const restored = restoreGuestDraftForPayment(returning.guestToken, returning.documentId);
      if (restored) return restored;
    }
    const saved = loadGuestDraft();
    if (saved?.documentId && saved.invoice && saved.client && saved.business) {
      return { ...saved, guestToken: saved.guestToken || getGuestToken() };
    }
    const documentId = guestId();
    return defaultGuestWorkspace(documentId);
  });

  const draftRef = React.useRef(draft);
  draftRef.current = draft;

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

  const runDownload = async (draftSnapshot, { skipPaidCheck } = {}) => {
    const source = draftSnapshot || draftRef.current;
    const { invoice, client, business } = source;
    if (!client.name?.trim()) {
      toast("Add your client's name before downloading.");
      setMode("edit");
      return false;
    }
    if (!business.name?.trim()) {
      toast("Add your business name before downloading.");
      setMode("edit");
      return false;
    }

    if (!skipPaidCheck && window.MartenBilling?.guestDownloadStatus) {
      const status = await window.MartenBilling.guestDownloadStatus(
        source.guestToken,
        source.documentId
      );
      if (!status.allowed) {
        toast("Complete payment before downloading this invoice.");
        return false;
      }
    }

    setDownloadBusy(true);
    try {
      await waitForPreviewElement(invoicePreviewRef);
      await waitForPreviewContent(invoicePreviewRef, business.name);
      await window.downloadInvoicePdf({ invoice, element: invoicePreviewRef.current });
      toast("Invoice PDF downloaded.");
      return true;
    } catch (err) {
      console.error(err);
      toast(err?.message || "Download failed.");
      return false;
    } finally {
      setDownloadBusy(false);
    }
  };

  const waitForPayment = async (guestToken, documentId, stripeSessionId) => {
    if (!window.MartenBilling?.guestDownloadStatus) return { allowed: true };

    const attempts = stripeSessionId ? 12 : 20;
    const delayMs = stripeSessionId ? 600 : 2000;

    for (let i = 0; i < attempts; i++) {
      try {
        const status = await window.MartenBilling.guestDownloadStatus(
          guestToken,
          documentId,
          stripeSessionId
        );
        if (status.allowed) {
          return {
            allowed: true,
            guestToken: status.guestToken || guestToken,
            documentId: status.documentId || documentId,
          };
        }
      } catch (err) {
        console.warn("Payment status check failed:", err);
      }
      await new Promise((r) => setTimeout(r, i === 0 ? 200 : delayMs));
    }
    return { allowed: false };
  };

  const triggerPaidDownload = async (draftSnapshot) => {
    const runId = ++downloadRunId.current;
    setMode("preview");
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (runId !== downloadRunId.current) return;
    await runDownload(draftSnapshot, { skipPaidCheck: true });
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
        await triggerPaidDownload(draft);
        return;
      }

      let checkoutDraft = { ...draft, documentId, guestToken };
      persistCheckoutDraft(checkoutDraft);

      const email = draft.business.email?.trim() || draft.client.email?.trim() || "";
      const { checkoutUrl, guestToken: token } = await window.MartenBilling.guestCheckout(
        documentId,
        guestToken,
        email
      );
      if (token && token !== guestToken) {
        checkoutDraft = { ...checkoutDraft, guestToken: token };
        setDraft(checkoutDraft);
        persistCheckoutDraft(checkoutDraft);
      }
      setPaywall({ open: true, checkoutUrl });
    } catch (e) {
      toast(e.message || "Download failed.");
    }
  };

  React.useEffect(() => {
    if (!returnParams || postPaymentStarted.current) return;
    postPaymentStarted.current = true;

    const { guestToken, documentId, stripeSessionId } = returnParams;
    const restored = restoreGuestDraftForPayment(guestToken, documentId);

    if (!restored) {
      toast("Could not restore your invoice for this payment. Use the same browser tab you paid from.");
      window.history.replaceState({}, "", "/invoice");
      return;
    }

    setDraft(restored);
    draftRef.current = restored;
    saveGuestDraft(restored);

    (async () => {
      try {
        toast("Payment received — preparing your download…");
        const payment = await waitForPayment(guestToken, documentId, stripeSessionId);
        window.history.replaceState({}, "", "/invoice");

        let draftToUse = restored;
        if (payment.allowed) {
          if (
            payment.guestToken &&
            payment.documentId &&
            (payment.guestToken !== guestToken || payment.documentId !== documentId)
          ) {
            const fromStripe = restoreGuestDraftForPayment(payment.guestToken, payment.documentId);
            if (fromStripe) {
              draftToUse = fromStripe;
              setDraft(fromStripe);
              draftRef.current = fromStripe;
            }
          }
          setPaidReady(true);
          const ok = await triggerPaidDownload(draftToUse);
          if (ok) clearCheckoutPending();
          return;
        }

        toast("Payment confirmed — tap Download PDF below.");
        setPaidReady(true);
        setMode("preview");
      } catch (err) {
        console.error("Post-payment flow failed:", err);
        window.history.replaceState({}, "", "/invoice");
        toast(err?.message || "Download failed. Tap Download PDF below.");
        setPaidReady(true);
      }
    })();
  }, [returnParams]);

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
          {paidReady ? (
            <div className="invoice-lite-paid-banner">
              <p>Your payment succeeded. Download your PDF below.</p>
              <button
                type="button"
                className="btn primary"
                disabled={downloadBusy}
                onClick={() => triggerPaidDownload(draftRef.current)}
              >
                <Icon name="download" size={14} /> {downloadBusy ? "Preparing PDF…" : "Download PDF"}
              </button>
            </div>
          ) : null}
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
          persistCheckoutDraft(draftRef.current);
          if (!paywall.checkoutUrl) return;
          setPaywallBusy(true);
          window.location.href = paywall.checkoutUrl;
        }}
      />

      {/* Always mounted so PDF export works after Stripe redirect (edit mode has no visible preview). */}
      <div className="invoice-lite-pdf-source">
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
