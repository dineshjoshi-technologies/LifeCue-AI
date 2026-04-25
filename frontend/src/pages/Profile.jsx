import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { LogOut, Download, Trash2, Apple, Watch, Shield } from "lucide-react";
import toast from "react-hot-toast";

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [waterGoal, setWaterGoal] = useState(user?.water_goal_ml || 2500);
  const [quietStart, setQuietStart] = useState(user?.quiet_hours_start || "22:00");
  const [quietEnd, setQuietEnd] = useState(user?.quiet_hours_end || "07:00");
  const [voice, setVoice] = useState(!!user?.voice_reminders_enabled);
  const [apple, setApple] = useState(!!user?.health_apple);
  const [google, setGoogle] = useState(!!user?.health_google);

  const save = async () => {
    await api.patch("/settings", {
      water_goal_ml: Number(waterGoal),
      quiet_hours_start: quietStart,
      quiet_hours_end: quietEnd,
      voice_reminders_enabled: voice,
      health_apple: apple,
      health_google: google,
    });
    await refresh();
    toast.success("Saved");
  };

  const exportData = async () => {
    const { data } = await api.get("/privacy/export");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lifecue-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteAccount = async () => {
    if (!window.confirm("This will delete your account and all data. Continue?")) return;
    await api.delete("/privacy/account");
    toast.success("Account deleted.");
    await logout();
    navigate("/");
  };

  return (
    <Layout>
      <div className="animate-slide-up mb-8">
        <div className="text-xs uppercase tracking-widest text-stone-500">You</div>
        <h1 className="font-serif text-4xl text-forest-900 mt-1" data-testid="profile-title">{user?.name}</h1>
        <p className="text-stone-500 mt-2">{user?.email} · plan: <span className="text-forest-800 font-medium">{user?.plan}</span></p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="card-soft p-7" data-testid="settings-section">
          <h2 className="font-serif text-xl text-forest-900">Daily preferences</h2>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-stone-500">Water goal (ml)</span>
              <input type="number" value={waterGoal} onChange={(e) => setWaterGoal(e.target.value)}
                className="input-soft mt-1" data-testid="settings-water-goal" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-stone-500">Quiet from</span>
                <input type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)}
                  className="input-soft mt-1" data-testid="settings-quiet-start" />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-stone-500">Quiet until</span>
                <input type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)}
                  className="input-soft mt-1" data-testid="settings-quiet-end" />
              </label>
            </div>
            <Toggle label="Voice-style smart reminders" sub="Plays a soft spoken cue (browser only)" value={voice} onChange={setVoice} testid="toggle-voice" />
          </div>
          <button onClick={save} className="btn-primary mt-6" data-testid="settings-save-btn">Save preferences</button>
        </section>

        <section className="card-soft p-7" data-testid="health-section">
          <h2 className="font-serif text-xl text-forest-900">Health integrations</h2>
          <p className="text-stone-500 text-sm mt-1">Connect to read steps & sleep. (Demo mode — actual device sync requires native app.)</p>
          <div className="mt-5 space-y-3">
            <Toggle
              label="Apple HealthKit"
              icon={<Apple size={16} strokeWidth={1.5} />}
              value={apple} onChange={setApple} testid="toggle-apple"
            />
            <Toggle
              label="Google Health Connect"
              icon={<Watch size={16} strokeWidth={1.5} />}
              value={google} onChange={setGoogle} testid="toggle-google"
            />
          </div>
          <p className="mt-5 text-xs text-stone-500 flex items-start gap-2">
            <Shield size={14} strokeWidth={1.5} className="mt-0.5" />
            We never sell your health data. Read-only, on-device when possible.
          </p>
        </section>

        <section className="card-soft p-7 md:col-span-2" data-testid="privacy-section">
          <h2 className="font-serif text-xl text-forest-900">Privacy & data</h2>
          <p className="text-stone-500 text-sm mt-1">You own your data. Take it or delete it any time.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={exportData} className="btn-secondary" data-testid="export-btn">
              <Download size={14} strokeWidth={1.5} /> Export my data
            </button>
            <button onClick={() => { logout(); navigate("/"); }} className="btn-secondary" data-testid="logout-btn">
              <LogOut size={14} strokeWidth={1.5} /> Sign out
            </button>
            <button onClick={deleteAccount} className="btn-ghost text-terracotta-400" data-testid="delete-account-btn">
              <Trash2 size={14} strokeWidth={1.5} /> Delete account
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
}

function Toggle({ label, sub, value, onChange, icon, testid }) {
  return (
    <button onClick={() => onChange(!value)} data-testid={testid}
      className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl border border-stone-200 hover:bg-stone-50 transition-all text-left">
      <div className="flex items-center gap-3 min-w-0">
        {icon && <div className="w-9 h-9 rounded-xl bg-sand-100 flex items-center justify-center text-forest-700">{icon}</div>}
        <div className="min-w-0">
          <div className="font-medium text-forest-900 truncate">{label}</div>
          {sub && <div className="text-xs text-stone-500 truncate">{sub}</div>}
        </div>
      </div>
      <div className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-forest-700" : "bg-stone-200"}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : ""}`} />
      </div>
    </button>
  );
}
