# -*- coding: utf-8 -*-
"""Per-epic subtasks for OrcaXCare backlog. Key = original backlog id (1–35)."""

# epic_id -> list of (feature, description, loc, demo_comment, complexity)
SUBTASKS_BY_PARENT: dict[int, list[tuple[str, str, int, str, str]]] = {
    1: [
        ("Queue session & ticket API", "REST: open session, issue ticket, persist current number.", 60, "Postman CRUD session + ticket.", "Medium"),
        ("Patient queue display", "Waiting-room UI; subscribe to updates (Socket or polling fallback).", 70, "Number changes without refresh.", "Medium"),
        ("Doctor Next + Socket.io broadcast", "Doctor action advances queue; emit room event to patients.", 50, "Two browsers stay in sync.", "High"),
    ],
    2: [
        ("Shift / workday model", "Link doctors to working hours and branch capacity.", 70, "Seed shifts visible in DB.", "Medium"),
        ("Slot generation service", "Generate non-overlapping slots from shifts; API for grid.", 70, "JSON grid for one week.", "High"),
        ("Admin/Doctor slot calendar UI", "Day/week grid; block invalid edits.", 60, "UI shows slot grid by day.", "High"),
    ],
    3: [
        ("Express structure", "Routes/controllers/services layout; mount routers.", 45, "Folder tree matches SDS.", "Medium"),
        ("Cross-cutting middleware", "CORS, request logging, centralized error wrapper stub.", 45, "Logs show request id.", "Medium"),
        ("JWT middleware scaffold + /health", "Optional verify hook; GET /health + Mongo ping.", 30, "Health returns 200 when DB up.", "Medium"),
    ],
    4: [
        ("Register API", "Validate payload; hash password; create user + role.", 55, "Invalid email returns 400.", "Medium"),
        ("Login + JWT issue", "Compare hash; sign access token; optional refresh stub.", 55, "Postman returns Bearer token.", "Medium"),
        ("Client login/register UI", "Forms, client validation, store token, redirect by role.", 40, "Short screen capture of flow.", "Medium"),
    ],
    5: [
        ("Doctor search API", "Filters: name, specialty, branch; pagination.", 35, "curl/Postman sample queries.", "Medium"),
        ("Symptom / keyword index", "Regex or text index for hints; debounced suggest endpoint.", 40, "Typeahead demo.", "Medium"),
        ("Patient portal search page", "List + filters UI wired to API.", 25, "UI matches wireframe.", "Standard"),
    ],
    6: [
        ("Profile GET/PATCH API", "Own-profile only; partial updates.", 35, "403 for other users’ ids.", "Medium"),
        ("Avatar upload", "Multipart or URL field; size/type validation.", 30, "Avatar updates in header.", "Medium"),
        ("Profile form UI", "React form + schema validation + success toast.", 25, "Validated form demo.", "Standard"),
    ],
    7: [
        ("Payment provider config", "MoMo/VNPay sandbox keys; create payment request DTO.", 80, "Sandbox intent created.", "High"),
        ("Callback / webhook handler", "Verify signature; idempotent update booking/wallet.", 80, "Replay callback once safely.", "High"),
        ("Payment UI + test path", "Redirect or QR step; show success/failure.", 60, "One successful sandbox transaction.", "High"),
    ],
    8: [
        ("Wallet model & invariants", "Balance field; non-negative rule at schema/service.", 70, "Unit: cannot go below zero.", "High"),
        ("Credit/debit operations", "Mongo transaction or equivalent; audit lines.", 70, "Concurrent debits handled.", "High"),
        ("Wallet UI + API wiring", "Show balance; list last movements on dashboard.", 40, "UI matches balance after op.", "Medium"),
    ],
    9: [
        ("Insurance card CRUD", "Store policy number, dates, coverage percent.", 55, "Create + read card.", "Medium"),
        ("OCR hook (optional)", "Upload image URL; stub or external OCR parse.", 55, "Parsed fields editable.", "Medium"),
        ("Billing discount rule", "Apply coverage when quoting booking price.", 50, "With/without insurance cases.", "Medium"),
    ],
    10: [
        ("Transactions list API", "Paging, sort by date desc.", 40, "Page 2 works.", "Medium"),
        ("Filters", "By date range and type (top-up, payment, refund).", 40, "Filtered JSON.", "Medium"),
        ("Portal history view", "Table + optional CSV export button.", 30, "Export optional.", "Medium"),
    ],
    11: [
        ("Cancel policy engine", "Deadline rules per appointment type.", 45, "Unit tests inside/outside window.", "Medium"),
        ("Wallet refund credit", "Atomic credit linked to cancellation reason.", 45, "Balance increases correctly.", "Medium"),
        ("Cancel UI flows", "Patient cancels; shows refund message.", 40, "Two demo cases.", "Medium"),
    ],
    12: [
        ("Permission matrix constants", "Role → allowed actions map in code.", 35, "Table in README or MD.", "Standard"),
        ("requireRole middleware", "Composable guards for routes.", 40, "403 on wrong role.", "Medium"),
        ("Resource ownership checks", "EMR/stock examples; tests for happy/deny.", 25, "Matrix demo.", "Standard"),
    ],
    13: [
        ("Encounter CRUD", "Create/list encounters by patient; link appointment.", 90, "Three encounters in DB.", "High"),
        ("Diagnosis entries", "Add DX per encounter; ICD ref optional.", 90, "Timeline sorted by date.", "High"),
        ("Doctor EMR UI", "Timeline + patient search + encounter detail panel.", 60, "Click-through demo.", "High"),
    ],
    14: [
        ("Stock & movement models", "Medicine SKU, quantity, batch/expiry fields.", 70, "Models in Mongoose.", "High"),
        ("Inbound/outbound flows", "Adjust stock; link outbound to prescription later.", 70, "Stock delta correct.", "High"),
        ("Admin stock table + alerts", "Low stock + near-expiry highlight.", 60, "Table screenshot.", "High"),
    ],
    15: [
        ("Doctor profile API", "CRUD; link department & specialties.", 55, "Create doctor via API.", "Medium"),
        ("Department/specialty linkage", "Many-to-many or refs as per ERD.", 55, "Filters use relations.", "Medium"),
        ("Admin staff management UI", "Table + modal forms.", 50, "CRUD demo video.", "Medium"),
    ],
    16: [
        ("Cloudinary config", "Env keys; secure upload preset.", 50, "Upload returns URL.", "Medium"),
        ("Media linked to encounter", "Store metadata; patient/doctor ACL.", 50, "Image tied to visit.", "Medium"),
        ("Imaging gallery UI", "Thumbnails; lightbox.", 40, "One X-ray uploaded.", "Medium"),
    ],
    17: [
        ("Clinic room model", "Functional room types; equipment notes.", 45, "Rooms under branch.", "Standard"),
        ("Room REST API", "List/create/update for admin.", 40, "Postman collection.", "Standard"),
        ("Admin room list UI", "Simple list + optional floor diagram URL.", 35, "Room layout diagram.", "Standard"),
    ],
    18: [
        ("ICD collection + search", "Index code + title; text search.", 35, "Search returns top 10.", "Standard"),
        ("CSV import script", "Bulk load sample ICD rows.", 40, "Import sample CSV.", "Standard"),
        ("Diagnosis autocomplete UI", "Doctor form uses search endpoint.", 25, "Pick code from list.", "Standard"),
    ],
    19: [
        ("Booking wizard state", "Steps: department → doctor → slot.", 80, "State machine or query params.", "High"),
        ("Slot selection + summary", "Show price/deposit if any before confirm.", 80, "Summary step screenshot.", "High"),
        ("Confirm booking API call", "POST booking; handle errors.", 60, "Screen recording full flow.", "High"),
    ],
    20: [
        ("Concurrency guard", "Unique index or transaction on slot+doctor.", 45, "409 on double book.", "High"),
        ("Book API integration", "Return clear error bodies.", 40, "Postman shows 409.", "High"),
        ("Parallel booking test", "Two clients race for last seat.", 35, "Only one wins.", "High"),
    ],
    21: [
        ("Featured blocks CMS or static", "Services + doctors spotlight data.", 45, "Content visible on home.", "Medium"),
        ("Health news strip", "Optional JSON or markdown list.", 45, "News cards render.", "Medium"),
        ("Responsive layout polish", "Breakpoints; lazy images.", 40, "Mobile + desktop capture.", "Medium"),
    ],
    22: [
        ("VAPID + subscription storage", "Save endpoint + keys per user.", 50, "Row in DB after subscribe.", "Medium"),
        ("Server push sender", "Helper to notify appointment reminder.", 50, "Trigger test push.", "Medium"),
        ("Client subscribe UX", "Permission prompt; unsubscribe.", 40, "Chrome subscription demo.", "Medium"),
    ],
    23: [
        ("Review model + uniqueness", "One review per completed appointment.", 35, "409 on duplicate.", "Medium"),
        ("Submit review API", "Rating + comment validation.", 35, "API returns created review.", "Medium"),
        ("Post-visit review UI", "Modal after checkout or email deep link.", 30, "One sample review.", "Medium"),
    ],
    24: [
        ("Favorites API", "Add/remove doctor for patient.", 45, "List returns favorites.", "Standard"),
        ("Favorites page UI", "Shortcuts to book again.", 35, "Add/remove favorite.", "Standard"),
    ],
    25: [
        ("Revenue aggregation", "Mongo pipeline by day/month/branch.", 70, "JSON aggregates match seed.", "High"),
        ("Chart.js dashboard", "Bar/line for revenue trend.", 70, "Monthly dashboard screenshot.", "High"),
        ("Report filters", "Date range + export trigger.", 40, "Filter changes chart.", "Medium"),
    ],
    26: [
        ("HTML prescription template", "Branding + table for meds/dosage.", 55, "Preview in browser.", "High"),
        ("PDF render service", "Puppeteer/pdf-lib or server lib from encounter.", 55, "Download PDF sample.", "High"),
        ("Secure download route", "Auth + short-lived token for PDF.", 50, "Doctor can download own Rx.", "High"),
    ],
    27: [
        ("Signed QR payload", "Encode visit/Rx id + checksum.", 35, "QR renders on screen.", "Medium"),
        ("Verify API / kiosk page", "Scan flow validates signature.", 35, "Valid vs tampered demo.", "Medium"),
        ("Mobile scan UX", "Camera opens; deep link optional.", 30, "Phone camera demo.", "Medium"),
    ],
    28: [
        ("SMTP transporter", "Env-based config; HTML templates folder.", 45, "Send test mail.", "Medium"),
        ("Template triggers", "After visit: results; Rx; follow-up date.", 40, "Correct template picked.", "Medium"),
        ("MailHog / log mode", "Dev capture without real SMTP.", 35, "MailHog inbox shows mail.", "Medium"),
    ],
    29: [
        ("Branch geo fields", "lat/lng on clinic document.", 35, "Map centers correctly.", "Medium"),
        ("Maps embed component", "Google/Mapbox embed + directions link.", 35, "Directions open externally.", "Medium"),
        ("Marker UX", "Info window with hours/phone.", 30, "One marker demo.", "Medium"),
    ],
    30: [
        ("Complaint ticket model", "Statuses: new/in_progress/resolved.", 40, "State transitions.", "Standard"),
        ("Admin triage UI", "Kanban or table by status.", 40, "Admin updates status.", "Standard"),
        ("Patient complaint form", "Portal submit + list own tickets.", 30, "Ticket workflow.", "Standard"),
    ],
    31: [
        ("Shared validators", "Zod/Joi schemas colocated with routes.", 50, "Reused across modules.", "Medium"),
        ("Wire validators on routers", "Central registration pattern.", 55, "Invalid body 400.", "Medium"),
        ("400 demo collection", "Postman examples for team.", 45, "Example 400 body.", "Medium"),
    ],
    32: [
        ("Error code enum + DTO", "Consistent JSON error shape.", 30, "Docs in README.", "Medium"),
        ("Global error middleware", "Map errors to status; hide stack in prod.", 30, "Prod vs dev behavior.", "Medium"),
        ("Postman error examples", "Saved responses for common codes.", 20, "Error shape demo.", "Standard"),
    ],
    33: [
        ("Seed script content", "Departments, rooms, sample users, ICD sample.", 35, "DB populated after run.", "Standard"),
        ("npm run seed wiring", "package.json script + idempotent upserts.", 25, "Second run no dup errors.", "Standard"),
    ],
    34: [
        ("OpenAPI or endpoint table", "All main routes listed.", 25, "File committed under docs/.", "Standard"),
        ("README link", "Single link to contract from root README.", 15, "Link works on GitHub.", "Standard"),
    ],
    35: [
        ("Supertest: health + 404", "Smoke baseline.", 35, "CI green on empty DB.", "Medium"),
        ("Supertest: auth + booking stub", "Minimal happy path.", 40, "Uses test DB.", "Medium"),
        ("CI workflow", "GitHub Action runs tests on push.", 25, "Badge optional.", "Medium"),
    ],
}
