import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Heart, Droplet, Moon, Wind, Sparkles, Check, Leaf, BookOpen,
  Footprints, Bell, Shield, Brain, Zap, Activity, Star, ChevronDown,
  Clock, Smile, BadgeIndianRupee, Volume2, Apple, Watch
} from "lucide-react";

/* ---------- Tiny intersection-observer hook for scroll reveals ---------- */
function useReveal(once = true) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          setShown(true);
          if (once) io.unobserve(el);
        } else if (!once) {
          setShown(false);
        }
      }),
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);
  return [ref, shown];
}

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, shown] = useReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
      className={`${className} transition-all duration-700 ease-out ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
    >
      {children}
    </div>
  );
}

/* ---------- Sections ---------- */
export default function Landing() {
  return (
    <div className="min-h-screen bg-paper grain text-stone-800 overflow-x-hidden">
      <Nav />
      <Hero />
      <TrustBand />
      <HowItWorks />
      <LiveTodayPreview />
      <Features />
      <CoachShowcase />
      <Pricing />
      <Testimonials />
      <PrivacyPromise />
      <FAQ />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ---------- Nav ---------- */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`sticky top-0 z-50 transition-all ${scrolled ? "backdrop-blur-xl bg-paper/85 border-b border-stone-200/60" : "bg-transparent"}`}>
      <div className="max-w-6xl mx-auto px-5 sm:px-10 py-4 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5" data-testid="brand-mark">
          <span className="w-9 h-9 rounded-full bg-forest-700 flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-sand-300" />
          </span>
          <span className="font-serif text-2xl text-forest-900 tracking-tight">LifeCue</span>
        </a>
        <nav className="hidden md:flex items-center gap-7 text-sm text-stone-600">
          <a href="#how" className="hover:text-forest-800 transition-colors" data-testid="nav-how">How it works</a>
          <a href="#features" className="hover:text-forest-800 transition-colors" data-testid="nav-features">Features</a>
          <a href="#coach" className="hover:text-forest-800 transition-colors" data-testid="nav-ai">AI Coach</a>
          <a href="#pricing" className="hover:text-forest-800 transition-colors" data-testid="nav-pricing">Pricing</a>
          <a href="#faq" className="hover:text-forest-800 transition-colors" data-testid="nav-faq">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="btn-ghost text-sm" data-testid="nav-login-btn">Sign in</Link>
          <Link to="/signup" className="btn-primary text-sm" data-testid="nav-signup-btn">Begin free</Link>
        </div>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section id="top" className="relative">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-20 w-[420px] h-[420px] rounded-full bg-sand-200/40 blur-3xl animate-pulse-soft" />
        <div className="absolute top-40 -right-32 w-[520px] h-[520px] rounded-full bg-sage-100/50 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 sm:px-10 pt-14 sm:pt-24 pb-24">
        <div className="grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-7">
            <Reveal>
              <span className="pill bg-sand-100 text-forest-800" data-testid="hero-pill">
                <span className="w-1.5 h-1.5 rounded-full bg-terracotta-300" /> a quieter way to feel well
              </span>
            </Reveal>
            <Reveal delay={120}>
              <h1 className="mt-6 font-serif text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-forest-900" data-testid="hero-title">
                Small cues.<br />
                <em className="text-terracotta-300 font-light">Steady you.</em>
              </h1>
            </Reveal>
            <Reveal delay={220}>
              <p className="mt-6 text-lg text-stone-600 max-w-xl leading-relaxed">
                LifeCue is a calm daily companion for water, rest, breathing, and the small habits that hold a day together. Smart reminders. AI coaching. Streaks worded as flow — never guilt.
              </p>
            </Reveal>
            <Reveal delay={320}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/signup" className="btn-primary" data-testid="hero-cta-begin">
                  Begin free in 60 seconds <ArrowRight size={16} strokeWidth={1.5} />
                </Link>
                <a href="#pricing" className="btn-secondary" data-testid="hero-cta-pricing">
                  See pricing
                </a>
              </div>
            </Reveal>
            <Reveal delay={420}>
              <div className="mt-10 grid grid-cols-3 gap-4 max-w-md text-sm text-stone-500">
                <Bullet icon={Heart} text="Privacy first" />
                <Bullet icon={Sparkles} text="AI coach" />
                <Bullet icon={BadgeIndianRupee} text="From ₹270/mo" />
              </div>
            </Reveal>
          </div>

          <Reveal delay={250} className="md:col-span-5">
            <div className="relative">
              <div className="aspect-[4/5] rounded-[32px] overflow-hidden bg-elevated relative shadow-sm">
                <img
                  src="https://images.pexels.com/photos/6660770/pexels-photo-6660770.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=720"
                  alt="A quiet morning stretch"
                  className="w-full h-full object-cover"
                  data-testid="hero-image"
                />
                <div className="absolute bottom-5 left-5 right-5 card-soft p-4 backdrop-blur-md bg-white/90 animate-slide-up">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-sage-100 flex items-center justify-center">
                      <Droplet size={18} className="text-sage-500" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-stone-500">a gentle sip</div>
                      <div className="font-serif text-forest-900">+250ml feels good now</div>
                    </div>
                    <div className="ml-auto text-xs text-stone-400">9:42</div>
                  </div>
                </div>
              </div>
              <div className="absolute -left-6 -top-8 hidden lg:block card-soft p-4 w-56 animate-slide-up" style={{ animationDelay: "300ms" }}>
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-stone-500"><Sparkles size={12} strokeWidth={1.5} /> AI Coach</div>
                <div className="font-serif text-forest-900 mt-1 text-sm leading-snug">"A 4-min walk after lunch helps your focus."</div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Bullet({ icon: Icon, text }) {
  return (
    <span className="flex items-center gap-2"><Icon size={14} strokeWidth={1.5} /> {text}</span>
  );
}

/* ---------- Trust Band ---------- */
function TrustBand() {
  const items = [
    { n: "14", l: "habits tracked" },
    { n: "3", l: "AI tiers, fair credits" },
    { n: "<60s", l: "to onboard" },
    { n: "100%", l: "privacy-first" },
  ];
  return (
    <section className="border-y border-stone-200/60 bg-elevated/40">
      <div className="max-w-6xl mx-auto px-5 sm:px-10 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {items.map((i) => (
          <Reveal key={i.l}>
            <div data-testid={`trust-${i.l.replace(/\s+/g, '-')}`}>
              <div className="font-serif text-3xl text-forest-900">{i.n}</div>
              <div className="text-xs uppercase tracking-widest text-stone-500 mt-1">{i.l}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */
function HowItWorks() {
  const steps = [
    { n: 1, icon: Smile, title: "Pick a few habits", body: "Water, sleep, focus, breathing — choose what matters this week.", color: "bg-sand-100" },
    { n: 2, icon: Bell, title: "Get gentle cues", body: "One-tap Done, Snooze, or Skip. Quiet hours respected. No guilt.", color: "bg-sage-100" },
    { n: 3, icon: Brain, title: "Ask your AI coach", body: "Quick tips, daily plans, or deep weekly coaching — credit-based, never spammy.", color: "bg-terracotta-50" },
  ];
  return (
    <section id="how" className="max-w-6xl mx-auto px-5 sm:px-10 py-24">
      <Reveal>
        <div className="max-w-2xl">
          <span className="pill bg-stone-100 text-stone-600">How it works</span>
          <h2 className="mt-5 font-serif text-4xl sm:text-5xl text-forest-900 tracking-tight">Three quiet steps to a steadier day.</h2>
        </div>
      </Reveal>
      <div className="grid sm:grid-cols-3 gap-5 mt-12">
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 120}>
            <div className="card-soft p-7 h-full" data-testid={`how-step-${s.n}`}>
              <div className={`w-12 h-12 rounded-2xl ${s.color} flex items-center justify-center`}>
                <s.icon size={20} strokeWidth={1.5} className="text-forest-700" />
              </div>
              <div className="mt-5 text-xs uppercase tracking-widest text-stone-500">Step {s.n}</div>
              <h3 className="mt-1 font-serif text-2xl text-forest-900">{s.title}</h3>
              <p className="text-stone-600 mt-3 leading-relaxed">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Live Today Preview ---------- */
function LiveTodayPreview() {
  return (
    <section className="bg-forest-900 text-paper">
      <div className="max-w-6xl mx-auto px-5 sm:px-10 py-24 grid md:grid-cols-2 gap-12 items-center">
        <Reveal>
          <span className="pill bg-paper/10 text-sand-200">A peek at Today</span>
          <h2 className="mt-5 font-serif text-4xl sm:text-5xl tracking-tight">Only what matters today.</h2>
          <p className="mt-5 text-paper/70 leading-relaxed text-lg">
            No charts. No streak shame. A water ring, a few habit tiles, and one or two gentle cues. That's it. Open the app, breathe, log, close.
          </p>
          <ul className="mt-7 space-y-3 text-paper/85">
            <Tick text="One-tap +250 / +500 / +750 ml" />
            <Tick text="Smart cues: Done · Snooze · Skip" />
            <Tick text="Streaks worded as “flow”, never “don't break it”" />
            <Tick text="Optional voice cue (free, browser-based)" />
          </ul>
        </Reveal>
        <Reveal delay={150}>
          <div className="relative">
            <div className="aspect-[9/16] max-w-sm mx-auto rounded-[36px] bg-paper/5 border border-paper/10 p-5 backdrop-blur-md">
              <div className="text-xs uppercase tracking-widest text-paper/50">Friday, April 25</div>
              <div className="font-serif text-3xl mt-1">Good morning, Asha.</div>
              <div className="mt-7 flex items-center gap-5">
                <RingMock />
                <div className="space-y-2 flex-1">
                  <FakeBtn label="+250 ml" />
                  <FakeBtn label="+500 ml" />
                  <FakeBtn label="+750 ml" />
                </div>
              </div>
              <div className="mt-7 grid grid-cols-3 gap-3">
                {[
                  { i: Footprints, l: "Steps" },
                  { i: Moon, l: "Sleep" },
                  { i: Wind, l: "Breathing" },
                  { i: Leaf, l: "Meditate" },
                  { i: BookOpen, l: "Read" },
                  { i: Activity, l: "Stretch" },
                ].map((h, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-paper/5 border border-paper/10 text-center">
                    <h.i size={16} strokeWidth={1.5} className="text-sand-200 mx-auto" />
                    <div className="text-[11px] mt-2 text-paper/80">{h.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Tick({ text }) {
  return <li className="flex items-start gap-3"><Check size={16} strokeWidth={2} className="mt-1 text-sand-200" /> <span>{text}</span></li>;
}

function RingMock() {
  return (
    <div className="relative w-[120px] h-[120px]">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r="52" stroke="rgba(251,249,246,0.1)" strokeWidth="10" fill="none" />
        <circle cx="60" cy="60" r="52" stroke="#DBCFB0" strokeWidth="10" fill="none"
          strokeDasharray="326" strokeDashoffset="120" strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-serif text-3xl">1500</div>
        <div className="text-[10px] uppercase tracking-widest text-paper/60">ml · 60%</div>
      </div>
    </div>
  );
}

function FakeBtn({ label }) {
  return <div className="rounded-full bg-paper/10 border border-paper/15 px-4 py-2 text-sm text-paper/90">{label}</div>;
}

/* ---------- Features ---------- */
function Features() {
  const list = [
    { icon: Droplet, t: "Hydration that nudges", b: "Daily water ring with one-tap +250/+500/+750 ml. Smart cues that respect your quiet hours." },
    { icon: Footprints, t: "14 habits, no clutter", b: "Steps, stretching, sleep, meditation, reading, breathing, focus, posture, screen breaks, journaling, medication, and more." },
    { icon: Brain, t: "AI Coach with model routing", b: "Quick Tip (1 credit), Daily Plan (3), Deep Coaching (10). Cheap models for small asks, premium for weekly review." },
    { icon: Bell, t: "Push + voice reminders", b: "Web Push (FCM) for background nudges. Optional in-browser voice — soft, calm, never robotic." },
    { icon: Watch, t: "Health integrations", b: "Toggle Apple HealthKit & Google Health Connect. Read-only, on-device when possible. (Native sync requires our mobile wrapper.)" },
    { icon: Shield, t: "Privacy-first by design", b: "Never sold. Minimum data collected. JSON export and one-click account delete — always free." },
  ];
  return (
    <section id="features" className="max-w-6xl mx-auto px-5 sm:px-10 py-24">
      <Reveal>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <span className="pill bg-stone-100 text-stone-600">Features</span>
            <h2 className="mt-5 font-serif text-4xl sm:text-5xl text-forest-900 tracking-tight">Calm by design. Capable by intent.</h2>
          </div>
          <Link to="/signup" className="btn-secondary text-sm" data-testid="features-cta">Try it free →</Link>
        </div>
      </Reveal>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
        {list.map((f, i) => (
          <Reveal key={f.t} delay={i * 80}>
            <div className="card-soft p-7 h-full hover:-translate-y-0.5 transition-transform" data-testid={`feature-card-${i}`}>
              <div className="w-11 h-11 rounded-2xl bg-sand-100 flex items-center justify-center">
                <f.icon size={20} className="text-forest-700" strokeWidth={1.5} />
              </div>
              <h3 className="mt-5 font-serif text-xl text-forest-900">{f.t}</h3>
              <p className="text-stone-600 mt-2 leading-relaxed">{f.b}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- AI Coach Showcase ---------- */
function CoachShowcase() {
  const tiers = [
    { id: "quick", icon: Zap, label: "Quick Tip", credits: 1, hint: "Fast, helpful answers", model: "Gemini 2.5 Flash" },
    { id: "daily", icon: Sparkles, label: "Daily Plan", credits: 3, hint: "Today's gentle plan", model: "GPT-5 mini" },
    { id: "deep", icon: Brain, label: "Deep Coaching", credits: 10, hint: "Weekly review & advice", model: "Claude Sonnet 4.5" },
  ];
  return (
    <section id="coach" className="max-w-6xl mx-auto px-5 sm:px-10 py-24">
      <div className="grid md:grid-cols-12 gap-10 items-center">
        <Reveal className="md:col-span-5">
          <span className="pill bg-stone-100 text-stone-600">AI Coach</span>
          <h2 className="mt-5 font-serif text-4xl sm:text-5xl text-forest-900 tracking-tight">A calm second opinion, on tap.</h2>
          <p className="mt-5 text-stone-600 leading-relaxed text-lg">
            Three tiers. Cheap models answer small questions. Premium models do your weekly review. Credits only spend when you ask — never on background work.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/signup" className="btn-primary" data-testid="coach-cta-begin">Try the coach</Link>
            <a href="#pricing" className="btn-ghost text-sm">See credit pricing</a>
          </div>
        </Reveal>

        <Reveal delay={150} className="md:col-span-7">
          <div className="card-soft p-6">
            <div className="grid sm:grid-cols-3 gap-3">
              {tiers.map((t, i) => (
                <div key={t.id} data-testid={`coach-tier-card-${t.id}`} className={`p-4 rounded-2xl border ${i === 0 ? "bg-forest-700 text-paper border-forest-700" : "bg-white border-stone-200"}`}>
                  <div className="flex items-center justify-between">
                    <t.icon size={18} strokeWidth={1.5} />
                    <span className={`text-xs ${i === 0 ? "opacity-80" : "text-stone-500"}`}>{t.credits} cr</span>
                  </div>
                  <div className={`font-serif text-lg mt-3 ${i === 0 ? "" : "text-forest-900"}`}>{t.label}</div>
                  <div className={`text-xs mt-1 ${i === 0 ? "opacity-80" : "text-stone-500"}`}>{t.hint}</div>
                  <div className={`text-[10px] mt-3 uppercase tracking-widest ${i === 0 ? "opacity-70" : "text-stone-400"}`}>{t.model}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-3">
              <Bubble role="user">"How can I drink more water during meetings?"</Bubble>
              <Bubble role="ai">"Keep a 750ml bottle on your desk; sip while listening — not while speaking. Refill at every break. Three sips before each meeting starts is a soft anchor."</Bubble>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs text-stone-500">
              <Volume2 size={12} strokeWidth={1.5} /> Optional voice replies. Wellness only — not medical advice.
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Bubble({ role, children }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-3xl px-5 py-3 leading-relaxed ${isUser ? "bg-forest-700 text-paper rounded-br-md" : "bg-sand-100 text-stone-800 rounded-bl-md font-serif"}`}>
        {children}
      </div>
    </div>
  );
}

/* ---------- Pricing ---------- */
function Pricing() {
  const plans = [
    { id: "free", label: "Free", price: 0, period: "forever", credits: "30 / month", features: ["Up to 3 habits", "Smart reminders", "Basic AI coach"], cta: "Begin free", highlight: false },
    { id: "monthly", label: "Monthly", price: 270, period: "/month", credits: "600 / month", features: ["All 14 habits", "Push + voice reminders", "Daily Plan tier coaching", "Privacy export"], cta: "Choose Monthly", highlight: false },
    { id: "yearly", label: "Yearly", price: 2430, period: "/year", credits: "9000 / year", features: ["Everything in Monthly", "Deep weekly coaching", "Save 25% vs monthly", "Priority support"], cta: "Choose Yearly", highlight: true },
  ];
  return (
    <section id="pricing" className="bg-elevated/50 border-y border-stone-200/60">
      <div className="max-w-6xl mx-auto px-5 sm:px-10 py-24">
        <Reveal>
          <div className="max-w-2xl">
            <span className="pill bg-stone-100 text-stone-600">Pricing</span>
            <h2 className="mt-5 font-serif text-4xl sm:text-5xl text-forest-900 tracking-tight">Two prices. Many small wins.</h2>
            <p className="mt-4 text-stone-600 leading-relaxed">All prices in INR. Billed securely via Razorpay. Cancel anytime — your data stays yours.</p>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {plans.map((p, i) => (
            <Reveal key={p.id} delay={i * 100}>
              <div data-testid={`landing-plan-${p.id}`} className={`p-7 rounded-[28px] border h-full transition-all hover:-translate-y-1 ${p.highlight ? "bg-forest-700 text-paper border-forest-700 shadow-xl" : "bg-white border-stone-200"}`}>
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-widest opacity-80">{p.label}</div>
                  {p.highlight && <span className="pill bg-sand-300 text-forest-900">Save 25%</span>}
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-serif text-5xl">₹{p.price}</span>
                  <span className="text-sm opacity-70">{p.period}</span>
                </div>
                <div className={`text-xs mt-2 ${p.highlight ? "opacity-70" : "text-stone-500"}`}>{p.credits} AI credits</div>
                <ul className="mt-6 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${p.highlight ? "opacity-90" : "text-stone-600"}`}>
                      <Check size={14} strokeWidth={2} className="mt-0.5 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" data-testid={`landing-plan-cta-${p.id}`} className={`mt-7 w-full block text-center py-3 rounded-full font-medium transition-all ${
                  p.highlight ? "bg-paper text-forest-900 hover:bg-sand-100" : "bg-forest-700 text-paper hover:bg-forest-800"
                }`}>
                  {p.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={300}>
          <div className="mt-10 text-center text-sm text-stone-500">
            7-day no-questions refunds · Razorpay secure checkout · GST-inclusive
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Testimonials ---------- */
function Testimonials() {
  const list = [
    { name: "Asha K.", role: "Designer · Bengaluru", q: "I deleted three habit apps the week I found LifeCue. It's the first one I actually open without dread.", rating: 5 },
    { name: "Rohan M.", role: "Founder · Mumbai", q: "The Daily Plan tier nailed my afternoon energy crash in two days. Worth ₹270 for that alone.", rating: 5 },
    { name: "Priya S.", role: "Doctor · Pune", q: "The wellness disclaimer is honest, the coaching is gentle, and the privacy stance is real. I recommend it to my patients.", rating: 5 },
  ];
  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-10 py-24">
      <Reveal>
        <div className="max-w-2xl">
          <span className="pill bg-stone-100 text-stone-600">Loved by quiet humans</span>
          <h2 className="mt-5 font-serif text-4xl sm:text-5xl text-forest-900 tracking-tight">Less guilt. More flow.</h2>
        </div>
      </Reveal>
      <div className="grid md:grid-cols-3 gap-5 mt-12">
        {list.map((t, i) => (
          <Reveal key={t.name} delay={i * 100}>
            <div className="card-soft p-7 h-full" data-testid={`testimonial-${i}`}>
              <div className="flex items-center gap-1 text-terracotta-300">
                {Array.from({ length: t.rating }).map((_, k) => <Star key={k} size={14} fill="currentColor" strokeWidth={0} />)}
              </div>
              <blockquote className="mt-4 font-serif text-xl text-forest-900 leading-snug">"{t.q}"</blockquote>
              <div className="mt-5 text-sm">
                <div className="font-medium text-forest-900">{t.name}</div>
                <div className="text-stone-500">{t.role}</div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Privacy Promise ---------- */
function PrivacyPromise() {
  return (
    <section className="bg-sand-50 border-y border-stone-200/60">
      <div className="max-w-6xl mx-auto px-5 sm:px-10 py-20 grid md:grid-cols-2 gap-12 items-center">
        <Reveal>
          <span className="pill bg-white text-stone-600">Privacy promise</span>
          <h2 className="mt-5 font-serif text-4xl sm:text-5xl text-forest-900 tracking-tight">Your data stays yours.</h2>
          <p className="mt-5 text-stone-600 text-lg leading-relaxed">
            We collect the minimum needed for the app to feel useful. We never sell health data. Export everything as JSON or delete your account in one click. Encrypted in transit and at rest. Wellness only — not a medical diagnosis tool.
          </p>
        </Reveal>
        <Reveal delay={150}>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Shield, t: "Never sold" },
              { icon: Heart, t: "Minimum collected" },
              { icon: Clock, t: "Quiet hours respected" },
              { icon: Apple, t: "Read-only on device" },
            ].map((p) => (
              <div key={p.t} className="card-soft p-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center">
                  <p.icon size={18} strokeWidth={1.5} className="text-forest-700" />
                </div>
                <div className="font-medium text-forest-900">{p.t}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */
function FAQ() {
  const items = [
    { q: "Is LifeCue AI a medical app?", a: "No. LifeCue is a wellness companion. It does not diagnose, treat, or replace medical advice. For symptoms or emergencies, please consult a clinician." },
    { q: "How much does LifeCue cost?", a: "Free to start. Premium is ₹270/month or ₹2430/year (save 25%). Billed securely via Razorpay." },
    { q: "What does the AI coach do?", a: "Short, specific guidance for daily habits — hydration, sleep, focus, breathing. Three tiers: Quick Tip (1 cr), Daily Plan (3 cr), Deep Coaching (10 cr)." },
    { q: "Will my data be sold?", a: "Never. LifeCue is privacy-first by design. Export everything as JSON, or delete your account, in a single click." },
    { q: "Does it work on iPhone & Android?", a: "Yes — install LifeCue as a Progressive Web App from your browser menu. Smart reminders, offline access, full-screen experience." },
    { q: "Can I connect Apple Health or Google Health Connect?", a: "Toggle the integrations in Profile. Real device sync requires our native wrapper (coming soon); the in-app habit logging works today." },
    { q: "How are AI credits calculated?", a: "Each tier costs different credits per message — Quick=1, Daily=3, Deep=10. Free includes 30 credits/month, Monthly 600, Yearly 9000." },
    { q: "Can I cancel anytime?", a: "Yes — your subscription will not renew, and you keep access until the period ends. No questions asked." },
  ];
  const [open, setOpen] = useState(-1);
  return (
    <section id="faq" className="max-w-4xl mx-auto px-5 sm:px-10 py-24">
      <Reveal>
        <div>
          <span className="pill bg-stone-100 text-stone-600">FAQ</span>
          <h2 className="mt-5 font-serif text-4xl sm:text-5xl text-forest-900 tracking-tight">Quiet answers.</h2>
        </div>
      </Reveal>
      <div className="mt-10 divide-y divide-stone-200">
        {items.map((it, i) => (
          <Reveal key={i} delay={i * 60}>
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              data-testid={`faq-${i}`}
              className="w-full text-left py-5 flex items-start gap-4 group"
            >
              <div className="flex-1">
                <div className="font-serif text-xl text-forest-900">{it.q}</div>
                <div className={`overflow-hidden transition-all duration-500 ${open === i ? "max-h-40 opacity-100 mt-3" : "max-h-0 opacity-0"}`}>
                  <p className="text-stone-600 leading-relaxed">{it.a}</p>
                </div>
              </div>
              <ChevronDown size={18} strokeWidth={1.5} className={`mt-2 shrink-0 text-stone-400 transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Final CTA ---------- */
function FinalCta() {
  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-10 pb-20">
      <Reveal>
        <div className="card-soft p-10 sm:p-16 text-center bg-forest-700 text-paper border-forest-700 relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-sand-300/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-10 w-80 h-80 rounded-full bg-terracotta-300/10 blur-3xl" />
          <h2 className="font-serif text-4xl sm:text-5xl tracking-tight relative">A calmer day starts with a small cue.</h2>
          <p className="mt-5 text-paper/75 max-w-xl mx-auto relative">Free to begin. ₹270/mo or ₹2430/yr when you're ready. No streak guilt — ever.</p>
          <div className="mt-8 flex items-center justify-center gap-3 relative">
            <Link to="/signup" className="bg-paper text-forest-900 rounded-full px-7 py-3 font-medium hover:bg-sand-100 transition-all" data-testid="final-cta-begin">
              Begin free
            </Link>
            <Link to="/login" className="text-paper/80 underline underline-offset-4 px-3 py-3 hover:text-paper" data-testid="final-cta-signin">
              I already have an account
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  const yr = new Date().getFullYear();
  return (
    <footer className="border-t border-stone-200/60">
      <div className="max-w-6xl mx-auto px-5 sm:px-10 py-12 grid sm:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-forest-700 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-sand-300" />
            </span>
            <span className="font-serif text-xl text-forest-900">LifeCue</span>
          </div>
          <p className="mt-3 text-sm text-stone-500 max-w-xs">Gentle daily wellness — water, sleep, breathing, focus. Made for ordinary days.</p>
        </div>
        <FootCol title="Product" items={[
          { l: "How it works", h: "#how" },
          { l: "Features", h: "#features" },
          { l: "AI Coach", h: "#coach" },
          { l: "Pricing", h: "#pricing" },
        ]} />
        <FootCol title="Company" items={[
          { l: "Privacy", h: "#" },
          { l: "Terms", h: "#" },
          { l: "Contact", h: "mailto:hello@lifecue.ai" },
        ]} />
        <FootCol title="Get LifeCue" items={[
          { l: "Begin free", h: "/signup" },
          { l: "Sign in", h: "/login" },
        ]} />
      </div>
      <div className="border-t border-stone-200/60 py-6">
        <div className="max-w-6xl mx-auto px-5 sm:px-10 flex flex-wrap justify-between gap-3 text-xs text-stone-500">
          <span>© {yr} LifeCue AI · gentle by design</span>
          <span>For wellness, not medical diagnosis.</span>
        </div>
      </div>
    </footer>
  );
}

function FootCol({ title, items }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-stone-500">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-stone-600">
        {items.map((i) => <li key={i.l}><a href={i.h} className="hover:text-forest-800 transition-colors">{i.l}</a></li>)}
      </ul>
    </div>
  );
}
