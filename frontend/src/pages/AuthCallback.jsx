import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState("");
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) {
      navigate("/login", { replace: true });
      return;
    }
    const session_id = decodeURIComponent(m[1]);

    (async () => {
      try {
        const { data } = await api.post("/auth/google/session", { session_id });
        setUser(data.user, data.token);
        // strip hash and route
        window.history.replaceState({}, "", window.location.pathname);
        navigate(data.user.onboarded ? "/today" : "/onboarding", { replace: true });
      } catch (e) {
        setError("Sign-in could not be completed. Please try again.");
        setTimeout(() => navigate("/login", { replace: true }), 2000);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center" data-testid="auth-callback-page">
      <div className="text-stone-500 font-serif text-xl">{error || "settling in…"}</div>
    </div>
  );
}
