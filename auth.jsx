/* Auth screen — sign in / create account (required before using the app) */
function AuthScreen({ setupRequired = false }) {
  const [mode, setMode] = React.useState("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (setupRequired) return;
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
          {setupRequired ?
            "Sign-in is required to use Snapspend. Cloud sync is not configured on this server yet." :
            "Sign in or create an account to use your workspace. Your data is saved securely in the cloud."}
        </p>

        {setupRequired && (
          <div className="auth-message">
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your host settings, then redeploy.
          </div>
        )}

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

          <button className="btn primary auth-submit" type="submit" disabled={busy || setupRequired}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {!setupRequired && <div className="auth-switch">
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
        </div>}

      </div>
    </div>
  );
}

window.AuthScreen = AuthScreen;
