# LifeCue AI — Product Requirements Document

## Original Problem Statement
Subscription-based health & daily-habit tracking app for 2026/2027. Tracks water, walking, stretching, sleep, breathing, screen breaks, journaling, medications, focus time. Smart non-annoying reminders with one-tap Done/Snooze/Skip. AI Coach with credit-based model routing. ₹270/mo & ₹2430/yr subscription. HealthKit / Health Connect mocked. Privacy-first, simple UX, <60s onboarding.

## User Choices (cumulative)
- Mobile-responsive web app (PWA, installable).
- Emergent Universal LLM Key.
- Email/password (JWT) + Emergent Google social login.
- Razorpay LIVE keys (rzp_live_*) — APP_ENV=production.
- Voice reminders via Web Speech API (browser TTS, free, opt-in).
- Push notifications via Firebase Cloud Messaging (project `lifecueai`).
- INR-only pricing: ₹270/month, ₹2430/year (save 25%).

## Architecture
- **Backend**: FastAPI + Motor + emergentintegrations (LlmChat) + razorpay (live) + firebase-admin (FCM) + APScheduler (every-30-min cron) + bcrypt + PyJWT.
- **Frontend**: React 18 + Tailwind + lucide-react + react-router + react-hot-toast + firebase web SDK.
- **PWA**: `manifest.json` + offline-first `sw.js` (network-first nav, cache-first static), install-prompt component, 192/512/180 icons.
- **AI**: 3-tier routing — quick=`gemini-2.5-flash` (1cr), daily=`gpt-5-mini` (3cr), deep=`claude-sonnet-4-5-20250929` (10cr); fallback `openai/gpt-4o-mini`.
- **Payments**: Razorpay Standard Checkout LIVE; webhook handler at `/api/billing/webhook` (HMAC-SHA256 verify against `RAZORPAY_WEBHOOK_SECRET`).
- **Push**: FCM web push, VAPID, scheduled cron sends gentle nudges every 30 min — respects quiet hours, 3hr cooldown per user, only to users with push_enabled+onboarded+pending habits.
- **SEO**: Full meta (description, keywords, OG, Twitter, canonical), JSON-LD x3 (Organization, SoftwareApplication, FAQPage), semantic h1/h2/h3, structured testid coverage.

## Personas
- **Student** — water + focus + sleep nudges, free tier.
- **Working professional** — daily plans, posture/screen breaks, monthly plan.
- **Parent / freelancer** — full habit list, deep weekly coaching, yearly plan.

## Implemented (cumulative through Apr 25, 2026)
### Phase 1 (MVP)
- ✅ Calm landing + Fraunces+Manrope typography + sage/sand/forest organic palette.
- ✅ Email+password signup/login + Emergent Google login + AuthCallback hash routing.
- ✅ 5-step onboarding (<60s).
- ✅ Today dashboard: water ring, +250/+500/+750, habit tiles, smart reminder cards (Done/Snooze/Skip).
- ✅ Habits page with edit list.
- ✅ AI Coach (3 tiers) + history + credit display.
- ✅ Subscription (Free / Monthly / Yearly).
- ✅ Profile / Privacy: settings, mocked HealthKit/Health Connect, JSON export, account delete.

### Phase 2
- ✅ Razorpay LIVE keys + DEV_MODE gating + webhook handler.
- ✅ Firebase Cloud Messaging — register/test/unregister + service worker + foreground toast.
- ✅ Web Speech API voice reminders (auto-speak first cue + per-card play button).
- ✅ Optimized streak calculation (single date-range query).

### Phase 3 (Apr 25, 2026)
- ✅ **Scheduled-push cron** — APScheduler every 30 min; sends FCM only to users out of quiet hours, with pending tasks, with 3hr cooldown.
- ✅ **Full PWA** — manifest, offline service worker, install prompt component, 192/512/180 icons.
- ✅ **INR-only pricing** — ₹270/mo (27000 paise), ₹2430/yr (243000 paise). Removed USD.
- ✅ **Full-length SEO landing page** — 11 sections (Nav, Hero, TrustBand, HowItWorks, LiveTodayPreview, Features, CoachShowcase, Pricing, Testimonials, PrivacyPromise, FAQ, FinalCTA, Footer). IntersectionObserver scroll reveals + animations. JSON-LD Organization + SoftwareApplication + FAQPage. Open Graph + Twitter cards. PWA install prompt mounted.

## Backlog / Next
- **P1** — Set `RAZORPAY_WEBHOOK_SECRET` + register webhook URL on Razorpay dashboard.
- **P1** — Build-time SW cache version stamp to avoid stale-bundle issues on PWA users.
- **P2** — Migrate FastAPI startup to lifespan handlers (deprecate @app.on_event).
- **P2** — Tighten CORS to `FRONTEND_URL` only.
- **P2** — Split `server.py` (~927 lines) into routers.
- **P3** — Native iOS/Android (Capacitor) for real HealthKit / Health Connect sync.
- **P3** — Weekly auto-coach digest email + shareable "calm card".
- **P3** — Refer-a-friend (30 + 30 credits).

## Test Status
- iter 4 — **Backend 47/47 pytest pass · Frontend 45/45 testids present**. Voice TTS, PWA install, scheduled push cron, INR pricing, real Razorpay LIVE order creation, all SEO meta + JSON-LD verified.
- Test files: `/app/backend/tests/test_lifecue_backend.py`.
- Test credentials: `/app/memory/test_credentials.md`.
