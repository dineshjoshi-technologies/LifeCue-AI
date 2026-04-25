import React, { useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import { api, formatErr } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Send, Sparkles, Zap, Brain, Heart } from "lucide-react";
import toast from "react-hot-toast";

const TIERS = [
  { id: "quick", label: "Quick Tip", credits: 1, icon: Zap, hint: "Fast helpful answer" },
  { id: "daily", label: "Daily Plan", credits: 3, icon: Sparkles, hint: "Today's gentle plan" },
  { id: "deep", label: "Deep Coaching", credits: 10, icon: Brain, hint: "Weekly review & advice" },
];

export default function Coach() {
  const { user, refresh } = useAuth();
  const [tier, setTier] = useState("quick");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const scroller = useRef(null);

  useEffect(() => {
    api.get("/coach/history").then(({ data }) => {
      setMessages(data.messages || []);
      const last = data.messages?.[data.messages.length - 1];
      if (last?.session_id) setSessionId(last.session_id);
    });
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async (e) => {
    e?.preventDefault();
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text, tier, created_at: new Date().toISOString() }]);
    setBusy(true);
    try {
      const { data } = await api.post("/coach/chat", { message: text, tier, session_id: sessionId });
      setSessionId(data.session_id);
      setMessages((m) => [...m, { role: "assistant", text: data.reply, tier, model: data.model, created_at: new Date().toISOString() }]);
      await refresh();
    } catch (e) {
      const msg = formatErr(e.response?.data?.detail) || e.message;
      toast.error(msg);
      setMessages((m) => [...m, { role: "assistant", text: "I'm taking a quiet breath — please try again in a moment.", tier, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout
      header={
        <div className="hidden sm:flex items-center gap-2 pill bg-sand-100 text-forest-800" data-testid="credits-display">
          <Sparkles size={12} strokeWidth={1.5} /> {user?.ai_credits || 0} credits
        </div>
      }
    >
      <div className="mb-6 animate-slide-up">
        <div className="text-xs uppercase tracking-widest text-stone-500">Coach</div>
        <h1 className="font-serif text-4xl text-forest-900 mt-1" data-testid="coach-title">A calm second opinion.</h1>
        <p className="text-stone-500 mt-2">Wellness only — not medical advice. If something feels urgent, please see a clinician.</p>
      </div>

      {/* Tier toggle */}
      <div className="grid sm:grid-cols-3 gap-3 mb-6" data-testid="coach-tiers">
        {TIERS.map((t) => {
          const Icon = t.icon;
          const active = tier === t.id;
          return (
            <button key={t.id} onClick={() => setTier(t.id)}
              data-testid={`coach-tier-${t.id}`}
              className={`text-left p-4 rounded-2xl border transition-all ${
                active ? "bg-forest-700 text-paper border-forest-700" : "bg-white border-stone-200 hover:border-stone-300"
              }`}>
              <div className="flex items-center justify-between">
                <Icon size={18} strokeWidth={1.5} />
                <span className={`text-xs ${active ? "opacity-80" : "text-stone-500"}`}>{t.credits} cr</span>
              </div>
              <div className={`font-serif text-lg mt-3 ${active ? "" : "text-forest-900"}`}>{t.label}</div>
              <div className={`text-xs mt-1 ${active ? "opacity-80" : "text-stone-500"}`}>{t.hint}</div>
            </button>
          );
        })}
      </div>

      {/* Chat area */}
      <div className="card-soft p-0 overflow-hidden flex flex-col h-[60vh] min-h-[420px]">
        <div ref={scroller} className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="coach-messages">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-stone-500 px-6">
              <Heart size={20} strokeWidth={1.5} className="text-terracotta-300 mb-3" />
              <div className="font-serif text-xl text-forest-900">Ask anything small.</div>
              <div className="text-sm mt-2 max-w-sm">Try: "How do I drink more water at work?" or "Plan a calm Sunday for me."</div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div data-testid={`coach-msg-${m.role}-${i}`}
                className={`max-w-[80%] rounded-3xl px-5 py-3 leading-relaxed ${
                  m.role === "user"
                    ? "bg-forest-700 text-paper rounded-br-md"
                    : "bg-sand-100 text-stone-800 rounded-bl-md font-serif"
                }`}>
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-3xl px-5 py-3 bg-sand-100 text-stone-500 italic font-serif animate-pulse-soft" data-testid="coach-typing">
                thinking gently…
              </div>
            </div>
          )}
        </div>
        <form onSubmit={send} className="border-t border-stone-200/60 p-4 flex items-center gap-3" data-testid="coach-form">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Type a small question…"
            className="input-soft" data-testid="coach-input" />
          <button type="submit" disabled={busy || !input.trim()} className="btn-primary disabled:opacity-50" data-testid="coach-send-btn">
            <Send size={16} strokeWidth={1.5} />
          </button>
        </form>
      </div>

      <p className="mt-4 text-xs text-stone-500" data-testid="coach-disclaimer">
        LifeCue Coach is for general wellness only. It is not a doctor, does not diagnose, and is not for emergencies. If you feel unsafe, call your local emergency line.
      </p>
    </Layout>
  );
}
