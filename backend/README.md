DailyEarn Pro — Backend (demo)

This is a simple Express + SQLite backend used for the frontend demo. It implements:
- JWT auth (signup/login)
- Packages, Tasks
- Wallet (balance, transactions, withdraw)
- Deposit submission with screenshot upload (admin approval required to activate account)
- Admin endpoints to list and approve/reject deposits

How to run:

1. cd backend
2. npm install
3. npm run dev

The server listens on port 4000 by default. Uploaded screenshots are stored under `backend/uploads/` and served from `/uploads`.

Demo admin credentials (seeded):
- email: admin@demo
- password: adminpass

Notes:
- This is a demo only. For production, replace SQLite with Postgres, secure JWT secret, validate inputs, scan uploaded files, and integrate real payment gateway webhooks.
