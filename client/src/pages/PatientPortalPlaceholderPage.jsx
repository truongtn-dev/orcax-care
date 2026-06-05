import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";

const CONTENT = {
  book: {
    title: "Đặt lịch khám",
    description: "Tính năng đặt lịch sẽ được mở sau khi hệ thống kết nối khung giờ khám. Hiện tại bạn có thể tìm bác sĩ trước.",
    primaryLabel: "Tìm bác sĩ",
    primaryTo: "/search-doctors",
  },
  appointments: {
    title: "Lịch hẹn",
    description: "Danh sách lịch hẹn sắp tới và lịch sử khám sẽ hiển thị tại đây khi tính năng được triển khai.",
    primaryLabel: "Tìm bác sĩ",
    primaryTo: "/search-doctors",
  },
  wallet: {
    title: "Ví thanh toán",
    description: "Số dư ví và lịch sử thanh toán sẽ hiển thị tại đây khi tính năng thanh toán được triển khai.",
    primaryLabel: "Về trang cá nhân",
    primaryTo: "/patient",
  },
};

export default function PatientPortalPlaceholderPage({ type }) {
  const content = CONTENT[type] || CONTENT.appointments;

  return (
    <PageLayout>
      <div className="page-header">
        <h1>{content.title}</h1>
        <p>{content.description}</p>
      </div>

      <div className="card empty-state">
        <div className="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M8 12h8" />
            <path d="M8 16h5" />
          </svg>
        </div>
        <h3>{content.title} — Sắp ra mắt</h3>
        <p>Tính năng này đang được phát triển và sẽ sớm có mặt trên hệ thống.</p>
        <div className="form-actions">
          <Link to={content.primaryTo} className="btn btn-primary">
            {content.primaryLabel}
          </Link>
          <Link to="/patient" className="btn btn-outline">
            Về trang cá nhân
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
