import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import * as Icons from "lucide-react";
import { ArrowRight, Check } from "lucide-react";
import toast from "react-hot-toast";

const STEPS = ["welcome", "habits", "water", "quiet", "ready"];
const WATER_GOALS = [1500, 2000, 2500, 3000, 3500];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [catalog, setCatalog] = useState([]);
  const [selected, setSelected] = useState(["water", "steps", "sleep", "stretch"]);
  const [waterGoal, setWaterGoal] = useState(2500);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/habits/catalog").then(({ data }) => setCatalog(data));
  }, []);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    setBusy(true);
    try {
      await api.post("/onboarding", {
        water_goal_ml: waterGoal,
        selected_habits: selected,
        quiet_hours_start: quietStart,
        quiet_hours_end: quietEnd,
      });
      await refresh();
      toast.success("You're all set");
      navigate("/today");
    } catch {
      toast.error("Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const toggleHabit = (key) => {
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  };

  return (
    <div className="min-h-screen bg-paper grain px-5 py-10 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="flex gap-2 mb-8" data-testid="onboarding-progress">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? "bg-forest-700" : "bg-stone-200"}`} />
          ))}
        </div>

        <div className="card-soft p-8 sm:p-12 animate-slide-up">
          {step === 0 && (
            <div data-testid="onboard-step-welcome">
              <h1 className="font-serif text-4xl text-forest-900">Hi {user?.name?.split(" ")[0] || "there"}.</h1>
              <p className="mt-4 text-stone-600 text-lg leading-relaxed">
                Three small choices and we're done. No long forms, no streak shame. Just a few cues that fit your day.
              </p>
              <button onClick={next} className="btn-primary mt-8" data-testid="onboard-welcome-next">
                Let's begin <ArrowRight size={16} strokeWidth={1.5} />
              </button>
            </div>
          )}

          {step === 1 && (
            <div data-testid="onboard-step-habits">
              <h2 className="font-serif text-3xl text-forest-900">What matters today?</h2>
              <p className="text-stone-500 mt-2">Pick a few. You can always change later.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 max-h-[360px] overflow-y-auto pr-1">
                {catalog.map((h) => {
                  const Icon = pickIcon(h.icon);
                  const on = selected.includes(h.key);
                  return (
                    <button
                      key={h.key}
                      onClick={() => toggleHabit(h.key)}
                      data-testid={`onboard-habit-${h.key}`}
                      className={`text-left p-4 rounded-2xl border transition-all ${
                        on ? "bg-sage-100 border-sage-200" : "bg-white border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      <Icon size={18} strokeWidth={1.5} className={on ? "text-forest-700" : "text-stone-500"} />
                      <div className="mt-2 font-medium text-forest-900 text-sm">{h.label}</div>
                    </button>
                  );
                })}
              </div>
              <Nav onPrev={prev} onNext={next} canNext={selected.length > 0} />
            </div>
          )}

          {step === 2 && (
            <div data-testid="onboard-step-water">
              <h2 className="font-serif text-3xl text-forest-900">Daily water goal</h2>
              <p className="text-stone-500 mt-2">A gentle target — not a deadline.</p>
              <div className="grid grid-cols-5 gap-2 mt-6">
                {WATER_GOALS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setWaterGoal(g)}
                    data-testid={`onboard-water-${g}`}
                    className={`py-4 rounded-2xl border font-medium transition-all ${
                      waterGoal === g ? "bg-forest-700 text-paper border-forest-700" : "bg-white border-stone-200"
                    }`}
                  >
                    <div className="text-lg">{g}</div>
                    <div className="text-xs opacity-70">ml</div>
                  </button>
                ))}
              </div>
              <Nav onPrev={prev} onNext={next} />
            </div>
          )}

          {step === 3 && (
            <div data-testid="onboard-step-quiet">
              <h2 className="font-serif text-3xl text-forest-900">Quiet hours</h2>
              <p className="text-stone-500 mt-2">We won't nudge during these hours.</p>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <label className="block">
                  <span className="text-xs uppercase tracking-widest text-stone-500">From</span>
                  <input type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)}
                    className="input-soft mt-1" data-testid="onboard-quiet-start" />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-widest text-stone-500">Until</span>
                  <input type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)}
                    className="input-soft mt-1" data-testid="onboard-quiet-end" />
                </label>
              </div>
              <Nav onPrev={prev} onNext={next} />
            </div>
          )}

          {step === 4 && (
            <div data-testid="onboard-step-ready">
              <div className="w-14 h-14 rounded-full bg-sage-100 flex items-center justify-center">
                <Check size={22} className="text-forest-700" strokeWidth={1.5} />
              </div>
              <h2 className="font-serif text-3xl text-forest-900 mt-4">You're set.</h2>
              <p className="mt-3 text-stone-600 leading-relaxed">
                {selected.length} habits · {waterGoal}ml water · quiet from {quietStart} to {quietEnd}.
              </p>
              <p className="mt-4 text-sm text-stone-500">
                Wellness guidance only. Not a substitute for medical care.
              </p>
              <button onClick={finish} disabled={busy} className="btn-primary mt-8" data-testid="onboard-finish-btn">
                {busy ? "Saving…" : "Open today"} <ArrowRight size={16} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Nav({ onPrev, onNext, canNext = true }) {
  return (
    <div className="mt-8 flex items-center justify-between">
      <button onClick={onPrev} className="btn-ghost" data-testid="onboard-back-btn">Back</button>
      <button onClick={onNext} disabled={!canNext} className="btn-primary disabled:opacity-50" data-testid="onboard-next-btn">
        Next <ArrowRight size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}

export function pickIcon(name) {
  const map = {
    droplet: "Droplet", footprints: "Footprints", move: "Move", moon: "Moon", leaf: "Leaf",
    "book-open": "BookOpen", "candy-off": "CandyOff", user: "User", wind: "Wind",
    "monitor-off": "MonitorOff", "pen-line": "PenLine", target: "Target", pill: "Pill",
    dumbbell: "Dumbbell",
  };
  const k = map[name] || "Sparkles";
  return Icons[k] || Icons.Sparkles;
}
