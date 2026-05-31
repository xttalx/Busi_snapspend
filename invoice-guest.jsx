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

function clearGuestDraftStorage() {
  try {
    sessionStorage.removeItem(GUEST_DRAFT_KEY);
  } catch (_e) {}
}

const DOWNLOAD_MODAL_IDLE = {
  open: false,
  phase: "idle",
  message: "",
  error: null,
  fileName: "invoice.pdf",
};

const DOWNLOAD_PHASE_HINTS = {
  confirming: "Confirming your payment with Stripe…",
  checking: "Verifying your download…",
  preparing: "Loading your invoice…",
  rendering: "Rendering invoice layout…",
  generating: "Generating PDF — usually 10–25 seconds…",
  saving: "Finalizing…",
  ready: "Your PDF is ready. Tap the button below to save it.",
  done: "Saved to your device. You can create another invoice.",
};

function GuestDownloadModal({ open, phase, message, error, fileName, busy, onDownload, onDismiss }) {
  if (!open) return null;

  const isDone = phase === "done";
  const isReady = phase === "ready";
  const isError = phase === "error";
  const showSpinner = !isDone && !isReady && !isError;
  const title = isDone
    ? "Download complete"
    : isReady
      ? "Your PDF is ready"
      : isError
        ? "Download unavailable"
        : "Preparing your invoice PDF";

  return (
    <>
      <div className="modal-scrim guest-download-modal-scrim" aria-hidden="true" />
      <div
        className="modal billing-modal guest-download-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-download-modal-title"
        aria-busy={showSpinner || busy}
      >
        <div className="modal-head">
          <div>
            <h3 id="guest-download-modal-title">{title}</h3>
            <p className="modal-sub">
              {isReady || isDone ? (
                <>
                  File: <b>{fileName || "invoice.pdf"}</b>
                </>
              ) : (
                "Please keep this window open until your PDF is saved."
              )}
            </p>
          </div>
        </div>
        <div className="modal-body guest-download-modal-body">
          {showSpinner ? (
            <div className="guest-download-spinner" aria-hidden="true" />
          ) : null}
          <p className="guest-download-status-text">
            {message || DOWNLOAD_PHASE_HINTS[phase] || "Working…"}
          </p>
          {error ? <p className="guest-download-error-text">{error}</p> : null}
          {phase === "generating" ? (
            <p className="guest-download-hint">Large invoices may take a little longer.</p>
          ) : null}
        </div>
        <div className="modal-foot guest-download-modal-foot">
          {isReady ? (
            <button
              type="button"
              className="btn primary"
              disabled={busy}
              onClick={onDownload}
            >
              <Icon name="download" size={14} /> {busy ? "Preparing…" : "Download PDF"}
            </button>
          ) : null}
          {isDone ? (
            <button type="button" className="btn primary" onClick={onDismiss}>
              Create another invoice
            </button>
          ) : null}
          {isError ? (
            <button type="button" className="btn" onClick={onDismiss}>
              Back to form
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
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
  const [downloadModal, setDownloadModal] = React.useState(DOWNLOAD_MODAL_IDLE);
  const [fieldErrors, setFieldErrors] = React.useState({});
  const [validationModal, setValidationModal] = React.useState({ open: false, issues: [] });

  const returnParams = React.useMemo(() => readReturnParams(), []);

  const pdfFileName = (snap) => {
    const n = snap?.invoice?.number?.trim();
    return n ? `${n}.pdf` : "invoice.pdf";
  };

  const closeDownloadModal = () => setDownloadModal(DOWNLOAD_MODAL_IDLE);

  const openDownloadModal = (patch) =>
    setDownloadModal((m) => ({
      ...DOWNLOAD_MODAL_IDLE,
      open: true,
      phase: "confirming",
      message: DOWNLOAD_PHASE_HINTS.confirming,
      error: null,
      fileName: pdfFileName(draftRef.current),
      ...patch,
    }));

  const setDownloadPhase = (phase, extra = {}) =>
    setDownloadModal((m) =>
      m.open
        ? {
            ...m,
            phase,
            message: extra.message ?? DOWNLOAD_PHASE_HINTS[phase] ?? m.message,
            error: extra.error !== undefined ? extra.error : m.error,
            fileName: extra.fileName ?? m.fileName,
          }
        : m
    );

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

  const clearFieldError = (...keys) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  };

  const inputCls = (key) => "input" + (fieldErrors[key] ? " field-invalid" : "");

  const showValidationIssues = (validation) => {
    const errs = {};
    (validation.issues || []).forEach((issue) => {
      errs[issue.field] = issue.message;
    });
    setFieldErrors(errs);
    setValidationModal({ open: true, issues: validation.issues || [] });
    setMode("edit");
  };

  const updateBusiness = (patch) => {
    setDraft((d) => ({ ...d, business: { ...d.business, ...patch } }));
    if ("name" in patch) clearFieldError("businessName");
    if ("email" in patch) clearFieldError("businessEmail", "Email");
  };

  const updateClient = (patch) => {
    setDraft((d) => ({ ...d, client: { ...d.client, ...patch } }));
    if ("name" in patch) clearFieldError("clientName");
    if ("email" in patch) clearFieldError("clientEmail", "Email");
  };

  const updateInvoice = (invoice) => {
    setDraft((d) => ({ ...d, invoice }));
    clearFieldError(
      "invoiceNumber",
      "invoiceDate",
      "invoiceDue",
      "lineItems",
      ...invoice.items.map((_, i) => `lineItemQty_${i}`),
      ...invoice.items.map((_, i) => `lineItemRate_${i}`)
    );
  };

  const resetToBlankForm = () => {
    clearCheckoutPending();
    clearGuestDraftStorage();
    const fresh = defaultGuestWorkspace(guestId());
    setDraft(fresh);
    draftRef.current = fresh;
    setPaidReady(false);
    closeDownloadModal();
    setMode("edit");
    setPaywall({ open: false, checkoutUrl: null });
    setFieldErrors({});
    setValidationModal({ open: false, issues: [] });
    saveGuestDraft(fresh);
  };

  const dismissDownloadModal = () => {
    if (downloadModal.phase === "done") resetToBlankForm();
    else closeDownloadModal();
  };

  const runDownload = async (draftSnapshot, { skipPaymentCheck, skipValidation } = {}) => {
    const source = draftSnapshot || draftRef.current;
    const { invoice, client, business } = source;

    if (!skipValidation) {
      const validation = validateDraft(source);
      if (!validation.ok) {
        showValidationIssues(validation);
        return false;
      }
    }

    if (downloadModal.open) setDownloadPhase("checking");

    if (window.MartenBilling?.guestDownloadStatus) {
      const status = await window.MartenBilling.guestDownloadStatus(
        source.guestToken,
        source.documentId
      );
      if (status.downloaded || status.reason === "already_downloaded") {
        toast("This invoice was already downloaded. Starting a new invoice.");
        resetToBlankForm();
        return false;
      }
      const paidOk = status.allowed || (status.paid && !status.downloaded);
      if (!skipPaymentCheck && !paidOk) {
        toast("Complete payment before downloading this invoice.");
        return false;
      }
      if (skipPaymentCheck && !status.paid && !paidOk) {
        toast("Payment is still processing. Wait a moment, then tap Download PDF.");
        return false;
      }
    }

    setDownloadBusy(true);
    setDownloadPhase("preparing", { fileName: pdfFileName(source) });
    try {
      setDraft(source);
      draftRef.current = source;
      setMode("preview");
      setDownloadPhase("rendering");
      await new Promise((r) => setTimeout(r, 80));
      await waitForPreviewElement(invoicePreviewRef, 15000);
      await waitForPreviewContent(invoicePreviewRef, business.name, 15000);
      setDownloadPhase("generating");
      await window.downloadInvoicePdf({ invoice, element: invoicePreviewRef.current });

      setDownloadPhase("saving");
      if (window.MartenBilling?.completeGuestDownload) {
        await window.MartenBilling.completeGuestDownload(
          source.guestToken,
          source.documentId
        );
      }

      setDownloadPhase("done", { message: DOWNLOAD_PHASE_HINTS.done });
      return true;
    } catch (err) {
      console.error(err);
      const msg = err?.message || "Download failed.";
      setDownloadPhase("ready", {
        message: "Tap Download PDF to try again.",
        error: msg,
      });
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
        const ready = status.allowed || (status.paid && !status.downloaded);
        if (ready) {
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

  const triggerPaidDownload = async (draftSnapshot, { autoStart = true } = {}) => {
    const runId = ++downloadRunId.current;
    setDraft(draftSnapshot);
    draftRef.current = draftSnapshot;
    setPaidReady(true);
    setMode("preview");
    openDownloadModal({
      phase: autoStart ? "preparing" : "ready",
      message: autoStart
        ? DOWNLOAD_PHASE_HINTS.preparing
        : DOWNLOAD_PHASE_HINTS.ready,
      fileName: pdfFileName(draftSnapshot),
    });
    if (!autoStart) return false;

    await new Promise((r) => setTimeout(r, 100));
    if (runId !== downloadRunId.current) return false;

    if (runId !== downloadRunId.current) return false;
    return runDownload(draftSnapshot, {
      skipPaymentCheck: true,
      skipValidation: true,
    });
  };

  const handleModalDownload = async () => {
    if (downloadBusy) return;
    await runDownload(draftRef.current, {
      skipPaymentCheck: true,
      skipValidation: true,
    });
  };

  const validateDraft = (source) => {
    if (!window.MartenBilling?.validateInvoiceCheckout) return { ok: true, issues: [] };
    const needsEmail = Boolean(window.MartenBilling?.guestCheckout);
    return window.MartenBilling.validateInvoiceCheckout({
      business: source.business,
      client: source.client,
      invoice: source.invoice,
      requireCheckoutEmail: needsEmail,
    });
  };

  const validateBeforeCheckout = () => validateDraft(draftRef.current);

  const handleDownload = async () => {
    const { invoice, documentId, guestToken } = draft;
    if (!invoice) return;

    const validation = validateBeforeCheckout();
    if (!validation.ok) {
      showValidationIssues(validation);
      return;
    }

    try {
      if (!window.MartenBilling || !window.MartenBilling.guestCheckout) {
        await runDownload();
        return;
      }

      const status = await window.MartenBilling.guestDownloadStatus(guestToken, documentId);
      if (status.downloaded || status.reason === "already_downloaded") {
        toast("This invoice was already downloaded. Starting a new invoice.");
        resetToBlankForm();
        return;
      }
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

    openDownloadModal({
      phase: "confirming",
      message: "Payment received. Confirming with Stripe…",
      fileName: pdfFileName(restored || draftRef.current),
    });

    if (!restored) {
      setDownloadPhase("error", {
        message: "Could not restore your invoice for this payment.",
        error: "Use the same browser and tab where you started checkout (martenbooks.com).",
      });
      window.history.replaceState({}, "", "/invoice");
      return;
    }

    setDraft(restored);
    draftRef.current = restored;
    saveGuestDraft(restored);

    (async () => {
      try {
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
          setDownloadPhase("preparing", {
            message: "Payment confirmed. Building your PDF…",
            fileName: pdfFileName(draftToUse),
          });
          await triggerPaidDownload(draftToUse, { autoStart: true });
          return;
        }

        setPaidReady(true);
        setMode("preview");
        setDownloadPhase("ready", {
          message: "Payment confirmed. Tap Download PDF to save your invoice.",
          fileName: pdfFileName(draftToUse),
        });
      } catch (err) {
        console.error("Post-payment flow failed:", err);
        window.history.replaceState({}, "", "/invoice");
        setPaidReady(true);
        setDownloadPhase("ready", {
          message: "Something went wrong. Tap Download PDF to try again.",
          error: err?.message || "Download failed.",
          fileName: pdfFileName(draftRef.current),
        });
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
                  className={inputCls("businessName")}
                  value={business.name}
                  onChange={(e) => updateBusiness({ name: e.target.value })}
                  placeholder="Your Studio Inc."
                />
                {fieldErrors.businessName ? (
                  <p className="field-error-hint">{fieldErrors.businessName}</p>
                ) : null}
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
                    className={inputCls("businessEmail")}
                    type="email"
                    value={business.email || ""}
                    onChange={(e) => updateBusiness({ email: e.target.value })}
                  />
                  {fieldErrors.businessEmail ? (
                    <p className="field-error-hint">{fieldErrors.businessEmail}</p>
                  ) : null}
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
                  className={inputCls("clientName")}
                  value={client.name}
                  onChange={(e) => updateClient({ name: e.target.value })}
                  placeholder="Acme Studio Inc."
                />
                {fieldErrors.clientName ? (
                  <p className="field-error-hint">{fieldErrors.clientName}</p>
                ) : null}
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
                    className={inputCls("clientEmail")}
                    type="email"
                    value={client.email || ""}
                    onChange={(e) => updateClient({ email: e.target.value })}
                  />
                  {fieldErrors.clientEmail ? (
                    <p className="field-error-hint">{fieldErrors.clientEmail}</p>
                  ) : null}
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
                fieldErrors={fieldErrors}
              />
            </section>
          </div>
        ) : (
          <div className="invoice-lite-preview">
            <div ref={invoicePreviewRef}>
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

      <GuestDownloadModal
        open={downloadModal.open}
        phase={downloadModal.phase}
        message={downloadModal.message}
        error={downloadModal.error}
        fileName={downloadModal.fileName}
        busy={downloadBusy}
        onDownload={handleModalDownload}
        onDismiss={dismissDownloadModal}
      />

      {window.InvoiceValidationModal ? (
        <InvoiceValidationModal
          open={validationModal.open}
          issues={validationModal.issues}
          title="Fix these fields before checkout"
          onClose={() => setValidationModal({ open: false, issues: [] })}
        />
      ) : null}

      <PaywallModal
        open={paywall.open}
        onClose={() => setPaywall({ open: false, checkoutUrl: null })}
        documentType="invoice"
        documentId={draft.documentId}
        busy={paywallBusy}
        onProceed={() => {
          const v = validateBeforeCheckout();
          if (!v.ok) {
            showValidationIssues(v);
            setPaywall({ open: false, checkoutUrl: null });
            return;
          }
          persistCheckoutDraft(draftRef.current);
          if (!paywall.checkoutUrl) return;
          setPaywallBusy(true);
          window.location.href = paywall.checkoutUrl;
        }}
      />

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
