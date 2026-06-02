import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";

export default function SpecialtiesListPage() {
  const [activeOnly, setActiveOnly] = useState(true);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSpecialties = useCallback(async (nextActiveOnly) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.getSpecialties({ activeOnly: nextActiveOnly });
      setItems(data.items || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSpecialties(activeOnly);
  }, [activeOnly, loadSpecialties]);

  return (
    <PageLayout>
      <div className="page-header">
        <h1>Danh sách chuyên khoa</h1>
        <p>Dữ liệu chuyên khoa dùng cho quản trị và bộ lọc tìm bác sĩ.</p>
      </div>

      <div className="card admin-toolbar">
        <Link to="/admin" className="btn btn-outline">
          Về quản trị
        </Link>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Chỉ hiện đang hoạt động
        </label>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Đang tải chuyên khoa...
        </div>
      )}

      {!loading && (
        <div className="card admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên</th>
                <th>Mô tả</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {items.map((specialty) => (
                <tr key={specialty._id}>
                  <td>{specialty.code}</td>
                  <td>{specialty.name}</td>
                  <td>{specialty.description || "-"}</td>
                  <td>
                    <span className={`status-pill ${specialty.isActive ? "status-active" : ""}`}>
                      {specialty.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                    </span>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="4" className="empty-cell">
                    Không tìm thấy chuyên khoa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  );
}
