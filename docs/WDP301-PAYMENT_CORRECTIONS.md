# WDP301 Document — Payment Text Corrections (PayOS + SePay)

**Source file (do not edit):** `docs/WDP301-SE1816-GROUP4_Document.docx`  
**Purpose:** Copy the **After** text below into your Word document before exporting the final PDF.

**Policy:** OrcaXCare wallet top-up and payment gateways are **PayOS** and **SePay** only. **MoMo is removed.**

**Demo / test policy:** Use **real** PayOS and SePay sandbox APIs only (`PAYOS_MOCK=false`, `SEPAY_MOCK=false`). Do **not** demo in-app mock checkout pages or `mock-confirm` APIs. See `docs/PAYMENT_TEST_GUIDE.md`.

---

## 1. Quick Find & Replace (Word)

Run these in **Find and Replace** (Match case: OFF). Review each hit before replacing.

| Find | Replace with |
|------|----------------|
| `Momo` | `SePay` |
| `momo` | `sepay` |
| `PayOS/Momo` | `PayOS/SePay` |
| `PayOS, Momo` | `PayOS, SePay` |
| `PayOS or Momo` | `PayOS or SePay` |
| `PayOS (UC-7.1) or Momo (UC-7.2)` | `PayOS (UC-7.1) or SePay (UC-7.2)` |
| `Wallet / PayOS (UC-7.1) / Momo (UC-7.2)` | `Wallet / PayOS (UC-7.1) / SePay (UC-7.2)` |
| `Wallet, PayOS, or Momo` | `Wallet, PayOS, or SePay` |
| `Pay via Momo` | `Pay via SePay` |
| `through Momo` | `through SePay` |
| `via Momo` | `via SePay` |
| `PayOS / Momo` | `PayOS / SePay` |
| `wallet/PayOS/Momo` | `wallet/PayOS/SePay` |
| `Enum(payos, momo, wallet)` | `Enum(payos, sepay, wallet)` |
| `Process PayOS / Momo callback` | `Process PayOS / SePay callback` |
| `Payment (PayOS / Momo / Wallet)` | `Payment (PayOS / SePay / Wallet)` |
| `Payment gateways (PayOS/Momo)` | `Payment gateways (PayOS/SePay)` |
| `PayOS/Momo or medical wallet` | `PayOS/SePay or medical wallet` |
| `PayOS, Momo, or medical wallet` | `PayOS, SePay, or medical wallet` |
| `gateway choice PayOS/Momo` | `gateway choice PayOS/SePay` |
| `Momo (refund)` | `SePay (refund)` |

> After bulk replace, skim the document once — some sentences may need the longer **After** versions in Section 3 for accuracy (checkout flow, callbacks).

---

## 2. Use Case ID rename (Use Case List table)

**Table:** Use Case List (UC-7 sub-cases)

| UC ID | Column "Use Case Name" — Before | After |
|-------|----------------------------------|-------|
| UC-7.2 | Pay via Momo | **Pay via SePay** |

| UC ID | Column "Description" — Before | After |
|-------|--------------------------------|-------|
| UC-7.2 | Patient pays the booking fee through Momo. | **Patient pays the booking fee through SePay.** |

---

## 3. Section-by-section copy-paste

Each block: locate the matching text in Word → replace with **After**.

---

### 3.1 Actor description (Table — Actors, Patient row)

**Before:**
> …Patients can book appointments with doctors (pay via PayOS/Momo or medical wallet, apply insurance discounts)…

**After:**
> …Patients can book appointments with doctors (pay via PayOS/SePay or medical wallet, apply insurance discounts)…

---

### 3.2 UC-7 — Book Appointment (paragraph ~538)

**Before:**
> Description: Allows the Patient to book an appointment by selecting a doctor, date, and available time slot, then paying the consultation fee via Wallet, PayOS, or Momo. An eligible insurance card discount is applied automatically. The slot is held for 10 minutes during checkout; on successful payment the appointment is confirmed and a confirmation is sent.

**After:**
> Description: Allows the Patient to book an appointment by selecting a doctor, date, and available time slot, then paying the consultation fee via Wallet, PayOS, or SePay. An eligible insurance card discount is applied automatically. The slot is held for 10 minutes during checkout; on successful payment the appointment is confirmed and a confirmation is sent.

---

### 3.3 UC-7 — Related Use Case (paragraph ~539)

**Before:**
> Related Use Case: UC-7 – Book Appointment (UC-7.1 Pay via PayOS, UC-7.2 Pay via Momo, UC-7.3 Apply Insurance Discount)

**After:**
> Related Use Case: UC-7 – Book Appointment (UC-7.1 Pay via PayOS, UC-7.2 Pay via SePay, UC-7.3 Apply Insurance Discount)

---

### 3.4 UC-12 — View Wallet Balance (paragraph ~666)

**Before:**
> Description: Allows the Patient to view the medical wallet balance, top up via PayOS or Momo, and review the full transaction history (top-ups, payments, refunds) with filters by type and date range.

**After:**
> Description: Allows the Patient to view the medical wallet balance, top up via PayOS or SePay, and review the full transaction history (top-ups, payments, refunds) with filters by type and date range.

---

### 3.5 Screen flow — Payment popup (Table ~2.18)

**Before:**
> Patient confirms booking and pays via PayOS, Momo, or medical wallet. Eligible insurance discount is applied automatically.

**After:**
> Patient confirms booking and pays via PayOS, SePay, or medical wallet. Eligible insurance discount is applied automatically.

---

### 3.6 Screen name (Table ~3.16)

**Before:**
> Payment (PayOS / Momo / Wallet)

**After:**
> Payment (PayOS / SePay / Wallet)

---

### 3.7 API / backend process (Table ~4.5)

**Before:**
> Process PayOS / Momo callback

**After:**
> Process PayOS / SePay callback

---

### 3.8 Payment entity — `method` enum (Table ~5.15)

**Before:**
```
• method: Enum(payos, momo, wallet)
```

**After:**
```
• method: Enum(payos, sepay, wallet)
```

---

### 3.9 Service layer description (Table ~6.8)

**Before:**
> Implements the business logic of the system: authentication, booking and slot management, wallet and payment (PayOS/Momo), insurance discount, encounter/EMR, prescription, queue, pharmacy stock, notification, and email sending. This is the only layer allowed to access models.

**After:**
> Implements the business logic of the system: authentication, booking and slot management, wallet and payment (PayOS/SePay), insurance discount, encounter/EMR, prescription, queue, pharmacy stock, notification, and email sending. This is the only layer allowed to access models.

---

### 3.10 UC-7 use case spec — Secondary Actors (Table 19)

**Before:**
> Secondary Actors: PayOS, Momo

**After:**
> Secondary Actors: PayOS, SePay

---

### 3.11 UC-7 — Description (Table 19, Description row — 3 columns)

**Before:**
> This use case allows the Patient to book an appointment by selecting doctor, date, and an available time slot, then paying the consultation fee. Payment can be made via Wallet, PayOS (UC-7.1) or Momo (UC-7.2). An eligible insurance discount is applied automatically (UC-7.3). On success, the system confirms the appointment and sends a booking confirmation.

**After:**
> This use case allows the Patient to book an appointment by selecting doctor, date, and an available time slot, then paying the consultation fee. Payment can be made via Wallet, PayOS (UC-7.1) or SePay (UC-7.2). An eligible insurance discount is applied automatically (UC-7.3). On success, the system confirms the appointment and sends a booking confirmation.

---

### 3.12 UC-7 — Normal Flow step 6 (Table 19, Normal Flow — 3 columns)

**Before:**
> 6. Patient chooses payment method: Wallet / PayOS (UC-7.1) / Momo (UC-7.2).

**After:**
> 6. Patient chooses payment method: Wallet / PayOS (UC-7.1) / SePay (UC-7.2).

---

### 3.13 UC-7 — Preconditions (Table 19, Preconditions row)

**Before:**
> Payment gateways (PayOS/Momo) are reachable; doctor schedule is up to date.

**After:**
> Payment gateways (PayOS/SePay) are reachable; doctor schedule is up to date.

---

### 3.14 UC-7 — Business rule (Table 20)

**Before:**
> An appointment is confirmed only after the consultation fee is paid successfully via Wallet, PayOS, or Momo.

**After:**
> An appointment is confirmed only after the consultation fee is paid successfully via Wallet, PayOS, or SePay.

---

### 3.15 UC-8 / refund — Secondary Actors (Table 21)

**Before:**
> PayOS, Momo (refund)

**After:**
> PayOS, SePay (refund)

---

### 3.16 UC-12 use case spec — Secondary Actors (Table 29)

**Before:**
> Secondary Actors: PayOS, Momo

**After:**
> Secondary Actors: PayOS, SePay

---

### 3.17 UC-12 — Description (Table 29, Description row — 3 columns)

**Before:**
> This use case allows the Patient to view their medical wallet balance (UC-12), review the transaction history of top-ups, payments, and refunds (UC-12.1), and top up the wallet through PayOS or Momo.

**After:**
> This use case allows the Patient to view their medical wallet balance (UC-12), review the transaction history of top-ups, payments, and refunds (UC-12.1), and top up the wallet through PayOS or SePay.

---

### 3.18 UC-12 — Normal Flow steps 4–6 (Table 29, Normal Flow — 3 columns)

**Before:**
> 4. Patient clicks "Top Up", enters amount, and selects PayOS or Momo.  
> 5. System redirects to the gateway; patient completes the payment.  
> 6. Gateway callback verifies the payment; system credits the wallet and records the transaction.

**After:**
> 4. Patient clicks "Top Up", enters amount, and selects PayOS or SePay.  
> 5. System opens the in-app checkout page with a VietQR code (PayOS or SePay); patient completes payment in their banking app.  
> 6. PayOS webhook or SePay IPN/polling verifies the payment; system credits the wallet and records the transaction.

---

### 3.19 UC-12 — Business rule BR-18 (Table 30)

**Before:**
> Wallet balance can never go negative; top-ups are accepted only through PayOS or Momo gateways.

**After:**
> Wallet balance can never go negative; top-ups are accepted only through PayOS or SePay gateways.

---

### 3.20 Sequence / activity — UC-7 payment (Table ~87)

**Before:**
> Wallet / PayOS / Momo (UC-7.1, UC-7.2).

**After:**
> Wallet / PayOS / SePay (UC-7.1, UC-7.2).

---

### 3.21 Sequence / activity — record payment (Table ~88)

**Before:**
> Record the payment transaction (wallet/PayOS/Momo).

**After:**
> Record the payment transaction (wallet/PayOS/SePay).

---

### 3.22 UI Design — Wallet top-up form (Table ~97)

**Before:**
> Amount input (min 50,000 VND) and gateway choice PayOS/Momo.

**After:**
> Amount input (min 10,000 VND) and gateway choice PayOS/SePay.

> **Note:** Minimum top-up in the implemented system is **10,000 VND** (`WALLET_MIN_TOPUP`), not 50,000 VND. Update only if you want the document to match the current codebase.

---

## 4. Optional — align technical appendix with implementation

Add or adjust in **External Integrations / API** section if your document lists endpoints:

| Gateway | Purpose | Key endpoints (OrcaXCare) |
|---------|---------|----------------------------|
| **PayOS** | Wallet top-up via VietQR | `POST /api/patient/wallet/topups/payos` · Webhook: `POST /api/payments/payos/webhook` · Checkout UI: `/patient/wallet/checkout/payos/{orderCode}` |
| **SePay** | Wallet top-up via VietQR | `POST /api/patient/wallet/topups/sepay` · IPN: `POST /api/payments/sepay/ipn` · Checkout UI: `/patient/wallet/checkout/sepay/{orderId}` |

**Environment variables (reference):**

- PayOS: `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`
- SePay: `SEPAY_MERCHANT_ID`, `SEPAY_SECRET_KEY` (sandbox `SP-TEST-…` / production `SP-LIVE-…`)

**Removed from patient UI:** MoMo, VNPay (legacy backend routes may remain but are not offered to patients).

---

## 5. Checklist before export PDF

- [ ] No remaining `Momo` / `momo` in document (Ctrl+F)
- [ ] UC-7.2 title = **Pay via SePay**
- [ ] UC-12 top-up flow mentions **PayOS or SePay** only
- [ ] Payment entity enum uses `sepay`, not `momo`
- [ ] Secondary Actors for UC-7 and UC-12 = **PayOS, SePay**
- [ ] Regenerate PDF from Word after edits

---

*Generated for OrcaXCare WDP301 submission — payment providers: PayOS + SePay.*
