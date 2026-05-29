/* Marketing landing — sign in / create account + product story */
function LandingPage({ setupRequired = false }) {
  const brand = window.SEED?.BRAND_NAME || "Marten Bookkeeping";
  const pricing = window.SEED?.BILLING || { payPerDownload: 9.99, proMonthly: 39.39 };

  const features = [
    {
      icon: "expense",
      title: "Expense ledger",
      desc: "Log spending by category, attach receipts, and export a print-ready PDF ledger when tax season hits.",
    },
    {
      icon: "invoice",
      title: "Client invoices",
      desc: "Build polished invoices with line items, tax, and your studio branding — track sent, due, and paid.",
    },
    {
      icon: "paystub",
      title: "Pay statements",
      desc: "Run payroll for your team with paystubs that match your business profile and payment terms.",
    },
    {
      icon: "receipt",
      title: "Bills & payables",
      desc: "Track vendor bills, mark them paid, and keep payables separate from day-to-day expenses.",
    },
    {
      icon: "business",
      title: "Clients & team",
      desc: "A lightweight registry for business clients and employees — everything linked to invoices and payroll.",
    },
    {
      icon: "reports",
      title: "Reports & history",
      desc: "See where money moves, review transaction history, and stay on top of cash flow without a spreadsheet maze.",
    },
  ];

  const highlights = [
    "Receipts & categories",
    "Invoices & bills",
    "Payroll & paystubs",
    "Cloud-backed workspace",
  ];

  return (
    <div className="landing">
      <header className="landing-top">
        <div className="landing-brand">
          <BrandLogo size={44} showName name={brand} />
        </div>
        <p className="landing-eyebrow">Expense · invoice · payroll for the solo studio</p>
      </header>

      <div className="landing-hero-grid">
        <section className="landing-copy">
          <p className="landing-kicker">Built for independent studios</p>
          <h1 className="landing-headline">
            Your books, invoices, and payroll — in one calm workspace.
          </h1>
          <p className="landing-lead">
            {brand} is a focused financial desk for freelancers and small creative businesses.
            Track what you spend, bill who you work with, pay your team, and keep everything
            organized without enterprise accounting software.
          </p>

          <ul className="landing-highlights">
            {highlights.map((item) => (
              <li key={item}>
                <Icon name="check" size={14} />
                {item}
              </li>
            ))}
          </ul>

          <div className="landing-proof">
            <div className="landing-stat">
              <b>One login</b>
              <span>Secure cloud sync across devices</span>
            </div>
            <div className="landing-stat">
              <b>Studio-ready</b>
              <span>Branded invoices & business profile</span>
            </div>
            <div className="landing-stat">
              <b>Export when you need it</b>
              <span>PDF expense ledgers & printable docs</span>
            </div>
          </div>
        </section>

        <aside className="landing-auth-panel" aria-label="Sign in or create account">
          <AuthForm
            setupRequired={setupRequired}
            title={setupRequired ? "Setup required" : "Start your workspace"}
            lead={
              setupRequired
                ? "Sign-in will be available once cloud sync is configured on this server."
                : "Sign in or subscribe to Pro for the full workspace."
            }
            compact
          />
        </aside>
      </div>

      <section className="landing-pricing" id="pricing" aria-labelledby="landing-pricing-heading">
        <div className="landing-features-head">
          <p className="landing-kicker">Pricing</p>
          <h2 id="landing-pricing-heading">Choose how you want to work</h2>
          <p className="landing-features-lead">
            Subscribe to Pro for your full studio, or create a single invoice with pay-per-download — no account required.
          </p>
        </div>
        {window.PricingCards && (
          <PricingCards
            landingPricing
            onSelectPlan={() => {
              document.querySelector(".landing-auth-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          />
        )}
      </section>

      <section className="landing-features" aria-labelledby="landing-features-heading">
        <div className="landing-features-head">
          <p className="landing-kicker">What you get</p>
          <h2 id="landing-features-heading">Everything a solo studio needs to stay solvent</h2>
          <p className="landing-features-lead">
            No bloated dashboards — just the tools you reach for every week: spending, billing,
            payroll, and the records behind them.
          </p>
        </div>
        <div className="landing-feature-grid">
          {features.map((f) => (
            <article className="landing-feature-card" key={f.title}>
              <div className="landing-feature-icon" aria-hidden="true">
                <Icon name={f.icon} size={18} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta-band">
        <div className="landing-cta-copy">
          <h2>Ready when you are</h2>
          <p>Create an account in under a minute, or sign in to pick up where you left off.</p>
        </div>
        <button
          type="button"
          className="btn primary landing-cta-scroll"
          onClick={() => {
            document.querySelector(".landing-auth-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        >
          Get started
        </button>
      </section>

      <footer className="landing-footer">
        <span className="landing-footer-brand">
          <BrandLogo size={32} showName name={brand} />
        </span>
        <span>Expense, invoice &amp; payroll for the solo studio</span>
      </footer>
    </div>
  );
}

window.LandingPage = LandingPage;
