import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "./PatientAppointmentsPage.css";

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function getSlotDateTime(slot) {
  if (!slot) return new Date();
  const slotDate = new Date(slot.date);
  const [hours, minutes] = (slot.startTime || "00:00").split(":");
  slotDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return slotDate;
}

function isSlotPast(slot) {
  if (!slot) return false;
  return new Date() >= getSlotDateTime(slot);
}

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");

  // Modal States
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedAppointmentForCancel, setSelectedAppointmentForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState("Change of plans");
  const [cancelRefundEstimate, setCancelRefundEstimate] = useState(0);

  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [selectedAppointmentForRate, setSelectedAppointmentForRate] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [rateComment, setRateComment] = useState("");

  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const loadAppointments = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await PatientApiClient.listAppointments();
      setAppointments(data.items || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const openCancelModal = (appointment) => {
    setSelectedAppointmentForCancel(appointment);
    setCancelReason("Change of plans");
    setModalError("");

    // Calculate refund estimate
    const slot = appointment.slotId;
    if (slot) {
      const slotDateTime = getSlotDateTime(slot);
      const diffHours = (slotDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

      let estimate = 0;
      if (diffHours >= 24) {
        estimate = appointment.price; // 100%
      } else if (diffHours >= 12) {
        estimate = Math.floor(appointment.price * 0.5); // 50%
      } else {
        estimate = 0; // 0%
      }
      setCancelRefundEstimate(estimate);
    } else {
      setCancelRefundEstimate(0);
    }

    setCancelModalOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedAppointmentForCancel) return;
    setModalSubmitting(true);
    setModalError("");
    try {
      await PatientApiClient.cancelAppointment(selectedAppointmentForCancel._id, {
        reason: cancelReason,
      });
      setCancelModalOpen(false);
      loadAppointments();
    } catch (err) {
      setModalError(getApiErrorMessage(err));
    } finally {
      setModalSubmitting(false);
    }
  };

  const openRateModal = (appointment) => {
    setSelectedAppointmentForRate(appointment);
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
      loadAppointments();
    } catch (err) {
      setModalError(getApiErrorMessage(err));
    } finally {
      setModalSubmitting(false);
    }
  };

  const upcomingAppointments = appointments.filter(
    (app) => app.status === "booked" && !isSlotPast(app.slotId)
  );

  const pastAppointments = appointments.filter(
    (app) => app.status === "completed" || app.status === "cancelled" || (app.status === "booked" && isSlotPast(app.slotId))
  );

  const displayedList = activeTab === "upcoming" ? upcomingAppointments : pastAppointments;

  return (
    <PageLayout>
      <div className="patient-appointments-container">
        <ScrollReveal variant="up">
          <header className="patient-appointments-header">
            <Link to="/patient" className="patient-appointments-back-link">
              ← Back to dashboard
            </Link>
            <h1>My Appointments</h1>
            <p className="patient-appointments-lead">
              Track your upcoming visits and view consultation history with ratings.
            </p>
          </header>
        </ScrollReveal>

        <ScrollReveal variant="up" delay={20}>
          <div className="patient-appointments-tabs">
            <button
              type="button"
              className={`patient-appointments-tab ${activeTab === "upcoming" ? "is-active" : ""}`}
              onClick={() => setActiveTab("upcoming")}
            >
              Upcoming ({upcomingAppointments.length})
            </button>
            <button
              type="button"
              className={`patient-appointments-tab ${activeTab === "past" ? "is-active" : ""}`}
              onClick={() => setActiveTab("past")}
            >
              History ({pastAppointments.length})
            </button>
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="patient-appointments-loading">Loading appointments...</div>
        ) : error ? (
          <div className="alert alert-error">{error}</div>
        ) : displayedList.length === 0 ? (
          <ScrollReveal variant="up" delay={40}>
            <div className="patient-appointments-empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <p>No appointments found in this section.</p>
              {activeTab === "upcoming" && (
                <Link to="/search-doctors" className="btn btn-primary">
                  Book an appointment
                </Link>
              )}
            </div>
          </ScrollReveal>
        ) : (
          <div className="patient-appointments-list">
            {displayedList.map((app, index) => {
              const doctor = app.doctorId || {};
              const slot = app.slotId || {};
              const doctorUser = doctor.userId || {};
              const isPast = activeTab === "past";

              return (
                <ScrollReveal key={app._id} variant="up" delay={40 + index * 30}>
                  <article className={`patient-appointment-card ${isPast ? "is-past" : ""}`}>
                    <div className="patient-appointment-doctor-info">
                      <div className="patient-appointment-avatar">
                        {doctorUser.photoUrl ? (
                          <img src={doctorUser.photoUrl} alt="" />
                        ) : (
                          <span className="patient-appointment-initials">
                            {doctorUser.fullName?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="patient-appointment-details">
                        <h3>{doctorUser.fullName || "Doctor"}</h3>
                        <p>{doctor.specialty?.name || "Specialist"}</p>
                        <small>{doctor.department?.name || "OrcaXCare Clinic"}</small>
                      </div>
                    </div>

                    <div className="patient-appointment-time-info">
                      <div className="patient-appointment-time-item">
                        <span>Date</span>
                        <strong>{slot.date ? formatDate(slot.date) : "—"}</strong>
                      </div>
                      <div className="patient-appointment-time-item">
                        <span>Time Slot</span>
                        <strong>{slot.startTime ? `${slot.startTime} - ${slot.endTime}` : "—"}</strong>
                      </div>
                      <div className="patient-appointment-time-item">
                        <span>Room</span>
                        <strong>{slot.roomId?.name || "Not assigned"}</strong>
                      </div>
                    </div>
                    <div className="patient-appointment-actions">
                      {isPast ? (
                        app.rating !== null ? (
                          <div className="patient-appointment-review-display">
                            <div className="stars-row">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={`star-icon ${star <= app.rating ? "star-active" : ""}`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                            {app.reviewComment && <p>&ldquo;{app.reviewComment}&rdquo;</p>}
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => openRateModal(app)}
                          >
                            Rate Doctor
                          </button>
                        )
                      ) : null}
                    </div>
                  </article>
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancellation Modal */}
      {cancelModalOpen && selectedAppointmentForCancel && (
        <div className="patient-modal-overlay">
          <div className="patient-modal-card">
            <h3>Cancel Appointment</h3>
            <p className="patient-modal-desc">
              Please review our cancellation and refund policies before confirming.
            </p>

            <div className="patient-modal-policy-box">
              <h4>Refund Policy</h4>
              <ul>
                <li>&gt; 24h before appointment: <strong>100% refund</strong>.</li>
                <li>12h to 24h before appointment: <strong>50% refund</strong>.</li>
                <li>&lt; 12h before appointment: <strong>No refund</strong>.</li>
              </ul>
              <div className="patient-modal-refund-estimate">
                <span>Calculated Refund Estimate:</span>
                <strong>{formatCurrency(cancelRefundEstimate)}</strong>
              </div>
            </div>

            <div className="patient-modal-field">
              <label htmlFor="cancel-reason">Reason for cancellation</label>
              <select
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              >
                <option value="Change of plans">Change of plans</option>
                <option value="Schedule conflict">Schedule conflict</option>
                <option value="Illness">Illness</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {modalError && <div className="alert alert-error">{modalError}</div>}

            <div className="patient-modal-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={modalSubmitting}
                onClick={() => setCancelModalOpen(false)}
              >
                Keep Appointment
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm btn-danger"
                disabled={modalSubmitting}
                onClick={handleCancelConfirm}
              >
                {modalSubmitting ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating / Review Modal */}
      {rateModalOpen && selectedAppointmentForRate && (
        <div className="patient-modal-overlay">
          <div className="patient-modal-card">
            <h3>Rate Doctor</h3>
            <p className="patient-modal-desc">
              Rate your visit with{" "}
              <strong>{selectedAppointmentForRate.doctorId?.userId?.fullName || "Doctor"}</strong>.
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
              <label htmlFor="rate-comment">Share your experience (Optional)</label>
              <textarea
                id="rate-comment"
                rows="4"
                placeholder="Write your review comments here..."
                value={rateComment}
                onChange={(e) => setRateComment(e.target.value)}
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
                {modalSubmitting ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
