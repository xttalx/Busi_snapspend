/* Auth screen — shown when Supabase is configured and user is not signed in */
function AuthScreen() {
  const [mode, setMode] = React.useState("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await window.SnapAPI.signIn(email.trim(), password);
      } else {
        const { session } = await window.SnapAPI.signUp(email.trim(), password);
        if (!session) {
          setMessage("Account created. Check your email to confirm, then sign in.");
          setMode("signin");
        }
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          Snapspend<span className="dot"></span>
        </div>
        <p className="auth-lead">
          Sign in to sync expenses, invoices, and payroll across devices.
        </p>

        <form className="auth-form" onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.com"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              className="input"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          <button className="btn primary auth-submit" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "signin" ? (
            <>
              New here?{" "}
              <button type="button" className="auth-link" onClick={() => { setMode("signup"); setError(null); }}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" className="auth-link" onClick={() => { setMode("signin"); setError(null); }}>
                Sign in
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

window.AuthScreen = AuthScreen;
