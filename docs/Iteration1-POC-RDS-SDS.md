# OrcaXCare — Iteration 1 Documentation

**Course:** WDP301 | **Group:** SE1816 — GROUP 4  
**Product:** OrcaXCare — Healthcare portal (Patient / Doctor / Admin)  
**Stack:** MERN (React + Vite, Express, MongoDB Atlas)  
**Backlog reference:** `Group 4/OrcaXCare-Backlog.xlsx` → sheet **Iter1** (48 screen/functions)

---

# I. Overview (POC — Iteration 1)

## 1. Screen Flow

Iteration 1 delivers the **system foundation**: public portal, authentication, RBAC, master data (specialty, department, clinic room, doctor), patient profile, and role dashboards.

**Diagram file:** `Group 4/Iteration 1/diagrams/screen-flow-iter1.puml`  
Export to PNG/SVG and paste into Word/PPT where the template shows “Screen Flow”.

**Flow summary**

| Zone | Entry | Main screens |
|------|--------|----------------|
| Public | Portal Home | Login, Register, Forgot Password, Search Doctors, Doctor Public Profile |
| Patient | Login → Patient Dashboard | Own Profile, Update Profile, Upload Avatar, Change Password, Logout |
| Admin | Login → Admin Dashboard | Accounts, Specialties, Departments, Clinic Rooms, Doctors, Patients |

## 2. Database Scheme

Iteration 1 persists data in **MongoDB** (Atlas). Core collections for this iteration:

| Collection | Purpose |
|------------|---------|
| `users` | Login identity, role, email verification flags |
| `patients` | Patient demographics linked to `users` |
| `doctors` | Doctor profile linked to `users`, specialty, department |
| `specialties` | Medical specialty master |
| `departments` | Clinic units / branches |
| `clinic_rooms` | Rooms under a department |
| `email_verification_tokens` | Register → verify email |
| `password_reset_tokens` | Forgot password flow |

**Diagram file:** `Group 4/Iteration 1/diagrams/erd-iter1.puml`  
**Reference:** `Group 4/Prototypes/Database Diagram.png` (full system; Iter 1 uses the subset above).

## 3. Implementing Priorities

Priority screens (left = highest). Layouts for screens marked * are fully specified in **Section II.2** below; others follow the same OrcaXCare UI shell (header + role menu + content).

### Priority #1 (must complete first)

Portal Home, Register Account, Login, Patient Dashboard, Admin Dashboard, View Accounts List, View Specialties List

### Priority #2

Verify Email, Forgot Password, View Own Profile, Search Doctors, View Doctor Public Profile, View Doctors List (Admin), Create Specialty, View Departments List, Create Doctor

### Priority #3

Change Password, Update Own Profile, Upload Profile Avatar, Update Account, Create Department, Clinic Rooms, Update Doctor, Deactivate Doctor, Import/Export Doctors Excel, Patient List (Admin), Resend Verification Email, remaining CRUD (update/delete specialty, department, account restore, etc.)

**Sprint outcome (from backlog):** Admin manages accounts, specialties, departments, and doctors. Patient registers, verifies email, logs in, updates profile, and searches doctors. Each role lands on the correct dashboard.

---

# II. RDS — Requirements & Design Specification (Iteration 1)

## 1. Use Case Diagram

**Diagram file:** `Group 4/Iteration 1/diagrams/use-case-iter1.puml`

### 1.1 Actors

| Actor | Description |
|-------|-------------|
| **Guest** | Visitor without login; can browse portal and register |
| **Patient** | Registered end-user; profile and doctor search |
| **Admin** | Hospital staff managing master data and accounts |

*Doctor-specific clinical flows (queue, EMR) are **out of scope** for Iteration 1.*

### 1.2 Use Case List (Iteration 1)

| ID | Feature | Use Case | Description |
|----|---------|----------|-------------|
| ORCX-001 | Authentication | Login | User signs in; JWT issued; redirect by role |
| ORCX-002 | Authentication | Logout | Clear session; return to portal |
| ORCX-003 | Authentication | Register Account (Patient) | Create patient user; send verification email |
| ORCX-004 | Authentication | Forgot Password | Request reset link; set new password |
| ORCX-005 | Authentication | Verify Email | Activate account via email token |
| ORCX-006 | Authentication | Resend Verification Email | Resend with rate limit |
| ORCX-007 | Authentication | Change Password | Logged-in user changes password |
| ORCX-008–013 | Account Management | Manage Accounts | List, detail, create staff, update, role, deactivate/restore |
| ORCX-014–018 | Specialty Management | Manage Specialties | CRUD specialty master |
| ORCX-019–023 | Department Management | Manage Departments | CRUD department |
| ORCX-024–026 | Facility Management | Manage Clinic Rooms | Create, list, update rooms |
| ORCX-027–035 | Doctor Management | Manage Doctors | CRUD, import/export Excel, public profile |
| ORCX-036–038 | Patient Portal | Portal & Search | Home, featured doctors, search/filter doctors |
| ORCX-039–041 | Patient Profile | Own Profile | View, update, avatar upload |
| ORCX-042–046 | Patient Profile | Admin Patient Records | List, detail, create, update, deactivate |
| ORCX-139 | Shared UI | Patient Dashboard | Post-login patient home |
| ORCX-140 | Shared UI | Admin Dashboard | Post-login admin home |

## 2. Screens Flow

See **I.1** and diagram `screen-flow-iter1.puml`.

**Navigation rules**

- **Header (all pages):** Logo → Portal Home; Login / Register when guest; avatar menu when logged in (Profile, Change Password, Logout).
- **Patient:** Dashboard shortcuts → Search Doctors, Profile, (booking placeholder disabled until Iter 2).
- **Admin:** Left sidebar tree → Accounts, Specialties, Departments, Clinic Rooms, Doctors, Patients, Dashboard.

## 2.2 Screen Descriptions

| # | Screen / Function | Feature | Screen/Function Description |
|---|-------------------|---------|----------------------------|
| 1 | Login | Authentication | Email/password form with remember-me. On success, API returns JWT; client stores token and routes to Patient or Admin dashboard. Invalid credentials show inline error. |
| 2 | Logout | Authentication | Clears token and redirects to Portal Home. Protected routes blocked after logout. |
| 3 | Register Account (Patient) | Authentication | Collects email, password, name, phone, terms. Creates inactive user until email verified. |
| 4 | Forgot Password | Authentication | User enters email; reset link sent (30 min expiry). New password page from link. |
| 5 | Verify Email | Authentication | Landing from email link; validates token; sets `isEmailVerified`. |
| 6 | Resend Verification Email | Authentication | Button on login/profile; cooldown to prevent spam. |
| 7 | Change Password (logged in) | Authentication | Current + new password; updates hash; optional re-login. |
| 8 | View Accounts List | Account Management | Paginated users; filter role/status; search name/email. |
| 9 | View Account Detail | Account Management | Role, status, linked doctor/patient id, last login. |
| 10 | Create Account (Staff) | Account Management | Admin creates doctor/admin user with role and temp password policy. |
| 11 | Update Account | Account Management | Edit contact fields; enforce unique email. |
| 12 | Change User Role | Account Management | Change patient/doctor/admin; confirm dialog. |
| 13 | Deactivate / Restore Account | Account Management | Soft-delete account; restore from detail. |
| 14–18 | Create/View/Update/Delete Specialty | Specialty Management | Standard admin CRUD on specialties. |
| 19–23 | Create/View/Update/Deactivate Department | Department Management | Department master CRUD. |
| 24–26 | Create/View/Update Clinic Room | Facility Management | Rooms linked to department. |
| 27 | Create Doctor | Doctor Management | Doctor profile + linked user; specialty/department dropdowns. |
| 28–31 | Doctor lists & profiles | Doctor Management | Admin list, patient list/cards, admin detail, public profile with Book CTA (disabled Iter 1). |
| 32–35 | Update/Deactivate/Import/Export Doctor | Doctor Management | Edit doctor; soft deactivate; Excel bulk import/export. |
| 36 | Portal Home | Patient Portal | Hero, services, featured doctors, login/register CTAs. |
| 37 | Featured Doctors | Patient Portal | Carousel of active doctors → public profile. |
| 38 | Search Doctors | Patient Portal | Name search + specialty/department filters; pagination. |
| 39–41 | View/Update Profile, Upload Avatar | Patient Profile | Patient self-service profile. |
| 42–46 | Patient admin CRUD | Patient Profile | Admin manages patient records. |
| 139 | Patient Dashboard | Shared UI | Shortcuts: search, profile (book/wallet placeholders). |
| 140 | Admin Dashboard | Shared UI | KPI cards: users, doctors; sidebar to modules. |

## 2.3 Screen Authorization

| Screen / Function | Guest | Patient | Admin |
|-------------------|:-----:|:-------:|:-----:|
| Portal Home | X | X | X |
| Login / Register / Forgot / Verify | X | | |
| Search Doctors / Doctor Public Profile | X | X | X |
| Patient Dashboard / Own Profile / Change Password | | X | |
| Admin Dashboard / Accounts / Master data / Doctors / Patients admin | | | X |
| Logout | | X | X |

## 2.4 Non-UI Functions

| Function | Type | Description |
|----------|------|-------------|
| Send verification email | Service | After register; SMTP stub in Iter 1 |
| Send password reset email | Service | Forgot password flow |
| JWT issue / validate | Middleware | `authMiddleware` on protected routes |
| Password hashing | Service | bcrypt on register/reset/change |
| Seed master data | Script | `npm run seed` — specialties, departments, sample admin |

## 3. System High Level Design

### 3.1 ERD

See `diagrams/erd-iter1.puml` and **I.2**.

### 3.2 Database Design

#### Table: `users`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | PK |
| email | string | unique, indexed |
| passwordHash | string | bcrypt |
| role | string | patient \| doctor \| admin |
| fullName | string | |
| phone | string | |
| isActive | boolean | default true |
| isEmailVerified | boolean | default false |
| lastLoginAt | Date | |
| createdAt, updatedAt | Date | |

#### Table: `specialties`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | PK |
| code | string | unique |
| name | string | unique |
| description | string | |
| isActive | boolean | |

#### Table: `departments`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | PK |
| name | string | |
| location | string | |
| phone | string | |
| isActive | boolean | |

#### Table: `doctors`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | PK |
| userId | ObjectId | FK → users |
| specialtyId | ObjectId | FK → specialties |
| departmentId | ObjectId | FK → departments |
| licenseNo | string | |
| bio | string | |
| photoUrl | string | |
| isActive | boolean | |

#### Table: `patients`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | PK |
| userId | ObjectId | FK → users |
| dateOfBirth | Date | |
| gender | string | |
| address | string | |
| emergencyContact | string | |
| avatarUrl | string | |
| isActive | boolean | |

*(Similarly: `clinic_rooms`, `email_verification_tokens`, `password_reset_tokens`.)*

### 3.3 Code Packages (planned MERN layout)

```
orcax-care/
├── client/src/
│   ├── pages/          # LoginPage, RegisterPage, PortalHome, admin/*
│   ├── components/     # Header, Sidebar, DataTable, FormFields
│   ├── services/       # api.js (axios + JWT interceptor)
│   └── routes/         # ProtectedRoute by role
└── server/src/
    ├── routes/         # auth.routes, admin.routes, patient.routes
    ├── controllers/
    ├── services/
    ├── models/         # Mongoose schemas
    └── middlewares/    # auth, errorHandler
```

| Package | Responsibility |
|---------|----------------|
| `routes/auth` | login, register, verify, forgot, change password |
| `routes/admin` | accounts, specialties, departments, doctors, patients |
| `routes/public` | portal home data, doctor search (read-only) |
| `middlewares/auth` | verify JWT, attach `req.user` |
| `models/*` | MongoDB schemas |

## 4. Requirement Specifications (sample UC detail)

### UC-ORCX-001 Login

| Item | Description |
|------|-------------|
| **Actors** | Guest, Patient, Doctor, Admin |
| **Precondition** | Account exists and is active; patient must be email-verified |
| **Main flow** | 1. User opens Login. 2. Enters email/password. 3. System validates. 4. Returns JWT. 5. Client redirects by role. |
| **Alternative** | Invalid credentials → error message; locked account → 403 |
| **Postcondition** | Session established; `lastLoginAt` updated |

### UC-ORCX-003 Register Account (Patient)

| Item | Description |
|------|-------------|
| **Actors** | Guest |
| **Precondition** | Email not registered |
| **Main flow** | 1. Submit form. 2. Create user (patient, unverified). 3. Send verification email. 4. User verifies via ORCX-005. 5. User can login. |
| **Postcondition** | Patient record optional until profile completed |

*(Other UCs follow the same table pattern; map 1:1 to backlog rows in Iter1 sheet.)*

---

# III. SDS — Software Design Specification (Iteration 1)

## 1. System High Level Design — Code Packages

Same as **II.3.3**. Naming conventions:

- **React components:** PascalCase (`LoginPage.jsx`)
- **API routes:** kebab REST (`/api/auth/login`, `/api/admin/doctors`)
- **Mongoose models:** singular PascalCase file (`User.js`, `Doctor.js`)

## 2. Database Design

Aligned with **II.3.2**. Indexes recommended:

```javascript
// users
db.users.createIndex({ email: 1 }, { unique: true })
// doctors
db.doctors.createIndex({ specialtyId: 1, isActive: 1 })
db.doctors.createIndex({ departmentId: 1 })
```

## II. Code Designs (detailed)

### Feature: Login (ORCX-001)

**Class / module responsibilities**

| Class / Module | Responsibility |
|----------------|----------------|
| `LoginPage` | Form UI, client validation, call API |
| `AuthController` | HTTP layer, status codes |
| `AuthService` | Business rules, bcrypt, JWT |
| `UserRepository` | MongoDB access for users |

**Sequence diagram:** `diagrams/seq-login.puml`

**Database access**

| Transaction | Table | Operation |
|-------------|-------|-----------|
| Login | users | R |

**SQL equivalent (MongoDB)**

```javascript
// Find user
db.users.findOne({ email: email.toLowerCase(), isActive: true })

// Update last login
db.users.updateOne(
  { _id: userId },
  { $set: { lastLoginAt: new Date() } }
)
```

---

### Feature: Register + Verify Email (ORCX-003, ORCX-005)

**Sequence diagram:** `diagrams/seq-register.puml`

**Database access**

| Step | Collection | C/U/R/D |
|------|------------|---------|
| Register | users | C |
| Register | email_verification_tokens | C |
| Verify | users | U |
| Verify | email_verification_tokens | R, D |

```javascript
db.users.insertOne({
  email, passwordHash, role: 'patient', fullName, phone,
  isActive: true, isEmailVerified: false, createdAt: new Date()
})
db.email_verification_tokens.insertOne({
  userId, token, expiresAt: new Date(Date.now() + 24*60*60*1000)
})
```

---

### Feature: Create Doctor (ORCX-027)

**Sequence diagram:** `diagrams/seq-create-doctor.puml`

**Database access**

| Collection | Operation |
|------------|-----------|
| users | C (role=doctor) |
| doctors | C |

```javascript
// After creating user with _id = userId
db.doctors.insertOne({
  userId, specialtyId, departmentId,
  licenseNo, bio, photoUrl, isActive: true, createdAt: new Date()
})
```

---

### Feature: Search Doctors (ORCX-038)

**Sequence (summary):** `SearchDoctorsPage` → `GET /api/public/doctors?name=&specialtyId=&departmentId=&page=` → `DoctorService.search` → aggregation on `doctors` + populate specialty/department.

```javascript
db.doctors.find({
  isActive: true,
  ...(specialtyId && { specialtyId }),
  ...(departmentId && { departmentId }),
  ...(name && { $or: [
    { 'user.fullName': { $regex: name, $options: 'i' } }
  ]})
}).skip((page-1)*limit).limit(limit)
```

---

### Other Iteration 1 screens

Apply the same SDS template (Class responsibilities → Sequence diagram → DB access table → MongoDB queries) for:

- Admin CRUD screens (Specialty, Department, Account) — pattern identical to Create Doctor with single collection updates.
- Patient profile PATCH — `patients` + `users` partial update with `req.user.id` ownership check.

---

## Appendix

| Artifact | Path |
|----------|------|
| Backlog Iter 1 | `Group 4/OrcaXCare-Backlog.xlsx` (sheet Iter1) |
| Diagrams | `Group 4/Iteration 1/diagrams/*.puml` |
| Full DB diagram | `Group 4/Prototypes/Database Diagram.png` |
| Course POC template | `Iteration 1_POC Requirements.pdf` |
| RDS / SDS slide templates | `RDS Document.pptx`, `SDS Document.pptx` |

**Team:** TruongNTCE180140, ThangNDCE180608, ThangDQCE182036, TanhNTCE182341, KhoaNNCE181612

**How to use with course templates**

1. Copy **Section I** into Iteration 1 POC Word/PDF (replace ecommerce examples).
2. Copy **Section II** into RDS Word/PPT slides (Use case → Screen flow → Screen descriptions → Authorization → ERD → DB tables → Packages → UC specs).
3. Copy **Section III** into SDS (Packages → DB → per-feature sequence diagrams from `.puml` exports).
4. Export PlantUML diagrams to images and insert where templates show blank placeholders.
