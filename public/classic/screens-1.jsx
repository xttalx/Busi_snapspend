/* Dashboard + Expenses screens */
const { useState, useMemo, useEffect } = React;

/* ---------- Dashboard ---------- */
function Sparkline({ values, color = "currentColor", height = 38 }) {
  const w = 180, h = height, pad = 2;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const step = (w - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => [pad + i * step, h - pad - ((v - min) / range) * (h - pad * 2)]);
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${d} L${pts[pts.length-1][0]},${h} L${pts[0][0]},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: h, color }}>
      <path d={area} fill="currentColor" opacity="0.1" />
      <path d={d} stroke="currentColor" strokeWidth="1.4" fill="none" />
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="2.4" fill="currentColor" />
    </svg>
  );
}

function monthKeyFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function pctChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function lastMonthKeys(count, from = new Date()) {
  const keys = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
    keys.push(monthKeyFromDate(d));
  }
  return keys;
}

function billPaidDate(bill) {
  const paidEvent = [...(bill.statusHistory || [])].
  reverse().
  find((h) => (h.to || "").toLowerCase() === "paid");
  if (paidEvent?.at) return paidEvent.at.slice(0, 10);
  return bill.paidDate || bill.issueDate || "";
}

function paidBillAsExpense(bill) {
  return {
    id: "bill-" + bill.id,
    date: billPaidDate(bill),
    vendor: bill.vendor || "Bill payment",
    note: bill.number ? `Bill ${bill.number}` : "Bill payment",
    category: "bills",
    method: "Bill paid",
    amount: Number(bill.amount || 0),
    receipt: bill.attachment || null,
    isBill: true,
  };
}

function Dashboard({ state, go }) {
  const { expenses, bills = [], invoices, clients, paystubs } = state;

  const now = new Date();
  const monthKey = monthKeyFromDate(now);
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = monthKeyFromDate(prevDate);
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const prevMonthLabel = prevDate.toLocaleDateString("en-US", { month: "long" });

  const revenue = (k) => invoices
    .filter(i => i.status === "paid" && i.date.startsWith(k))
    .reduce((s, i) => s + i.items.reduce((a, it) => a + it.qty * it.rate, 0) * (1 + (i.taxRate || 0)), 0);

  const expensesIn = (k) => {
    const direct = expenses.filter((e) => (e.date || "").startsWith(k)).reduce((s, e) => s + Number(e.amount || 0), 0);
    const billsAsExpense = bills.filter((b) => (b.issueDate || "").startsWith(k)).reduce((s, b) => s + Number(b.amount || 0), 0);
    return direct + billsAsExpense;
  };
  const wagesIn = (k) => paystubs.filter(p => p.issued && p.issued.startsWith(k)).reduce((s, p) => s + p.gross, 0);

  const monthRevenue = revenue(monthKey);
  const monthExpense = expensesIn(monthKey);
  const monthWages = wagesIn(monthKey);
  const monthNet = monthRevenue - monthExpense - monthWages;

  const prevRevenue = revenue(prevKey);
  const prevExpense = expensesIn(prevKey);
  const prevWages = wagesIn(prevKey);
  const prevNet = prevRevenue - prevExpense - prevWages;

  const dRev = pctChange(monthRevenue, prevRevenue);
  const dExp = pctChange(monthExpense, prevExpense);
  const dWages = pctChange(monthWages, prevWages);
  const dNet = pctChange(monthNet, prevNet);

  const sparkKeys = lastMonthKeys(12, now);
  const revSpark = sparkKeys.map(revenue);
  const expSpark = sparkKeys.map(expensesIn);
  const wageSpark = sparkKeys.map(wagesIn);
  const paidThisMonth = invoices.filter(i => i.status === "paid" && i.date.startsWith(monthKey)).length;
  const expenseEntriesThisMonth =
  expenses.filter((e) => (e.date || "").startsWith(monthKey)).length +
  bills.filter((b) => (b.issueDate || "").startsWith(monthKey)).length;

  const outstanding = invoices.filter(i => i.status === "due" || i.status === "overdue")
    .reduce((s, i) => s + i.items.reduce((a, it) => a + it.qty * it.rate, 0) * (1 + (i.taxRate || 0)), 0);

  const paidBillRows = (bills || []).filter((b) => (b.status || "").toLowerCase() === "paid").map(paidBillAsExpense);
  const recent = [...expenses.map((e) => ({ ...e, isBill: false })), ...paidBillRows].
  filter((e) => e.date).
  sort((a, b) => b.date.localeCompare(a.date)).
  slice(0, 6);
  const recentInvoices = [...invoices].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const fmt = (n) => Math.round(n).toLocaleString("en-US");

  return (
    <>
      <div className="kpis">
        <div className="kpi">
          <div className="kicker">{monthLabel} revenue · invoices paid</div>
          <div className="value"><span className="sym">$</span>{fmt(monthRevenue)}</div>
          <div className={"delta " + (dRev >= 0 ? "up" : "down")}>
            <Icon name={dRev >= 0 ? "arrow_up" : "arrow_down"} size={11} />
            {Math.abs(dRev).toFixed(1)}% vs. {prevMonthLabel}
          </div>
          <Sparkline values={revSpark.length ? revSpark : [0]} color="var(--positive)" />
        </div>
        <div className="kpi">
          <div className="kicker">{monthLabel} expenses · operating</div>
          <div className="value"><span className="sym">$</span>{fmt(monthExpense)}</div>
          <div className={"delta " + (dExp <= 0 ? "up" : "down")}>
            <Icon name={dExp <= 0 ? "arrow_down" : "arrow_up"} size={11} />
            {Math.abs(dExp).toFixed(1)}% vs. {prevMonthLabel}
          </div>
          <Sparkline values={expSpark.length ? expSpark : [0]} color="var(--accent)" />
        </div>
        <div className="kpi">
          <div className="kicker">{monthLabel} wages · payroll</div>
          <div className="value"><span className="sym">$</span>{fmt(monthWages)}</div>
          <div className={"delta " + (dWages <= 0 ? "up" : "down")}>
            <Icon name={dWages <= 0 ? "arrow_down" : "arrow_up"} size={11} />
            {Math.abs(dWages).toFixed(1)}% vs. {prevMonthLabel}
          </div>
          <Sparkline values={wageSpark.length ? wageSpark : [0]} color="var(--ink-2)" />
        </div>
      </div>

      {/* Cash flow breakdown — Revenue − Expenses − Wages = Net */}
      <div className="cashflow">
        <div className="cashflow-head">
          <div className="kicker">Cash flow · {monthLabel}</div>
          <button className="btn ghost sm" onClick={() => go("reports", {})}>
            Open full report <Icon name="arrow" size={13} />
          </button>
        </div>
        <div className="cashflow-row">
          <div className="cashflow-term plus">
            <div className="cashflow-lbl">Revenue</div>
            <div className="cashflow-num">${fmt(monthRevenue)}</div>
            <div className="cashflow-sub">{paidThisMonth} {paidThisMonth === 1 ? "invoice" : "invoices"} paid</div>
          </div>
          <div className="cashflow-op">−</div>
          <div className="cashflow-term minus" onClick={() => go("expenses", {})}>
            <div className="cashflow-lbl">Expenses</div>
            <div className="cashflow-num">${fmt(monthExpense)}</div>
            <div className="cashflow-sub">{expenseEntriesThisMonth} entries logged (expenses + bills)</div>
          </div>
          <div className="cashflow-op">−</div>
          <div className="cashflow-term minus" onClick={() => go("paystubs", {})}>
            <div className="cashflow-lbl">Wages paid</div>
            <div className="cashflow-num">${fmt(monthWages)}</div>
            <div className="cashflow-sub">{state.employees.length} on payroll</div>
          </div>
          <div className="cashflow-op">=</div>
          <div className={"cashflow-term net " + (monthNet >= 0 ? "positive" : "negative")}>
            <div className="cashflow-lbl">Net cash</div>
            <div className="cashflow-num cashflow-net">${fmt(Math.abs(monthNet))}{monthNet < 0 && <span style={{ fontFamily: "var(--mono)", fontSize: 18, opacity: 0.6, marginLeft: 6 }}>(loss)</span>}</div>
            <div className={"cashflow-sub delta " + (dNet >= 0 ? "up" : "down")}>
              <Icon name={dNet >= 0 ? "arrow_up" : "arrow_down"} size={11} />
              {Math.abs(dNet).toFixed(1)}% vs. {prevMonthLabel}
            </div>
          </div>
        </div>
        <div className="cashflow-note">
          Outstanding receivables of <b>${fmt(outstanding)}</b> are not counted above —
          they'll flow into revenue once their invoices are marked paid.
        </div>
      </div>

      <div className="section-head">
        <h2>Recent activity</h2>
        <span className="meta">{today}</span>
      </div>

      <div className="report-grid">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 100 }}>Date</th>
              <th>Vendor</th>
              <th>Category</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr>
                <td colSpan="4"><div className="empty">No expenses yet. Log your first expense to see activity here.</div></td>
              </tr>
            )}
            {recent.map(e => {
              const cat = e.isBill ?
              { name: "Bills", color: "#6e1f1f" } :
              state.CATEGORIES.find(c => c.id === e.category);
              return (
                <tr key={e.id}>
                  <td><span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{e.date.slice(5)}</span></td>
                  <td>
                    <div className="vendor">{e.vendor}</div>
                    <div className="sub">{e.note}</div>
                  </td>
                  <td>
                    <span className="cat-tag"><span className="swatch" style={{ background: cat?.color || "#999" }}></span>{cat?.name || "Other"}</span>
                  </td>
                  <td className="num">{fmtMoney(e.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div>
          <div style={{
            borderTop: "1px solid var(--rule)",
            paddingTop: 14,
            display: "flex",
            flexDirection: "column",
            gap: 14
          }}>
            <div className="kicker" style={{ fontSize: 10 }}>Open invoices</div>
            {recentInvoices.length === 0 && (
              <div className="empty" style={{ padding: "12px 0" }}>No invoices yet.</div>
            )}
            {recentInvoices.map(inv => {
              const c = clients.find(cl => cl.id === inv.clientId);
              const total = inv.items.reduce((s, it) => s + it.qty * it.rate, 0) * (1 + (inv.taxRate || 0));
              return (
                <button key={inv.id} className="list-row-btn" onClick={() => go("invoices", { focusId: inv.id })}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "2px 12px",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--rule-soft)",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--rule-soft)",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    fontFamily: "var(--sans)",
                    color: "var(--ink-2)",
                  }}>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink)" }}>{c?.name || "Unknown client"}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{fmtMoney(total)}</span>
                  <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{inv.number} · due {fmtDate(inv.due)}</span>
                  <span className={"status " + inv.status} style={{ justifySelf: "end" }}>{inv.status}</span>
                </button>
              );
            })}
            <button className="btn ghost" onClick={() => go("invoices", {})} style={{ alignSelf: "flex-start", paddingLeft: 0 }}>
              All invoices <Icon name="arrow" size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
window.Dashboard = Dashboard;

/* ---------- Expenses ---------- */
function ReceiptViewer({ expense, onClose }) {
  const r = expense.receipt;
  const isImage = r.type && r.type.startsWith("image/");
  const [viewUrl, setViewUrl] = React.useState(r.dataUrl || null);
  const [loadingUrl, setLoadingUrl] = React.useState(!r.dataUrl && !!r.storagePath);

  React.useEffect(() => {
    let active = true;
    if (r.dataUrl) {
      setViewUrl(r.dataUrl);
      setLoadingUrl(false);
      return;
    }
    if (r.storagePath && window.SnapAPI?.isEnabled()) {
      setLoadingUrl(true);
      window.SnapAPI.getReceiptUrl(r.storagePath)
        .then((url) => { if (active) setViewUrl(url); })
        .catch(() => { if (active) setViewUrl(null); })
        .finally(() => { if (active) setLoadingUrl(false); });
    }
    return () => { active = false; };
  }, [r.dataUrl, r.storagePath]);

  React.useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div className="receipt-viewer-scrim" onClick={onClose}>
      <div className="receipt-viewer" onClick={(e) => e.stopPropagation()}>
        <header>
          <div style={{ minWidth: 0 }}>
            <h4>{r.name}</h4>
            <span className="meta">
              {expense.vendor} · {expense.date} · {fmtMoney(expense.amount)}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {viewUrl &&
            <a className="btn sm" href={viewUrl} target="_blank" rel="noopener noreferrer" download={r.name}>
              <Icon name="download" size={12} /> Download
            </a>}
            <button className="iconbtn" onClick={onClose} aria-label="Close">
              <Icon name="close" />
            </button>
          </div>
        </header>
        <div className="stage">
          {loadingUrl && <div className="empty">Loading receipt…</div>}
          {!loadingUrl && viewUrl && isImage && (
            <img src={viewUrl} alt={r.name} />
          )}
          {!loadingUrl && viewUrl && !isImage && (
            <iframe src={viewUrl} title={r.name}></iframe>
          )}
          {!loadingUrl && !viewUrl && <div className="empty">Could not load receipt.</div>}
        </div>
      </div>
    </div>
  );
}

function ExpenseDrawer({ open, onClose, onSave, categories }) {
  const today = new Date().toISOString().slice(0, 10);
  const blank = { date: today, vendor: "", note: "", category: categories[0].id, method: "Amex 4012", amount: "", receipt: null };
  const [form, setForm] = useState(blank);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    if (open) {
      setForm(blank);
      setError(null);
      setDragOver(false);
    }
  }, [open]);

  // Read a File into a base64 data URL so we can persist it in state and
  // render an inline preview without depending on a backend.
  const handleFiles = (files) => {
    setError(null);
    const file = files && files[0];
    if (!file) return;
    const okTypes = /^(image\/(png|jpe?g|gif|webp|heic|heif)|application\/pdf)$/i;
    if (!okTypes.test(file.type)) {
      setError("Use a JPG, PNG, WebP or PDF.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("File is over the 8 MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({
        ...f,
        receipt: {
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: reader.result,
        },
      }));
    };
    reader.onerror = () => setError("Couldn't read that file.");
    reader.readAsDataURL(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  if (!open) return null;
  const valid = form.vendor && form.amount && Number(form.amount) > 0;
  const r = form.receipt;
  const isImage = r && r.type && r.type.startsWith("image/");
  const formatBytes = (n) => n < 1024 ? n + " B"
    : n < 1024 * 1024 ? (n / 1024).toFixed(1) + " KB"
    : (n / 1024 / 1024).toFixed(2) + " MB";

  return (
    <>
      <div className="drawer-scrim" onClick={onClose}></div>
      <div className="drawer">
        <div className="head">
          <div>
            <div className="kicker">New entry</div>
            <h3>Log an expense</h3>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="body">
          <div className="row-2">
            <div className="field">
              <label>Date</label>
              <input className="input mono" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="field">
              <label>Amount</label>
              <input className="input mono" type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Vendor</label>
            <input className="input" placeholder="e.g. Figma, Lyft, WeWork" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} />
          </div>
          <div className="field">
            <label>Memo</label>
            <input className="input" placeholder="What was this for?" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
          </div>
          <div className="row-2">
            <div className="field">
              <label>Category</label>
              <select className="select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Payment method</label>
              <select className="select" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                <option>Amex 4012</option>
                <option>Chase 9921</option>
                <option>ACH</option>
                <option>Cash</option>
              </select>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            style={{ display: "none" }}
            onChange={(e) => handleFiles(e.target.files)} />

          {!r ? (
            <div
              className={"receipt-dropzone " + (dragOver ? "dragging" : "")}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}>
              <Icon name="receipt" size={22} />
              <div className="receipt-dropzone-title">Attach a receipt</div>
              <div className="help">Drag & drop, or click to browse · JPG, PNG, PDF up to 8 MB</div>
              {error && <div className="receipt-error">{error}</div>}
            </div>
          ) : (
            <div className="receipt-card">
              <div className="receipt-thumb">
                {isImage ? (
                  <img src={r.dataUrl} alt={r.name} />
                ) : (
                  <div className="receipt-thumb-pdf">
                    <Icon name="receipt" size={26} />
                    <span>PDF</span>
                  </div>
                )}
              </div>
              <div className="receipt-meta">
                <div className="receipt-name" title={r.name}>{r.name}</div>
                <div className="receipt-size">
                  {formatBytes(r.size)} · {r.type.split("/")[1].toUpperCase()}
                </div>
                <div className="receipt-actions">
                  <a className="btn sm" href={r.dataUrl} target="_blank" rel="noopener noreferrer">
                    <Icon name="external" size={12} /> Open
                  </a>
                  <button className="btn sm ghost" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                    <Icon name="edit" size={12} /> Replace
                  </button>
                  <button className="btn sm ghost" onClick={() => setForm({ ...form, receipt: null })}
                    style={{ color: "var(--accent)" }}>
                    <Icon name="trash" size={12} /> Remove
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="foot">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!valid}
            onClick={() => onSave({ ...form, amount: Number(form.amount) })}
            style={{ opacity: valid ? 1 : 0.5 }}>
            <Icon name="check" size={13} /> Save expense
          </button>
        </div>
      </div>
    </>
  );
}

function Expenses({ state, dispatch, toast }) {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [expenseMonth, setExpenseMonth] = useState("");
  const [wageMonth, setWageMonth] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [viewing, setViewing] = useState(null); // expense whose receipt is open
  const receiptInputRefs = React.useRef({});

  const paidBillEntries = useMemo(() =>
  (state.bills || []).
  filter((b) => (b.status || "").toLowerCase() === "paid").
  map(paidBillAsExpense), [state.bills]);

  const ledgerEntries = useMemo(() =>
  [...state.expenses.map((e) => ({ ...e, isBill: false })), ...paidBillEntries].
  filter((e) => e.date), [state.expenses, paidBillEntries]);

  const filtered = useMemo(() => {
    return ledgerEntries
      .filter(e => filter === "all" || e.category === filter)
      .filter(e => !expenseMonth || (e.date || "").startsWith(expenseMonth))
      .filter(e => !q || e.vendor.toLowerCase().includes(q.toLowerCase()) || (e.note || "").toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [ledgerEntries, filter, expenseMonth, q]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const paidWages = useMemo(() => {
    return (state.paystubs || [])
      .filter((p) => !wageMonth || (p.issued || "").startsWith(wageMonth))
      .sort((a, b) => String(b.issued || "").localeCompare(String(a.issued || "")));
  }, [state.paystubs, wageMonth]);

  const wagesTotal = paidWages.reduce((s, p) => s + Number(p.gross || 0), 0);
  const employeeById = useMemo(
    () => Object.fromEntries((state.employees || []).map((e) => [e.id, e])),
    [state.employees]
  );

  const promptMonthRange = () => {
    const fromInput = window.prompt("From month (YYYY-MM). Leave blank for all dates.", "");
    if (fromInput === null) return null;
    const toInput = window.prompt("To month (YYYY-MM). Leave blank for all dates.", "");
    if (toInput === null) return null;
    const fromMonth = (fromInput || "").trim();
    const toMonth = (toInput || "").trim();
    const monthPattern = /^\d{4}-\d{2}$/;
    if (fromMonth && !monthPattern.test(fromMonth)) {
      toast("Invalid From month. Use YYYY-MM.");
      return null;
    }
    if (toMonth && !monthPattern.test(toMonth)) {
      toast("Invalid To month. Use YYYY-MM.");
      return null;
    }
    if (fromMonth && toMonth && fromMonth > toMonth) {
      toast("From month must be before or equal to To month.");
      return null;
    }
    return { fromMonth, toMonth };
  };

  const monthInRange = (dateStr, range) => {
    const month = String(dateStr || "").slice(0, 7);
    if (!month) return false;
    if (range.fromMonth && month < range.fromMonth) return false;
    if (range.toMonth && month > range.toMonth) return false;
    return true;
  };

  const readReceiptFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl: reader.result,
    });
    reader.onerror = () => reject(new Error("file-read-failed"));
    reader.readAsDataURL(file);
  });

  const handleReceiptPicked = async (expense, file) => {
    if (!file) return;
    const okTypes = /^(image\/(png|jpe?g|gif|webp|heic|heif)|application\/pdf)$/i;
    if (!okTypes.test(file.type)) {
      toast("Use a JPG, PNG, WebP or PDF receipt.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast("Receipt exceeds 8 MB.");
      return;
    }
    try {
      const receipt = await readReceiptFile(file);
      if (expense.isBill) {
        const baseBill = (state.bills || []).find((b) => b.id === expense.id);
        if (!baseBill) {
          toast("Could not find the bill to update.");
          return;
        }
        dispatch({ type: "UPDATE_BILL", bill: { ...baseBill, attachment: receipt } });
      } else {
        dispatch({ type: "UPDATE_EXPENSE", expense: { ...expense, receipt } });
      }
      toast(expense.receipt ? "Receipt updated." : "Receipt attached.");
    } catch (_e) {
      toast("Couldn't read that file.");
    }
  };

  const removeLedgerEntry = (expense) => {
    if (!window.confirm(`Delete entry "${expense.vendor}"?`)) return;
    if (expense.isBill) {
      dispatch({ type: "REMOVE_BILL", id: expense.id });
      toast("Bill entry deleted.");
      return;
    }
    dispatch({ type: "REMOVE_EXPENSE", id: expense.id });
    toast("Expense deleted.");
  };

  const exportPaidWagesPdf = () => {
    if (!window.jspdf?.jsPDF) {
      toast("PDF library not loaded. Refresh and try again.");
      return;
    }
    const range = promptMonthRange();
    if (!range) return;

    const rows = (state.paystubs || [])
      .filter((p) => monthInRange(p.issued, range))
      .sort((a, b) => String(b.issued || "").localeCompare(String(a.issued || "")));
    if (rows.length === 0) {
      toast("No paid wages in that duration.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "in", format: [7, 11], compress: true });
    const pageW = 7;
    const pageH = 11;
    const margin = 0.35;
    let y = margin;
    const durationLabel = range.fromMonth || range.toMonth ?
      `${range.fromMonth || "start"} to ${range.toMonth || "end"}` :
      "All dates";

    const drawHeader = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Paid Wages Ledger", margin, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Generated ${new Date().toLocaleString()}`, margin, y + 0.16);
      doc.text(`Duration ${durationLabel}`, margin, y + 0.30);
      y += 0.46;
      doc.line(margin, y, pageW - margin, y);
      y += 0.08;
    };
    const ensureSpace = (needed) => {
      if (y + needed <= pageH - margin) return;
      doc.addPage([7, 11], "portrait");
      y = margin;
      drawHeader();
    };

    drawHeader();
    rows.forEach((p) => {
      const emp = employeeById[p.employeeId];
      const gross = Number(p.gross || 0);
      const taxes = Number(p.taxes || 0);
      const deductions = Number(p.deductions || 0);
      const net = gross - taxes - deductions;
      ensureSpace(0.75);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(emp?.name || "Unknown employee", margin, y + 0.13);
      doc.text(`$${gross.toFixed(2)}`, pageW - margin, y + 0.13, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Issued ${p.issued || "—"}  •  ${emp?.role || p.employeeId || "—"}`, margin, y + 0.28);
      doc.text(`Period ${p.periodStart || "—"} to ${p.periodEnd || "—"}`, margin, y + 0.42);
      doc.text(`Net $${net.toFixed(2)} after taxes/deductions`, margin, y + 0.56);
      doc.line(margin, y + 0.68, pageW - margin, y + 0.68);
      y += 0.76;
    });

    const totalGross = rows.reduce((s, p) => s + Number(p.gross || 0), 0);
    ensureSpace(0.3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Total gross wages: $${totalGross.toFixed(2)}`, pageW - margin, y + 0.18, { align: "right" });
    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`paid-wages-${stamp}.pdf`);
  };

  return (
    <>
      <div className="toolbar">
        <div className="left">
          <div className="search">
            <Icon name="search" />
            <input className="input" placeholder="Search vendor or memo…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="chips">
            <button className={"chip " + (filter === "all" ? "active" : "")} onClick={() => setFilter("all")}>All</button>
            {state.CATEGORIES.map(c => (
              <button key={c.id} className={"chip " + (filter === c.id ? "active" : "")} onClick={() => setFilter(c.id)}>
                <span className="swatch" style={{ background: c.color, width: 7, height: 7, borderRadius: "50%", display: "inline-block" }}></span>
                {c.name}
              </button>
            ))}
            <button className={"chip " + (filter === "bills" ? "active" : "")} onClick={() => setFilter("bills")}>
              <span className="swatch" style={{ background: "#6e1f1f", width: 7, height: 7, borderRadius: "50%", display: "inline-block" }}></span>
              Bills (paid)
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="btn sm ghost" onClick={() => setExpenseMonth("")}>All months</button>
            <input
              className="input mono"
              type="month"
              value={expenseMonth}
              onChange={(e) => setExpenseMonth(e.target.value)}
              style={{ width: 154 }} />
          </div>
        </div>
        <div className="right">
          <button className="btn primary" onClick={() => setDrawer(true)}>
            <Icon name="plus" size={13} /> New expense
          </button>
        </div>
      </div>

      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 110 }}>Date</th>
            <th>Vendor</th>
            <th style={{ width: 160 }}>Category</th>
            <th style={{ width: 130 }}>Method</th>
            <th style={{ width: 110 }}>Receipt</th>
            <th style={{ width: 90 }}>Actions</th>
            <th className="num" style={{ width: 130 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan="7"><div className="empty">No expenses match your filter.</div></td>
            </tr>
          )}
          {filtered.map(e => {
            const cat = e.isBill ?
            { name: "Bills", color: "#6e1f1f" } :
            state.CATEGORIES.find(c => c.id === e.category);
            const r = e.receipt;
            return (
              <tr key={e.id}>
                <td><span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{e.date}</span></td>
                <td>
                  <div className="vendor">{e.vendor}</div>
                  <div className="sub">{e.note}{e.isBill ? " · from Bills" : ""}</div>
                </td>
                <td>
                  <span className="cat-tag"><span className="swatch" style={{ background: cat?.color || "#999" }}></span>{cat?.name || "Other"}</span>
                </td>
                <td><span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)" }}>{e.method}</span></td>
                <td>
                  {r ? (
                    <span className="receipt-chip" onClick={() => setViewing(e)} title={r.name}>
                      <Icon name="receipt" size={11} />
                      {r.type && r.type.startsWith("image/") ? "Image" : "PDF"}
                    </span>
                  ) : (
                    <span style={{ color: "var(--ink-4)", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>{e.isBill ? "from bill" : "—"}</span>
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                    <button
                      className="iconbtn"
                      title={e.receipt ? "Replace receipt" : "Add receipt"}
                      onClick={() => receiptInputRefs.current[e.id] && receiptInputRefs.current[e.id].click()}>
                      <Icon name={e.receipt ? "edit" : "plus"} size={12} />
                    </button>
                    <button className="iconbtn" title="Delete entry" onClick={() => removeLedgerEntry(e)}>
                      <Icon name="close" size={12} />
                    </button>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      style={{ display: "none" }}
                      ref={(el) => { receiptInputRefs.current[e.id] = el; }}
                      onChange={(evt) => {
                        const file = evt.target.files && evt.target.files[0];
                        handleReceiptPicked(e, file);
                        evt.target.value = "";
                      }} />
                  </div>
                </td>
                <td className="num">{fmtMoney(e.amount)}</td>
              </tr>
            );
          })}
          {filtered.length > 0 && (
            <tr>
              <td></td>
              <td colSpan="3" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)", paddingTop: 18 }}>
                {filtered.length} {filtered.length === 1 ? "entry" : "entries"} · totalled below
              </td>
              <td></td>
              <td></td>
              <td className="num" style={{ paddingTop: 18, fontFamily: "var(--serif)", fontSize: 22, color: "var(--ink)" }}>
                {fmtMoney(total)}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <ExpenseDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        categories={state.CATEGORIES}
        onSave={(form) => {
          const expense = { id: "e" + Date.now(), ...form, amount: Number(form.amount) };
          dispatch({ type: "ADD_EXPENSE", expense });
          setDrawer(false);
          toast(`Logged ${fmtMoney(form.amount)} at ${form.vendor}`);
        }}
      />

      {viewing && viewing.receipt && (
        <ReceiptViewer expense={viewing} onClose={() => setViewing(null)} />
      )}

      <div className="section-head" style={{ marginTop: 28 }}>
        <h2>Paid wages</h2>
        <span className="meta">{paidWages.length} statements</span>
      </div>

      <div className="toolbar" style={{ marginTop: -6 }}>
        <div className="left" style={{ gap: 8 }}>
          <button className="btn sm ghost" onClick={() => setWageMonth("")}>All months</button>
          <input
            className="input mono"
            type="month"
            value={wageMonth}
            onChange={(e) => setWageMonth(e.target.value)}
            style={{ width: 154 }} />
        </div>
        <div className="right">
          <button className="btn sm ghost" onClick={exportPaidWagesPdf}>
            <Icon name="download" size={12} /> Export PDF
          </button>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>
            Total paid: {fmtMoney(wagesTotal)}
          </span>
        </div>
      </div>

      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 120 }}>Issued</th>
            <th>Employee</th>
            <th style={{ width: 180 }}>Period</th>
            <th className="num" style={{ width: 140 }}>Gross</th>
          </tr>
        </thead>
        <tbody>
          {paidWages.length === 0 && (
            <tr>
              <td colSpan="4"><div className="empty">No pay statements for this month filter.</div></td>
            </tr>
          )}
          {paidWages.map((p) => {
            const emp = employeeById[p.employeeId];
            return (
              <tr key={p.id}>
                <td><span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{p.issued || "—"}</span></td>
                <td>
                  <div className="vendor">{emp ? emp.name : "Unknown employee"}</div>
                  <div className="sub">{emp ? emp.role : p.employeeId}</div>
                </td>
                <td><span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{p.periodStart || "—"} → {p.periodEnd || "—"}</span></td>
                <td className="num">{fmtMoney(Number(p.gross || 0))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
window.Expenses = Expenses;
