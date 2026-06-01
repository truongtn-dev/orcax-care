# OrcaXCare — 4-sprint plan (main scope)

This document splits the **agreed prototype / business flows** into **four sprints**. Each sprint has a **main scope (goal)** and a **demo outcome** suitable for course submission / team reviews.

> Internal dependency order: (1) lock DB & boilerplate → (2) Auth → (3) doctor / clinic / specialty / slot data → (4) booking + wallet + queue + basic visit.

---

## Four-sprint overview

| Sprint | Main scope (goal) | Suggested demo outcome |
|--------|-------------------|------------------------|
| **Sprint 1** | **Foundation & data** — Stable MERN repo, MongoDB Atlas, collections/schemas per ERD, API skeleton, health check. | Run `client` + `server`, `/health` + DB connected; at least seed models or a script for sample data (departments, rooms, sample users). |
| **Sprint 2** | **Identity & access** — Register / login, JWT, RBAC (patient / doctor / admin), route protection middleware. | Three roles can sign in; sensitive APIs return correct 401/403; minimal login UI + layout by role. |
| **Sprint 3** | **Booking portal & clinic ops** — Internal CRUD/CMS: doctors, clinics, specialties, schedules / timeslots; booking flow + conflict checks; appointment history; queue MVP (ticket number, session). | Patient picks doctor → slot → creates booking (payment may be stub); doctor/admin manages slots & basic waiting list. |
| **Sprint 4** | **Money, visit, close the loop** — Internal wallet + sandbox gateway (Momo/VNPAY if required); deposit / refund on cancel; complete visit: record / prescription / basic stock deduction; real-time queue (Socket.io); PDF/email as time allows. | One end-to-end case: book → pay/deposit from wallet → check-in → call number → save encounter + prescription (minimal) → notify/export if time permits. |

---

## Sprint 1 — Foundation & data

**Main scope:** Normalize the monorepo, environment variables, Atlas connection, **implement collections/schemas** for the chosen ERD (`prototype-booking.dbml` or extended `orcaxcare.dbml` — **pick one**), API routing, centralized error handling, CORS, basic logging.

**Includes (high level):**

- `server`: `routes` / `controllers` / `services` structure (or the pattern the team uses).
- Mongoose models for core entities this sprint: `users`, `allcodes` (or equivalent), `clinics`, `specialties`, … per chosen ERD.
- Minimal seed/fixture so Sprints 2–3 are not empty.
- `client`: layout shell (header/sidebar placeholder), health API call.

**Out of scope for Sprint 1:** real payments, full Socket, PDF — avoid scope creep.

---

## Sprint 2 — Identity & access control

**Main scope:** **Multi-role auth** + **RBAC** so later APIs have a clear **subject** (patient / doctor / admin).

**Includes:**

- Register / login, password hashing, JWT (access), optional refresh.
- Middleware: `requireAuth`, `requireRole([...])`.
- Attach `userId` + `role` to request context; resource ownership checks (e.g. users only edit their own profile).
- UI: login/register pages, token storage, redirect by role.

**Depends on Sprint 1:** `users` table (and `allcodes` if roles use lookups) exists.

---

## Sprint 3 — Booking portal & clinic operations

**Main scope:** **Data for booking** + **booking flow** + **queue skeleton**.

**Includes:**

- API & UI (or API-first) for: `doctor_info` / doctors with clinic & specialty, `clinics`, `specialties`, `schedules` / timeslots.
- `bookings`: create / view / cancel (per rules), **prevent double booking**; booking token/QR if SRS requires.
- Patient portal: find doctor, pick slot, confirm booking.
- Admin: CRUD reference data & doctor schedules.
- **Queue (MVP):** `queue_session` + `queue_ticket` or ERD equivalent; show queue number (REST first; Socket can move to Sprint 4 if tight on time).

**Depends on Sprint 2:** all routes above go through auth + correct role.

---

## Sprint 4 — Money, visit, close the loop

**Main scope:** **Payments / wallet** tied to booking + **visit** (minimal EMR) + **prescription & stock** + **real-time** (if backlog remains) + reporting/export per SRS.

**Includes (prioritize by team capacity):**

- Wallet: balance, top-up/charge/refund; Momo/VNPAY sandbox if the course requires.
- Booking: deposit payment / refund on timely cancel.
- `doctor_profiles` / rich doctor profile; `medical_histories`, `prescriptions`, `medicines`, stock deduction (logic + transaction).
- Socket.io: sync “now serving” between doctor and patient screens.
- Prescription PDF / email / revenue reports: follow SRS priority; mark unfinished items as **stretch goals**.

**Depends on Sprint 3:** booking & slots are stable.

---

## Submission / presentation notes

- **Main scope** answers “what does this sprint deliver so work stays focused” — copy into slides + backlog (sprint description column).
- If the instructor requires **dates**, add a separate table (week start/end) per class calendar; this file only fixes **business order**.

---

## Backlog → sprint mapping

Each backlog row’s **Sprint (1–4)** is stored in `docs/generate_backlog.py` (last value of every tuple in `EPICS`). **Subtasks** (smaller work items) live in `docs/backlog_subtasks.py`. Running `python docs/generate_backlog.py` refreshes:

- `backlog-full.csv` — all subtasks with `Parent_ID` + `Sprint`
- `backlog-epics.csv` — 35 epic rows only
- `backlog-sprint-1.csv` … `backlog-sprint-4.csv` — subtasks per sprint
- **`backlog-orcaxcare.xlsx`** — Excel workbook: sheets *Epics*, *All*, *Sprint_1* … *Sprint_4*

| Sprint | Exported file | Approx. focus |
|--------|----------------|-----------------|
| 1 | `backlog-sprint-1.csv` | Foundation: API shell, validation, errors, seed, docs, clinic facilities. |
| 2 | `backlog-sprint-2.csv` | Identity: register/login, profile, RBAC. |
| 3 | `backlog-sprint-3.csv` | Booking data & portal: schedules, doctors, ICD, booking flow, double-booking, home, favorites, maps. |
| 4 | `backlog-sprint-4.csv` | Money + visit + polish: wallet, payments, refunds, EMR, stock, queue (Socket), reports, PDF/QR/email, QA smoke. |

Adjust assignments by editing the sprint number (last field) on each **`EPICS`** tuple in `generate_backlog.py`, and edit **`backlog_subtasks.py`** to add/remove/rename subtasks; then rerun the script.

---

## Revision history

| Ver | Date | Notes |
|-----|------|--------|
| 0.1 | 2026-05-14 | Four sprints + main scope for OrcaXCare / prototype. |
| 0.2 | 2026-05-14 | Translated to English. |
| 0.3 | 2026-05-14 | Backlog → sprint CSV exports documented; mapping lives in `generate_backlog.py`. |
