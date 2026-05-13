# OrcaXCare

Fullstack project for WDP301 (MERN + optional React Native). Team members clone this repo and work in `client`, `server`, and later `mobile`.

## Repository layout

| Path | Purpose |
|------|---------|
| `client/` | React (Vite) web app |
| `server/` | Node.js + Express API, MongoDB (Mongoose) |
| `mobile/` | React Native app (scaffold when ready) |
| `docs/srs/` | Software Requirements Specification |
| `docs/sds/` | Software Design Specification |
| `docs/meeting-notes/` | Meeting minutes |
| `docs/release/` | Release notes, final submission assets |

## Quick start

### Server

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

### Client

```bash
cd client
npm install
npm run dev
```

Set `VITE_API_URL` in `client/.env` if the API is not the default (see `client/.env.example`).

## Publish to GitHub

1. Create an empty repository on GitHub (no README if you already have one here).
2. From this folder:

```bash
cd OrcaXCare
git init
git add .
git commit -m "Initial project structure for OrcaXCare"
git branch -M main
git remote add origin https://github.com/<your-org>/<repo>.git
git push -u origin main
```

Course materials often require **GitLab**; you can add a second remote or mirror the repo to GitLab if your lecturer asks for it.

## Team workflow

- Track work in GitHub **Issues** / **Projects** (or GitLab Issues + Milestones per iteration).
- Use feature branches and pull requests; keep `docs/` updated each iteration for SRS and SDS.
