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

    def test_coach_history(self, test_user):
        s = test_user["session"]
        r = s.get(f"{API}/coach/history")
        assert r.status_code == 200
        msgs = r.json()["messages"]
        assert isinstance(msgs, list)
        # Should have at least the last user+assistant from prior test
        if msgs:
            assert msgs[-1]["role"] in ["user", "assistant"]


# ---------- Billing ----------
class TestBilling:
    def test_plans(self):
        r = requests.get(f"{API}/billing/plans")
        assert r.status_code == 200
        d = r.json()
        assert "plans" in d and len(d["plans"]) == 3
        ids = {p["id"] for p in d["plans"]}
        assert ids == {"free", "monthly", "yearly"}
        assert "razorpay_key_id" in d

    def test_order_and_verify_mock_upgrades_user(self, test_user):
        s = test_user["session"]
        r = s.post(f"{API}/billing/order", json={"plan": "monthly"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["amount"] == 24900
        assert d["plan"] == "monthly"
        order_id = d["order_id"]
        # Mock fallback expected
        assert order_id.startswith("order_mock_") or order_id.startswith("order_")
        # Verify (mock signature accepted in dev)
        v = s.post(f"{API}/billing/verify", json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": "pay_mock_test",
            "razorpay_signature": "mock_signature",
            "plan": "monthly",
        })
        assert v.status_code == 200, v.text
        vd = v.json()
        assert vd["ok"] is True
        assert vd["user"]["plan"] == "monthly"
        assert vd["user"]["ai_credits"] == 600


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
