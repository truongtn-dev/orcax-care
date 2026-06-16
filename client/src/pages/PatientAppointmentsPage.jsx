import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { formatWalletCurrency } from "../utils/walletUtils.js";
import "../styles/patient.shared.css";
import "./PatientAppointmentsPage.css";

function isAppointmentPast(item) {
  const slot = item.slot;
  if (!slot?.date) return false;
  const slotDate = new Date(`${slot.date}T${slot.startTime || "00:00"}:00`);
  return slotDate <= new Date();
}

function canRateAppointment(item) {
  return item.rating == null && item.status !== "cancelled" && isAppointmentPast(item);
}

export default function PatientAppointmentsPage() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [slotInputs, setSlotInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [reschedulingId, setReschedulingId] = useState("");
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [selectedAppointmentForRate, setSelectedAppointmentForRate] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [rateComment, setRateComment] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
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

  const openRateModal = (item) => {
    setSelectedAppointmentForRate(item);
    setRatingValue(5);
    setRateComment("");
    setModalError("");
    setRateModalOpen(true);
  };

  const handleRateSubmit = async () => {
    if (!selectedAppointmentForRate) return;

    setModalSubmitting(true);
    setModalError("");

    try {
      await PatientApiClient.rateAppointment(selectedAppointmentForRate._id, {
        rating: ratingValue,
        comment: rateComment,
      });
      setRateModalOpen(false);
      setMessage("Thank you for rating your doctor.");
      await loadAppointments();
    } catch (err) {
      setModalError(getApiErrorMessage(err));
    } finally {
      setModalSubmitting(false);
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
                    {canRateAppointment(item) && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => openRateModal(item)}
                      >
                        Rate doctor
                      </button>
                    )}
                    {item.rating != null && (
                      <div className="patient-appointment-review-display">
                        <div className="stars-row">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`star-icon ${star <= item.rating ? "star-active" : ""}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        {item.reviewComment && <p>{item.reviewComment}</p>}
                      </div>
                    )}
                  </div>

                  {item.status === "confirmed" && !isAppointmentPast(item) && (
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

      {rateModalOpen && selectedAppointmentForRate && (
        <div className="patient-modal-overlay">
          <div className="patient-modal-card">
            <h3>Rate doctor</h3>
            <p className="patient-modal-desc">
              Rate your visit with <strong>{selectedAppointmentForRate.doctor.fullName}</strong>.
            </p>

            <div className="patient-modal-rating-picker">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star-select-btn ${star <= ratingValue ? "is-selected" : ""}`}
                  onClick={() => setRatingValue(star)}
                >
                  ★
                </button>
              ))}
            </div>

            <div className="patient-modal-field">
              <label htmlFor="rate-comment">Share your experience (optional)</label>
              <textarea
                id="rate-comment"
                rows="4"
                placeholder="Write your review comments here..."
                value={rateComment}
                onChange={(event) => setRateComment(event.target.value)}
              />
            </div>

            {modalError && <div className="alert alert-error">{modalError}</div>}

            <div className="patient-modal-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={modalSubmitting}
                onClick={() => setRateModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={modalSubmitting}
                onClick={handleRateSubmit}
              >
                {modalSubmitting ? "Submitting…" : "Submit review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
