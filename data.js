/* Reference data for Snapspend (categories, tax presets). No sample transactions. */
window.SEED = (() => {
  const CATEGORIES = [
    { id: "software",  name: "Software",   color: "#b8442a" },
    { id: "travel",    name: "Travel",     color: "#2f5a3e" },
    { id: "meals",     name: "Meals",      color: "#a07527" },
    { id: "office",    name: "Office",     color: "#6e1f1f" },
    { id: "marketing", name: "Marketing",  color: "#3b5b8f" },
    { id: "utilities", name: "Utilities",  color: "#6b3a8f" },
    { id: "hardware",  name: "Hardware",   color: "#1f6b7a" },
  ];

  const expenses = [];
  const clients = [];
  const invoices = [];
  const employees = [];
  const paystubs = [];

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

  return { CATEGORIES, expenses, clients, invoices, employees, paystubs, COUNTRY_PRESETS, COUNTRY_TAX_RATES };
})();
