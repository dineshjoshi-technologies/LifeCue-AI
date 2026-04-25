from dotenv import load_dotenv
load_dotenv()

import os
import uuid
import bcrypt
import jwt
import hmac
import hashlib
import json
import logging
import secrets
import asyncio
from datetime import datetime, timezone, timedelta, date
from typing import Optional, List, Literal

import httpx
from fastapi import FastAPI, HTTPException, Request, Response, Depends, APIRouter, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient

from emergentintegrations.llm.chat import LlmChat, UserMessage

import firebase_admin
from firebase_admin import credentials as fb_credentials, messaging as fb_messaging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

# ---------- Config ----------
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
APP_ENV = os.environ.get("APP_ENV", "production").lower()
DEV_MODE = APP_ENV in ("dev", "development", "preview")
FIREBASE_SERVICE_ACCOUNT_PATH = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH", "")

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("lifecue")

# ---------- Firebase Admin (FCM) ----------
_fb_app = None
def init_firebase():
    global _fb_app
    if _fb_app is not None:
        return _fb_app
    if FIREBASE_SERVICE_ACCOUNT_PATH and os.path.exists(FIREBASE_SERVICE_ACCOUNT_PATH):
        try:
            cred = fb_credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_PATH)
            _fb_app = firebase_admin.initialize_app(cred)
            log.info("Firebase Admin initialized")
        except Exception as e:
            log.warning(f"Firebase init failed: {e}")
            _fb_app = None
    return _fb_app

# ---------- Scheduler (gentle reminders cron) ----------
scheduler: Optional[AsyncIOScheduler] = None

HABIT_LABEL = {
    "water": "Water", "steps": "Steps", "stretch": "Stretching", "sleep": "Sleep",
    "meditate": "Meditation", "read": "Reading", "no_sugar": "No added sugar",
    "posture": "Posture check", "breath": "Breathing break", "screen_break": "Screen break",
    "journal": "Journaling", "focus": "Focus time", "medication": "Medication", "workout": "Workout",
}

def _is_in_quiet_hours(now_hm: str, start: str, end: str) -> bool:
    """Check if a HH:MM time falls within a quiet window that may wrap midnight."""
    try:
        n = _hm_to_min(now_hm)
        s = _hm_to_min(start)
        e = _hm_to_min(end)
    except Exception:
        return False
    if s == e:
        return False
    if s < e:
        return s <= n < e
    # wraps midnight, e.g. 22:00 -> 07:00
    return n >= s or n < e

def _hm_to_min(s: str) -> int:
    h, m = s.split(":")
    return int(h) * 60 + int(m)

async def send_scheduled_reminders():
    """Iterate active users; send a single calm push if they have pending habits and are outside quiet hours."""
    init_firebase()
    if _fb_app is None:
        return
    now = datetime.now(timezone.utc)
    now_hm = now.strftime("%H:%M")
    today = now.date().isoformat()
    cooldown_iso = (now - timedelta(hours=3)).isoformat()
    sent = 0
    skipped = 0
    cursor = db.users.find(
        {"push_enabled": True, "onboarded": True},
        {"_id": 0, "user_id": 1, "name": 1, "selected_habits": 1, "quiet_hours_start": 1, "quiet_hours_end": 1, "last_push_at": 1, "water_goal_ml": 1},
    )
    async for u in cursor:
        try:
            qs = u.get("quiet_hours_start") or "22:00"
            qe = u.get("quiet_hours_end") or "07:00"
            if _is_in_quiet_hours(now_hm, qs, qe):
                skipped += 1
                continue
            last = u.get("last_push_at")
            if last and last > cooldown_iso:
                skipped += 1
                continue
            # Build a gentle message
            selected = u.get("selected_habits") or []
            done_keys = set()
            async for d in db.habit_logs.find({"user_id": u["user_id"], "date": today, "completed": True}, {"_id": 0, "habit_key": 1}):
                done_keys.add(d["habit_key"])
            pending = [h for h in selected if h not in done_keys]
            water_total = 0
            async for w in db.water_logs.find({"user_id": u["user_id"], "date": today}, {"_id": 0, "amount_ml": 1}):
                water_total += w.get("amount_ml", 0)
            water_goal = u.get("water_goal_ml", 2500) or 2500
            water_pending = water_total < water_goal
            if not pending and not water_pending:
                skipped += 1
                continue
            first = u.get("name", "friend").split(" ")[0] if u.get("name") else "friend"
            if water_pending and (len(pending) == 0 or "water" in pending):
                title = "A gentle sip"
                body = f"Hi {first} — {water_goal - water_total}ml away from today's flow."
            else:
                label = HABIT_LABEL.get(pending[0], pending[0])
                title = "A small cue"
                body = f"Hi {first} — a moment for {label.lower()}?"
            tokens = []
            async for t in db.push_tokens.find({"user_id": u["user_id"]}, {"_id": 0, "token": 1}):
                tokens.append(t["token"])
            if not tokens:
                continue
            for tok in tokens:
                try:
                    msg = fb_messaging.Message(
                        notification=fb_messaging.Notification(title=title, body=body),
                        data={"kind": "scheduled", "ts": now.isoformat()},
                        token=tok,
                    )
                    fb_messaging.send(msg)
                    sent += 1
                except Exception as e:
                    err = str(e).lower()
                    if "registration-token-not-registered" in err or "invalid-argument" in err:
                        await db.push_tokens.delete_one({"user_id": u["user_id"], "token": tok})
            await db.users.update_one({"user_id": u["user_id"]}, {"$set": {"last_push_at": now.isoformat()}})
        except Exception as e:
            log.exception(f"Scheduled push failed for user {u.get('user_id')}: {e}")
    log.info(f"Scheduled reminders: sent={sent} skipped={skipped}")

# ---------- Razorpay client ----------
_rzp_client = None
def get_rzp():
    global _rzp_client
    if _rzp_client is None and RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
        try:
            import razorpay
            _rzp_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        except Exception as e:
            log.warning(f"Razorpay client init failed: {e}")
    return _rzp_client

# ---------- DB ----------
mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

# ---------- App ----------
app = FastAPI(title="LifeCue AI API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ---------- Models ----------
class RegisterReq(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class GoogleSessionReq(BaseModel):
    session_id: str

class HabitDef(BaseModel):
    key: str
    label: str
    icon: str
    target: Optional[float] = None
    unit: Optional[str] = None

class WaterLogReq(BaseModel):
    amount_ml: int = Field(gt=0, le=5000)

class HabitToggleReq(BaseModel):
    habit_key: str
    completed: bool
    on_date: Optional[str] = None  # ISO date

class ReminderActionReq(BaseModel):
    reminder_id: str
    action: Literal["done", "snooze", "skip"]

class CoachChatReq(BaseModel):
    message: str
    tier: Literal["quick", "daily", "deep"] = "quick"
    session_id: Optional[str] = None

class OnboardingReq(BaseModel):
    water_goal_ml: int = 2500
    selected_habits: List[str] = []
    quiet_hours_start: str = "22:00"
    quiet_hours_end: str = "07:00"

class CreateOrderReq(BaseModel):
    plan: Literal["monthly", "yearly"]

class VerifyPaymentReq(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: Literal["monthly", "yearly"]

class SettingsReq(BaseModel):
    water_goal_ml: Optional[int] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    voice_reminders_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    health_apple: Optional[bool] = None
    health_google: Optional[bool] = None

class PushTokenReq(BaseModel):
    token: str
    platform: str = "web"

class SendTestPushReq(BaseModel):
    title: Optional[str] = "A gentle cue"
    body: Optional[str] = "Time for a small sip of water."

# ---------- Helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_jwt(user_id: str, email: str, days: int = 7) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=days),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def set_session_cookie(response: Response, token: str):
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )

def clear_session_cookie(response: Response):
    response.delete_cookie("session_token", path="/")

def today_str() -> str:
    return datetime.now(timezone.utc).date().isoformat()

DEFAULT_HABITS = [
    {"key": "water", "label": "Water", "icon": "droplet", "target": 8, "unit": "glasses"},
    {"key": "steps", "label": "Steps", "icon": "footprints", "target": 8000, "unit": "steps"},
    {"key": "stretch", "label": "Stretching", "icon": "move", "target": 1, "unit": "session"},
    {"key": "sleep", "label": "Sleep 7h+", "icon": "moon", "target": 7, "unit": "hours"},
    {"key": "meditate", "label": "Meditation", "icon": "leaf", "target": 1, "unit": "session"},
    {"key": "read", "label": "Reading", "icon": "book-open", "target": 15, "unit": "min"},
    {"key": "no_sugar", "label": "No added sugar", "icon": "candy-off", "target": 1, "unit": "day"},
    {"key": "posture", "label": "Posture check", "icon": "user", "target": 3, "unit": "checks"},
    {"key": "breath", "label": "Breathing break", "icon": "wind", "target": 2, "unit": "sessions"},
    {"key": "screen_break", "label": "Screen break", "icon": "monitor-off", "target": 3, "unit": "breaks"},
    {"key": "journal", "label": "Journaling", "icon": "pen-line", "target": 1, "unit": "entry"},
    {"key": "focus", "label": "Focus time", "icon": "target", "target": 1, "unit": "session"},
    {"key": "medication", "label": "Medication", "icon": "pill", "target": 1, "unit": "dose"},
    {"key": "workout", "label": "Workout", "icon": "dumbbell", "target": 1, "unit": "session"},
]

PLANS = {
    "free": {"price_inr": 0, "credits": 30, "label": "Free"},
    "monthly": {"price_inr": 27000, "credits": 600, "label": "Monthly", "duration_days": 31},   # ₹270
    "yearly":  {"price_inr": 243000, "credits": 9000, "label": "Yearly", "duration_days": 366}, # ₹2430
}

TIER_COSTS = {"quick": 1, "daily": 3, "deep": 10}
TIER_MODELS = {
    "quick": ("gemini", "gemini-2.5-flash"),
    "daily": ("openai", "gpt-5-mini"),
    "deep": ("anthropic", "claude-sonnet-4-5-20250929"),
}
TIER_FALLBACK = ("openai", "gpt-4o-mini")

# ---------- Auth Dep ----------
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user

# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.water_logs.create_index([("user_id", 1), ("date", 1)])
    await db.habit_logs.create_index([("user_id", 1), ("date", 1), ("habit_key", 1)], unique=True)
    await db.coach_messages.create_index([("user_id", 1), ("session_id", 1), ("created_at", 1)])
    await db.payments.create_index("order_id")
    await db.push_tokens.create_index([("user_id", 1), ("token", 1)], unique=True)
    init_firebase()
    # Start scheduled reminders cron
    global scheduler
    if scheduler is None:
        scheduler = AsyncIOScheduler(timezone="UTC")
        scheduler.add_job(send_scheduled_reminders, CronTrigger(minute="*/30"), id="scheduled_reminders", replace_existing=True)
        scheduler.start()
        log.info("Scheduler started: scheduled_reminders every 30 minutes")
    # seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@lifecue.ai").lower()
    admin_pw = os.environ.get("ADMIN_PASSWORD", "Admin@2026")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": admin_email,
            "password_hash": hash_password(admin_pw),
            "name": "Admin",
            "role": "admin",
            "plan": "yearly",
            "ai_credits": 9000,
            "plan_expires_at": (datetime.now(timezone.utc) + timedelta(days=366)).isoformat(),
            "water_goal_ml": 2500,
            "selected_habits": [h["key"] for h in DEFAULT_HABITS[:8]],
            "quiet_hours_start": "22:00",
            "quiet_hours_end": "07:00",
            "voice_reminders_enabled": False,
            "health_apple": False,
            "health_google": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "onboarded": True,
        })
        log.info("Admin user seeded")
    elif not verify_password(admin_pw, existing.get("password_hash", "")):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})
    # Keep admin on yearly plan with full credits regardless of test mutations
    if existing and existing.get("plan") != "yearly":
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {
                "plan": "yearly",
                "ai_credits": PLANS["yearly"]["credits"],
                "plan_expires_at": (datetime.now(timezone.utc) + timedelta(days=366)).isoformat(),
            }},
        )

# ---------- Auth Routes ----------
@api.post("/auth/register")
async def register(req: RegisterReq, response: Response):
    email = req.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id,
        "email": email,
        "password_hash": hash_password(req.password),
        "name": req.name,
        "role": "user",
        "plan": "free",
        "ai_credits": PLANS["free"]["credits"],
        "plan_expires_at": None,
        "water_goal_ml": 2500,
        "selected_habits": [],
        "quiet_hours_start": "22:00",
        "quiet_hours_end": "07:00",
        "voice_reminders_enabled": False,
        "health_apple": False,
        "health_google": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "onboarded": False,
    }
    await db.users.insert_one(user)
    token = create_jwt(user_id, email)
    set_session_cookie(response, token)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"user": user, "token": token}

@api.post("/auth/login")
async def login(req: LoginReq, response: Response):
    email = req.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid email or password")
    token = create_jwt(user["user_id"], email)
    set_session_cookie(response, token)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"user": user, "token": token}

@api.post("/auth/google/session")
async def google_session(req: GoogleSessionReq, response: Response):
    """Exchange Emergent session_id for our JWT session."""
    async with httpx.AsyncClient(timeout=15) as cx:
        r = await cx.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": req.session_id},
        )
    if r.status_code != 200:
        raise HTTPException(401, "Invalid Google session")
    data = r.json()
    email = data["email"].lower()
    name = data.get("name", email.split("@")[0])
    picture = data.get("picture")

    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture, "last_login_at": datetime.now(timezone.utc).isoformat()}},
        )
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": "user",
            "plan": "free",
            "ai_credits": PLANS["free"]["credits"],
            "plan_expires_at": None,
            "water_goal_ml": 2500,
            "selected_habits": [],
            "quiet_hours_start": "22:00",
            "quiet_hours_end": "07:00",
            "voice_reminders_enabled": False,
            "health_apple": False,
            "health_google": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "onboarded": False,
            "auth_provider": "google",
        }
        await db.users.insert_one(user.copy())
        user.pop("_id", None)
    token = create_jwt(user_id, email)
    set_session_cookie(response, token)
    return {"user": user, "token": token}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

@api.post("/auth/logout")
async def logout(response: Response):
    clear_session_cookie(response)
    return {"ok": True}

# ---------- Onboarding & Settings ----------
@api.post("/onboarding")
async def onboarding(req: OnboardingReq, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "water_goal_ml": req.water_goal_ml,
            "selected_habits": req.selected_habits,
            "quiet_hours_start": req.quiet_hours_start,
            "quiet_hours_end": req.quiet_hours_end,
            "onboarded": True,
        }},
    )
    return {"ok": True}

@api.patch("/settings")
async def update_settings(req: SettingsReq, user: dict = Depends(get_current_user)):
    upd = {k: v for k, v in req.model_dump().items() if v is not None}
    if upd:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": upd})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return fresh

@api.get("/habits/catalog")
async def habit_catalog():
    return DEFAULT_HABITS

# ---------- Water ----------
@api.post("/water/log")
async def water_log(req: WaterLogReq, user: dict = Depends(get_current_user)):
    d = today_str()
    log_id = f"wl_{uuid.uuid4().hex[:10]}"
    await db.water_logs.insert_one({
        "log_id": log_id,
        "user_id": user["user_id"],
        "date": d,
        "amount_ml": req.amount_ml,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return await water_today_for(user["user_id"])

@api.get("/water/today")
async def water_today(user: dict = Depends(get_current_user)):
    return await water_today_for(user["user_id"])

async def water_today_for(user_id: str):
    d = today_str()
    cursor = db.water_logs.find({"user_id": user_id, "date": d}, {"_id": 0})
    total = 0
    entries = []
    async for doc in cursor:
        total += doc.get("amount_ml", 0)
        entries.append(doc)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "water_goal_ml": 1})
    goal = (user or {}).get("water_goal_ml", 2500)
    return {"date": d, "total_ml": total, "goal_ml": goal, "entries": entries}

# ---------- Habits ----------
@api.post("/habits/toggle")
async def habits_toggle(req: HabitToggleReq, user: dict = Depends(get_current_user)):
    d = req.on_date or today_str()
    await db.habit_logs.update_one(
        {"user_id": user["user_id"], "date": d, "habit_key": req.habit_key},
        {"$set": {
            "user_id": user["user_id"],
            "date": d,
            "habit_key": req.habit_key,
            "completed": req.completed,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return await habits_today_for(user["user_id"])

@api.get("/habits/today")
async def habits_today(user: dict = Depends(get_current_user)):
    return await habits_today_for(user["user_id"])

async def habits_today_for(user_id: str):
    d = today_str()
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    selected = (user or {}).get("selected_habits", []) or [h["key"] for h in DEFAULT_HABITS[:8]]
    logs = {}
    async for doc in db.habit_logs.find({"user_id": user_id, "date": d}, {"_id": 0}):
        logs[doc["habit_key"]] = doc["completed"]
    streaks = await calc_streaks_bulk(user_id, selected)
    return {
        "date": d,
        "selected": selected,
        "catalog": [h for h in DEFAULT_HABITS if h["key"] in selected],
        "today": logs,
        "streaks": streaks,
    }

async def calc_streaks_bulk(user_id: str, habit_keys: List[str]) -> dict:
    """Single date-range query then walk back per-habit. O(N log N) instead of O(60*K)."""
    if not habit_keys:
        return {}
    today = datetime.now(timezone.utc).date()
    start = (today - timedelta(days=60)).isoformat()
    end = today.isoformat()
    completed = {k: set() for k in habit_keys}
    async for doc in db.habit_logs.find(
        {"user_id": user_id, "habit_key": {"$in": habit_keys}, "date": {"$gte": start, "$lte": end}, "completed": True},
        {"_id": 0, "habit_key": 1, "date": 1},
    ):
        completed[doc["habit_key"]].add(doc["date"])
    out = {}
    for k in habit_keys:
        s = 0
        days = completed[k]
        for i in range(0, 61):
            d = (today - timedelta(days=i)).isoformat()
            if d in days:
                s += 1
            else:
                if i == 0:
                    continue
                break
        out[k] = s
    return out

async def calc_streak(user_id: str, habit_key: str) -> int:
    res = await calc_streaks_bulk(user_id, [habit_key])
    return res.get(habit_key, 0)

# ---------- Reminders ----------
@api.get("/reminders/today")
async def reminders_today(user: dict = Depends(get_current_user)):
    """Smart reminders based on what's not done today + water deficit."""
    out = []
    water = await water_today_for(user["user_id"])
    if water["total_ml"] < water["goal_ml"]:
        deficit = water["goal_ml"] - water["total_ml"]
        out.append({
            "id": f"rem_water_{today_str()}",
            "kind": "water",
            "title": "A gentle sip",
            "body": f"You're {deficit}ml away from your daily flow. A glass of water now feels good.",
            "icon": "droplet",
            "tone": "sage",
        })
    habits = await habits_today_for(user["user_id"])
    pending = [h for h in habits["catalog"] if not habits["today"].get(h["key"])]
    for h in pending[:4]:
        out.append({
            "id": f"rem_{h['key']}_{today_str()}",
            "kind": h["key"],
            "title": h["label"],
            "body": "Whenever you're ready — a small step counts.",
            "icon": h["icon"],
            "tone": "sand",
        })
    return {"reminders": out}

@api.post("/reminders/action")
async def reminders_action(req: ReminderActionReq, user: dict = Depends(get_current_user)):
    await db.reminder_actions.insert_one({
        "user_id": user["user_id"],
        "reminder_id": req.reminder_id,
        "action": req.action,
        "at": datetime.now(timezone.utc).isoformat(),
    })
    if req.action == "done" and req.reminder_id.startswith("rem_") and not req.reminder_id.startswith("rem_water_"):
        habit_key = req.reminder_id.split("_")[1]
        await db.habit_logs.update_one(
            {"user_id": user["user_id"], "date": today_str(), "habit_key": habit_key},
            {"$set": {"user_id": user["user_id"], "date": today_str(), "habit_key": habit_key, "completed": True, "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
    return {"ok": True}

# ---------- AI Coach ----------
COACH_SYSTEM = (
    "You are LifeCue Coach — a warm, calm wellness companion. You give brief, specific, actionable advice "
    "for daily habits, hydration, sleep, focus, breathing and gentle movement. Keep responses short "
    "(2-5 sentences for quick tips, longer plans for deeper questions). Never diagnose disease, never replace "
    "a doctor. If user mentions emergencies, severe symptoms, or self-harm, ask them to seek medical help "
    "immediately. Avoid guilt or shame — celebrate small wins."
)

@api.post("/coach/chat")
async def coach_chat(req: CoachChatReq, user: dict = Depends(get_current_user)):
    cost = TIER_COSTS[req.tier]
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    if (fresh.get("ai_credits") or 0) < cost:
        raise HTTPException(402, "Not enough credits — upgrade or wait for monthly refresh.")
    provider, model = TIER_MODELS[req.tier]
    session_id = req.session_id or f"sess_{user['user_id']}_{uuid.uuid4().hex[:8]}"
    reply = None
    last_err = None
    for prov, mdl in [(provider, model), TIER_FALLBACK]:
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=session_id,
                system_message=COACH_SYSTEM,
            ).with_model(prov, mdl)
            reply = await chat.send_message(UserMessage(text=req.message))
            model = mdl
            break
        except Exception as e:
            last_err = str(e)
            log.warning(f"LLM {prov}/{mdl} failed: {last_err[:200]}")
            continue
    if reply is None:
        log.error(f"Coach unavailable, last error: {last_err}")
        raise HTTPException(503, "Coach is resting for a moment — please try again shortly.")
    now = datetime.now(timezone.utc).isoformat()
    await db.coach_messages.insert_many([
        {"user_id": user["user_id"], "session_id": session_id, "role": "user", "text": req.message, "tier": req.tier, "created_at": now},
        {"user_id": user["user_id"], "session_id": session_id, "role": "assistant", "text": reply, "tier": req.tier, "model": model, "created_at": now},
    ])
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"ai_credits": -cost}})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return {"reply": reply, "tier": req.tier, "credits_used": cost, "credits_left": fresh["ai_credits"], "session_id": session_id, "model": model}

@api.get("/coach/history")
async def coach_history(session_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"user_id": user["user_id"]}
    if session_id:
        q["session_id"] = session_id
    msgs = []
    async for doc in db.coach_messages.find(q, {"_id": 0}).sort("created_at", 1).limit(200):
        msgs.append(doc)
    return {"messages": msgs}

# ---------- Razorpay ----------
@api.get("/billing/plans")
async def billing_plans():
    return {
        "plans": [
            {"id": "free", "label": "Free", "price_inr": 0, "price_inr_display": 0, "currency": "INR", "credits_monthly": PLANS["free"]["credits"], "features": ["3 habit slots", "30 AI credits / month", "Smart reminders"]},
            {"id": "monthly", "label": "Monthly", "price_inr": PLANS["monthly"]["price_inr"], "price_inr_display": 270, "currency": "INR", "credits_monthly": PLANS["monthly"]["credits"], "features": ["All habit slots", "600 AI credits", "Deep coaching access", "Push & voice reminders"]},
            {"id": "yearly",  "label": "Yearly",  "price_inr": PLANS["yearly"]["price_inr"],  "price_inr_display": 2430, "currency": "INR", "credits_monthly": PLANS["yearly"]["credits"],  "features": ["All habit slots", "9000 AI credits / year", "Deep coaching access", "Save 25% vs monthly"]},
        ],
        "razorpay_key_id": RAZORPAY_KEY_ID,
        "currency": "INR",
    }

@api.post("/billing/order")
async def billing_order(req: CreateOrderReq, user: dict = Depends(get_current_user)):
    plan = PLANS[req.plan]
    amount = plan["price_inr"]
    receipt = f"lc_{user['user_id'][:10]}_{uuid.uuid4().hex[:6]}"
    rzp = get_rzp()
    if rzp is None:
        if not DEV_MODE:
            raise HTTPException(503, "Payments are temporarily unavailable. Please try again later.")
        order_id = f"order_mock_{uuid.uuid4().hex[:14]}"
        log.warning("Razorpay client not initialized — using mock order (DEV_MODE)")
    else:
        try:
            order = rzp.order.create({"amount": amount, "currency": "INR", "receipt": receipt, "payment_capture": 1})
            order_id = order["id"]
        except Exception as e:
            log.exception("Razorpay order create failed")
            if DEV_MODE:
                order_id = f"order_mock_{uuid.uuid4().hex[:14]}"
            else:
                raise HTTPException(502, f"Could not create order: {str(e)[:120]}")
    await db.payments.insert_one({
        "order_id": order_id,
        "user_id": user["user_id"],
        "plan": req.plan,
        "amount": amount,
        "currency": "INR",
        "status": "created",
        "receipt": receipt,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"order_id": order_id, "amount": amount, "currency": "INR", "key_id": RAZORPAY_KEY_ID, "receipt": receipt, "plan": req.plan}

@api.post("/billing/verify")
async def billing_verify(req: VerifyPaymentReq, user: dict = Depends(get_current_user)):
    """Verify HMAC signature. Mock acceptance only in DEV_MODE."""
    is_mock = req.razorpay_order_id.startswith("order_mock_")
    if is_mock:
        if not DEV_MODE:
            raise HTTPException(400, "Invalid order")
        valid = True
    else:
        if not RAZORPAY_KEY_SECRET:
            raise HTTPException(503, "Payment verification unavailable")
        body = f"{req.razorpay_order_id}|{req.razorpay_payment_id}".encode()
        expected = hmac.new(RAZORPAY_KEY_SECRET.encode(), body, hashlib.sha256).hexdigest()
        valid = hmac.compare_digest(expected, req.razorpay_signature)
    if not valid:
        raise HTTPException(400, "Invalid signature")
    plan = PLANS[req.plan]
    expires = datetime.now(timezone.utc) + timedelta(days=plan["duration_days"])
    await db.payments.update_one(
        {"order_id": req.razorpay_order_id},
        {"$set": {
            "status": "paid",
            "payment_id": req.razorpay_payment_id,
            "signature": req.razorpay_signature,
            "verified_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "plan": req.plan,
            "plan_expires_at": expires.isoformat(),
            "ai_credits": plan["credits"],
        }},
    )
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return {"ok": True, "user": fresh}

@api.post("/billing/webhook")
async def billing_webhook(request: Request):
    """Razorpay webhook — verifies signature against RAZORPAY_WEBHOOK_SECRET."""
    body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")
    if not RAZORPAY_WEBHOOK_SECRET:
        log.warning("Webhook received but RAZORPAY_WEBHOOK_SECRET not set; ignoring")
        return {"status": "ignored"}
    expected = hmac.new(RAZORPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(400, "Invalid webhook signature")
    try:
        payload = json.loads(body.decode())
    except Exception:
        raise HTTPException(400, "Invalid JSON")
    event = payload.get("event")
    pay = (payload.get("payload") or {}).get("payment", {}).get("entity", {})
    order_id = pay.get("order_id")
    if order_id:
        await db.payments.update_one(
            {"order_id": order_id},
            {"$set": {"webhook_event": event, "webhook_received_at": datetime.now(timezone.utc).isoformat()}},
        )
    return {"status": "processed", "event": event}

# ---------- Push Notifications (FCM) ----------
@api.post("/push/register")
async def push_register(req: PushTokenReq, user: dict = Depends(get_current_user)):
    if not req.token or len(req.token) < 20:
        raise HTTPException(400, "Invalid token")
    await db.push_tokens.update_one(
        {"user_id": user["user_id"], "token": req.token},
        {"$set": {
            "user_id": user["user_id"],
            "token": req.token,
            "platform": req.platform,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"push_enabled": True}})
    return {"ok": True}

@api.post("/push/unregister")
async def push_unregister(req: PushTokenReq, user: dict = Depends(get_current_user)):
    await db.push_tokens.delete_one({"user_id": user["user_id"], "token": req.token})
    return {"ok": True}

@api.post("/push/test")
async def push_test(req: SendTestPushReq, user: dict = Depends(get_current_user)):
    """Send a test push to all of this user's registered devices."""
    init_firebase()
    if _fb_app is None:
        raise HTTPException(503, "Push service unavailable on server")
    tokens = []
    async for doc in db.push_tokens.find({"user_id": user["user_id"]}, {"_id": 0, "token": 1}):
        tokens.append(doc["token"])
    if not tokens:
        raise HTTPException(400, "No devices registered for push")
    try:
        # Send individually since send_each_for_multicast may not be available in all versions
        sent = 0
        failed = []
        for tok in tokens:
            try:
                msg = fb_messaging.Message(
                    notification=fb_messaging.Notification(title=req.title, body=req.body),
                    data={"kind": "test", "ts": datetime.now(timezone.utc).isoformat()},
                    token=tok,
                )
                fb_messaging.send(msg)
                sent += 1
            except Exception as e:
                failed.append({"token": tok[:20] + "…", "error": str(e)[:120]})
                # Clean up invalid token
                if "registration-token-not-registered" in str(e).lower() or "invalid-argument" in str(e).lower():
                    await db.push_tokens.delete_one({"user_id": user["user_id"], "token": tok})
        return {"sent": sent, "total": len(tokens), "failed": failed}
    except Exception as e:
        log.exception("FCM send failed")
        raise HTTPException(500, f"Push failed: {str(e)[:120]}")

# ---------- Privacy ----------
@api.get("/privacy/export")
async def privacy_export(user: dict = Depends(get_current_user)):
    out = {"user": user}
    for col in ["water_logs", "habit_logs", "coach_messages", "reminder_actions", "payments"]:
        items = []
        async for doc in db[col].find({"user_id": user["user_id"]}, {"_id": 0}):
            items.append(doc)
        out[col] = items
    return out

@api.delete("/privacy/account")
async def privacy_delete(response: Response, user: dict = Depends(get_current_user)):
    for col in ["water_logs", "habit_logs", "coach_messages", "reminder_actions", "payments"]:
        await db[col].delete_many({"user_id": user["user_id"]})
    await db.users.delete_one({"user_id": user["user_id"]})
    clear_session_cookie(response)
    return {"ok": True}

# ---------- Health Check ----------
@api.get("/health")
async def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}

app.include_router(api)
