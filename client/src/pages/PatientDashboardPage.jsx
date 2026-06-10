import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import ResendVerificationForm from "../components/ResendVerificationForm.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const SHORTCUTS = [
  {
    to: "/patient/book",
    title: "Đặt lịch khám",
    description: "Tìm bác sĩ và chọn chuyên khoa phù hợp cho lần khám sắp tới.",
    badge: "Khám bệnh",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <path d="M3 10h18" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M12 14v4" />
        <path d="M10 16h4" />
      </svg>
    ),
  },
  {
    to: "/patient/appointments",
    title: "Lịch hẹn",
    description: "Xem các lịch hẹn sắp tới và lịch sử khám bệnh của bạn.",
    badge: "Khám bệnh",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M8 12h8" />
        <path d="M8 16h5" />
      </svg>
    ),
  },
  {
    to: "/patient/insurance-cards",
    title: "Bảo hiểm y tế",
    description: "Xem các thẻ bảo hiểm đã lưu và thêm hợp đồng mới.",
    badge: "Bảo hiểm",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    to: "/patient/wallet",
    title: "Ví thanh toán",
    description: "Kiểm tra số dư ví và lịch sử thanh toán.",
    badge: "Thanh toán",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
        <path d="M17 12h.01" />
        <path d="M14 10h6v6h-6a3 3 0 0 1 0-6z" />
      </svg>
    ),
  },
  {
    to: "/profile",
    title: "Hồ sơ cá nhân",
    description: "Cập nhật họ tên, số điện thoại, địa chỉ, ngày sinh và người liên hệ khẩn cấp.",
    badge: "Tài khoản",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    to: "/search-doctors",
    title: "Tìm bác sĩ",
    description: "Xem danh sách bác sĩ theo chuyên khoa hoặc khoa trước khi đặt lịch.",
    badge: "Khám bệnh",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
];

export default function PatientDashboardPage() {
  const { fullName, email } = useAuth();

  return (
    <PageLayout>
      <ScrollReveal variant="up">
        <div className="dashboard-welcome">
          <h1>Chào {fullName?.split(" ")[0] || "bạn"}</h1>
          <p>Trang cá nhân của bạn đã sẵn sàng. Chọn dịch vụ bên dưới để bắt đầu.</p>
          <span className="dashboard-role-badge">Bệnh nhân</span>
        </div>
      </ScrollReveal>

      <div className="shortcut-grid scroll-stagger-grid">
        {SHORTCUTS.map((s, i) => (
          <ScrollReveal key={s.to} variant="float" delay={i * 100}>
            <Link to={s.to} className="card shortcut card-hover">
              <div className="shortcut-icon">{s.icon}</div>
              <span className="shortcut-badge">{s.badge}</span>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
              <span className="shortcut-arrow">Xem chi tiết →</span>
            </Link>
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal variant="up" delay={120}>
        <div className="card account-section">
          <div className="account-section-header">
            <div>
              <h3>Cài đặt tài khoản</h3>
              <p className="muted">Đang đăng nhập: {email || "chưa có email"}</p>
            </div>
            <Link to="/change-password" className="btn btn-outline">
              Đổi mật khẩu
            </Link>
          </div>
          <ResendVerificationForm defaultEmail={email} />
        </div>
      </ScrollReveal>
    </PageLayout>
  );
}
