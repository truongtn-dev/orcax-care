#!/usr/bin/env python3
"""Generate Word demo guide for Queue Management."""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "docs" / "demo" / "queue-screenshots"
OUT = ROOT / "docs" / "demo" / "OrcaXCare_Queue_Management_Demo.docx"

STEPS = [
    ("01-doctor-open-session-form.png", "Bước 1 — Doctor mở form Open session", "Đăng nhập bác sĩ → /doctor/queue → chọn phòng khám → Open session."),
    ("02-doctor-session-open.png", "Bước 2 — Session đang Open", "QueueSession status=open. Các nút Call next / Recall / Pause / Close đồng đều trên một hàng."),
    ("03-staff-checkin-search.png", "Bước 3 — Staff xem danh sách hôm nay", "Staff /staff/checkin tự load danh sách appointment confirmed hôm nay (5 bệnh nhân demo). Có thể lọc theo tên/SĐT/APT."),
    ("04-staff-ticket-issued.png", "Bước 4 — Issue ticket", "Staff chọn bệnh nhân → Check in & issue ticket. Appointment chuyển checked-in, ticket vào hàng đợi."),
    ("05-patient-queue-status.png", "Bước 5 — Patient xem hàng đợi", "Patient /patient/queue: số thứ tự, peopleAhead, poll 3s + socket."),
    ("06-queue-board-waiting.png", "Bước 6 — Board phòng chờ (chờ gọi)", "Public /queue-board/:roomId — theme sáng, Up next tối đa 5 người."),
    ("07-doctor-called-next.png", "Bước 7 — Doctor Call next", "Doctor bấm Call next → hiện họ tên + năm sinh. Danh sách Up next (5 người) cập nhật."),
    ("08-queue-board-calling.png", "Bước 8 — Board đang gọi số", "Board realtime: Now serving = số + tên + năm sinh."),
    ("09-patient-called.png", "Bước 9 — Patient được gọi", "Patient thấy trạng thái Called / đang phục vụ."),
    ("10-doctor-skipped.png", "Bước 10 — Skip patient (ConfirmDialog)", "Doctor Skip → popup xác nhận trong app (không dùng window.confirm). Ghi audit mark_skipped."),
    ("11-doctor-recalled.png", "Bước 11 — Recall skipped", "Doctor Recall skipped — ticket quay lại hàng đợi, audit recall."),
    ("12-doctor-closed-reopen-form.png", "Bước 12 — Close session", "Close qua ConfirmDialog → form Open session hiện lại; không issue ticket mới."),
    ("13-queue-board-closed.png", "Bước 13 — Board session closed", "Board hiển thị Clinic session ended."),
]

UC_SECTIONS = [
    {
        "title": "UC1 — Open Queue Session",
        "route": "POST /api/queue/sessions/open",
        "files": "server/src/services/queueSession.service.js → openSession()\nclient/src/pages/DoctorQueueSessionPage.jsx",
        "logic": (
            "Bác sĩ chọn roomId. Service kiểm tra: một doctor chỉ có một session active/ngày; một phòng chỉ một session open. "
            "Tạo QueueSession (status=open, currentNumber=0). Ghi QueueAuditLog action=open_session. "
            "Socket emit queue:update vào channel queue:room:{roomId}."
        ),
        "debate": "Doctor phải mở session TRƯỚC khi staff issue ticket — đúng quy trình ca khám.",
    },
    {
        "title": "UC2 — Issue Queue Ticket",
        "route": "GET /api/staff/checkin/search + POST .../issue-ticket",
        "files": "server/src/services/queueCheckin.service.js\nclient/src/pages/StaffQueueCheckinPage.jsx",
        "logic": (
            "Staff mở trang → API trả tất cả appointment confirmed hôm nay (không bắt buộc search). "
            "Issue ticket chỉ khi session phòng đó đang open. Ticket có number tăng dần, gắn appointmentId. "
            "Appointment → checked-in. Push queue:patient-update và queue:update."
        ),
        "debate": "Check-in qua reception; UI cảnh báo nếu doctor chưa open session cho phòng.",
    },
    {
        "title": "UC3 — View My Queue Status (Patient)",
        "route": "GET /api/queue/my-status",
        "files": "server/src/services/queueSession.service.js → getPatientQueueStatus()\nclient/src/pages/PatientQueueStatusPage.jsx",
        "logic": (
            "Trả ticket.number, peopleAhead, isCalled, session.currentNumber. "
            "Frontend: POLL_MS=3000 + socket queue:patient-update."
        ),
        "debate": "peopleAhead = đếm ticket waiting có số nhỏ hơn — minh bạch với bệnh nhân.",
    },
    {
        "title": "UC4 — View Queue Board (Waiting Room)",
        "route": "GET /api/queue/board/:roomId (public)",
        "files": "client/src/pages/QueueBoardPage.jsx\nclient/src/utils/queueBoardState.js",
        "logic": (
            "Hiển thị Now serving + Up next (tối đa 5): số, họ tên, năm sinh. Theme sáng cho TV phòng chờ. "
            "Socket queue:join-room + poll 5s fallback."
        ),
        "debate": "Public không cần login; hiện năm sinh (không ngày đầy đủ) để phân biệt trùng tên.",
    },
    {
        "title": "UC5 — Call Next Patient",
        "route": "POST /api/queue/sessions/:id/call-next",
        "files": "queueSession.service.js → callNextTicket()",
        "logic": (
            "Lấy ticket waiting có number nhỏ nhất → status=called. "
            "API enrich patientName + birthYear từ User/Patient. Broadcast realtime."
        ),
        "debate": "FIFO theo ticket number; doctor thấy tên + năm sinh khi gọi.",
    },
    {
        "title": "UC6 — Recall / Skip",
        "route": "POST .../skip + POST .../recall",
        "files": "DoctorQueueSessionPage.jsx + ConfirmDialog.jsx\nQueueAuditLog model",
        "logic": (
            "Skip qua ConfirmDialog (UI trong app). Ticket called → skipped. Recall đưa skipped về called. "
            "Ghi QueueAuditLog mark_skipped / recall."
        ),
        "debate": "Popup chuẩn UX; audit log truy vết khi tranh luận quy trình.",
    },
    {
        "title": "UC7 — Close Queue Session",
        "route": "POST /api/queue/sessions/:id/close",
        "files": "queueSession.service.js → closeSession()",
        "logic": (
            "status=closed. Không issue ticket mới. UI doctor hiện lại form Open session."
        ),
        "debate": "Đóng ca rõ ràng — tránh check-in nhầm sau giờ làm việc.",
    },
]

DEMO_PATIENTS = [
    "Demo Patient · 1995 — patient@orcaxcare.com",
    "Tran Thi Binh · 1990 — queue.demo2@orcaxcare.com",
    "Le Van Cuong · 1985 — queue.demo3@orcaxcare.com",
    "Pham Thi Dung · 1998 — queue.demo4@orcaxcare.com",
    "Hoang Van Em · 1979 — queue.demo5@orcaxcare.com",
]


def add_code_block(doc, text: str):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.name = "Consolas"
    run.font.size = Pt(9)


def main():
    meta = {}
    meta_path = SHOTS / "meta.json"
    if meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))

    doc = Document()
    title = doc.add_heading("OrcaX Care — Hướng dẫn Demo Queue Management", 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph(f"Ngày cập nhật: {date.today().strftime('%d/%m/%Y')}")
    doc.add_paragraph(
        "Tài liệu mô tả chức năng Queue Management (7 Use Case), cách hoạt động sơ bộ, luồng demo kèm screenshot "
        "và giải thích code để trình bày / debate với giảng viên."
    )

    doc.add_heading("1. Queue Management là gì?", level=1)
    doc.add_paragraph(
        "Queue Management là module quản lý hàng đợi khám bệnh theo phòng (clinic room). "
        "Khi bác sĩ mở ca khám (session), lễ tân check-in bệnh nhân có lịch hẹn confirmed trong ngày và cấp số thứ tự. "
        "Bác sĩ gọi lần lượt theo FIFO; bệnh nhân theo dõi trên điện thoại; phòng chờ xem trên màn hình TV (queue board)."
    )
    doc.add_paragraph("Ba vai trò tham gia:")
    for item in [
        "Doctor — mở/đóng session, gọi số, skip/recall bệnh nhân vắng",
        "Staff — xem danh sách lịch hôm nay, check-in và issue ticket",
        "Patient — xem số thứ tự, còn bao nhiêu người trước mình, trạng thái được gọi",
    ]:
        doc.add_paragraph(item, style="List Bullet")

    doc.add_heading("2. Cách hoạt động sơ bộ (hình dung nhanh)", level=1)
    doc.add_paragraph(
        "Luồng dữ liệu có thể hình dung như sau — mỗi bước tương ứng một màn hình trong demo:"
    )
    flow = [
        "① Doctor Open session cho phòng EMR101 → tạo QueueSession (open) trong MongoDB",
        "② Staff mở Queue check-in → thấy 5 appointment confirmed hôm nay → issue ticket từng người",
        "③ Mỗi ticket = 1 số (#1, #2, …) + gắn appointment + patientUserId → status waiting",
        "④ Patient / Queue board nhận cập nhật realtime (Socket.IO) hoặc polling",
        "⑤ Doctor Call next → ticket nhỏ nhất chuyển called; hiện tên + năm sinh",
        "⑥ Doctor Skip (popup xác nhận) nếu vắng → Recall nếu quay lại",
        "⑦ Doctor Close session → không cấp số mới; board báo session ended",
    ]
    for step in flow:
        doc.add_paragraph(step, style="List Number")

    doc.add_paragraph("Sơ đồ thành phần:")
    add_code_block(
        doc,
        "[Doctor UI]  ←REST/WebSocket→  [queueSession.service.js]\n"
        "[Staff UI]   ←REST→             [queueCheckin.service.js]\n"
        "[Patient UI] ←REST/WebSocket→  [queueSession.service.js]\n"
        "[Queue Board]←REST/WebSocket→  [getQueueBoard() — public]\n"
        "         ↓\n"
        "  MongoDB: QueueSession, QueueTicket, QueueAuditLog\n"
        "  Socket.IO: queue:update, queue:patient-update",
    )

    doc.add_heading("3. Tài khoản demo", level=1)
    accounts = [
        ("Doctor", "doctor.an@orcaxcare.com", "Doctor@123", "/doctor/queue"),
        ("Staff", "staff@orcaxcare.com", "Staff@123", "/staff/checkin"),
        ("Patient", "patient@orcaxcare.com", "Patient@123", "/patient/queue"),
    ]
    table = doc.add_table(rows=1, cols=4)
    hdr = table.rows[0].cells
    for i, h in enumerate(["Vai trò", "Email", "Password", "URL"]):
        hdr[i].text = h
    for role, email, pwd, url in accounts:
        row = table.add_row().cells
        row[0].text = role
        row[1].text = email
        row[2].text = pwd
        row[3].text = url

    if meta.get("board_url"):
        doc.add_paragraph(f"Queue Board (public): {meta['board_url']}")

    doc.add_heading("4. Chuẩn bị trước demo", level=1)
    doc.add_paragraph("Terminal 1: npm run dev:server")
    doc.add_paragraph("Terminal 2: npm run dev:client")
    doc.add_paragraph("Reset data demo (từ thư mục gốc project):")
    add_code_block(doc, "npm run demo:queue")
    doc.add_paragraph(
        "Script prepareQueueDemo.js: xóa queue session/ticket hôm nay; tạo 5 appointment confirmed; "
        "set dateOfBirth cho demo patients. Mật khẩu demo patients: Patient@123"
    )
    doc.add_paragraph("5 bệnh nhân demo sau khi chạy script:")
    for p in DEMO_PATIENTS:
        doc.add_paragraph(p, style="List Bullet")

    doc.add_heading("5. Thứ tự demo (quan trọng)", level=1)
    doc.add_paragraph(
        "Doctor Open session → Staff issue ticket (lặp cho 5 người hoặc ít nhất 2–3 để thấy Up next) "
        "→ Patient xem queue → Board TV → Doctor Call next → Skip/Recall → Close."
    )
    doc.add_paragraph("Thời gian ước tính: 7–10 phút.")

    doc.add_heading("6. Kịch bản demo (screenshot)", level=1)
    for fname, step_title, desc in STEPS:
        doc.add_heading(step_title, level=2)
        doc.add_paragraph(desc)
        img = SHOTS / fname
        if img.exists():
            doc.add_picture(str(img), width=Inches(6.2))
        else:
            doc.add_paragraph(f"[Thiếu ảnh: {fname}]")

    doc.add_heading("7. Tính năng UI đã cập nhật", level=1)
    ui_updates = [
        ("Nút Doctor đồng đều", "Call next / Recall / Pause / Close cùng kích thước, grid 4 cột — không còn nút to/nhỏ lẫn lộn."),
        ("ConfirmDialog", "Skip patient và Close session dùng popup trong app (ConfirmDialog.jsx), không dùng window.confirm của trình duyệt."),
        ("Staff auto-list", "Trang check-in tự load danh sách appointment confirmed hôm nay; search chỉ để lọc."),
        ("Up next (5 người)", "Doctor và Board hiển thị tối đa 5 bệnh nhân tiếp theo kèm thứ tự, tên, năm sinh."),
        ("Queue board theme sáng", "Nền trắng/xanh nhạt, dễ đọc trên TV phòng chờ."),
        ("Cảnh báo session", "Staff thấy banner nếu doctor chưa open session; disable nút issue ticket."),
    ]
    for name, desc in ui_updates:
        doc.add_paragraph(f"{name}: {desc}")

    doc.add_heading("8. Giải thích từng Use Case & code", level=1)
    for uc in UC_SECTIONS:
        doc.add_heading(uc["title"], level=2)
        doc.add_paragraph(f"API: {uc['route']}")
        doc.add_paragraph("File chính:")
        add_code_block(doc, uc["files"])
        doc.add_paragraph("Logic nghiệp vụ:")
        doc.add_paragraph(uc["logic"])
        doc.add_paragraph("Điểm trình bày / debate:")
        doc.add_paragraph(uc["debate"])

    doc.add_heading("9. Kiến trúc realtime", level=1)
    add_code_block(
        doc,
        "Server: server/src/realtime/socket.js\n"
        "  - queue:join-room / queue:join-session / queue:join-patient\n"
        "  - Events: queue:update (board + doctor), queue:patient-update (patient)\n"
        "Client: client/src/services/queueSocket.js\n"
        "Models: QueueSession, QueueTicket, QueueAuditLog",
    )
    doc.add_paragraph(
        "Khi doctor call next / skip / recall / close, broadcastSessionUpdate() push Socket.IO. "
        "Patient poll 3s, board poll 5s nếu mất kết nối."
    )

    doc.add_heading("10. Câu hỏi giảng viên thường hỏi", level=1)
    faq = [
        ("Tại sao patient không tự check-in?", "Xác thực appointment tại quầy — staff kiểm tra đúng người, đúng lịch."),
        ("Tại sao phải Open session trước?", "Session = ca khám đang active; không có session thì không cấp số."),
        ("Realtime dùng gì?", "Socket.IO; fallback REST polling."),
        ("Board public có lộ thông tin?", "Hiện số + tên + năm sinh (không SĐT/CMND) — phân biệt trùng tên ở phòng chờ."),
        ("Audit log ở đâu?", "MongoDB QueueAuditLog — open/call/skip/recall/close/issue đều ghi."),
        ("Test tự động?", "server/src/tests/queueManagement.test.js"),
    ]
    for q, a in faq:
        doc.add_paragraph(q, style="List Bullet")
        doc.add_paragraph(a)

    doc.add_heading("11. Snippet code quan trọng", level=1)

    doc.add_heading("attachPatientInfo — tên + năm sinh trên ticket", level=3)
    add_code_block(
        doc,
        "// server/src/services/queueSession.service.js\n"
        "async function attachPatientInfo(tickets) {\n"
        "  const users = await User.find(...).select('fullName');\n"
        "  const patients = await Patient.find(...).select('dateOfBirth');\n"
        "  return { ...ticket, patientName, birthYear: getFullYear(dateOfBirth) };\n"
        "}",
    )

    doc.add_heading("findTodayConfirmedAppointments — staff list", level=3)
    add_code_block(
        doc,
        "// server/src/services/queueCheckin.service.js\n"
        "export async function searchTodayAppointments(keyword) {\n"
        "  // keyword rỗng → trả TẤT CẢ appointment confirmed hôm nay\n"
        "  // có keyword → lọc theo tên/email/phone/APT-code\n"
        "  return { status: 200, body: { appointments } };\n"
        "}",
    )

    doc.add_heading("ConfirmDialog — Skip/Close", level=3)
    add_code_block(
        doc,
        "// client/src/pages/DoctorQueueSessionPage.jsx\n"
        "<ConfirmDialog\n"
        "  open={confirmDialog?.type === 'skip'}\n"
        "  title='Skip this patient?'\n"
        "  description={`Ticket #${n} · ${patientName} ...`}\n"
        "  variant='danger'\n"
        "  onConfirm={handleConfirmDialog}\n"
        "/>",
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(OUT))
    print(f"Created {OUT}")


if __name__ == "__main__":
    main()
