/* Marketing landing — sign in / create account + product story */
function LandingPage({ setupRequired = false }) {
  const brand = window.SEED?.BRAND_NAME || "Marten Bookkeeping";
  const features = [
    {
      icon: "expense",
      title: "Expense ledger",
      desc: "Log spending by category, attach receipts, and export a print-ready PDF ledger when tax season hits.",
    },
    {
      icon: "invoice",
      title: "Client invoices",
      desc: "Build polished invoices with line items, GST, and your studio branding — then email the PDF to your client.",
    },
    {
      icon: "calc",
      title: "GST calculator",
      desc: "Add GST to a pre-tax amount, or extract GST from a tax-inclusive total and apply the rate to an invoice.",
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
    "Invoices, GST & email",
    "Payroll & paystubs",
    "Cloud-backed workspace",
  ];

  return (
    <div className="landing">
      <header className="landing-top">
        <div className="landing-brand">
          <BrandLogo size={44} showName name={brand} />
        </div>
        <a className="btn sm landing-signin" href="#sign-in">Sign in</a>
        <p className="landing-eyebrow">Invoice generator · GST calculator · expense &amp; payroll</p>
      </header>

      <div className="landing-hero-grid">
        <section className="landing-copy">
          <p className="landing-kicker">Built for independent studios</p>
          <h1 className="landing-headline">
            Invoice generator, GST calculator, and bookkeeping — in one calm workspace.
          </h1>
          <p className="landing-lead">
            {brand} is a focused financial desk for freelancers and small creative businesses.
            Create invoices, calculate GST from a total or add GST to an amount, email invoices to clients,
            track expenses, and run payroll without enterprise accounting software.
          </p>

          <ul className="landing-highlights">
            {highlights.map((item) => (
              <li key={item}>
                <Icon name="check" size={14} />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <aside id="sign-in" className="landing-auth-panel" aria-label="Sign in or create account">
          <AuthForm
            setupRequired={setupRequired}
            title={setupRequired ? "Setup required" : "Start your workspace"}
            lead={
              setupRequired
                ? "Sign-in will be available once cloud sync is configured on this server."
                : "Sign in with your email to access your workspace."
            }
            compact
          />
        </aside>

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
      </div>

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

      <section className="landing-features" aria-labelledby="landing-faq-heading" style={{ paddingTop: 8 }}>
        <div className="landing-features-head">
          <p className="landing-kicker">FAQ</p>
          <h2 id="landing-faq-heading">Invoice and GST questions</h2>
        </div>
        <div className="landing-feature-grid">
          <article className="landing-feature-card">
            <h3>How do I calculate GST on an invoice?</h3>
            <p>Open Invoices, tap GST, then choose Add GST for a pre-tax amount or GST from amount for a tax-inclusive total. Apply the rate to the current invoice in one click.</p>
          </article>
          <article className="landing-feature-card">
            <h3>Can I email an invoice from the app?</h3>
            <p>Yes. Open any invoice and tap Email. We attach the PDF and send it to your client. If server mail is not configured, your email app opens with the PDF downloaded to attach.</p>
          </article>
          <article className="landing-feature-card">
            <h3>Is this bookkeeping software for freelancers?</h3>
            <p>Yes. Marten Bookkeeping is built for solo studios: expenses, invoices, estimates, bills, payroll, and reports in one login.</p>
          </article>
        </div>
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
