import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../lib/api";
import { Check, Flame } from "lucide-react";
import { pickIcon } from "./Onboarding";

export default function Habits() {
  const [data, setData] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState([]);

  const load = async () => {
    const [t, c] = await Promise.all([api.get("/habits/today"), api.get("/habits/catalog")]);
    setData(t.data);
    setCatalog(c.data);
    setSelected(t.data.selected);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (key, completed) => {
    const { data } = await api.post("/habits/toggle", { habit_key: key, completed });
    setData(data);
  };

  const saveSelection = async () => {
    await api.patch("/settings", {});
    // reuse onboarding endpoint via direct setting field — we'll just call onboarding for simplicity
    await api.post("/onboarding", {
      water_goal_ml: 2500, // not changing here
      selected_habits: selected,
      quiet_hours_start: "22:00",
      quiet_hours_end: "07:00",
    });
    setEditing(false);
    load();
  };

  const toggleSelect = (key) => {
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  };

  return (
    <Layout>
      <div className="flex items-end justify-between mb-8 animate-slide-up">
        <div>
          <div className="text-xs uppercase tracking-widest text-stone-500">Today</div>
          <h1 className="font-serif text-4xl text-forest-900 mt-1" data-testid="habits-title">Your habits</h1>
        </div>
        <button onClick={() => setEditing((e) => !e)} className="btn-secondary" data-testid="habits-edit-btn">
          {editing ? "Done" : "Edit list"}
        </button>
      </div>

      {!editing && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {(data?.catalog || []).map((h) => {
            const Icon = pickIcon(h.icon);
            const done = !!data?.today?.[h.key];
            const streak = data?.streaks?.[h.key] || 0;
            return (
              <div key={h.key} data-testid={`habits-card-${h.key}`}
                className={`p-6 rounded-3xl border transition-all ${done ? "bg-sage-100 border-transparent" : "bg-white border-stone-200"}`}>
                <div className="flex items-center justify-between">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${done ? "bg-white" : "bg-stone-50"}`}>
                    <Icon size={20} strokeWidth={1.5} className="text-forest-700" />
                  </div>
                  {streak > 0 && (
                    <span className="pill bg-sand-100 text-forest-800" data-testid={`habits-streak-${h.key}`}>
                      <Flame size={11} strokeWidth={1.5} /> {streak}-day flow
                    </span>
                  )}
                </div>
                <div className="font-serif text-xl text-forest-900 mt-3">{h.label}</div>
                <div className="text-sm text-stone-500 mt-1">target: {h.target} {h.unit}</div>
                <button onClick={() => toggle(h.key, !done)}
                  data-testid={`habits-toggle-${h.key}`}
                  className={`mt-4 w-full py-2.5 rounded-full font-medium transition-all ${
                    done ? "bg-forest-700 text-paper" : "bg-stone-100 text-forest-900 hover:bg-stone-200"
                  }`}>
                  {done ? <span className="flex items-center justify-center gap-2"><Check size={14} strokeWidth={2} /> Logged</span> : "Mark done"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="card-soft p-7" data-testid="habits-editor">
          <h2 className="font-serif text-xl text-forest-900">Choose what to track</h2>
          <p className="text-stone-500 text-sm mt-1">Light list, easy day.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
            {catalog.map((h) => {
              const Icon = pickIcon(h.icon);
              const on = selected.includes(h.key);
              return (
                <button key={h.key} onClick={() => toggleSelect(h.key)}
                  data-testid={`habits-edit-${h.key}`}
                  className={`text-left p-4 rounded-2xl border transition-all ${on ? "bg-sage-100 border-sage-200" : "bg-white border-stone-200"}`}>
                  <Icon size={18} strokeWidth={1.5} className={on ? "text-forest-700" : "text-stone-500"} />
                  <div className="mt-2 font-medium text-forest-900 text-sm">{h.label}</div>
                </button>
              );
            })}
          </div>
          <button onClick={saveSelection} className="btn-primary mt-6" data-testid="habits-save-btn">Save selection</button>
        </div>
      )}
    </Layout>
  );
}
