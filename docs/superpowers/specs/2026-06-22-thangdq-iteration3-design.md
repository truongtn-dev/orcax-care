# ThangDQ Iteration 3 Design

## Scope

This design covers the six assigned backlog items:

- UC-21 Patient EMR Timeline
- UC-17.1.1.1.2 Sign Off Encounter
- UC-23.1.2 Delete Medical Image
- UC-24 Create Prescription
- UC-24.5 View Prescription Detail
- UC-32 Medicine Detail

The implementation is split into stacked branches because all use cases share the same clinical data model.

## Backend Model

The clinical visit flow centers on `Encounter`. An encounter belongs to one appointment, one patient user, and one doctor. It stores visit notes, vital signs, diagnosis entries, and sign-off metadata. A signed encounter is read-only for clinical edits.

`MedicalImage` belongs to an encounter. Delete is a soft delete: the record keeps its metadata, URL, and deletion audit fields, but normal encounter and patient APIs hide deleted images.

`Prescription` belongs to an encounter. It stores medicine line items with quantity, duration, instructions, unit price, stock snapshot, and stock warning. Prescription creation warns about insufficient stock but does not decrement stock until encounter sign-off.

`Medicine` remains the pharmacy inventory model. UC-32 adds a read-only detail endpoint with stock movements and batch summaries.

## API Design

Doctor APIs live under `/api/doctor` and require role `doctor`.

- `GET /api/doctor/encounters/:id`
- `POST /api/doctor/encounters/:id/sign-off`
- `DELETE /api/doctor/medical-images/:id`
- `POST /api/doctor/encounters/:id/prescriptions`
- `GET /api/doctor/prescriptions/:id`

Patient APIs live under `/api/patient` and require role `patient`.

- `GET /api/patient/emr/timeline?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/patient/prescriptions/:id`

Staff pharmacy APIs live under `/api/staff` and require role `staff` or `admin`.

- `GET /api/staff/pharmacy/medicines/:id`

## Frontend Design

The patient EMR timeline is a patient page with date filters and chronological cards. Each card shows appointment context, doctor name, diagnoses, images, and prescription summaries.

Doctor-facing encounter and prescription screens are read-only or mutation-enabled based on encounter state. Sign-off uses a confirmation dialog. Image deletion uses a confirmation dialog and then removes the thumbnail from the active view.

Prescription detail is read-only for patient and doctor and includes a print button that calls `window.print()`.

Medicine detail is a staff/admin read-only page showing medicine attributes, batch summaries, and stock movement history.

## Testing

Backend behavior is covered with Node `node:test` integration tests using MongoDB memory server. Tests verify authorization, filtering, soft delete behavior, sign-off locking, prescription stock warnings, prescription read access, and medicine detail movement history.
