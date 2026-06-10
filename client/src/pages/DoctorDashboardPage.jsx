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
          <Link to="/doctor/schedule" className="card shortcut card-hover">
            <div className="shortcut-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M8 2v4M16 2v4M3 10h18" />
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
              </svg>
            </div>
            <h3>Schedule calendar</h3>
            <p>Week/day view of available, booked, and blocked slots.</p>
            <span className="shortcut-arrow">Open calendar →</span>
          </Link>
        </ScrollReveal>
        <ScrollReveal variant="float">
          <Link to="/doctor/work-shifts" className="card shortcut card-hover">
            <div className="shortcut-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <h3>My work shifts</h3>
            <p>View your weekly shift schedule (read-only).</p>
            <span className="shortcut-arrow">Open schedule →</span>
          </Link>
        </ScrollReveal>
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
