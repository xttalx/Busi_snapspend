/* Sample seed data for Marten Bookkeeping prototype. */
window.SEED = (() => {
  const BRAND_NAME = "Marten Bookkeeping";
  const BRAND_LOGO = "/icons/logo.png";
  const BRAND_DOMAIN = "martenbooks.com";
  const SUPPORT_EMAIL = "support@martenbooks.com";

  const BILLING = {
    currency: "CAD",
    proMonthly: 39.39,
    payPerDownload: 11.39,
  };

  const CATEGORIES = [
    { id: "software",  name: "Software",   color: "#b8442a" },
    { id: "travel",    name: "Travel",     color: "#2f5a3e" },
    { id: "meals",     name: "Meals",      color: "#a07527" },
    { id: "office",    name: "Office",     color: "#6e1f1f" },
    { id: "marketing", name: "Marketing",  color: "#3b5b8f" },
    { id: "utilities", name: "Utilities",  color: "#6b3a8f" },
    { id: "hardware",  name: "Hardware",   color: "#1f6b7a" },
  ];

  const expenses = [
    { id: "e1",  date: "2026-05-22", vendor: "Figma",          note: "Annual seat",                  category: "software",  method: "Amex 4012",   amount: 180.00 },
    { id: "e2",  date: "2026-05-21", vendor: "Delta Airlines", note: "SFO → JFK, client visit",      category: "travel",    method: "Chase 9921",  amount: 412.30 },
    { id: "e3",  date: "2026-05-20", vendor: "Blue Bottle",    note: "Coffee meeting w/ Acme",       category: "meals",     method: "Amex 4012",   amount: 18.50 },
    { id: "e4",  date: "2026-05-19", vendor: "WeWork",         note: "Hot desk — May",               category: "office",    method: "ACH",         amount: 320.00 },
    { id: "e5",  date: "2026-05-17", vendor: "Google Ads",     note: "May campaign",                 category: "marketing", method: "Amex 4012",   amount: 624.80 },
    { id: "e6",  date: "2026-05-15", vendor: "PG&E",           note: "Studio power",                 category: "utilities", method: "ACH",         amount: 88.42 },
    { id: "e7",  date: "2026-05-12", vendor: "Apple",          note: "Magic Keyboard",               category: "hardware",  method: "Amex 4012",   amount: 199.00 },
    { id: "e8",  date: "2026-05-09", vendor: "Notion",         note: "Team plan",                    category: "software",  method: "Chase 9921",  amount: 96.00 },
    { id: "e9",  date: "2026-05-07", vendor: "Lyft",           note: "Airport transfer",             category: "travel",    method: "Amex 4012",   amount: 42.10 },
    { id: "e10", date: "2026-05-04", vendor: "Tartine",        note: "Pitch dinner — Northstar",     category: "meals",     method: "Amex 4012",   amount: 184.25 },
    { id: "e11", date: "2026-05-02", vendor: "Linear",         note: "Workspace upgrade",            category: "software",  method: "Chase 9921",  amount: 64.00 },
    { id: "e12", date: "2026-04-28", vendor: "Comcast",        note: "Studio internet",              category: "utilities", method: "ACH",         amount: 119.99 },
  ];

  const clients = [
    { id: "c1", name: "Northstar Labs",   contact: "Priya Vasquez",  email: "ops@northstar.co",     phone: "+1 (415) 555-0142", address: "440 De Haro St, San Francisco, CA 94107", country: "United States", taxId: "EIN 84-2719304", notes: "Net 30. Primary contact for brand work.",                      since: "2024-08" },
    { id: "c2", name: "Acme Provisions",  contact: "Theo Marchetti", email: "ap@acme.com",          phone: "+1 (212) 555-0918", address: "12 Bond St, New York, NY 10012",          country: "United States", taxId: "EIN 27-4815920", notes: "Paid via ACH. Ship samples via UPS.",                          since: "2023-11" },
    { id: "c3", name: "Halcyon Foods",    contact: "Mira Solanke",   email: "billing@halcyon.io",   phone: "+1 (512) 555-0473", address: "3318 N Lamar Blvd, Austin, TX 78705",     country: "United States", taxId: "EIN 88-3019283", notes: "Pays late — send reminder day 28.",                            since: "2025-01" },
    { id: "c4", name: "Studio Riverbend", contact: "Wren Halloway",  email: "hi@riverbend.studio",  phone: "+1 (503) 555-0287", address: "210 SE Belmont, Portland, OR 97214",      country: "United States", taxId: "—",              notes: "Small studio. Mostly photo direction work.",                   since: "2025-04" },
  ];

  const invoices = [
    { id: "i1", number: "INV-0142", clientId: "c1", date: "2026-05-15", due: "2026-06-14", status: "due",
      items: [
        { desc: "Brand identity system", sub: "Logo, typography, guidelines", qty: 1,  rate: 4800 },
        { desc: "Website art direction", sub: "Homepage + product templates",  qty: 1,  rate: 3200 },
        { desc: "Senior design",         sub: "Iteration & refinement",         qty: 12, rate: 175 },
      ],
      taxRate: 0,
      notes: "Net 30. Wire transfer details on request. Thank you for partnering with Marten Bookkeeping.",
    },
    { id: "i2", number: "INV-0141", clientId: "c2", date: "2026-05-01", due: "2026-05-31", status: "paid",
      items: [
        { desc: "Packaging illustration", sub: "Three SKU label set",          qty: 3,  rate: 850 },
        { desc: "Production oversight",   sub: "Press check, Salinas",         qty: 1,  rate: 600 },
      ],
      taxRate: 0.0875,
      notes: "Paid via ACH on 2026-05-28.",
    },
    { id: "i3", number: "INV-0140", clientId: "c3", date: "2026-04-18", due: "2026-05-18", status: "overdue",
      items: [
        { desc: "Restaurant interior signage", sub: "Wayfinding + menus",      qty: 1, rate: 5400 },
      ],
      taxRate: 0,
      notes: "Net 30. Reminder sent 2026-05-22.",
    },
    { id: "i4", number: "INV-0143", clientId: "c4", date: "2026-05-23", due: "2026-06-22", status: "draft",
      items: [
        { desc: "Photo direction", sub: "Spring lookbook", qty: 1, rate: 2200 },
      ],
      taxRate: 0,
      notes: "",
    },
  ];

  const employees = [
    { id: "u1", name: "Marisol Vega",    role: "Senior Designer",   payType: "Salary",  payRate: 92000, taxRate: 0.24, since: "2024-03", country: "United States" },
    { id: "u2", name: "Theo Lindqvist",  role: "Motion Designer",   payType: "Salary",  payRate: 78000, taxRate: 0.22, since: "2024-09", country: "United Kingdom" },
    { id: "u3", name: "June Okafor",     role: "Studio Manager",    payType: "Salary",  payRate: 65000, taxRate: 0.20, since: "2023-11", country: "Canada" },
    { id: "u4", name: "Cassian Reyes",   role: "Production Asst.",  payType: "Hourly",  payRate: 32,    taxRate: 0.18, since: "2025-06", country: "United States" },
    { id: "u5", name: "Wren Halloway",   role: "Freelance Writer",  payType: "Hourly",  payRate: 75,    taxRate: 0.15, since: "2025-02", country: "India" },
  ];

  const paystubs = [
    { id: "p1", employeeId: "u1", periodStart: "2026-05-01", periodEnd: "2026-05-15", issued: "2026-05-16", gross: 3833.33, hours: null,
      earnings: [{ k: "Regular salary",  v: 3833.33 }],
      taxes:    [{ k: "Federal income tax",  v: 460.00 }, { k: "Social Security", v: 237.67 }, { k: "Medicare", v: 55.58 }, { k: "State income (CA)", v: 191.67 }],
      deductions: [{ k: "Health insurance", v: 120.00 }, { k: "401(k) 5%", v: 191.67 }] },
    { id: "p2", employeeId: "u4", periodStart: "2026-05-01", periodEnd: "2026-05-15", issued: "2026-05-16", gross: 2240, hours: 70,
      earnings: [{ k: "Regular hours · 70 @ $32",  v: 2240 }],
      taxes:    [{ k: "Federal income tax",  v: 268.80 }, { k: "Social Security", v: 138.88 }, { k: "Medicare", v: 32.48 }, { k: "State income (CA)", v: 112.00 }],
      deductions: [] },
  ];

  // Country presets for withholding categories (rates are fractions).
  // Sourced as illustrative defaults — user can edit any of them.
  const COUNTRY_PRESETS = {
    "United States": [
      { name: "Federal income tax", rate: 0.12 },
      { name: "Social Security",    rate: 0.062 },
      { name: "Medicare",           rate: 0.0145 },
      { name: "State income (CA)",  rate: 0.05 },
    ],
    "United Kingdom": [
      { name: "Income tax (basic rate)", rate: 0.20 },
      { name: "National Insurance",      rate: 0.08 },
    ],
    "Canada": [
      { name: "Federal income tax",       rate: 0.15 },
      { name: "Provincial income (ON)",   rate: 0.0505 },
      { name: "CPP contribution",         rate: 0.0595 },
      { name: "Employment Insurance",     rate: 0.0166 },
    ],
    "India": [
      { name: "TDS (income tax)",         rate: 0.10 },
      { name: "Employees' Provident Fund",rate: 0.12 },
      { name: "Professional tax",         rate: 0.002 },
    ],
    "Australia": [
      { name: "PAYG withholding",         rate: 0.19 },
      { name: "Medicare Levy",            rate: 0.02 },
      { name: "Superannuation",           rate: 0.115 },
    ],
    "Germany": [
      { name: "Lohnsteuer (wage tax)",    rate: 0.14 },
      { name: "Solidarity surcharge",     rate: 0.0055 },
      { name: "Pension insurance",        rate: 0.093 },
      { name: "Health insurance",         rate: 0.073 },
    ],
    "Singapore": [
      { name: "CPF (employee share)",     rate: 0.20 },
      { name: "Skills Development Levy",  rate: 0.0025 },
    ],
    "Custom": [],
  };

  // Sales/VAT/GST rates by country — these drive Financial Preferences
  // in the Business profile. Income withholdings stay separate (per employee,
  // in COUNTRY_PRESETS above).
  const COUNTRY_TAX_RATES = {
    "United States":        { taxRate: 0.0875, label: "State / local sales tax (CA avg)", currency: "USD ($)" },
    "Canada":               { taxRate: 0.05,   label: "GST",                              currency: "CAD ($)" },
    "United Kingdom":       { taxRate: 0.20,   label: "VAT (standard rate)",              currency: "GBP (£)" },
    "Australia":            { taxRate: 0.10,   label: "GST",                              currency: "AUD ($)" },
    "India":                { taxRate: 0.18,   label: "GST (standard rate)",              currency: "INR (₹)" },
    "Germany":              { taxRate: 0.19,   label: "VAT (Mehrwertsteuer)",             currency: "EUR (€)" },
    "France":               { taxRate: 0.20,   label: "VAT (TVA)",                        currency: "EUR (€)" },
    "Ireland":              { taxRate: 0.23,   label: "VAT (standard)",                   currency: "EUR (€)" },
    "Netherlands":          { taxRate: 0.21,   label: "VAT (BTW)",                        currency: "EUR (€)" },
    "Spain":                { taxRate: 0.21,   label: "VAT (IVA)",                        currency: "EUR (€)" },
    "Singapore":            { taxRate: 0.09,   label: "GST",                              currency: "SGD ($)" },
    "Japan":                { taxRate: 0.10,   label: "Consumption tax",                  currency: "JPY (¥)" },
    "New Zealand":          { taxRate: 0.15,   label: "GST",                              currency: "NZD ($)" },
    "Mexico":               { taxRate: 0.16,   label: "IVA",                              currency: "MXN ($)" },
    "Brazil":               { taxRate: 0.17,   label: "ICMS (avg)",                       currency: "BRL (R$)" },
    "South Africa":         { taxRate: 0.15,   label: "VAT",                              currency: "ZAR (R)" },
    "United Arab Emirates": { taxRate: 0.05,   label: "VAT",                              currency: "AED (د.إ)" },
    "Switzerland":          { taxRate: 0.081,  label: "VAT (MWST)",                       currency: "CHF (Fr)" },
    "Sweden":               { taxRate: 0.25,   label: "VAT (Moms)",                       currency: "SEK (kr)" },
    "Custom":               { taxRate: 0,      label: "Custom tax rate",                  currency: "USD ($)" },
  };

  return {
    BRAND_NAME,
    BRAND_LOGO,
    BRAND_DOMAIN,
    SUPPORT_EMAIL,
    BILLING,
    CATEGORIES,
    expenses,
    clients,
    invoices,
    employees,
    paystubs,
    COUNTRY_PRESETS,
    COUNTRY_TAX_RATES,
  };
})();
