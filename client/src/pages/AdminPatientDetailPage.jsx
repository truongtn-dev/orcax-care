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

export default function AdminPatientDetailPage() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    AdminApiClient.getPatient(id)
      .then(({ data }) => setPatient(data))
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
            <h1>Chi tiết bệnh nhân</h1>
            <p>Xem và quản lý thông tin bệnh nhân.</p>
          </div>
          {patient && (
            <Link to={`/admin/patient/${id}/edit`} className="btn btn-primary">
              Sửa bệnh nhân
            </Link>
          )}
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Đang tải bệnh nhân…
        </div>
      )}

      {error && !loading && <div className="alert alert-error">{error}</div>}

      {!loading && patient && (
        <>
          <div className="card account-detail-header">
            <div className="account-detail-avatar">{patient.fullName?.charAt(0)?.toUpperCase() || "?"}</div>
            <div>
              <h2>{patient.fullName}</h2>
              <p>{patient.email}</p>
              <p>
                <Link to={`/admin/account/${patient._id}`} className="table-link">
                  Mở tài khoản liên kết →
                </Link>
              </p>
              <div className="status-badge-group">
                <StatusBadge active={patient.isActive} label={patient.isActive ? "Đang hoạt động" : "Ngừng hoạt động"} />
                <StatusBadge
                  active={patient.isEmailVerified}
                  label={patient.isEmailVerified ? "Email đã xác minh" : "Email chưa xác minh"}
                />
                {patient.isLocked && <span className="status-badge status-badge-locked">Đã khóa</span>}
              </div>
            </div>
          </div>

          <div className="detail-grid">
            <section className="card detail-section">
              <h3>Tài khoản liên kết</h3>
              <div className="detail-list">
                <DetailItem label="Họ và tên" value={patient.fullName} />
                <DetailItem label="Email" value={patient.email} />
                <DetailItem label="Số điện thoại" value={patient.phone || "—"} />
                <DetailItem label="Ngày đăng ký" value={formatDate(patient.createdAt)} />
                <DetailItem label="Đăng nhập gần nhất" value={formatDate(patient.lastLoginAt)} />
                <DetailItem label="Đổi mật khẩu lần cuối" value={formatDate(patient.passwordChangedAt)} />
              </div>
            </section>

            <section className="card detail-section">
              <h3>Nhân khẩu học</h3>
              <div className="detail-list">
                <DetailItem label="Ngày sinh" value={formatDateOnly(patient.profile.dateOfBirth)} />
                <DetailItem
                  label="Giới tính"
                  value={GENDER_LABELS[patient.profile.gender] || patient.profile.gender || "—"}
                />
                <DetailItem label="Địa chỉ" value={patient.profile.address || "—"} />
                <DetailItem label="Tên liên hệ khẩn cấp" value={patient.profile.emergencyContactName || "—"} />
                <DetailItem label="SĐT liên hệ khẩn cấp" value={patient.profile.emergencyContactPhone || "—"} />
              </div>
            </section>

            <section className="card detail-section">
              <h3>Trạng thái tài khoản</h3>
              <div className="detail-list">
                <DetailItem
                  label="Trạng thái tài khoản"
                  value={
                    <StatusBadge active={patient.isActive} label={patient.isActive ? "Đang hoạt động" : "Ngừng hoạt động"} />
                  }
                />
                <DetailItem
                  label="Xác minh email"
                  value={
                    <StatusBadge
                      active={patient.isEmailVerified}
                      label={patient.isEmailVerified ? "Đã xác minh" : "Chưa xác minh"}
                    />
                  }
                />
                <DetailItem
                  label="Tài khoản bị khóa"
                  value={patient.isLocked ? <span className="status-badge status-badge-locked">Đã khóa</span> : "Không"}
                />
                <DetailItem label="Cập nhật lần cuối" value={formatDate(patient.updatedAt)} />
              </div>
            </section>
          </div>
        </>
      )}
    </PageLayout>
  );
}
