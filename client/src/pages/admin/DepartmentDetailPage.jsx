import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";

export default function DepartmentDetailPage() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadDepartment() {
      setLoading(true);
      setError("");
      try {
        const { data } = await AdminApiClient.getDepartment(id);
        if (!ignore) setDetail(data);
      } catch (err) {
        if (!ignore) setError(getApiErrorMessage(err));
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadDepartment();
    return () => {
      ignore = true;
    };
  }, [id]);

  return (
    <PageLayout>
      <div className="page-header">
        <h1>Chi tiết khoa/phòng ban</h1>
        <p>Thông tin khoa/phòng ban kèm tổng quan bác sĩ.</p>
      </div>

      <div className="card admin-toolbar">
        <Link to="/admin" className="btn btn-outline">
          Về quản trị
        </Link>
        <Link to="/admin/departments/new" className="btn btn-primary">
          Tạo khoa/phòng ban
        </Link>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Đang tải khoa/phòng ban...
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && detail && (
        <>
          <div className="card">
            <div className="admin-detail-header">
              <div>
                <h2>{detail.department.name}</h2>
                <p className="muted">{detail.department.location}</p>
              </div>
              <span className={`status-pill ${detail.department.isActive ? "status-active" : ""}`}>
                {detail.department.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
              </span>
            </div>
            <div className="admin-detail-list">
              <div>
                <span>Số điện thoại</span>
                <strong>{detail.department.phone}</strong>
              </div>
              <div>
                <span>Tổng số bác sĩ</span>
                <strong>{detail.summary.totalDoctors}</strong>
              </div>
              <div>
                <span>Bác sĩ đang hoạt động</span>
                <strong>{detail.summary.activeDoctors}</strong>
              </div>
            </div>
          </div>

          <div className="card admin-table-card">
            <h3>Bác sĩ thuộc khoa/phòng ban</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Chuyên khoa</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {detail.doctors.map((doctor) => (
                  <tr key={doctor._id}>
                    <td>{doctor.fullName}</td>
                    <td>{doctor.specialtyName || "-"}</td>
                    <td>
                      <span className={`status-pill ${doctor.isActive ? "status-active" : ""}`}>
                        {doctor.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                      </span>
                    </td>
                  </tr>
                ))}
                {detail.doctors.length === 0 && (
                  <tr>
                    <td colSpan="3" className="empty-cell">
                      Chưa có bác sĩ nào thuộc khoa/phòng ban này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PageLayout>
  );
}
