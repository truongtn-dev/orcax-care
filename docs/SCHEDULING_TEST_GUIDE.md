# OrcaXCare — Hướng dẫn test Scheduling

Tài liệu này hướng dẫn test end-to-end các chức năng **Work Shift → Generate Slots → Doctor Calendar → Block/Unlock**.

---

## Business rules (nghiệp vụ)

### Hai lớp dữ liệu — đừng nhầm

| Khái niệm | Có ngày cụ thể? | Ai quản lý |
|-----------|-----------------|------------|
| **Work Shift** | Không — chỉ **thứ trong tuần** (Mon, Tue…) | Admin Create/Edit/Delete |
| **Appointment Slot** | Có — **ngày + giờ** cụ thể | Admin Generate; Doctor Block/Unblock |

> **Work Shift không “quá ngày”.** Ca “Monday 08:00–12:00” là template lặp hàng tuần — admin **luôn sửa được** template.  
> Cái “quá ngày” là **Appointment Slot** (vd. slot 3/6/2026 09:00 đã qua).

### Quy tắc đã enforce trong code

| Rule | Hành vi |
|------|---------|
| Generate slots | **Không** tạo slot cho ngày quá khứ; From < hôm nay → tự cắt về hôm nay |
| Block / Unblock | **Không** đổi slot đã qua (ngày cũ hoặc giờ đã qua trong hôm nay) |
| Edit shift — đổi giờ/ngày/số BN | Nếu có slot **booked tương lai** → bắt tick **Regenerate future slots** |
| Edit shift — đổi phòng / active | Cho phép; slot cũ giữ phòng cũ đến khi regenerate |
| Delete shift | Xóa template; xóa slot available/blocked tương lai; **giữ slot booked** |
| Overlap doctor / room | Chặn khi Create/Edit ca active |

---

## 0. Chuẩn bị môi trường

### Chạy app

```bash
# Terminal 1 — backend
cd server
npm run dev

# Terminal 2 — frontend
cd client
npm run dev
```

- Frontend: http://localhost:5173  
- Backend API: http://localhost:5000  
- Đăng nhập: http://localhost:5173/login  

### Điều kiện DB

- `server/.env` có `MONGODB_URI` kết nối được.
- `AUTO_SEED=true` → server tự tạo tài khoản mẫu khi khởi động (xem mục 1).

### Gợi ý dữ liệu test

Dùng **một bác sĩ cố định** cho toàn bộ kịch bản:

| Field | Giá trị gợi ý |
|-------|----------------|
| Bác sĩ | **Dr. Nguyen Van An** |
| Email doctor | `doctor.an@orcaxcare.com` |
| Ngày làm việc | **Monday** (Thứ 2) |
| Giờ ca | **08:00 – 12:00** |
| Max patients | **8** |

> **Day of week:** `0` = Chủ nhật, `1` = Thứ 2, … `6` = Thứ 7.

---

## 1. Tài khoản đăng nhập (seed)

| Vai trò | Email | Mật khẩu | Dùng để test |
|---------|-------|----------|--------------|
| **Admin** | `admin@orcaxcare.com` | `Admin@123` | Tạo/sửa/xóa shift, generate slots |
| **Admin** (alt) | `truongtn.dev@gmail.com` | `Truong123@` | Cùng quyền admin |
| **Doctor** | `doctor.an@orcaxcare.com` | `Doctor@123` | Xem shift, calendar, block slot |
| **Doctor** (khác) | `doctor.binh@orcaxcare.com` | `Doctor@123` | Test filter theo doctor |
| **Patient** | `patient@orcaxcare.com` | `Patient@123` | *Chưa dùng* — booking online chưa có UI |

### Bác sĩ có sẵn trong seed

| Tên | Email |
|-----|-------|
| Dr. Nguyen Van An | doctor.an@orcaxcare.com |
| Dr. Tran Thi Binh | doctor.binh@orcaxcare.com |
| Dr. Le Minh Cuong | doctor.cuong@orcaxcare.com |
| Dr. Pham Hoai Duc | doctor.duc@orcaxcare.com |
| Dr. Vo Thi Em | doctor.em@orcaxcare.com |
| Dr. Hoang Quoc Giang | doctor.giang@orcaxcare.com |

---

## 2. Lộ trình test (thứ tự khuyến nghị)

```
Admin: Create Work Shift
    ↓
Admin: Work Shifts List (filter)
    ↓
Admin: Generate Appointment Slots
    ↓
Doctor: Work Shifts List (xem template)
    ↓
Doctor: Schedule Calendar (available)
    ↓
Doctor: Block / Unlock slot
    ↓
Admin: Update Work Shift
    ↓
Admin: Generate lại (optional)
    ↓
Admin: Delete Work Shift
```

---

## 3. Chi tiết từng chức năng

### TC-01 — Create Work Shift

**Actor:** Admin  
**URL:** Sidebar → **Work shifts** → nút **Create shift** (hoặc Dashboard → card **Work shifts** → **Create shift**)  
Hoặc trực tiếp: http://localhost:5173/admin/work-shifts/new  

> **Lưu ý UI:** *Scheduling* chỉ là **nhãn nhóm** trên sidebar (chữ nhỏ, không bấm được). Menu thật là **Work shifts** và **Generate slots**.

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Đăng nhập `admin@orcaxcare.com` / `Admin@123` | Vào dashboard admin |
| 2 | Mở **Create shift** | Form hiện đủ field |
| 3 | **Doctor:** search `Nguyen` → chọn **Dr. Nguyen Van An** | Chọn được bác sĩ (không cần scroll 100 người) |
| 4 | **Clinic room:** để trống hoặc chọn phòng (nếu có) | OK |
| 5 | **Day:** Monday | |
| 6 | **Start:** 08:00, **End:** 12:00 | Time picker custom |
| 7 | **Max patients:** 8 | |
| 8 | Bấm **Create work shift** | Thông báo xanh: created shift Monday (08:00–12:00) |
| 9 | Vào **Work shifts** list | Thấy ca Monday của Dr. Nguyen Van An |

#### TC-01b — Không cho overlap (cùng doctor, cùng ngày)

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Tạo thêm shift: cùng **Dr. Nguyen Van An**, **Monday**, **09:00–11:00** | **Lỗi 409** / message: *Shift overlaps with an existing shift…* |
| 2 | Tạo shift **Monday 13:00–17:00** (không chồng 08:00–12:00) | **Thành công** |

---

### TC-02 — Work Shifts List

**Actor:** Admin  
**URL:** http://localhost:5173/admin/work-shifts  

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Mở **Work shifts** | Lưới 7 cột (Sun–Sat), mỗi cột hiện ca trong ngày |
| 2 | **Search:** gõ `Nguyen` → **Search** | Chỉ còn shift của bác sĩ khớp tên |
| 3 | **Specialty:** Cardiology → Search | Lọc theo chuyên khoa |
| 4 | **Department:** Internal Medicine → Search | Lọc theo khoa |
| 5 | **Status:** Active | Chỉ ca đang active |
| 6 | **Clear** | Trở về full list |
| 7 | Bấm **Edit** trên một ca | Sang trang edit |

**Doctor view (read-only):**

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Đăng xuất → login `doctor.an@orcaxcare.com` / `Doctor@123` | Vào doctor portal |
| 2 | Sidebar → **Work shifts** (http://localhost:5173/doctor/work-shifts) | Chỉ thấy template của **chính mình**, không có nút Create/Edit |

---

### TC-03 — Generate Appointment Slots

**Actor:** Admin  
**URL:** Sidebar → **Generate slots**  
http://localhost:5173/admin/appointment-slots/generate  

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Đăng nhập admin | |
| 2 | **When:** preset **14 days** (hoặc chọn From/To) | Thanh meta hiện range + số ngày |
| 3 | **Who:** **One doctor** → search `Nguyen Van An` | |
| 4 | **Generate slots** | Kết quả: **Created** > 0, **Templates** ≥ 1 |
| 5 | Ghi lại số **Created** lần 1 | |
| 6 | Bấm **Generate slots** lần 2 (cùng range, cùng doctor) | **Skipped** tăng, **Created** = 0 (không duplicate) |

#### TC-03b — Skip ngày lễ (holiday)

> **Lưu ý:** App chưa có màn hình quản lý holiday. Thêm trực tiếp trong MongoDB.

Trong **MongoDB Atlas** (collection `holidays`), insert:

```json
{
  "date": ISODate("2026-06-15T00:00:00.000Z"),
  "name": "Test clinic holiday",
  "isActive": true
}
```

(Đổi ngày `2026-06-15` nằm **trong** range generate của bạn.)

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Generate slots có ngày 15/06/2026 trong range | **Holidays** ≥ 1, ngày đó không tạo slot |

---

### TC-04 — Doctor Schedule Calendar

**Actor:** Doctor (`doctor.an@orcaxcare.com`)  
**URL:** http://localhost:5173/doctor/schedule  

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Sau khi admin đã generate slots | |
| 2 | Mở **My calendar** | Có slot trên các **Monday** trong range |
| 3 | Toggle **Week** / **Day** | Lưới đổi view |
| 4 | **← / →** hoặc **Today** | Điều hướng tuần/ngày |
| 5 | Quan sát màu slot | |

**Màu slot (color-coded):**

| Trạng thái | Màu / kiểu |
|------------|------------|
| **available** | Nền trắng, viền xám |
| **booked** | Gradient teal (xanh) |
| **blocked** | Sọc xám (striped) |

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 6 | Click một slot **available** | Panel chi tiết: giờ, phòng, status Available |
| 7 | Summary đầu trang | Đếm available / booked / blocked |

#### TC-04b — Slot **booked** (tùy chọn — qua DB)

Patient booking UI chưa có. Để test màu **booked** và guard delete/block:

1. MongoDB → collection `appointmentslots`
2. Tìm một slot `available` của `doctor.an` trong tương lai
3. Sửa: `"status": "booked"`

Refresh calendar → slot chuyển màu teal **Booked**.

---

### TC-05 — Block / Unlock Timeslot

**Actor:** Doctor  
**URL:** http://localhost:5173/doctor/schedule  

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Click slot **available** | Chi tiết + nút **Block slot** |
| 2 | **Block slot** | Status → **Blocked**, màu sọc xám |
| 3 | Click lại slot đó | Nút **Unblock slot** |
| 4 | **Unblock slot** | Status → **Available** |

#### TC-05b — Không block slot đã booked

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Chọn slot đã set `status: booked` (TC-04b) | |
| 2 | Thử **Block slot** | Lỗi: *Cannot block a booked appointment slot* |

---

### TC-06 — Update Work Shift

**Actor:** Admin  
**URL:** Work shifts list → **Edit**  
http://localhost:5173/admin/work-shifts/:id/edit  

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Mở edit ca Monday 08:00–12:00 của Dr. Nguyen Van An | Hiện doctor name (read-only) |
| 2 | Đổi **End time** → **11:00** | |
| 3 | Đổi **Max patients** → **6** | |
| 4 | **Save** | Redirect về list, ca cập nhật |
| 5 | (Tùy chọn) **Generate slots** lại cùng range | Slot mới theo template mới; slot cũ trùng giờ vẫn **Skipped** |

> **Ghi chú sản phẩm:** Slot đã generate **trước** khi sửa shift **không tự xóa**. Admin cần generate lại hoặc xử lý thủ công nếu muốn đồng bộ 100%.

#### TC-06b — Overlap khi update

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Có 2 ca Monday không overlap (08:00–12:00 và 13:00–17:00) | |
| 2 | Sửa ca chiều thành **11:00–15:00** | Lỗi overlap |

---

### TC-07 — Delete Work Shift

**Actor:** Admin  

#### TC-07a — Xóa được (không có booking tương lai)

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Edit một ca **không** có slot booked tương lai | |
| 2 | **Delete shift** → confirm | Về list, ca biến mất |
| 3 | Doctor calendar | Slot **available/blocked** tương lai của ca đó cũng bị xóa |

#### TC-07b — Xóa khi có slot booked (vẫn được)

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Có slot `booked` gắn `workShiftId` của ca (TC-04b) | |
| 2 | **Delete shift** → confirm modal | **Thành công** — template biến mất |
| 3 | Doctor calendar | Slot **booked** vẫn còn (lịch bệnh nhân không mất) |
| 4 | Slot available/blocked tương lai của ca | **Bị xóa** cùng template |

---

## 4. Checklist nhanh (demo / báo cáo)

| # | Chức năng | Pass? | Ghi chú |
|---|-----------|-------|---------|
| 1 | Create shift — thành công | ☐ | |
| 2 | Create shift — chặn overlap | ☐ | |
| 3 | Admin list — search/filter doctor | ☐ | |
| 4 | Doctor list — chỉ thấy ca của mình | ☐ | |
| 5 | Generate slots — created > 0 | ☐ | |
| 6 | Generate lại — skipped, không duplicate | ☐ | |
| 7 | Generate — skip holiday (DB) | ☐ | Optional |
| 8 | Calendar — available slots hiện đúng ngày | ☐ | |
| 9 | Block slot | ☐ | |
| 10 | Unblock slot | ☐ | |
| 11 | Block slot booked — bị chặn | ☐ | Optional (DB) |
| 12 | Update shift — lưu được | ☐ | |
| 13 | Update shift — chặn overlap | ☐ | |
| 14 | Delete shift — thành công | ☐ | |
| 15 | Delete shift — booked vẫn giữ trên calendar | ☐ | Optional (DB) |

---

## 5. Sidebar — đường dẫn UI

**Scheduling** trên sidebar chỉ là nhãn nhóm (uppercase, màu mờ) — không phải menu item. Các mục bấm được nằm ngay bên dưới.

### Admin (`/admin`)

| Menu (sidebar) | Path | Ghi chú |
|----------------|------|---------|
| Work shifts | `/admin/work-shifts` | Nút **Create shift** ở góc trang list |
| Generate slots | `/admin/appointment-slots/generate` | |
| Create shift (form) | `/admin/work-shifts/new` | Không có trong sidebar |
| Doctor list (tìm ID) | `/admin/doctors` |

### Doctor (`/doctor`)

| Menu | Path |
|------|------|
| My calendar | `/doctor/schedule` |
| Work shifts | `/doctor/work-shifts` |

---

## 6. Xử lý sự cố thường gặp

| Triệu chứng | Cách xử lý |
|-------------|------------|
| Login fail | Kiểm tra server chạy, DB seed (`AUTO_SEED=true`), đúng email/password |
| Work shifts trống | Admin chưa tạo template — làm TC-01 |
| Calendar trống | Chưa generate slots — làm TC-03; hoặc xem sai tuần (bấm **Today**) |
| Generate **Created = 0**, Templates = 0 | Không có active shift khớp doctor/range |
| Generate **Created = 0**, Skipped > 0 | Đã generate trước đó — bình thường |
| API lỗi network | `npm run dev:server` port 5000; client proxy/`VITE_API_URL` |
| Không upload ảnh doctor | Cloudinary credentials trong `server/.env` (đã fix upload qua server) |

---

## 7. API tham khảo (Postman / debug)

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/admin/work-shifts` | Admin token |
| GET | `/api/admin/work-shifts?doctorId=&q=&specialtyId=` | Admin |
| PUT | `/api/admin/work-shifts/:id` | Admin |
| DELETE | `/api/admin/work-shifts/:id` | Admin |
| POST | `/api/admin/appointment-slots/generate` | Admin |
| GET | `/api/doctor/work-shifts` | Doctor token |
| GET | `/api/doctor/schedule?startDate=&endDate=&view=week` | Doctor |
| PUT | `/api/doctor/appointment-slots/:id/block` | Doctor |
| PUT | `/api/doctor/appointment-slots/:id/unblock` | Doctor |

Token lấy sau login, header: `Authorization: Token <accessToken>`.

---

*Tài liệu cập nhật theo codebase OrcaXCare — module Scheduling (Work Shift & Appointment Slots).*
