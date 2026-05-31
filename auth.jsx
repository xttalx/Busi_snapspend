/* Auth — sign in / create account / password reset */
function PasswordResetForm({ onSuccess }) {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await window.MartenAPI.updatePassword(password);
      onSuccess?.();
    } catch (err) {
      setError(err.message || "Could not update password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-brand auth-brand-inline">
        <BrandLogo size={48} />
      </div>
      <h2 className="auth-card-title">Set a new password</h2>
      <p className="auth-lead">Choose a new password for your account, then you&apos;ll be signed in.</p>
      <form className="auth-form" onSubmit={submit}>
        <div className="field">
          <label>New password</label>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div className="field">
          <label>Confirm password</label>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        {error && <div className="auth-error">{error}</div>}
        <button className="btn primary auth-submit" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save password & continue"}
        </button>
      </form>
    </div>
  );
}

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
      if (mode === "forgot") {
        await window.MartenAPI.resetPasswordForEmail(email);
        setMessage(
          "If an account exists for that email, we sent a reset link. Check your inbox and spam folder."
        );
        return;
      }
      if (mode === "signin") {
        await window.MartenAPI.signIn(email.trim(), password);
      } else {
        const { session } = await window.MartenAPI.signUp(email.trim(), password);
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

  const showTabs = mode === "signin" || mode === "signup";

  return (
    <div className={"auth-card " + (compact ? "auth-card-compact" : "")}>
      {!compact && (
        <div className="auth-brand auth-brand-inline">
          <BrandLogo size={48} />
        </div>
      )}
      {showTabs ? (
        <div className="auth-card-tabs" role="tablist" aria-label="Account access">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            className={"auth-tab " + (mode === "signin" ? "active" : "")}
            onClick={() => {
              setMode("signin");
              setError(null);
              setMessage(null);
            }}
            disabled={setupRequired}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={"auth-tab " + (mode === "signup" ? "active" : "")}
            onClick={() => {
              setMode("signup");
              setError(null);
              setMessage(null);
            }}
            disabled={setupRequired}
          >
            Create account
          </button>
        </div>
      ) : null}

      <h2 className="auth-card-title">
        {mode === "forgot" ? "Reset your password" : title}
      </h2>
      <p className="auth-lead">
        {mode === "forgot"
          ? "Enter your account email and we will send you a link to choose a new password."
          : lead}
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
        {mode !== "forgot" ? (
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
        ) : null}

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-message">{message}</div>}

        <button className="btn primary auth-submit" type="submit" disabled={busy || setupRequired}>
          {busy
            ? "Please wait…"
            : mode === "forgot"
              ? "Send reset link"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
        </button>
      </form>

      {!setupRequired && mode === "signin" ? (
        <p className="auth-switch">
          <button
            type="button"
            className="auth-link"
            onClick={() => {
              setMode("forgot");
              setError(null);
              setMessage(null);
            }}
          >
            Forgot password?
          </button>
        </p>
      ) : null}

      {!setupRequired && mode === "forgot" ? (
        <p className="auth-switch">
          <button
            type="button"
            className="auth-link"
            onClick={() => {
              setMode("signin");
              setError(null);
              setMessage(null);
            }}
          >
            Back to sign in
          </button>
        </p>
      ) : null}

      {!setupRequired && showTabs ? (
        <p className="auth-footnote">
          {mode === "signin"
            ? `New to ${window.SEED?.BRAND_NAME || "Marten Bookkeeping"}? Use the Create account tab above.`
            : "Already have an account? Use the Sign in tab above."}
        </p>
      ) : null}
    </div>
  );
}

function AuthScreen({ setupRequired = false, recovery = false, onRecoveryComplete }) {
  if (recovery) {
    return (
      <div className="auth-screen">
        <PasswordResetForm onSuccess={onRecoveryComplete} />
      </div>
    );
  }
  return (
    <div className="auth-screen">
      <AuthForm
        setupRequired={setupRequired}
        title={setupRequired ? "Setup required" : undefined}
        lead={
          setupRequired
            ? `Sign-in is required to use ${window.SEED?.BRAND_NAME || "Marten Bookkeeping"}. Cloud sync is not configured on this server yet.`
            : undefined
        }
      />
    </div>
  );
}

window.AuthForm = AuthForm;
window.AuthScreen = AuthScreen;
window.PasswordResetForm = PasswordResetForm;
