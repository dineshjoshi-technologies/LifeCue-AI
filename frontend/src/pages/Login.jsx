import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatErr } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Mail, Lock, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data.user, data.token);
      toast.success("Welcome back");
      navigate(data.user.onboarded ? "/today" : "/onboarding");
    } catch (e) {
      setError(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/today";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <AuthShell title="Welcome back" subtitle="A quiet step into your day.">
      <form onSubmit={onSubmit} className="space-y-4" data-testid="login-form">
        <Field icon={<Mail size={16} strokeWidth={1.5} className="text-stone-400" />}>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" className="input-soft pl-11"
            data-testid="login-email-input"
          />
        </Field>
        <Field icon={<Lock size={16} strokeWidth={1.5} className="text-stone-400" />}>
          <input
            type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" className="input-soft pl-11"
            data-testid="login-password-input"
          />
        </Field>
        {error && <div className="text-sm text-terracotta-400" data-testid="login-error">{error}</div>}
        <button type="submit" disabled={busy} className="btn-primary w-full" data-testid="login-submit-btn">
          {busy ? "Signing in…" : "Sign in"} <ArrowRight size={16} strokeWidth={1.5} />
        </button>
      </form>

      <Divider>or</Divider>

      <button onClick={onGoogle} className="btn-secondary w-full" data-testid="login-google-btn">
        <GoogleMark /> Continue with Google
      </button>

      <p className="mt-6 text-center text-sm text-stone-500">
        New here?{" "}
        <Link to="/signup" className="text-forest-700 underline underline-offset-4" data-testid="login-to-signup-link">
          Begin in 60 seconds
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-paper grain flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-10 justify-center" data-testid="auth-brand-link">
          <span className="w-8 h-8 rounded-full bg-forest-700 flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-sand-300" />
          </span>
          <span className="font-serif text-xl text-forest-900 tracking-tight">LifeCue</span>
        </Link>
        <div className="card-soft p-8 sm:p-10 animate-slide-up">
          <h1 className="font-serif text-3xl text-forest-900">{title}</h1>
          <p className="text-stone-500 mt-2 mb-7">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({ icon, children }) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2">{icon}</div>
      {children}
    </div>
  );
}

export function Divider({ children }) {
  return (
    <div className="my-6 flex items-center gap-4">
      <div className="flex-1 h-px bg-stone-200" />
      <div className="text-xs text-stone-400 uppercase tracking-widest">{children}</div>
      <div className="flex-1 h-px bg-stone-200" />
    </div>
  );
}

export function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.55c2.08-1.92 3.29-4.74 3.29-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.55-2.76c-.98.66-2.23 1.05-3.73 1.05-2.87 0-5.3-1.94-6.17-4.55H2.17v2.86A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.83 14.08A6.6 6.6 0 0 1 5.5 12c0-.72.12-1.42.33-2.08V7.06H2.17A11 11 0 0 0 1 12c0 1.77.42 3.45 1.17 4.94l3.66-2.86z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.07 14.97 1 12 1 7.7 1 3.99 3.47 2.17 7.06l3.66 2.86C6.7 7.32 9.13 5.38 12 5.38z"/>
    </svg>
  );
}
