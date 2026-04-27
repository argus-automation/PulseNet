# ⚡ PulseNet — SpeedTest Tracker

> A self-hosted, full-stack internet speed test tracking application with automated scheduling, role-based authentication, multi-database support, threshold alerting, and a modern dark/light UI.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Quick Start with Docker](#quick-start-with-docker)
  - [Database Options](#database-options)
  - [Local Development (No Docker)](#local-development-no-docker)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Password Management](#password-management)
- [Authentication & Roles](#authentication--roles)
  - [Role Permission Matrix](#role-permission-matrix)
- [Pages & Features](#pages--features)
  - [Login](#login)
  - [Dashboard](#dashboard)
  - [History](#history)
  - [Auto-Schedule](#auto-schedule)
  - [Settings](#settings)
- [Alert Channels](#alert-channels)
- [Backup & Restore](#backup--restore)
- [API Reference](#api-reference)
- [Docker Reference](#docker-reference)
- [Roadmap](#roadmap)

---

## Overview

PulseNet is a self-hosted SpeedTest Tracker that runs Ookla-powered speed tests on demand or on a configurable schedule, stores every result in a database, and presents everything through a responsive React dashboard. It is built to run entirely in Docker with a single command and supports SQLite, PostgreSQL, and MySQL/MariaDB out of the box.

---

## Features

### Core
- **On-demand speed tests** — trigger a test instantly from the dashboard with one click
- **Auto-scheduling** — set tests to run every 5 minutes up to every 24 hours (or any custom interval)
- **Persistent results** — every test is stored with full metadata: download, upload, ping, server, ISP, and IP address
- **Live status indicator** — the sidebar shows whether a test is currently running in real time

### Visualisation
- **Animated speed gauges** — smooth arc gauges for download, upload, and latency on the dashboard
- **Time-range charts** — interactive line charts with a range selector (5 min → 30 days → All) and smart X-axis labels that adapt to the visible span (seconds, minutes, hours, or dates)
- **Metric toggles** — show or hide download, upload, and ping lines independently

### Data Management
- **Full history table** — paginated results with server sponsor, ISP column, triggered-by badge, and per-row detail modal
- **Export results** — download all results as CSV, XLSX, or PDF directly from the History page
- **Backup & restore** — admin can download a full JSON backup and re-import it on any PulseNet instance
- **Delete controls** — delete individual results or wipe all data (admin only)

### Authentication
- **JWT-based auth** — secure token authentication with configurable expiry (default 24 hours)
- **Two roles** — `admin` and `user` with a clearly defined permission boundary
- **Bootstrap admin** — the first admin account is created automatically from `.env` on first run
- **Password reset via `.env`** — no email server needed; set `RESET_PASSWORD_EMAIL` + `RESET_PASSWORD_NEW`, restart, done

### Alerting
- **Threshold-based alerts** — fire when download drops below a minimum, upload drops below a minimum, or ping spikes above a maximum
- **Alert cooldown** — configurable quiet period to prevent notification spam
- **Four channels** — Discord webhook, Telegram bot, SMTP email, and generic HTTP webhook
- **Test notifications** — send a test message to any configured channel without waiting for a threshold breach

### UI / UX
- **Dark and light themes** — switch instantly from any page; preference is saved to `localStorage`
- **Collapsible sidebar** — collapses to an icon rail; all nav items remain accessible via tooltips
- **Responsive login page** — split-screen layout on desktop with animated speed-pulse graphic; single-column on mobile
- **Settings page** — profile management (avatar, username, email, password with strength meter), user management, backup/restore, and alert configuration all in one place

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend | Python, FastAPI | 3.11 / 0.115 |
| Speed tests | speedtest-cli (Ookla) | 2.1.3 |
| ORM | SQLAlchemy | 2.0 |
| Scheduler | APScheduler | 3.10 |
| Auth | python-jose (JWT) + bcrypt | 3.3 / 4.0 |
| HTTP client | httpx (for alerts) | 0.27 |
| Frontend | React + Vite | 18 / 5 |
| Charts | Recharts | 2.13 |
| Routing | react-router-dom | 6 |
| Date handling | date-fns | 4 |
| Export | xlsx (SheetJS), jsPDF | — |
| Web server | Nginx | 1.27 |
| Database | SQLite / PostgreSQL 16 / MariaDB 11 | — |
| Container | Docker + Docker Compose | — |

---

## Project Structure

```
speedtest-tracker/
├── backend/
│   ├── main.py               # FastAPI app — routes, models, scheduler, alerts, auth
│   ├── requirements.txt      # Python dependencies
│   ├── .env                  # Environment config (credentials, DB URL, secret key)
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── index.js          # API client with JWT injection and 401 handling
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx   # Auth state, login/logout, user object
│   │   │   └── ThemeContext.jsx  # Dark/light theme state and localStorage sync
│   │   ├── components/
│   │   │   ├── Sidebar.jsx       # Collapsible nav with theme toggle and logout
│   │   │   ├── SpeedGauge.jsx    # Animated SVG arc gauge
│   │   │   ├── ResultsChart.jsx  # Time-range chart with smart axis labels
│   │   │   ├── ResultsTable.jsx  # Results table with ISP column and detail modal
│   │   │   ├── ResultDetail.jsx  # Per-result modal with full metadata
│   │   │   ├── ExportMenu.jsx    # CSV / XLSX / PDF export dropdown
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── StatCard.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx         # Split-screen login with theme toggle
│   │   │   ├── Dashboard.jsx     # Gauges, session stats, speed history chart
│   │   │   ├── History.jsx       # Full chart + paginated results table + export
│   │   │   ├── Schedule.jsx      # Auto-schedule config with live countdown
│   │   │   └── Settings.jsx      # Profile, backup/restore, alerts, user management
│   │   ├── App.jsx               # Router, sidebar state, auth guard
│   │   ├── main.jsx
│   │   └── index.css             # CSS variables, dark + light themes, global styles
│   ├── nginx.conf                # Nginx SPA config + /api reverse proxy
│   ├── Dockerfile                # Multi-stage build (Node build → Nginx serve)
│   ├── index.html
│   └── package.json
│
├── docker-compose.yml            # All services + optional DB profiles
└── README.md
```

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) v2.0+ (included with Docker Desktop)

That is all. No Node.js, Python, or database installation needed for the Docker path.

### Quick Start with Docker

```bash
# 1. Clone or extract the project
cd speedtest-tracker

# 2. (Optional) Edit credentials before first run
nano backend/.env

# 3. Build and start
docker compose up --build -d

# 4. Open in browser
open http://localhost:3000

# 5. View live logs
docker compose logs -f
```

The application will be available at **http://localhost:3000**.

Default login credentials (set in `backend/.env`):

| Field | Default value |
|---|---|
| Email or username | `admin@example.com` or `admin` |
| Password | `Admin123!` |

> **Important:** Change the `ADMIN_PASSWORD` and `SECRET_KEY` in `backend/.env` before any production or internet-facing deployment.

---

### Database Options

PulseNet supports three database engines. Select one by setting `DATABASE_URL` in `backend/.env` and using the matching Docker Compose profile.

#### SQLite (default — no extra setup)

```bash
# backend/.env
DATABASE_URL=sqlite:////data/speedtest.db

# Start
docker compose up --build -d
```

Best for: single-user, home lab, or evaluation. Data is stored in a named Docker volume.

#### PostgreSQL (recommended for production)

```bash
# backend/.env
DATABASE_URL=postgresql://pulsenet:pulsenet_secret@postgres:5432/pulsenet

# Start with the postgres profile
docker compose --profile postgres up --build -d
```

#### MySQL / MariaDB

```bash
# backend/.env
DATABASE_URL=mysql+pymysql://pulsenet:pulsenet_secret@mysql:3306/pulsenet

# Start with the mysql profile
docker compose --profile mysql up --build -d
```

| | SQLite | PostgreSQL | MySQL/MariaDB |
|---|---|---|---|
| Setup required | None | Automatic | Automatic |
| Production ready | ⚠️ Limited | ✅ Yes | ✅ Yes |
| Recommended for | Dev / home lab | Production | Production |
| Docker profile | *(default)* | `postgres` | `mysql` |

---

### Local Development (No Docker)

#### Backend

**1. Navigate to the backend directory**

```bash
cd backend
```

**2. Create and activate a virtual environment**

```bash
python -m venv venv
```

Activate it based on your operating system:

| OS | Command |
|---|---|
| Linux / macOS / WSL | `source venv/bin/activate` |
| Windows (CMD) | `venv\Scripts\activate.bat` |
| Windows (PowerShell) | `venv\Scripts\Activate.ps1` |

You should see `(venv)` prefixed in your terminal prompt once active.

**3. Install dependencies**

```bash
pip install -r requirements.txt
```

**4. Create the local data directory**

SQLite needs a folder to write the database file into. Create one inside the
backend directory:

```bash
mkdir -p data
```

**5. Configure the environment file**

Copy the default env file:

```bash
cp .env .env.local
```

Open `.env` and update the `DATABASE_URL` from the Docker absolute path to a
relative path that works on your local machine:

```env
# BEFORE — Docker only (requires the /data volume to be mounted):
DATABASE_URL=sqlite:////data/speedtest.db

# AFTER — Local development (stores the database inside the project):
DATABASE_URL=sqlite:///./data/speedtest.db
```

> [!Note] Why the difference?
> SQLite connection strings follow this convention:
> - `sqlite:///./data/speedtest.db` — **three slashes** = relative path from
>   the working directory. Works anywhere.
> - `sqlite:////data/speedtest.db` — **four slashes** = absolute path starting
>   at `/data`. Only works inside Docker where that volume is mounted.
>
> When switching back to Docker, revert this line to four slashes.


> [!Tip]
> Optionally, add the local data folder to `.gitignore` so the database file is
never accidentally committed to version control:
>
> ```bash
> echo "backend/data/" >> ../.gitignore
> ```

**6. Start the development server**

```bash
uvicorn main:app --reload --port 8000
```

The `--reload` flag watches for file changes and restarts the server
automatically — useful during development.

| URL | Description |
|---|---|
| `http://localhost:8000` | REST API base |
| `http://localhost:8000/docs` | Interactive Swagger UI |
| `http://localhost:8000/redoc` | ReDoc API documentation |


##### Notes for WSL Users

If you are running on Windows Subsystem for Linux and would prefer to keep the
`DATABASE_URL` unchanged (four slashes), you can instead create the `/data`
directory directly on WSL:

```bash
sudo mkdir -p /data
sudo chown $USER:$USER /data
```

The backend will then be able to create the database file at `/data/speedtest.db`
exactly as it does inside Docker. The relative path method described in Step 5
is still recommended as it keeps everything self-contained within the project
folder and avoids writing outside the project tree.

---

##### Switching Back to Docker

When you are done with local development and want to run via Docker Compose again,
remember to revert the `DATABASE_URL` in `backend/.env`:

```env
# Revert to this for Docker:
DATABASE_URL=sqlite:////data/speedtest.db
```

Then rebuild and start:

```bash
docker compose up --build -d
```


---

#### Frontend

Open a second terminal, navigate to the frontend directory, and run:

```bash
cd frontend
npm install
npm run dev     # Starts on http://localhost:3000
```

The Vite dev server proxies all `/api` requests to `http://localhost:8000`
automatically — no extra configuration needed.

| URL | Description |
|---|---|
| `http://localhost:3000` | React application |


---

## Configuration

### Environment Variables

All configuration lives in `backend/.env`. The file is read at container startup.

```env
# ── Database ─────────────────────────────────────────────────────
DATABASE_URL=sqlite:////data/speedtest.db
# DATABASE_URL=postgresql://pulsenet:secret@postgres:5432/pulsenet
# DATABASE_URL=mysql+pymysql://pulsenet:secret@mysql:3306/pulsenet

# ── Security ─────────────────────────────────────────────────────
# Generate a strong key with: openssl rand -hex 32
SECRET_KEY=replace-this-with-a-random-64-character-string
ACCESS_TOKEN_EXPIRE_MINUTES=1440     # 24 hours

# ── Bootstrap Admin ──────────────────────────────────────────────
# Applied (or re-applied) on every container restart.
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin123!

# ── Password Reset ───────────────────────────────────────────────
# Uncomment both lines, restart the backend, then comment out again.
# RESET_PASSWORD_EMAIL=user@example.com
# RESET_PASSWORD_NEW=NewStrongPassword456!
```

### Password Management

#### Changing the admin password

1. Edit `backend/.env` — update `ADMIN_PASSWORD` to the new value.
2. Restart the backend: `docker compose restart backend`
3. The new password is applied automatically on startup.

#### Resetting a forgotten user password

1. In `backend/.env`, uncomment and fill in:
   ```env
   RESET_PASSWORD_EMAIL=the-users-email@example.com
   RESET_PASSWORD_NEW=TheirNewPassword123!
   ```
2. Restart: `docker compose restart backend`
3. The password is updated and the env vars are cleared from memory. Comment the lines out again to keep the file clean.

#### Generating a secure SECRET_KEY

```bash
openssl rand -hex 32
```

Paste the output as the value of `SECRET_KEY`. Never commit this value to version control.

---

## Authentication & Roles

Authentication uses **JWT bearer tokens**. Tokens are issued on login and expire after `ACCESS_TOKEN_EXPIRE_MINUTES` (default 24 hours). Tokens are stored in `localStorage` and automatically attached to every API request.

New user accounts can only be created by an admin through **Settings → Users**.

### Role Permission Matrix

| Action | User | Admin |
|---|---|---|
| Sign in | ✅ | ✅ |
| Run a manual speed test | ✅ | ✅ |
| View all test results | ✅ | ✅ |
| View individual result details | ✅ | ✅ |
| Export results (CSV / XLSX / PDF) | ✅ | ✅ |
| Change own avatar, username, email | ✅ | ✅ |
| Change own password | ✅ | ✅ |
| Configure auto-schedule | ❌ | ✅ |
| Delete individual results | ❌ | ✅ |
| Delete all results | ❌ | ✅ |
| Download backup | ❌ | ✅ |
| Restore from backup | ❌ | ✅ |
| Configure alert thresholds | ❌ | ✅ |
| Configure notification channels | ❌ | ✅ |
| Test alert channels | ❌ | ✅ |
| Create new user accounts | ❌ | ✅ |
| Change user roles | ❌ | ✅ |
| Deactivate user accounts | ❌ | ✅ |

---

## Pages & Features

### Login

A split-screen page with an animated speed-pulse graphic on the left and the sign-in form on the right. On mobile the branding panel collapses to a compact logo. A dark/light theme toggle is available in the top-right corner before authentication.

The "Create Account" tab explains that new accounts are created by an admin — it does not expose a public registration form.

### Dashboard

The main view after login. Contains:

- **Four equal-height metric cards** across the top:
  - Download speed gauge (animated arc, 0–200 Mbps)
  - Upload speed gauge (animated arc, 0–200 Mbps)
  - Latency / Ping with a colour-coded quality bar (Excellent / Good / Fair / High)
  - Session Stats — count, averages, and peaks for the current dataset

- **Speed History chart** — a time-series line chart showing download (cyan), upload (orange), and ping (green dashed) with:
  - A **time range dropdown** (top-right): Last 5 min, 30 min, 1 hr, 6 hr, 24 hr, 7 days, 30 days, All
  - Smart X-axis labels that automatically switch between `HH:mm:ss`, `HH:mm`, `Mon HH:mm`, or `Jan 5` depending on the visible span
  - Per-metric toggle pills to show or hide individual lines

- **Latest test info bar** — server name, ISP, and IP address from the most recent result with a "View details" button

### History

Full test history with:

- The same time-range chart as the dashboard (with range selector)
- A **view switcher**: Chart only, Table only, or Both
- A **results table** with columns: ID, Timestamp, Download, Upload, Ping, Server (sponsor name), ISP, Triggered By
- **Per-row actions**: click any row to open a detail modal; trash icon for quick delete (admin only)
- **Export dropdown** in the toolbar: CSV, XLSX, or PDF
- **Clear all** button with a confirmation step (admin only)

### Auto-Schedule

Two-column layout:

- **Left panel** — enable/disable toggle, interval preset pills (5 min → 24 hr), and a custom minute input with a Save button
- **Right panel** — live status card with a **countdown timer** (ticks every second) showing time until the next scheduled run, plus a list of the four most recent scheduled results

The schedule configuration persists to the database and is restored automatically on container restart.

### Settings

A tabbed settings page. Tabs visible to all users:

**Profile** — upload an avatar image, change display name and email, change password with a real-time strength meter (5 checks: length, uppercase, lowercase, number, special character).

Additional tabs visible to admins only:

**Backup & Restore** — download all speed test results as a JSON file, or upload a previously exported file to restore records. Existing records (matched by ID) are skipped; only new records are inserted. The backup format is documented in the [Backup & Restore](#backup--restore) section.

**Alerts** — configure speed thresholds and notification channels (see [Alert Channels](#alert-channels)).

**Users** — a table of all registered accounts with inline role selector and deactivate action. A "New user" form lets admins create accounts for others.

---

## Alert Channels

Alerts are checked after every speed test (manual or scheduled). An alert fires when any of the configured thresholds are breached, subject to the cooldown period.

Channels are arranged in a **2 × 2 grid** in Settings → Alerts:

| Channel | What you need |
|---|---|
| **Discord** | A webhook URL from Server Settings → Integrations → Webhooks |
| **Telegram** | A bot token from @BotFather and a chat/group ID from @userinfobot |
| **Email (SMTP)** | SMTP host, port, username, password, and a recipient address |
| **Generic Webhook** | Any URL that accepts POST (or PUT) with a JSON body |

### Threshold fields

| Field | Description |
|---|---|
| Min download (Mbps) | Alert if download falls below this value |
| Min upload (Mbps) | Alert if upload falls below this value |
| Max ping (ms) | Alert if ping exceeds this value |
| Cooldown (minutes) | Minimum gap between consecutive alerts (default 30) |

Each channel has a **Send test** button that fires an immediate test notification without needing a threshold breach.

### Alert message format

```
🚨 PulseNet Speed Alert

• Download 3.2 Mbps < threshold 10 Mbps
• Ping 187.4 ms > threshold 100 ms

Test recorded at 2026-04-27T08:14:00Z
```

---

## Backup & Restore

### Backup format

Backups are JSON files with the following structure:

```json
{
  "version": "2.0",
  "app": "pulsenet",
  "exported_at": "2026-04-27T08:00:00Z",
  "total": 142,
  "results": [
    {
      "id": 1,
      "timestamp": "2026-04-20T10:00:00Z",
      "download_mbps": 47.23,
      "upload_mbps": 18.91,
      "ping_ms": 22.5,
      "server_name": "Nairobi IXP",
      "server_sponsor": "Safaricom",
      "server_location": "Nairobi, Kenya",
      "server_country": "Kenya",
      "isp": "Safaricom",
      "ip_address": "105.163.x.x",
      "triggered_by": "scheduled"
    }
  ]
}
```

User accounts and passwords are **not included** in backups. The backup file is safe to share for data migration purposes.

### Restore behaviour

- Records whose `id` already exists in the target database are **skipped** (no overwrite).
- Only genuinely new records are inserted.
- A summary is shown: `Restored 98 records · Skipped 44`.

---

## API Reference

All endpoints are prefixed with `/api`. Authenticated endpoints require a `Bearer` token in the `Authorization` header.

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | None | Sign in; returns JWT + user object |
| `GET` | `/api/auth/me` | User | Get current user profile |
| `PUT` | `/api/auth/me` | User | Update username, email, or avatar |
| `POST` | `/api/auth/change-password` | User | Change own password |
| `POST` | `/api/auth/register` | Admin | Create a new user account |

### Users (admin only)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users` | List all users |
| `PUT` | `/api/users/{id}/role` | Change a user's role |
| `DELETE` | `/api/users/{id}` | Deactivate a user |

### Speed Tests

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/speedtest/run` | User | Trigger a manual speed test |
| `GET` | `/api/speedtest/status` | User | Running state + next scheduled run |

### Results

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/results` | User | List results (`?skip=0&limit=200`) |
| `GET` | `/api/results/latest` | User | Most recent result |
| `GET` | `/api/results/{id}` | User | Single result by ID |
| `DELETE` | `/api/results/{id}` | Admin | Delete one result |
| `DELETE` | `/api/results` | Admin | Delete all results |
| `GET` | `/api/stats` | User | Aggregated statistics |

### Schedule

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/schedule` | User | Get current schedule config |
| `POST` | `/api/schedule` | Admin | Update schedule config |

Schedule payload: `{ "enabled": true, "interval_minutes": 60 }`

### Alerts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/alert-config` | Admin | Get alert configuration |
| `PUT` | `/api/alert-config` | Admin | Save alert configuration |
| `POST` | `/api/alert-config/test` | Admin | Send test notification |

Test payload: `{ "channel": "discord" }` — valid channels: `discord`, `telegram`, `email`, `webhook`.

### Backup & Restore

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/backup` | Admin | Download full JSON backup |
| `POST` | `/api/restore` | Admin | Upload and restore a backup file (`multipart/form-data`) |

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Health check; returns `{ "status": "ok", "version": "2.0.0" }` |

Interactive API documentation is available at `http://localhost:8000/docs` when the backend is running.

---

## Docker Reference

### Container names

| Container | Name |
|---|---|
| Backend API | `pulsenet-backend` |
| Frontend (Nginx) | `pulsenet-frontend` |
| PostgreSQL | `pulsenet-postgres` |
| MySQL/MariaDB | `pulsenet-mysql` |

### Ports

| Service | Host port | Container port |
|---|---|---|
| Frontend | `3000` | `80` |
| Backend API | `8000` | `8000` |

### Useful commands

```bash
# Start (SQLite default)
docker compose up --build -d

# Start with PostgreSQL
docker compose --profile postgres up --build -d

# Start with MySQL / MariaDB
docker compose --profile mysql up --build -d

# View logs
docker compose logs -f
docker compose logs -f backend

# Restart backend only (e.g. after .env change)
docker compose restart backend

# Stop all services
docker compose down

# Stop and remove all data volumes (full reset)
docker compose down -v

# Rebuild after code changes
docker compose up --build -d
```

### Volumes

| Volume | Contents |
|---|---|
| `speedtest-data` | SQLite database file |
| `postgres-data` | PostgreSQL data directory |
| `mysql-data` | MySQL/MariaDB data directory |

Data persists across `docker compose down` restarts. Use `docker compose down -v` only when you want a complete wipe.

---

## Roadmap

The following features are planned for upcoming phases:

- [ ] **More alert channels** — Slack, PagerDuty, Pushover, ntfy
- [ ] **Email-based password reset** — self-service reset flow without `.env` editing
- [ ] **Result annotations** — add notes to individual tests
- [ ] **Comparative analytics** — ISP comparison, time-of-day heatmaps, weekly averages
- [ ] **Multiple test servers** — pin to a specific Ookla server or run multi-server comparisons
- [ ] **Public results dashboard** — shareable read-only view with no login required
- [ ] **Mobile app / PWA** — installable progressive web app
- [ ] **Prometheus metrics endpoint** — for integration with Grafana or similar
- [ ] **LDAP / OAuth SSO** — enterprise authentication options

---

## License

This project is for personal and internal use. No licence has been applied at this time.

---

*Built with ⚡ by the PulseNet team — a self-hosted SpeedTest Tracker that respects your data.*