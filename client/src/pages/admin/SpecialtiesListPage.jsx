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
      const { data } = await AdminApiClient.getSpecialties({
        activeOnly: nextActiveOnly,
      });
      setItems(data.items || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => loadSpecialties(activeOnly));
  }, [activeOnly, loadSpecialties]);

  return (
    <PageLayout>
      <div className="page-header">
        <h1>Specialty list</h1>
        <p>Specialty data used for admin and doctor search filters.</p>
      </div>

      <div className="card admin-toolbar">
        <Link to="/admin" className="btn btn-outline">
          Back to admin
        </Link>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Show active only
        </label>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading specialties...
        </div>
      )}

      {!loading && (
        <div className="card admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((specialty) => (
                <tr key={specialty._id}>
                  <td>{specialty.code}</td>
                  <td>{specialty.name}</td>
                  <td>{specialty.description || "-"}</td>
                  <td>
                    <span
                      className={`status-pill ${specialty.isActive ? "status-active" : ""}`}
                    >
                      {specialty.isActive
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="4" className="empty-cell">
                    No specialties found.
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
