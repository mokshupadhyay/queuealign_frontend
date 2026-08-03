# QueueAlign

Fair QR check-in and queue for college hackathons.

## Stack

- **Backend:** FastAPI + SQLite (`queuealign_backend`)
- **Frontend:** Vite + React + TypeScript (`queuealign_frontend`)

## Run locally

### 1. API

```bash
cd queuealign_backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001
```

### 2. Web

```bash
cd queuealign_frontend
npm install
npm run dev
```

Open http://localhost:5173 — Vite proxies `/api` to port 8001.

## Flow

1. **Create event** → share register / desk / display links  
2. **Participants register** → queue number + QR + live status page  
3. **Desk** (PIN) → Call next, scan QR or enter queue #, skip  
4. **Display** → fullscreen “Now serving” for a lobby TV  

## Env (backend)

See `.env.example` — `DATABASE_URL`, `CORS_ORIGINS`, `SECRET_KEY`, `FRONTEND_URL`.
