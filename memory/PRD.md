# LifeCue AI — Product Requirements Document

## Original Problem Statement
Subscription-based health & daily-habit tracking app for 2026/2027. Tracks water, walking, stretching, sleep, breathing, screen breaks, journaling, medications, focus time. Smart non-annoying reminders with one-tap Done/Snooze/Skip. AI Coach with credit-based model routing. $3/mo & $27/yr subscription. HealthKit / Health Connect / wearables (mocked). Privacy-first, simple UX, <60s onboarding. For students, working professionals, parents, freelancers, busy people.

## User Choices (cumulative across iterations)
- 1a — Mobile-responsive web app (PWA-style); HealthKit / Health Connect mocked.
- 2a — Emergent Universal LLM Key.
- 3c — Both email/password (JWT) and Emergent Google social login.
- 4 — Razorpay payment gateway (LIVE keys configured, APP_ENV=production).
- 5b → 5a — Visual reminder cards + Web Speech API voice TTS (opt-in).
- Push notifications via Firebase Cloud Messaging (Web Push, project `lifecueai`).
- Native iOS/Android wrapper deferred (mocked HealthKit toggles only).

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) + emergentintegrations (LlmChat) + razorpay (live) + firebase-admin (FCM) + bcrypt + PyJWT.
- **Frontend**: React 18 + Tailwind + lucide-react + react-router + react-hot-toast + firebase (web SDK).
- **Auth**: JWT cookie (httpOnly, secure, samesite=none) + Bearer fallback. Admin auto-seeded + plan re-sync on startup.
- **AI**: 3-tier routing — quick=`gemini-2.5-flash` (1cr), daily=`gpt-5-mini` (3cr), deep=`claude-sonnet-4-5-20250929` (10cr); fallback to `openai/gpt-4o-mini`.
- **Payments**: Razorpay Standard Checkout. `APP_ENV=production` rejects mock orders/signatures with 400. `dev|development|preview` allows mock for local testing.
- **Push**: Firebase Cloud Messaging — service worker at `/firebase-messaging-sw.js`, VAPID web push key, server-side `fb_messaging.send()` per token with auto-cleanup of invalid tokens.
- **Voice**: Web Speech API (`window.speechSynthesis`) — auto-speaks first reminder + per-card "🔊 read aloud" button, opt-in via `voice_reminders_enabled`.
- **Streaks**: Single date-range MongoDB query (`calc_streaks_bulk`) — O(N) instead of O(60×K).

## Personas
- **Student** — water + focus + sleep nudges, free tier sufficient.
- **Working professional** — daily plans, posture & screen breaks, monthly plan.
- **Parent / freelancer** — full habit list, weekly deep coaching, yearly plan.

## Implemented (Apr 2026)
### Phase 1 (MVP)
- ✅ Landing page (Fraunces+Manrope, sage/sand/forest organic palette).
- ✅ Email+password signup/login + Emergent Google login.
- ✅ 5-step onboarding (<60s).
- ✅ Today dashboard: water ring, +250/+500/+750, habit tiles with streaks, smart reminder cards (Done/Snooze/Skip).
- ✅ Habits page with edit list.
- ✅ AI Coach: 3-tier model selector + history + credit display.
- ✅ Subscription page (Free / $3 mo / $27 yr).
- ✅ Profile / Privacy: settings, mocked HealthKit/Health Connect, JSON export, account delete.
- ✅ Wellness disclaimers.

### Phase 2 (Apr 25, 2026)
- ✅ **Razorpay LIVE** keys + DEV_MODE gating + webhook handler.
- ✅ **Firebase Cloud Messaging** push notifications — register/unregister/test endpoints, service worker, VAPID, foreground+background handling, in-app toast for foreground.
- ✅ **Web Speech API** voice reminders — auto-speak first cue + manual "Read aloud" button per reminder.
- ✅ **Optimized streak calculation** — single date-range MongoDB query.
- ✅ Admin plan auto-resync on startup (resets to yearly if drifted).

## Backlog / Next
- **P1** — Add VAPID-only Web Push fallback (zero-Firebase deploy option).
- **P1** — Scheduled push (background task / cron) — send reminders during user's active hours, respecting quiet_hours_start/end.
- **P2** — PWA install prompt + manifest.json + offline cache.
- **P2** — Tighten CORS to FRONTEND_URL only.
- **P2** — Split server.py into routers (auth/habits/water/coach/billing/push/privacy).
- **P3** — Native iOS/Android wrapper (Capacitor) for real HealthKit / Health Connect read.
- **P3** — Weekly auto-coach summary email + shareable "calm card".
- **P3** — Refer-a-friend (give 30 credits, get 30).

## Test Status
- iter 3 — Backend 33/33 pytest pass (production mode), frontend full E2E pass with new push + voice + Razorpay live order paths.
- Test files: `/app/backend/tests/test_lifecue_backend.py`.
- Test credentials: `/app/memory/test_credentials.md`.
