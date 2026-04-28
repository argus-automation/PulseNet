"""
PulseNet – SpeedTest Tracker Backend
FastAPI · SQLAlchemy (SQLite / PostgreSQL / MySQL) · JWT Auth · APScheduler · Alerts
"""

import os, json, io, datetime, threading, logging, smtplib
from typing import Optional
from email.mime.text import MIMEText

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import StreamingResponse

from pydantic import BaseModel, EmailStr
from sqlalchemy import (create_engine, Column, Integer, Float, String,
                        DateTime, Boolean, Text, func)
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from jose import JWTError, jwt
import bcrypt
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import httpx
import speedtest as speedtest_lib

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ─── Config from env ─────────────────────────────────────────────────────────
SECRET_KEY       = os.getenv("SECRET_KEY", "insecure-dev-key-change-in-production")
ALGORITHM        = "HS256"
TOKEN_EXPIRE_MIN = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
DATABASE_URL     = os.getenv("DATABASE_URL", "sqlite:////data/speedtest.db")
ADMIN_USERNAME   = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_EMAIL      = os.getenv("ADMIN_EMAIL",    "admin@example.com")
ADMIN_PASSWORD   = os.getenv("ADMIN_PASSWORD", "Admin123!")
RESET_EMAIL      = os.getenv("RESET_PASSWORD_EMAIL", "")
RESET_NEWPASS    = os.getenv("RESET_PASSWORD_NEW",   "")

# ─── Database setup ──────────────────────────────────────────────────────────
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine       = create_engine(DATABASE_URL, connect_args=_connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base         = declarative_base()

# ─── Models ──────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String(100), unique=True, nullable=False, index=True)
    email         = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role          = Column(String(20),  default="user")   # "user" | "admin"
    avatar        = Column(Text,        nullable=True)    # base64 data-URL
    is_active     = Column(Boolean,     default=True)
    created_at    = Column(DateTime,    default=datetime.datetime.utcnow)


class SpeedTestResult(Base):
    __tablename__    = "speedtest_results"
    id               = Column(Integer,  primary_key=True, index=True)
    timestamp        = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    download_mbps    = Column(Float,    nullable=False)
    upload_mbps      = Column(Float,    nullable=False)
    ping_ms          = Column(Float,    nullable=False)
    server_name      = Column(String(200))
    server_sponsor   = Column(String(200))
    server_location  = Column(String(300))
    server_country   = Column(String(100))
    server_latency   = Column(Float)
    isp              = Column(String(200))
    ip_address       = Column(String(100))
    triggered_by     = Column(String(50), default="manual")


class ScheduleSetting(Base):
    __tablename__      = "schedule_settings"
    id                 = Column(Integer, primary_key=True)
    enabled            = Column(Boolean, default=False)
    interval_minutes   = Column(Integer, default=60)


class AlertConfig(Base):
    __tablename__       = "alert_configs"
    id                  = Column(Integer, primary_key=True)
    # Thresholds
    min_download_mbps   = Column(Float,   nullable=True)
    min_upload_mbps     = Column(Float,   nullable=True)
    max_ping_ms         = Column(Float,   nullable=True)
    cooldown_minutes    = Column(Integer, default=30)
    last_alerted        = Column(DateTime, nullable=True)
    # Discord
    discord_enabled     = Column(Boolean, default=False)
    discord_webhook_url = Column(Text,    nullable=True)
    # Telegram
    telegram_enabled    = Column(Boolean, default=False)
    telegram_bot_token  = Column(Text,    nullable=True)
    telegram_chat_id    = Column(String(100), nullable=True)
    # Email (SMTP)
    email_enabled       = Column(Boolean, default=False)
    email_smtp_host     = Column(String(200), nullable=True)
    email_smtp_port     = Column(Integer, default=587)
    email_smtp_user     = Column(String(200), nullable=True)
    email_smtp_pass     = Column(String(200), nullable=True)
    email_to            = Column(Text,    nullable=True)
    # Generic Webhook
    webhook_enabled     = Column(Boolean, default=False)
    webhook_url         = Column(Text,    nullable=True)
    webhook_method      = Column(String(10), default="POST")


Base.metadata.create_all(bind=engine)

# ─── Auth helpers ─────────────────────────────────────────────────────────────
oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_pw(pw: str) -> str:
    """Hash a password using bcrypt directly"""
    pw_bytes = pw.encode('utf-8')
    if len(pw_bytes) > 72:
        pw_bytes = pw_bytes[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pw_bytes, salt)
    return hashed.decode('utf-8')

def verify_pw(plain: str, hashed: str) -> bool:
    """Verify a password against its hash using bcrypt directly"""
    try:
        plain_bytes = plain.encode('utf-8')
        hashed_bytes = hashed.encode('utf-8')
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

def validate_password_length(pw: str) -> bool:
    """Check if password is valid for bcrypt (<=72 bytes)"""
    return len(pw.encode('utf-8')) <= 72

def make_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.datetime.utcnow() + datetime.timedelta(minutes=TOKEN_EXPIRE_MIN)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    exc = HTTPException(status_code=401, detail="Invalid or expired token",
                        headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise exc
    except JWTError:
        raise exc
    user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    if not user:
        raise exc
    return user

def require_admin(current: User = Depends(get_current_user)) -> User:
    if current.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current

# ─── FastAPI app ──────────────────────────────────────────────────────────────
app = FastAPI(title="PulseNet API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

# ─── Scheduler ────────────────────────────────────────────────────────────────
scheduler = BackgroundScheduler(timezone="UTC")
scheduler.start()

_is_running = False
_run_lock   = threading.Lock()

# ─── Alert sender ─────────────────────────────────────────────────────────────
def _send_alerts(result: dict):
    db = SessionLocal()
    try:
        cfg = db.query(AlertConfig).first()
        if not cfg:
            return

        reasons = []
        if cfg.min_download_mbps and result["download_mbps"] < cfg.min_download_mbps:
            reasons.append(f"Download {result['download_mbps']:.1f} Mbps < threshold {cfg.min_download_mbps} Mbps")
        if cfg.min_upload_mbps and result["upload_mbps"] < cfg.min_upload_mbps:
            reasons.append(f"Upload {result['upload_mbps']:.1f} Mbps < threshold {cfg.min_upload_mbps} Mbps")
        if cfg.max_ping_ms and result["ping_ms"] > cfg.max_ping_ms:
            reasons.append(f"Ping {result['ping_ms']:.1f} ms > threshold {cfg.max_ping_ms} ms")

        if not reasons:
            return

        # Cooldown check
        now = datetime.datetime.utcnow()
        if cfg.last_alerted:
            if now - cfg.last_alerted < datetime.timedelta(minutes=cfg.cooldown_minutes or 30):
                logger.info("Alert suppressed – cooldown active")
                return

        msg = (f"🚨 PulseNet Speed Alert\n\n" +
               "\n".join(f"• {r}" for r in reasons) +
               f"\n\nTest recorded at {result['timestamp']}")

        sent = False

        if cfg.discord_enabled and cfg.discord_webhook_url:
            try:
                with httpx.Client(timeout=10) as c:
                    c.post(cfg.discord_webhook_url, json={"content": msg})
                sent = True
                logger.info("Discord alert sent")
            except Exception as e:
                logger.error(f"Discord alert failed: {e}")

        if cfg.telegram_enabled and cfg.telegram_bot_token and cfg.telegram_chat_id:
            try:
                url = f"https://api.telegram.org/bot{cfg.telegram_bot_token}/sendMessage"
                with httpx.Client(timeout=10) as c:
                    c.post(url, json={"chat_id": cfg.telegram_chat_id, "text": msg, "parse_mode": "Markdown"})
                sent = True
                logger.info("Telegram alert sent")
            except Exception as e:
                logger.error(f"Telegram alert failed: {e}")

        if cfg.email_enabled and cfg.email_smtp_host and cfg.email_to:
            try:
                mime_msg = MIMEText(msg)
                mime_msg["Subject"] = "🚨 PulseNet Speed Alert"
                mime_msg["From"]    = cfg.email_smtp_user or "pulsenet@alerts"
                mime_msg["To"]      = cfg.email_to
                with smtplib.SMTP(cfg.email_smtp_host, cfg.email_smtp_port or 587) as s:
                    s.ehlo(); s.starttls(); s.ehlo()
                    if cfg.email_smtp_user and cfg.email_smtp_pass:
                        s.login(cfg.email_smtp_user, cfg.email_smtp_pass)
                    s.send_message(mime_msg)
                sent = True
                logger.info("Email alert sent")
            except Exception as e:
                logger.error(f"Email alert failed: {e}")

        if cfg.webhook_enabled and cfg.webhook_url:
            try:
                with httpx.Client(timeout=10) as c:
                    c.request(method=cfg.webhook_method or "POST", url=cfg.webhook_url,
                              json={"message": msg, "result": result})
                sent = True
                logger.info("Webhook alert sent")
            except Exception as e:
                logger.error(f"Webhook alert failed: {e}")

        if sent:
            cfg.last_alerted = now
            db.commit()

    finally:
        db.close()

# ─── Core speedtest ───────────────────────────────────────────────────────────
def _do_speedtest(triggered_by: str = "manual"):
    global _is_running
    with _run_lock:
        if _is_running:
            logger.warning("Speedtest already running – skipping")
            return None
        _is_running = True

    logger.info(f"Speedtest starting (triggered_by={triggered_by})")
    try:
        st = speedtest_lib.Speedtest(secure=True)
        st.get_best_server()
        st.download(threads=4)
        st.upload(threads=4)
        r = st.results.dict()

        db = SessionLocal()
        try:
            rec = SpeedTestResult(
                download_mbps   = r["download"] / 1_000_000,
                upload_mbps     = r["upload"]   / 1_000_000,
                ping_ms         = r["ping"],
                server_name     = r["server"].get("name", ""),
                server_sponsor  = r["server"].get("sponsor", ""),
                server_location = f"{r['server'].get('name','')}, {r['server'].get('country','')}",
                server_country  = r["server"].get("country", ""),
                server_latency  = r["server"].get("latency"),
                isp             = r.get("client", {}).get("isp", ""),
                ip_address      = r.get("client", {}).get("ip", ""),
                triggered_by    = triggered_by,
            )
            db.add(rec)
            db.commit()
            db.refresh(rec)
            logger.info(f"Speedtest done: ↓{rec.download_mbps:.1f}  ↑{rec.upload_mbps:.1f}  ping {rec.ping_ms:.1f}")
            result_dict = _row(rec)
        finally:
            db.close()

        # Fire alerts in background
        threading.Thread(target=_send_alerts, args=(result_dict,), daemon=True).start()
        return rec.id

    except Exception as e:
        logger.error(f"Speedtest failed: {e}", exc_info=True)
        return None
    finally:
        _is_running = False

def _scheduled_job():
    _do_speedtest("scheduled")

def _apply_schedule(cfg: dict):
    scheduler.remove_all_jobs()
    if cfg.get("enabled") and cfg.get("interval_minutes", 0) > 0:
        scheduler.add_job(
            _scheduled_job,
            IntervalTrigger(minutes=cfg["interval_minutes"]),
            id="auto_speedtest", replace_existing=True,
            next_run_time=datetime.datetime.utcnow() + datetime.timedelta(minutes=cfg["interval_minutes"]),
        )
        logger.info(f"Scheduler active – every {cfg['interval_minutes']} min")
    else:
        logger.info("Scheduler disabled")

# ─── DB helpers ──────────────────────────────────────────────────────────────
def _load_schedule() -> dict:
    db = SessionLocal()
    try:
        row = db.query(ScheduleSetting).first()
        if row:
            return {"enabled": row.enabled, "interval_minutes": row.interval_minutes}
        row = ScheduleSetting(enabled=False, interval_minutes=60)
        db.add(row); db.commit()
        return {"enabled": False, "interval_minutes": 60}
    finally:
        db.close()

def _save_schedule(cfg: dict):
    db = SessionLocal()
    try:
        row = db.query(ScheduleSetting).first()
        if not row:
            row = ScheduleSetting(); db.add(row)
        row.enabled = cfg["enabled"]
        row.interval_minutes = cfg["interval_minutes"]
        db.commit()
    finally:
        db.close()

def _row(r: SpeedTestResult) -> dict:
    return {
        "id": r.id,
        "timestamp": r.timestamp.isoformat() + "Z",
        "download_mbps":   round(r.download_mbps, 2),
        "upload_mbps":     round(r.upload_mbps,   2),
        "ping_ms":         round(r.ping_ms,        2),
        "server_name":     r.server_name,
        "server_sponsor":  r.server_sponsor,
        "server_location": r.server_location,
        "server_country":  r.server_country,
        "server_latency":  r.server_latency,
        "isp":             r.isp,
        "ip_address":      r.ip_address,
        "triggered_by":    r.triggered_by,
    }

# ─── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        # Force reset admin password on every startup to ensure it works
        admin = db.query(User).filter(
            (User.email == ADMIN_EMAIL) | (User.username == ADMIN_USERNAME)
        ).first()
        
        if admin:
            logger.info(f"Ensuring admin password is correct for {ADMIN_EMAIL}")
            # Always rehash to ensure compatibility
            admin.password_hash = hash_pw(ADMIN_PASSWORD)
            db.commit()
            logger.info("Admin password rehashed successfully")
        else:
            # Create admin if doesn't exist
            logger.info("No admin found, creating...")
            admin = User(
                username=ADMIN_USERNAME, 
                email=ADMIN_EMAIL,
                password_hash=hash_pw(ADMIN_PASSWORD), 
                role="admin",
                is_active=True
            )
            db.add(admin)
            db.commit()
            logger.info(f"Bootstrap admin created: {ADMIN_EMAIL}")

        # Password reset via env
        if RESET_EMAIL and RESET_NEWPASS:
            user = db.query(User).filter(User.email == RESET_EMAIL).first()
            if user:
                user.password_hash = hash_pw(RESET_NEWPASS)
                db.commit()
                logger.warning(f"Password reset applied for {RESET_EMAIL}")
            else:
                logger.warning(f"RESET_PASSWORD_EMAIL {RESET_EMAIL} not found")

        # Ensure one AlertConfig row exists
        if not db.query(AlertConfig).first():
            db.add(AlertConfig())
            db.commit()

    except Exception as e:
        logger.error(f"Startup error: {e}", exc_info=True)
    finally:
        db.close()

    _apply_schedule(_load_schedule())
    logger.info("Startup complete - bcrypt initialized")

# ─────────────────────────────────────────────────────────────────────────────
# Pydantic schemas
# ─────────────────────────────────────────────────────────────────────────────
class LoginReq(BaseModel):
    email: str
    password: str

class RegisterReq(BaseModel):
    username: str
    email: str
    password: str

class UpdateProfileReq(BaseModel):
    username: Optional[str] = None
    email:    Optional[str] = None
    avatar:   Optional[str] = None

class ChangePasswordReq(BaseModel):
    current_password: str
    new_password:     str

class ScheduleConfig(BaseModel):
    enabled:          bool
    interval_minutes: int

class AlertConfigSchema(BaseModel):
    min_download_mbps:   Optional[float] = None
    min_upload_mbps:     Optional[float] = None
    max_ping_ms:         Optional[float] = None
    cooldown_minutes:    int  = 30
    discord_enabled:     bool = False
    discord_webhook_url: Optional[str] = None
    telegram_enabled:    bool = False
    telegram_bot_token:  Optional[str] = None
    telegram_chat_id:    Optional[str] = None
    email_enabled:       bool = False
    email_smtp_host:     Optional[str] = None
    email_smtp_port:     int  = 587
    email_smtp_user:     Optional[str] = None
    email_smtp_pass:     Optional[str] = None
    email_to:            Optional[str] = None
    webhook_enabled:     bool = False
    webhook_url:         Optional[str] = None
    webhook_method:      str  = "POST"

class TestAlertReq(BaseModel):
    channel: str  # "discord" | "telegram" | "email" | "webhook"

class ChangeRoleReq(BaseModel):
    role: str  # "user" | "admin"

# ─────────────────────────────────────────────────────────────────────────────
# Auth routes
# ─────────────────────────────────────────────────────────────────────────────
def _user_dict(u: User) -> dict:
    return {"id": u.id, "username": u.username, "email": u.email,
            "role": u.role, "avatar": u.avatar, "created_at": u.created_at.isoformat()}

@app.post("/api/auth/login")
def login(req: LoginReq, db: Session = Depends(get_db)):
    user = (db.query(User)
            .filter((User.email == req.email) | (User.username == req.email))
            .filter(User.is_active == True)
            .first())
    if not user or not verify_pw(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = make_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": _user_dict(user)}

@app.post("/api/auth/register")
def register(req: RegisterReq, db: Session = Depends(get_db),
             _admin: User = Depends(require_admin)):
    """Only admins can create new users."""
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=409, detail="Username already taken")
    
    # Validate password length
    password_bytes = req.password.encode('utf-8')
    if len(password_bytes) > 72:
        raise HTTPException(400, "Password exceeds 72 bytes - please use a shorter password")
    
    user = User(username=req.username, email=req.email,
                password_hash=hash_pw(req.password), role="user")
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_dict(user)

@app.get("/api/auth/me")
def get_me(current: User = Depends(get_current_user)):
    return _user_dict(current)

@app.put("/api/auth/me")
def update_me(req: UpdateProfileReq, db: Session = Depends(get_db),
              current: User = Depends(get_current_user)):
    if req.username and req.username != current.username:
        if db.query(User).filter(User.username == req.username, User.id != current.id).first():
            raise HTTPException(400, "Username already taken")
        current.username = req.username
    if req.email and req.email != current.email:
        if db.query(User).filter(User.email == req.email, User.id != current.id).first():
            raise HTTPException(400, "Email already in use")
        current.email = req.email
    if req.avatar is not None:
        current.avatar = req.avatar
    db.commit(); db.refresh(current)
    return _user_dict(current)

@app.post("/api/auth/change-password")
def change_password(req: ChangePasswordReq, db: Session = Depends(get_db),
                    current: User = Depends(get_current_user)):
    if not verify_pw(req.current_password, current.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    
    # Validate password length for bcrypt
    if len(req.new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    
    # Check bcrypt 72-byte limit
    new_password_bytes = req.new_password.encode('utf-8')
    if len(new_password_bytes) > 72:
        raise HTTPException(400, "Password exceeds 72 bytes - please use a shorter password (max 72 characters for ASCII, fewer for Unicode)")
    
    current.password_hash = hash_pw(req.new_password)
    db.commit()
    return {"message": "Password updated"}


@app.post("/api/debug/login")
def debug_login(req: LoginReq):
    """Debug endpoint to check login"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(
            (User.email == req.email) | (User.username == req.email)
        ).first()
        
        if not user:
            return {"error": "User not found", "email": req.email}
        
        # Get the stored hash
        stored_hash = user.password_hash
        
        # Test with bcrypt directly
        try:
            test_bytes = req.password.encode('utf-8')
            hash_bytes = stored_hash.encode('utf-8')
            is_valid = bcrypt.checkpw(test_bytes, hash_bytes)
        except Exception as e:
            is_valid = False
            bcrypt_error = str(e)
        
        return {
            "user_found": True,
            "username": user.username,
            "email": user.email,
            "stored_hash_prefix": stored_hash[:30] if stored_hash else None,
            "password_provided": req.password,
            "bcrypt_verify_result": is_valid,
            "bcrypt_error": bcrypt_error if 'bcrypt_error' in locals() else None,
            "hash_length": len(stored_hash) if stored_hash else 0
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()


# ─── User management (admin) ─────────────────────────────────────────────────
@app.get("/api/users")
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return [_user_dict(u) for u in db.query(User).order_by(User.created_at).all()]

@app.put("/api/users/{user_id}/role")
def change_role(user_id: int, req: ChangeRoleReq, db: Session = Depends(get_db),
                current: User = Depends(require_admin)):
    if req.role not in ("user", "admin"):
        raise HTTPException(400, "Role must be 'user' or 'admin'")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == current.id:
        raise HTTPException(400, "Cannot change your own role")
    user.role = req.role; db.commit()
    return _user_dict(user)

@app.delete("/api/users/{user_id}", status_code=204)
def deactivate_user(user_id: int, db: Session = Depends(get_db),
                    current: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == current.id:
        raise HTTPException(400, "Cannot deactivate yourself")
    user.is_active = False; db.commit()

# ─── Health ───────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}

# ─── Public stats (no auth — safe for login page) ────────────────────────────
@app.get("/api/public/stats")
def public_stats():
    """
    Returns a small, safe subset of stats for the login page panel.
    No authentication required. Never exposes user data or sensitive info.
    """
    db = SessionLocal()
    try:
        total = db.query(func.count(SpeedTestResult.id)).scalar() or 0
        latest = (db.query(SpeedTestResult)
                  .order_by(SpeedTestResult.timestamp.desc())
                  .first())
        schedule = _load_schedule()
        job = scheduler.get_job("auto_speedtest")
        next_run = job.next_run_time.isoformat() if (job and job.next_run_time) else None

        # 24-hour averages
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
        rows_24h = (db.query(SpeedTestResult)
                    .filter(SpeedTestResult.timestamp >= cutoff)
                    .all())

        avg_dl = round(sum(r.download_mbps for r in rows_24h) / len(rows_24h), 2) if rows_24h else None
        avg_ul = round(sum(r.upload_mbps   for r in rows_24h) / len(rows_24h), 2) if rows_24h else None
        avg_pg = round(sum(r.ping_ms       for r in rows_24h) / len(rows_24h), 2) if rows_24h else None

        return {
            "total_tests":       total,
            "tests_last_24h":    len(rows_24h),
            "is_running":        _is_running,
            "schedule_enabled":  schedule.get("enabled", False),
            "interval_minutes":  schedule.get("interval_minutes", 60),
            "next_run":          next_run,
            "latest": {
                "timestamp":    latest.timestamp.isoformat() + "Z",
                "download_mbps": round(latest.download_mbps, 2),
                "upload_mbps":   round(latest.upload_mbps,   2),
                "ping_ms":       round(latest.ping_ms,        2),
            } if latest else None,
            "avg_24h": {
                "download_mbps": avg_dl,
                "upload_mbps":   avg_ul,
                "ping_ms":       avg_pg,
            } if rows_24h else None,
        }
    finally:
        db.close()

# ─── Speedtest ────────────────────────────────────────────────────────────────
@app.post("/api/speedtest/run")
def run_test(background_tasks: BackgroundTasks, _: User = Depends(get_current_user)):
    if _is_running:
        raise HTTPException(409, "A speed test is already in progress")
    background_tasks.add_task(_do_speedtest, "manual")
    return {"message": "Speed test started", "status": "running"}

@app.get("/api/speedtest/status")
def get_status(_: User = Depends(get_current_user)):
    cfg = _load_schedule()
    job = scheduler.get_job("auto_speedtest")
    return {
        "is_running": _is_running,
        "schedule":   cfg,
        "next_scheduled_run": job.next_run_time.isoformat() if job and job.next_run_time else None,
    }


# ─── Results ─────────────────────────────────────────────────────────────────
@app.get("/api/results")
def list_results(skip: int = 0, limit: int = 200, _: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        total = db.query(func.count(SpeedTestResult.id)).scalar()
        rows  = (db.query(SpeedTestResult)
                 .order_by(SpeedTestResult.timestamp.desc())
                 .offset(skip).limit(limit).all())
        return {"results": [_row(r) for r in rows], "total": total}
    finally:
        db.close()

@app.get("/api/results/latest")
def get_latest(_: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        r = db.query(SpeedTestResult).order_by(SpeedTestResult.timestamp.desc()).first()
        if not r: raise HTTPException(404, "No results yet")
        return _row(r)
    finally:
        db.close()

@app.get("/api/results/{result_id}")
def get_result(result_id: int, _: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        r = db.query(SpeedTestResult).filter(SpeedTestResult.id == result_id).first()
        if not r: raise HTTPException(404, "Not found")
        return _row(r)
    finally:
        db.close()

@app.delete("/api/results/{result_id}", status_code=204)
def delete_result(result_id: int, db: Session = Depends(get_db),
                  _: User = Depends(require_admin)):
    r = db.query(SpeedTestResult).filter(SpeedTestResult.id == result_id).first()
    if not r: raise HTTPException(404, "Not found")
    db.delete(r); db.commit()

@app.delete("/api/results", status_code=204)
def delete_all(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    db.query(SpeedTestResult).delete(); db.commit()

# ─── Stats ────────────────────────────────────────────────────────────────────
@app.get("/api/stats")
def get_stats(_: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        rows = db.query(SpeedTestResult).order_by(SpeedTestResult.timestamp.asc()).all()
        if not rows: return {"count": 0}
        dl = [r.download_mbps for r in rows]
        ul = [r.upload_mbps   for r in rows]
        pg = [r.ping_ms       for r in rows]
        return {
            "count":        len(rows),
            "avg_download": round(sum(dl)/len(dl), 2),
            "avg_upload":   round(sum(ul)/len(ul), 2),
            "avg_ping":     round(sum(pg)/len(pg), 2),
            "max_download": round(max(dl), 2),
            "max_upload":   round(max(ul), 2),
            "min_ping":     round(min(pg), 2),
            "latest":       _row(rows[-1]),
        }
    finally:
        db.close()

# ─── Schedule ─────────────────────────────────────────────────────────────────
@app.get("/api/schedule")
def get_schedule(_: User = Depends(get_current_user)):
    return _load_schedule()

@app.post("/api/schedule")
def update_schedule(cfg: ScheduleConfig, _: User = Depends(require_admin)):
    d = cfg.dict(); _save_schedule(d); _apply_schedule(d)
    return d

# ─── Alert Config ─────────────────────────────────────────────────────────────
def _alert_dict(a: AlertConfig) -> dict:
    return {k: getattr(a, k) for k in AlertConfigSchema.model_fields}

@app.get("/api/alert-config")
def get_alert_config(_: User = Depends(require_admin)):
    db = SessionLocal()
    try:
        a = db.query(AlertConfig).first()
        return _alert_dict(a)
    finally:
        db.close()

@app.put("/api/alert-config")
def update_alert_config(req: AlertConfigSchema, _: User = Depends(require_admin)):
    db = SessionLocal()
    try:
        a = db.query(AlertConfig).first()
        if not a:
            a = AlertConfig(); db.add(a)
        for k, v in req.dict().items():
            setattr(a, k, v)
        db.commit(); db.refresh(a)
        return _alert_dict(a)
    finally:
        db.close()

@app.post("/api/alert-config/test")
def test_alert(req: TestAlertReq, _: User = Depends(require_admin)):
    db = SessionLocal()
    try:
        cfg = db.query(AlertConfig).first()
        if not cfg:
            raise HTTPException(404, "No alert config")
    finally:
        db.close()

    test_result = {
        "download_mbps": 0.5, "upload_mbps": 0.3, "ping_ms": 999,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "server_name": "Test Server", "isp": "Test ISP",
    }

    msg = "🔔 PulseNet test notification – if you see this, your alert channel is working correctly!"

    try:
        ch = req.channel
        if ch == "discord" and cfg.discord_webhook_url:
            with httpx.Client(timeout=10) as c:
                r = c.post(cfg.discord_webhook_url, json={"content": msg})
            return {"ok": True, "status": r.status_code}

        elif ch == "telegram" and cfg.telegram_bot_token and cfg.telegram_chat_id:
            url = f"https://api.telegram.org/bot{cfg.telegram_bot_token}/sendMessage"
            with httpx.Client(timeout=10) as c:
                r = c.post(url, json={"chat_id": cfg.telegram_chat_id, "text": msg})
            return {"ok": True, "status": r.status_code}

        elif ch == "webhook" and cfg.webhook_url:
            with httpx.Client(timeout=10) as c:
                r = c.request(method=cfg.webhook_method or "POST",
                              url=cfg.webhook_url, json={"message": msg})
            return {"ok": True, "status": r.status_code}

        elif ch == "email" and cfg.email_smtp_host and cfg.email_to:
            mime_msg = MIMEText(msg)
            mime_msg["Subject"] = "🔔 PulseNet Test Alert"
            mime_msg["From"]    = cfg.email_smtp_user or "pulsenet@test"
            mime_msg["To"]      = cfg.email_to
            with smtplib.SMTP(cfg.email_smtp_host, cfg.email_smtp_port or 587) as s:
                s.ehlo(); s.starttls(); s.ehlo()
                if cfg.email_smtp_user and cfg.email_smtp_pass:
                    s.login(cfg.email_smtp_user, cfg.email_smtp_pass)
                s.send_message(mime_msg)
            return {"ok": True}

        else:
            raise HTTPException(400, f"Channel '{ch}' not configured or unknown")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

# ─── Backup / Restore ─────────────────────────────────────────────────────────
@app.get("/api/backup")
def backup(_: User = Depends(require_admin)):
    db = SessionLocal()
    try:
        rows = db.query(SpeedTestResult).order_by(SpeedTestResult.timestamp.asc()).all()
        payload = {
            "version":     "2.0",
            "app":         "pulsenet",
            "exported_at": datetime.datetime.utcnow().isoformat() + "Z",
            "total":       len(rows),
            "results":     [_row(r) for r in rows],
        }
        content = json.dumps(payload, indent=2)
        filename = f"pulsenet-backup-{datetime.date.today()}.json"
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    finally:
        db.close()

@app.post("/api/restore")
def restore(file: UploadFile = File(...), _: User = Depends(require_admin)):
    db = SessionLocal()
    try:
        raw = file.file.read()
        payload = json.loads(raw)
        if payload.get("app") != "pulsenet":
            raise HTTPException(400, "Invalid backup file – not a PulseNet backup")

        inserted = 0
        for r in payload.get("results", []):
            # Skip if ID already exists
            if db.query(SpeedTestResult).filter(SpeedTestResult.id == r["id"]).first():
                continue
            rec = SpeedTestResult(
                id            = r["id"],
                timestamp     = datetime.datetime.fromisoformat(r["timestamp"].replace("Z", "")),
                download_mbps = r["download_mbps"],
                upload_mbps   = r["upload_mbps"],
                ping_ms       = r["ping_ms"],
                server_name   = r.get("server_name"),
                server_sponsor= r.get("server_sponsor"),
                server_location=r.get("server_location"),
                server_country= r.get("server_country"),
                server_latency= r.get("server_latency"),
                isp           = r.get("isp"),
                ip_address    = r.get("ip_address"),
                triggered_by  = r.get("triggered_by", "restored"),
            )
            db.add(rec)
            inserted += 1

        db.commit()
        return {"message": f"Restored {inserted} records", "inserted": inserted,
                "skipped": len(payload.get("results", [])) - inserted}
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON file")
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
