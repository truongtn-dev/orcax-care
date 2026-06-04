import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminDashboardPage() {
  const { fullName } = useAuth();

  return (
    <PageLayout>
      <ScrollReveal variant="up">
        <div className="dashboard-welcome">
          <h1>Bảng điều khiển quản trị</h1>
          <p>
            Xin chào, {fullName || "Quản trị viên"}. Quản lý hệ thống OrcaXCare
            từ đây.
          </p>
          <span className="dashboard-role-badge">Quản trị viên</span>
        </div>
      </ScrollReveal>

      <div className="shortcut-grid scroll-stagger-grid">
        <ScrollReveal variant="float">
          <Link to="/profile" className="card shortcut card-hover">
            <div className="shortcut-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h3>Hồ sơ của tôi</h3>
            <p>Cập nhật thông tin tài khoản quản trị viên của bạn.</p>
            <span className="shortcut-arrow">Mở →</span>
          </Link>
        </ScrollReveal>

        <ScrollReveal variant="float" delay={80}>
          <div className="card shortcut card-hover">
            <div className="shortcut-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3>Cập nhật tài khoản</h3>
            <p>
              Mở <code>/admin/accounts/:id/edit</code> với user id để sửa thông
              tin.
            </p>
            <span className="shortcut-arrow">Mở →</span>
          </div>
        </ScrollReveal>

        <ScrollReveal variant="float" delay={160}>
          <Link to="/admin/specialties" className="card shortcut card-hover">
            <div className="shortcut-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h10" />
              </svg>
            </div>
            <h3>Chuyên khoa</h3>
            <p>Xem dữ liệu chuyên khoa và lọc bản ghi đang hoạt động.</p>
            <span className="shortcut-arrow">Mở →</span>
          </Link>
        </ScrollReveal>

        <ScrollReveal variant="float" delay={240}>
          <Link
            to="/admin/departments/new"
            className="card shortcut card-hover"
          >
            <div className="shortcut-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M3 21h18" />
                <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
                <path d="M9 9h1" />
                <path d="M14 9h1" />
                <path d="M9 13h1" />
                <path d="M14 13h1" />
              </svg>
            </div>
            <h3>Tạo khoa/phòng ban</h3>
            <p>
              Thêm khoa/phòng ban mới với tên, vị trí, điện thoại và trạng thái.
            </p>
            <span className="shortcut-arrow">Mở →</span>
          </Link>
        </ScrollReveal>

        <ScrollReveal variant="float" delay={320}>
          <Link to="/admin/doctors" className="card shortcut card-hover">
            <div className="shortcut-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0-8 0" />
                <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
                <path d="M19 8h3" />
                <path d="M20.5 6.5v3" />
              </svg>
            </div>
            <h3>Quản lý bác sĩ</h3>
            <p>Xem danh sách, lọc và cập nhật chuyên khoa/khoa phòng của bác sĩ.</p>
            <span className="shortcut-arrow">Mở →</span>
          </Link>
        </ScrollReveal>

        <ScrollReveal variant="float" delay={400}>
          <Link to="/admin/patients" className="card shortcut card-hover">
            <div className="shortcut-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                <circle cx="9.5" cy="7" r="4" />
                <path d="M19 8v6" />
                <path d="M16 11h6" />
              </svg>
            </div>
            <h3>Patient Profiles</h3>
            <p>Find patients and update address, date of birth, gender and emergency contact.</p>
            <span className="shortcut-arrow">Open →</span>
          </Link>
        </ScrollReveal>
      </div>

      <ScrollReveal variant="up" delay={100}>
        <div className="card info-panel">
          <h3 style={{ marginBottom: "0.75rem" }}>Các module quản trị</h3>
          <p>
            Module cập nhật tài khoản, danh sách chuyên khoa và tạo/xem khoa
            phòng ban đã có nền API và màn hình quản trị. Các module bác sĩ sẽ
            được triển khai ở task tiếp theo.
          </p>
        </div>
      </ScrollReveal>
    </PageLayout>
  );
}
