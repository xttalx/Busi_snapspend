/* Snapspend — root app */
const { useReducer, useState: useStateApp, useEffect: useEffectApp } = React;

const NAV = [
{ group: "Workspace", items: [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "expenses", label: "Expenses", icon: "expense" },
  { id: "invoices", label: "Invoices", icon: "invoice" },
  { id: "bills", label: "Bills", icon: "receipt" },
  { id: "paystubs", label: "Paystubs", icon: "paystub" }]
},
{ group: "People", items: [
  { id: "employees", label: "Employees", icon: "employees" },
  { id: "clients", label: "Business Clients", icon: "business" },
  { id: "reports", label: "Reports", icon: "reports" }]
},
{ group: "Account", items: [
  { id: "settings", label: "Settings", icon: "settings" },
  { id: "transactions", label: "Transaction History", icon: "calendar" }]
}];


const PAGE_META = {
  dashboard: { kicker: "Overview", title: "Dashboard" },
  expenses: { kicker: "Ledger", title: "Expenses" },
  invoices: { kicker: "Receivables", title: "Invoices" },
  bills: { kicker: "Payables", title: "Bills" },
  paystubs: { kicker: "Payroll", title: "Pay statements" },
  employees: { kicker: "People", title: "Your team" },
  clients: { kicker: "Registry", title: "Business clients" },
  reports: { kicker: "Insights", title: "Reports" },
  settings: { kicker: "Account", title: "Settings" },
  transactions: { kicker: "Account", title: "Transaction history" }
};

const DEFAULT_USER_BUSINESS = {
  name: "Your business",
  owner: "",
  email: "",
  address: "",
  country: "United States",
  currency: "USD ($)",
  terms: "Net 30",
  taxRate: 0.0875,
  fy: "January",
  invoiceFooter: ""
};

const EMPTY_WORKSPACE = {
  expenses: [],
  bills: [],
  clients: [],
  invoices: [],
  employees: [],
  paystubs: [],
  userBusiness: DEFAULT_USER_BUSINESS,
};

function reducer(state, action) {
  switch (action.type) {
    case "HYDRATE":
      return {
        ...state,
        expenses: action.payload.expenses,
        bills: action.payload.bills || [],
        clients: action.payload.clients,
        invoices: action.payload.invoices,
        employees: action.payload.employees,
        paystubs: action.payload.paystubs,
        userBusiness: action.payload.userBusiness,
      };
    case "ADD_EXPENSE":
      return { ...state, expenses: [action.expense, ...state.expenses] };
    case "UPDATE_EXPENSE":
      return {
        ...state,
        expenses: state.expenses.map((e) => (e.id === action.expense.id ? action.expense : e)),
      };
    case "ADD_INVOICE":
      return { ...state, invoices: [action.invoice, ...state.invoices] };
    case "UPDATE_INVOICE":
      return { ...state, invoices: state.invoices.map((i) => i.id === action.invoice.id ? action.invoice : i) };
    case "ADD_BILL":
      return { ...state, bills: [action.bill, ...state.bills] };
    case "UPDATE_BILL":
      return { ...state, bills: state.bills.map((b) => b.id === action.bill.id ? action.bill : b) };
    case "REMOVE_BILL":
      return { ...state, bills: state.bills.filter((b) => b.id !== action.id) };
    case "ADD_PAYSTUB":
      return { ...state, paystubs: [action.stub, ...state.paystubs] };
    case "ADD_EMPLOYEE":
      return { ...state, employees: [...state.employees, action.employee] };
    case "UPDATE_EMPLOYEE":
      return { ...state, employees: state.employees.map((e) => e.id === action.employee.id ? action.employee : e) };
    case "REMOVE_EMPLOYEE":
      return { ...state, employees: state.employees.filter((e) => e.id !== action.id) };
    case "ADD_CLIENT":
      return { ...state, clients: [...state.clients, action.client] };
    case "UPDATE_CLIENT":
      return { ...state, clients: state.clients.map((c) => c.id === action.client.id ? action.client : c) };
    case "REMOVE_CLIENT":
      return { ...state, clients: state.clients.filter((c) => c.id !== action.id) };
    case "UPDATE_USER_BUSINESS":
      return { ...state, userBusiness: { ...state.userBusiness, ...action.patch } };
    default:
      return state;
  }
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "direction": "broadsheet",
  "accent": "#b8442a",
  "showKickers": true
} /*EDITMODE-END*/;

const DIRECTION_MAP = {
  broadsheet: "",
  manuscript: "manuscript",
  ledger: "ledger"
};

function escapeHtml(value) {
  return String(value ?? "").
  replace(/&/g, "&amp;").
  replace(/</g, "&lt;").
  replace(/>/g, "&gt;").
  replace(/"/g, "&quot;").
  replace(/'/g, "&#39;");
}

function SnapspendTweaks({ tweaks, setTweak }) {
  return (
    <TweaksPanel title="Tweaks · Snapspend">
      <TweakSection label="Visual direction" />
      <TweakRadio
        label="Treatment"
        value={tweaks.direction}
        onChange={(v) => setTweak("direction", v)}
        options={[
        { value: "broadsheet", label: "Broadsheet" },
        { value: "manuscript", label: "Manuscript" },
        { value: "ledger", label: "Ledger" }]
        } />
      <p style={{ fontSize: 11, color: "#888", margin: "4px 0 6px", lineHeight: 1.5, paddingLeft: 2 }}>
        <b>Broadsheet</b> — cream paper, copper accent, financial-journal feel.<br />
        <b>Manuscript</b> — warmer sepia, italic display, romantic.<br />
        <b>Ledger</b> — off-white, data-first, mono numerals up front.
      </p>

      <TweakSection label="Accent color" />
      <TweakColor
        label="Accent"
        value={tweaks.accent}
        onChange={(v) => setTweak("accent", v)}
        options={["#b8442a", "#1a1a1a", "#2f5a3e", "#6e1f1f"]} />

      <TweakSection label="Page chrome" />
      <TweakToggle
        label="Show kickers"
        value={tweaks.showKickers}
        onChange={(v) => setTweak("showKickers", v)} />
    </TweaksPanel>);

}

function Sidebar({ route, setRoute, userBusiness, session, onSignOut }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  // The sidebar logo always shows the user's business name as the primary
  // mark, with "Snapspend" tucked underneath. If the user hasn't customised
  // the name (still says "Snapspend"), we collapse to a single wordmark to
  // avoid an awkward "Snapspend / SNAPSPEND" repeat.
  const name = userBusiness && userBusiness.name || "Snapspend";
  const customised = name.trim().toLowerCase() !== "snapspend";

  return (
    <aside className="sidebar">
      <div className={"wordmark " + (customised ? "stacked" : "")}>
        {customised ?
        <>
            <span className="wm-primary" title={name} style={{ fontWeight: "400" }}>{name}</span>
            <span className="dot"></span>
            <span className="wm-sub">Snapspend</span>
          </> :

        <>
            Snapspend<span className="dot"></span>
          </>
        }
      </div>

      <button
        className="btn mobile-menu-toggle"
        onClick={() => setMobileMenuOpen((v) => !v)}
        aria-label="Toggle navigation menu"
        aria-expanded={mobileMenuOpen}>
        <Icon name="more" size={14} /> Menu
      </button>

      <div className={"sidebar-menu " + (mobileMenuOpen ? "open" : "")}>
        {NAV.map((group) =>
        <div className="nav-group" key={group.group}>
            <div className="nav-label">{group.group}</div>
            {group.items.map((it) =>
          <button
            key={it.id}
            className={"nav-item " + (route === it.id ? "active" : "")}
            onClick={() => {
              setRoute(it.id);
              setMobileMenuOpen(false);
            }}>
                <Icon name={it.icon} size={15} />
                {it.label}
              </button>
          )}
          </div>
        )}
      </div>

      <div className="userchip">
        <div className="avatar">
          {(session?.user?.email || userBusiness?.owner || "A").charAt(0).toUpperCase()}
        </div>
        <div className="meta">
          <b>{userBusiness?.owner || userBusiness?.name || "Account"}</b>
          <span>{session?.user?.email || name}</span>
        </div>
      </div>
      {onSignOut &&
      <button className="btn ghost sidebar-signout" onClick={onSignOut}>
          <Icon name="external" size={13} /> Sign out
        </button>}
    </aside>);

}

function AppLoading({ label }) {
  return (
    <div className="auth-screen">
      <div className="auth-card auth-loading">
        <div className="auth-brand">Snapspend<span className="dot"></span></div>
        <p className="auth-lead">{label || "Loading…"}</p>
      </div>
    </div>
  );
}

function App() {
  const [state, dispatch] = useReducer(reducer, {
    CATEGORIES: window.SEED.CATEGORIES,
    ...EMPTY_WORKSPACE,
  });

  const supabaseEnabled = window.SnapAPI && window.SnapAPI.isEnabled();
  const [session, setSession] = useStateApp(null);
  const [authLoading, setAuthLoading] = useStateApp(supabaseEnabled);
  const [dataLoading, setDataLoading] = useStateApp(false);
  const stateRef = React.useRef(state);
  stateRef.current = state;

  const userId = session?.user?.id;
  const persistDispatch = React.useMemo(
    () =>
      supabaseEnabled && userId
        ? window.SnapAPI.createPersistDispatch(dispatch, () => stateRef.current, userId)
        : dispatch,
    [supabaseEnabled, userId]
  );

  const [route, setRoute] = useStateApp("dashboard");
  const [params, setParams] = useStateApp({});
  const [toastMsg, setToastMsg] = useStateApp(null);
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const userBusiness = state.userBusiness;

  useEffectApp(() => {
    if (!supabaseEnabled) return;
    let active = true;
    window.SnapAPI.getSession().then(({ session: s }) => {
      if (active) {
        setSession(s);
        setAuthLoading(false);
      }
    });
    const { data: { subscription } } = window.SnapAPI.onAuthStateChange((s) => {
      if (active) setSession(s);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabaseEnabled]);

  useEffectApp(() => {
    if (!supabaseEnabled || !userId) return;
    let active = true;
    setDataLoading(true);
    window.SnapAPI.fetchAllData(userId)
      .then((data) => {
        if (active) dispatch({ type: "HYDRATE", payload: data });
      })
      .catch((err) => console.error("Failed to load data:", err))
      .finally(() => {
        if (active) setDataLoading(false);
      });
    return () => { active = false; };
  }, [supabaseEnabled, userId]);

  const handleSignOut = async () => {
    await window.SnapAPI.signOut();
    dispatch({ type: "HYDRATE", payload: EMPTY_WORKSPACE });
  };

  // Backwards-compatible setter — SettingsScreen still uses business+setBusiness.
  const setUserBusiness = (next) => {
    const merged = typeof next === "function" ? next(userBusiness) : next;
    persistDispatch({ type: "UPDATE_USER_BUSINESS", patch: merged });
  };

  useEffectApp(() => {
    const html = document.documentElement;
    const dir = DIRECTION_MAP[tweaks.direction] || "";
    if (dir) html.setAttribute("data-direction", dir);else
    html.removeAttribute("data-direction");
    html.style.setProperty("--accent", tweaks.accent);
    html.style.setProperty("--accent-soft", `color-mix(in oklch, ${tweaks.accent} 22%, var(--paper))`);
  }, [tweaks.direction, tweaks.accent]);

  const go = (r, p = {}) => {setRoute(r);setParams(p);};

  const toast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2400);
  };

  const resolveReceiptForExport = async (receipt) => {
    if (!receipt) return null;
    if (receipt.dataUrl) {
      return {
        url: receipt.dataUrl,
        isImage: (receipt.type || "").startsWith("image/"),
        name: receipt.name || "receipt",
      };
    }
    if (receipt.storagePath && window.SnapAPI?.isEnabled()) {
      try {
        const url = await window.SnapAPI.getReceiptUrl(receipt.storagePath);
        return {
          url,
          isImage: (receipt.type || "").startsWith("image/"),
          name: receipt.name || "receipt",
        };
      } catch (_e) {
        return null;
      }
    }
    return null;
  };

  const exportExpensesPdf = async () => {
    const paidBills = (state.bills || [])
      .filter((b) => (b.status || "").toLowerCase() === "paid")
      .map((b) => ({
        date: (b.paidDate || b.issueDate || "").slice(0, 10),
        vendor: b.vendor || "",
        note: b.number ? `Bill ${b.number}` : "Bill payment",
        category: "Bills",
        method: "Bill paid",
        amount: Number(b.amount || 0),
        source: "bill",
        status: b.status || "paid",
        receipt: b.attachment || null,
      }));

    const expenses = (state.expenses || []).map((e) => {
      const cat = (state.CATEGORIES || []).find((c) => c.id === e.category);
      return {
        date: (e.date || "").slice(0, 10),
        vendor: e.vendor || "",
        note: e.note || "",
        category: cat ? cat.name : e.category || "",
        method: e.method || "",
        amount: Number(e.amount || 0),
        source: "expense",
        status: "",
        receipt: e.receipt || null,
      };
    });

    const rowsData = [...expenses, ...paidBills].sort((a, b) => String(b.date).localeCompare(String(a.date)));

    if (rowsData.length === 0) {
      toast("No expenses to export yet");
      return;
    }

    const rowsWithReceipts = await Promise.all(
      rowsData.map(async (r) => ({ ...r, receiptResolved: await resolveReceiptForExport(r.receipt) }))
    );

    const total = rowsWithReceipts.reduce((s, r) => s + Number(r.amount || 0), 0);
    const stamp = new Date().toISOString().slice(0, 10);
    const htmlRows = rowsWithReceipts.map((r) => {
      const receiptCell = !r.receiptResolved ?
      "—" :
      r.receiptResolved.isImage ?
      `<img src="${escapeHtml(r.receiptResolved.url)}" alt="${escapeHtml(r.receiptResolved.name)}" style="max-width:120px;max-height:90px;border:1px solid #ddd;border-radius:4px;display:block;" />` :
      `<a href="${escapeHtml(r.receiptResolved.url)}" target="_blank" rel="noreferrer">${escapeHtml(r.receiptResolved.name || "Open receipt")}</a>`;

      return `<tr>
        <td>${escapeHtml(r.date)}</td>
        <td>${escapeHtml(r.vendor)}</td>
        <td>${escapeHtml(r.note)}</td>
        <td>${escapeHtml(r.category)}</td>
        <td>${escapeHtml(r.method)}</td>
        <td style="text-align:right;">${Number(r.amount || 0).toFixed(2)}</td>
        <td>${escapeHtml(r.source)}</td>
        <td>${escapeHtml(r.status)}</td>
        <td>${receiptCell}</td>
      </tr>`;
    }).join("");

    const w = window.open("", "_blank");
    if (!w) {
      toast("Popup blocked. Please allow popups to export PDF.");
      return;
    }

    w.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Expense Ledger ${escapeHtml(stamp)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #111; }
    h1 { margin: 0 0 6px; font-size: 22px; }
    .meta { margin: 0 0 14px; color: #555; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
    th { background: #f4f4f4; text-align: left; }
    tfoot td { font-weight: 700; }
    @media print { body { margin: 10mm; } a { color: #111; text-decoration: none; } }
  </style>
</head>
<body>
  <h1>Expense Ledger</h1>
  <p class="meta">Generated ${escapeHtml(new Date().toLocaleString())} · Rows: ${rowsWithReceipts.length}</p>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Vendor</th>
        <th>Note</th>
        <th>Category</th>
        <th>Method</th>
        <th>Amount</th>
        <th>Source</th>
        <th>Status</th>
        <th>Receipt</th>
      </tr>
    </thead>
    <tbody>${htmlRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="5">Total</td>
        <td style="text-align:right;">${total.toFixed(2)}</td>
        <td colspan="3"></td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      toast(`Prepared PDF export with ${rowsWithReceipts.length} rows`);
    }, 500);
  };

  const meta = PAGE_META[route];
  const showKickers = tweaks.showKickers;
  const dashboardName = (userBusiness?.name || "Your business").trim() || "Your business";

  if (supabaseEnabled && authLoading) return <AppLoading label="Checking session…" />;
  if (supabaseEnabled && !session) {
    return <AuthScreen />;
  }
  if (supabaseEnabled && dataLoading) return <AppLoading label="Loading your workspace…" />;

  let screen = null;
  if (route === "dashboard") screen = <Dashboard state={state} go={go} />;else
  if (route === "expenses") screen = <Expenses state={state} dispatch={persistDispatch} toast={toast} />;else
  if (route === "invoices") screen = <InvoicesScreen state={state} dispatch={persistDispatch} business={userBusiness} toast={toast} params={params} />;else
  if (route === "bills") screen = <BillsScreen state={state} dispatch={persistDispatch} toast={toast} userId={userId} params={params} />;else
  if (route === "paystubs") screen = <PaystubsScreen state={state} dispatch={persistDispatch} business={userBusiness} toast={toast} params={params} />;else
  if (route === "employees") screen = <EmployeesScreen state={state} dispatch={persistDispatch} toast={toast} go={go} params={params} />;else
  if (route === "clients") screen = <ClientsScreen state={state} dispatch={persistDispatch} toast={toast} go={go} params={params} />;else
  if (route === "reports") screen = <ReportsScreen state={state} />;else
  if (route === "settings") screen = <SettingsScreen business={userBusiness} setBusiness={setUserBusiness} toast={toast} />;else
  if (route === "transactions") screen = <TransactionHistoryScreen state={state} go={go} />;

  return (
    <div className="app" data-screen-label={"App · " + meta.title}>
      <Sidebar
        route={route}
        setRoute={(r) => go(r, {})}
        userBusiness={userBusiness}
        session={session}
        onSignOut={supabaseEnabled && session ? handleSignOut : null}
      />
      <main className="page">
        <div className="page-head print-hide">
          <div className="titles">
            {route === "dashboard" ?
            <>
                <h1 className="dashboard-biz-title">
                  {dashboardName}<span className="dot"></span>
                </h1>
                <span className="dashboard-biz-sub">Overview dashboard</span>
              </> :
            <>
                {showKickers && <span className="kicker">{meta.kicker}</span>}
                <h1 className="page-title">{meta.title}</h1>
              </>
            }
          </div>
          <div className="page-actions">
            {route === "dashboard" &&
            <>
                <button className="btn" onClick={() => go("invoices", {})}>
                  <Icon name="invoice" size={13} /> New invoice
                </button>
                <button className="btn primary" onClick={() => go("expenses", {})}>
                  <Icon name="plus" size={13} /> Log expense
                </button>
              </>
            }
            {route === "clients" &&
            <button className="btn ghost" onClick={() => go("invoices", {})}>
                <Icon name="invoice" size={13} /> View invoices
              </button>
            }
            {route === "expenses" &&
            <button className="btn" onClick={exportExpensesPdf}>
                <Icon name="external" size={13} /> Export PDF
              </button>
            }
            {route !== "dashboard" && route !== "invoices" && route !== "paystubs" &&
            route !== "settings" && route !== "employees" && route !== "clients" && route !== "bills" && route !== "expenses" &&
            <button className="btn"><Icon name="external" size={13} /> Export CSV</button>
            }
          </div>
        </div>

        {screen}
      </main>

      <SnapspendTweaks tweaks={tweaks} setTweak={setTweak} />

      {toastMsg &&
      <div className="toast">
          <Icon name="check" size={14} />
          {toastMsg}
        </div>
      }
    </div>);

}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);