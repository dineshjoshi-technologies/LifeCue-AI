import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Heart, Droplet, Moon, Wind, Sparkles } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper grain">
      {/* nav */}
      <header className="max-w-6xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5" data-testid="brand-mark">
          <span className="w-9 h-9 rounded-full bg-forest-700 flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-sand-300" />
          </span>
          <span className="font-serif text-2xl text-forest-900 tracking-tight">LifeCue</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="btn-ghost text-sm" data-testid="nav-login-btn">Sign in</Link>
          <Link to="/signup" className="btn-primary text-sm" data-testid="nav-signup-btn">Begin</Link>
        </div>
      </header>

      {/* hero */}
      <section className="max-w-6xl mx-auto px-6 sm:px-10 pt-12 sm:pt-20 pb-24">
        <div className="grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-7 animate-slide-up">
            <span className="pill bg-sand-100 text-forest-800" data-testid="hero-pill">
              <span className="w-1.5 h-1.5 rounded-full bg-terracotta-300" /> a quieter way to feel well
            </span>
            <h1 className="mt-6 font-serif text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-forest-900" data-testid="hero-title">
              Small cues.<br />
              <em className="text-terracotta-300 font-light">Steady you.</em>
            </h1>
            <p className="mt-6 text-lg text-stone-600 max-w-xl leading-relaxed">
              LifeCue is a gentle daily companion for water, rest, breathing and the small habits that hold a day together. No streak guilt. No noise. Just a calm nudge when you need it.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/signup" className="btn-primary" data-testid="hero-cta-begin">
                Begin in 60 seconds <ArrowRight size={16} strokeWidth={1.5} />
              </Link>
              <Link to="/login" className="btn-secondary" data-testid="hero-cta-signin">
                I already have an account
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-stone-500">
              <span className="flex items-center gap-2"><Heart size={14} strokeWidth={1.5} /> Privacy first</span>
              <span className="flex items-center gap-2"><Sparkles size={14} strokeWidth={1.5} /> AI coach</span>
              <span className="flex items-center gap-2">$3 / mo · $27 / yr</span>
            </div>
          </div>

          <div className="md:col-span-5 relative">
            <div className="aspect-[4/5] rounded-[32px] overflow-hidden bg-elevated relative shadow-sm">
              <img
                src="https://images.pexels.com/photos/6660770/pexels-photo-6660770.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=720"
                alt="A quiet morning stretch"
                className="w-full h-full object-cover"
                data-testid="hero-image"
              />
              <div className="absolute bottom-5 left-5 right-5 card-soft p-4 backdrop-blur-md bg-white/90">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sage-100 flex items-center justify-center">
                    <Droplet size={18} className="text-sage-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-stone-500">a gentle sip</div>
                    <div className="font-serif text-forest-900">+250ml feels good now</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* feature trio */}
      <section className="max-w-6xl mx-auto px-6 sm:px-10 pb-24">
        <h2 className="font-serif text-3xl sm:text-4xl text-forest-900 max-w-2xl">
          Built for ordinary days, not perfect ones.
        </h2>
        <div className="grid sm:grid-cols-3 gap-5 mt-10">
          {[
            { icon: Droplet, title: "Hydration that nudges, not nags", body: "One-tap +250ml. Smart reminders that respect your quiet hours.", testid: "feature-water" },
            { icon: Moon, title: "Sleep & rest, gently tracked", body: "Bedtime cues without alarms. Streaks worded as flow, never guilt.", testid: "feature-sleep" },
            { icon: Sparkles, title: "An AI coach you actually trust", body: "Three tiers — quick tip to deep weekly review. Credits, not pressure.", testid: "feature-coach" },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card-soft p-7" data-testid={f.testid}>
                <div className="w-11 h-11 rounded-2xl bg-sand-100 flex items-center justify-center mb-5">
                  <Icon size={20} className="text-forest-700" strokeWidth={1.5} />
                </div>
                <h3 className="font-serif text-xl text-forest-900 mb-2">{f.title}</h3>
                <p className="text-stone-600 leading-relaxed">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* pricing teaser */}
      <section className="max-w-6xl mx-auto px-6 sm:px-10 pb-24">
        <div className="card-soft p-10 sm:p-14 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h3 className="font-serif text-3xl sm:text-4xl text-forest-900">Two prices. Many small wins.</h3>
            <p className="mt-4 text-stone-600 text-lg leading-relaxed">
              Pay $3 a month or $27 a year. Yearly saves you 25% and gifts you 9,000 AI credits — enough for daily check-ins, plans and deeper coaching.
            </p>
            <Link to="/signup" className="btn-primary mt-7" data-testid="pricing-cta">Start free, decide later</Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <PricingCard label="Monthly" price="$3" sub="/month" tag="" testid="price-monthly" />
            <PricingCard label="Yearly" price="$27" sub="/year" tag="Save 25%" testid="price-yearly" highlight />
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 sm:px-10 pb-12 text-sm text-stone-500 flex flex-wrap gap-6 items-center justify-between">
        <span>© 2026 LifeCue AI · gentle by design</span>
        <span>For wellness, not medical diagnosis.</span>
      </footer>
    </div>
  );
}

function PricingCard({ label, price, sub, tag, highlight, testid }) {
  return (
    <div
      data-testid={testid}
      className={`p-6 rounded-3xl border ${
        highlight ? "bg-forest-700 text-paper border-forest-700" : "bg-white border-stone-200"
      }`}
    >
      <div className="text-xs uppercase tracking-widest opacity-70">{label}</div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-serif text-4xl">{price}</span>
        <span className="text-sm opacity-70">{sub}</span>
      </div>
      {tag && (
        <div className={`mt-4 inline-block text-xs px-2 py-1 rounded-full ${highlight ? "bg-paper/15" : "bg-sand-100 text-forest-800"}`}>
          {tag}
        </div>
      )}
    </div>
  );
}
