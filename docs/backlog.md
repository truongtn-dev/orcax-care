# OrcaXCare — Backlog

**102 subtasks** split from **35 epics** (course scope + shared technical items). Sprint **1–4** follows [`sprint-plan.md`](./sprint-plan.md).

| Artifact | Purpose |
|----------|---------|
| [`backlog-orcaxcare.xlsx`](./backlog-orcaxcare.xlsx) | **Excel:** sheets *Epics*, *All*, *Sprint_1* … *Sprint_4* |
| [`backlog-full.csv`](./backlog-full.csv) | All subtasks (import to Sheets) |
| [`backlog-epics.csv`](./backlog-epics.csv) | 35 epic rows only (slides / macro) |
| [`backlog-sprint-1.csv`](./backlog-sprint-1.csv) … [`backlog-sprint-4.csv`](./backlog-sprint-4.csv) | Subtasks filtered by sprint |
| [`backlog_subtasks.py`](./backlog_subtasks.py) | Edit subtask text / LOC splits |

Regenerate: `python docs/generate_backlog.py`

---

## Epics (35 rows)

| Parent | Screen / Function | Epic feature | Sprint | Owner | LOC (epic) | #Sub |
|--------|--------------------|--------------|--------|-------|------------|------|
| 1 | Queue screen (patient + doctor) | Real-time queue | 4 | TruongNTCE180140 | 180 | 3 |
| 2 | Admin / Doctor — Schedule | Appointment slot scheduling | 3 | TruongNTCE180140 | 200 | 3 |
| 3 | Server — API architecture | Architecture & auth middleware | 1 | TruongNTCE180140 | 120 | 3 |
| 4 | Portal + API | Registration & login | 2 | TruongNTCE180140 | 150 | 3 |
| 5 | Portal — Find doctor | Smart search | 3 | TruongNTCE180140 | 100 | 3 |
| 6 | Portal — Profile | Personal profile management | 2 | TruongNTCE180140 | 90 | 3 |
| 7 | Payments | Online payment | 4 | TanhNTCE182341 | 220 | 3 |
| 8 | Wallet + API | Internal medical wallet | 4 | TanhNTCE182341 | 180 | 3 |
| 9 | Portal — Health insurance | Health insurance management | 4 | TanhNTCE182341 | 160 | 3 |
| 10 | Portal — History | Transaction history | 4 | TanhNTCE182341 | 110 | 3 |
| 11 | Booking + Wallet | Automatic refund | 4 | TanhNTCE182341 | 130 | 3 |
| 12 | Server — RBAC | RBAC authorization | 2 | TanhNTCE182341 | 100 | 3 |
| 13 | Doctor — EMR | EMR medical record | 4 | ThangNDCE180608 | 240 | 3 |
| 14 | Admin — Stock | Pharmacy stock management | 4 | ThangNDCE180608 | 200 | 3 |
| 15 | Admin — Staff | Doctor management | 3 | ThangNDCE180608 | 160 | 3 |
| 16 | Doctor — Imaging | Imaging library | 4 | ThangNDCE180608 | 140 | 3 |
| 17 | Admin — Facilities | Clinic room management | 1 | ThangNDCE180608 | 120 | 3 |
| 18 | Admin — Catalog | ICD catalog | 3 | ThangNDCE180608 | 100 | 3 |
| 19 | Portal — Booking | Booking flow | 3 | ThangDQCE182036 | 220 | 3 |
| 20 | API Booking | Double-booking check | 3 | ThangDQCE182036 | 120 | 3 |
| 21 | Portal — Home | Patient home page | 3 | ThangDQCE182036 | 130 | 3 |
| 22 | Notifications | Web Push | 4 | ThangDQCE182036 | 140 | 3 |
| 23 | Portal — Review | Doctor rating | 4 | ThangDQCE182036 | 100 | 3 |
| 24 | Portal — Favorites | Preferred doctor list | 3 | ThangDQCE182036 | 80 | 2 |
| 25 | Admin — Reports | Revenue report | 4 | KhoaNNCE181612 | 180 | 3 |
| 26 | Doctor — Prescriptions | Prescription PDF export | 4 | KhoaNNCE181612 | 160 | 3 |
| 27 | Portal + Kiosk | QR verification | 4 | KhoaNNCE181612 | 100 | 3 |
| 28 | System — Email | Automated email | 4 | KhoaNNCE181612 | 120 | 3 |
| 29 | Portal — Maps | Branch map | 3 | KhoaNNCE181612 | 100 | 3 |
| 30 | Admin + Portal | Complaint handling | 4 | KhoaNNCE181612 | 110 | 3 |
| 31 | Server — Quality | Input validation | 1 | Team | 150 | 3 |
| 32 | Server — Quality | Unified error handling | 1 | Team | 80 | 3 |
| 33 | DevOps | Seed & light migration | 1 | Team | 60 | 2 |
| 34 | Docs | Short API contract | 1 | Team | 40 | 2 |
| 35 | QA | Supertest smoke | 4 | Team | 100 | 3 |

---

## Sprint subtask counts

- **Sprint 1:** 16 subtasks ([`backlog-sprint-1.csv`](./backlog-sprint-1.csv))
- **Sprint 2:** 9 subtasks ([`backlog-sprint-2.csv`](./backlog-sprint-2.csv))
- **Sprint 3:** 26 subtasks ([`backlog-sprint-3.csv`](./backlog-sprint-3.csv))
- **Sprint 4:** 51 subtasks ([`backlog-sprint-4.csv`](./backlog-sprint-4.csv))

---

## Notes

- **LOC (subtask):** rough slice of the epic LOC; adjust in `backlog_subtasks.py`.
- **Sprint reassignment:** change the last number on each tuple in `EPICS` inside `generate_backlog.py`, then rerun.
