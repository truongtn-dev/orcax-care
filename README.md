# OrcaXCare

MERN (WDP301): `client` (React + Vite), `server` (Express + Mongoose).

| Folder | Contents |
|--------|----------|
| `client/` | Web UI |
| `server/` | REST API + MongoDB |
| `docs/` | SRS, SDS, meeting notes, release docs |

## MongoDB Atlas (team)

Use one free cluster, create a DB user + **Network Access**, copy URI `mongodb+srv://.../<db-name>?retryWrites=true&w=majority`. Each developer copies `server/.env` from `.env.example` and **does not** commit `.env`.

## Run locally

```bash
cd server && cp .env.example .env   # Windows: copy .env.example .env
# Edit MONGODB_URI and JWT_SECRET in server/.env
npm install && npm run seed && npm run dev
```

In another terminal:

```bash
cd client && npm install && npm run dev
```

Open http://localhost:5173

### Seed accounts (after `npm run seed`)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@orcaxcare.com | Admin@123 |
| Doctor | doctor.an@orcaxcare.com | Doctor@123 |

Patient: register via `/register`, then copy verification link from **server console** (dev mail).

### Iteration 1 features implemented

| ID | Feature | Route |
|----|---------|-------|
| ORCX-001 | Login | `/login` |
| ORCX-002 | Logout | Avatar menu |
| ORCX-003 | Register | `/register` |
| ORCX-004 | Forgot / Reset password | `/forgot-password`, `/reset-password` |
| ORCX-005 | Verify email | `/verify-email?token=` |
| ORCX-006 | Resend verification | Login / Verify pages |
| ORCX-007 | Change password | `/change-password` |
| ORCX-038 | Search doctors | `/search-doctors` |

`VITE_API_URL`: see `client/.env.example` (dev defaults to proxy in `vite.config.js`).

## GitHub / GitLab

```bash
git remote add origin <repo-url>
git push -u origin main
```

The course may use GitLab — add a second remote or mirror the same way.
