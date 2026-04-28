# SUBLINE

Barbershop management system. Three roles — **admin**, **barber**, **client** — each with a dedicated dashboard, JWT auth, role-based data isolation, subscriptions, and payment history.

**Stack**

- **Client**: React 18 · TypeScript · Vite · Tailwind CSS · React Router · Axios
- **Server**: Node.js · Express · TypeScript · Prisma · PostgreSQL · JWT · bcrypt · Zod
- **Monorepo**: npm workspaces (`client/`, `server/`)

---

## Prerequisites

- Node.js **18+** (20+ recommended)
- PostgreSQL **14+** running locally or accessible via `DATABASE_URL`
- npm 9+

---

## Quick start

```bash
# 1. Install dependencies for both workspaces
npm install

# 2. Configure server env
cp server/.env.example server/.env
#    edit server/.env: DATABASE_URL, JWT_*_SECRET (32+ chars each), ADMIN_*

# 3. Create the database (the URL points here)
createdb subline

# 4. Push schema and seed the initial admin
npm run db:push
npm run db:seed

# 5. Run both client + server in dev
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:4000
- Health: http://localhost:4000/api/health

The Vite dev server proxies `/api/*` to the Express server, so the client just calls `/api/...`.

Login with the admin credentials you set in `server/.env` (defaults: `admin@subline.local` / `ChangeMe123!`).

---

## Project layout

```
.
├── client/                  # React + TS + Tailwind frontend (Vite)
│   ├── src/
│   │   ├── components/      # Logo, Modal, Toast, Avatar, BottomNav, AppShell …
│   │   ├── context/         # AuthContext (login/register/logout/me)
│   │   ├── lib/             # api.ts (axios + JWT interceptors), types, utils
│   │   ├── pages/           # Login, AdminDashboard, BarberDashboard, ClientDashboard
│   │   ├── App.tsx          # routes + role guards
│   │   └── main.tsx
│   ├── tailwind.config.js   # SUBLINE color palette
│   └── vite.config.ts       # /api proxy → :4000
│
├── server/                  # Express + Prisma backend
│   ├── prisma/
│   │   ├── schema.prisma    # users · barbers · clients · subscriptions · payments · audit_logs
│   │   └── seed.ts          # creates initial admin from env
│   ├── src/
│   │   ├── lib/             # db (prisma), env, jwt, errors, audit
│   │   ├── middleware/      # auth (requireAuth, requireRole), error handler
│   │   ├── routes/          # auth · admin · barber · client (+ public)
│   │   ├── app.ts
│   │   └── index.ts
│   └── .env.example
│
├── _old_v1/                 # archive of the previous implementation (safe to delete)
└── package.json             # root: workspaces + dev scripts
```

---

## Auth & security

- Passwords hashed with **bcrypt** (`BCRYPT_ROUNDS`, default 10).
- JWT access token (`1h` default) + refresh token (`7d` default).
- Frontend stores tokens in `localStorage`; axios interceptor auto-refreshes on 401.
- All inputs validated **server-side** with Zod (frontend validates for UX too).
- **Role-based data isolation:**
  - `admin/*` requires `role: admin`.
  - `barber/*` requires `role: barber`; queries are scoped to `JWT.barberId` — barbers can only ever read or modify their own clients.
  - `client/*` requires `role: client`; queries are scoped to `JWT.clientId`.
- `helmet` headers, CORS pinned to `CORS_ORIGIN`, login is rate-limited (10 attempts / 15 min / IP), all routes capped at 120 req/min.
- `audit_logs` table records sensitive admin and barber actions.

---

## API summary

### Auth (no token)
- `POST /api/auth/register` — body: `{ fullName, email, password, confirmPassword, role: barber|client, phone?, address?, bio?, barberId? }` — public registration limited to `barber` and `client`.
- `POST /api/auth/login` — body: `{ email, password }` (rate-limited).
- `POST /api/auth/refresh` — body: `{ refreshToken }`.

### Auth (token required)
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Public
- `GET /api/public/barbers` — list of barbers for the signup form.

### Admin (requires `role=admin`)
- `GET /api/admin/dashboard` — KPI cards
- `GET /api/admin/users?page&limit&q&role&status&sort&order`
- `POST /api/admin/users`
- `PUT /api/admin/users/:userId`
- `DELETE /api/admin/users/:userId`
- `GET /api/admin/audit-logs?page&limit`

### Barber (requires `role=barber`)
- `GET /api/barber/statistics`
- `GET /api/barber/clients?q&status`
- `POST /api/barber/clients` — creates user + client + initial subscription
- `PUT /api/barber/clients/:clientId`
- `DELETE /api/barber/clients/:clientId`
- `GET /api/barber/profile` · `PUT /api/barber/profile`
- `PUT /api/barber/password`

### Client (requires `role=client`)
- `GET /api/client/subscription`
- `GET /api/client/payments?page&limit`
- `GET /api/client/barber`
- `GET /api/client/profile` · `PUT /api/client/profile`
- `PUT /api/client/password`
- `POST /api/client/subscription/cancel`

---

## Useful scripts

```bash
npm run dev               # client + server in parallel
npm run db:push           # apply schema without migrations (dev)
npm run db:migrate        # generate + apply a migration
npm run db:seed           # create initial admin
npm run db:generate       # regenerate Prisma client after schema changes
npm run build             # build both server (tsc) and client (vite build)
```

---

## Customizing the brand

The SUBLINE palette lives in `client/tailwind.config.js`:

```js
brand:   { DEFAULT: '#0080D0', dark: '#003D7A', light: '#E3F2FD' }
accent:  '#8B5CF6'
success: '#4CAF50'
danger:  '#EF4444'
```

Component utility classes (`btn-primary`, `card`, `badge-success`, etc.) are defined in `client/src/index.css` under `@layer components`.

---

## Production notes

- Set strong `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (32+ random chars each).
- Tighten `CORS_ORIGIN` to your real domain(s).
- Enable HTTPS at the proxy/load-balancer level.
- Run `npm run build` and serve `client/dist` behind your CDN; point the API at the Express server.
- Schedule regular Postgres backups.

---

## What's not in MVP

Phase 2 (per the spec):

- Password reset / email verification
- Stripe payment integration
- Email + SMS notifications
- Profile picture uploads
- Reports / exports
- Appointment scheduling
- Review / rating system
- Barber availability calendar

The schema and the audit log are already shaped to absorb most of these without breaking changes.
