import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = checking, null = guest, object = authed
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Skip /me check if returning from OAuth
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const value = {
    user,
    setUser: (u, token) => {
      setUser(u);
      if (token) localStorage.setItem("lc_token", token);
    },
    refresh: checkAuth,
    logout: async () => {
      await api.post("/auth/logout").catch(() => {});
      localStorage.removeItem("lc_token");
      setUser(null);
    },
    loading,
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
