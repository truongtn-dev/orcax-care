import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { AdminApiClient } from "../services/adminApi.js";
import { getApiErrorMessage } from "../services/api.js";

const GENDER_LABELS = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

function formatRoleLabel(role) {
  const labels = { admin: "Quản trị viên", doctor: "Bác sĩ", staff: "Nhân viên", patient: "Bệnh nhân" };
  return labels[role] || role;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatDateOnly(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function StatusBadge({ active, label }) {
  return (
    <span className={`status-badge ${active ? "status-badge-active" : "status-badge-inactive"}`}>
      {label}
    </span>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value ?? "—"}</span>
    </div>
  );
}

export default function AdminAccountDetailPage() {
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    AdminApiClient.getAccount(id)
      .then(({ data }) => setAccount(data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <PageLayout>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <Link to="/admin/account" className="back-link">
              ← Về danh sách tài khoản
            </Link>
            <h1>Chi tiết tài khoản</h1>
            <p>Xem đầy đủ thông tin tài khoản người dùng này.</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Đang tải tài khoản…
        </div>
      )}

      {error && !loading && <div className="alert alert-error">{error}</div>}

      {!loading && account && (
        <>
          <div className="card account-detail-header">
            <div className="account-detail-avatar">{account.fullName?.charAt(0)?.toUpperCase() || "?"}</div>
            <div>
              <h2>{account.fullName}</h2>
              <p>{account.email}</p>
              <div className="status-badge-group">
                <span className="role-badge">{formatRoleLabel(account.role)}</span>
                <StatusBadge active={account.isActive} label={account.isActive ? "Đang hoạt động" : "Ngừng hoạt động"} />
                <StatusBadge
                  active={account.isEmailVerified}
                  label={account.isEmailVerified ? "Email đã xác minh" : "Email chưa xác minh"}
                />
                {account.isLocked && <span className="status-badge status-badge-locked">Đã khóa</span>}
              </div>
            </div>
          </div>

          <div className="detail-grid">
            <section className="card detail-section">
              <h3>Thông tin tài khoản</h3>
              <div className="detail-list">
                <DetailItem label="Họ và tên" value={account.fullName} />
                <DetailItem label="Email" value={account.email} />
                <DetailItem label="Số điện thoại" value={account.phone || "—"} />
                <DetailItem label="Vai trò" value={formatRoleLabel(account.role)} />
                <DetailItem label="Đăng nhập gần nhất" value={formatDate(account.lastLoginAt)} />
                <DetailItem label="Đổi mật khẩu lần cuối" value={formatDate(account.passwordChangedAt)} />
                <DetailItem label="Ngày tạo" value={formatDate(account.createdAt)} />
                <DetailItem label="Cập nhật lần cuối" value={formatDate(account.updatedAt)} />
              </div>
            </section>

            {account.role === "patient" && (
              <section className="card detail-section">
                <h3>Hồ sơ bệnh nhân</h3>
                <div className="detail-list">
                  <DetailItem label="Ngày sinh" value={formatDateOnly(account.profile.dateOfBirth)} />
                  <DetailItem
                    label="Giới tính"
                    value={GENDER_LABELS[account.profile.gender] || account.profile.gender || "—"}
                  />
                  <DetailItem label="Địa chỉ" value={account.profile.address || "—"} />
                  <DetailItem label="Liên hệ khẩn cấp" value={account.profile.emergencyContactName || "—"} />
                  <DetailItem label="SĐT khẩn cấp" value={account.profile.emergencyContactPhone || "—"} />
                  <DetailItem
                    label="Trạng thái hồ sơ"
                    value={account.profile.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                  />
                </div>
              </section>
            )}

            {account.role === "doctor" && (
              <section className="card detail-section">
                <h3>Hồ sơ bác sĩ</h3>
                <div className="detail-list">
                  <DetailItem label="Số giấy phép" value={account.profile.licenseNo || "—"} />
                  <DetailItem label="Chuyên khoa" value={account.profile.specialty?.name || "—"} />
                  <DetailItem label="Khoa/phòng ban" value={account.profile.department?.name || "—"} />
                  <DetailItem label="Trạng thái hồ sơ" value={account.profile.isActive ? "Đang hoạt động" : "Ngừng hoạt động"} />
                  <div className="detail-item detail-item-full">
                    <span className="detail-label">Tiểu sử</span>
                    <span className="detail-value">{account.profile.bio || "—"}</span>
                  </div>
                </div>
              </section>
            )}

            {account.role === "admin" && (
              <section className="card detail-section">
                <h3>Quản trị viên</h3>
                <p className="detail-note">Tài khoản này có quyền quản trị viên hệ thống.</p>
              </section>
            )}
          </div>
        </>
      )}
    </PageLayout>
  );
}
