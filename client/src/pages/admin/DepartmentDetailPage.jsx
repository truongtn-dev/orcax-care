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
      <nav className="admin-breadcrumb" aria-label="Navigation">
        <Link to="/admin">Admin</Link>
        <span>/</span>
        <Link to="/admin/departments/new">Department</Link>
        <span>/</span>
        <span>Details</span>
      </nav>

      <div className="page-header">
        <h1>Department details</h1>
        <p>Department information with doctor overview.</p>
      </div>

      <div className="card admin-toolbar">
        <Link to="/admin" className="btn btn-outline">
          Back to admin
        </Link>
        <Link to="/admin/departments/new" className="btn btn-primary">
          Create department
        </Link>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading department...
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
                {detail.department.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="admin-detail-list">
              <div>
                <span>Phone number</span>
                <strong>{detail.department.phone}</strong>
              </div>
              <div>
                <span>Total doctors</span>
                <strong>{detail.summary.totalDoctors}</strong>
              </div>
              <div>
                <span>Active doctors</span>
                <strong>{detail.summary.activeDoctors}</strong>
              </div>
              <div>
                <span>Total rooms</span>
                <strong>{detail.summary.totalRooms}</strong>
              </div>
              <div>
                <span>Active rooms</span>
                <strong>{detail.summary.activeRooms}</strong>
              </div>
            </div>
          </div>

          <div className="card admin-table-card">
            <h3>Rooms in department</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Room name</th>
                  <th>Floor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {detail.rooms.map((room) => (
                  <tr key={room._id}>
                    <td>{room.name}</td>
                    <td>{room.floor || "-"}</td>
                    <td>
                      <span className={`status-pill ${room.isActive ? "status-active" : ""}`}>
                        {room.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
                {detail.rooms.length === 0 && (
                  <tr>
                    <td colSpan="3" className="empty-cell">
                      No rooms belong to this department yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card admin-table-card">
            <h3>Doctors in department</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Specialty</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {detail.doctors.map((doctor) => (
                  <tr key={doctor._id}>
                    <td>{doctor.fullName}</td>
                    <td>{doctor.specialtyName || "-"}</td>
                    <td>
                      <span className={`status-pill ${doctor.isActive ? "status-active" : ""}`}>
                        {doctor.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
                {detail.doctors.length === 0 && (
                  <tr>
                    <td colSpan="3" className="empty-cell">
                      No doctors belong to this department yet.
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
