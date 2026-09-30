# MERN Expense Tracker

A personal finance application built with React, Vite, Express, Mongoose, and MongoDB Atlas. The backend is the source of truth for user accounts, transactions, analytics, and monthly budgets.

## Requirements

- Node.js 20.19+ (Node 24 recommended)
- npm
- MongoDB Atlas account and a database user with read/write access

## Environment setup

1. Copy `backend/.env.example` to `backend/.env`.
2. In Atlas, create a database user and allow your current IP address in Network Access.
3. Paste the Atlas-generated `mongodb+srv://` connection string into `MONGODB_URI`. Do not add a port to an SRV URI. If the database username or password contains reserved URI characters, URL-encode those credential parts.
4. Create a signing secret in PowerShell with:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

5. Put the generated value in `JWT_SECRET` in `backend/.env`. Never commit or share `.env`.
6. Keep `FRONTEND_URL` set to the exact browser origin used by Vite (default `http://localhost:5173`).

## Install and run

Install backend and frontend dependencies:

```powershell
npm install --prefix backend
npm install --prefix frontend
```

Start each development server in a separate terminal from the project root:

```powershell
npm run dev:backend
npm run dev:frontend
```

Open the Vite URL shown in the frontend terminal, normally `http://localhost:5173`.

## Checks

```powershell
npm test --prefix backend
npm run lint --prefix frontend
npm run build --prefix frontend
```

The backend connects to MongoDB before it begins listening. Its health endpoint is `http://localhost:5000/api/health`.

## Features

- Password-hashed registration and login with an HttpOnly cookie session
- User-scoped transaction creation, history, editing, deletion, search, filters, and sorting
- Summary totals and daily, monthly, category, and rule-based insight reports
- Monthly category budgets with actual spend, remaining amount, and usage warnings
- INR forms and integer-paise persistence

All personal-data endpoints require authentication. Never use a production database for destructive tests.
