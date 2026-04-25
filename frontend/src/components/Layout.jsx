import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Sun, ListTodo, Sparkles, CreditCard, User } from "lucide-react";

const NAV = [
  { to: "/today", label: "Today", icon: Sun, testid: "nav-today" },
  { to: "/habits", label: "Habits", icon: ListTodo, testid: "nav-habits" },
  { to: "/coach", label: "Coach", icon: Sparkles, testid: "nav-coach" },
  { to: "/subscription", label: "Plan", icon: CreditCard, testid: "nav-plan" },
  { to: "/profile", label: "You", icon: User, testid: "nav-profile" },
];

export default function Layout({ children, header }) {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-paper grain">
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-paper/80 border-b border-stone-200/60">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <Link to="/today" className="flex items-center gap-2" data-testid="brand-link">
            <span className="w-8 h-8 rounded-full bg-forest-700 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-sand-300" />
            </span>
            <span className="font-serif text-xl text-forest-900 tracking-tight">LifeCue</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => {
              const active = location.pathname === n.to;
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  data-testid={n.testid}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all ${
                    active ? "bg-forest-700 text-paper" : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  <Icon size={16} strokeWidth={1.5} />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          {header}
        </div>
      </div>
      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-6 sm:py-10 pb-28 md:pb-12">{children}</main>
      {/* mobile nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-stone-200/60">
        <div className="grid grid-cols-5">
          {NAV.map((n) => {
            const active = location.pathname === n.to;
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                data-testid={`${n.testid}-mobile`}
                className={`flex flex-col items-center gap-1 py-3 text-[11px] ${active ? "text-forest-800" : "text-stone-500"}`}
              >
                <Icon size={20} strokeWidth={1.5} />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
