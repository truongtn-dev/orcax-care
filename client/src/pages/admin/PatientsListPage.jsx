import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";

export default function PatientsListPage() {
  const [filters, setFilters] = useState({ q: "", activeOnly: false });
  const [result, setResult] = useState({
    items: [],
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadPatients = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await AdminApiClient.getPatients(filters);
        if (isMounted) {
          setResult(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(getApiErrorMessage(err));
          setResult({ items: [], total: 0, page: 1, totalPages: 1 });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPatients();

    return () => {
      isMounted = false;
    };
  }, [filters]);

  const onChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFilters((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
      page: 1,
    }));
  };

  return (
    <PageLayout>
      <div className="page-header">
        <h1>Patient Profiles</h1>
        <p>Find patients and update profile details on behalf of an admin.</p>
      </div>

      <div className="card admin-toolbar">
        <Link to="/admin" className="btn btn-outline">
          Back to Admin
        </Link>
        <label className="checkbox-row">
          <input
            type="checkbox"
            name="activeOnly"
            checked={filters.activeOnly}
            onChange={onChange}
          />
          Active profiles only
        </label>
      </div>

      <div className="card filters-card">
        <div className="filters-row">
          <input
            type="search"
            name="q"
            value={filters.q}
            onChange={onChange}
            placeholder="Search name, email, phone, address..."
          />
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setFilters({ q: "", activeOnly: false })}
          >
            Clear
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading patients...
        </div>
      )}

      {!loading && (
        <div className="card admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Phone</th>
                <th>Gender</th>
                <th>Address</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((patient) => (
                <tr key={patient._id}>
                  <td>
                    <strong>{patient.fullName}</strong>
                    <p className="muted">{patient.email}</p>
                  </td>
                  <td>{patient.phone || "-"}</td>
                  <td>{patient.profile.gender || "-"}</td>
                  <td>{patient.profile.address || "-"}</td>
                  <td>
                    <span
                      className={`status-pill ${patient.isActive && patient.accountIsActive ? "status-active" : ""}`}
                    >
                      {patient.isActive && patient.accountIsActive
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <Link
                      className="btn btn-sm btn-outline"
                      to={`/admin/patients/${patient._id}/edit`}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {result.items.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-cell">
                    No patients found.
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
