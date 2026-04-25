import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatErr } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Mail, Lock, User as UserIcon, ArrowRight } from "lucide-react";
import { AuthShell, Field, Divider, GoogleMark } from "./Login";
import toast from "react-hot-toast";

export default function Signup() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/register", { name, email, password });
      setUser(data.user, data.token);
      toast.success("Welcome to LifeCue");
      navigate("/onboarding");
    } catch (e) {
      setError(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/onboarding";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <AuthShell title="Begin your flow" subtitle="One quiet account, gentle nudges all day.">
      <form onSubmit={onSubmit} className="space-y-4" data-testid="signup-form">
        <Field icon={<UserIcon size={16} strokeWidth={1.5} className="text-stone-400" />}>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name"
            className="input-soft pl-11" data-testid="signup-name-input" />
        </Field>
        <Field icon={<Mail size={16} strokeWidth={1.5} className="text-stone-400" />}>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" className="input-soft pl-11" data-testid="signup-email-input" />
        </Field>
        <Field icon={<Lock size={16} strokeWidth={1.5} className="text-stone-400" />}>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6)" className="input-soft pl-11" data-testid="signup-password-input" />
        </Field>
        {error && <div className="text-sm text-terracotta-400" data-testid="signup-error">{error}</div>}
        <button type="submit" disabled={busy} className="btn-primary w-full" data-testid="signup-submit-btn">
          {busy ? "Creating…" : "Create account"} <ArrowRight size={16} strokeWidth={1.5} />
        </button>
      </form>

      <Divider>or</Divider>

      <button onClick={onGoogle} className="btn-secondary w-full" data-testid="signup-google-btn">
        <GoogleMark /> Continue with Google
      </button>

      <p className="mt-6 text-center text-sm text-stone-500">
        Already with us?{" "}
        <Link to="/login" className="text-forest-700 underline underline-offset-4" data-testid="signup-to-login-link">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
