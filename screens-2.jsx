/* Invoices, Paystubs, Employees, Reports, Settings */
const { useState: useState2, useMemo: useMemo2, useRef } = React;

/* ---------- Invoices ---------- */
function InvoiceEditor({ invoice, clients, onChange }) {
  const update = (patch) => onChange({ ...invoice, ...patch });
  const updateItem = (i, patch) => {
    const items = invoice.items.map((it, idx) => idx === i ? { ...it, ...patch } : it);
    update({ items });
  };
  const addItem = () => update({ items: [...invoice.items, { desc: "", sub: "", qty: 1, rate: 0 }] });
  const removeItem = (i) => update({ items: invoice.items.filter((_, idx) => idx !== i) });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="row-2">
        <div className="field">
          <label>Invoice no.</label>
          <input className="input mono" value={invoice.number} onChange={(e) => update({ number: e.target.value })} />
        </div>
        <div className="field">
          <label>Status</label>
          <select className="select" value={invoice.status} onChange={(e) => update({ status: e.target.value })}>
            <option value="draft">Draft</option>
            <option value="due">Due</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label>Client</label>
        <select className="select" value={invoice.clientId} onChange={(e) => update({ clientId: e.target.value })}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="row-2">
        <div className="field">
          <label>Issued</label>
          <input className="input mono" type="date" value={invoice.date} onChange={(e) => update({ date: e.target.value })} />
        </div>
        <div className="field">
          <label>Due</label>
          <input className="input mono" type="date" value={invoice.due} onChange={(e) => update({ due: e.target.value })} />
        </div>
      </div>

      <div>
        <div className="line-items">
          <span className="lbl">Description</span>
          <span className="lbl" style={{ textAlign: "right" }}>Qty</span>
          <span className="lbl" style={{ textAlign: "right" }}>Rate</span>
          <span className="lbl" style={{ textAlign: "right" }}>Amount</span>
          <span></span>
          {invoice.items.map((it, i) =>
          <React.Fragment key={i}>
              <input className="input" value={it.desc} placeholder="Line description" onChange={(e) => updateItem(i, { desc: e.target.value })} />
              <input className="input mono" type="number" value={it.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) })} style={{ textAlign: "right" }} />
              <input className="input mono" type="number" step="0.01" value={it.rate} onChange={(e) => updateItem(i, { rate: Number(e.target.value) })} style={{ textAlign: "right" }} />
              <span className="calc">{fmtMoney(it.qty * it.rate)}</span>
              <button className="iconbtn" onClick={() => removeItem(i)} title="Remove"><Icon name="close" size={12} /></button>
            </React.Fragment>
          )}
        </div>
        <button className="btn ghost sm" onClick={addItem} style={{ marginTop: 10 }}>
          <Icon name="plus" size={12} /> Add line item
        </button>
      </div>

      <div className="row-2">
        <div className="field">
          <label>Tax rate (%)</label>
          <input className="input mono" type="number" step="0.01" value={(invoice.taxRate || 0) * 100}
          onChange={(e) => update({ taxRate: Number(e.target.value) / 100 })} />
        </div>
        <div className="field">
          <label>Currency</label>
          <input className="input mono" value="USD" disabled style={{ opacity: 0.6 }} />
        </div>
      </div>
      <div className="field">
        <label>Notes / terms</label>
        <textarea className="textarea" value={invoice.notes} onChange={(e) => update({ notes: e.target.value })} placeholder="Payment terms, thank-you note…" />
      </div>
    </div>);

}

function InvoicesScreen({ state, dispatch, business, toast, params }) {
  const [selected, setSelected] = useState2(params?.focusId || null);
  const [mode, setMode] = useState2("preview"); // edit | preview
  const invoicePreviewRef = useRef(null);

  const inv = state.invoices.find((i) => i.id === selected) || state.invoices[0];
  const client = inv ? state.clients.find((c) => c.id === inv.clientId) : null;
  const nowIso = () => new Date().toISOString();

  const applyInvoicePatch = (currentInvoice, patchedInvoice) => {
    const prevStatus = currentInvoice.status || "draft";
    const nextStatus = patchedInvoice.status || "draft";
    if (prevStatus === nextStatus) {
      return { ...patchedInvoice, statusHistory: patchedInvoice.statusHistory || currentInvoice.statusHistory || [] };
    }
    return {
      ...patchedInvoice,
      statusHistory: [
      ...(currentInvoice.statusHistory || []),
      { from: prevStatus, to: nextStatus, at: nowIso() }],
    };
  };

  const downloadCurrentInvoicePdf = async () => {
    if (!inv || !client) {
      toast("Select an invoice with a client first.");
      return;
    }
    try {
      if (mode !== "preview") {
        setMode("preview");
        await new Promise((resolve) => setTimeout(resolve, 220));
      }
      await window.downloadInvoicePdf({ invoice: inv, element: invoicePreviewRef.current });
      toast("Invoice PDF downloaded.");
    } catch (error) {
      toast(error?.message || "Could not download invoice PDF.");
      console.error(error);
    }
  };

  const createNew = () => {
    if (!state.clients.length) {
      toast("Add a client before creating an invoice.");
      return;
    }
    const num = "INV-" + String(1 + state.invoices.filter((i) => i.number.startsWith("INV-")).length).padStart(4, "0");
    const today = new Date();
    const due = new Date(today.getTime() + 30 * 86400000);
    const newInv = {
      id: "i" + Date.now(),
      number: num,
      clientId: state.clients[0].id,
      date: today.toISOString().slice(0, 10),
      due: due.toISOString().slice(0, 10),
      status: "draft",
      items: [{ desc: "New line item", sub: "", qty: 1, rate: 0 }],
      taxRate: 0,
      notes: "",
      createdAt: nowIso(),
      statusHistory: [],
    };
    dispatch({ type: "ADD_INVOICE", invoice: newInv });
    setSelected(newInv.id);
    setMode("edit");
  };

  if (!state.invoices.length) {
    return (
      <>
        <div className="toolbar">
          <div className="left">
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)" }}>
              0 invoices
            </span>
          </div>
          <div className="right">
            <button className="btn primary" onClick={createNew}>
              <Icon name="plus" size={13} /> New invoice
            </button>
          </div>
        </div>
        <div className="empty" style={{ marginTop: 24 }}>
          No invoices yet. Add a client under Business Clients, then create your first invoice.
        </div>
      </>
    );
  }

  return (
    <>
      <div className="toolbar">
        <div className="left">
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)" }}>
            {state.invoices.length} invoices
          </span>
        </div>
        <div className="right">
          <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--paper-2)", borderRadius: "var(--r-md)" }}>
            <button className={"btn sm " + (mode === "preview" ? "" : "ghost")}
            onClick={() => setMode("preview")}
            style={mode === "preview" ? { background: "var(--paper)", borderColor: "var(--rule)" } : { border: "none" }}>
              Preview
            </button>
            <button className={"btn sm " + (mode === "edit" ? "" : "ghost")}
            onClick={() => setMode("edit")}
            style={mode === "edit" ? { background: "var(--paper)", borderColor: "var(--rule)" } : { border: "none" }}>
              Edit
            </button>
          </div>
          <button className="btn primary" onClick={downloadCurrentInvoicePdf}>
            <Icon name="download" size={13} /> Download PDF
          </button>
          <button className="btn primary" onClick={createNew} style={{ marginLeft: 6 }}>
            <Icon name="plus" size={13} /> New invoice
          </button>
        </div>
      </div>

      <div className="two-col doc-two-col" style={{ fontFamily: "Arial" }}>
        <div className="list-card doc-controls-col">
          {state.invoices.map((i) => {
            const c = state.clients.find((cl) => cl.id === i.clientId);
            const total = i.items.reduce((s, it) => s + it.qty * it.rate, 0) * (1 + (i.taxRate || 0));
            return (
              <div key={i.id} className={"row " + (i.id === selected ? "active" : "")} onClick={() => setSelected(i.id)}>
                <span className="name" style={{ fontFamily: "Arial" }}>{c?.name || "Unknown client"}</span>
                <span className="amount">{fmtMoney(total)}</span>
                <span className="meta">{i.number} · {fmtDate(i.date)}</span>
                <select
                  className={"status status-select " + i.status}
                  value={i.status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const next = e.target.value;
                    dispatch({ type: "UPDATE_INVOICE", invoice: applyInvoicePatch(i, { ...i, status: next }) });
                    toast(`${i.number} → ${next.charAt(0).toUpperCase() + next.slice(1)}`);
                  }}>
                  <option value="draft">Draft</option>
                  <option value="due">Due</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>);

          })}
        </div>

        <div className="doc-preview-col">
          {mode === "edit" ?
          <div style={{ border: "1px solid var(--rule)", borderRadius: "var(--r-md)", padding: 24, background: "var(--paper)" }}>
              <InvoiceEditor
              invoice={inv}
              clients={state.clients}
              onChange={(patched) => dispatch({ type: "UPDATE_INVOICE", invoice: applyInvoicePatch(inv, patched) })} />
            
            </div> :

          <div ref={invoicePreviewRef}>
            <InvoiceDocument invoice={inv} client={client} business={business} />
          </div>
          }
        </div>
      </div>
    </>);

}
window.InvoicesScreen = InvoicesScreen;

/* ---------- Bills ---------- */
function readAmountFromText(rawText) {
  if (!rawText) return null;
  const text = String(rawText).replace(/\s+/g, " ");
  const hints = [
  /(?:amount due|total due|invoice total|total|balance due)[^\d]{0,20}(\d[\d,]*(?:\.\d{1,2})?)/i,
  /(?:usd|cad|aud|eur|gbp|inr|\$)\s*([0-9][\d,]*(?:\.\d{1,2})?)/i];
  for (const rx of hints) {
    const m = text.match(rx);
    if (m && m[1]) {
      const n = Number(m[1].replace(/,/g, ""));
      if (!Number.isNaN(n) && n > 0) return n;
    }
  }
  const all = [...text.matchAll(/\b(\d[\d,]*\.\d{2})\b/g)].
  map((m) => Number(m[1].replace(/,/g, ""))).
  filter((n) => !Number.isNaN(n) && n > 0);
  if (!all.length) return null;
  return Math.max(...all);
}

function amountFromFilename(name) {
  if (!name) return null;
  const nums = [...String(name).matchAll(/(\d[\d,]*\.\d{2})/g)].
  map((m) => Number(m[1].replace(/,/g, ""))).
  filter((n) => !Number.isNaN(n) && n > 0);
  return nums.length ? nums[nums.length - 1] : null;
}

function BillAttachmentLink({ attachment }) {
  const [href, setHref] = useState2(attachment?.dataUrl || "");
  React.useEffect(() => {
    let active = true;
    if (attachment?.dataUrl) {
      setHref(attachment.dataUrl);
      return () => {
        active = false;
      };
    }
    if (attachment?.storagePath && window.MartenAPI?.isEnabled()) {
      window.MartenAPI.getReceiptUrl(attachment.storagePath).
      then((url) => {
        if (active) setHref(url);
      }).
      catch(() => {
        if (active) setHref("");
      });
    } else {
      setHref("");
    }
    return () => {
      active = false;
    };
  }, [attachment?.dataUrl, attachment?.storagePath]);

  if (!href) return <span className="help">Uploaded file is not available right now.</span>;
  return (
    <a className="btn sm" href={href} target="_blank" rel="noreferrer">
      <Icon name="external" size={12} /> Open uploaded bill
    </a>);
}

function BillsScreen({ state, dispatch, toast, userId, params }) {
  const [drawer, setDrawer] = useState2(false);
  const [selected, setSelected] = useState2(null);
  const [readingAmount, setReadingAmount] = useState2(false);
  const [readMsg, setReadMsg] = useState2("");
  const today = new Date().toISOString().slice(0, 10);

  const blank = {
    vendor: "",
    number: "",
    issueDate: today,
    dueDate: today,
    status: "received",
    amount: "",
    notes: "",
    attachment: null,
  };
  const [form, setForm] = useState2(blank);

  const bills = [...(state.bills || [])].sort((a, b) => (b.issueDate || "").localeCompare(a.issueDate || ""));
  const active = bills.find((b) => b.id === selected) || bills[0] || null;

  React.useEffect(() => {
    if (params?.focusId) setSelected(params.focusId);
  }, [params?.focusId]);

  const reset = () => {
    setForm(blank);
    setReadMsg("");
    setReadingAmount(false);
  };

  const openNew = () => {
    reset();
    setDrawer(true);
  };

  const handleFile = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setForm((f) => ({
        ...f,
        attachment: {
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          dataUrl,
        },
      }));

      setReadingAmount(true);
      setReadMsg("Reading amount from file...");
      let detected = null;
      try {
        if (file.type.startsWith("text/") || /\.txt$/i.test(file.name) || file.type === "application/pdf") {
          const textReader = new FileReader();
          const text = await new Promise((resolve) => {
            textReader.onload = () => resolve(String(textReader.result || ""));
            textReader.onerror = () => resolve("");
            textReader.readAsText(file);
          });
          detected = readAmountFromText(text);
        }
      } catch (_e) {
      }
      if (!detected) detected = amountFromFilename(file.name);

      if (detected) {
        setForm((f) => ({ ...f, amount: detected.toFixed(2) }));
        setReadMsg(`Detected amount: ${fmtMoney(detected)}. You can still edit it.`);
      } else {
        setReadMsg("Could not auto-detect amount. Please enter amount manually.");
      }
      setReadingAmount(false);
    };
    reader.readAsDataURL(file);
  };

  const saveBill = () => {
    const amount = Number(form.amount);
    if (!form.vendor.trim() || !amount || amount <= 0) {
      toast("Vendor and amount are required");
      return;
    }
    const bill = {
      id: "b" + Date.now(),
      vendor: form.vendor.trim(),
      number: form.number.trim(),
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      status: form.status,
      amount,
      notes: form.notes,
      attachment: form.attachment,
      createdAt: new Date().toISOString(),
      statusHistory: [],
    };
    dispatch({ type: "ADD_BILL", bill });
    if (userId && window.MartenAPI?.isEnabled() && bill.attachment?.dataUrl) {
      window.MartenAPI.saveBill(userId, bill).
      then((saved) => dispatch({ type: "UPDATE_BILL", bill: saved })).
      catch((err) => console.error("Bill attachment upload failed:", err));
    }
    setSelected(bill.id);
    setDrawer(false);
    toast(`Bill added: ${fmtMoney(amount)} from ${bill.vendor}`);
  };

  const updateStatus = (bill, next) => {
    const prev = bill.status || "received";
    const patched = prev === next ? bill : {
      ...bill,
      status: next,
      statusHistory: [...(bill.statusHistory || []), { from: prev, to: next, at: new Date().toISOString() }],
    };
    dispatch({ type: "UPDATE_BILL", bill: patched });
    toast(`${bill.vendor} bill -> ${next}`);
  };

  return (
    <>
      <div className="toolbar">
        <div className="left">
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)" }}>
            {bills.length} bills · {fmtMoney(bills.reduce((s, b) => s + Number(b.amount || 0), 0))} total
          </span>
        </div>
        <div className="right">
          <button className="btn primary" onClick={openNew}>
            <Icon name="plus" size={13} /> New bill
          </button>
        </div>
      </div>

      {bills.length === 0 &&
      <div className="empty">
          No bills yet. Upload vendor invoices here; they are treated as expenses and reduce net revenue.
        </div>}

      {bills.length > 0 &&
      <div className="two-col">
          <div className="list-card">
            {bills.map((b) =>
            <div key={b.id} className={"row " + (active?.id === b.id ? "active" : "")} onClick={() => setSelected(b.id)}>
                <span className="name">{b.vendor}</span>
                <span className="amount">{fmtMoney(Number(b.amount || 0))}</span>
                <span className="meta">{b.number || "No bill #"} · {fmtDate(b.issueDate)}</span>
                <select
                className={"status status-select " + (b.status === "paid" ? "paid" : b.status === "overdue" ? "overdue" : "due")}
                value={b.status}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => updateStatus(b, e.target.value)}>
                  <option value="received">Received</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <div className="doc-shell">
              <div className="head-block">
                <div>
                  <div className="doc-kicker">Bill preview</div>
                  <h1 className="doc-title">{active.vendor}</h1>
                </div>
                <div className="doc-num">{active.number || "No bill #"}</div>
              </div>
              <div className="body-block">
                <div className="summary-grid">
                  <div className="cell"><div className="lbl">Issue date</div><div className="val">{fmtDate(active.issueDate)}</div></div>
                  <div className="cell"><div className="lbl">Due date</div><div className="val">{fmtDate(active.dueDate)}</div></div>
                  <div className="cell"><div className="lbl">Amount</div><div className="val">{fmtMoney(Number(active.amount || 0))}</div></div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <span className={"status " + (active.status === "paid" ? "paid" : active.status === "overdue" ? "overdue" : "due")}>{active.status}</span>
                </div>
                {active.notes && <div className="footnote">{active.notes}</div>}
                {active.attachment && (
                  <div style={{ marginTop: 16 }}>
                    <BillAttachmentLink attachment={active.attachment} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>}

      {drawer &&
      <>
          <div className="drawer-scrim" onClick={() => setDrawer(false)}></div>
          <div className="drawer">
            <div className="head">
              <div>
                <div className="kicker">New payable</div>
                <h3>Add vendor bill</h3>
              </div>
              <button className="iconbtn" onClick={() => setDrawer(false)} aria-label="Close"><Icon name="close" /></button>
            </div>
            <div className="body">
              <div className="field">
                <label>Upload bill file</label>
                <input className="input" type="file" accept="image/*,application/pdf,text/plain"
                  onChange={(e) => handleFile(e.target.files && e.target.files[0])} />
                <span className="help">We attempt to read amount from the uploaded file. If detection fails, enter amount manually.</span>
                {(readMsg || readingAmount) && <span className="help">{readMsg}</span>}
              </div>

              <div className="field">
                <label>Vendor / business</label>
                <input className="input" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Vendor name" />
              </div>
              <div className="row-2">
                <div className="field">
                  <label>Bill number</label>
                  <input className="input mono" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="INV-1234" />
                </div>
                <div className="field">
                  <label>Amount</label>
                  <input className="input mono" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
              </div>
              <div className="row-2">
                <div className="field">
                  <label>Issue date</label>
                  <input className="input mono" type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
                </div>
                <div className="field">
                  <label>Due date</label>
                  <input className="input mono" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Status</label>
                <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="received">Received</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea className="textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="foot">
              <button className="btn ghost" onClick={() => setDrawer(false)}>Cancel</button>
              <button className="btn primary" onClick={saveBill}><Icon name="check" size={13} /> Save bill</button>
            </div>
          </div>
        </>}
    </>);
}
window.BillsScreen = BillsScreen;

/* ---------- Paystubs ---------- */
function PaystubsScreen({ state, dispatch, business, toast, params }) {
  if (!state.employees.length) {
    return (
      <>
        <div className="toolbar">
          <div className="left">
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)" }}>
              0 statements on file
            </span>
          </div>
        </div>
        <div className="empty" style={{ marginTop: 24 }}>
          No employees yet. Add someone under Employees before generating pay statements.
        </div>
      </>
    );
  }

  const today = new Date();
  const fifteenAgo = new Date(today.getTime() - 15 * 86400000);
  const [employeeId, setEmployeeId] = useState2(params?.employeeId || state.employees[0].id);
  const [start, setStart] = useState2(fifteenAgo.toISOString().slice(0, 10));
  const [end, setEnd] = useState2(today.toISOString().slice(0, 10));
  const [hours, setHours] = useState2(80);
  const [overtimeHours, setOvertimeHours] = useState2(0);
  const [commissionPct, setCommissionPct] = useState2(0);
  const [paystubMonth, setPaystubMonth] = useState2("");
  const paystubPreviewRef = useRef(null);
  const [issued, setIssued] = useState2(today.toISOString().slice(0, 10));
  const [stub, setStub] = useState2(state.paystubs[0]);
  const [generated, setGenerated] = useState2(false);

  // Confirmation modal state — opened before actually creating the stub.
  const [confirmOpen, setConfirmOpen] = useState2(false);
  const [confirmTaxes, setConfirmTaxes] = useState2([]);
  const [confirmDeductions, setConfirmDeductions] = useState2([]);

  const emp = state.employees.find((e) => e.id === employeeId) || state.employees[0];

  React.useEffect(() => {
    setOvertimeHours(0);
    setCommissionPct(0);
  }, [employeeId, emp.payType]);

  React.useEffect(() => {
    if (params?.employeeId && params.employeeId !== employeeId) {
      setEmployeeId(params.employeeId);
      setGenerated(false);
    }
  }, [params?.employeeId]);

  // Compute gross + earnings from current form state.
  const computeGross = () => {
    if (emp.payType === "Hourly") {
      const regular = +(emp.payRate * hours).toFixed(2);
      const overtimeRate = +(emp.payRate * 1.5).toFixed(2);
      const overtime = +(overtimeRate * (Number(overtimeHours) || 0)).toFixed(2);
      const gross = +(regular + overtime).toFixed(2);
      const earnings = [
      { k: `Regular hours · ${hours} @ $${emp.payRate}`, v: regular }];
      if (overtimeHours > 0) {
        earnings.push({ k: `Overtime · ${overtimeHours} @ $${overtimeRate}`, v: overtime });
      }
      return { gross, earnings };
    }
    const base = +(emp.payRate / 24).toFixed(2);
    const commission = +(base * ((Number(commissionPct) || 0) / 100)).toFixed(2);
    const gross = +(base + commission).toFixed(2);
    const earnings = [{ k: "Regular salary (semi-monthly)", v: base }];
    if (commissionPct > 0) {
      earnings.push({ k: `Commission (${commissionPct}%)`, v: commission });
    }
    return { gross, earnings };
  };

  // STEP 1: open the confirmation modal preloaded with the employee's
  // country withholdings. User can edit / add / remove before confirming.
  const empLocation = emp.region
    ? `${emp.country || "United States"} · ${emp.region}`
    : (emp.country || "United States");

  const openConfirm = () => {
    const preset = window.SEED.getWithholdingPresets
      ? window.SEED.getWithholdingPresets(emp.country || "United States", emp.region)
      : (window.SEED.COUNTRY_PRESETS || {})[emp.country || "United States"] || [];
    setConfirmTaxes(preset.map((p, i) => ({ id: "t" + Date.now() + "_" + i, name: p.name, rate: p.rate })));
    setConfirmDeductions([]);
    setConfirmOpen(true);
  };

  // STEP 2: user confirmed — actually create the stub using their final rates.
  const confirmGenerate = () => {
    const { gross, earnings } = computeGross();
    const taxes = confirmTaxes.map((t) => ({
      k: t.name,
      v: +(gross * (Number(t.rate) || 0)).toFixed(2)
    })).filter((t) => t.v > 0);
    const deductions = confirmDeductions.map((d) => ({
      k: d.name,
      v: +(gross * (Number(d.rate) || 0) + (Number(d.fixed) || 0)).toFixed(2)
    })).filter((d) => d.v > 0);

    const newStub = {
      id: "p" + Date.now(),
      employeeId,
      periodStart: start,
      periodEnd: end,
      issued,
      gross,
      hours: emp.payType === "Hourly" ? hours : null,
      overtimeHours: emp.payType === "Hourly" ? Number(overtimeHours) || 0 : null,
      commissionPct: emp.payType === "Salary" ? Number(commissionPct) || 0 : null,
      earnings,
      taxes,
      deductions,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: "ADD_PAYSTUB", stub: newStub });
    setStub(newStub);
    setGenerated(true);
    setConfirmOpen(false);
    toast(`Generated pay statement for ${emp.name}`);
  };

  const { gross: previewGross } = computeGross();
  const previewTaxTotal = confirmTaxes.reduce((s, t) => s + previewGross * (Number(t.rate) || 0), 0);
  const previewDedTotal = confirmDeductions.reduce((s, d) => s + previewGross * (Number(d.rate) || 0) + (Number(d.fixed) || 0), 0);
  const previewNet = previewGross - previewTaxTotal - previewDedTotal;

  const filteredPaystubs = state.paystubs
    .filter((p) => !paystubMonth || String(p.issued || "").startsWith(paystubMonth))
    .sort((a, b) => String(b.issued || "").localeCompare(String(a.issued || "")));

  const employeeStubs = filteredPaystubs.filter((p) => p.employeeId === employeeId);
  const canDownloadStub = generated || employeeStubs.length > 0;
  const currentStub = canDownloadStub ? stub : null;

  const downloadCurrentPaystubPdf = async () => {
    if (!currentStub) {
      toast("Generate or select a pay statement first.");
      return;
    }
    const employee = state.employees.find((e) => e.id === currentStub.employeeId);
    if (!employee) {
      toast("Missing employee data for this statement.");
      return;
    }
    try {
      await window.downloadPaystubPdf({ stub: currentStub, element: paystubPreviewRef.current });
      toast("Pay statement PDF downloaded.");
    } catch (error) {
      toast(error?.message || "Could not download pay statement PDF.");
      console.error(error);
    }
  };

  return (
    <>
      <div className="toolbar">
        <div className="left">
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)" }}>
            {filteredPaystubs.length} statements on file
          </span>
          <button className="btn sm ghost" onClick={() => setPaystubMonth("")}>All months</button>
          <input
            className="input mono"
            type="month"
            value={paystubMonth}
            onChange={(e) => setPaystubMonth(e.target.value)}
            style={{ width: 154 }} />
        </div>
        <div className="right">
          <button className="btn primary" onClick={downloadCurrentPaystubPdf} disabled={!canDownloadStub} style={{ opacity: canDownloadStub ? 1 : 0.5 }}>
            <Icon name="download" size={13} /> Download PDF
          </button>
        </div>
      </div>

      <div className="two-col doc-two-col">
        <div className="doc-controls-col" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ border: "1px solid var(--rule)", borderRadius: "var(--r-md)", padding: 22, background: "var(--paper)" }}>
            <div className="kicker" style={{ marginBottom: 12 }}>Generate statement</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label>Employee</label>
                <select className="select" value={employeeId} onChange={(e) => {setEmployeeId(e.target.value);setGenerated(false);}}>
                  {state.employees.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.role}</option>)}
                </select>
              </div>
              <div className="row-2">
                <div className="field">
                  <label>Period start</label>
                  <input className="input mono" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
                <div className="field">
                  <label>Period end</label>
                  <input className="input mono" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
                </div>
              </div>
              <div className="row-2">
                <div className="field">
                  <label>Issue date</label>
                  <input className="input mono" type="date" value={issued} onChange={(e) => setIssued(e.target.value)} />
                </div>
                <div className="field">
                  <label>{emp.payType === "Hourly" ? "Regular hours" : "Pay basis"}</label>
                  {emp.payType === "Hourly" ?
                  <input className="input mono" type="number" value={hours} onChange={(e) => setHours(Number(e.target.value))} /> :

                  <input className="input mono" value="Semi-monthly" disabled style={{ opacity: 0.6 }} />
                  }
                </div>
              </div>
              {emp.payType === "Hourly" ?
              <div className="field">
                  <label>Overtime hours (1.5x hourly wage)</label>
                  <input className="input mono" type="number" min="0" step="0.25" value={overtimeHours}
                  onChange={(e) => setOvertimeHours(Number(e.target.value) || 0)} />
                  <span className="help">
                    Overtime rate is fixed at {fmtMoney(emp.payRate * 1.5)} per hour.
                  </span>
                </div> :
              <div className="field">
                  <label>Commission (%)</label>
                  <input className="input mono" type="number" min="0" step="0.01" value={commissionPct}
                  onChange={(e) => setCommissionPct(Number(e.target.value) || 0)} />
                  <span className="help">
                    Commission is added on top of the semi-monthly salary amount.
                  </span>
                </div>
              }
              <button className="btn primary" onClick={openConfirm} style={{ alignSelf: "flex-start" }}>
                <Icon name="sparkles" size={13} /> Generate statement
              </button>
              <span className="help" style={{ marginTop: -6 }}>
                You'll review the income withholding categories for <b>{empLocation}</b> before the statement is created.
              </span>
            </div>
          </div>

          {employeeStubs.length > 0 &&
          <div>
              <div className="kicker" style={{ marginBottom: 10 }}>Past statements · {emp.name.split(" ")[0]}</div>
              <div className="list-card">
                {employeeStubs.map((p) =>
              <div key={p.id} className={"row " + (p.id === stub.id ? "active" : "")} onClick={() => {setStub(p);setGenerated(true);}}>
                    <span className="name" style={{ fontSize: 14 }}>{fmtDate(p.periodStart)} → {fmtDate(p.periodEnd)}</span>
                    <span className="amount">{fmtMoney(p.gross)}</span>
                    <span className="meta">Issued {fmtDate(p.issued)}</span>
                  </div>
              )}
              </div>
            </div>
          }
        </div>

        <div className="doc-preview-col">
          {generated || employeeStubs.length > 0 ?
          <div ref={paystubPreviewRef}>
              <PaystubDocument stub={stub} employee={state.employees.find((e) => e.id === stub.employeeId)} business={business} />
            </div> :

          <div className="empty" style={{ padding: 60 }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--ink-2)", marginBottom: 6 }}>
                No statements yet
              </div>
              Fill the form on the left and generate a pay statement to preview it here.
            </div>
          }
        </div>
      </div>

      {/* Confirmation modal — shown before each paystub is created. */}
      {confirmOpen &&
      <>
          <div className="modal-scrim" onClick={() => setConfirmOpen(false)}></div>
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="kicker">Confirm withholding categories</div>
                <h3>Review before generating · {emp.name}</h3>
                <p className="modal-sub">
                  Loaded statutory categories for <b>{empLocation}</b>.
                  Edit any rate, rename a category, or add one-off deductions before the statement is created. Changes here apply to this statement only.
                </p>
              </div>
              <button className="iconbtn" onClick={() => setConfirmOpen(false)}><Icon name="close" /></button>
            </div>

            <div className="modal-body">
              <div className="confirm-summary">
                <div>
                  <div className="kicker">Gross pay</div>
                  <div className="confirm-num">{fmtMoney(previewGross)}</div>
                </div>
                <div>
                  <div className="kicker">Taxes</div>
                  <div className="confirm-num minus">−{fmtMoney(previewTaxTotal)}</div>
                </div>
                <div>
                  <div className="kicker">Deductions</div>
                  <div className="confirm-num minus">−{fmtMoney(previewDedTotal)}</div>
                </div>
                <div>
                  <div className="kicker">Net pay</div>
                  <div className="confirm-num net">{fmtMoney(previewNet)}</div>
                </div>
              </div>

              <div className="modal-section">
                <div className="modal-section-head">
                  <h4>Income withheld · {empLocation}</h4>
                  <span className="meta">{confirmTaxes.length} categories</span>
                </div>
                <div className="rate-table">
                  <span className="lbl">Category</span>
                  <span className="lbl" style={{ textAlign: "right" }}>Rate</span>
                  <span></span>
                  {confirmTaxes.map((t, i) =>
                <React.Fragment key={t.id}>
                      <input className="input" value={t.name}
                  onChange={(e) => {
                    const next = [...confirmTaxes];
                    next[i] = { ...t, name: e.target.value };
                    setConfirmTaxes(next);
                  }} />
                      <div style={{ position: "relative" }}>
                        <input className="input mono" type="number" step="0.001"
                    value={+(Number(t.rate) * 100).toFixed(3)}
                    style={{ paddingRight: 22, textAlign: "right" }}
                    onChange={(e) => {
                      const next = [...confirmTaxes];
                      next[i] = { ...t, rate: Number(e.target.value) / 100 };
                      setConfirmTaxes(next);
                    }} />
                        <span style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)", pointerEvents: "none"
                    }}>%</span>
                      </div>
                      <button className="iconbtn" title="Remove"
                  onClick={() => setConfirmTaxes(confirmTaxes.filter((_, idx) => idx !== i))}>
                        <Icon name="close" size={12} />
                      </button>
                    </React.Fragment>
                )}
                </div>
                <button className="btn ghost sm" style={{ marginTop: 8, paddingLeft: 0 }}
              onClick={() => setConfirmTaxes([...confirmTaxes, { id: "t" + Date.now(), name: "New withholding", rate: 0 }])}>
                  <Icon name="plus" size={12} /> Add withholding
                </button>
              </div>

              <div className="modal-section">
                <div className="modal-section-head">
                  <h4>Other deductions <span style={{ color: "var(--ink-3)", fontWeight: 400, fontFamily: "var(--sans)", fontSize: 13 }}>(optional)</span></h4>
                  <span className="meta">benefits, contributions, garnishments</span>
                </div>
                <div className="rate-table" style={{ gridTemplateColumns: "1fr 90px 90px 28px" }}>
                  <span className="lbl">Deduction</span>
                  <span className="lbl" style={{ textAlign: "right" }}>% gross</span>
                  <span className="lbl" style={{ textAlign: "right" }}>Fixed</span>
                  <span></span>
                  {confirmDeductions.map((d, i) =>
                <React.Fragment key={d.id}>
                      <input className="input" value={d.name}
                  onChange={(e) => {
                    const next = [...confirmDeductions];
                    next[i] = { ...d, name: e.target.value };
                    setConfirmDeductions(next);
                  }} />
                      <input className="input mono" type="number" step="0.01"
                  value={+(Number(d.rate || 0) * 100).toFixed(2)}
                  style={{ textAlign: "right" }}
                  onChange={(e) => {
                    const next = [...confirmDeductions];
                    next[i] = { ...d, rate: Number(e.target.value) / 100 };
                    setConfirmDeductions(next);
                  }} />
                      <input className="input mono" type="number" step="0.01"
                  value={d.fixed || 0}
                  style={{ textAlign: "right" }}
                  onChange={(e) => {
                    const next = [...confirmDeductions];
                    next[i] = { ...d, fixed: Number(e.target.value) };
                    setConfirmDeductions(next);
                  }} />
                      <button className="iconbtn" title="Remove"
                  onClick={() => setConfirmDeductions(confirmDeductions.filter((_, idx) => idx !== i))}>
                        <Icon name="close" size={12} />
                      </button>
                    </React.Fragment>
                )}
                </div>
                <button className="btn ghost sm" style={{ marginTop: 8, paddingLeft: 0 }}
              onClick={() => setConfirmDeductions([...confirmDeductions, { id: "d" + Date.now(), name: "New deduction", rate: 0, fixed: 0 }])}>
                  <Icon name="plus" size={12} /> Add deduction
                </button>
              </div>
            </div>

            <div className="modal-foot">
              <button className="btn ghost" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button className="btn primary" onClick={confirmGenerate}>
                <Icon name="check" size={13} /> Confirm & generate
              </button>
            </div>
          </div>
        </>
      }
    </>);

}
window.PaystubsScreen = PaystubsScreen;

/* ---------- Employees ---------- */
function EmployeeDrawer({ open, employee, onClose, onSave, onDelete }) {
  const isEdit = !!employee;
  const blank = {
    name: "", role: "", payType: "Salary", payRate: 60000,
    taxRate: 0.20, since: new Date().toISOString().slice(0, 7),
    country: "United States",
    region: (window.SEED.getRegionOptions && window.SEED.getRegionOptions("United States")[0]) || "",
  };
  const [form, setForm] = useState2(blank);

  React.useEffect(() => {
    if (!open) return;
    const base = employee ? { ...employee } : { ...blank };
    const country = base.country || "United States";
    const regions = window.SEED.getRegionOptions ? window.SEED.getRegionOptions(country) : [];
    if (!base.region && regions.length) base.region = regions[0];
    setForm(base);
  }, [open, employee]);

  if (!open) return null;
  const valid = form.name.trim() && form.role.trim() && form.payRate > 0;
  const regionOptions = window.SEED.getRegionOptions ? window.SEED.getRegionOptions(form.country) : [];
  const regionLabel = window.SEED.getRegionLabel ? window.SEED.getRegionLabel(form.country) : "Province / state";
  const countryWithholdings = window.SEED.getWithholdingPresets
    ? window.SEED.getWithholdingPresets(form.country, form.region)
    : (window.SEED.COUNTRY_PRESETS || {})[form.country] || [];
  const locationLabel = form.region ? `${form.country} · ${form.region}` : form.country;

  return (
    <>
      <div className="drawer-scrim" onClick={onClose}></div>
      <div className="drawer">
        <div className="head">
          <div>
            <div className="kicker">{isEdit ? "Edit person" : "Add person"}</div>
            <h3>{isEdit ? form.name || "Untitled" : "Add to your team"}</h3>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="body">
          <div className="field">
            <label>Full name</label>
            <input className="input" autoFocus value={form.name}
            placeholder="e.g. Marisol Vega"
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Role</label>
            <input className="input" value={form.role}
            placeholder="e.g. Senior Designer"
            onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </div>

          <div className="row-2">
            <div className="field">
              <label>Pay type</label>
              <select className="select" value={form.payType} onChange={(e) => {
                const next = e.target.value;
                setForm({ ...form, payType: next, payRate: next === "Salary" ? 60000 : 35 });
              }}>
                <option>Salary</option>
                <option>Hourly</option>
              </select>
            </div>
            <div className="field">
              <label>{form.payType === "Salary" ? "Annual rate" : "Hourly rate"}</label>
              <input className="input mono" type="number" step="0.01" value={form.payRate}
              onChange={(e) => setForm({ ...form, payRate: Number(e.target.value) })} />
            </div>
          </div>

          <div className="row-2">
            <div className="field">
              <label>Started</label>
              <input className="input mono" type="month" value={form.since}
              onChange={(e) => setForm({ ...form, since: e.target.value })} />
            </div>
            <div className="field">
              <label>Tax bracket (%)</label>
              <input className="input mono" type="number" step="0.01" value={+(form.taxRate * 100).toFixed(2)}
              onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) / 100 })} />
            </div>
          </div>

          <div className="field">
            <label>Country of employment</label>
            <select className="select" value={form.country}
            onChange={(e) => {
              const nextCountry = e.target.value;
              const regions = window.SEED.getRegionOptions ? window.SEED.getRegionOptions(nextCountry) : [];
              setForm({
                ...form,
                country: nextCountry,
                region: regions[0] || "",
              });
            }}>
              {Object.keys(window.SEED.COUNTRY_PRESETS).map((k) => <option key={k}>{k}</option>)}
            </select>
            <span className="help">
              Determines which income withholding categories appear on this person's pay statements.
            </span>
          </div>

          {regionOptions.length > 0 &&
          <div className="field">
            <label>{regionLabel}</label>
            <select className="select" value={form.region || regionOptions[0]}
            onChange={(e) => setForm({ ...form, region: e.target.value })}>
              {regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <span className="help">
              Provincial or state income tax is included in the withholding preview below.
            </span>
          </div>
          }

          {/* Preview of withholdings for the selected country / region */}
          <div style={{
            border: "1px solid var(--rule)",
            background: "var(--paper-2)",
            borderRadius: "var(--r-md)",
            padding: "12px 14px"
          }}>
            <div className="kicker" style={{ fontSize: 9.5, marginBottom: 8 }}>
              Withholdings · {locationLabel}
            </div>
            {countryWithholdings.length === 0 ?
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                No statutory withholdings preset. You'll define them when generating each statement.
              </div> :

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {countryWithholdings.map((w, i) =>
              <div key={i} style={{
                display: "flex", justifyContent: "space-between",
                fontSize: 12.5, fontFamily: "var(--mono)", color: "var(--ink-2)"
              }}>
                    <span>{w.name}</span>
                    <span>{(w.rate * 100).toFixed(2)}%</span>
                  </div>
              )}
              </div>
            }
            <div className="help" style={{ marginTop: 8 }}>
              You'll be able to fine-tune these every time you generate a statement.
            </div>
          </div>
        </div>
        <div className="foot">
          {isEdit && onDelete &&
          <button className="btn ghost" onClick={() => onDelete(employee.id)}
          style={{ color: "var(--accent)", marginRight: "auto" }}>
              <Icon name="trash" size={13} /> Remove
            </button>
          }
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!valid}
          style={{ opacity: valid ? 1 : 0.5 }}
          onClick={() => onSave({ ...form, id: form.id || "u" + Date.now() })}>
            <Icon name="check" size={13} /> {isEdit ? "Save changes" : "Add person"}
          </button>
        </div>
      </div>
    </>);

}

function EmployeesScreen({ state, dispatch, toast, go, params }) {
  const [drawer, setDrawer] = useState2(null); // null | "new" | employee object

  React.useEffect(() => {
    if (params?.openAdd) setDrawer("new");
  }, [params]);

  const handleSave = (emp) => {
    if (state.employees.find((e) => e.id === emp.id)) {
      dispatch({ type: "UPDATE_EMPLOYEE", employee: emp });
      toast(`${emp.name} updated`);
    } else {
      dispatch({ type: "ADD_EMPLOYEE", employee: emp });
      toast(`${emp.name} added to the team`);
    }
    setDrawer(null);
  };

  const handleDelete = (id) => {
    const e = state.employees.find((x) => x.id === id);
    dispatch({ type: "REMOVE_EMPLOYEE", id });
    toast(`Removed ${e ? e.name : "person"}`);
    setDrawer(null);
  };

  return (
    <>
      <div className="toolbar">
        <div className="left">
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)" }}>
            {state.employees.length} on the team
          </span>
        </div>
        <div className="right">
          <button className="btn primary" onClick={() => setDrawer("new")}>
            <Icon name="plus" size={13} /> Add person
          </button>
        </div>
      </div>

      <div className="emp-grid">
        {state.employees.map((e) => {
          const initials = e.name.split(" ").map((s) => s[0]).join("");
          const country = e.country || "—";
          const location = e.region ? `${country} · ${e.region}` : country;
          return (
            <div key={e.id} className="emp-card">
              <div className="top">
                <div className="avatar">{initials}</div>
                <div>
                  <h4>{e.name}</h4>
                  <div className="role">{e.role}</div>
                </div>
              </div>
              <div className="meta-grid">
                <div><div className="k">Pay type</div><div className="v">{e.payType}</div></div>
                <div><div className="k">{e.payType === "Salary" ? "Annual" : "Hourly"}</div>
                  <div className="v">{e.payType === "Salary" ? fmtMoney(e.payRate) : "$" + e.payRate + "/hr"}</div>
                </div>
                <div><div className="k">Location</div><div className="v" style={{ fontSize: 12, fontFamily: "var(--sans)" }}>{location}</div></div>
                <div><div className="k">Since</div><div className="v">{e.since}</div></div>
              </div>
              <div className="actions">
                <button className="btn sm" onClick={() => go("paystubs", { employeeId: e.id })}>
                  <Icon name="paystub" size={13} /> Pay statement
                </button>
                <button className="btn sm ghost" onClick={() => setDrawer(e)}><Icon name="edit" size={13} /></button>
              </div>
            </div>);

        })}
      </div>

      <EmployeeDrawer
        open={drawer !== null}
        employee={drawer === "new" ? null : drawer}
        onClose={() => setDrawer(null)}
        onSave={handleSave}
        onDelete={handleDelete} />
      
    </>);

}
window.EmployeesScreen = EmployeesScreen;

/* ---------- Transaction history ---------- */
function TransactionHistoryScreen({ state, go }) {
  const items = useMemo2(() => {
    const invoiceCreated = state.invoices.map((inv) => ({
      id: `inv-created-${inv.id}`,
      at: inv.createdAt || (inv.date ? `${inv.date}T00:00:00.000Z` : null),
      type: "invoice_created",
      label: `${inv.number || "Invoice"} created`,
      detail: `Status: ${(inv.status || "draft").toUpperCase()}`,
      route: { id: "invoices", params: { focusId: inv.id } },
    }));

    const invoiceStatusChanges = state.invoices.flatMap((inv) =>
      (inv.statusHistory || []).map((h, idx) => ({
        id: `inv-status-${inv.id}-${idx}`,
        at: h.at,
        type: "invoice_status",
        label: `${inv.number || "Invoice"} status changed`,
        detail: `${(h.from || "draft").toUpperCase()} -> ${(h.to || inv.status || "draft").toUpperCase()}`,
        route: { id: "invoices", params: { focusId: inv.id } },
      }))
    );

    const paystubCreated = state.paystubs.map((stub) => {
      const emp = state.employees.find((e) => e.id === stub.employeeId);
      return {
        id: `paystub-created-${stub.id}`,
        at: stub.createdAt || (stub.issued ? `${stub.issued}T00:00:00.000Z` : null),
        type: "paystub_created",
        label: `Pay statement created${emp ? ` for ${emp.name}` : ""}`,
        detail: `${stub.periodStart || "?"} -> ${stub.periodEnd || "?"}`,
        route: { id: "paystubs", params: { employeeId: stub.employeeId } },
      };
    });

    const billCreated = (state.bills || []).map((bill) => ({
      id: `bill-created-${bill.id}`,
      at: bill.createdAt || (bill.issueDate ? `${bill.issueDate}T00:00:00.000Z` : null),
      type: "bill_created",
      label: `Bill added${bill.vendor ? ` from ${bill.vendor}` : ""}`,
      detail: `${fmtMoney(Number(bill.amount || 0))} · ${(bill.status || "received").toUpperCase()}`,
      route: { id: "bills", params: { focusId: bill.id } },
    }));

    const billStatusChanges = (state.bills || []).flatMap((bill) =>
      (bill.statusHistory || []).map((h, idx) => ({
        id: `bill-status-${bill.id}-${idx}`,
        at: h.at,
        type: "bill_status",
        label: `${bill.vendor || "Bill"} status changed`,
        detail: `${(h.from || "received").toUpperCase()} -> ${(h.to || bill.status || "received").toUpperCase()}`,
        route: { id: "bills", params: { focusId: bill.id } },
      }))
    );

    return [...invoiceCreated, ...invoiceStatusChanges, ...paystubCreated, ...billCreated, ...billStatusChanges].
    filter((x) => !!x.at).
    sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [state.invoices, state.paystubs, state.employees, state.bills]);

  return (
    <>
      <div className="toolbar">
        <div className="left">
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)" }}>
            {items.length} events
          </span>
        </div>
      </div>

      {items.length === 0 &&
      <div className="empty">
          No events yet. Create invoices, bills, or pay statements to see transaction history.
        </div>}

      {items.length > 0 &&
      <table className="tbl tx-history">
          <thead>
            <tr>
              <th style={{ width: 140 }}>Date</th>
              <th>Event</th>
              <th style={{ width: 220 }}>Details</th>
              <th style={{ width: 120 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) =>
            <tr key={it.id}>
                <td><span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{new Date(it.at).toLocaleDateString()}</span></td>
                <td>{it.label}</td>
                <td style={{ color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 11 }}>{it.detail}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn sm ghost" onClick={() => go(it.route.id, it.route.params)}>
                    Open <Icon name="chev_r" size={12} />
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>}
    </>);
}
window.TransactionHistoryScreen = TransactionHistoryScreen;

/* ---------- Reports ---------- */
function ReportsScreen({ state }) {
  const billCategory = { id: "bills", name: "Bills", color: "#6e1f1f" };
  const expenseRows = [
  ...state.expenses,
  ...(state.bills || []).map((b) => ({
    id: b.id,
    category: "bills",
    amount: Number(b.amount || 0),
    date: b.issueDate || b.createdAt?.slice(0, 10) || "",
  }))];

  const byCategory = useMemo2(() => {
    const m = {};
    expenseRows.forEach((e) => {m[e.category] = (m[e.category] || 0) + Number(e.amount || 0);});
    const withBills = [...state.CATEGORIES, billCategory];
    return withBills.map((c) => ({ ...c, value: m[c.id] || 0 })).sort((a, b) => b.value - a.value);
  }, [expenseRows, state.CATEGORIES]);

  const maxCat = Math.max(...byCategory.map((c) => c.value), 1);

  const byMonth = useMemo2(() => {
    const m = {};
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    expenseRows.forEach((e) => {
      const k = (e.date || "").slice(0, 7);
      if (k) m[k] = (m[k] || 0) + Number(e.amount || 0);
    });
    return months.map((k) => ({ k, v: m[k] || 0 }));
  }, [expenseRows]);

  const maxMonth = Math.max(...byMonth.map((m) => m.v), 1);

  return (
    <>
      <div className="kpis">
        <div className="kpi">
          <div className="kicker">Total tracked · 6 months</div>
          <div className="value"><span className="sym">$</span>{byMonth.reduce((s, m) => s + m.v, 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="kpi">
          <div className="kicker">Avg. monthly spend</div>
          <div className="value"><span className="sym">$</span>{Math.round(byMonth.reduce((s, m) => s + m.v, 0) / byMonth.length).toLocaleString()}</div>
        </div>
        <div className="kpi">
          <div className="kicker">Top category</div>
          <div className="value" style={{ fontSize: 26 }}>{byCategory[0].name}</div>
          <div className="delta">{fmtMoney(byCategory[0].value)} this period</div>
        </div>
      </div>

      <div className="report-grid">
        <div>
          <div className="section-head" style={{ margin: "0 0 14px" }}>
            <h2>Spend by category</h2>
            <span className="meta">Last 6 months</span>
          </div>
          <div>
            {byCategory.map((c) =>
            <div key={c.id} className="bar-row">
                <span className="lbl">
                  <span className="cat-tag"><span className="swatch" style={{ background: c.color }}></span>{c.name}</span>
                </span>
                <div className="bar">
                  <div className="fill" style={{ width: c.value / maxCat * 100 + "%", background: c.color }}></div>
                </div>
                <span className="v">{fmtMoney(c.value)}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="section-head" style={{ margin: "0 0 14px" }}>
            <h2>Monthly cadence</h2>
            <span className="meta">$</span>
          </div>
          <svg viewBox="0 0 320 200" width="100%" height="220" style={{ display: "block" }}>
            {/* baseline */}
            <line x1="40" y1="170" x2="320" y2="170" stroke="var(--rule)" strokeWidth="1" />
            {byMonth.map((m, i) => {
              const x = 40 + i * 50;
              const h = m.v / maxMonth * 130;
              const y = 170 - h;
              const label = new Date(m.k + "-01").toLocaleDateString("en-US", { month: "short" });
              return (
                <g key={m.k}>
                  <rect x={x} y={y} width="30" height={h} fill="var(--accent)" opacity={i === byMonth.length - 1 ? 1 : 0.55} />
                  <text x={x + 15} y="186" textAnchor="middle" fontSize="10" fontFamily="var(--mono)" fill="var(--ink-3)" letterSpacing="0.1em">{label.toUpperCase()}</text>
                  <text x={x + 15} y={y - 6} textAnchor="middle" fontSize="10" fontFamily="var(--mono)" fill="var(--ink-2)">${Math.round(m.v / 100) / 10}k</text>
                </g>);

            })}
          </svg>
        </div>
      </div>
    </>);

}
window.ReportsScreen = ReportsScreen;

/* ---------- Settings ---------- */
function SettingsScreen({ business, setBusiness, toast }) {
  const update = (patch) => setBusiness({ ...business, ...patch });
  const COUNTRIES = window.SEED.COUNTRY_TAX_RATES || {};
  const countryInfo = COUNTRIES[business.country] || COUNTRIES["United States"];

  return (
    <>
      <div className="settings-grid">
        <div>
          <h3>User business</h3>
          <p className="desc">
            Your own business profile. Appears on every invoice and pay statement you issue, and shows in the sidebar as your logo.
          </p>
        </div>
        <div className="form">
          <div className="field">
            <label>Business name</label>
            <input className="input" value={business.name}
              placeholder="Your registered business name"
              onChange={(e) => update({ name: e.target.value })} />
            <span className="help">
              Shown big in the sidebar with <b>Marten Bookkeeping</b> tucked underneath.
            </span>
          </div>
          <div className="field">
            <label>Owner / primary contact</label>
            <input className="input" value={business.owner}
              onChange={(e) => update({ owner: e.target.value })} />
          </div>
          <div className="field">
            <label>Email</label>
            <input className="input" value={business.email}
              onChange={(e) => update({ email: e.target.value })} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Business No.</label>
              <input
                className="input mono"
                value={business.businessNo || ""}
                placeholder="Registration number"
                onChange={(e) => update({ businessNo: e.target.value })} />
            </div>
            <div className="field">
              <label>GST/Tax ID</label>
              <input
                className="input mono"
                value={business.gstTaxId || ""}
                placeholder="GST / VAT / Tax ID"
                onChange={(e) => update({ gstTaxId: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Mailing address</label>
            <textarea className="textarea" value={business.address}
              onChange={(e) => update({ address: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="settings-grid">
        <div>
          <h3>Financial preferences</h3>
          <p className="desc">
            Defaults applied to invoices and pay statements. Choose a country to load its sales / VAT / GST rate — you can override it after.
          </p>
        </div>
        <div className="form">
          <div className="field">
            <label>Country of operation</label>
            <select className="select" value={business.country || "United States"} onChange={(e) => {
              const next = e.target.value;
              const info = COUNTRIES[next];
              update({
                country: next,
                taxRate: info ? info.taxRate : business.taxRate,
                currency: info ? info.currency : business.currency,
              });
              toast(`Loaded ${next} financial defaults`);
            }}>
              {Object.keys(COUNTRIES).map((k) => <option key={k}>{k}</option>)}
            </select>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Currency</label>
              <select className="select" value={business.currency} onChange={(e) => update({ currency: e.target.value })}>
                {[...new Set(["USD ($)","EUR (€)","GBP (£)","CAD ($)","AUD ($)","INR (₹)","JPY (¥)","SGD ($)","NZD ($)","MXN ($)","BRL (R$)","ZAR (R)","AED (د.إ)","CHF (Fr)","SEK (kr)", business.currency])].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Default payment terms</label>
              <select className="select" value={business.terms} onChange={(e) => update({ terms: e.target.value })}>
                <option>Net 15</option>
                <option>Net 30</option>
                <option>Net 60</option>
                <option>Due on receipt</option>
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>{countryInfo.label} (%)</label>
              <input className="input mono" type="number" step="0.01" value={+(business.taxRate * 100).toFixed(3)}
                onChange={(e) => update({ taxRate: Number(e.target.value) / 100 })} />
              <span className="help">Default rate loaded from <b>{business.country || "—"}</b>. Edit to override.</span>
            </div>
            <div className="field">
              <label>Fiscal year start</label>
              <select className="select" value={business.fy} onChange={(e) => update({ fy: e.target.value })}>
                <option>January</option>
                <option>April</option>
                <option>July</option>
                <option>October</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-grid">
        <div>
          <h3>Document defaults</h3>
          <p className="desc">Footer language and standard notes attached to every document.</p>
        </div>
        <div className="form">
          <div className="field">
            <label>Invoice footer note</label>
            <textarea className="textarea" value={business.invoiceFooter} onChange={(e) => update({ invoiceFooter: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn primary" onClick={() => toast("Settings saved")}>
              <Icon name="check" size={13} /> Save changes
            </button>
            <button className="btn ghost">Discard</button>
          </div>
        </div>
      </div>
    </>
  );
}
window.SettingsScreen = SettingsScreen;

/* ---------- Business clients ---------- */
function ClientDrawer({ open, client, onClose, onSave, onDelete }) {
  const isEdit = !!client;
  const COUNTRIES = window.SEED.COUNTRY_TAX_RATES || {};
  const blank = {
    name: "",
    contact: "",
    email: "",
    phone: "",
    address: "",
    country: "United States",
    taxId: "",
    notes: "",
    since: new Date().toISOString().slice(0, 7),
  };
  const [form, setForm] = useState2(blank);

  React.useEffect(() => {
    if (open) setForm(client ? { ...client } : blank);
  }, [open, client]);

  if (!open) return null;
  const valid = form.name.trim();

  return (
    <>
      <div className="drawer-scrim" onClick={onClose}></div>
      <div className="drawer">
        <div className="head">
          <div>
            <div className="kicker">{isEdit ? "Edit client" : "New client"}</div>
            <h3>{isEdit ? (form.name || "Untitled") : "Add a business client"}</h3>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="body">
          <div className="field">
            <label>Client name</label>
            <input className="input" autoFocus value={form.name}
              placeholder="e.g. Client name"
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="row-2">
            <div className="field">
              <label>Primary contact</label>
              <input className="input" value={form.contact}
                placeholder="Who do you work with?"
                onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </div>
            <div className="field">
              <label>On boarded</label>
              <input className="input mono" type="month" value={form.since}
                onChange={(e) => setForm({ ...form, since: e.target.value })} />
            </div>
          </div>
          <div className="row-2">
            <div className="field">
              <label>Email</label>
              <input className="input" value={form.email}
                placeholder="billing@example.com"
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input className="input mono" value={form.phone}
                placeholder="+1 (555) 000-0000"
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Billing address</label>
            <textarea className="textarea" value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="row-2">
            <div className="field">
              <label>Country</label>
              <select className="select" value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}>
                {Object.keys(COUNTRIES).map((k) => <option key={k}>{k}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Tax ID / VAT no.</label>
              <input className="input mono" value={form.taxId}
                placeholder="EIN, ABN, GSTIN, …"
                onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea className="textarea" value={form.notes}
              placeholder="Payment habits, preferences, anything worth remembering."
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div className="foot">
          {isEdit && onDelete && (
            <button className="btn ghost" onClick={() => onDelete(client.id)}
              style={{ color: "var(--accent)", marginRight: "auto" }}>
              <Icon name="trash" size={13} /> Remove
            </button>
          )}
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!valid}
            style={{ opacity: valid ? 1 : 0.5 }}
            onClick={() => onSave({ ...form, id: form.id || ("c" + Date.now()) })}>
            <Icon name="check" size={13} /> {isEdit ? "Save changes" : "Add client"}
          </button>
        </div>
      </div>
    </>
  );
}

function ClientsScreen({ state, dispatch, toast, go, params }) {
  const [drawer, setDrawer] = useState2(null); // null | "new" | client object
  const [q, setQ] = useState2("");

  React.useEffect(() => {
    if (params?.openAdd) setDrawer("new");
  }, [params]);

  const handleSave = (cl) => {
    if (state.clients.find((c) => c.id === cl.id)) {
      dispatch({ type: "UPDATE_CLIENT", client: cl });
      toast(`${cl.name} saved`);
    } else {
      dispatch({ type: "ADD_CLIENT", client: cl });
      toast(`${cl.name} added to your client list`);
    }
    setDrawer(null);
  };

  const handleDelete = (id) => {
    const c = state.clients.find((x) => x.id === id);
    dispatch({ type: "REMOVE_CLIENT", id });
    toast(`Removed ${c ? c.name : "client"}`);
    setDrawer(null);
  };

  const filtered = state.clients.filter((c) =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) ||
    (c.contact || "").toLowerCase().includes(q.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(q.toLowerCase())
  );

  // Invoice activity per client — count + outstanding amount, drives the
  // small footer on each card. Lets the freelancer see at a glance who's
  // got money in flight.
  const activity = (clientId) => {
    const invs = state.invoices.filter((i) => i.clientId === clientId);
    const open = invs.filter((i) => i.status === "due" || i.status === "overdue");
    const outstanding = open.reduce((s, i) =>
      s + i.items.reduce((a, it) => a + it.qty * it.rate, 0) * (1 + (i.taxRate || 0)), 0);
    return { total: invs.length, outstanding };
  };

  return (
    <>
      <div className="toolbar">
        <div className="left">
          <div className="search">
            <Icon name="search" />
            <input className="input" placeholder="Search clients…" value={q}
              onChange={(e) => setQ(e.target.value)} />
          </div>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)" }}>
            {filtered.length} of {state.clients.length}
          </span>
        </div>
        <div className="right">
          <button className="btn primary" onClick={() => setDrawer("new")}>
            <Icon name="plus" size={13} /> Add client
          </button>
        </div>
      </div>

      <div className="biz-grid">
        {filtered.map((c) => {
          const initials = c.name.split(" ").map((s) => s[0]).slice(0, 2).join("");
          const act = activity(c.id);          return (
            <div key={c.id} className="biz-card">
              <div className="biz-card-top">
                <div className="biz-avatar">{initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4>{c.name}</h4>
                  <div className="biz-owner">{c.contact || "—"}</div>
                </div>
                {act.outstanding > 0 && (
                  <span className="biz-active-pill" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
                    {fmtMoney(act.outstanding)} due
                  </span>
                )}
              </div>

              <div className="biz-meta">
                <div>
                  <div className="k">Email</div>
                  <div className="v" style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email || "—"}</div>
                </div>
                <div>
                  <div className="k">Phone</div>
                  <div className="v mono">{c.phone || "—"}</div>
                </div>
                <div>
                  <div className="k">Country</div>
                  <div className="v">{c.country || "—"}</div>
                </div>
                <div>
                  <div className="k">Tax ID</div>
                  <div className="v mono" style={{ fontSize: 11.5 }}>{c.taxId || "—"}</div>
                </div>
              </div>

              {c.address && (
                <div className="biz-address">
                  {c.address.split("\n").map((line, i) => <div key={i}>{line}</div>)}
                </div>
              )}

              {c.notes && (
                <div className="biz-address" style={{ borderTop: "1px dashed var(--rule)", fontStyle: "italic" }}>
                  "{c.notes}"
                </div>
              )}

              <div className="biz-actions">
                <button className="btn sm" onClick={() => go("invoices", { focusId: state.invoices.find((i) => i.clientId === c.id)?.id })}>
                  <Icon name="invoice" size={12} /> {act.total} invoice{act.total === 1 ? "" : "s"}
                </button>
                <button className="btn sm ghost" onClick={() => setDrawer(c)}>
                  <Icon name="edit" size={12} /> Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ClientDrawer
        open={drawer !== null}
        client={drawer === "new" ? null : drawer}
        onClose={() => setDrawer(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </>
  );
}
window.ClientsScreen = ClientsScreen;