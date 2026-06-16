# OrcaXCare ERD — dbdiagram.io

File DBML: [`orcaxcare-erd.dbml`](./orcaxcare-erd.dbml)

## So với ERD cũ (ảnh car rental / MoMo)

| ERD cũ (sai) | ERD mới (OrcaXCare) |
|--------------|---------------------|
| `users`, `cars`, `rental_contracts`… | `users`, `patients`, `doctors`, `appointments`… |
| `momo_wallets` | **Không có** — PayOS/SePay là API ngoài |
| `payment_methods` (Cash, MoMo…) | `payments.method`: **payos \| sepay \| wallet** |
| Quan hệ thuê xe | Quan hệ phòng khám, lịch khám, EMR, ví bệnh nhân |

## Cách dùng [dbdiagram.io](https://dbdiagram.io/home)

1. Mở https://dbdiagram.io/d  
2. **Import** → paste toàn bộ nội dung `orcaxcare-erd.dbml`  
3. Chỉnh layout (kéo nhóm **payment_wallet**, **external_gateways** sang góc phải)  
4. **Export** → PNG hoặc SVG (độ phân giải cao cho Word)  
5. Word → thay **Figure 10 — ERD** (và Figure ở mục 3.1 nếu trùng)

## Nhóm bảng chính

| Nhóm | Collections |
|------|-------------|
| Auth & users | users, auth_tokens, verification_tokens, patients, doctors |
| Master data | specialties, departments, clinic_rooms, branches, icd10_catalog, medicines |
| Scheduling | work_shifts, appointment_slots, appointments |
| **Payment** | wallets, wallet_transactions, payments, insurance_cards |
| **External** | payos_api, sepay_api (ghi chú — không lưu DB) |
| EMR | encounters, diagnoses, medical_images, prescriptions, … |
| Queue | queue_sessions, queue_tickets |
| Engagement | favorites, reviews, notifications, complaints, … |

## Payment (PayOS + SePay)

```
patients 1──1 wallets 1──* wallet_transactions
                              │
                              ├── provider: payos  ──► PayOS API (webhook)
                              └── provider: sepay  ──► SePay API (IPN)

appointments 1──1 payments
                 method: payos | sepay | wallet
```

## Checklist trước khi chèn Word

- [ ] Không còn bảng `momo_wallets` / `MoMo`
- [ ] `payments.method` = payos, sepay, wallet
- [ ] Có box/note **PayOS API** và **SePay API** (external)
- [ ] Export PNG rõ chữ (zoom 100–125% trên dbdiagram)
