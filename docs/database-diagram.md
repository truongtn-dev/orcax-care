# OrcaXCare — Database diagram (ERD)

This document describes the **logical data model** (ERD) for **Healthcare administration & patient portal** (MERN + MongoDB Atlas). Use it to lock the schema before implementing APIs (following team dependency order).

**Conventions:** `PK` = primary key (`_id` as ObjectId), `FK` = reference `ObjectId` to another collection. Store money as the **smallest currency integer unit** (e.g. VND ×1) in code + validation; avoid `float`.

---

## 1. Full ER diagram (Mermaid)

> Render in VS Code / GitHub / Notion with Mermaid. Export PNG: [mermaid.live](https://mermaid.live) or import into draw.io.
>
> **Mermaid note:** Inside entity bodies **do not** use attribute names starting with `_` (e.g. `_id`) — the parser raises `BLOCK_STOP`. Use `id` to mean MongoDB `_id`; reference fields use type `string` (ObjectId in the app).

```mermaid
erDiagram
  USER ||--o| PATIENT_PROFILE : "role patient"
  USER ||--o| DOCTOR_PROFILE : "role doctor"
  USER ||--o| ADMIN_PROFILE : "role admin"
  USER ||--|| WALLET : "patient pays"
  USER ||--o{ WALLET_TRANSACTION : "initiated_by"
  USER ||--o{ APPOINTMENT : "patient books"
  USER ||--o{ REVIEW : "patient writes"
  USER ||--o{ FAVORITE_DOCTOR : "patient saves"
  USER ||--o{ COMPLAINT : "patient files"
  USER ||--o{ NOTIFICATION : "receives"
  USER ||--o{ PUSH_SUBSCRIPTION : "web push"

  DEPARTMENT ||--o{ DOCTOR_PROFILE : "works_in"
  SPECIALTY ||--o{ DOCTOR_PROFILE : "has"

  BRANCH ||--o{ CLINIC_ROOM : "contains"
  CLINIC_ROOM ||--o{ QUEUE_SESSION : "session_at"

  DOCTOR_PROFILE ||--o{ DOCTOR_TIMESLOT : "publishes"
  DOCTOR_PROFILE ||--o{ APPOINTMENT : "serves"
  DOCTOR_PROFILE ||--o{ QUEUE_SESSION : "conducts"
  DOCTOR_PROFILE ||--o{ REVIEW : "rated"

  DOCTOR_TIMESLOT ||--o{ APPOINTMENT : "reserved_by"

  APPOINTMENT ||--o| QUEUE_TICKET : "check-in"
  APPOINTMENT ||--o| ENCOUNTER : "visit"
  APPOINTMENT }o--o| WALLET_TRANSACTION : "deposit_or_refund"

  ENCOUNTER ||--o{ DIAGNOSIS_ENTRY : "icd"
  ENCOUNTER ||--o{ PRESCRIPTION : "generates"
  ENCOUNTER ||--o{ MEDIA_ASSET : "imaging"

  ICD_CODE ||--o{ DIAGNOSIS_ENTRY : "coded_as"

  PRESCRIPTION ||--o{ PRESCRIPTION_LINE : "lines"
  PRESCRIPTION_LINE }o--|| MEDICINE : "drug"
  PRESCRIPTION_LINE ||--o{ INVENTORY_MOVEMENT : "dispense_trace"

  MEDICINE ||--o{ INVENTORY_MOVEMENT : "stock_delta"

  PATIENT_PROFILE ||--o| INSURANCE_POLICY : "optional"

  QUEUE_SESSION ||--o{ QUEUE_TICKET : "ordered"

  USER {
    string id PK
    string email UK
    string passwordHash
    string role
    string fullName
    string phone
    string avatarUrl
    string status
    date createdAt
    date updatedAt
  }

  PATIENT_PROFILE {
    string id PK
    string userId FK
    date dateOfBirth
    string address
    string medicalHistorySummary
  }

  DOCTOR_PROFILE {
    string id PK
    string userId FK
    string departmentId FK
    string specialtyId FK
    string licenseNumber
    number consultationFeeMinor
    string bio
    boolean isActive
  }

  ADMIN_PROFILE {
    string id PK
    string userId FK
    string jobTitle
  }

  DEPARTMENT {
    string id PK
    string name
    string code UK
  }

  SPECIALTY {
    string id PK
    string name
    string departmentId FK
  }

  BRANCH {
    string id PK
    string name
    string address
    number geoLat
    number geoLng
  }

  CLINIC_ROOM {
    string id PK
    string branchId FK
    string name
    string equipmentNotes
  }

  DOCTOR_TIMESLOT {
    string id PK
    string doctorProfileId FK
    date startAt
    date endAt
    number capacity
    string slotStatus
  }

  APPOINTMENT {
    string id PK
    string patientUserId FK
    string doctorProfileId FK
    string timeslotId FK
    string apptStatus
    string qrCheckInToken UK
    string depositTxId FK
    date createdAt
  }

  QUEUE_SESSION {
    string id PK
    string doctorProfileId FK
    string clinicRoomId FK
    date serviceDate
    number currentTicketNo
    boolean isActive
  }

  QUEUE_TICKET {
    string id PK
    string queueSessionId FK
    string appointmentId FK
    number ticketNo
    string ticketStatus
    date calledAt
  }

  WALLET {
    string id PK
    string userId FK
    number balanceMinor
    string currency
    date updatedAt
  }

  WALLET_TRANSACTION {
    string id PK
    string walletId FK
    string initiatedByUserId FK
    string txType
    number amountMinor
    string txStatus
    string gateway
    string gatewayRef
    string relatedAppointmentId FK
    string idempotencyKey UK
    date createdAt
  }

  INSURANCE_POLICY {
    string id PK
    string patientProfileId FK
    string cardNumber
    number coveragePercent
    string ocrImageUrl
    date validFrom
    date validTo
  }

  ENCOUNTER {
    string id PK
    string appointmentId FK
    string doctorUserId FK
    string patientUserId FK
    string chiefComplaint
    string clinicalNotes
    date startedAt
    date endedAt
  }

  ICD_CODE {
    string id PK
    string code UK
    string title
  }

  DIAGNOSIS_ENTRY {
    string id PK
    string encounterId FK
    string icdCodeId FK
    string freeTextNote
  }

  PRESCRIPTION {
    string id PK
    string encounterId FK
    string pdfUrl
    string qrVerifyPayload
    date issuedAt
  }

  PRESCRIPTION_LINE {
    string id PK
    string prescriptionId FK
    string medicineId FK
    string dosage
    number quantity
    string duration
  }

  MEDICINE {
    string id PK
    string name
    string sku UK
    string unit
    number unitPriceMinor
    number stockQty
    date nearestExpiry
  }

  INVENTORY_MOVEMENT {
    string id PK
    string medicineId FK
    string moveType
    number quantityDelta
    string prescriptionLineId FK
    date createdAt
  }

  MEDIA_ASSET {
    string id PK
    string encounterId FK
    string cloudinaryPublicId
    string modality
    string caption
  }

  REVIEW {
    string id PK
    string patientUserId FK
    string doctorProfileId FK
    string appointmentId FK
    number rating
    string comment
    date createdAt
  }

  FAVORITE_DOCTOR {
    string id PK
    string patientUserId FK
    string doctorProfileId FK
  }

  COMPLAINT {
    string id PK
    string patientUserId FK
    string subject
    string body
    string complaintStatus
    string assignedAdminUserId FK
    date createdAt
  }

  NOTIFICATION {
    string id PK
    string userId FK
    string channel
    string title
    string body
    boolean isRead
    date createdAt
  }

  PUSH_SUBSCRIPTION {
    string id PK
    string userId FK
    string endpoint
    string p256dh
    string auth
  }
```

**`INVENTORY_MOVEMENT` note:** The `dispense_trace` edge is stock-out tied to a **prescription line** (traceable to `ENCOUNTER` → patient). **Inbound / adjustment** movements not tied to a prescription leave `prescriptionLineId` **null** — the ERD is still valid; there is simply no edge to a specific line.

---

## 2. Grouping by domain (for parallel work)

| Area | Collections / focus | Notes |
|------|----------------------|--------|
| **Identity & RBAC** | `users`, `patient_profiles`, `doctor_profiles`, `admin_profiles` | JWT carries `userId` + `role`; RBAC in middleware + resource ownership checks. |
| **Catalog & CMS** | `departments`, `specialties`, `branches`, `clinic_rooms`, `icd_codes`, `medicines` | Admin/doctor CMS; `medicines` links stock + expiry warnings (field or separate batch collection later). |
| **Scheduling** | `doctor_timeslots`, `appointments` | Prevent double booking: partial unique index on `(doctorProfileId, startAt)` or enforce max N `appointments` per slot via `capacity`. |
| **Real-time queue** | `queue_sessions`, `queue_tickets` | Socket.io **pushes events**; the database remains the source of truth. |
| **Finance** | `wallets`, `wallet_transactions` | Credits/debits inside a **MongoDB transaction** or outbox pattern; `idempotencyKey` prevents double payment. |
| **Insurance** | `insurance_policies` | OCR stores image URL + parsed fields; apply discounts in the service layer when creating `wallet_transactions`. |
| **Visit & EMR** | `encounters`, `diagnosis_entries`, `media_assets` | Timeline = sort `encounters` by `startedAt`. |
| **Prescribing & stock** | `prescriptions`, `prescription_lines`, `inventory_movements` | Deduct stock when finalizing a prescription; `inventory_movements` is the audit trail. |
| **Portal & engagement** | `reviews`, `favorite_doctors`, `complaints`, `notifications`, `push_subscriptions` | Web Push stores subscription per user. |

---

## 3. Suggested indexes (minimum)

- `users.email` **unique**
- `appointments`: `(doctorProfileId, timeslotId)` **unique** (if one slot = one patient), or a compound index per your slot rules
- `wallet_transactions.idempotencyKey` **unique sparse**
- `queue_tickets`: `(queueSessionId, ticketNo)` **unique**
- `favorite_doctors`: `(patientUserId, doctorProfileId)` **unique**
- `reviews`: `appointmentId` **unique** (one review per appointment)

---

## 4. Team decisions to lock **before** bulk coding

1. **User vs profile:** separate `users` + role-specific profiles (as in the diagram) vs single document — the diagram assumes split profiles for clearer forms and indexes.
2. **Visit slots:** are `doctor_timeslots` system-generated (shifts) or doctor-created — affects scheduling features (e.g. backlog items 2, 20).
3. **Wallet scope:** wallet only for `role=patient` or also internal staff wallets — affects unique `wallet.userId`.
4. **Prescription PDF / QR:** store `pdfUrl` + `qrVerifyPayload` vs hash-only — affects the `prescriptions` collection shape.

---

## 5. Revision history

| Version | Date | Description |
|---------|------|-------------|
| 0.2 | 2026-05-14 | Mermaid erDiagram syntax fixes (`id` instead of `_id`, string fields instead of quoted enums, `isRead` instead of `read`). |
| 0.1 | 2026-05-14 | Initial OrcaXCare ERD draft (WDP301). |
| 0.3 | 2026-05-14 | Documentation translated to English. |
