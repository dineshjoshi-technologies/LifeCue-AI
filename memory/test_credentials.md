# LifeCue AI — Test Credentials

## Admin User (seeded automatically)
- **Email:** admin@lifecue.ai
- **Password:** Admin@2026
- **Role:** admin
- **Plan:** yearly (9000 AI credits)
- Login endpoint: `POST /api/auth/login`

## Test User (create via signup)
- Use `POST /api/auth/register` with `{name, email, password (min 6)}` to create new test users.
- Default plan: `free` (30 AI credits)

## Auth Endpoints
- `POST /api/auth/register` — email/password signup
- `POST /api/auth/login` — email/password login (sets session_token cookie)
- `POST /api/auth/google/session` — exchange Emergent OAuth `session_id` for JWT cookie
- `GET  /api/auth/me` — current user
- `POST /api/auth/logout` — clears cookie

## Razorpay (LIVE mode — real money)
- KEY_ID: `rzp_live_ShhTjgkbdBWbqN`
- KEY_SECRET: configured in `/app/backend/.env`
- WEBHOOK_SECRET: not configured yet (set on Razorpay dashboard → Settings → Webhooks)
- APP_ENV: `production` (DEV_MODE off — mock orders/signatures REJECTED)
- For testing without real charges: temporarily switch APP_ENV=dev to allow `order_mock_*` flow.

## Firebase Cloud Messaging (Web Push)
- Service account: `/app/backend/firebase-service-account.json` (project: `lifecueai`)
- Web SDK config: in `/app/frontend/.env`
- VAPID public key: in `/app/frontend/.env`
- Service worker: `/app/frontend/public/firebase-messaging-sw.js`
- Endpoints:
  - `POST /api/push/register` — register a device FCM token
  - `POST /api/push/unregister` — remove a device token
  - `POST /api/push/test` — send a test push to all of caller's devices

## Voice Reminders (Web Speech API)
- No keys needed. Browser-based TTS via `window.speechSynthesis`.
- Toggle on Profile → "Voice-style smart reminders".
- Auto-spoken on Today when reminders appear; manual "Read aloud" button on each reminder card.

## Notes
- Cookies use `samesite=none; secure=true; httponly=true`.
- Database: `lifecue_ai` on `MONGO_URL`.
- `APP_ENV` controls payment behavior: `production` rejects mock; `dev`/`development`/`preview` allows mock orders for testing.
