import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { formatWalletCurrency } from "../utils/walletUtils.js";
import "../styles/patient.shared.css";
import "./PatientAppointmentsPage.css";

export default function PatientAppointmentsPage() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [slotInputs, setSlotInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [reschedulingId, setReschedulingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const bookedNotice = searchParams.get("booked");

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await PatientApiClient.listAppointments();
      setItems(data.items || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setItems([]);
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

  const handleReschedule = async (item) => {
    const slotId = String(slotInputs[item._id] || "").trim();
    if (!slotId) {
      setError("Enter a replacement slot ID before rescheduling.");
      return;
    }

    setReschedulingId(item._id);
    setMessage("");
    setError("");

    try {
      await PatientApiClient.rescheduleAppointment(item._id, { slotId });
      setSlotInputs((current) => ({ ...current, [item._id]: "" }));
      setMessage("Appointment rescheduled successfully.");
      await loadAppointments();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setReschedulingId("");
    }
  };

  return (
    <PageLayout dashboard>
      <div className="patient-appointments-page">
        <div className="page-header">
          <h1>My appointments</h1>
          <p>Upcoming and past bookings made through OrcaXCare.</p>
        </div>

        {bookedNotice && (
          <div className="alert alert-success">Your appointment has been confirmed.</div>
        )}

        {message && <div className="alert alert-success">{message}</div>}

        {error && <div className="alert alert-error">{error}</div>}

        <div className="patient-appointments-toolbar">
          <Link to="/search-doctors" className="btn btn-primary btn-sm">
            Book another appointment
          </Link>
        </div>

        {loading ? (
          <div className="patient-panel patient-appointments-loading">
            <div className="patient-panel-body">
              <div className="loading-spinner" />
              <p>Loading appointments…</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="patient-panel">
            <div className="patient-panel-head">
              <div className="patient-panel-head-main">
                <h2>No appointments yet</h2>
                <p className="patient-panel-lead">
                  Find a doctor, pick an available slot, and book using your wallet balance.
                </p>
              </div>
            </div>
            <div className="patient-panel-body">
              <div className="form-actions">
                <Link to="/search-doctors" className="btn btn-primary">
                  Find a doctor
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="patient-appointments-list">
            {items.map((item) => (
              <article key={item._id} className="patient-panel patient-appointment-card">
                <div className="patient-panel-head">
                  <div className="patient-panel-head-main">
                    <p className="patient-appointment-status">{item.status}</p>
                    <h2>{item.doctor.fullName}</h2>
                    <p className="patient-panel-lead">{item.doctor.specialty}</p>
                  </div>
                  <strong className="patient-appointment-fee">{formatWalletCurrency(item.fee)}</strong>
                </div>

                <div className="patient-panel-body">
                  <p className="patient-section-label">Appointment details</p>
                  <dl className="patient-fact-list">
                    <div className="patient-fact-row">
                      <dt>Date</dt>
                      <dd>{item.slot?.date || "—"}</dd>
                    </div>
                    <div className="patient-fact-row">
                      <dt>Time</dt>
                      <dd>
                        {item.slot
                          ? `${item.slot.startTime} – ${item.slot.endTime}`
                          : "—"}
                      </dd>
                    </div>
                    <div className="patient-fact-row">
                      <dt>Room</dt>
                      <dd>{item.slot?.roomName || "Not assigned"}</dd>
                    </div>
                  </dl>

                  {item.reason && (
                    <>
                      <p className="patient-section-label">Reason for visit</p>
                      <p className="patient-appointment-reason">{item.reason}</p>
                    </>
                  )}

                  <div className="patient-appointment-actions">
                    <Link to={`/doctor/${item.doctor._id}`} className="btn btn-secondary btn-sm">
                      View doctor
                    </Link>
                  </div>

                  {item.status === "confirmed" && (
                    <div className="patient-appointment-reschedule">
                      <p className="patient-section-label">Reschedule</p>
                      <label>
                        Replacement slot ID
                        <input
                          value={slotInputs[item._id] || ""}
                          onChange={(event) => updateSlotInput(item._id, event.target.value)}
                          placeholder="Paste an available slot ID"
                        />
                        <span className="hint">
                          The old slot is released only after the new slot is confirmed.
                        </span>
                      </label>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={reschedulingId === item._id}
                        onClick={() => handleReschedule(item)}
                      >
                        {reschedulingId === item._id ? "Rescheduling…" : "Reschedule"}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
