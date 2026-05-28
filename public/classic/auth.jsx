/* Auth — sign in / create account form (used on landing and setup screen) */
function AuthForm({
  setupRequired = false,
  title = "Welcome back",
  lead = "Sign in or create an account to use your workspace. Your data is saved securely in the cloud.",
  compact = false,
  initialMode = "signin",
}) {
  const [mode, setMode] = React.useState(initialMode);
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
    <div className={"auth-card " + (compact ? "auth-card-compact" : "")}>
      <div className="auth-card-tabs" role="tablist" aria-label="Account access">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signin"}
          className={"auth-tab " + (mode === "signin" ? "active" : "")}
          onClick={() => { setMode("signin"); setError(null); setMessage(null); }}
          disabled={setupRequired}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          className={"auth-tab " + (mode === "signup" ? "active" : "")}
          onClick={() => { setMode("signup"); setError(null); setMessage(null); }}
          disabled={setupRequired}
        >
          Create account
        </button>
      </div>

      <h2 className="auth-card-title">{title}</h2>
      <p className="auth-lead">{lead}</p>

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

      {!setupRequired && (
        <p className="auth-footnote">
          {mode === "signin"
            ? "New to Snapspend? Use the Create account tab above."
            : "Already have an account? Use the Sign in tab above."}
        </p>
      )}
    </div>
  );
}

function AuthScreen({ setupRequired = false }) {
  return (
    <div className="auth-screen">
      <AuthForm
        setupRequired={setupRequired}
        title={setupRequired ? "Setup required" : undefined}
        lead={
          setupRequired
            ? "Sign-in is required to use Snapspend. Cloud sync is not configured on this server yet."
            : undefined
        }
      />
    </div>
  );
}

window.AuthForm = AuthForm;
window.AuthScreen = AuthScreen;
