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
- `POST /api/auth/login` — email/password login (returns user + token, sets session_token cookie)
- `POST /api/auth/google/session` — exchange Emergent OAuth `session_id` for JWT cookie
- `GET  /api/auth/me` — current user (requires session_token cookie or Bearer token)
- `POST /api/auth/logout` — clears cookie

## Razorpay (test mode)
- KEY_ID: `rzp_test_RDgL1ziRcwIWDX`  (placeholder — replace with real test key)
- KEY_SECRET: placeholder — actual order creation falls back to mock orders (`order_mock_*`).
- Verify endpoint accepts mock orders for development testing.
- Test card (when secret is real): `4111 1111 1111 1111`, any future expiry, any CVV.

## Notes
- Cookies use `samesite=none; secure=true; httponly=true` so frontend must use `withCredentials: true`.
- Database: `lifecue_ai` on `MONGO_URL`.
