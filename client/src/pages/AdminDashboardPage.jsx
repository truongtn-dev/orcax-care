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
          <p>Xin chào, {fullName || "Quản trị viên"}. Quản lý hệ thống OrcaXCare từ đây.</p>
          <span className="dashboard-role-badge">Quản trị viên</span>
        </div>
      </ScrollReveal>

      <div className="shortcut-grid scroll-stagger-grid">
        <ScrollReveal variant="float">
          <Link to="/profile" className="card shortcut card-hover">
            <div className="shortcut-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
          <div className="card shortcut static-shortcut">
            <div className="shortcut-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3>Cập nhật tài khoản</h3>
            <p>
              Mở <code>/admin/accounts/:id/edit</code> với user id để sửa email, họ tên,
              điện thoại và trạng thái.
            </p>
          </div>
        </ScrollReveal>
      </div>

      <ScrollReveal variant="up" delay={100}>
        <div className="card info-panel">
          <h3 style={{ marginBottom: "0.75rem" }}>Các module quản trị</h3>
          <p>
            Module cập nhật tài khoản đã có nền API và màn hình chỉnh sửa. Các module chuyên khoa,
            khoa/phòng ban và bác sĩ sẽ được triển khai ở các task tiếp theo.
          </p>
        </div>
      </ScrollReveal>
    </PageLayout>
  );
}
