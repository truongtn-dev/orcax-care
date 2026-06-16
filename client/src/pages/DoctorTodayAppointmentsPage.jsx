import { useCallback, useEffect, useState } from "react";
import PageLayout from "../components/PageLayout.jsx";
import DoctorLayout from "../components/DoctorLayout.jsx";
import { getApiErrorMessage } from "../services/api.js";
import { DoctorApiClient } from "../services/doctorApi.js";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function formatStatus(value) {
  const labels = {
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[value] || String(value || "").replace("_", " ");
}

function statusClassName(value) {
  if (value === "cancelled") return "status-pill status-cancelled";
  if (value === "completed") return "status-pill status-completed";
  return "status-pill status-active";
}

function formatSlot(slot) {
  if (!slot) return "No slot";
  return `${slot.startTime} – ${slot.endTime}`;
}

export default function DoctorTodayAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("asc");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await DoctorApiClient.listTodayAppointments({ status, sort });
      setAppointments(data.items || []);
      setDate(data.date || "");
      setSelectedAppointment((current) => {
        if (!current) return null;
        return data.items?.find((item) => item._id === current._id) || null;
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [sort, status]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const openDetail = async (appointment) => {
    setDetailLoading(true);
    setError("");
    try {
      const { data } = await DoctorApiClient.getAppointment(appointment._id);
      setSelectedAppointment(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <PageLayout dashboard>
      <DoctorLayout title="Today appointments">
        <div className="admin-toolbar">
          <div>
            <h2>Today appointments</h2>
            <p className="muted">
              {date || "Today"} · {appointments.length} appointment{appointments.length === 1 ? "" : "s"}
            </p>
          </div>
          <button type="button" className="btn btn-outline" onClick={loadAppointments} disabled={loading}>
            Refresh
          </button>
        </div>

        <div className="card schedule-toolbar">
          <div className="filters-row">
            <label>
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sort
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="asc">Earliest first</option>
                <option value="desc">Latest first</option>
              </select>
            </label>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="detail-grid">
          <section className="card data-table-card">
            {loading ? (
              <p className="empty-cell">Loading today&apos;s appointments…</p>
            ) : appointments.length === 0 ? (
              <p className="empty-cell">No appointments match this filter.</p>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Patient</th>
                      <th>Status</th>
                      <th>Reference</th>
                      <th className="table-actions-col">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appointment) => (
                      <tr
                        key={appointment._id}
                        className={selectedAppointment?._id === appointment._id ? "is-selected-row" : ""}
                      >
                        <td>{formatSlot(appointment.slot)}</td>
                        <td>{appointment.patientName || "Patient"}</td>
                        <td>
                          <span className={statusClassName(appointment.status)}>
                            {formatStatus(appointment.status)}
                          </span>
                        </td>
                        <td>
                          <code className="doctor-appt-ref">{appointment.referenceCode || "—"}</code>
                        </td>
                        <td className="table-actions-col">
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => openDetail(appointment)}
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside className="card detail-section">
            <div className="detail-section-header">
              <h3>Appointment detail</h3>
              {detailLoading && <span className="muted">Loading…</span>}
            </div>

            {!selectedAppointment ? (
              <p className="detail-note">Select an appointment to review visit context.</p>
            ) : (
              <dl className="detail-list">
                <div>
                  <dt>Reference</dt>
                  <dd>
                    <code className="doctor-appt-ref">{selectedAppointment.referenceCode || "—"}</code>
                  </dd>
                </div>
                <div>
                  <dt>Patient</dt>
                  <dd>{selectedAppointment.patientName || "Patient"}</dd>
                </div>
                {selectedAppointment.patientEmail && (
                  <div>
                    <dt>Email</dt>
                    <dd>{selectedAppointment.patientEmail}</dd>
                  </div>
                )}
                <div>
                  <dt>Date</dt>
                  <dd>{selectedAppointment.slot?.date || date}</dd>
                </div>
                <div>
                  <dt>Time</dt>
                  <dd>{formatSlot(selectedAppointment.slot)}</dd>
                </div>
                {selectedAppointment.slot?.roomName && (
                  <div>
                    <dt>Room</dt>
                    <dd>{selectedAppointment.slot.roomName}</dd>
                  </div>
                )}
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className={statusClassName(selectedAppointment.status)}>
                      {formatStatus(selectedAppointment.status)}
                    </span>
                  </dd>
                </div>
                {selectedAppointment.fee != null && (
                  <div>
                    <dt>Fee</dt>
                    <dd>{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(selectedAppointment.fee)}</dd>
                  </div>
                )}
                {selectedAppointment.reason && (
                  <div>
                    <dt>Reason</dt>
                    <dd>{selectedAppointment.reason}</dd>
                  </div>
                )}
              </dl>
            )}
          </aside>
        </div>
      </DoctorLayout>
    </PageLayout>
  );
}
