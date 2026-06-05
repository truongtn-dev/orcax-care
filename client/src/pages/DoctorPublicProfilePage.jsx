import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { PublicApiClient } from "../services/publicApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function formatRating(value) {
  if (value == null) return "Chưa có đánh giá";
  return `${value.toFixed(1)} / 5.0`;
}

function Tag({ children }) {
  return <span className="status-badge status-badge-active">{children}</span>;
}

export default function DoctorPublicProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    PublicApiClient.getDoctor(id)
      .then(({ data }) => setDoctor(data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBook = () => {
    navigate("/search-doctors");
  };

  const languages = doctor?.languages?.length ? doctor.languages : ["Tiếng Việt"];
  const workplace = doctor?.workplace || doctor?.department?.name || "Chưa cập nhật";

  return (
    <PageLayout>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <Link to="/search-doctors" className="back-link">
              ← Quay lại tìm bác sĩ
            </Link>
            <h1>Hồ sơ bác sĩ</h1>
            <p>Xem thông tin chuyên khoa, ngôn ngữ, nơi làm việc và đánh giá của bác sĩ.</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Đang tải hồ sơ…
        </div>
      )}

      {error && !loading && <div className="alert alert-error">{error}</div>}

      {!loading && doctor && (
        <div className="card">
          <div className="doctor-profile-header">
            <div className="doctor-profile-avatar large-avatar">
              {doctor.photoUrl ? (
                <img src={doctor.photoUrl} alt={doctor.fullName} />
              ) : (
                <span>{doctor.fullName?.charAt(0)?.toUpperCase() || "D"}</span>
              )}
            </div>
            <div className="doctor-profile-summary">
              <h2>{doctor.fullName}</h2>
              {doctor.specialty?.name && <p className="doctor-meta">{doctor.specialty.name}</p>}
              {doctor.department?.name && (
                <p className="doctor-meta">Nơi làm việc: {workplace}</p>
              )}
              <div className="doctor-profile-tags">
                {doctor.specialty?.code && <Tag>{doctor.specialty.code}</Tag>}
                {doctor.department?.name && <Tag>{workplace}</Tag>}
              </div>
            </div>
            <div className="doctor-profile-action">
              {isAuthenticated ? (
                <button type="button" className="btn btn-primary" onClick={handleBook}>
                  Đặt lịch khám
                </button>
              ) : (
                <p className="field-note">Đăng nhập để đặt lịch khám.</p>
              )}
            </div>
          </div>

          <div className="detail-grid">
            <section className="card detail-section">
              <h3>Giới thiệu</h3>
              <p>{doctor.bio || "Chưa có mô tả hồ sơ."}</p>
            </section>

            <section className="card detail-section">
              <h3>Thông tin bác sĩ</h3>
              <div className="detail-list">
                <div className="detail-item">
                  <span className="detail-label">Chuyên khoa</span>
                  <span className="detail-value">{doctor.specialty?.name || "—"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Nơi làm việc</span>
                  <span className="detail-value">{workplace}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Ngôn ngữ</span>
                  <span className="detail-value">{languages.join(", ")}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Đánh giá</span>
                  <span className="detail-value">
                    {doctor.reviewCount > 0 ? (
                      <>
                        {formatRating(doctor.reviewRating)} · {doctor.reviewCount} đánh giá
                      </>
                    ) : (
                      "Chưa có đánh giá"
                    )}
                  </span>
                </div>
                {doctor.reviewSummary && (
                  <div className="detail-item detail-item-full">
                    <span className="detail-label">Tóm tắt</span>
                    <span className="detail-value">{doctor.reviewSummary}</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
