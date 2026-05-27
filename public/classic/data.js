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
  const US_FEDERAL = [
    { name: "Federal income tax", rate: 0.12 },
    { name: "Social Security", rate: 0.062 },
    { name: "Medicare", rate: 0.0145 },
  ];

  const CA_FEDERAL = [
    { name: "Federal income tax", rate: 0.15 },
    { name: "CPP contribution", rate: 0.0595 },
    { name: "Employment Insurance", rate: 0.0166 },
  ];

  const COUNTRY_PRESETS = {
    "United States": [...US_FEDERAL],
    "United Kingdom": [
      { name: "Income tax (basic rate)", rate: 0.20 },
      { name: "National Insurance",      rate: 0.08 },
    ],
    "Canada": [...CA_FEDERAL],
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

  // Province / state withholding presets (merged with federal/national rows).
  const REGION_PRESETS = {
    "United States": {
      label: "State",
      regions: {
        "Alabama": [...US_FEDERAL, { name: "Alabama state income tax", rate: 0.05 }],
        "Alaska": [...US_FEDERAL],
        "Arizona": [...US_FEDERAL, { name: "Arizona state income tax", rate: 0.025 }],
        "California": [...US_FEDERAL, { name: "California state income tax", rate: 0.05 }],
        "Colorado": [...US_FEDERAL, { name: "Colorado state income tax", rate: 0.044 }],
        "Florida": [...US_FEDERAL],
        "Georgia": [...US_FEDERAL, { name: "Georgia state income tax", rate: 0.055 }],
        "Illinois": [...US_FEDERAL, { name: "Illinois state income tax", rate: 0.0495 }],
        "Massachusetts": [...US_FEDERAL, { name: "Massachusetts state income tax", rate: 0.05 }],
        "Michigan": [...US_FEDERAL, { name: "Michigan state income tax", rate: 0.0425 }],
        "Nevada": [...US_FEDERAL],
        "New Jersey": [...US_FEDERAL, { name: "New Jersey state income tax", rate: 0.055 }],
        "New York": [...US_FEDERAL, { name: "New York state income tax", rate: 0.065 }],
        "North Carolina": [...US_FEDERAL, { name: "North Carolina state income tax", rate: 0.0525 }],
        "Ohio": [...US_FEDERAL, { name: "Ohio state income tax", rate: 0.04 }],
        "Pennsylvania": [...US_FEDERAL, { name: "Pennsylvania state income tax", rate: 0.0307 }],
        "Texas": [...US_FEDERAL],
        "Washington": [...US_FEDERAL],
      },
    },
    "Canada": {
      label: "Province / territory",
      regions: {
        "Alberta": [...CA_FEDERAL, { name: "Alberta provincial tax", rate: 0.10 }],
        "British Columbia": [...CA_FEDERAL, { name: "British Columbia provincial tax", rate: 0.0506 }],
        "Manitoba": [...CA_FEDERAL, { name: "Manitoba provincial tax", rate: 0.108 }],
        "New Brunswick": [...CA_FEDERAL, { name: "New Brunswick provincial tax", rate: 0.094 }],
        "Newfoundland and Labrador": [...CA_FEDERAL, { name: "Newfoundland & Labrador provincial tax", rate: 0.087 }],
        "Nova Scotia": [...CA_FEDERAL, { name: "Nova Scotia provincial tax", rate: 0.0879 }],
        "Ontario": [...CA_FEDERAL, { name: "Ontario provincial tax", rate: 0.0505 }],
        "Prince Edward Island": [...CA_FEDERAL, { name: "PEI provincial tax", rate: 0.098 }],
        "Quebec": [...CA_FEDERAL, { name: "Quebec provincial tax", rate: 0.14 }],
        "Saskatchewan": [...CA_FEDERAL, { name: "Saskatchewan provincial tax", rate: 0.105 }],
        "Northwest Territories": [...CA_FEDERAL, { name: "NWT territorial tax", rate: 0.059 }],
        "Nunavut": [...CA_FEDERAL, { name: "Nunavut territorial tax", rate: 0.04 }],
        "Yukon": [...CA_FEDERAL, { name: "Yukon territorial tax", rate: 0.064 }],
      },
    },
    "India": {
      label: "State",
      regions: {
        "Karnataka": [
          { name: "TDS (income tax)", rate: 0.10 },
          { name: "Employees' Provident Fund", rate: 0.12 },
          { name: "Professional tax (Karnataka)", rate: 0.002 },
        ],
        "Maharashtra": [
          { name: "TDS (income tax)", rate: 0.10 },
          { name: "Employees' Provident Fund", rate: 0.12 },
          { name: "Professional tax (Maharashtra)", rate: 0.002 },
        ],
        "Delhi": [
          { name: "TDS (income tax)", rate: 0.10 },
          { name: "Employees' Provident Fund", rate: 0.12 },
          { name: "Professional tax (Delhi)", rate: 0.001 },
        ],
        "Tamil Nadu": [
          { name: "TDS (income tax)", rate: 0.10 },
          { name: "Employees' Provident Fund", rate: 0.12 },
          { name: "Professional tax (Tamil Nadu)", rate: 0.002 },
        ],
      },
    },
    "Australia": {
      label: "State / territory",
      regions: {
        "New South Wales": [
          { name: "PAYG withholding", rate: 0.19 },
          { name: "Medicare Levy", rate: 0.02 },
          { name: "Superannuation", rate: 0.115 },
        ],
        "Victoria": [
          { name: "PAYG withholding", rate: 0.19 },
          { name: "Medicare Levy", rate: 0.02 },
          { name: "Payroll tax (VIC)", rate: 0.0485 },
          { name: "Superannuation", rate: 0.115 },
        ],
        "Queensland": [
          { name: "PAYG withholding", rate: 0.19 },
          { name: "Medicare Levy", rate: 0.02 },
          { name: "Superannuation", rate: 0.115 },
        ],
        "Western Australia": [
          { name: "PAYG withholding", rate: 0.19 },
          { name: "Medicare Levy", rate: 0.02 },
          { name: "Superannuation", rate: 0.115 },
        ],
      },
    },
  };

  function getRegionConfig(country) {
    return REGION_PRESETS[country] || null;
  }

  function getRegionOptions(country) {
    const config = getRegionConfig(country);
    if (!config) return [];
    return Object.keys(config.regions).sort((a, b) => a.localeCompare(b));
  }

  function getRegionLabel(country) {
    const config = getRegionConfig(country);
    return config?.label || "Province / state";
  }

  function getWithholdingPresets(country, region) {
    const config = getRegionConfig(country);
    if (config && region && config.regions[region]) {
      return config.regions[region];
    }
    return COUNTRY_PRESETS[country] || [];
  }

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

  const SUPPORT_EMAIL = "support@snapspend.app";

  return {
    CATEGORIES,
    expenses,
    clients,
    invoices,
    employees,
    paystubs,
    COUNTRY_PRESETS,
    REGION_PRESETS,
    COUNTRY_TAX_RATES,
    SUPPORT_EMAIL,
    getRegionOptions,
    getRegionLabel,
    getWithholdingPresets,
  };
})();
