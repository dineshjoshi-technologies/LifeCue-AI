# LifeCue AI — Product Requirements Document

## Original Problem Statement
Subscription-based health & daily-habit tracking app for 2026/2027. Tracks water, walking, stretching, sleep, breathing, screen breaks, journaling, medications, focus time. Smart non-annoying reminders with one-tap Done/Snooze/Skip. AI Coach with credit-based model routing (cheap → fast tips, premium → deep coaching). $3/mo & $27/yr subscription. HealthKit / Google Health Connect / wearables (mocked). Privacy-first, simple UX, <60s onboarding. For students, working professionals, parents, freelancers, busy people.

## User Choices
- 1a — Mobile-responsive web app (PWA-style); HealthKit / Health Connect mocked.
- 2a — Emergent Universal LLM Key.
- 3c — Both email/password (JWT) and Emergent Google social login.
- 4 — Razorpay payment gateway (test mode; mock-fallback active when secret is placeholder).
- 5b — Visual smart reminder cards (no voice).

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) + emergentintegrations (LlmChat) + razorpay SDK + bcrypt + PyJWT.
- **Frontend**: React 18 + Tailwind + lucide-react + react-router + react-hot-toast. CRA build.
- **Auth**: JWT cookie (httpOnly, secure, samesite=none) + Bearer fallback. Admin auto-seeded on startup.
- **AI**: 3-tier routing — quick=`gemini-2.5-flash` (1cr), daily=`gpt-5-mini` (3cr), deep=`claude-sonnet-4-5-20250929` (10cr); fallback to `openai/gpt-4o-mini` on failure.
- **Payments**: Razorpay Standard Checkout via `checkout.razorpay.com/v1/checkout.js`. Dev mock-flow accepts `order_mock_*` orders + any signature when secret is placeholder.

## Personas
- **Student** — needs water + focus + sleep nudges, free tier sufficient.
- **Working professional** — daily plans, posture & screen breaks, monthly plan.
- **Parent / freelancer** — full habit list, weekly deep coaching, yearly plan.

## Implemented (Apr 2026)
- ✅ Landing page (calming organic aesthetic — Fraunces+Manrope, sage/sand/forest palette).
- ✅ Email+password signup/login + Emergent Google login (callback handled by hash detection).
- ✅ 5-step onboarding (<60s): welcome → habits → water goal → quiet hours → ready.
- ✅ Today dashboard: water ring, +250/+500/+750 buttons, habit tiles with streaks ("X-day flow"), smart reminder cards with Done/Snooze/Skip.
- ✅ Habits page: full grid with streaks + edit list.
- ✅ AI Coach: 3-tier model selector, credit display, friendly chat UI, history persisted.
- ✅ Subscription: 3 plans (Free / $3 mo / $27 yr) with Razorpay checkout + mock-fallback for dev.
- ✅ Profile / Privacy: settings (water goal, quiet hours, voice toggle), HealthKit + Google Health Connect mocked toggles, JSON export, account delete.
- ✅ Wellness disclaimer everywhere (not medical advice).

## Backlog / Next
- **P1** — Real Razorpay live keys + webhook + production secret.
- **P1** — Gate `/api/billing/verify` mock-signature acceptance behind explicit `DEV_MODE` flag.
- **P1** — Replace `calc_streak` O(60) loop with a single date-range mongo aggregation.
- **P2** — Tighten CORS to FRONTEND_URL.
- **P2** — Voice-style reminder (Web Speech / OpenAI TTS) — opt-in.
- **P2** — PWA install + offline cache + push notifications.
- **P2** — Native iOS/Android wrapper for real HealthKit / Health Connect read.
- **P3** — Weekly auto-coach summary email + share-worthy "calm card" image of weekly progress.
- **P3** — Refer-a-friend (give 30 credits, get 30) — viral loop.

## Test Status (iter 2)
- Backend: 25/25 pytest pass.
- Frontend: full E2E pass (signup → onboarding → today → coach → subscription → profile).
- Test credentials: `/app/memory/test_credentials.md`.
