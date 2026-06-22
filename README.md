# OrcaXCare

**Hệ thống đặt lịch khám và quản lý phòng khám đa vai trò** — dự án môn **WDP301**, nhóm **SE1816 Group 4**.

OrcaXCare là ứng dụng web full-stack (MERN) cho phép bệnh nhân đặt lịch, thanh toán qua ví điện tử, quản lý thẻ BHYT; bác sĩ xem lịch và quản lý ca trực; nhân viên lễ tân quản lý kho thuốc; admin vận hành toàn bộ dữ liệu master và nhân sự phòng khám.

---

## Mục lục

1. [Tổng quan](#tổng-quan)
2. [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
3. [Công nghệ sử dụng](#công-nghệ-sử-dụng)
4. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
5. [Vai trò người dùng](#vai-trò-người-dùng)
6. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
7. [Hướng dẫn cài đặt](#hướng-dẫn-cài-đặt)
8. [Biến môi trường](#biến-môi-trường)
9. [Dữ liệu seed](#dữ-liệu-seed)
10. [Tài khoản demo](#tài-khoản-demo)
11. [Giao diện — danh sách route](#giao-diện--danh-sách-route)
12. [Dashboard & biểu đồ](#dashboard--biểu-đồ)
13. [REST API](#rest-api)
14. [Cơ sở dữ liệu (MongoDB)](#cơ-sở-dữ-liệu-mongodb)
15. [Xác thực & phân quyền](#xác-thực--phân-quyền)
16. [Tích hợp bên thứ ba](#tích-hợp-bên-thứ-ba)
17. [Kiểm thử](#kiểm-thử)
18. [Build & triển khai](#build--triển-khai)
19. [Tài liệu dự án](#tài-liệu-dự-án)
20. [Đẩy lên GitHub](#đẩy-lên-github)
21. [Phạm vi & hạn chế hiện tại](#phạm-vi--hạn-chế-hiện-tại)

---

## Tổng quan

| Hạng mục | Mô tả |
|----------|--------|
| **Loại dự án** | Web application — clinic appointment & operations |
| **Mô hình** | Monorepo: `client/` (SPA) + `server/` (REST API) |
| **Database** | MongoDB (Atlas / local / in-memory khi dev) |
| **Auth** | Opaque session token lưu DB, header `Authorization: Token <token>` |
| **URL thân thiện** | Slug SEO cho bác sĩ (`/doctor/:slug`) và bản ghi admin (doctor / patient / account) |

### Luồng nghiệp vụ chính

```
Guest → Đăng ký / xác minh email → Patient
Patient → Tìm bác sí → Đặt lịch → Thanh toán ví → Nhận thông báo
Admin → Tạo ca trực → Sinh slot lịch hẹn
Doctor → Xem lịch hôm nay → Chặn/mở slot
Staff → Nhập kho thuốc → Theo dõi tồn kho
Admin → Dashboard KPI → Quản lý tài khoản & master data
```

---

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React SPA — Vite dev :5173)                       │
│  • React Router 7  • Axios  • Context API (Auth)            │
│  • Portal layouts: Admin / Doctor / Staff / Patient         │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP /api/*  (proxy Vite → :5000)
┌──────────────────────────▼──────────────────────────────────┐
│  Express API (:5000)                                        │
│  • Routes: auth, admin, doctor, patient, staff, public, …  │
│  • Middleware: auth, role guard, rate limit, require DB     │
│  • Services: business logic tách khỏi controller            │
└──────────────────────────┬──────────────────────────────────┘
                           │ Mongoose ODM
┌──────────────────────────▼──────────────────────────────────┐
│  MongoDB                                                    │
│  • Users, Doctors, Patients, Appointments, Slots, Wallet, … │
└─────────────────────────────────────────────────────────────┘

Tích hợp ngoài (tùy chọn): SMTP · Cloudinary · PayOS · SePay · Web Push · Tesseract OCR
```

**Client dev proxy:** `client/vite.config.js` chuyển tiếp `/api` và `/health` → `http://localhost:5000`.

---

## Công nghệ sử dụng

### Frontend (`client/`)

| Package | Phiên bản (approx.) | Mục đích |
|---------|---------------------|----------|
| React | 19.x | UI components |
| Vite | 8.x | Dev server & build |
| React Router | 7.x | Client-side routing |
| Axios | 1.x | HTTP client |

### Backend (`server/`)

| Package | Mục đích |
|---------|----------|
| Express 4 | REST API framework |
| Mongoose 8 | MongoDB ODM |
| bcryptjs | Hash mật khẩu |
| nodemailer | Email verify / reset password |
| cloudinary | Upload ảnh (avatar, y tế) |
| tesseract.js | OCR thẻ BHYT (eng + vie) |
| @payos/node | Nạp ví PayOS (VietQR) |
| web-push | Browser push notifications |
| exceljs | Import/export bác sĩ Excel |
| express-rate-limit | Giới hạn resend verification |
| mongodb-memory-server | DB in-memory cho dev/test |

---

## Cấu trúc thư mục

```
orcax-care/
├── client/                         # Frontend React + Vite
│   ├── src/
│   │   ├── App.jsx                 # Route definitions
│   │   ├── App.css                 # Global styles
│   │   ├── components/             # Layout, form, dashboard, wallet, …
│   │   │   ├── dashboard/          # DashboardKpiGrid, DashboardBarChart (dùng chung)
│   │   │   ├── admin/              # Form & detail parts cho admin
│   │   │   ├── wallet/             # Wallet UI components
│   │   │   ├── PortalShell.jsx     # Sidebar layout (admin/doctor/staff)
│   │   │   ├── AdminLayout.jsx
│   │   │   ├── DoctorLayout.jsx
│   │   │   ├── StaffLayout.jsx
│   │   │   └── AppHeader.jsx       # Header patient + bell notifications
│   │   ├── context/                # AuthContext
│   │   ├── pages/                  # Page components theo route
│   │   │   ├── admin/              # List/detail pages admin
│   │   │   ├── *DashboardPage*     # Dashboard từng vai trò
│   │   │   └── Patient*.jsx        # Patient portal pages
│   │   ├── services/               # API clients (adminApi, patientApi, …)
│   │   ├── styles/                 # Shared CSS (dashboard, admin record, wallet)
│   │   └── utils/                  # adminUrls, doctorUrls, roleLabels
│   ├── vite.config.js
│   └── .env.example
│
├── server/                         # Backend Express
│   ├── src/
│   │   ├── index.js                # Entry: connect DB, seed, listen
│   │   ├── app.js                  # Express app factory
│   │   ├── config/                 # database.js
│   │   ├── controllers/            # HTTP handlers
│   │   ├── middlewares/            # auth, requireDatabase, …
│   │   ├── models/                 # Mongoose schemas (22 models)
│   │   ├── routes/                 # Route modules
│   │   ├── services/               # Business logic (41 services)
│   │   │   └── search/             # BM25, n-gram doctor search engine
│   │   ├── scripts/                # seed.js, seedData.js, vapid keys
│   │   ├── tests/                  # Node.js native test runner (26 files)
│   │   └── utils/                  # slug, validation, …
│   └── .env.example
│
├── docs/                           # Tài liệu WDP301 (SRS/SDS/diagram)
│   ├── sds/                        # 66 PlantUML sequence/class diagrams
│   ├── screenflow/                 # Screen flow theo vai trò
│   ├── usecase/                    # Use case diagrams
│   ├── database/                   # ERD PlantUML
│   ├── SCHEDULING_TEST_GUIDE.md
│   └── PAYMENT_TEST_GUIDE.md
│
├── scripts/                        # Python scripts tạo/khôi phục tài liệu Word
├── package.json                    # Scripts gốc: install:all, dev:*, seed
└── README.md
```

---

## Vai trò người dùng

| Role | Mô tả | Portal |
|------|--------|--------|
| **Guest** | Chưa đăng nhập — tìm bác sĩ, đăng ký, quên mật khẩu | `/`, `/search-doctors`, `/doctor/:slug` |
| **Patient** | Bệnh nhân — đặt lịch, ví, BHYT, thông báo | `/patient/*` |
| **Doctor** | Bác sĩ — lịch hôm nay, calendar, ca trực | `/doctor/*` |
| **Staff** | Lễ tân / hỗ trợ — kho thuốc, tra cứu bác sĩ | `/staff/*` |
| **Admin** | Quản trị — toàn bộ IAM & master data | `/admin/*` |

Admin cũng truy cập được `/staff/pharmacy` (role guard cho phép `staff` và `admin`).

---

## Yêu cầu hệ thống

- **Node.js** 20+ (khuyến nghị LTS)
- **npm** 10+
- **MongoDB** — một trong ba cách (xem [Biến môi trường](#biến-môi-trường))
- **Git** (clone / push GitHub)
- Tùy chọn: Gmail App Password (SMTP), tài khoản Cloudinary, PayOS, SePay

---

## Hướng dẫn cài đặt

### Bước 1 — Clone repository

```bash
git clone https://github.com/<user>/orcax-care.git
cd orcax-care
```

### Bước 2 — Cài dependency

Từ thư mục gốc:

```bash
npm run install:all
```

Tương đương:

```bash
npm install --prefix server
npm install --prefix client
```

### Bước 3 — Cấu hình môi trường

**Server:**

```bash
cd server
cp .env.example .env          # Windows: copy .env.example .env
```

Chỉnh ít nhất **một** cách kết nối MongoDB (xem bảng dưới).

**Client** (tùy chọn):

```bash
cd client
cp .env.example .env
```

Dev thường **không cần** `VITE_API_URL` vì Vite đã proxy `/api`.

### Bước 4 — Seed dữ liệu demo

```bash
npm run seed
# hoặc: cd server && npm run seed
```

Seed **idempotent** — không ghi đè user đã tồn tại, chỉ tạo mới khi thiếu.

Khi dùng `MONGODB_URI=memory`, server tự chạy seed lúc khởi động nếu `AUTO_SEED=true`.

### Bước 5 — Chạy development

**Terminal 1 — API (port 5000):**

```bash
npm run dev:server
```

**Terminal 2 — Web (port 5173):**

```bash
npm run dev:client
```

Mở trình duyệt: **http://localhost:5173**

| Endpoint | URL |
|----------|-----|
| Web app | http://localhost:5173 |
| API root | http://localhost:5000/api |
| Health check | http://localhost:5000/health |

---

## Biến môi trường

File mẫu đầy đủ: [`server/.env.example`](server/.env.example), [`client/.env.example`](client/.env.example).

### Server — bắt buộc / quan trọng

| Biến | Mô tả |
|------|--------|
| `PORT` | Cổng API (mặc định `5000`) |
| `CLIENT_ORIGIN` | Origin CORS cho frontend (`http://localhost:5173`) |
| `MONGODB_URI` | URI MongoDB **hoặc** `memory` cho dev nhanh |
| `MONGODB_USER`, `MONGODB_PASSWORD`, `MONGODB_HOST`, `MONGODB_DB` | Ghép thành URI Atlas nếu không dùng `MONGODB_URI` trực tiếp |
| `AUTO_SEED` | `true` → tự seed khi dùng memory DB |

### Server — kết nối database (chọn 1)

| Cách | Cấu hình | Khi nào dùng |
|------|----------|--------------|
| **A. In-memory** | `MONGODB_URI=memory` + `AUTO_SEED=true` | Dev nhanh, không cần Atlas/local |
| **B. Local** | `MONGODB_URI=mongodb://127.0.0.1:27017/orcaxcare` | Đã cài MongoDB Community |
| **C. Atlas** | `MONGODB_URI=mongodb+srv://...` | Team dùng chung cluster; whitelist IP |

### Server — tích hợp tùy chọn

| Nhóm biến | Mục đích |
|-----------|----------|
| `SMTP_*`, `MAIL_FROM` | Gửi email xác minh / reset password |
| `CLOUDINARY_*` | Upload ảnh server-side |
| `INSURANCE_OCR_STUB`, `INSURANCE_OCR_LANG` | OCR thẻ BHYT (Tesseract) |
| `VAPID_*` | Web Push — tạo key: `npm run vapid:keys --prefix server` |
| `PAYOS_*`, `API_PUBLIC_ORIGIN` | Nạp ví PayOS + webhook |
| `SEPAY_*` | Nạp ví SePay + IPN callback |
| `WALLET_MIN_TOPUP`, `WALLET_MAX_TOPUP` | Giới hạn số tiền nạp |

### Client

| Biến | Mô tả |
|------|--------|
| `VITE_API_URL` | Base URL API (production). Dev: để trống, dùng proxy Vite |

> **Không commit** file `.env` lên Git. Mỗi thành viên tự copy từ `.env.example`.

---

## Dữ liệu seed

Chạy `npm run seed` tạo/cập nhật:

### Tài khoản hệ thống

| Email | Role | Mật khẩu |
|-------|------|----------|
| admin@orcaxcare.com | admin | Admin@123 |
| staff@orcaxcare.com | staff | Staff@123 |
| patient@orcaxcare.com | patient | Patient@123 |

### Bác sĩ (6 người — mật khẩu chung `Doctor@123`)

| Email | Chuyên khoa | Khoa | Phí khám (VND) |
|-------|-------------|------|----------------|
| doctor.an@orcaxcare.com | Cardiology (CARD) | Internal Medicine | 250.000 |
| doctor.binh@orcaxcare.com | Dermatology (DERM) | Internal Medicine | 180.000 |
| doctor.cuong@orcaxcare.com | Pediatrics (PED) | Pediatrics Ward | 220.000 |
| doctor.duc@orcaxcare.com | Neurology (NEUR) | Surgery | 300.000 |
| doctor.em@orcaxcare.com | Orthopedics (ORTH) | Surgery | 280.000 |
| doctor.giang@orcaxcare.com | Cardiology (CARD) | Internal Medicine | 260.000 |

Sau seed, hệ thống tự sinh **slug URL** cho bác sĩ (vd. `/doctor/dr-nguyen-van-an`).

### Master data

- **5 chuyên khoa:** CARD, DERM, PED, NEUR, ORTH
- **3 khoa/phòng ban:** Internal Medicine, Surgery, Pediatrics Ward
- **3 thuốc mẫu:**

| Code | Tên | Tồn kho | Min level |
|------|-----|---------|-----------|
| PARA500 | Paracetamol 500mg | 120 tablet | 30 |
| AMOX500 | Amoxicillin 500mg | 45 capsule | 40 |
| VITC1000 | Vitamin C 1000mg | 80 tablet | 25 |

---

## Tài khoản demo

| Vai trò | Email | Mật khẩu | Vào nhanh |
|---------|-------|----------|-----------|
| Admin | admin@orcaxcare.com | Admin@123 | `/admin` |
| Staff | staff@orcaxcare.com | Staff@123 | `/staff` |
| Patient | patient@orcaxcare.com | Patient@123 | `/patient` |
| Doctor | doctor.an@orcaxcare.com | Doctor@123 | `/doctor` |

**Patient mới:** `/register` → link xác minh in ra **console server** nếu chưa cấu hình SMTP.

> Chỉ dùng cho dev/demo. Đổi mật khẩu trước khi deploy production.

---

## Giao diện — danh sách route

### Công khai (Guest)

| Route | Trang | Mô tả |
|-------|-------|--------|
| `/` | HomePage | Trang chủ |
| `/login` | LoginPage | Đăng nhập |
| `/register` | RegisterPage | Đăng ký patient |
| `/forgot-password` | ForgotPasswordPage | Quên mật khẩu |
| `/reset-password` | ResetPasswordPage | Đặt lại mật khẩu (token) |
| `/verify-email` | VerifyEmailPage | Xác minh email |
| `/search-doctors` | SearchDoctorsPage | Tìm bác sĩ (BM25 + filter) |
| `/doctor/:slug` | DoctorPublicProfilePage | Hồ sơ công khai bác sĩ |

### Chung (đã đăng nhập — mọi role)

| Route | Mô tả |
|-------|--------|
| `/profile` | Sửa hồ sơ, avatar (Cloudinary) |
| `/change-password` | Đổi mật khẩu |

### Patient (`role: patient`)

| Route | Mô tả |
|-------|--------|
| `/patient` | Dashboard — ví, lịch hẹn sắp tới, chart trạng thái |
| `/patient/book` | Đặt lịch khám (chọn bác sĩ, slot, preview phí) |
| `/patient/appointments` | Danh sách lịch — hủy, đổi lịch, đánh giá, mã QR |
| `/patient/wallet` | Ví — số dư, lịch sử giao dịch (scroll) |
| `/patient/wallet/checkout/:provider/:ref` | Trang checkout PayOS/SePay |
| `/patient/wallet/payos/mock` | Mock confirm PayOS (dev) |
| `/patient/wallet/sepay/mock` | Mock confirm SePay (dev) |
| `/patient/insurance-cards` | CRUD thẻ BHYT + OCR |
| `/patient/favorites` | Bác sĩ yêu thích |
| `/patient/notifications` | Hộp thông báo |

Header patient có **icon chuông** → `/patient/notifications`.

### Doctor (`role: doctor`)

| Route | Mô tả |
|-------|--------|
| `/doctor` | Dashboard — KPI, chart slot/ca trực, lịch hôm nay |
| `/doctor/today-appointments` | Lịch hẹn hôm nay — filter status/sort + refresh (1 toolbar) |
| `/doctor/schedule` | Lịch tuần / calendar |
| `/doctor/work-shifts` | Ca trực được gán |

### Staff (`role: staff`)

| Route | Mô tả |
|-------|--------|
| `/staff` | Dashboard — KPI kho thuốc, chart tồn/inbound, low-stock watchlist |
| `/staff/pharmacy` | Nhập kho, bảng tồn, lịch sử movement |
| `/search-doctors` | Tra cứu bác sĩ hỗ trợ bệnh nhân tại quầy |

### Admin (`role: admin`)

| Route | Mô tả |
|-------|--------|
| `/admin` | Dashboard — KPI clinic, chart doanh thu, shortcuts |
| `/admin/account` | Danh sách / tạo tài khoản |
| `/admin/account/:slug\|id` | Chi tiết tài khoản (slug URL) |
| `/admin/staff` | Quản lý staff |
| `/admin/doctors` | Danh sách bác sĩ — import/export Excel |
| `/admin/doctors/:slug\|id` | Chi tiết bác sĩ |
| `/admin/patients` | Danh sách bệnh nhân |
| `/admin/patients/new` | Tạo bệnh nhân |
| `/admin/patients/:slug\|id` | Chi tiết bệnh nhân |
| `/admin/specialties` | Danh sách chuyên khoa |
| `/admin/specialty` | Quản lý chuyên khoa (legacy route) |
| `/admin/specialty/:id` | Chi tiết chuyên khoa |
| `/admin/clinic-room` | Phòng khám |
| `/admin/departments/new` | Tạo khoa |
| `/admin/departments/:id` | Chi tiết khoa |
| `/admin/work-shifts` | Danh sách ca trực |
| `/admin/work-shifts/new` | Tạo ca trực |
| `/admin/work-shifts/:id/edit` | Sửa ca trực |
| `/admin/appointment-slots/generate` | Sinh slot lịch hẹn hàng loạt |

**Slug URL admin:** API và UI hỗ trợ tra cứu bằng MongoDB ObjectId hoặc slug (`client/src/utils/adminUrls.js`). URL detail dùng slug khi có (vd. `/admin/doctors/dr-nguyen-van-an`).

---

## Dashboard & biểu đồ

Hệ thống dashboard **đồng bộ** qua shared components:

- `client/src/components/dashboard/DashboardKpiGrid.jsx`
- `client/src/components/dashboard/DashboardKpiCard.jsx`
- `client/src/components/dashboard/DashboardBarChart.jsx`
- `client/src/styles/dashboard.shared.css`

| Portal | KPI | Biểu đồ (bar chart) |
|--------|-----|---------------------|
| **Admin** `/admin` | Appointments today, Revenue, Appointments (period), New patients, Active doctors | Revenue by day (filter From/To/Doctor) |
| **Doctor** `/doctor` | Booked today, Open slots, In queue, Active shifts | Today's slot mix (booked/open/blocked) · Weekly shift pattern |
| **Staff** `/staff` | Medicines, Low stock, Inbound today, Doctor lookup | Stock on hand · Inbound trend (7 ngày) |
| **Patient** `/patient` | Wallet balance, Upcoming visits, Notifications, Find doctors (quick cards) | Appointments by status · Recent visit dates |
| **Staff Pharmacy** `/staff/pharmacy` | Cùng KPI kho thuốc | Stock on hand · Inbound 7 ngày |

---

## REST API

Base URL: `http://localhost:5000/api`

Auth header (sau login):

```http
Authorization: Token <plain-token-from-login-response>
```

### Auth — `/api/auth`

| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| POST | `/login` | — | Đăng nhập |
| POST | `/register` | — | Đăng ký patient |
| POST | `/logout` | ✓ | Đăng xuất (revoke token) |
| GET | `/me` | ✓ | Thông tin user hiện tại |
| PUT | `/change-password` | ✓ | Đổi mật khẩu |
| POST | `/forgot-password` | — | Gửi link reset |
| POST | `/reset-password` | — | Reset bằng token |
| GET | `/verify-email` | — | Xác minh email |
| POST | `/resend-verification` | — | Gửi lại (rate limit 5/phút) |

### Profile — `/api/profile`

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/` | Lấy profile |
| PUT | `/` | Cập nhật profile |

### Public — `/api/public`

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/specialties` | Danh sách chuyên khoa |
| GET | `/departments` | Danh sách khoa |
| GET | `/doctors` | Tìm bác sĩ (q, specialty, department, …) |
| GET | `/doctors/featured` | Bác sĩ nổi bật |
| GET | `/doctors/:id` | Chi tiết (id hoặc slug) |
| GET | `/doctors/:id/availability` | Lịch trống để đặt |

### Patient — `/api/patient` (role: patient)

| Nhóm | Endpoints chính |
|------|-----------------|
| **Wallet** | `GET /wallet`, `POST /wallet/topups/payos`, `POST /wallet/topups/sepay`, checkout/status/cancel/receipt |
| **Appointments** | `GET/POST /appointments`, reschedule, cancel, rate, fee-preview |
| **Insurance** | CRUD `/insurance-cards`, `POST /insurance-cards/ocr` |
| **Favorites** | `GET /favorites`, add/remove `/:doctorId` |
| **Notifications** | `GET /notifications`, mark read |
| **Push** | CRUD `/push-subscription` |

### Doctor — `/api/doctor` (role: doctor)

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/work-shifts` | Ca trực của tôi |
| GET | `/schedule` | Calendar (startDate, endDate, view) |
| GET | `/appointments/today` | Lịch hôm nay |
| GET | `/appointments/:id` | Chi tiết lịch hẹn |
| PUT | `/appointment-slots/:id/block` | Chặn slot |
| PUT | `/appointment-slots/:id/unblock` | Mở slot |

### Staff — `/api/staff` (role: staff, admin)

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/dashboard` | KPI + chart data kho thuốc |
| GET | `/pharmacy/dashboard` | Cùng analytics (dùng trên trang pharmacy) |
| GET | `/pharmacy/medicines` | Danh sách thuốc |
| GET | `/pharmacy/stock-movements` | Lịch sử nhập/xuất |
| POST | `/pharmacy/stock-inbound` | Ghi nhận nhập kho |

### Admin — `/api/admin` (role: admin)

| Nhóm | Endpoints chính |
|------|-----------------|
| **Dashboard** | `GET /dashboard` (KPI + revenue chart) |
| **Accounts** | CRUD `/accounts`, đổi role, deactivate/reactivate `/users/:id/*` |
| **Doctors** | CRUD, export/import Excel |
| **Patients** | CRUD |
| **Specialties** | CRUD |
| **Departments** | CRUD, deactivate |
| **Clinic rooms** | CRUD |
| **Work shifts** | CRUD, preview, delete-impact |
| **Appointment slots** | preview + generate |

### Upload — `/api/upload` (auth required)

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/cloudinary-config` | Config phía client |
| POST | `/image` | Upload ảnh signed server-side |

### Payments — `/api/payments` (webhook/callback — không cần user token)

| Path | Mô tả |
|------|--------|
| `/payos/webhook`, `/payos/return`, `/payos/cancel` | PayOS |
| `/sepay/ipn`, `/sepay/return`, `/sepay/cancel`, `/sepay/error` | SePay |

### Health

| Method | Path |
|--------|------|
| GET | `/health` |

---

## Cơ sở dữ liệu (MongoDB)

### Collections (models)

| Model | Mô tả |
|-------|--------|
| `User` | Tài khoản — email, role, slug, trạng thái |
| `AuthToken` | Session token đăng nhập |
| `EmailVerificationToken` | Token xác minh email |
| `PasswordResetToken` | Token reset mật khẩu |
| `Patient` | Hồ sơ bệnh nhân (gắn User) |
| `Doctor` | Hồ sơ bác sĩ — specialty, department, license, bio, slug, **consultationFee** (VND) |
| `Specialty` | Chuyên khoa |
| `Department` | Khoa / phòng ban |
| `ClinicRoom` | Phòng khám |
| `WorkShift` | Ca trực bác sĩ |
| `AppointmentSlot` | Slot lịch hẹn (available/booked/blocked) |
| `Appointment` | Lịch hẹn đã đặt |
| `Wallet` | Ví bệnh nhân |
| `WalletTransaction` | Giao dịch ví |
| `InsuranceCard` | Thẻ BHYT |
| `FavoriteDoctor` | Bác sĩ yêu thích |
| `Notification` | Thông báo in-app |
| `PushSubscription` | Web push subscription |
| `Medicine` | Thuốc / vật tư kho |
| `StockMovement` | Biến động kho (inbound, …) |
| `Holiday` | Ngày nghỉ (scheduling) |

ERD & schema diagram: `docs/database/DB_Schema.puml`, `docs/orcaxcare-erd.dbml`.

---

## Xác thực & phân quyền

1. **Đăng ký patient** → email chưa verify → không login được (trừ dev bypass qua seed).
2. **Login** → server tạo opaque token trong `AuthToken` → client lưu localStorage → gửi header `Authorization: Token …`.
3. **ProtectedRoute** (React) + **authMiddleware** + **requireRole** (Express) kiểm tra role.
4. **Deactivate account** → revoke sessions; admin không thể deactivate chính mình.
5. **Slug** — User/Doctor có `slug` tự sinh từ `fullName`; API admin lookup bằng id hoặc slug.

---

## Phí khám (consultation fee)

Mỗi bác sĩ có **`consultationFee`** riêng trên model `Doctor` (mặc định 200.000 VND nếu chưa cấu hình).

| Luồng | Cách lấy phí |
|-------|----------------|
| Tìm bác sĩ / hồ sơ công khai | API trả `consultationFee` qua `resolveConsultationFee(doctor)` |
| Lịch trống (availability) | `GET /api/public/doctors/:id/availability` → `consultationFee` |
| Xem trước phí đặt lịch | `GET /api/patient/appointments/fee-preview?slotId=…` → `baseFee` từ bác sĩ của slot |
| Đặt lịch | Trừ ví theo phí bác sĩ tại thời điểm đặt; lưu `Appointment.fee` (snapshot) |
| Đổi lịch (cùng bác sĩ) | Giữ nguyên `fee` gốc |
| Admin | Sửa trên **Doctors** (modal/list), **Doctor edit**, **Accounts** (tạo doctor), Excel import/export cột `consultationFee` |

Logic server: `server/src/utils/consultationFee.js` · hằng số fallback: `server/src/config/booking.js`.

---

## Tích hợp bên thứ ba

| Dịch vụ | Chức năng | Cấu hình | Ghi chú |
|---------|-----------|----------|---------|
| **Gmail SMTP** | Verify email, reset password | `SMTP_*` | Dev: link in console nếu chưa cấu hình |
| **Cloudinary** | Avatar, ảnh y tế | `CLOUDINARY_*` | `POST /api/upload/image` |
| **Tesseract.js** | OCR thẻ BHYT | `INSURANCE_OCR_*` | Ngôn ngữ mặc định `eng+vie` |
| **PayOS** | Nạp ví VietQR | `PAYOS_*` | Webhook cần URL public (ngrok khi dev) |
| **SePay** | Nạp ví sandbox/live | `SEPAY_*` | IPN callback |
| **Web Push** | Thông báo trình duyệt | `VAPID_*` | `npm run vapid:keys --prefix server` |

Hướng dẫn test thanh toán: [`docs/PAYMENT_TEST_GUIDE.md`](docs/PAYMENT_TEST_GUIDE.md)  
Hướng dẫn test scheduling: [`docs/SCHEDULING_TEST_GUIDE.md`](docs/SCHEDULING_TEST_GUIDE.md)

---

## Kiểm thử

```bash
cd server && npm test
```

**26 test suites**, **116 tests** (Node.js built-in test runner + mongodb-memory-server).

| File test | Phạm vi |
|-----------|---------|
| `thangdq-iteration1.test.js` | Auth, register, profile |
| `patientAppointmentBook.test.js` | Đặt lịch |
| `patientAppointmentReschedule.test.js` | Đổi lịch |
| `patientAppointmentRate.test.js` | Đánh giá |
| `payosWallet.test.js`, `sepayWallet.test.js` | Ví |
| `insuranceCardOcr.test.js`, `insuranceCardList.test.js` | BHYT |
| `favoriteDoctor.test.js` | Yêu thích |
| `notificationInbox.test.js`, `pushSubscription.test.js` | Thông báo |
| `doctorSchedule.test.js`, `doctorTodayAppointments.test.js` | Doctor |
| `doctorBlockTimeslot.test.js` | Chặn slot |
| `workShift*.test.js` | Ca trực |
| `appointmentSlotGenerate.test.js` | Sinh slot |
| `adminDashboard.test.js`, `adminDoctorExcel.test.js` | Admin |
| `staffPharmacy.test.js` | Kho thuốc |
| `doctorSlug.test.js`, `searchSimilarity.test.js` | Slug & search |

---

## Build & triển khai

### Build frontend

```bash
cd client && npm run build
```

Output: `client/dist/` — serve bằng nginx, Vercel, Netlify, hoặc Express static.

### Chạy production API

```bash
cd server && npm start
```

### Checklist deploy

- [ ] `MONGODB_URI` production (Atlas)
- [ ] `CLIENT_ORIGIN` = domain frontend thật
- [ ] `API_PUBLIC_ORIGIN` HTTPS cho PayOS/SePay webhook
- [ ] SMTP, Cloudinary, payment keys trên server env
- [ ] **Không** dùng tài khoản/mật khẩu seed demo
- [ ] Build client + reverse proxy `/api` → backend

---

## Tài liệu dự án

| Thư mục / file | Nội dung |
|----------------|----------|
| [`docs/README.md`](docs/README.md) | Hướng dẫn khôi phục diagram |
| `docs/sds/` | 66 sequence/class diagrams (SDS Section V) |
| `docs/screenflow/` | Screen flow Guest/Patient/Doctor/Staff/Admin |
| `docs/usecase/` | Use case diagrams |
| `docs/database/` | ERD PlantUML |
| `docs/ui-design/` | UI mockup PNG (báo cáo) |
| `docs/PAYMENT_TEST_GUIDE.md` | Test PayOS/SePay |
| `docs/SCHEDULING_TEST_GUIDE.md` | Test ca trực & slot |

Khôi phục diagram nếu mất:

```powershell
python scripts/recover_from_transcript.py
python scripts/render_sds_diagrams.py
python scripts/extract_ui_from_word.py
```

---

## Đẩy lên GitHub

```bash
git add .
git commit -m "docs: update README to current project state"
git remote add origin https://github.com/<user>/orcax-care.git
git branch -M main
git push -u origin main
```

### Quy tắc bảo mật khi push

- **Không commit** `server/.env`, `client/.env` (đã có trong `.gitignore`)
- **Không commit** API key SMTP, PayOS, SePay, Cloudinary
- **Không commit** `docs/WDP301-SE1816-GROUP4_Document_Final.pdf` (file lớn — local only)
- Mỗi dev tự tạo `.env` từ `.env.example`

Khóa học có thể dùng GitLab — thêm remote tương tự hoặc mirror.

---

## Phạm vi & hạn chế hiện tại

### Đã triển khai (code)

- Auth đầy đủ (login, register, verify, forgot/reset, change password)
- Patient: booking, wallet, insurance OCR, favorites, notifications, push
- Doctor: schedule, today appointments, block slot, work shifts
- Admin: IAM, master data, work shifts, slot generation, Excel doctors
- Staff: pharmacy dashboard + stock inbound
- Dashboard KPI + bar chart đồng bộ 4 portal
- Slug URL admin & public doctor profile

### Chưa triển khai / ngoài phạm vi code hiện tại

Các use case có trong tài liệu SDS/screenflow nhưng **chưa có UI/API hoàn chỉnh** trong repo:

- Queue check-in / queue ticket tại quầy (Staff reception)
- EMR / consultation notes / prescription management
- Medical imaging
- Complaints management
- Patient EMR timeline đầy đủ

Tham khảo diagram tương ứng trong `docs/sds/` để biết thiết kế dự kiến.

---

## Scripts npm (thư mục gốc)

| Script | Mô tả |
|--------|--------|
| `npm run install:all` | Cài dependency server + client |
| `npm run dev:server` | API watch mode (:5000) |
| `npm run dev:client` | Vite dev (:5173) |
| `npm run seed` | Chạy seed MongoDB |

## Scripts npm (`server/`)

| Script | Mô tả |
|--------|--------|
| `npm run dev` | `node --watch src/index.js` |
| `npm start` | Production |
| `npm run seed` | Seed data |
| `npm test` | Chạy toàn bộ test |
| `npm run vapid:keys` | Sinh VAPID key pair |

## Scripts npm (`client/`)

| Script | Mô tả |
|--------|--------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview build local |
| `npm run lint` | ESLint |

---

## License

Dự án học thuật **WDP301 — SE1816 Group 4**.  
OrcaXCare © 2025–2026 — FPT University.
