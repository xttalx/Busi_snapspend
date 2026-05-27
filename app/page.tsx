import { InstallAppButton } from "@/components/InstallAppButton";

export default function HomePage() {
  return (
    <div className="shell">
      <header className="shell-header">
        <div className="brand">
          <h1 className="brand-title">Snapspend</h1>
          <span className="brand-sub">Solo studio finance</span>
        </div>
        <InstallAppButton />
      </header>

      <main className="shell-main">
        <section className="hero-card">
          <h2>Install on your phone or desktop</h2>
          <p>
            Snapspend works offline after install, opens full-screen like a native app, and keeps your
            workspace one tap away from the home screen.
          </p>
          <InstallAppButton />
          <a className="legacy-link" href="/classic/index.html">
            Open classic web app →
          </a>
        </section>
      </main>
    </div>
  );
}
