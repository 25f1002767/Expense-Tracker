import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const isRegister = location.pathname === "/register";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (isRegister) {
        await register({ ...form, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata" });
      } else {
        await login({ email: form.email, password: form.password });
      }
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-story">
        <div className="auth-brand"><span className="brand-mark">L</span><strong>ledger</strong></div>
        <div className="story-copy"><p className="eyebrow">A CLEARER VIEW OF YOUR MONEY</p><h1>Make every rupee<br />feel accounted for.</h1><p>One calm place to see what came in, what went out, and what you want to do next.</p></div>
        <div className="story-footer"><span>PRIVATE BY DESIGN</span><span>BUILT FOR REAL LIFE</span></div>
      </div>
      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <p className="eyebrow">{isRegister ? "CREATE YOUR SPACE" : "WELCOME BACK"}</p>
          <h2>{isRegister ? "Start with a clean slate." : "Good to see you again."}</h2>
          <p className="auth-description">{isRegister ? "Create your account to begin tracking." : "Sign in to pick up where you left off."}</p>
          {isRegister && <label className="field"><span>Your name</span><input autoComplete="name" maxLength="80" value={form.name} onChange={(event) => update("name", event.target.value)} required /></label>}
          <label className="field"><span>Email address</span><input autoComplete="email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required /></label>
          <label className="field"><span>Password</span><input autoComplete={isRegister ? "new-password" : "current-password"} type="password" minLength={isRegister ? 8 : undefined} value={form.password} onChange={(event) => update("password", event.target.value)} required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary auth-submit" disabled={saving}>{saving ? "Please wait…" : isRegister ? "Create account" : "Sign in"}</button>
          <p className="auth-switch">{isRegister ? "Already have an account?" : "New to Ledger?"} <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create an account"}</Link></p>
        </form>
        <span className="auth-footnote">Your data belongs to you.</span>
      </section>
    </main>
  );
}
