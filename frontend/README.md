# Earneasy — Frontend Demo

This is a frontend demo for the Earneasy web app. It uses React + Vite and can connect to a simple backend (included in this repo under `backend/`). The frontend communicates with the backend when `VITE_API_BASE` is set (defaults to `http://localhost:4000/api` in development and `/api` in production).

Features included in this demo:
- Landing page
- Sign up / Sign in (email + password) using a mock backend
- Dashboard with balance and active package
- Packages page to purchase packages (demo)
- Tasks page with sample tasks that auto-credit earnings
- Wallet with transaction history
- Referrals, Profile and an Admin demo page

How to run frontend (Linux/macOS/Windows WSL):

1. cd frontend
2. npm install
3. VITE_API_BASE=http://localhost:4000/api npm run dev

Open the URL printed by Vite (typically http://localhost:5173).

Demo admin credentials for the bundled backend: email: `admin@demo`, password: `adminpass` (created automatically when the backend seeds data).

Notes:
- Frontend will use the backend when `VITE_API_BASE` is set (development: `http://localhost:4000/api`, production: `/api`). If you want to run frontend without backend, some actions will use the older demo/local behavior but many endpoints expect the backend.
- Do not use this demo for production; it's for client demos only.
