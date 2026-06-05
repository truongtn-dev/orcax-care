import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function DoctorDashboardPage() {
  const { fullName } = useAuth();

  return (
    <PageLayout>
      <ScrollReveal variant="up">
        <div className="dashboard-welcome">
          <h1>Khu vực bác sĩ</h1>
          <p>
            Xin chào, BS. {fullName?.split(" ").slice(-1)[0] || fullName || "bác sĩ"}. Khu vực làm việc của bạn đã sẵn sàng.
          </p>
          <span className="dashboard-role-badge">Bác sĩ</span>
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
            <h3>Cập nhật hồ sơ</h3>
            <p>Chỉnh sửa tiểu sử nghề nghiệp và thông tin liên hệ.</p>
            <span className="shortcut-arrow">Xem chi tiết →</span>
          </Link>
        </ScrollReveal>
      </div>

      <ScrollReveal variant="up" delay={100}>
        <div className="card info-panel">
          <h3 style={{ marginBottom: "0.75rem" }}>Giai đoạn 1 — Nền tảng</h3>
          <p>
            Đây là giao diện làm việc cơ bản cho bác sĩ. Các tính năng quản lý lịch hẹn, hồ sơ bệnh nhân và công việc lâm sàng sẽ được bổ sung ở giai đoạn tiếp theo.
          </p>
        </div>
      </ScrollReveal>
    </PageLayout>
  );
}
