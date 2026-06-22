# ThangDQ Iteration 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build ThangDQ's assigned Iteration 3 EMR, imaging, prescription, and pharmacy read-only features with one stacked branch and commit per use case.

**Architecture:** Add focused Mongoose models for `Encounter`, `MedicalImage`, and `Prescription`, then expose role-scoped Express controllers/services under existing doctor, patient, and staff routers. Frontend pages call these APIs through small service modules and reuse existing portal layouts.

**Tech Stack:** Express, Mongoose, MongoDB memory server, Node `node:test`, React, React Router, Axios.

---

### Task 1: UC-21 Patient EMR Timeline

**Branch:** `feature/UC-21-patient-emr-timeline`

**Files:**
- Create: `server/src/models/Encounter.js`
- Create: `server/src/controllers/patientEmr.controller.js`
- Create: `server/src/services/patientEmr.service.js`
- Modify: `server/src/routes/patient.routes.js`
- Create: `server/src/tests/patientEmrTimeline.test.js`
- Modify: `client/src/services/patientApi.js`
- Create: `client/src/pages/PatientEmrTimelinePage.jsx`
- Create: `client/src/pages/PatientEmrTimelinePage.css`
- Modify: `client/src/App.jsx`

- [ ] Write failing integration test for patient timeline filtering by owner and date range.
- [ ] Implement `Encounter` model and patient EMR service serialization.
- [ ] Add patient route and controller.
- [ ] Add patient frontend timeline page and route.
- [ ] Run `npm test -- patientEmrTimeline.test.js` in `server`.
- [ ] Run `npm run build` in `client`.
- [ ] Commit: `feat: add patient emr timeline`

### Task 2: UC-17.1.1.1.2 Sign Off Encounter

**Branch:** `feature/UC-17.1.1.1.2-sign-off-encounter`

**Files:**
- Modify: `server/src/models/Encounter.js`
- Create: `server/src/controllers/doctorEncounter.controller.js`
- Create: `server/src/services/doctorEncounter.service.js`
- Modify: `server/src/routes/doctor.routes.js`
- Create: `server/src/tests/signOffEncounter.test.js`
- Modify: `client/src/services/doctorApi.js`
- Create: `client/src/pages/DoctorEncounterDetailPage.jsx`
- Create: `client/src/pages/DoctorEncounterDetailPage.css`
- Modify: `client/src/App.jsx`

- [ ] Write failing integration test for doctor sign-off and locked encounter behavior.
- [ ] Implement doctor encounter detail and sign-off service.
- [ ] Add doctor routes and controller.
- [ ] Add doctor encounter detail page with confirmation dialog.
- [ ] Run `npm test -- signOffEncounter.test.js` in `server`.
- [ ] Run `npm run build` in `client`.
- [ ] Commit: `feat: add encounter sign off`

### Task 3: UC-23.1.2 Delete Medical Image

**Branch:** `feature/UC-23.1.2-delete-medical-image`

**Files:**
- Create: `server/src/models/MedicalImage.js`
- Modify: `server/src/services/doctorEncounter.service.js`
- Modify: `server/src/controllers/doctorEncounter.controller.js`
- Modify: `server/src/routes/doctor.routes.js`
- Create: `server/src/tests/deleteMedicalImage.test.js`
- Modify: `client/src/pages/DoctorEncounterDetailPage.jsx`

- [ ] Write failing integration test for doctor soft-deleting an image on own unsigned encounter.
- [ ] Implement `MedicalImage` model and delete service.
- [ ] Hide deleted images in encounter and timeline serialization.
- [ ] Add frontend confirmation and thumbnail removal.
- [ ] Run `npm test -- deleteMedicalImage.test.js` in `server`.
- [ ] Run `npm run build` in `client`.
- [ ] Commit: `feat: add medical image soft delete`

### Task 4: UC-24 Create Prescription

**Branch:** `feature/UC-24-create-prescription`

**Files:**
- Create: `server/src/models/Prescription.js`
- Create: `server/src/controllers/doctorPrescription.controller.js`
- Create: `server/src/services/doctorPrescription.service.js`
- Modify: `server/src/routes/doctor.routes.js`
- Create: `server/src/tests/createPrescription.test.js`
- Modify: `client/src/services/doctorApi.js`
- Create: `client/src/pages/DoctorPrescriptionCreatePage.jsx`
- Create: `client/src/pages/DoctorPrescriptionCreatePage.css`
- Modify: `client/src/App.jsx`

- [ ] Write failing integration test for creating prescription line items with stock warnings.
- [ ] Implement `Prescription` model and create service.
- [ ] Add doctor prescription route and controller.
- [ ] Add create prescription page.
- [ ] Run `npm test -- createPrescription.test.js` in `server`.
- [ ] Run `npm run build` in `client`.
- [ ] Commit: `feat: add prescription creation`

### Task 5: UC-24.5 Prescription Detail

**Branch:** `feature/UC-24.5-prescription-detail`

**Files:**
- Modify: `server/src/services/doctorPrescription.service.js`
- Modify: `server/src/controllers/doctorPrescription.controller.js`
- Create: `server/src/controllers/patientPrescription.controller.js`
- Create: `server/src/services/patientPrescription.service.js`
- Modify: `server/src/routes/doctor.routes.js`
- Modify: `server/src/routes/patient.routes.js`
- Create: `server/src/tests/prescriptionDetail.test.js`
- Modify: `client/src/services/patientApi.js`
- Create: `client/src/pages/PrescriptionDetailPage.jsx`
- Create: `client/src/pages/PrescriptionDetailPage.css`
- Modify: `client/src/App.jsx`

- [ ] Write failing integration test for doctor and patient read-only prescription detail access.
- [ ] Implement shared prescription serialization.
- [ ] Add patient and doctor detail routes.
- [ ] Add read-only frontend detail page with print button.
- [ ] Run `npm test -- prescriptionDetail.test.js` in `server`.
- [ ] Run `npm run build` in `client`.
- [ ] Commit: `feat: add prescription detail`

### Task 6: UC-32 Medicine Detail

**Branch:** `feature/UC-32-medicine-detail`

**Files:**
- Modify: `server/src/services/staffPharmacy.service.js`
- Modify: `server/src/controllers/staffPharmacy.controller.js`
- Modify: `server/src/routes/staff.routes.js`
- Create: `server/src/tests/medicineDetail.test.js`
- Modify: `client/src/services/staffApi.js`
- Create: `client/src/pages/StaffMedicineDetailPage.jsx`
- Create: `client/src/pages/StaffMedicineDetailPage.css`
- Modify: `client/src/App.jsx`

- [ ] Write failing integration test for medicine detail with batch and movement history.
- [ ] Implement staff pharmacy detail service.
- [ ] Add staff route and controller.
- [ ] Add read-only frontend detail page.
- [ ] Run `npm test -- medicineDetail.test.js` in `server`.
- [ ] Run `npm run build` in `client`.
- [ ] Commit: `feat: add medicine detail`
