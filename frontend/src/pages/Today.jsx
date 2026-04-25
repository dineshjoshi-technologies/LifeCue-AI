import React, { useEffect, useState, useCallback, useRef } from "react";
import Layout from "../components/Layout";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Plus, Check, Snowflake, X, Sparkles, Volume2 } from "lucide-react";
import { pickIcon } from "./Onboarding";
import { speakReminder } from "../lib/speech";
import { onForegroundMessage } from "../lib/push";
import toast from "react-hot-toast";

export default function Today() {
  const { user } = useAuth();
  const [water, setWater] = useState(null);
  const [habits, setHabits] = useState(null);
  const [reminders, setReminders] = useState([]);
  const lastSpokenRef = useRef(null);

  const load = useCallback(async () => {
    const [w, h, r] = await Promise.all([
      api.get("/water/today"),
      api.get("/habits/today"),
      api.get("/reminders/today"),
    ]);
    setWater(w.data);
    setHabits(h.data);
    setReminders(r.data.reminders);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Voice reminder: when reminders update and voice opt-in is on, gently speak the first one (once per id).
  useEffect(() => {
    if (!user?.voice_reminders_enabled) return;
    if (!reminders.length) return;
    const first = reminders[0];
    if (lastSpokenRef.current === first.id) return;
    lastSpokenRef.current = first.id;
    // Brief delay so the page paints first
    const t = setTimeout(() => {
      speakReminder(`${first.title}. ${first.body}`);
    }, 600);
    return () => clearTimeout(t);
  }, [reminders, user?.voice_reminders_enabled]);

  // Foreground push notifications -> toast
  useEffect(() => {
    let unsub = () => {};
    onForegroundMessage((payload) => {
      const t = payload?.notification?.title || "LifeCue";
      const b = payload?.notification?.body || "A gentle nudge.";
      toast(`${t} — ${b}`, { icon: "🌿" });
    }).then((u) => { if (typeof u === "function") unsub = u; });
    return () => unsub();
  }, []);

  const addWater = async (amount_ml) => {
    const { data } = await api.post("/water/log", { amount_ml });
    setWater(data);
    toast.success(`+${amount_ml}ml`);
    api.get("/reminders/today").then(({ data }) => setReminders(data.reminders));
  };

  const toggleHabit = async (key, completed) => {
    const { data } = await api.post("/habits/toggle", { habit_key: key, completed });
    setHabits(data);
    api.get("/reminders/today").then(({ data }) => setReminders(data.reminders));
  };

  const reminderAction = async (rem, action) => {
    await api.post("/reminders/action", { reminder_id: rem.id, action });
    setReminders((rs) => rs.filter((r) => r.id !== rem.id));
    if (action === "done") {
      toast.success("Lovely.");
      load();
    }
  };

  const greeting = greetingFor(new Date());
  const goalPct = water ? Math.min(100, Math.round((water.total_ml / water.goal_ml) * 100)) : 0;

  return (
    <Layout>
      <header className="mb-10 animate-slide-up">
        <div className="text-xs uppercase tracking-widest text-stone-500" data-testid="today-date">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl text-forest-900 mt-2 leading-tight" data-testid="today-greeting">
          {greeting}, {user?.name?.split(" ")[0] || "friend"}.
        </h1>
        <p className="text-stone-500 mt-3">{reminders.length === 0 ? "All quiet. Keep flowing." : "A few gentle cues for today."}</p>
      </header>

      <div className="grid md:grid-cols-12 gap-6">
        {/* Water */}
        <section className="md:col-span-5 card-soft p-7" data-testid="water-card">
          <SectionHead title="Water" sub="One sip at a time" />
          <div className="flex items-center gap-6 mt-4">
            <WaterRing pct={goalPct} totalMl={water?.total_ml || 0} />
            <div className="flex-1 space-y-2">
              <button onClick={() => addWater(250)} className="btn-secondary w-full justify-start" data-testid="water-add-250-btn">
                <Plus size={14} strokeWidth={1.5} /> 250ml
              </button>
              <button onClick={() => addWater(500)} className="btn-secondary w-full justify-start" data-testid="water-add-500-btn">
                <Plus size={14} strokeWidth={1.5} /> 500ml
              </button>
              <button onClick={() => addWater(750)} className="btn-secondary w-full justify-start" data-testid="water-add-750-btn">
                <Plus size={14} strokeWidth={1.5} /> 750ml
              </button>
            </div>
          </div>
          <div className="mt-4 text-sm text-stone-500" data-testid="water-progress">
            {water?.total_ml || 0} of {water?.goal_ml || 2500} ml · {goalPct}%
          </div>
        </section>

        {/* Reminders */}
        <section className="md:col-span-7 space-y-3" data-testid="reminders-section">
          <SectionHead title="Gentle cues" sub="Tap one, leave one — no pressure" />
          {reminders.length === 0 && (
            <div className="card-soft p-7 text-stone-500" data-testid="reminders-empty">
              Nothing for now. The day is yours.
            </div>
          )}
          {reminders.map((r, idx) => {
            const Icon = pickIcon(r.icon);
            return (
              <div key={`${r.id}-${idx}`} data-testid={`reminder-${r.id}`} className="card-soft p-5 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${r.tone === "sage" ? "bg-sage-100" : "bg-sand-100"}`}>
                  <Icon size={20} strokeWidth={1.5} className="text-forest-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-lg text-forest-900 truncate">{r.title}</div>
                  <div className="text-sm text-stone-500 truncate">{r.body}</div>
                </div>
                <div className="flex items-center gap-2">
                  {user?.voice_reminders_enabled && (
                    <button onClick={() => speakReminder(`${r.title}. ${r.body}`)}
                      className="btn-ghost !px-3 !py-2 text-sm" data-testid={`reminder-speak-btn-${r.kind}`} aria-label="Read aloud">
                      <Volume2 size={14} strokeWidth={1.5} />
                    </button>
                  )}
                  <button onClick={() => reminderAction(r, "done")} className="btn-primary !px-3 !py-2 text-sm" data-testid={`reminder-done-btn-${r.kind}`} aria-label={`Mark ${r.title} done`}>
                    <Check size={14} strokeWidth={1.5} />
                  </button>
                  <button onClick={() => reminderAction(r, "snooze")} className="btn-secondary !px-3 !py-2 text-sm" data-testid={`reminder-snooze-btn-${r.kind}`} aria-label={`Snooze ${r.title}`}>
                    <Snowflake size={14} strokeWidth={1.5} />
                  </button>
                  <button onClick={() => reminderAction(r, "skip")} className="btn-ghost !px-3 !py-2 text-sm" data-testid={`reminder-skip-btn-${r.kind}`} aria-label={`Skip ${r.title}`}>
                    <X size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {/* Habits row */}
      <section className="mt-10" data-testid="today-habits-section">
        <SectionHead title="Today's habits" sub="" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {(habits?.catalog || []).map((h) => {
            const Icon = pickIcon(h.icon);
            const done = !!habits?.today?.[h.key];
            const streak = habits?.streaks?.[h.key] || 0;
            return (
              <button
                key={h.key}
                onClick={() => toggleHabit(h.key, !done)}
                data-testid={`habit-tile-${h.key}`}
                className={`text-left p-5 rounded-3xl border transition-all active:scale-[0.97] ${
                  done ? "bg-sage-100 border-transparent" : "bg-white border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${done ? "bg-white" : "bg-stone-50"}`}>
                    <Icon size={18} strokeWidth={1.5} className="text-forest-700" />
                  </div>
                  {done && <Check size={16} strokeWidth={2} className="text-forest-700" />}
                </div>
                <div className="mt-3 font-serif text-lg text-forest-900">{h.label}</div>
                <div className="text-xs text-stone-500 mt-1">
                  {streak > 0 ? `${streak}-day flow` : "tap to mark"}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* AI nudge */}
      <section className="mt-10 card-soft p-7 flex items-start gap-4" data-testid="coach-promo">
        <div className="w-11 h-11 rounded-2xl bg-sand-100 flex items-center justify-center">
          <Sparkles size={20} strokeWidth={1.5} className="text-forest-700" />
        </div>
        <div className="flex-1">
          <div className="font-serif text-lg text-forest-900">Talk to your coach</div>
          <p className="text-stone-500 text-sm mt-1">Ask anything — sleep, focus, hydration. Quick tips cost just 1 credit.</p>
        </div>
        <a href="/coach" className="btn-primary text-sm" data-testid="coach-cta-btn">Open coach</a>
      </section>
    </Layout>
  );
}

function SectionHead({ title, sub }) {
  return (
    <div>
      <div className="font-serif text-xl text-forest-900">{title}</div>
      {sub && <div className="text-sm text-stone-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function WaterRing({ pct, totalMl }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative w-[140px] h-[140px]" data-testid="water-ring">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} stroke="#F4F1EC" strokeWidth="10" fill="none" />
        <circle cx="60" cy="60" r={r} stroke="#8E9E90" strokeWidth="10" fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease-out" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-serif text-3xl text-forest-900">{totalMl}</div>
        <div className="text-xs uppercase tracking-widest text-stone-500">ml</div>
      </div>
    </div>
  );
}

function greetingFor(d) {
  const h = d.getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Quiet night";
}
