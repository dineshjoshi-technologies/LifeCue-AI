import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api, formatErr } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Check, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

export default function Subscription() {
  const { user, refresh } = useAuth();
  const [plans, setPlans] = useState([]);
  const [keyId, setKeyId] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    api.get("/billing/plans").then(({ data }) => {
      setPlans(data.plans);
      setKeyId(data.razorpay_key_id);
    });
  }, []);

  const startCheckout = async (planId) => {
    if (planId === "free") return;
    setBusy(planId);
    try {
      const { data: order } = await api.post("/billing/order", { plan: planId });
      const opts = {
        key: keyId || order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "LifeCue AI",
        description: planId === "monthly" ? "LifeCue Monthly" : "LifeCue Yearly",
        order_id: order.order_id,
        prefill: { name: user?.name || "", email: user?.email || "" },
        theme: { color: "#2C4A3B" },
        handler: async (resp) => {
          try {
            const { data } = await api.post("/billing/verify", {
              razorpay_order_id: resp.razorpay_order_id || order.order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              plan: planId,
            });
            toast.success("Welcome to " + (planId === "monthly" ? "Monthly" : "Yearly"));
            await refresh();
          } catch (e) {
            toast.error(formatErr(e.response?.data?.detail) || "Verification failed");
          } finally {
            setBusy("");
          }
        },
        modal: {
          ondismiss: () => setBusy(""),
        },
      };

      // If running with mock order (placeholder secret), simulate success directly.
      if (order.order_id.startsWith("order_mock_") || !window.Razorpay) {
        try {
          const { data } = await api.post("/billing/verify", {
            razorpay_order_id: order.order_id,
            razorpay_payment_id: `pay_mock_${Date.now()}`,
            razorpay_signature: "mock_signature",
            plan: planId,
          });
          toast.success("Plan activated (test mode)");
          await refresh();
        } catch (e) {
          toast.error(formatErr(e.response?.data?.detail) || "Verification failed");
        } finally {
          setBusy("");
        }
        return;
      }

      const rzp = new window.Razorpay(opts);
      rzp.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
        setBusy("");
      });
      rzp.open();
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
      setBusy("");
    }
  };

  const currentPlan = user?.plan || "free";

  return (
    <Layout
      header={
        <div className="hidden sm:flex items-center gap-2 pill bg-sand-100 text-forest-800" data-testid="credits-pill">
          <Sparkles size={12} strokeWidth={1.5} /> {user?.ai_credits || 0} credits
        </div>
      }
    >
      <div className="animate-slide-up mb-8">
        <div className="text-xs uppercase tracking-widest text-stone-500">Plans</div>
        <h1 className="font-serif text-4xl text-forest-900 mt-1" data-testid="plans-title">Two prices. Many small wins.</h1>
        <p className="text-stone-500 mt-2">Currency shown in INR (Razorpay test). Approx USD pricing — $3/mo or $27/yr.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((p) => {
          const isCurrent = currentPlan === p.id;
          const highlight = p.id === "yearly";
          return (
            <div key={p.id} data-testid={`plan-card-${p.id}`}
              className={`p-7 rounded-[28px] border transition-all ${
                highlight ? "bg-forest-700 text-paper border-forest-700" : "bg-white border-stone-200"
              }`}>
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest opacity-80">{p.label}</div>
                {p.id === "yearly" && (
                  <span className="pill bg-sand-300 text-forest-900">Save 25%</span>
                )}
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-serif text-5xl">${p.price_usd}</span>
                <span className="text-sm opacity-70">{p.id === "monthly" ? "/mo" : p.id === "yearly" ? "/yr" : ""}</span>
              </div>
              <div className={`text-xs mt-1 ${highlight ? "opacity-70" : "text-stone-500"}`}>
                {p.price_inr > 0 ? `≈ ₹${(p.price_inr / 100).toFixed(0)} INR` : "Free forever"}
              </div>
              <ul className="mt-6 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className={`flex items-start gap-2 text-sm ${highlight ? "opacity-90" : "text-stone-600"}`}>
                    <Check size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <div className={`w-full py-3 rounded-full text-center ${highlight ? "bg-paper/10" : "bg-sage-100 text-forest-800"}`}
                    data-testid={`plan-current-${p.id}`}>
                    Current plan
                  </div>
                ) : p.id === "free" ? (
                  <div className={`w-full py-3 rounded-full text-center ${highlight ? "bg-paper/10" : "bg-stone-100 text-stone-500"}`}>
                    Default
                  </div>
                ) : (
                  <button onClick={() => startCheckout(p.id)} disabled={busy === p.id}
                    data-testid={`plan-buy-${p.id}-btn`}
                    className={`w-full py-3 rounded-full font-medium transition-all ${
                      highlight ? "bg-paper text-forest-900 hover:bg-sand-100" : "bg-forest-700 text-paper hover:bg-forest-800"
                    } disabled:opacity-50`}>
                    {busy === p.id ? "Opening checkout…" : "Choose " + p.label}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 card-soft p-7" data-testid="plan-faq">
        <h2 className="font-serif text-2xl text-forest-900">Why credits?</h2>
        <p className="text-stone-600 mt-2 leading-relaxed">
          The Coach uses different AI models behind the scenes. Quick Tips run on a small fast model (1 credit), Daily Plans on a mid-tier model (3 credits), and Deep Coaching uses a premium model (10 credits). This keeps the app calm, fast, and fair to your wallet.
        </p>
      </div>
    </Layout>
  );
}
