# Outage Tracker — Setup Guide

How to deploy the backend on Railway and connect it to the GitHub Pages frontend.

---

## Overview

The project has two parts:

| Part | What it is | Where it runs |
|---|---|---|
| **Frontend** | Static HTML + JSX files | GitHub Pages |
| **Backend** | Node.js API + SQLite + scrapers | Railway |

The frontend runs entirely in the browser (no build step). It fetches live data from the backend at the URL you configure. If no backend URL is set it falls back to built-in demo data.

---

## Prerequisites

- A [Railway](https://railway.app) account (free tier works)
- Your fork of this repo on GitHub
- The GitHub Pages site already publishing from the `main` branch (Settings → Pages → Source: Deploy from branch → `main` → `/ (root)`)

---

## 1. Deploy the backend to Railway

### 1a. Create a new project

1. Log in to [railway.app](https://railway.app) and click **New Project**.
2. Choose **Deploy from GitHub repo**.
3. Authorise Railway to access your GitHub account and select your fork of this repo.

### 1b. Point Railway at the backend directory

Railway will detect the repo root by default — you need to tell it to use the `backend/` subdirectory:

1. In your Railway project, open the service and go to **Settings → Source**.
2. Set **Root Directory** to `backend`.
3. Railway will now treat `backend/` as the project root when building and running.

The repo already includes `backend/railway.json` (start command) and `backend/nixpacks.toml` (build dependencies for `better-sqlite3`), so no further build configuration is needed.

### 1c. Add a persistent volume for the database

The backend stores outage data in a SQLite file (`./data/outages.db`). Without a volume this file is lost on each redeploy.

1. In the Railway project dashboard, click **New** → **Volume**.
2. Attach the volume to your backend service.
3. Set the **Mount Path** to `/app/backend/data` (or whatever path maps to `backend/data/` inside the container — Railway shows the working directory in the service logs on first boot if you're unsure).

Alternatively, set `DB_PATH` (see below) to a path inside the mounted volume.

> **Note:** On the Railway free tier volumes are not available. The database resets on each redeploy, which is fine for testing — scrapers repopulate it on startup.

### 1d. Set environment variables

Go to **Service → Variables** and add the following. All values are optional except `CORS_ORIGINS` which you must set for the frontend to work.

| Variable | Required | Description | Example value |
|---|---|---|---|
| `CORS_ORIGINS` | **Yes** | Comma-separated list of allowed origins | `https://yourusername.github.io` |
| `NODE_ENV` | No | Set to `production` | `production` |
| `PORT` | No | Railway sets this automatically — leave unset | — |
| `DB_PATH` | No | SQLite file path (relative to `backend/`) | `./data/outages.db` |
| `CRON_LIVE` | No | Cron for live-outage scrapes | `*/5 * * * *` |
| `CRON_PLANNED` | No | Cron for planned-outage scrapes | `*/30 * * * *` |
| `SCRAPER_TIMEOUT` | No | HTTP timeout per scraper call (ms) | `15000` |
| `SCRAPER_MAX_RETRIES` | No | Retries per scraper on failure | `3` |
| `HTTP_PROXY` | No | Proxy URL if provider sites block Railway IPs | `http://proxy.example.com:8080` |

For `CORS_ORIGINS`, include every origin the frontend is served from. If you're testing locally as well:

```
https://yourusername.github.io,http://localhost:8080
```

### 1e. Deploy

Click **Deploy** (or push any commit to trigger an automatic deploy). Watch the build logs — the first deploy installs npm dependencies and compiles `better-sqlite3` native bindings using the nixpacks setup in `nixpacks.toml`.

On startup the server:
1. Initialises the SQLite database (creates tables if they don't exist).
2. Runs an immediate scrape of all providers.
3. Starts the cron scheduler for subsequent scrapes.
4. Begins listening on `$PORT` (assigned by Railway).

### 1f. Get your public URL

Once the deploy succeeds, go to **Settings → Networking** and click **Generate Domain**. Railway gives you a URL like:

```
https://outagetracker-backend-production.up.railway.app
```

Copy this — you'll need it in the next step.

---

## 2. Connect the frontend to the backend

Open `Outage Tracker.html` and find this block near the bottom of the file (around line 43):

```js
// Set this to your backend URL to use real scraped data instead of mock data.
// Leave empty ('') to run in demo mode with generated data.
// Example: window.API_URL = 'https://your-app.railway.app';
window.API_URL = '';
```

Replace the empty string with your Railway URL:

```js
window.API_URL = 'https://outagetracker-backend-production.up.railway.app';
```

Commit and push to `main`. GitHub Actions will re-publish the Pages site automatically (or wait ~60 seconds for Pages to pick up the change if you're using branch-based publishing).

---

## 3. Verify the connection

1. Open your GitHub Pages URL in a browser.
2. A green banner reading **"Fetching live outage data…"** should appear briefly at the top while the first API call is in flight.
3. Once data loads, the banner disappears and the table and map populate with real outages.
4. If you see a red banner reading **"API unavailable — showing demo data"**, check:
   - The Railway service is running (check logs for startup errors).
   - `CORS_ORIGINS` in Railway matches your Pages URL exactly (no trailing slash).
   - The `window.API_URL` value in the HTML does not have a trailing slash.

---

## 4. API endpoints

The backend exposes these routes (all under `/api`):

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/outages` | List outages. Query params: `type` (`unplanned`/`planned`/`restored`), `state`, `provider`, `search`, `limit`, `offset` |
| `GET` | `/api/outages/:id` | Single outage by ID |
| `GET` | `/api/providers` | Provider list with current status |
| `GET` | `/api/stats` | Aggregate counts and by-state/by-provider breakdowns |
| `GET` | `/health` | Health check — returns `{"status":"ok"}` |

---

## 5. Scraper coverage

The backend ships scrapers for these Australian DNSPs:

| Provider | State | Method |
|---|---|---|
| Ausgrid | NSW | Scrape |
| Essential Energy | NSW | Scrape |
| Energex | QLD | Scrape |
| Ergon Energy | QLD | Scrape |
| AusNet Services | VIC | Scrape |
| Powercor | VIC | Scrape |
| Jemena | VIC | Scrape |
| United Energy | VIC | Scrape |
| SA Power Networks | SA | Scrape |
| Western Power | WA | Scrape |

If a provider's site blocks Railway's IP range you can route requests through a proxy by setting `HTTP_PROXY`. Check the service logs — failed scrapers log a warning but do not crash the server.

---

## 6. Local development

```bash
cd backend
cp .env.example .env        # edit CORS_ORIGINS and other values as needed
npm install
npm run dev                 # starts with --watch for auto-restart on file changes
```

The API will be available at `http://localhost:3001`. To point the frontend at it:

```js
window.API_URL = 'http://localhost:3001';
```

Serve the HTML with any static file server, for example:

```bash
# from repo root
npx serve .
# then open http://localhost:3000/Outage%20Tracker.html
```

---

## 7. Keeping scrapers up to date

Provider sites change their outage feed formats without notice. When a scraper breaks:

1. Check Railway logs for the provider error message.
2. Open the relevant file in `backend/src/scrapers/` (e.g. `ausgrid.js`).
3. Each scraper exports a class extending `BaseScraper` with a `scrape()` method — update the parsing logic there.
4. Push the fix; Railway redeploys automatically.
