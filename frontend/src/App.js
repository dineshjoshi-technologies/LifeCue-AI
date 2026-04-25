import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./lib/auth";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import Today from "./pages/Today";
import Habits from "./pages/Habits";
import Coach from "./pages/Coach";
import Subscription from "./pages/Subscription";
import Profile from "./pages/Profile";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.onboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

function FullScreenLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-paper">
      <div className="text-stone-500 font-serif text-xl tracking-wide animate-pulse-soft">a quiet moment…</div>
    </div>
  );
}

function AppRouter() {
  const location = useLocation();
  // Synchronous check for OAuth callback during render
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/onboarding" element={<OnboardingGate />} />
      <Route path="/today" element={<ProtectedRoute><Today /></ProtectedRoute>} />
      <Route path="/habits" element={<ProtectedRoute><Habits /></ProtectedRoute>} />
      <Route path="/coach" element={<ProtectedRoute><Coach /></ProtectedRoute>} />
      <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function OnboardingGate() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.onboarded) return <Navigate to="/today" replace />;
  return <Onboarding />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#FFFFFF",
              color: "#1F2924",
              border: "1px solid #E5DFD6",
              borderRadius: "16px",
              fontFamily: "Manrope, sans-serif",
            },
          }}
        />
        <AppRouter />
      </BrowserRouter>
    </AuthProvider>
  );
}
