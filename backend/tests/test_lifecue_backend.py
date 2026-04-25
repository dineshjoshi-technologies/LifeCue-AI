"""LifeCue AI Backend Test Suite — comprehensive API tests."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://3c9d4493-5edb-4d9b-b252-00eee97ae9ef.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@lifecue.ai"
ADMIN_PASSWORD = "Admin@2026"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    return s


@pytest.fixture(scope="session")
def test_user():
    """Create a fresh test user once per test session."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    email = f"test_{uuid.uuid4().hex[:8]}@lifecueqa.com"
    pw = "TestPass@2026"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": pw, "name": "Test User"})
    assert r.status_code == 200, f"Register failed: {r.text}"
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    yield {"session": s, "email": email, "password": pw, "user": data["user"], "token": data["token"]}
    # Cleanup: delete user
    try:
        s.delete(f"{API}/privacy/account")
    except Exception:
        pass


# ---------- Health ----------
class TestHealth:
    def test_health(self):
        r = requests.get(f"{API}/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


# ---------- Auth ----------
class TestAuth:
    def test_register_and_token(self):
        email = f"TEST_{uuid.uuid4().hex[:8]}@lifecueqa.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "secret123", "name": "Reggie"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["email"] == email.lower()
        assert d["user"]["plan"] == "free"
        assert d["user"]["ai_credits"] == 30
        assert d["user"]["onboarded"] is False
        assert isinstance(d["token"], str) and len(d["token"]) > 20
        # Cookie set
        assert "session_token" in r.cookies
        # Cleanup
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {d['token']}", "Content-Type": "application/json"})
        s.delete(f"{API}/privacy/account")

    def test_register_duplicate_email(self, test_user):
        r = requests.post(f"{API}/auth/register", json={"email": test_user["email"], "password": "secret123", "name": "Dup"})
        assert r.status_code == 400

    def test_admin_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["email"] == ADMIN_EMAIL
        assert d["user"]["role"] == "admin"
        assert d["user"]["plan"] == "yearly"
        assert "session_token" in r.cookies

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_via_bearer(self, test_user):
        r = test_user["session"].get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == test_user["email"]

    def test_me_via_cookie(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        # cookie jar should now have session_token
        r2 = s.get(f"{API}/auth/me")
        assert r2.status_code == 200
        assert r2.json()["email"] == ADMIN_EMAIL

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout_clears_cookie(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # After logout, new session-only request should be unauth
        s2 = requests.Session()
        r2 = s2.get(f"{API}/auth/me")
        assert r2.status_code == 401

    def test_google_session_invalid(self):
        r = requests.post(f"{API}/auth/google/session", json={"session_id": "invalid_session_xyz"})
        assert r.status_code == 401


# ---------- Onboarding & Settings ----------
class TestOnboarding:
    def test_onboarding(self, test_user):
        s = test_user["session"]
        r = s.post(f"{API}/onboarding", json={
            "water_goal_ml": 3000,
            "selected_habits": ["water", "steps", "sleep"],
            "quiet_hours_start": "23:00",
            "quiet_hours_end": "06:30",
        })
        assert r.status_code == 200
        me = s.get(f"{API}/auth/me").json()
        assert me["onboarded"] is True
        assert me["water_goal_ml"] == 3000
        assert me["selected_habits"] == ["water", "steps", "sleep"]

    def test_settings_patch(self, test_user):
        s = test_user["session"]
        r = s.patch(f"{API}/settings", json={"voice_reminders_enabled": True, "health_apple": True, "water_goal_ml": 2800})
        assert r.status_code == 200
        d = r.json()
        assert d["voice_reminders_enabled"] is True
        assert d["health_apple"] is True
        assert d["water_goal_ml"] == 2800


# ---------- Habits ----------
class TestHabits:
    def test_catalog(self):
        r = requests.get(f"{API}/habits/catalog")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) == 14
        keys = {h["key"] for h in items}
        for k in ["water", "steps", "sleep", "stretch", "meditate"]:
            assert k in keys

    def test_today_and_toggle(self, test_user):
        s = test_user["session"]
        # Ensure onboarded with selected habits
        s.post(f"{API}/onboarding", json={"water_goal_ml": 2500, "selected_habits": ["water", "steps", "sleep"]})
        r = s.get(f"{API}/habits/today")
        assert r.status_code == 200
        d = r.json()
        assert "selected" in d and "catalog" in d and "today" in d and "streaks" in d
        # toggle steps -> done
        r2 = s.post(f"{API}/habits/toggle", json={"habit_key": "steps", "completed": True})
        assert r2.status_code == 200
        assert r2.json()["today"].get("steps") is True
        # persistence
        r3 = s.get(f"{API}/habits/today")
        assert r3.json()["today"].get("steps") is True


# ---------- Water ----------
class TestWater:
    def test_water_log_and_today(self, test_user):
        s = test_user["session"]
        # set goal first
        s.patch(f"{API}/settings", json={"water_goal_ml": 2500})
        r0 = s.get(f"{API}/water/today")
        assert r0.status_code == 200
        start_total = r0.json()["total_ml"]
        r1 = s.post(f"{API}/water/log", json={"amount_ml": 250})
        assert r1.status_code == 200
        d = r1.json()
        assert d["total_ml"] == start_total + 250
        assert d["goal_ml"] == 2500


# ---------- Reminders ----------
class TestReminders:
    def test_reminders_today(self, test_user):
        s = test_user["session"]
        r = s.get(f"{API}/reminders/today")
        assert r.status_code == 200
        d = r.json()
        assert "reminders" in d and isinstance(d["reminders"], list)

    def test_reminders_action_done_marks_habit(self, test_user):
        s = test_user["session"]
        # Ensure sleep is selected and not done
        s.post(f"{API}/onboarding", json={"water_goal_ml": 2500, "selected_habits": ["water", "steps", "sleep"]})
        s.post(f"{API}/habits/toggle", json={"habit_key": "sleep", "completed": False})
        rems = s.get(f"{API}/reminders/today").json()["reminders"]
        sleep_rem = next((r for r in rems if r["kind"] == "sleep"), None)
        assert sleep_rem, f"Expected sleep reminder, got {[r['kind'] for r in rems]}"
        r = s.post(f"{API}/reminders/action", json={"reminder_id": sleep_rem["id"], "action": "done"})
        assert r.status_code == 200
        today = s.get(f"{API}/habits/today").json()
        assert today["today"].get("sleep") is True


# ---------- AI Coach ----------
class TestCoach:
    def test_coach_quick_chat(self, test_user):
        s = test_user["session"]
        before = s.get(f"{API}/auth/me").json()["ai_credits"]
        r = s.post(f"{API}/coach/chat", json={"message": "Give me a 1-sentence hydration tip.", "tier": "quick"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d["reply"], str) and len(d["reply"]) > 0
        assert d["credits_used"] == 1
        assert d["credits_left"] == before - 1
        assert d["tier"] == "quick"

    def test_coach_daily_chat(self, test_user):
        s = test_user["session"]
        before = s.get(f"{API}/auth/me").json()["ai_credits"]
        r = s.post(f"{API}/coach/chat", json={"message": "Give me a short focus tip.", "tier": "daily"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d["reply"], str) and len(d["reply"]) > 0
        assert d["credits_used"] == 3
        assert d["credits_left"] == before - 3
        assert d["tier"] == "daily"

    def test_coach_deep_chat(self, admin_session):
        # Use admin (yearly plan, 9000 credits) so deep tier (10) is affordable in production mode
        s = admin_session
        before = s.get(f"{API}/auth/me").json()["ai_credits"]
        if before < 10:
            pytest.skip(f"Admin has insufficient credits ({before}) for deep tier")
        r = s.post(f"{API}/coach/chat", json={"message": "Plan a calm evening routine.", "tier": "deep"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d["reply"], str) and len(d["reply"]) > 0
        assert d["credits_used"] == 10
        assert d["credits_left"] == before - 10
        assert d["tier"] == "deep"

    def test_coach_history(self, test_user):
        s = test_user["session"]
        r = s.get(f"{API}/coach/history")
        assert r.status_code == 200
        msgs = r.json()["messages"]
        assert isinstance(msgs, list)
        # Should have at least the last user+assistant from prior test
        if msgs:
            assert msgs[-1]["role"] in ["user", "assistant"]


# ---------- Billing (LIVE Razorpay / production mode) ----------
class TestBilling:
    def test_plans(self):
        r = requests.get(f"{API}/billing/plans")
        assert r.status_code == 200
        d = r.json()
        assert "plans" in d and len(d["plans"]) == 3
        plans_by_id = {p["id"]: p for p in d["plans"]}
        assert set(plans_by_id.keys()) == {"free", "monthly", "yearly"}
        assert "razorpay_key_id" in d
        assert d["razorpay_key_id"].startswith("rzp_live_"), f"Expected live key, got {d['razorpay_key_id']}"
        # Iter-4: INR-only pricing with price_inr_display field
        m = plans_by_id["monthly"]
        assert m["price_inr"] == 27000, f"monthly paise: {m['price_inr']}"
        assert m["price_inr_display"] == 270, f"monthly display: {m['price_inr_display']}"
        assert m["currency"] == "INR"
        y = plans_by_id["yearly"]
        assert y["price_inr"] == 243000, f"yearly paise: {y['price_inr']}"
        assert y["price_inr_display"] == 2430, f"yearly display: {y['price_inr_display']}"
        assert y["currency"] == "INR"
        f = plans_by_id["free"]
        assert f["price_inr"] == 0
        assert f["price_inr_display"] == 0
        # Old USD field must be gone
        for p in d["plans"]:
            assert "price_usd" not in p, f"Plan {p['id']} still has price_usd"

    def test_order_monthly_creates_real_razorpay_order(self, test_user):
        """In APP_ENV=production with real Razorpay client, order_id must be a real
        Razorpay order id (prefix 'order_') and NOT a mock fallback ('order_mock_')."""
        s = test_user["session"]
        r = s.post(f"{API}/billing/order", json={"plan": "monthly"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["amount"] == 27000  # ₹270 in paise
        assert d["plan"] == "monthly"
        assert d["currency"] == "INR"
        assert d["key_id"].startswith("rzp_live_")
        oid = d["order_id"]
        assert oid.startswith("order_"), f"Bad order_id: {oid}"
        assert not oid.startswith("order_mock_"), (
            f"Got mock order in production mode: {oid} — Razorpay client did not initialize"
        )

    def test_order_yearly_creates_real_razorpay_order(self, test_user):
        s = test_user["session"]
        r = s.post(f"{API}/billing/order", json={"plan": "yearly"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["amount"] == 243000  # ₹2430 in paise
        assert d["plan"] == "yearly"
        assert d["currency"] == "INR"
        oid = d["order_id"]
        assert oid.startswith("order_") and not oid.startswith("order_mock_")

    def test_verify_rejects_forged_signature_for_real_order(self, test_user):
        """Forge a signature for a real order_id — must be rejected with 400."""
        s = test_user["session"]
        o = s.post(f"{API}/billing/order", json={"plan": "monthly"}).json()
        oid = o["order_id"]
        assert oid.startswith("order_") and not oid.startswith("order_mock_")
        v = s.post(f"{API}/billing/verify", json={
            "razorpay_order_id": oid,
            "razorpay_payment_id": "pay_FORGED_test",
            "razorpay_signature": "deadbeef" * 8,
            "plan": "monthly",
        })
        assert v.status_code == 400, f"Expected 400 for forged sig, got {v.status_code}: {v.text}"

    def test_verify_rejects_mock_order_id_in_production(self, test_user):
        """A client-supplied 'order_mock_*' id must be rejected with 400 when DEV_MODE is off."""
        s = test_user["session"]
        v = s.post(f"{API}/billing/verify", json={
            "razorpay_order_id": "order_mock_abcdef0123456789",
            "razorpay_payment_id": "pay_mock_x",
            "razorpay_signature": "mock_signature",
            "plan": "monthly",
        })
        assert v.status_code == 400, f"Expected 400 rejecting mock in prod, got {v.status_code}: {v.text}"

    def test_webhook_no_secret_returns_ignored(self):
        """Without RAZORPAY_WEBHOOK_SECRET configured, webhook returns 200 'ignored'."""
        r = requests.post(
            f"{API}/billing/webhook",
            data=b'{"event":"payment.captured"}',
            headers={"Content-Type": "application/json", "x-razorpay-signature": "irrelevant"},
        )
        assert r.status_code == 200, r.text
        assert r.json().get("status") == "ignored"


# ---------- Push Notifications (FCM) ----------
class TestPush:
    def test_push_register_requires_auth(self):
        r = requests.post(f"{API}/push/register", json={"token": "x" * 30, "platform": "web"})
        assert r.status_code == 401

    def test_push_register_rejects_short_token(self, test_user):
        s = test_user["session"]
        r = s.post(f"{API}/push/register", json={"token": "abc", "platform": "web"})
        assert r.status_code == 400

    def test_push_register_and_user_flag(self, test_user):
        s = test_user["session"]
        fake_token = "fake_fcm_token_" + uuid.uuid4().hex  # > 20 chars
        r = s.post(f"{API}/push/register", json={"token": fake_token, "platform": "web"})
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True
        # user.push_enabled flips to True
        me = s.get(f"{API}/auth/me").json()
        assert me.get("push_enabled") is True

    def test_push_test_with_no_devices(self):
        """Fresh user with no registered tokens -> 400 'No devices registered for push'."""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        email = f"TEST_push_nodev_{uuid.uuid4().hex[:6]}@lifecueqa.com"
        reg = s.post(f"{API}/auth/register", json={"email": email, "password": "secret123", "name": "PushNoDev"})
        assert reg.status_code == 200
        s.headers.update({"Authorization": f"Bearer {reg.json()['token']}"})
        r = s.post(f"{API}/push/test", json={})
        assert r.status_code == 400, r.text
        assert "no devices" in r.text.lower()
        # cleanup
        s.delete(f"{API}/privacy/account")

    def test_push_test_with_fake_token_returns_failed(self):
        """Register a fake token, then /push/test should return sent=0 with a failed entry (FCM rejects)."""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        email = f"TEST_push_fake_{uuid.uuid4().hex[:6]}@lifecueqa.com"
        reg = s.post(f"{API}/auth/register", json={"email": email, "password": "secret123", "name": "PushFake"})
        assert reg.status_code == 200
        s.headers.update({"Authorization": f"Bearer {reg.json()['token']}"})
        fake = "fake_fcm_token_" + uuid.uuid4().hex + "_padding_to_be_long_enough"
        s.post(f"{API}/push/register", json={"token": fake, "platform": "web"})
        r = s.post(f"{API}/push/test", json={})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["sent"] == 0
        assert d["total"] >= 1
        assert isinstance(d["failed"], list) and len(d["failed"]) >= 1
        # cleanup
        s.delete(f"{API}/privacy/account")

    def test_push_unregister(self, test_user):
        s = test_user["session"]
        tok = "fake_unreg_" + uuid.uuid4().hex + "_padding_long"
        s.post(f"{API}/push/register", json={"token": tok, "platform": "web"})
        r = s.post(f"{API}/push/unregister", json={"token": tok})
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- Iter-4: Scheduler & HABIT_LABEL ----------
class TestSchedulerAndLabels:
    def test_habit_label_covers_all_14_keys(self):
        """HABIT_LABEL must cover all 14 catalog habits."""
        from server import HABIT_LABEL
        expected = {"water", "steps", "stretch", "sleep", "meditate", "read", "no_sugar",
                    "posture", "breath", "screen_break", "journal", "focus", "medication", "workout"}
        missing = expected - set(HABIT_LABEL.keys())
        assert not missing, f"HABIT_LABEL missing keys: {missing}"
        # Sanity: catalog keys should all be in HABIT_LABEL
        cat = requests.get(f"{API}/habits/catalog").json()
        catalog_keys = {h["key"] for h in cat}
        assert catalog_keys.issubset(set(HABIT_LABEL.keys())), \
            f"Catalog keys not in HABIT_LABEL: {catalog_keys - set(HABIT_LABEL.keys())}"

    def test_quiet_hours_helper_wraps_midnight(self):
        from server import _is_in_quiet_hours
        # 22:00 -> 07:00 wrap
        assert _is_in_quiet_hours("23:30", "22:00", "07:00") is True
        assert _is_in_quiet_hours("06:30", "22:00", "07:00") is True
        assert _is_in_quiet_hours("12:00", "22:00", "07:00") is False
        # Non-wrap
        assert _is_in_quiet_hours("13:00", "12:00", "14:00") is True
        assert _is_in_quiet_hours("15:00", "12:00", "14:00") is False
        # Equal start/end => disabled
        assert _is_in_quiet_hours("12:00", "10:00", "10:00") is False

    def test_send_scheduled_reminders_callable_idempotent(self):
        """The cron entry-point must be safe to call directly without crashing
        even if zero users match (idempotent)."""
        import asyncio
        from server import send_scheduled_reminders
        # Should not raise
        asyncio.get_event_loop().run_until_complete(send_scheduled_reminders())
        # Second call also fine
        asyncio.get_event_loop().run_until_complete(send_scheduled_reminders())


# ---------- Iter-4: PWA static assets ----------
class TestPwaAssets:
    @pytest.mark.parametrize("path,content_type_hint", [
        ("/manifest.json", "json"),
        ("/sw.js", "javascript"),
        ("/firebase-messaging-sw.js", "javascript"),
        ("/icon-192.png", "image"),
        ("/icon-512.png", "image"),
        ("/apple-touch-icon.png", "image"),
        ("/favicon.ico", None),
    ])
    def test_pwa_asset_reachable(self, path, content_type_hint):
        r = requests.get(f"{BASE_URL}{path}", timeout=15)
        assert r.status_code == 200, f"{path} returned {r.status_code}"
        if content_type_hint:
            ct = r.headers.get("content-type", "").lower()
            assert content_type_hint in ct, f"{path} unexpected content-type: {ct}"

    def test_manifest_json_valid(self):
        r = requests.get(f"{BASE_URL}/manifest.json")
        assert r.status_code == 200
        m = r.json()
        assert "name" in m or "short_name" in m
        assert "icons" in m and isinstance(m["icons"], list) and len(m["icons"]) >= 1
        sizes = {i.get("sizes") for i in m["icons"]}
        assert "192x192" in sizes and "512x512" in sizes

    def test_index_html_seo_and_pwa_tags(self):
        r = requests.get(f"{BASE_URL}/")
        assert r.status_code == 200
        html = r.text
        assert "<title>" in html and "LifeCue" in html
        assert 'name="description"' in html
        assert 'property="og:title"' in html
        assert 'name="twitter:card"' in html
        assert 'rel="manifest"' in html
        assert 'rel="apple-touch-icon"' in html
        # 3 JSON-LD scripts
        assert html.count('application/ld+json') >= 3


# ---------- Privacy ----------
class TestPrivacy:
    def test_export(self, test_user):
        s = test_user["session"]
        r = s.get(f"{API}/privacy/export")
        assert r.status_code == 200
        d = r.json()
        for key in ["user", "water_logs", "habit_logs", "coach_messages", "reminder_actions", "payments"]:
            assert key in d

    def test_delete_account_isolated(self):
        # Create a fresh user just for delete test
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        email = f"TEST_del_{uuid.uuid4().hex[:6]}@lifecueqa.com"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "secret123", "name": "DelMe"})
        assert r.status_code == 200
        token = r.json()["token"]
        s.headers.update({"Authorization": f"Bearer {token}"})
        # Use a session WITHOUT cookies to ensure bearer-based delete
        d = s.delete(f"{API}/privacy/account")
        assert d.status_code == 200
        # me should now 401
        m = s.get(f"{API}/auth/me")
        assert m.status_code == 401
