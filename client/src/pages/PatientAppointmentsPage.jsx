import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { getApiErrorMessage } from "../services/api.js";
import { PatientApiClient } from "../services/patientApi.js";

function formatSlot(slot) {
  if (!slot) return "No slot";
  return `${slot.date} · ${slot.startTime} - ${slot.endTime}`;
}

function canReschedule(appointment) {
  return ["scheduled", "checked_in"].includes(appointment.status);
}

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [slotInputs, setSlotInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [reschedulingId, setReschedulingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await PatientApiClient.listAppointments();
      setAppointments(data.items || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const updateSlotInput = (appointmentId, value) => {
    setSlotInputs((current) => ({ ...current, [appointmentId]: value }));
    setMessage("");
    setError("");
  };

  const handleReschedule = async (appointment) => {
    const slotId = String(slotInputs[appointment._id] || "").trim();
    if (!slotId) {
      setError("Enter a replacement slot ID before rescheduling.");
      return;
    }

    setReschedulingId(appointment._id);
    setMessage("");
    setError("");

    try {
      await PatientApiClient.rescheduleAppointment(appointment._id, { slotId });
      setSlotInputs((current) => ({ ...current, [appointment._id]: "" }));
      setMessage("Appointment rescheduled successfully.");
      await loadAppointments();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setReschedulingId("");
    }
  };

  return (
    <PageLayout>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>My appointments</h1>
            <p>View upcoming visits and move an appointment to another available slot.</p>
          </div>
          <Link to="/patient" className="btn btn-secondary">
            Back to dashboard
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {loading ? (
        <p>Loading appointments...</p>
      ) : appointments.length === 0 ? (
        <div className="card empty-state">
          <h3>No appointments yet</h3>
          <p>Booked appointments will appear here once a slot is confirmed.</p>
          <Link to="/search-doctors" className="btn btn-primary">
            Find a doctor
          </Link>
        </div>
      ) : (
        <div className="insurance-card-grid">
          {appointments.map((appointment) => (
            <article key={appointment._id} className="card insurance-card-item">
              <div className="insurance-card-header">
                <h3>{appointment.referenceCode}</h3>
                <span className="status-pill status-active">{appointment.status.replace("_", " ")}</span>
              </div>

              <dl className="detail-list">
                <div>
                  <dt>Doctor</dt>
                  <dd>{appointment.doctorName || "Assigned doctor"}</dd>
                </div>
                <div>
                  <dt>Current slot</dt>
                  <dd>{formatSlot(appointment.slot)}</dd>
                </div>
                {appointment.slot?.roomName && (
                  <div>
                    <dt>Room</dt>
                    <dd>{appointment.slot.roomName}</dd>
                  </div>
                )}
                {appointment.reason && (
                  <div>
                    <dt>Reason</dt>
                    <dd>{appointment.reason}</dd>
                  </div>
                )}
              </dl>

              {canReschedule(appointment) && (
                <div className="form" style={{ marginTop: "1rem" }}>
                  <label>
                    Replacement slot ID
                    <input
                      value={slotInputs[appointment._id] || ""}
                      onChange={(event) => updateSlotInput(appointment._id, event.target.value)}
                      placeholder="Paste an available slot ID"
                    />
                    <span className="hint">
                      The old slot is released only after the new slot is confirmed.
                    </span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={reschedulingId === appointment._id}
                    onClick={() => handleReschedule(appointment)}
                  >
                    {reschedulingId === appointment._id ? "Rescheduling..." : "Reschedule"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
