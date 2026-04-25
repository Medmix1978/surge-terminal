# Surge Terminal — Fullstack Setup Guide

## Overview
Surge Terminal is a fullstack autonomous trading bot with:
- **Frontend**: React + Three.js dashboard (deployed at https://m3dx5olw73mv6.kimi.show)
- **Backend**: Node.js API server (needs to be running for full functionality)

## ⚠️ IMPORTANT: Two-Part System

| Part | Status | What It Does |
|------|--------|-------------|
| Frontend Dashboard | ✅ Live at kimi.show | Visual UI, 3D graph, controls |
| Backend API Server | ❌ You must run it | Kraken connection, live data, trading |

**Without the backend running, the dashboard shows simulated demo data.**

---

## Quick Start (Get Live in 5 Minutes)

### Option 1: Run Everything on Your Computer (Fastest)

```bash
# 1. Download the project files from:
# /mnt/agents/output/app/

# 2. Open TWO terminal windows

# TERMINAL 1 — Start the Backend
cd /mnt/agents/output/app/server
npm install --no-bin-links --ignore-scripts
node index.js
# → Server running at http://localhost:3001

# TERMINAL 2 — Start the Frontend
cd /mnt/agents/output/app
npm install
npm run dev
# → Open http://localhost:3000 in your browser

# 3. In the dashboard, click "🔗 CONNECT KRAKEN"
# 4. Paste your Kraken API Key and Private Key
# 5. Done — live market data appears
```

### Option 2: Deploy to Render.com (Always Online)

```bash
# 1. Push to GitHub
cd /mnt/agents/output/app
git init
git add .
git commit -m "Surge Terminal"
git remote add origin https://github.com/YOURNAME/surge-terminal.git
git push -u origin main

# 2. Go to https://render.com → New Web Service
#    - Connect your GitHub repo
#    - Root Directory: server
#    - Build: npm install --no-bin-links --ignore-scripts
#    - Start: node index.js
#    - Add env var: PORT = 10000

# 3. Render gives you a URL like https://surge-terminal.onrender.com
# 4. Open it → Click "🔗 CONNECT KRAKEN" → Paste keys
```

---

## How the "Connect Kraken" Button Works

1. You paste keys in the browser UI
2. Frontend sends them to `POST /api/setup`
3. Backend:
   - Saves keys encrypted to `data/db.json`
   - Re-initializes Kraken client with live credentials
   - Switches from simulated → real market data
4. Keys persist across server restarts (loaded from DB on boot)

---

## Where to Get Kraken API Keys

1. Log in to **https://pro.kraken.com**
2. Go to **Settings → API → Generate New Key**
3. Enable these permissions:
   - ✅ Query Funds
   - ✅ Query Open Orders & Trades
   - ✅ Create & Modify Orders
   - ✅ Query Closed Orders & Trades
4. Copy **API Key** and **Private Key**

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| "Backend Offline" warning | Backend not running | Start it with `cd server && node index.js` |
| "Failed to fetch" error | CORS or wrong URL | Make sure frontend and backend are on same origin |
| "Kraken: SIMULATED" | No API keys set | Click "🔗 CONNECT KRAKEN" and paste keys |
| Keys lost on restart | Server started before DB init | Keys auto-restore from `data/db.json` on startup |

---

## Project Structure

```
/mnt/agents/output/app/
├── dist/                    ← Built frontend (served by backend)
├── server/
│   ├── index.js             ← Main backend (Express + WebSocket)
│   ├── package.json         ← Backend dependencies
│   ├── .env                 ← Environment variables (optional)
│   └── data/
│       └── db.json          ← Database (trades, signals, API keys)
├── src/
│   ├── components/           ← React components
│   ├── sections/             ← Dashboard panels
│   ├── services/api.ts       ← API client
│   └── hooks/useWebSocket.ts ← Real-time connection
└── package.json              ← Frontend dependencies
```

---

## API Endpoints (when backend is running)

```
GET  /api/health           → Server status
GET  /api/market/ticker    → Live prices
GET  /api/market/portfolio → Account balance
GET  /api/signals          → Trading signals
GET  /api/news             → News feed
POST /api/setup            → Save Kraken keys
GET  /api/config           → Bot settings
POST /api/config           → Update settings
WS   /ws                   → Real-time stream
```

---

## What Was Fixed

1. ✅ API URLs changed from `http://localhost:3001` → relative `/api/...`
2. ✅ WebSocket URL now auto-detects `wss://` vs `ws://`
3. ✅ Backend auto-loads saved API keys from database on startup
4. ✅ Setup modal shows "Backend Offline" warning if server not running
5. ✅ Error messages explain exactly what's wrong
